// Quét các file sắp đưa lên git xem có lỡ chứa bí mật không (file .env, database, khoá, token…).
//   node tools/check-secrets.mjs                 quét, có vấn đề thì thoát với mã 1
//   node tools/check-secrets.mjs --install-hook  cài vào git để tự quét trước mỗi lần commit
// Không cần thư viện ngoài.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

if (process.argv.includes('--install-hook')) {
  const hooks = path.join(ROOT, '.git', 'hooks');
  if (!fs.existsSync(hooks)) { console.error('Chưa có thư mục .git. Chạy "git init" trước.'); process.exit(1); }
  fs.writeFileSync(path.join(hooks, 'pre-commit'), '#!/bin/sh\nnode tools/check-secrets.mjs --staged || exit 1\n', { mode: 0o755 });
  console.log('Đã cài pre-commit hook: mỗi lần commit sẽ tự quét bí mật.');
  process.exit(0);
}

// Danh sách file cần quét: ưu tiên hỏi git (đúng những gì sẽ được commit), không có git thì tự duyệt thư mục
function listFiles() {
  const staged = process.argv.includes('--staged');
  try {
    const cmd = staged ? 'git diff --cached --name-only --diff-filter=ACM' : 'git ls-files --cached --others --exclude-standard';
    const out = execSync(cmd, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    return out.split('\n').filter(Boolean);
  } catch { /* chưa có git */ }
  const skip = new Set(['.git', 'node_modules', 'data', 'dist']);
  // tôn trọng .gitignore cho file .env (dòng ".env")
  const gi = fs.existsSync(path.join(ROOT, '.gitignore')) ? fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8').split('\n').map((l) => l.trim()) : [];
  const envIgnored = gi.includes('.env');
  const out = [];
  (function walk(dir) {
    for (const ent of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = path.join(dir, ent.name);
      if (ent.isDirectory()) { if (!skip.has(ent.name)) walk(rel); }
      else if (!(envIgnored && /^\.env(\..+)?$/.test(ent.name) && ent.name !== '.env.example')) out.push(rel.split(path.sep).join('/'));
    }
  })('');
  return out;
}

// File không bao giờ được commit
const BAD_FILES = [
  [/(^|\/)\.env(\..+)?$/, 'file .env chứa bí mật'],
  [/\.(db|db-wal|db-shm|sqlite)$/, 'file database chứa dữ liệu người chơi'],
  [/(^|\/)secret\.key$/, 'khoá ký token'],
  [/\.(pem|key|p12|pfx)$/, 'file khoá / chứng chỉ'],
  [/(^|\/)id_(rsa|ed25519|ecdsa)(\.pub)?$/, 'khoá SSH'],
];
const ALLOW_FILES = [/(^|\/)\.env\.example$/];

// Nội dung trông như bí mật
const BAD_CONTENT = [
  [/-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/, 'khoá riêng (private key)'],
  [/AKIA[0-9A-Z]{16}/, 'AWS access key'],
  [/gh[pousr]_[A-Za-z0-9]{36,}/, 'GitHub token'],
  [/github_pat_[A-Za-z0-9_]{40,}/, 'GitHub token'],
  [/xox[abprs]-[A-Za-z0-9-]{10,}/, 'Slack token'],
  [/AIza[0-9A-Za-z_-]{35}/, 'Google API key'],
  [/sk-(ant-|proj-)?[A-Za-z0-9_-]{24,}/, 'API key (OpenAI/Anthropic…)'],
  [/(TOKEN_SECRET|SECRET|PASSWORD|API_KEY)\s*[=:]\s*['"]?[A-Za-z0-9+/_-]{16,}/, 'biến bí mật có giá trị'],
];

const problems = [];
for (const f of listFiles()) {
  if (ALLOW_FILES.some((re) => re.test(f))) continue;
  const bad = BAD_FILES.find(([re]) => re.test(f));
  if (bad) { problems.push(`${f}: ${bad[1]}`); continue; }
  const full = path.join(ROOT, f);
  let text;
  try {
    const st = fs.statSync(full);
    if (!st.isFile() || st.size > 2_000_000) continue;
    text = fs.readFileSync(full, 'utf8');
  } catch { continue; }
  if (text.includes('\u0000')) continue; // file nhị phân
  if (f === 'tools/check-secrets.mjs') continue; // chính file này chứa mẫu regex
  text.split('\n').forEach((line, i) => {
    for (const [re, what] of BAD_CONTENT) if (re.test(line)) problems.push(`${f}:${i + 1}: có thể là ${what}`);
  });
}

if (problems.length) {
  console.error('⚠ Phát hiện thứ không nên đưa lên git:\n');
  for (const p of problems) console.error('  - ' + p);
  console.error('\nGỡ chúng khỏi commit (git rm --cached <file>), thêm vào .gitignore, và nếu bí mật đã lỡ đẩy lên thì đổi khoá mới.');
  process.exit(1);
}
console.log('✓ Không thấy bí mật nào trong các file sẽ commit.');
