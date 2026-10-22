// Storage layer: picks where characters are saved
//  1. ApiStorage   – Node server present (npm start): saved to SQLite through the REST API, with login
//  2. CloudStorage – running inside a Claude artifact link: saved to the artifact database
//  3. LocalStore   – file opened directly: saved in the browser (localStorage)
// All three share one interface: list(), create(ch), save(ch), remove(id)

function withTimeout(promise, ms, fallback) {
  return Promise.race([promise, new Promise((r) => setTimeout(() => r(fallback), ms))]);
}

class ApiStorage {
  constructor() {
    this.kind = 'api'; this.label = 'Máy chủ (SQLite)';
    try { this.token = localStorage.getItem('qmq_token'); this.username = localStorage.getItem('qmq_user'); } catch { this.token = null; }
  }
  get needsAuth() { return !this.token; }
  async req(method, path, body) {
    const r = await fetch('api/' + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(this.token ? { Authorization: 'Bearer ' + this.token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401) { this.logout(); }
    if (!r.ok) throw new Error(data.error || `Lỗi máy chủ (${r.status})`);
    return data;
  }
  async auth(mode, username, password) {
    const d = await this.req('POST', `auth/${mode}`, { username, password });
    this.token = d.token; this.username = d.username;
    try { localStorage.setItem('qmq_token', d.token); localStorage.setItem('qmq_user', d.username); } catch {}
    return d;
  }
  logout() {
    this.token = null;
    try { localStorage.removeItem('qmq_token'); localStorage.removeItem('qmq_user'); } catch {}
  }
  async list() { return (await this.req('GET', 'characters')).characters; }
  async create(ch) { return (await this.req('POST', 'characters', { character: ch })).character; }
  async save(ch) { await this.req('PUT', 'characters/' + encodeURIComponent(ch.id), { character: ch }); }
  // Fire-and-forget upload that the browser finishes even after the page closes (keepalive bodies max 64 KB)
  saveKeepalive(ch) {
    const body = JSON.stringify({ character: ch });
    if (!this.token || body.length > 60000) return;
    fetch('api/characters/' + encodeURIComponent(ch.id), {
      method: 'PUT', keepalive: true, body,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + this.token },
    }).catch(() => { /* the outbox still has it */ });
  }
  async remove(id) { await this.req('DELETE', 'characters/' + encodeURIComponent(id)); }
  async leaderboard() { return (await this.req('GET', 'leaderboard')).top; }
}

class CloudStorage {
  constructor(db, uid) {
    this.kind = 'cloud'; this.label = 'Đám mây (tài khoản Claude)';
    this.col = db.collection('data/users/' + uid);
    this.needsAuth = false;
  }
  async list() {
    const snap = await this.col.get();
    return snap.docs.filter((d) => d.exists && d.id.startsWith('c_')).map((d) => JSON.parse(JSON.stringify(d.data())));
  }
  async create(ch) { await this.col.doc('c_' + ch.id).set(JSON.parse(JSON.stringify(ch))); return ch; }
  async save(ch) { await this.col.doc('c_' + ch.id).set(JSON.parse(JSON.stringify(ch))); }
  async remove(id) { await this.col.doc('c_' + id).delete(); }
}

class LocalStore {
  constructor() { this.kind = 'local'; this.label = 'Trình duyệt này'; this.needsAuth = false; this.mem = {}; }
  read() { try { return JSON.parse(localStorage.getItem('qmq_chars') || '{}'); } catch { return this.mem; } }
  write(all) { this.mem = all; try { localStorage.setItem('qmq_chars', JSON.stringify(all)); } catch {} }
  async list() { return Object.values(this.read()); }
  async create(ch) { const a = this.read(); a[ch.id] = ch; this.write(a); return ch; }
  async save(ch) { const a = this.read(); a[ch.id] = JSON.parse(JSON.stringify(ch)); this.write(a); }
  async remove(id) { const a = this.read(); delete a[id]; this.write(a); }
}

export async function createStorage() {
  // 1. Is there a server?
  if (location.protocol.startsWith('http')) {
    try {
      const r = await withTimeout(fetch('api/health'), 2000, null);
      if (r && r.ok) {
        const j = await r.json();
        if (j && j.game === 'quy-mon-quan') return new ApiStorage();
      }
    } catch { /* no server */ }
  }
  // 2. Running inside a Claude artifact?
  if (window.claude && typeof window.claude.use === 'function') {
    try {
      const db = await withTimeout(window.claude.use('db'), 8000, null);
      const user = db ? await withTimeout(window.claude.use('user'), 5000, null) : null;
      const uid = user ? await withTimeout(user.id(), 5000, null) : null;
      if (db && uid) return new CloudStorage(db, uid);
    } catch { /* ignore */ }
  }
  // 3. Save in the browser
  return new LocalStore();
}

// ===== Save queue =====
// Every save is first written to a local "outbox" in localStorage (synchronous, so it survives a crash,
// Alt+F4 or a lost connection), then uploaded to the backend in the background. An entry leaves the
// outbox only after the backend confirms it. Failed uploads retry with backoff (2 s … 30 s) and right
// away when the browser comes back online. Entries still in the outbox are merged back into the
// character list on the next load (see mergeOutbox), so nothing picked up is lost.
const outboxKey = (s) => `qmq_outbox:${s.kind}:${s.username || ''}`;
function readOutbox(s) { try { return JSON.parse(localStorage.getItem(outboxKey(s)) || '{}'); } catch { return {}; } }
function writeOutbox(s, box) {
  try {
    if (Object.keys(box).length) localStorage.setItem(outboxKey(s), JSON.stringify(box));
    else localStorage.removeItem(outboxKey(s));
  } catch { /* storage full or blocked: the upload still runs */ }
}
function clearOutboxEntry(s, snap) {
  const box = readOutbox(s);
  if (box[snap.id] && box[snap.id].savedAt === snap.savedAt) { delete box[snap.id]; writeOutbox(s, box); }
}

// Use unsent local copies that are at least as far along as the server copy, and re-upload them.
// Outbox entries for characters that no longer exist are dropped.
export function mergeOutbox(storage, chars) {
  if (storage.kind === 'local') return chars;
  const box = readOutbox(storage);
  if (!Object.keys(box).length) return chars;
  const ids = new Set(chars.map((c) => c.id));
  for (const id of Object.keys(box)) if (!ids.has(id)) delete box[id];
  writeOutbox(storage, box);
  return chars.map((c) => {
    const o = box[c.id];
    if (!o || (o.playTime || 0) < (c.playTime || 0)) return c;
    storage.save(o).then(() => clearOutboxEntry(storage, o)).catch(() => { /* stays in the outbox */ });
    return o;
  });
}

export class SaveQueue {
  constructor(storage, onStatus) {
    this.s = storage; this.onStatus = onStatus;
    this.useOutbox = storage.kind !== 'local'; // LocalStore already writes to localStorage synchronously
    this.pending = null; this.busy = false; this.retryT = null; this.delay = 0;
    window.addEventListener('online', () => this.kick());
  }
  // Queue a snapshot of the character. Returns at once; the upload happens in the background.
  save(ch) {
    const snap = JSON.parse(JSON.stringify(ch));
    if (this.useOutbox) { const box = readOutbox(this.s); box[snap.id] = snap; writeOutbox(this.s, box); }
    this.pending = snap; // only the newest snapshot matters, older ones are replaced
    if (!this.busy && !this.retryT) setTimeout(() => this.flush(), 0);
    return snap;
  }
  // The page is closing: the outbox already holds this state; also fire one upload that outlives the page.
  saveOnExit(ch) {
    const snap = this.save(ch);
    if (this.s.saveKeepalive) this.s.saveKeepalive(snap);
  }
  // Drop queued work (logout): unsent data stays in the outbox of that account.
  reset() { this.pending = null; clearTimeout(this.retryT); this.retryT = null; this.delay = 0; }
  kick() { clearTimeout(this.retryT); this.retryT = null; this.delay = 0; this.flush(); }
  async flush() {
    if (this.busy || !this.pending) return;
    this.busy = true;
    const snap = this.pending; this.pending = null;
    this.onStatus && this.onStatus('saving');
    try {
      await this.s.save(snap);
      this.delay = 0;
      if (this.useOutbox) clearOutboxEntry(this.s, snap);
      this.onStatus && this.onStatus('saved');
    } catch (e) {
      if (!this.pending) this.pending = snap; // keep the newest snapshot for the retry
      this.delay = Math.min(30000, this.delay ? this.delay * 2 : 2000);
      this.onStatus && this.onStatus('error', this.useOutbox ? 'đã giữ trên máy, sẽ tự gửi lại' : e.message);
      this.retryT = setTimeout(() => { this.retryT = null; this.flush(); }, this.delay);
    }
    this.busy = false;
    if (this.pending && !this.retryT) this.flush();
  }
}
