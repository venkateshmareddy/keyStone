import type { CategoryDTO, NoteDetail, NoteListItem } from "@/types";
import type { NoteType } from "@prisma/client";
import { getOfflineDb } from "./db";

export async function replaceCategoriesCache(
  userId: string,
  categories: CategoryDTO[],
) {
  const db = getOfflineDb(userId);
  await db.transaction("rw", db.categories, async () => {
    await db.categories.clear();
    await db.categories.bulkPut(categories);
  });
}

export async function readCategoriesCache(
  userId: string,
): Promise<CategoryDTO[]> {
  const db = getOfflineDb(userId);
  return db.categories.orderBy("name").toArray();
}

export async function upsertCategoryCache(userId: string, c: CategoryDTO) {
  await getOfflineDb(userId).categories.put(c);
}

export async function removeCategoryCache(userId: string, id: string) {
  await getOfflineDb(userId).categories.delete(id);
}

export async function replaceNoteListForCategory(
  userId: string,
  categoryId: string | null,
  items: NoteListItem[],
) {
  const db = getOfflineDb(userId);
  await db.transaction("rw", db.noteList, async () => {
    if (categoryId) {
      await db.noteList.where("categoryId").equals(categoryId).delete();
    } else {
      await db.noteList.clear();
    }
    if (items.length) await db.noteList.bulkPut(items);
  });
}

export async function mergeNoteListItems(userId: string, items: NoteListItem[]) {
  if (!items.length) return;
  await getOfflineDb(userId).noteList.bulkPut(items);
}

export async function readNotesCache(
  userId: string,
  categoryId: string,
  search: string,
): Promise<NoteListItem[]> {
  const db = getOfflineDb(userId);
  let rows = await db.noteList
    .where("categoryId")
    .equals(categoryId)
    .toArray();
  rows.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  const q = search.trim().toLowerCase();
  if (q) {
    rows = rows.filter((n) => n.title.toLowerCase().includes(q));
  }
  return rows;
}

export async function putNoteDetailCache(userId: string, detail: NoteDetail) {
  await getOfflineDb(userId).noteDetails.put({ id: detail.id, detail });
}

export async function readNoteDetailCache(
  userId: string,
  noteId: string,
): Promise<NoteDetail | null> {
  const row = await getOfflineDb(userId).noteDetails.get(noteId);
  return row?.detail ?? null;
}

export async function removeNoteFromCache(userId: string, noteId: string) {
  const db = getOfflineDb(userId);
  await db.transaction("rw", db.noteList, db.noteDetails, async () => {
    await db.noteList.delete(noteId);
    await db.noteDetails.delete(noteId);
  });
}

export async function incrementCategoryNotes(
  userId: string,
  categoryId: string,
  delta: number,
) {
  const db = getOfflineDb(userId);
  const c = await db.categories.get(categoryId);
  if (!c) return;
  const n = Math.max(0, (c._count?.notes ?? 0) + delta);
  await db.categories.put({ ...c, _count: { notes: n } });
}

export async function purgeNotesForCategory(userId: string, categoryId: string) {
  const db = getOfflineDb(userId);
  const items = await db.noteList.where("categoryId").equals(categoryId).toArray();
  await db.transaction("rw", db.noteList, db.noteDetails, async () => {
    for (const it of items) {
      await db.noteDetails.delete(it.id);
    }
    await db.noteList.where("categoryId").equals(categoryId).delete();
  });
}

/** Patch list row fields from a detail without re-fetching list from server */
export function listItemFromDetail(d: NoteDetail): NoteListItem {
  return {
    id: d.id,
    title: d.title,
    type: d.type as NoteType,
    isFavorite: d.isFavorite,
    updatedAt: d.updatedAt,
    categoryId: d.categoryId,
    tags: d.tags,
  };
}
