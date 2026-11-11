// Consistent backup of the SQLite game database, with no packages and no downtime.
//   node tools/backup.mjs <game.db> <backup dir> [--keep N]   write <dir>/game-<UTC time>.db.gz, keep the newest N (default 7)
//   node tools/backup.mjs --verify <file.db.gz>                 unpack to a temp file and check it (integrity, row counts)
// `VACUUM INTO` copies a consistent snapshot while the game keeps running (WAL mode); the copy is checked with
// `PRAGMA integrity_check` before it is compressed, so a corrupt snapshot is never kept as a backup.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const NAME_RE = /^game-\d{8}T\d{6}Z\.db\.gz$/;
const TABLES = ['users', 'characters', 'items', 'quests'];

// Opens a database file read-only and returns { integrity: 'ok' | message, counts: { table: rows } }
function inspect(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const integrity = db.prepare('PRAGMA integrity_check').all().map((r) => r.integrity_check).join('; ');
    const counts = {};
    for (const t of TABLES) counts[t] = db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
    return { integrity, counts };
  } finally { db.close(); }
}

// 20261111T031500Z, so file names sort by time
const stamp = (d = new Date()) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');

// Writes a compressed, verified snapshot of `dbFile` into `outDir`, then deletes all but the newest `keep` backups.
// Returns { file, bytes, counts, removed }.
export async function createBackup(dbFile, outDir, { keep = 7, now = new Date() } = {}) {
  if (!fs.existsSync(dbFile)) throw new Error(`No database at ${dbFile}`);
  fs.mkdirSync(outDir, { recursive: true });
  const plain = path.join(outDir, `.tmp-${process.pid}.db`);
  const target = path.join(outDir, `game-${stamp(now)}.db.gz`);
  fs.rmSync(plain, { force: true });
  const db = new DatabaseSync(dbFile);
  try {
    db.exec('PRAGMA busy_timeout = 10000');
    db.prepare('VACUUM INTO ?').run(plain);
  } finally { db.close(); }
  try {
    const { integrity, counts } = inspect(plain);
    if (integrity !== 'ok') throw new Error(`The snapshot failed its integrity check: ${integrity}`);
    await pipeline(fs.createReadStream(plain), zlib.createGzip({ level: 9 }), fs.createWriteStream(target + '.part', { mode: 0o600 }));
    fs.renameSync(target + '.part', target); // a half-written file never has the final name
    const removed = prune(outDir, keep);
    return { file: target, bytes: fs.statSync(target).size, counts, removed };
  } finally { fs.rmSync(plain, { force: true }); }
}

// Keeps the newest `keep` backups in `dir` (by file name), returns the names removed
export function prune(dir, keep) {
  const all = fs.readdirSync(dir).filter((f) => NAME_RE.test(f)).sort();
  const old = all.slice(0, Math.max(0, all.length - Math.max(1, keep)));
  for (const f of old) fs.rmSync(path.join(dir, f), { force: true });
  return old;
}

// Unpacks a backup to a temp file and checks it. Returns { integrity, counts }.
export async function verifyBackup(gzFile) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qmq-verify-'));
  const plain = path.join(dir, 'game.db');
  try {
    await pipeline(fs.createReadStream(gzFile), zlib.createGunzip(), fs.createWriteStream(plain));
    return inspect(plain);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

// command line
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  try {
    if (args[0] === '--verify') {
      const r = await verifyBackup(args[1]);
      console.log(`integrity: ${r.integrity}`, r.counts);
      process.exit(r.integrity === 'ok' ? 0 : 1);
    }
    const keepAt = args.indexOf('--keep');
    const keep = keepAt >= 0 ? Math.floor(+args[keepAt + 1]) : 7;
    const [dbFile, outDir] = args.filter((a, i) => !a.startsWith('--') && i !== keepAt + 1);
    if (!dbFile || !outDir || !(keep >= 1)) { console.error('Usage: node tools/backup.mjs <game.db> <backup dir> [--keep N]  |  --verify <file.db.gz>'); process.exit(2); }
    const r = await createBackup(dbFile, outDir, { keep });
    console.log(`backup: ${r.file} (${(r.bytes / 1024).toFixed(0)} KB)`, r.counts, r.removed.length ? `removed ${r.removed.length} old` : '');
  } catch (e) { console.error('backup failed:', e.message); process.exit(1); }
}
