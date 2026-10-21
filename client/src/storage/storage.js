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

// Save queue: never runs two saves at the same time
export class Saver {
  constructor(storage, onStatus) { this.s = storage; this.busy = false; this.pending = null; this.onStatus = onStatus; }
  save(ch) {
    this.pending = ch;
    if (!this.busy) this.flush();
  }
  async flush() {
    if (!this.pending) return;
    this.busy = true;
    const ch = this.pending; this.pending = null;
    this.onStatus && this.onStatus('saving');
    try { await this.s.save(ch); this.onStatus && this.onStatus('saved'); }
    catch (e) { this.onStatus && this.onStatus('error', e.message); }
    this.busy = false;
    if (this.pending) this.flush();
  }
}
