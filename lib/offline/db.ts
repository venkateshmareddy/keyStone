import type { CategoryDTO, NoteDetail, NoteListItem } from "@/types";
import Dexie, { type EntityTable } from "dexie";

export type OutboxKind =
  | "createCategory"
  | "renameCategory"
  | "deleteCategory"
  | "createNote"
  | "patchNote"
  | "deleteNote";

export type OutboxRow = {
  localId?: number;
  id: string;
  kind: OutboxKind;
  /** JSON-serializable payload */
  payload: unknown;
  createdAt: number;
};

export type StoredCategory = CategoryDTO;

class OfflineDexie extends Dexie {
  categories!: EntityTable<StoredCategory, "id">;
  noteList!: EntityTable<NoteListItem, "id">;
  noteDetails!: EntityTable<{ id: string; detail: NoteDetail }, "id">;
  outbox!: EntityTable<OutboxRow, "localId">;

  constructor(userId: string) {
    super(`keystone-offline-${userId}`);
    this.version(1).stores({
      categories: "id, name",
      noteList: "id, categoryId, updatedAt",
      noteDetails: "id",
      outbox: "++localId,id,createdAt",
    });
  }
}

const cache = new Map<string, OfflineDexie>();

export function getOfflineDb(userId: string): OfflineDexie {
  let db = cache.get(userId);
  if (!db) {
    db = new OfflineDexie(userId);
    cache.set(userId, db);
  }
  return db;
}

export function closeOfflineDbForUser(userId: string) {
  const db = cache.get(userId);
  if (db) {
    void db.close();
    cache.delete(userId);
  }
}
