import os, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
SERVER = os.environ.get('GAME_URL', 'http://localhost:8803/')
os.makedirs(ROOT/'tests'/'e2e'/'out', exist_ok=True)
import asyncio
from playwright.async_api import async_playwright
OUT=str(ROOT/'tests'/'e2e'/'out')+'/'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto((ROOT/'client'/'dist'/'index.html').as_uri()); await pg.wait_for_timeout(800)
        if await pg.locator('#newC').count(): await pg.click('#newC')
        await pg.click('.cls[data-c="assassin"]'); await pg.fill('#cName','Thợ Thêu'); await pg.click('#createF button[type=submit]'); await pg.wait_for_timeout(800)
        E=lambda js: pg.evaluate(js)
        await E("const w=__game(); w.giveExp(3000); w.ch.quests.m1={s:'done',p:1}; w.ch.quests.m2={s:'done',p:8}; w.ch.gold=50000")
        async def talk():
            await E("const w=__game(); w.player.x=1323; w.player.y=250"); await pg.wait_for_timeout(300); await pg.keyboard.press('KeyE'); await pg.wait_for_timeout(300)
        await talk(); print(await pg.locator('.w-npc').inner_text())
        await pg.click('[data-act="qaccept"][data-q="tut_craft"]')
        while await pg.locator('#win:not([hidden]) [data-act="dnext"], #win:not([hidden]) [data-act="daccept"]').count():
            await pg.locator('[data-act="dnext"], [data-act="daccept"]').first.click(); await pg.wait_for_timeout(80)
        await pg.click('[data-act="craftwin"]'); await pg.click('[data-act="csel"][data-r="r_hp"]'); await pg.click('[data-act="craft"][data-n="1"]'); await pg.wait_for_timeout(200)
        print('tut_craft', await E("JSON.stringify(__game().ch.quests.tut_craft)"), 'hp_l', await E("__game().ch.inventory.filter(e=>e.id==='hp_l').map(e=>e.qty)"))
        await E("""const w=__game(); for (const [id,n] of [['mat_peach',45],['mat_tail',20],['mat_wisp',20],['mat_dew',1],['mat_icesilk',12]]) w.ch.inventory.push({uid:id+'x',id,qty:n,r:0,b:{}})""")
        await pg.click('[data-act="csel"][data-r="r_rainbow_fairy"]'); await pg.wait_for_timeout(100); await pg.screenshot(path=OUT+'craft1.png')
        await pg.click('[data-act="csel"][data-r="r_peach_fairy"]'); await pg.click('[data-act="craft"][data-n="1"]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=OUT+'craft2.png')
        print('outfit', await E("JSON.stringify(__game().ch.inventory.filter(e=>e.id.startsWith('out_')))"), 'dew left', await E("__game().ch.inventory.filter(e=>e.id==='mat_dew').length"))
        print(errs or 'no errors'); await b.close()
asyncio.run(main())
