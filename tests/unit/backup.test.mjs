// Database backups: a consistent compressed snapshot that restores to the same data, a corrupt file is refused,
// old backups are pruned, and the game can keep writing while the backup runs.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { openDb } from '../../server/src/db.js';
import { createBackup, verifyBackup, prune } from '../../tools/backup.mjs';

describe('database backup', () => {
  let dir, dbFile, db;
  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qmq-backup-'));
    dbFile = path.join(dir, 'game.db');
    db = openDb(dbFile);
    db.createUser('alice', 'hash-a');
    db.createUser('bob', 'hash-b');
  });
  after(() => { db.close(); fs.rmSync(dir, { recursive: true, force: true }); });

  it('writes a gzip snapshot that has the same data and passes the integrity check', async () => {
    const out = path.join(dir, 'backups');
    const r = await createBackup(dbFile, out, { keep: 3 });
    assert.match(path.basename(r.file), /^game-\d{8}T\d{6}Z\.db\.gz$/);
    assert.equal(r.counts.users, 2);
    assert.ok(r.bytes > 0);
    assert.deepEqual(fs.readdirSync(out), [path.basename(r.file)], 'no temp files left behind');
    const v = await verifyBackup(r.file);
    assert.equal(v.integrity, 'ok');
    assert.equal(v.counts.users, 2);
    // restore: unpack and open it like the game would
    const restored = path.join(dir, 'restored.db');
    fs.writeFileSync(restored, zlib.gunzipSync(fs.readFileSync(r.file)));
    const copy = new DatabaseSync(restored, { readOnly: true });
    assert.deepEqual(copy.prepare('SELECT username FROM users ORDER BY username').all().map((x) => x.username), ['alice', 'bob']);
    copy.close();
  });

  it('is a snapshot: later writes do not change it, and the live database keeps working', async () => {
    const out = path.join(dir, 'snap');
    const r = await createBackup(dbFile, out);
    db.createUser('carol', 'hash-c');
    assert.equal((await verifyBackup(r.file)).counts.users, 2);
    assert.equal(db.getUser('carol').username, 'carol');
  });

  it('keeps only the newest N backups', async () => {
    const out = path.join(dir, 'rotate');
    for (let i = 0; i < 4; i++) await createBackup(dbFile, out, { keep: 2, now: new Date(Date.UTC(2026, 10, 1 + i, 3, 0, 0)) });
    assert.deepEqual(fs.readdirSync(out).sort(), ['game-20261103T030000Z.db.gz', 'game-20261104T030000Z.db.gz']);
    fs.writeFileSync(path.join(out, 'notes.txt'), 'not a backup');
    assert.deepEqual(prune(out, 1), ['game-20261103T030000Z.db.gz']);
    assert.ok(fs.existsSync(path.join(out, 'notes.txt')), 'other files are left alone');
  });

  it('fails clearly when the database is missing or the backup file is damaged', async () => {
    await assert.rejects(createBackup(path.join(dir, 'nope.db'), path.join(dir, 'x')), /No database/);
    const bad = path.join(dir, 'bad.db.gz');
    fs.writeFileSync(bad, 'this is not gzip');
    await assert.rejects(verifyBackup(bad));
  });
});
