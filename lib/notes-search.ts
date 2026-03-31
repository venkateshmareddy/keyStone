import { prisma } from "@/lib/db";

export const noteListInclude = {
  secret: true,
  files: true,
  noteTags: { include: { tag: true } },
} as const;

/** Full-text search (PostgreSQL) scoped to the user's categories. */
export async function searchNotesForUser(
  userId: string,
  query: string,
  categoryId?: string | null,
): Promise<string[]> {
  const q = query.trim();
  if (!q) return [];

  if (categoryId) {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT n.id::text AS id
      FROM "Note" n
      INNER JOIN "Category" c ON c.id = n.category_id
      WHERE c.user_id = ${userId}::uuid
        AND n.category_id = ${categoryId}::uuid
        AND to_tsvector(
          'english',
          n.title || ' ' || coalesce(n.content, '')
        ) @@ websearch_to_tsquery('english', ${q})
      ORDER BY n.updated_at DESC
      LIMIT 200
    `;
    return rows.map((r) => r.id);
  }

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT n.id::text AS id
    FROM "Note" n
    INNER JOIN "Category" c ON c.id = n.category_id
    WHERE c.user_id = ${userId}::uuid
      AND to_tsvector(
        'english',
        n.title || ' ' || coalesce(n.content, '')
      ) @@ websearch_to_tsquery('english', ${q})
    ORDER BY n.updated_at DESC
    LIMIT 200
  `;

  return rows.map((r) => r.id);
}

export async function loadNotesByIdsOrdered(ids: string[]) {
  if (ids.length === 0) return [];
  const notes = await prisma.note.findMany({
    where: { id: { in: ids } },
    include: noteListInclude,
    orderBy: { updatedAt: "desc" },
  });
  const order = new Map(ids.map((id, i) => [id, i]));
  return [...notes].sort(
    (a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999),
  );
}
