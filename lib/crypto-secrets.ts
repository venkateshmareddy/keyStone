import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const AUTH_TAG_LEN = 16;

function getKey(): Buffer {
  const raw = process.env.SECRETS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("SECRETS_ENCRYPTION_KEY is not set");
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error("SECRETS_ENCRYPTION_KEY must decode to 32 bytes (use base64)");
  }
  return buf;
}

/** Derives a deterministic key from master env key + noteId so ciphertext is scoped per note. */
function keyForNote(noteId: string): Buffer {
  const master = getKey();
  return scryptSync(master, `keystone:secret:${noteId}`, 32);
}

export function encryptSecretPayload(noteId: string, plaintext: string): string {
  const key = keyForNote(noteId);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecretPayload(noteId: string, packed: string): string {
  const key = keyForNote(noteId);
  const raw = Buffer.from(packed, "base64");
  const iv = raw.subarray(0, IV_LEN);
  const tag = raw.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
  const data = raw.subarray(IV_LEN + AUTH_TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
