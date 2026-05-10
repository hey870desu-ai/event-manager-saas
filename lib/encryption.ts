// テナントごとの機密情報（Notion API Tokenなど）をFirestore保存する際の暗号化ヘルパー。
// AES-256-GCM（認証付き）を使用。鍵は env ENCRYPTION_KEY（64文字hex = 32バイト）。

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const hexKey = process.env.ENCRYPTION_KEY;
  if (!hexKey) {
    throw new Error('ENCRYPTION_KEY env not set. Generate with: openssl rand -hex 32');
  }
  if (hexKey.length !== 64) {
    throw new Error(`ENCRYPTION_KEY must be 64 hex chars (32 bytes). Got ${hexKey.length}`);
  }
  return Buffer.from(hexKey, 'hex');
}

// 暗号化：返り値は base64 形式の "iv:tag:ciphertext"
export function encrypt(plaintext: string): string {
  if (!plaintext) return '';
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

// 復号
export function decrypt(payload: string): string {
  if (!payload) return '';
  const [ivB64, tagB64, dataB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted payload format');
  }
  const key = getKey();
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  if (tag.length !== TAG_LENGTH) {
    throw new Error('Invalid auth tag length');
  }
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

// マスク表示用（管理画面で値を確認させるとき）
// 例: "secret_abc123..." → "secret_abc1***...c123"
export function maskToken(token: string, head = 4, tail = 4): string {
  if (!token) return '';
  if (token.length <= head + tail) return '*'.repeat(token.length);
  return `${token.slice(0, head)}${'*'.repeat(8)}${token.slice(-tail)}`;
}
