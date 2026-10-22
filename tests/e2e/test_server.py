import os, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
SERVER = os.environ.get('GAME_URL', 'http://localhost:8803/')
os.makedirs(ROOT/'tests'/'e2e'/'out', exist_ok=True)
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append('console '+m.text) if m.type=='error' and 'fonts' not in m.text and 'TUNNEL' not in m.text else None)
        await pg.goto(SERVER); await pg.wait_for_timeout(1200)
        tabs = pg.locator('.tabs button[data-m="register"]')
        if await tabs.count(): await tabs.click()
        await pg.fill('#aU','nguoichoi1'); await pg.fill('#aP','matkhau99'); await pg.click('#authF button[type=submit]'); await pg.wait_for_timeout(1000)
        if await pg.locator('#newC').count(): await pg.click('#newC')
        await pg.click('.cls[data-c="taoist"]'); await pg.fill('#cName','Thật Sự'); await pg.click('#createF button[type=submit]'); await pg.wait_for_timeout(1200)
        dbg = await pg.evaluate("typeof window.__game")
        print('debug exposed on localhost:', dbg)
        # play a bit: gain levels, spend points, save
        await pg.evaluate("const w=__game(); w.giveExp(30000); for(let i=0;i<10;i++) w.ch.stats.int++, w.ch.statPoints--; w.ch.skills.ta_p1=2; w.ch.skillPoints-=2; w.hooks.save()")
        await pg.wait_for_timeout(1500)
        print('save status:', await pg.locator('#hSave').inner_text())
        print(errs or 'no errors'); await b.close()
asyncio.run(main())
