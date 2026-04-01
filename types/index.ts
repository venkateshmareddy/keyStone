import type { NoteType } from "@prisma/client";
import type { SecretPayload } from "@/lib/validation";

export type { NoteType };

export type NoteDetail = {
  id: string;
  title: string;
  content: string;
  type: NoteType;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  categoryId: string;
  tags: { id: string; name: string }[];
  files: { id: string; fileUrl: string }[];
  secretPayload?: SecretPayload;
};

export type NoteListItem = {
  id: string;
  title: string;
  type: NoteType;
  isFavorite: boolean;
  updatedAt: string;
  categoryId: string;
  tags: { id: string; name: string }[];
};

export type CategoryDTO = {
  id: string;
  name: string;
  _count?: { notes: number };
};
