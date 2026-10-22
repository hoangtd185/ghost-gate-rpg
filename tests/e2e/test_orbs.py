# Taoist skill D: 4 homing thunder orbs that focus one target (boss > named > elite > nearest)
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
        await pg.click('.cls[data-c="taoist"]'); await pg.fill('#cName', 'Lôi Sư'); await pg.click('#createF button[type=submit]'); await pg.wait_for_timeout(900)
        E = lambda js: pg.evaluate(js)
        await E("const w=__game(); w.player.invuln=99999; w.giveExp(60000); w.ch.skills.ta_orbs=1; w.loadMap('graveyard', 300); w.player.x=300")
        await pg.wait_for_timeout(600)
        # put one elite a bit further away than the regular monsters, all in range
        info = await E("""(() => { const w=__game(); const p=w.player;
          const ms=w.monsters.filter(m=>!m.dead).sort((a,b)=>Math.abs(a.cx-p.cx)-Math.abs(b.cx-p.cx)).slice(0,4);
          ms.forEach((m,i)=>{ m.x=p.x+60+i*35; m.y=p.y-10; m.vx=0; m.hp=m.maxHp=99999; m.elite=(i===3); m.aggroT=0; });
          window.__ms=ms; return ms.map(m=>[m.def.name, Math.round(m.cx-p.cx), m.elite]); })()""")
        print('monsters near player:', info)
        await E("__game().player.facing=1")
        await pg.keyboard.press('KeyD'); await pg.wait_for_timeout(180)
        await pg.screenshot(path=OUT + 'orbs1_cast.png')
        await pg.wait_for_timeout(250)
        await pg.screenshot(path=OUT + 'orbs2_flight.png')
        await pg.wait_for_timeout(1500)
        res = await E("JSON.stringify(window.__ms.map(m=>[m.def.name, m.elite, Math.round(m.maxHp-m.hp)]))")
        print('damage taken [name, elite, dmg]:', res)
        print('orbs left:', await E("__game().projs.filter(x=>x.kind==='thunderorb').length"), 'cd', await E("__game().player.cooldowns.ta_orbs.toFixed(1)"))
        # target dies mid-flight -> orbs retarget
        await E("const w=__game(); w.player.cooldowns.ta_orbs=0; window.__ms.forEach(m=>{m.hp=m.maxHp=99999}); window.__ms[3].hp=1")
        await pg.keyboard.press('KeyD'); await pg.wait_for_timeout(1800)
        res2 = await E("JSON.stringify(window.__ms.map(m=>[m.def.name, m.elite, m.dead, Math.round(m.maxHp-m.hp)]))")
        print('after elite dies early:', res2)
        # no monsters in range: orbs fly forward and expire
        await E("const w=__game(); w.player.cooldowns.ta_orbs=0; w.loadMap('village', 300)"); await pg.wait_for_timeout(300)
        await pg.keyboard.press('KeyD'); await pg.wait_for_timeout(200)
        print('safe map cast orbs:', await E("__game().projs.length"))
        print(errs or 'no errors'); await b.close()
asyncio.run(main())
