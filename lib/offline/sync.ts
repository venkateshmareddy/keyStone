import type { CategoryDTO, NoteDetail, NoteListItem } from "@/types";
import type { NoteType } from "@prisma/client";
import {
  mergeNoteListItems,
  putNoteDetailCache,
  removeCategoryCache,
  removeNoteFromCache,
  upsertCategoryCache,
} from "./cache";
import { getOfflineDb } from "./db";
import { shiftOutbox } from "./outbox";

type CreateCategoryPayload = { id: string; name: string };
type RenameCategoryPayload = { id: string; name: string };
type DeleteCategoryPayload = { id: string };
type CreateNotePayload = {
  id: string;
  title: string;
  content: string;
  type: NoteType;
  categoryId: string;
  secretPayload?: Record<string, unknown>;
};
type PatchNotePayload = {
  noteId: string;
  body: Record<string, unknown>;
};
type DeleteNotePayload = { noteId: string };

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const err = new Error(`${init?.method ?? "GET"} ${input} ${res.status}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

export async function processOneOutboxRow(
  userId: string,
  row: {
    localId: number;
    kind: string;
    payload: unknown;
  },
): Promise<void> {
  const { localId, kind, payload } = row;

  switch (kind) {
    case "createCategory": {
      const p = payload as CreateCategoryPayload;
      const cat = await fetchJson<CategoryDTO>("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, name: p.name }),
      });
      await upsertCategoryCache(userId, cat);
      await shiftOutbox(userId, localId);
      return;
    }
    case "renameCategory": {
      const p = payload as RenameCategoryPayload;
      const cat = await fetchJson<CategoryDTO>(`/api/categories/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: p.name }),
      });
      await upsertCategoryCache(userId, cat);
      await shiftOutbox(userId, localId);
      return;
    }
    case "deleteCategory": {
      const p = payload as DeleteCategoryPayload;
      await fetchJson<{ ok: boolean }>(`/api/categories/${p.id}`, {
        method: "DELETE",
      });
      await removeCategoryCache(userId, p.id);
      await shiftOutbox(userId, localId);
      return;
    }
    case "createNote": {
      const p = payload as CreateNotePayload;
      const item = await fetchJson<NoteListItem>("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: p.id,
          title: p.title,
          content: p.content,
          type: p.type,
          categoryId: p.categoryId,
          ...(p.type === "SECRET"
            ? { secretPayload: p.secretPayload ?? {} }
            : {}),
        }),
      });
      await mergeNoteListItems(userId, [item]);
      const detail = await fetchJson<NoteDetail>(`/api/notes/${p.id}`);
      await putNoteDetailCache(userId, detail);
      await shiftOutbox(userId, localId);
      return;
    }
    case "patchNote": {
      const p = payload as PatchNotePayload;
      const data = await fetchJson<{ detail: NoteDetail; listItem: NoteListItem }>(
        `/api/notes/${p.noteId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(p.body),
        },
      );
      await mergeNoteListItems(userId, [data.listItem]);
      await putNoteDetailCache(userId, data.detail);
      await shiftOutbox(userId, localId);
      return;
    }
    case "deleteNote": {
      const p = payload as DeleteNotePayload;
      await fetchJson<{ ok: boolean }>(`/api/notes/${p.noteId}`, {
        method: "DELETE",
      });
      await removeNoteFromCache(userId, p.noteId);
      await shiftOutbox(userId, localId);
      return;
    }
    default:
      await shiftOutbox(userId, localId);
  }
}

export async function drainOutbox(userId: string): Promise<void> {
  const db = getOfflineDb(userId);
  for (;;) {
    const row = await db.outbox.orderBy("createdAt").first();
    if (!row?.localId) break;
    try {
      await processOneOutboxRow(userId, {
        localId: row.localId,
        kind: row.kind,
        payload: row.payload,
      });
    } catch {
      break;
    }
  }
}
