# Save queue against a running server (GAME_URL, default http://localhost:8803/):
#  1. a rare drop is saved right away, no need to wait for the 20 s autosave
#  2. picked up while offline -> kept in the local outbox -> merged back and uploaded on the next login
#  3. picked up and the tab is closed at once (like Alt+F4) -> still saved
import os, pathlib, asyncio, json, time
ROOT = pathlib.Path(__file__).resolve().parents[2]
SERVER = os.environ.get('GAME_URL', 'http://localhost:8803/')
from playwright.async_api import async_playwright

TOKEN = None
USER, PASS = 'queue%d' % (int(time.time()) % 100000), 'matkhau99'

import urllib.request
def api(path, body=None, token=None):
    req = urllib.request.Request(SERVER + 'api/' + path, data=json.dumps(body).encode() if body else None,
        headers={'Content-Type': 'application/json', **({'Authorization': 'Bearer ' + token} if token else {})})
    return json.loads(urllib.request.urlopen(req).read())
async def server_items(_pg=None):
    # asks the server directly, outside the browser, so the outbox cannot interfere
    global TOKEN
    if not TOKEN: TOKEN = api('auth/login', {'username': USER, 'password': PASS})['token']  # login once (rate limited)
    tok = TOKEN
    c = api('characters', token=tok)['characters'][0]
    return [e['id'] for e in c['inventory']]

async def drop_and_pick(pg, item, r=3):
    await pg.evaluate(f"""(() => {{ const w = __game(); const p = w.player;
      w.pickupDrop({{ kind: 'item', data: {{ id: '{item}', qty: 1, r: {r}, b: {{}} }}, taken: false }}, p.cx, p.y); }})()""")

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 1280, 'height': 720})
        pg = await ctx.new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(SERVER); await pg.wait_for_timeout(1000)
        await pg.click('.tabs button[data-m="register"]')
        await pg.fill('#aU', USER); await pg.fill('#aP', PASS); await pg.click('#authF button[type=submit]'); await pg.wait_for_timeout(1000)
        if await pg.locator('#newC').count(): await pg.click('#newC')
        await pg.click('.cls[data-c="swordsman"]'); await pg.fill('#cName', 'Hàng Đợi ' + USER[-3:]); await pg.click('#createF button[type=submit]'); await pg.wait_for_timeout(1500)

        # 1. rare drop saves at once
        await drop_and_pick(pg, 'out_peach_fairy'); await pg.wait_for_timeout(600)
        print('1. server has outfit right after pickup:', 'out_peach_fairy' in await server_items(pg))

        # 2. pickup while the server cannot be reached (every save request fails), then the tab is closed
        async def fail(route): await route.abort('internetdisconnected')
        await ctx.route('**/api/characters/**', fail)
        await drop_and_pick(pg, 'out_phoenix'); await pg.wait_for_timeout(800)
        print('2. status while disconnected:', await pg.locator('#hSave').inner_text())
        box = await pg.evaluate("Object.keys(localStorage).filter(k => k.startsWith('qmq_outbox')).map(k => JSON.parse(localStorage[k]))")
        print('   outbox has phoenix:', any('out_phoenix' in [e['id'] for e in c['inventory']] for o in box for c in o.values()))
        # a real disconnect would also kill the last keepalive upload; block it so only the outbox can save us
        await pg.evaluate("const f = window.fetch; window.fetch = (u, o) => (o && o.keepalive ? Promise.reject(new Error('offline')) : f(u, o))")
        await pg.close(run_before_unload=True)  # tab closed while still disconnected
        await asyncio.sleep(0.5)
        await ctx.unroute('**/api/characters/**', fail)
        print('   server after closing (expected False, only the outbox has it):', 'out_phoenix' in await server_items())
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(SERVER); await pg.wait_for_timeout(1500)
        await pg.click('[data-play]'); await pg.wait_for_timeout(1200)
        inv = await pg.evaluate("__game().ch.inventory.map(e => e.id)")
        print('   in game after reconnect:', 'out_phoenix' in inv, '| server now:', 'out_phoenix' in await server_items(pg))

        # 3. pick up and close the tab immediately (Alt+F4)
        await drop_and_pick(pg, 'out_blood_moon')
        await pg.close(run_before_unload=True)
        await asyncio.sleep(1.0)
        print('3. server has item picked right before closing:', 'out_blood_moon' in await server_items(pg))
        print(errs or 'no errors'); await b.close()
asyncio.run(main())
