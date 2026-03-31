'use strict';

/**
 * AES-256-GCM symmetric encryption service.
 *
 * The ENCRYPTION_KEY env var must be a 64-character hex string (32 bytes).
 * Each encrypt() call generates a fresh random IV, so the same plaintext
 * produces a different ciphertext every time.
 *
 * Wire format stored in the DB:
 *   <iv_hex>:<authTag_hex>:<ciphertext_hex>
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_HEX   = process.env.ENCRYPTION_KEY || '';

if (!KEY_HEX || KEY_HEX.length !== 64) {
  console.warn(
    '[encryption] WARNING: ENCRYPTION_KEY must be a 64-char hex string. ' +
    'Secrets will not be usable until this is set correctly.'
  );
}

function getKey() {
  if (!KEY_HEX || KEY_HEX.length !== 64) {
    throw new Error('ENCRYPTION_KEY is not configured — cannot handle secrets');
  }
  return Buffer.from(KEY_HEX, 'hex');
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * @param   {string} plaintext
 * @returns {string} iv:authTag:ciphertext (all hex)
 */
function encrypt(plaintext) {
  const key     = getKey();
  const iv      = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher  = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag   = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a stored ciphertext produced by encrypt().
 * @param   {string} stored  iv:authTag:ciphertext (all hex)
 * @returns {string} plaintext
 */
function decrypt(stored) {
  const key = getKey();
  const parts = stored.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted payload format');
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv         = Buffer.from(ivHex, 'hex');
  const authTag    = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const decipher   = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted  = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = { encrypt, decrypt };
