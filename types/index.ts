import type { NoteType } from "@prisma/client";

export type { NoteType };

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
