import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

function getKey() {
  const raw = process.env.ENCRYPTION_KEY || '';
  if (raw.length === 64 && /^[a-f0-9]+$/i.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  return createHash('sha256').update(raw).digest();
}

export function encryptString(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptString(value: string | null | undefined) {
  if (!value) return null;
  const [ivHex, tagHex, encryptedHex] = value.split(':');
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function hashToken(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
