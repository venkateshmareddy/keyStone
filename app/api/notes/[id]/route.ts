import { requireSessionUser, isNextResponse } from "@/lib/api-auth";
import { encryptSecretPayload } from "@/lib/crypto-secrets";
import { prisma } from "@/lib/db";
import { serializeNoteDetail, serializeNoteListItem } from "@/lib/note-mappers";
import { noteListInclude } from "@/lib/notes-search";
import { noteUpdateSchema, secretPayloadSchema } from "@/lib/validation";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

async function noteForUser(userId: string, noteId: string) {
  return prisma.note.findFirst({
    where: { id: noteId, category: { userId } },
    include: noteListInclude,
  });
}

export async function GET(_req: Request, { params }: Params) {
  const user = await requireSessionUser();
  if (isNextResponse(user)) return user;
  const { id } = await params;

  const note = await noteForUser(user.id, id);
  if (!note) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(serializeNoteDetail(note));
}

export async function PATCH(req: Request, { params }: Params) {
  const user = await requireSessionUser();
  if (isNextResponse(user)) return user;
  const { id } = await params;

  const existing = await noteForUser(user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = noteUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const {
    title,
    content,
    type,
    categoryId,
    isFavorite,
    tagIds,
    secretPayload: rawSecret,
  } = parsed.data;

  if (categoryId) {
    const cat = await prisma.category.findFirst({
      where: { id: categoryId, userId: user.id },
    });
    if (!cat) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
  }

  const nextType = type ?? existing.type;
  if (rawSecret !== undefined && nextType === "SECRET") {
    const sp = secretPayloadSchema.safeParse(rawSecret);
    if (!sp.success) {
      return NextResponse.json(
        { error: sp.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.note.update({
        where: { id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(content !== undefined
            ? { content: nextType === "SECRET" ? "" : content }
            : {}),
          ...(type !== undefined ? { type } : {}),
          ...(categoryId !== undefined ? { categoryId } : {}),
          ...(isFavorite !== undefined ? { isFavorite } : {}),
          ...(tagIds !== undefined
            ? {
                noteTags: {
                  deleteMany: {},
                  create: tagIds.map((tagId) => ({ tagId })),
                },
              }
            : {}),
        },
      });

      if (nextType === "SECRET") {
        if (rawSecret !== undefined) {
          const payload = JSON.stringify(secretPayloadSchema.parse(rawSecret));
          const encrypted = encryptSecretPayload(id, payload);
          await tx.secret.upsert({
            where: { noteId: id },
            create: { noteId: id, encryptedData: encrypted },
            update: { encryptedData: encrypted },
          });
        } else {
          const has = await tx.secret.findUnique({ where: { noteId: id } });
          if (!has) {
            const payload = JSON.stringify({});
            await tx.secret.create({
              data: {
                noteId: id,
                encryptedData: encryptSecretPayload(id, payload),
              },
            });
          }
        }
      }

      return tx.note.findUniqueOrThrow({
        where: { id },
        include: noteListInclude,
      });
    });

    return NextResponse.json({
      detail: serializeNoteDetail(updated),
      listItem: serializeNoteListItem(updated),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await requireSessionUser();
  if (isNextResponse(user)) return user;
  const { id } = await params;

  const existing = await noteForUser(user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.note.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
