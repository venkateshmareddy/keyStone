import type { SecretPayload } from "@/lib/validation";
import type { NoteDetail } from "@/types";

export function applyPatchToDetail(
  note: NoteDetail,
  body: Record<string, unknown>,
): NoteDetail {
  const now = new Date().toISOString();
  let tags = note.tags;
  if (Array.isArray(body.tagNames)) {
    const names = body.tagNames as string[];
    tags = names.map((name) => ({
      id: `local:${name.toLowerCase()}`,
      name,
    }));
  }
  return {
    ...note,
    title:
      typeof body.title === "string" ? body.title : note.title,
    content:
      typeof body.content === "string" ? body.content : note.content,
    isFavorite:
      typeof body.isFavorite === "boolean"
        ? body.isFavorite
        : note.isFavorite,
    categoryId:
      typeof body.categoryId === "string"
        ? body.categoryId
        : note.categoryId,
    secretPayload:
      body.secretPayload !== undefined
        ? (body.secretPayload as SecretPayload)
        : note.secretPayload,
    tags,
    updatedAt: now,
  };
}
