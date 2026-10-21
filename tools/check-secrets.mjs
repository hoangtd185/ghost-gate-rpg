// Scans files about to be committed for leaked secrets (.env files, databases, keys, tokens…).
//   node tools/check-secrets.mjs                 scan; exit with code 1 if anything is found
//   node tools/check-secrets.mjs --install-hook  install a git hook that scans before every commit
// No external packages needed.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

if (process.argv.includes('--install-hook')) {
  const hooks = path.join(ROOT, '.git', 'hooks');
  if (!fs.existsSync(hooks)) { console.error('No .git folder found. Run "git init" first.'); process.exit(1); }
  fs.writeFileSync(path.join(hooks, 'pre-commit'), '#!/bin/sh\nnode tools/check-secrets.mjs --staged || exit 1\n', { mode: 0o755 });
  console.log('Installed the pre-commit hook: every commit will now be scanned for secrets.');
  process.exit(0);
}

// Files to scan: ask git first (exactly what will be committed); without git, walk the folder
function listFiles() {
  const staged = process.argv.includes('--staged');
  try {
    const cmd = staged ? 'git diff --cached --name-only --diff-filter=ACM' : 'git ls-files --cached --others --exclude-standard';
    const out = execSync(cmd, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    return out.split('\n').filter(Boolean);
  } catch { /* not a git repo */ }
  const skip = new Set(['.git', 'node_modules', 'data', 'dist']);
  // respect .gitignore for .env files (the ".env" line)
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

// Files that must never be committed
const BAD_FILES = [
  [/(^|\/)\.env(\..+)?$/, '.env file with secrets'],
  [/\.(db|db-wal|db-shm|sqlite)$/, 'database file with player data'],
  [/(^|\/)secret\.key$/, 'token signing key'],
  [/\.(pem|key|p12|pfx)$/, 'key / certificate file'],
  [/(^|\/)id_(rsa|ed25519|ecdsa)(\.pub)?$/, 'SSH key'],
];
const ALLOW_FILES = [/(^|\/)\.env\.example$/];

// Content that looks like a secret
const BAD_CONTENT = [
  [/-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/, 'private key'],
  [/AKIA[0-9A-Z]{16}/, 'AWS access key'],
  [/gh[pousr]_[A-Za-z0-9]{36,}/, 'GitHub token'],
  [/github_pat_[A-Za-z0-9_]{40,}/, 'GitHub token'],
  [/xox[abprs]-[A-Za-z0-9-]{10,}/, 'Slack token'],
  [/AIza[0-9A-Za-z_-]{35}/, 'Google API key'],
  [/sk-(ant-|proj-)?[A-Za-z0-9_-]{24,}/, 'API key (OpenAI/Anthropic…)'],
  [/(TOKEN_SECRET|SECRET|PASSWORD|API_KEY)\s*[=:]\s*['"]?[A-Za-z0-9+/_-]{16,}/, 'secret variable with a value'],
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
  if (text.includes('\u0000')) continue; // binary file
  if (f === 'tools/check-secrets.mjs') continue; // this file itself contains the regex patterns
  text.split('\n').forEach((line, i) => {
    for (const [re, what] of BAD_CONTENT) if (re.test(line)) problems.push(`${f}:${i + 1}: possible ${what}`);
  });
}

if (problems.length) {
  console.error('⚠ Found things that should not go into git:\n');
  for (const p of problems) console.error('  - ' + p);
  console.error('\nRemove them from the commit (git rm --cached <file>), add them to .gitignore, and rotate any secret that was already pushed.');
  process.exit(1);
}
console.log('✓ No secrets found in the files to be committed.');
