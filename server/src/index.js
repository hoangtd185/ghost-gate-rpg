// Server game: REST API + phục vụ file client. Chỉ dùng thư viện có sẵn của Node.
//   node server/src/index.js          -> chạy bản đã build (client/dist), dùng khi deploy
//   node server/src/index.js --dev    -> chạy thẳng mã nguồn client/ để vừa sửa vừa thử
//   Cấu hình qua biến môi trường hoặc file .env (xem .env.example)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { config, ROOT } from './config.js';
import { openDb } from './db.js';
import { hashPassword, verifyPassword, signToken, verifyToken, loadSecret } from './auth.js';

const DEV = process.argv.includes('--dev');
const DB_FILE = path.join(config.dataDir, 'game.db');
const distDir = path.join(ROOT, 'client', 'dist');
const STATIC_DIR = !DEV && fs.existsSync(path.join(distDir, 'index.html')) ? distDir : path.join(ROOT, 'client');

const db = openDb(DB_FILE);
const SECRET = loadSecret(config.dataDir, config.tokenSecret);
const VALID_CLS = new Set(['kiem', 'dao', 'thich']);
const MAX_CHARS = config.maxCharsPerUser;

// ---------- header bảo mật cho mọi phản hồi ----------
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'SAMEORIGIN',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  // bản build gộp script vào 1 file HTML nên cần 'unsafe-inline'; không tải script từ trang khác
  'Content-Security-Policy': [
    "default-src 'self'", "script-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com", "img-src 'self' data: blob:", "connect-src 'self'",
    "object-src 'none'", "base-uri 'none'", "frame-ancestors 'self'", "form-action 'self'",
  ].join('; '),
};
if (config.production) SECURITY_HEADERS['Strict-Transport-Security'] = 'max-age=15552000';

