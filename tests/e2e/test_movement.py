# Movement: double-tap and hold ← / → to sprint, Ctrl + ↓ to drop through a platform
import os, pathlib, asyncio
ROOT = pathlib.Path(__file__).resolve().parents[2]
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto((ROOT/'client'/'dist'/'index.html').as_uri()); await pg.wait_for_timeout(800)
        if await pg.locator('#newC').count(): await pg.click('#newC')
        await pg.click('.cls[data-c="assassin"]'); await pg.fill('#cName', 'Khinh Công'); await pg.click('#createF button[type=submit]'); await pg.wait_for_timeout(900)
        E = lambda js: pg.evaluate(js)
        await E("const w=__game(); w.player.invuln=99999; w.loadMap('field', 200); w.monsters.forEach(m=>m.dead=true)"); await pg.wait_for_timeout(400)
        kb = pg.keyboard
        # normal walk
        await kb.down('ArrowRight'); await pg.wait_for_timeout(300); walk = await E("__game().player.vx"); await kb.up('ArrowRight')
        await pg.wait_for_timeout(400)
        # double tap then hold
        await kb.down('ArrowRight'); await pg.wait_for_timeout(60); await kb.up('ArrowRight'); await pg.wait_for_timeout(90)
        await kb.down('ArrowRight'); await pg.wait_for_timeout(300); run = await E("[__game().player.vx, __game().player.running]")
        await kb.up('ArrowRight'); await pg.wait_for_timeout(100)
        after = await E("__game().player.running")
        # slow double tap (too slow) = walk
        await kb.down('ArrowLeft'); await pg.wait_for_timeout(60); await kb.up('ArrowLeft'); await pg.wait_for_timeout(450)
        await kb.down('ArrowLeft'); await pg.wait_for_timeout(250); slow = await E("__game().player.vx"); await kb.up('ArrowLeft')
        print('walk vx', round(walk), '| sprint vx', round(run[0]), run[1], '| after release running:', after, '| slow double tap vx', round(slow))
        # Ctrl + ↓ on a platform
        y = await E("""(() => { const w=__game(), p=w.player; const pl=w.map.platforms.find(q=>q.y < 300);
          p.x = pl.x + pl.w/2; p.y = pl.y - p.h - 1; p.vy = 0; return [pl.y, p.standY]; })()""")
        await pg.wait_for_timeout(400)
        before = await E("[__game().player.standY, __game().player.onGround]")
        await kb.down('Control'); await kb.press('ArrowDown'); await pg.wait_for_timeout(60); print('  right after:', await E('[__game().player.dropTimer, __game().player.onGround]')); await kb.up('Control'); await pg.wait_for_timeout(900)
        dropped = await E("[__game().player.standY, __game().player.onGround, __game().player.sitting]")
        print('platform y', y[0], '| standY before', before, '| after Ctrl+↓', dropped)
        # ↓ then Ctrl (other order)
        await E("""(() => { const w=__game(), p=w.player; const pl=w.map.platforms.find(q=>q.y < 300); p.x = pl.x + pl.w/2; p.y = pl.y - p.h - 1; p.vy = 0; })()""")
        await pg.wait_for_timeout(400)
        await kb.down('ArrowDown'); await pg.wait_for_timeout(100); await kb.press('Control'); await pg.wait_for_timeout(60); print('  right after:', await E('[__game().player.dropTimer, __game().player.onGround, Math.round(__game().player.y)]')); await kb.up('ArrowDown'); await pg.wait_for_timeout(900)
        print('after ↓ then Ctrl:', await E("[__game().player.standY, __game().player.onGround]"))
        # plain ↓ on a platform still sits, does not drop
        await E("""(() => { const w=__game(), p=w.player; const pl=w.map.platforms.find(q=>q.y < 300); p.x = pl.x + pl.w/2; p.y = pl.y - p.h - 1; p.vy = 0; })()""")
        await pg.wait_for_timeout(400)
        await kb.down('ArrowDown'); await pg.wait_for_timeout(500); sit = await E("[__game().player.standY, __game().player.sitting]"); await kb.up('ArrowDown')
        print('plain ↓ on platform (stays, sits):', sit)
        print(errs or 'no errors'); await b.close()
asyncio.run(main())
