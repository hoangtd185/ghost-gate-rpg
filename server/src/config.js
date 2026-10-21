// Server config: read from environment variables, loading a .env file in the project root if present (no dotenv needed).
// See .env.example for the available variables. Real environment variables (set on Railway, Docker…) always win over .env.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '../..');

const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) {
  // process.loadEnvFile exists since Node 20.12 / 21.7 and does not override variables that are already set
  process.loadEnvFile(envFile);
}

const env = process.env;
const num = (v, d) => (v !== undefined && v !== '' && Number.isFinite(+v) ? +v : d);
const bool = (v, d) => (v === undefined || v === '' ? d : /^(1|true|yes|on)$/i.test(v));

export const config = {
  production: env.NODE_ENV === 'production',
  port: num(env.PORT, 3000),
  host: env.HOST || '0.0.0.0',
  dataDir: path.resolve(env.DATA_DIR || path.join(ROOT, 'data')),
  tokenSecret: env.TOKEN_SECRET || '',
  tokenDays: num(env.TOKEN_DAYS, 30),
  allowRegister: bool(env.ALLOW_REGISTER, true),
  maxCharsPerUser: num(env.MAX_CHARS_PER_USER, 6),
  loginLimitPerMin: num(env.LOGIN_LIMIT_PER_MIN, 10),
  apiLimitPerMin: num(env.API_LIMIT_PER_MIN, 240),
  trustProxy: bool(env.TRUST_PROXY, false), // enable when behind a proxy (Railway, Render, Nginx) to get the real client IP
  corsOrigin: env.CORS_ORIGIN || '', // empty = only the game page itself may call the API
};

// Production requires a long enough TOKEN_SECRET: never let the server generate a key that is lost when the container restarts
if (config.production && config.tokenSecret.length < 32) {
  console.error('[config] NODE_ENV=production but TOKEN_SECRET is missing or shorter than 32 characters.');
  console.error('         Generate one: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}
if (config.tokenSecret && config.tokenSecret.length < 32) {
  console.warn('[config] TOKEN_SECRET should be at least 32 characters long.');
}
