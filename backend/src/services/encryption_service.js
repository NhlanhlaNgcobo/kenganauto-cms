/**
 * Encryption Service — KenganAuto
 * ─────────────────────────────────────────────
 * AES-256-GCM symmetric encryption for per-tenant secrets
 * (360dialog API keys, Twilio tokens, etc.)
 *
 * Requires env var: ENCRYPTION_KEY (64 hex chars = 32 bytes)
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Ciphertext format (all base64-joined with "."): IV.AuthTag.Ciphertext
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_HEX   = process.env.ENCRYPTION_KEY || 'a'.repeat(64); // Fallback = insecure dev key
const KEY       = Buffer.from(KEY_HEX, 'hex');

if (KEY_HEX === 'a'.repeat(64)) {
  console.warn('[encryption] WARNING: Using default dev key. Set ENCRYPTION_KEY env var in production!');
}

/**
 * Encrypt a plaintext string.
 * @returns {string} "iv.authTag.ciphertext" all base64-encoded
 */
function encrypt(plaintext) {
  if (!plaintext) return null;
  const iv         = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher     = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted  = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag    = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join('.');
}

/**
 * Decrypt a ciphertext string produced by encrypt().
 * @returns {string} Original plaintext
 */
function decrypt(ciphertext) {
  if (!ciphertext) return null;
  const [ivB64, authTagB64, encryptedB64] = ciphertext.split('.');
  if (!ivB64 || !authTagB64 || !encryptedB64) throw new Error('Invalid ciphertext format');

  const iv        = Buffer.from(ivB64, 'base64');
  const authTag   = Buffer.from(authTagB64, 'base64');
  const encrypted = Buffer.from(encryptedB64, 'base64');

  const decipher  = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
}

/**
 * Mask a string for safe display in logs/UI (shows last 4 chars only)
 * e.g. "sk-ant-api03-abc123efg456..." → "••••••••••••456..."
 */
function mask(secret) {
  if (!secret || secret.length < 8) return '••••••••';
  return '•'.repeat(Math.max(secret.length - 8, 8)) + secret.slice(-8);
}

module.exports = { encrypt, decrypt, mask };
