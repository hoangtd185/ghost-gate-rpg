// Bundles the client into a single HTML file (no external packages).
// Reads client/src/main.js, follows the imports, concatenates every module in dependency order,
// then inlines the CSS + JS into client/dist/index.html.
//   node tools/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLIENT = path.join(ROOT, 'client');
const SRC = path.join(CLIENT, 'src');
const DIST = path.join(CLIENT, 'dist');

const IMPORT_RE = /^\s*import\s*\{[^}]*\}\s*from\s*['"](.+?)['"];?\s*$/gm;
const order = [];
const seen = new Set();

function visit(file) {
  if (seen.has(file)) return;
  seen.add(file);
  const code = fs.readFileSync(file, 'utf8');
  for (const m of code.matchAll(IMPORT_RE)) visit(path.resolve(path.dirname(file), m[1]));
  order.push(file);
}
visit(path.join(SRC, 'main.js'));

// Check for duplicate top-level names across modules (they all share one scope)
const declared = new Map();
const DECL_RE = /^(?:export\s+)?(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm;
let clash = false;
for (const f of order) {
  const code = fs.readFileSync(f, 'utf8');
  for (const m of code.matchAll(DECL_RE)) {
    const name = m[1];
    if (declared.has(name)) { console.error(`Duplicate top-level name "${name}": ${path.relative(ROOT, declared.get(name))} and ${path.relative(ROOT, f)}`); clash = true; }
    else declared.set(name, f);
  }
}
if (clash) process.exit(1);

const parts = order.map((f) => {
  let code = fs.readFileSync(f, 'utf8');
  code = code.replace(IMPORT_RE, '');
  code = code.replace(/^export\s+(?=(?:async\s+)?(?:function|class|const|let|var)\b)/gm, '');
  return `// ---- ${path.relative(SRC, f)} ----\n${code}`;
});
const js = `(() => {\n'use strict';\n${parts.join('\n')}\n})();`;
const css = fs.readFileSync(path.join(SRC, 'style.css'), 'utf8');

// Full page (deployed to the server, or opened directly in a browser)
let html = fs.readFileSync(path.join(CLIENT, 'index.html'), 'utf8');
html = html.replace('<link rel="stylesheet" href="src/style.css">', () => `<style>\n${css}\n</style>`);
html = html.replace('<script type="module" src="src/main.js"></script>', () => `<script>\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>`);

fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'index.html'), html);

// Trimmed version for Claude Artifacts (the platform wraps it in <html><head><body>)
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
const head = html.match(/<head>([\s\S]*)<\/head>/)[1].replace(/<meta charset[^>]*>\s*/, '').replace(/<meta name="viewport"[^>]*>\s*/, '');
fs.writeFileSync(path.join(DIST, 'artifact.html'), head.trim() + '\n' + body.trim() + '\n');

const kb = (n) => (n / 1024).toFixed(0) + ' KB';
console.log(`Built ${order.length} modules -> client/dist/index.html (${kb(Buffer.byteLength(html))})`);
