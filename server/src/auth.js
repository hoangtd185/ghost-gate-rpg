// Passwords (scrypt) and login tokens (HMAC, a minimal JWT-like format) using node:crypto
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 32);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  const [, saltHex, keyHex] = String(stored).split('$');
  if (!saltHex || !keyHex) return false;
  const key = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), 32);
  return crypto.timingSafeEqual(key, Buffer.from(keyHex, 'hex'));
}

// Token signing key: taken from TOKEN_SECRET (.env / environment variable).
// When running locally without it, one is generated and stored in data/secret.key (the data/ folder is not committed).
export function loadSecret(dataDir, fromEnv) {
  if (fromEnv) return fromEnv;
  const f = path.join(dataDir, 'secret.key');
  try { return fs.readFileSync(f, 'utf8').trim(); }
  catch {
    const s = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(f, s, { mode: 0o600 });
    return s;
  }
}

const b64 = (s) => Buffer.from(s).toString('base64url');

export function signToken(secret, payload, days = 30) {
  const body = b64(JSON.stringify({ ...payload, exp: Date.now() + days * 864e5 }));
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(secret, token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expect = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}
