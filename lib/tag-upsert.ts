import type { PrismaClient } from "@prisma/client";

export async function tagIdsFromNames(
  db: PrismaClient,
  names: string[],
): Promise<string[]> {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (unique.length === 0) return [];
  const ids: string[] = [];
  for (const name of unique) {
    const tag = await db.tag.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    ids.push(tag.id);
  }
  return ids;
}
