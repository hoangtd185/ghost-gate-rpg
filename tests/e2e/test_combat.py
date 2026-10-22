import os, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
SERVER = os.environ.get('GAME_URL', 'http://localhost:8803/')
os.makedirs(ROOT/'tests'/'e2e'/'out', exist_ok=True)
import asyncio, json
from playwright.async_api import async_playwright
OUT=str(ROOT/'tests'/'e2e'/'out')+'/'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto((ROOT/'client'/'dist'/'index.html').as_uri()); await pg.wait_for_timeout(800)
        if await pg.locator('#newC').count(): await pg.click('#newC')
        await pg.click('.cls[data-c="swordsman"]'); await pg.fill('#cName','Thử Quái'); await pg.click('#createF button[type=submit]'); await pg.wait_for_timeout(800)
        E = lambda js: pg.evaluate(js)
        # --- sealed portal
        await E("const w=__game(); w.loadMap('forest', 2240); w.player.x=2240; w.player.y=250")
        await pg.wait_for_timeout(500); await pg.keyboard.press('ArrowUp'); await pg.wait_for_timeout(400)
        print('map after locked portal:', await E("__game().mapId")); await pg.screenshot(path=OUT+'g1_seal.png')
        # --- passives
        await E("const w=__game(); w.giveExp(160000); w.ch.gold=99999; w.player.invuln=0")
        print('lv', await E("__game().ch.level"), 'sp', await E("__game().ch.skillPoints"))
        hp0 = await E("__game().stats.maxHp")
        await E("__game().loadMap('village', 400)"); await pg.wait_for_timeout(300)
        await pg.keyboard.press('KeyK'); await pg.wait_for_timeout(200); await pg.click('[data-act="stab"][data-t="pas"]')
        for i in range(3): await pg.click('[data-act="pasup"][data-pid="sw_p1"]'); await pg.wait_for_timeout(80)
        for i in range(2): await pg.click('[data-act="pasup"][data-pid="sw_p2"]'); await pg.wait_for_timeout(80)
        await pg.click('[data-act="pasup"][data-pid="sw_p3"]'); await pg.wait_for_timeout(100)
        await pg.screenshot(path=OUT+'g2_passive.png')
        print('maxHp', hp0, '->', await E("__game().stats.maxHp"), 'pas', await E("JSON.stringify(__game().stats.pas)"))
        await pg.click('[data-act="sreset"]'); await pg.click('[data-act="sreset"]'); await pg.wait_for_timeout(100)
        print('after reset sp', await E("__game().ch.skillPoints"), 'skills', await E("JSON.stringify(__game().ch.skills)"))
        for i in range(5): await pg.click('[data-act="pasup"][data-pid="sw_p1"]'); await pg.wait_for_timeout(50)
        for i in range(3): await pg.click('[data-act="pasup"][data-pid="sw_p2"]'); await pg.wait_for_timeout(50)
        for i in range(3): await pg.click('[data-act="pasup"][data-pid="sw_p3"]'); await pg.wait_for_timeout(50)
        await pg.keyboard.press('Escape')
        # --- reflect: ice golem
        await E("const w=__game(); w.loadMap('ice_cave', 300); w.player.x=300; w.player.y=250"); await pg.wait_for_timeout(800)
        info = await E("JSON.stringify(__game().monsters.map(m=>[m.id, m.def.lv, m.tier, m.elite, [...m.affix].join('+')]))")
        print('bangdong monsters:', info)
        r = await E("""() => { const w=__game(); const m=w.monsters.find(m=>m.id==='golem'); const hp0=w.ch.hp; w.damageMonster(m, 3, 'player'); return [hp0, w.ch.hp, m.hp, m.maxHp]; }""")
        print('reflect: player hp', r)
        # --- forced elite spawn
        await E("""const w=__game(); const M=window.__Monster; const m=new M('golem', 700, 296, [600, 900], null, {elite:true}); w.monsters.push(m); w.player.x=600; w.player.y=250; m.aggro=w.player; m.aggroT=99""")
        await pg.wait_for_timeout(1500); await pg.screenshot(path=OUT+'g3_elite.png')
        print('elite:', await E("JSON.stringify(__game().monsters.filter(m=>m.elite).map(m=>[m.def.name,m.def.lv,m.maxHp,[...m.affix]]))"))
        # --- run the AI for 8 seconds, player invulnerable
        await E("const w=__game(); w.player.invuln=99999; w.player.x=1200; w.player.y=250"); await pg.wait_for_timeout(6000)
        await pg.screenshot(path=OUT+'g4_ai.png')
        # --- poison + slow
        await E("const w=__game(); w.loadMap('swamp', 900); w.player.invuln=0; w.player.x=900; w.player.y=250; const f=w.monsters.find(m=>m.id==='frog'); w.hurtPlayer(50, 1, 'poison', f)")
        await pg.wait_for_timeout(700); print('poison', await E("__game().player.poisonT"))
        await pg.screenshot(path=OUT+'g5_poison.png')
        await E("__game().player.invuln=99999")
        # --- field boss
        await E("const w=__game(); w.loadMap('snow_peak', 1500); w.player.x=1400; w.player.y=250; w.spawnNamed('fb_yeti')")
        await pg.wait_for_timeout(2500); await pg.screenshot(path=OUT+'g6_fieldboss.png')
        print('named:', await E("JSON.stringify(__game().monsters.filter(m=>m.named).map(m=>[m.def.name,m.def.lv,m.maxHp,m.scale]))"))
        # kill it and force an outfit drop to see the light pillar
        await E("""const w=__game(); const m=w.monsters.find(m=>m.named); m.def.drops=[['out_white_fox',1],['GEM2',1]]; m.hitByPlayer=true; w.damageMonster(m, 99999, 'player')""")
        await pg.wait_for_timeout(1500); await pg.screenshot(path=OUT+'g7_rare.png')
        await E("const w=__game(); for (const d of [...w.drops]) w.pickupDrop(d,0,0)")
        # --- wear the outfit
        await E("""const w=__game(); const e=w.ch.inventory.find(x=>x.id==='out_white_fox'); """)
        await pg.keyboard.press('KeyI'); await pg.wait_for_timeout(200)
        await pg.locator('.islot[title="Bạch Hồ Cừu"]').first.click(); await pg.wait_for_timeout(100)
        await pg.click('[data-act="equip"]'); await pg.wait_for_timeout(200)
        await pg.screenshot(path=OUT+'g8_inv.png'); await pg.keyboard.press('Escape')
        await E("const w=__game(); w.loadMap('village', 600)"); await pg.wait_for_timeout(1200); await pg.screenshot(path=OUT+'g9_wear.png')
        # --- story boss for st4
        await E("const w=__game(); for (const q of ['m1','m2','m3','m4','st1','st2','st3']) w.ch.quests[q]={s:'done',p:1}; w.ch.quests.st4={s:'active',p:0}; w.loadMap('field', 1300); w.player.x=1300; w.player.y=250")
        await pg.wait_for_timeout(3000)
        print('st4 named:', await E("__game().monsters.filter(m=>m.named).map(m=>m.def.name).join(',')"))
        await pg.screenshot(path=OUT+'g10_storyboss.png')
        await E("const w=__game(); const m=w.monsters.find(m=>m.named); m.hitByPlayer=true; w.damageMonster(m, 99999, 'player')"); await pg.wait_for_timeout(300)
        print('st4', await E("JSON.stringify(__game().ch.quests.st4)"))
        print('reward exp st4 / st7 / st18:', await E("[QUESTS_EXP('st4'),QUESTS_EXP('st7'),QUESTS_EXP('st18')]".replace("QUESTS_EXP","(q=>0)")))
        print(errs or 'no errors'); await b.close()
asyncio.run(main())
