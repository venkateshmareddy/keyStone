import type { Note, NoteTag, Tag, Secret, File } from "@prisma/client";
import { decryptSecretPayload } from "@/lib/crypto-secrets";
import type { SecretPayload } from "@/lib/validation";

export type NoteWithRelations = Note & {
  secret: Secret | null;
  files: File[];
  noteTags: (NoteTag & { tag: Tag })[];
};

export function serializeNoteListItem(n: NoteWithRelations) {
  return {
    id: n.id,
    title: n.title,
    type: n.type,
    isFavorite: n.isFavorite,
    updatedAt: n.updatedAt.toISOString(),
    categoryId: n.categoryId,
    tags: n.noteTags.map((nt) => ({ id: nt.tag.id, name: nt.tag.name })),
  };
}

export function serializeNoteDetail(n: NoteWithRelations): {
  id: string;
  title: string;
  content: string;
  type: Note["type"];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  categoryId: string;
  tags: { id: string; name: string }[];
  files: { id: string; fileUrl: string }[];
  secretPayload?: SecretPayload;
} {
  const base = {
    id: n.id,
    title: n.title,
    content: n.type === "SECRET" ? "" : n.content,
    type: n.type,
    isFavorite: n.isFavorite,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
    categoryId: n.categoryId,
    tags: n.noteTags.map((nt) => ({ id: nt.tag.id, name: nt.tag.name })),
    files: n.files.map((f) => ({ id: f.id, fileUrl: f.fileUrl })),
  };

  if (n.type === "SECRET" && n.secret) {
    try {
      const raw = decryptSecretPayload(n.id, n.secret.encryptedData);
      const secretPayload = JSON.parse(raw) as SecretPayload;
      return { ...base, secretPayload };
    } catch {
      return { ...base, secretPayload: {} };
    }
  }

  return base;
}
