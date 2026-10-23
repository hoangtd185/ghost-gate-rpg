// Shared helpers for the end-to-end acceptance scenarios (node:test + playwright-core).
// Each scenario file drives the real game in headless Chromium and asserts what a player would see.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const OUT = path.join(ROOT, 'tests/e2e/out');
export const GAME_FILE = pathToFileURL(path.join(ROOT, 'client/dist/index.html')).href;
fs.mkdirSync(OUT, { recursive: true });

export const launch = () => chromium.launch();

// A fresh browser context (own localStorage) with a page that records page errors and console errors.
// Failed resource loads (web fonts in offline sandboxes) are ignored.
export async function newPage(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push('console: ' + m.text()); });
  return { context, page, errors };
}

export const shot = (page, name) => page.screenshot({ path: path.join(OUT, name) });

// Create a character from the select/create screen and enter the game
export async function createCharacter(page, cls, name) {
  if (await page.locator('#newC').count()) await page.click('#newC');
  await page.click(`.cls[data-c="${cls}"]`);
  await page.fill('#cName', name);
  await page.click('#createF button[type=submit]');
  await page.waitForTimeout(900);
}

// Open the game from client/dist (localStorage backend) and create a character
export async function openGame(page, cls, name) {
  await page.goto(GAME_FILE);
  await page.waitForTimeout(800);
  await createCharacter(page, cls, name);
}

// ---- NPCs and dialogue ----
export async function talk(page, npc, map, x) {
  await page.evaluate(`(() => { const w = __game(); if (w.mapId !== '${map}') w.loadMap('${map}', ${x}); w.player.x = ${x} - 7; w.player.y = 250; w.player.vy = 0; })()`);
  await page.waitForTimeout(300);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(250);
}

// Click the first match; returns false (instead of throwing) when the element is not there
export async function click(page, sel) {
  const loc = page.locator(sel);
  if (!(await loc.count())) return false;
  await loc.first().click();
  await page.waitForTimeout(150);
  return true;
}

// Click through an open dialogue. Optionally collect every line and take a screenshot at line `shotAt`.
export async function runDialog(page, { collect, shot: shotName, shotAt = 1 } = {}) {
  let n = 0;
  while (n < 30 && (await page.locator('#win:not([hidden]) .dlg').count())) {
    if (collect) collect.push(await page.locator('.dlg-text').innerText());
    if (shotName && n === shotAt) await shot(page, shotName);
    const btn = page.locator('[data-act="dnext"], [data-act="daccept"], [data-act="dend"]');
    if (!(await btn.count())) break;
    await btn.first().click();
    await page.waitForTimeout(100);
    n++;
  }
  return n;
}

export async function esc(page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(120);
  if (await page.locator('.w-sys').count()) await page.keyboard.press('Escape');
}

export const quest = (page, id) => page.evaluate(`__game().ch.quests['${id}'] || null`);

// ---- Throwaway API server (own port, own temp database) ----
async function freePort() {
  return new Promise((resolve) => {
    const srv = net.createServer().listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
  });
}

export async function startServer() {
  const port = await freePort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qmq-e2e-'));
  const proc = spawn(process.execPath, ['server/src/index.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DATA_DIR: dataDir, NODE_ENV: 'development', LOGIN_LIMIT_PER_MIN: '1000', API_LIMIT_PER_MIN: '10000' },
    stdio: 'ignore',
  });
  const url = `http://127.0.0.1:${port}/`;
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(url + 'api/health')).ok) break; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  return {
    url,
    async api(p, body, token) {
      const r = await fetch(url + 'api/' + p, {
        method: body ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      return r.json();
    },
    // Wait for the server process to exit before removing its data folder: on Windows the
    // SQLite files stay locked until the process is gone. Cleanup failures never fail a test.
    async stop() {
      if (proc.exitCode === null) {
        const exited = new Promise((r) => proc.once('exit', r));
        proc.kill();
        await Promise.race([exited, new Promise((r) => setTimeout(r, 5000))]);
      }
      try { fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); }
      catch (e) { console.warn(`could not remove ${dataDir}: ${e.code}`); }
    },
  };
}

// Register a new account on the auth screen
export async function register(page, username, password) {
  const tab = page.locator('.tabs button[data-m="register"]');
  if (await tab.count()) await tab.click();
  await page.fill('#aU', username);
  await page.fill('#aP', password);
  await page.click('#authF button[type=submit]');
  await page.waitForTimeout(1000);
}

export const uniqueName = (prefix) => prefix + (Date.now() % 1e8) + Math.floor(Math.random() * 100);
