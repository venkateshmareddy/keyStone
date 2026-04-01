import { getOfflineDb, type OutboxKind } from "./db";

export async function enqueueOutbox(
  userId: string,
  kind: OutboxKind,
  payload: unknown,
) {
  const db = getOfflineDb(userId);
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  await db.outbox.add({
    id,
    kind,
    payload,
    createdAt: Date.now(),
  });
}

export async function outboxLength(userId: string): Promise<number> {
  return getOfflineDb(userId).outbox.count();
}

export async function peekOutbox(userId: string) {
  return getOfflineDb(userId).outbox.orderBy("createdAt").first();
}

export async function shiftOutbox(userId: string, localId: number) {
  await getOfflineDb(userId).outbox.delete(localId);
}
