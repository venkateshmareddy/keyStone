import { requireSessionUser, isNextResponse } from "@/lib/api-auth";
import { encryptSecretPayload } from "@/lib/crypto-secrets";
import { prisma } from "@/lib/db";
import { serializeNoteListItem } from "@/lib/note-mappers";
import {
  loadNotesByIdsOrdered,
  noteListInclude,
  searchNotesForUser,
} from "@/lib/notes-search";
import {
  noteCreateSchema,
  secretPayloadSchema,
} from "@/lib/validation";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const user = await requireSessionUser();
  if (isNextResponse(user)) return user;

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const q = searchParams.get("q")?.trim() ?? "";

  if (q) {
    const ids = await searchNotesForUser(user.id, q, categoryId);
    const notes = await loadNotesByIdsOrdered(ids);
    return NextResponse.json(notes.map(serializeNoteListItem));
  }

  const where = {
    category: { userId: user.id },
    ...(categoryId ? { categoryId } : {}),
  };

  const notes = await prisma.note.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: noteListInclude,
    take: 500,
  });

  return NextResponse.json(notes.map(serializeNoteListItem));
}

export async function POST(req: Request) {
  const user = await requireSessionUser();
  if (isNextResponse(user)) return user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = noteCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { title, content, type, categoryId, tagIds, secretPayload: rawSecret } =
    parsed.data;

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId: user.id },
  });
  if (!category) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  if (type === "SECRET") {
    const sp = secretPayloadSchema.safeParse(rawSecret ?? {});
    if (!sp.success) {
      return NextResponse.json(
        { error: sp.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
  }

  try {
    const note = await prisma.$transaction(async (tx) => {
      const created = await tx.note.create({
        data: {
          title,
          content: type === "SECRET" ? "" : content,
          type,
          categoryId,
          ...(tagIds?.length
            ? {
                noteTags: {
                  create: tagIds.map((tagId) => ({ tagId })),
                },
              }
            : {}),
        },
      });

      if (type === "SECRET") {
        const payload = JSON.stringify(secretPayloadSchema.parse(rawSecret ?? {}));
        const encrypted = encryptSecretPayload(created.id, payload);
        await tx.secret.create({
          data: { noteId: created.id, encryptedData: encrypted },
        });
      }

      return tx.note.findUniqueOrThrow({
        where: { id: created.id },
        include: noteListInclude,
      });
    });

    return NextResponse.json(serializeNoteListItem(note), { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Could not create note (check SECRETS_ENCRYPTION_KEY for secrets)" },
      { status: 500 },
    );
  }
}
