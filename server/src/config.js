// Cấu hình server: đọc từ biến môi trường, tự nạp file .env ở thư mục gốc nếu có (không cần thư viện dotenv).
// Xem .env.example để biết các biến dùng được. Biến môi trường thật (đặt trên Railway, Docker…) luôn được ưu tiên hơn .env.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '../..');

const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) {
  // process.loadEnvFile có sẵn từ Node 20.12 / 21.7, không ghi đè biến đã đặt sẵn
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
  trustProxy: bool(env.TRUST_PROXY, false), // bật khi chạy sau proxy (Railway, Render, Nginx) để lấy đúng IP người dùng
  corsOrigin: env.CORS_ORIGIN || '', // để trống = chỉ cho chính trang game gọi API
};

// Production bắt buộc có TOKEN_SECRET đủ dài: không để server tự sinh khoá rồi mất khi container khởi động lại
if (config.production && config.tokenSecret.length < 32) {
  console.error('[config] NODE_ENV=production nhưng TOKEN_SECRET chưa đặt hoặc ngắn hơn 32 ký tự.');
  console.error('         Tạo khoá: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}
if (config.tokenSecret && config.tokenSecret.length < 32) {
  console.warn('[config] TOKEN_SECRET nên dài ít nhất 32 ký tự.');
}
