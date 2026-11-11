// GameWorld, GameUI and GameDb get their methods from feature files (Object.assign onto the prototype).
// A method name used twice would be overwritten silently, so no two parts may share one, and no part may
// reuse the name of a method declared in the class itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { NetWorld } from '../../client/src/game/world/net.js';
import { CombatWorld } from '../../client/src/game/world/combat.js';
import { DropsWorld } from '../../client/src/game/world/drops.js';
import { FxWorld } from '../../client/src/game/world/fx.js';
import { RenderWorld } from '../../client/src/game/world/render.js';
import { PanelsUI } from '../../client/src/ui/hud/panels.js';
import { NpcUI } from '../../client/src/ui/hud/npc.js';
import { ForgeUI } from '../../client/src/ui/hud/forge.js';
import { TradeUI } from '../../client/src/ui/hud/trade.js';
import { ActionsUI } from '../../client/src/ui/hud/actions.js';
import { PremiumUI } from '../../client/src/ui/premium.js';
import { ItemsDb } from '../../server/src/db/items.js';
import { PremiumDb } from '../../server/src/db/premium.js';

const CLASSES = {
  GameWorld: { file: 'client/src/game/world.js', parts: { NetWorld, CombatWorld, DropsWorld, FxWorld, RenderWorld } },
  GameUI: { file: 'client/src/ui/hud.js', parts: { PanelsUI, NpcUI, ForgeUI, TradeUI, ActionsUI, PremiumUI } },
  GameDb: { file: 'server/src/db.js', parts: { ItemsDb, PremiumDb } },
};

// method names declared directly in `class Name { ... }` (two-space indent), read from the source
function ownMethods(file, cls) {
  const src = fs.readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
  const start = src.indexOf(`class ${cls} {`);
  assert.ok(start >= 0, `${cls} in ${file}`);
  const names = new Set();
  for (const m of src.slice(start).matchAll(/^  (?:async |get |set |static )?([A-Za-z_$][\w$]*)\(/gm)) names.add(m[1]);
  return names;
}

for (const [cls, { file, parts }] of Object.entries(CLASSES)) {
  test(`${cls}: no method name is used by two parts or by the class itself`, () => {
    const own = ownMethods(file, cls);
    assert.ok(own.has('constructor'), 'parsed the class body');
    const seen = new Map();
    for (const [part, obj] of Object.entries(parts)) {
      for (const name of Object.keys(obj)) {
        assert.ok(!own.has(name), `${part}.${name} is also declared in ${cls}`);
        assert.ok(!seen.has(name), `${part}.${name} is also in ${seen.get(name)}`);
        seen.set(name, part);
      }
    }
  });
}