function baseHeaders(req) {
  const h = { ...SECURITY_HEADERS };
  if (config.corsOrigin && req.headers.origin === config.corsOrigin) {
    h['Access-Control-Allow-Origin'] = config.corsOrigin;
    h['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
    h['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE';
    h.Vary = 'Origin';
  }
  return h;
}

// IP thật của người dùng (khi chạy sau proxy thì lấy từ X-Forwarded-For)
function clientIp(req) {
  if (config.trustProxy) {
    const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (xf) return xf;
  }
  return req.socket.remoteAddress || '?';
}

// ---------- tiện ích HTTP ----------
function send(res, status, data, req) {
  const body = JSON.stringify(data);
  res.writeHead(status, { ...baseHeaders(req), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function readJson(req, limit = 256 * 1024) {
  if (!/^application\/json/i.test(req.headers['content-type'] || '')) {
    return Promise.reject(Object.assign(new Error('Cần Content-Type: application/json'), { status: 415 }));
  }
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error('Dữ liệu quá lớn'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(Object.assign(new Error('JSON không hợp lệ'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function authUser(req) {
  const h = req.headers.authorization || '';
  const p = verifyToken(SECRET, h.startsWith('Bearer ') ? h.slice(7) : '');
  return p ? { id: p.uid, username: p.u } : null;
}

// Giới hạn số lần gọi trong 1 phút theo IP (chống dò mật khẩu, spam API)
function limiter(perMin) {
  const hits = new Map();
  setInterval(() => { const now = Date.now(); for (const [k, a] of hits) if (!a.some((t) => now - t < 60_000)) hits.delete(k); }, 60_000).unref();
  return (key) => {
    const now = Date.now();
    const a = (hits.get(key) || []).filter((t) => now - t < 60_000);
    a.push(now); hits.set(key, a);
    return a.length > perMin;
  };
}
const loginLimited = limiter(config.loginLimitPerMin);
const apiLimited = limiter(config.apiLimitPerMin);

// Kiểm tra dữ liệu nhân vật gửi lên: chặn số liệu vô lý (sửa save bằng tay, gửi request giả)
const MAX_LEVEL = 50;
function sanitizeCharacter(ch) {
  if (!ch || typeof ch !== 'object' || Array.isArray(ch)) return 'Thiếu dữ liệu nhân vật';
  const lv = Math.floor(+(ch.level ?? 1));
  if (!(lv >= 1 && lv <= MAX_LEVEL)) return 'Cấp không hợp lệ';
  const gold = +(ch.gold ?? 0);
  if (!(gold >= 0 && gold <= 2e9)) return 'Ngân lượng không hợp lệ';
  const st = ch.stats || {};
  const totalStat = ['str', 'dex', 'int', 'vit'].reduce((a, k) => a + Math.max(0, +st[k] || 0), 0) + Math.max(0, +ch.statPoints || 0);
  if (totalStat > 30 + lv * 5 + 10) return 'Điểm tiềm năng không hợp lệ';
  const skillSum = Object.values(ch.skills || {}).reduce((a, v) => a + Math.max(0, +v || 0), 0) + Math.max(0, +ch.skillPoints || 0);
  if (skillSum > lv + 8) return 'Điểm kỹ năng không hợp lệ';
  if (!Array.isArray(ch.inventory || []) || (ch.inventory || []).length > 60) return 'Túi đồ không hợp lệ';
  for (const e of [...(ch.inventory || []), ...Object.values(ch.equip || {})]) {
    if (!e) continue;
    if (typeof e.id !== 'string' || !/^[a-z0-9_]{1,30}$/i.test(e.id)) return 'Vật phẩm không hợp lệ';
    if (+e.qty > 999 || +e.e > 10) return 'Vật phẩm không hợp lệ';
  }
  return null;
}

// ---------- API ----------
const routes = [];
const route = (method, pattern, handler, needAuth = false) => {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ method, re, keys, handler, needAuth });
};

route('GET', '/api/health', () => [200, { ok: true, game: 'quy-mon-quan' }]);

route('POST', '/api/auth/register', async (req) => {
  if (!config.allowRegister) return [403, { error: 'Máy chủ đang tạm khoá đăng ký tài khoản mới' }];
  if (loginLimited('reg:' + clientIp(req))) return [429, { error: 'Thử lại sau 1 phút' }];
  const { username = '', password = '' } = await readJson(req);
  if (typeof username !== 'string' || !/^[A-Za-z0-9_]{3,20}$/.test(username)) return [400, { error: 'Tên tài khoản 3–20 ký tự, chỉ gồm chữ không dấu, số và _' }];
  if (typeof password !== 'string' || password.length < 6 || password.length > 64) return [400, { error: 'Mật khẩu cần 6–64 ký tự' }];
  if (db.getUser(username)) return [409, { error: 'Tên tài khoản đã có người dùng' }];
  const u = db.createUser(username, hashPassword(String(password)));
  return [201, { token: signToken(SECRET, { uid: u.id, u: u.username }, config.tokenDays), username: u.username }];
});

route('POST', '/api/auth/login', async (req) => {
  if (loginLimited('login:' + clientIp(req))) return [429, { error: 'Thử lại sau 1 phút' }];
  const { username = '', password = '' } = await readJson(req);
  if (typeof username !== 'string' || typeof password !== 'string' || username.length > 20 || password.length > 64) return [401, { error: 'Sai tài khoản hoặc mật khẩu' }];
  const u = db.getUser(username);
  if (!u || !verifyPassword(password, u.pass_hash)) return [401, { error: 'Sai tài khoản hoặc mật khẩu' }];
  return [200, { token: signToken(SECRET, { uid: u.id, u: u.username }, config.tokenDays), username: u.username }];
});

route('GET', '/api/characters', (req, user) => [200, { characters: db.listCharacters(user.id) }], true);

route('POST', '/api/characters', async (req, user) => {
  const { character: ch } = await readJson(req);
  if (!ch || typeof ch !== 'object') return [400, { error: 'Thiếu dữ liệu nhân vật' }];
  const bad = sanitizeCharacter(ch);
  if (bad) return [400, { error: bad }];
  const name = String(ch.name || '').trim();
  if (name.length < 2 || name.length > 14) return [400, { error: 'Tên nhân vật 2–14 ký tự' }];
  if (!VALID_CLS.has(ch.cls)) return [400, { error: 'Môn phái không hợp lệ' }];
  if (!/^[a-z0-9]{6,40}$/i.test(String(ch.id))) return [400, { error: 'ID không hợp lệ' }];
  if (db.countCharacters(user.id) >= MAX_CHARS) return [400, { error: `Tối đa ${MAX_CHARS} nhân vật` }];
  if (db.nameTaken(name)) return [409, { error: 'Tên nhân vật đã có người dùng' }];
  // Nhân vật mới luôn bắt đầu từ cấp 1
  const safe = { ...ch, name, level: 1, exp: 0, gold: Math.min(50, ch.gold || 0) };
  return [201, { character: db.createCharacter(user.id, safe) }];
}, true);

route('PUT', '/api/characters/:id', async (req, user, params) => {
  const { character: ch } = await readJson(req);
  if (!ch || ch.id !== params.id) return [400, { error: 'Dữ liệu không khớp' }];
  const bad = sanitizeCharacter(ch);
  if (bad) return [400, { error: bad }];
  if (!db.saveCharacter(user.id, ch)) return [404, { error: 'Không tìm thấy nhân vật' }];
  return [200, { ok: true }];
}, true);

route('DELETE', '/api/characters/:id', (req, user, params) => {
  if (!db.deleteCharacter(user.id, params.id)) return [404, { error: 'Không tìm thấy nhân vật' }];
  return [200, { ok: true }];
}, true);

route('GET', '/api/leaderboard', () => [200, { top: db.leaderboard() }]);

// ---------- File tĩnh ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function serveStatic(req, res, urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath.split('?')[0]); } catch { res.writeHead(400, baseHeaders(req)); return res.end(); }
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(STATIC_DIR, p));
  // chặn thoát khỏi thư mục client (../), file ẩn (.env, .git) và ký tự null
  if (!file.startsWith(STATIC_DIR + path.sep) || p.includes('\0') || p.split('/').some((seg) => seg.startsWith('.'))) {
    res.writeHead(404, baseHeaders(req)); return res.end();
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { ...baseHeaders(req), 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Không tìm thấy'); }
    res.writeHead(200, { ...baseHeaders(req), 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': DEV ? 'no-cache' : 'public, max-age=300' });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch { res.writeHead(400); return res.end(); }
  if (url.pathname.startsWith('/api/')) {
    if (req.method === 'OPTIONS') { res.writeHead(204, baseHeaders(req)); return res.end(); }
    if (apiLimited(clientIp(req))) return send(res, 429, { error: 'Gửi yêu cầu quá nhanh, thử lại sau' }, req);
    const r = routes.find((x) => x.method === req.method && x.re.test(url.pathname));
    if (!r) return send(res, 404, { error: 'Không có API này' }, req);
    const m = url.pathname.match(r.re);
    let params;
    try { params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])); }
    catch { return send(res, 400, { error: 'Đường dẫn không hợp lệ' }, req); }
    let user = null;
    if (r.needAuth) { user = authUser(req); if (!user) return send(res, 401, { error: 'Cần đăng nhập' }, req); }
    try {
      const [status, data] = await r.handler(req, user, params);
      send(res, status, data, req);
    } catch (e) {
      if (!e.status) console.error(e);
      // không trả chi tiết lỗi nội bộ ra ngoài
      send(res, e.status || 500, { error: e.status ? e.message : 'Lỗi máy chủ' }, req);
    }
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, baseHeaders(req)); return res.end(); }
  serveStatic(req, res, url.pathname);
});

// chống giữ kết nối treo (slowloris)
server.headersTimeout = 15_000;
server.requestTimeout = 30_000;

server.listen(config.port, config.host, () => {
  console.log(`Quỷ Môn Quan đang chạy: http://localhost:${config.port}`);
  console.log(`  Client:   ${path.relative(ROOT, STATIC_DIR) || '.'}${DEV ? ' (chế độ dev)' : ''}`);
  console.log(`  Database: ${path.relative(ROOT, DB_FILE) || DB_FILE}`);
  console.log(`  Chế độ:   ${config.production ? 'production' : 'development'}${config.allowRegister ? '' : ' · khoá đăng ký'}`);
});

// tắt server gọn gàng: ghi hết dữ liệu WAL xuống file database
function shutdown(sig) {
  console.log(`Nhận ${sig}, đang tắt server…`);
  server.close(() => { db.close(); process.exit(0); });
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
