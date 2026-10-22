# Chieftain mini boss ("Đầu Lĩnh") + run animation while sprinting
import os, pathlib, asyncio, json
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = str(ROOT/'tests'/'e2e'/'out') + '/'
os.makedirs(OUT, exist_ok=True)
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto((ROOT/'client'/'dist'/'index.html').as_uri()); await pg.wait_for_timeout(800)
        if await pg.locator('#newC').count(): await pg.click('#newC')
        await pg.click('.cls[data-c="swordsman"]'); await pg.fill('#cName', 'Săn Đầu Lĩnh'); await pg.click('#createF button[type=submit]'); await pg.wait_for_timeout(900)
        E = lambda js: pg.evaluate(js)
        await E("const w=__game(); w.player.invuln=99999; w.giveExp(4000); w.loadMap('forest', 300)"); await pg.wait_for_timeout(500)
        # force the next spawns to roll a chieftain: only one may exist at a time
        res = await E("""(() => { const w=__game(); const g=w.spawnGroups[0]; const r=Math.random; Math.random=()=>0.001;
          try { for (let i=0;i<3;i++) w.spawnMonster(g); } finally { Math.random=r; }
          const chiefs=w.monsters.filter(m=>m.chief); const c=chiefs[0];
          const normal=w.monsters.find(m=>!m.chief && !m.elite && m.id===c.id && m.def.lv===c.def.lv) || w.monsters.find(m=>!m.chief && !m.elite && m.id===c.id);
          return { chiefs: chiefs.length, name: c.def.name, lv: c.def.lv, hp: c.maxHp, atk: c.def.atk, scale: c.scale,
                   normal: normal ? { lv: normal.def.lv, hp: normal.maxHp, atk: normal.def.atk } : null }; })()""")
        print('chief:', json.dumps(res, ensure_ascii=False))
        chat = await E("[...document.querySelectorAll('#chatLog div, .chat div')].map(d=>d.textContent).filter(t=>t.includes('Đầu Lĩnh')).slice(-1)")
        print('announce:', chat)
        await E("""(() => { const w=__game(), p=w.player; const c=w.monsters.find(m=>m.chief); c.x=p.x+70; c.y=c.standY-c.h; c.aggro=p; c.aggroT=5; c.alpha=1; })()""")
        await pg.wait_for_timeout(500)
        await pg.screenshot(path=OUT + 'chief1.png')
        drops0 = await E("__game().drops.length")
        await E("const w=__game(); const c=w.monsters.find(m=>m.chief); c.hitByPlayer=true; w.damageMonster(c, 999999, 'player')"); await pg.wait_for_timeout(400)
        drops = await E("__game().drops.filter(d=>d.kind==='item').map(d=>d.data.id+(d.data.r?'+r'+d.data.r:''))")
        print('chief drops:', drops)
        # run animation: double tap → and hold
        await E("const w=__game(); w.monsters.forEach(m=>m.dead=true); w.player.x=200; w.player.invuln=0")  # invuln makes the sprite blink
        kb = pg.keyboard
        await kb.down('ArrowRight'); await pg.wait_for_timeout(60); await kb.up('ArrowRight'); await pg.wait_for_timeout(80); await kb.down('ArrowRight'); await pg.wait_for_timeout(350)
        print('anim while sprinting:', await E("__game().player.anim"))
        await pg.screenshot(path=OUT + 'run1.png')
        await kb.up('ArrowRight'); await pg.wait_for_timeout(50)
        await kb.down('ArrowRight'); await pg.wait_for_timeout(300)
        print('anim while walking:', await E("__game().player.anim")); await kb.up('ArrowRight')
        print(errs or 'no errors'); await b.close()
asyncio.run(main())
