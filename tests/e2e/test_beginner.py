import os, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
SERVER = os.environ.get('GAME_URL', 'http://localhost:8803/')
os.makedirs(ROOT/'tests'/'e2e'/'out', exist_ok=True)
import asyncio, json
from playwright.async_api import async_playwright
OUT=str(ROOT/'tests'/'e2e'/'out')+'/'
NPCX = {'elder':220,'healer':560,'smith':760,'constable':980,'lan':640,'priest':1180}

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append('console: '+m.text) if m.type=='error' else None)
        await pg.goto((ROOT/'client'/'dist'/'index.html').as_uri()); await pg.wait_for_timeout(1000)
        if await pg.locator('#newC').count(): await pg.click('#newC')
        await pg.click('.cls[data-c="swordsman"]'); await pg.fill('#cName','Tân Thủ'); await pg.click('#createF button[type=submit]'); await pg.wait_for_timeout(900)
        await pg.evaluate("__game().player.invuln=99999")
        st = lambda q: pg.evaluate(f"JSON.stringify(__game().ch.quests['{q}']||null)")
        async def talk(npc, mp='village', x=None):
            x = x or NPCX.get(npc, 200)
            await pg.evaluate(f"const w=__game(); if (w.mapId!=='{mp}') w.loadMap('{mp}', {x}); w.player.x={x}-7; w.player.y=250; w.player.vy=0")
            await pg.wait_for_timeout(250); await pg.keyboard.press('KeyE'); await pg.wait_for_timeout(250)
        async def click(sel):
            loc = pg.locator(sel)
            if await loc.count()==0: print('  MISSING', sel); return False
            await loc.first.click(); await pg.wait_for_timeout(150); return True
        async def run_dialog(shot=None):
            n=0
            while await pg.locator('#win:not([hidden]) .dlg').count() and n<25:
                if shot and n==1: await pg.screenshot(path=OUT+shot)
                btn = pg.locator('[data-act="dnext"], [data-act="daccept"], [data-act="dend"]')
                if await btn.count()==0: break
                await btn.first.click(); await pg.wait_for_timeout(100); n+=1
            return n
        async def esc():
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(120)
            if await pg.locator('.w-sys').count(): await pg.keyboard.press('Escape')
        async def kill(mob, mp, x, until_js, maxn=60):
            return await pg.evaluate(f"""async () => {{ const w=__game(); w.loadMap('{mp}', {x}); let n=0;
              while (!({until_js}) && n<{maxn}) {{ const m = w.monsters.find(m=>!m.dead && m.id==='{mob}');
                if(!m){{ await new Promise(r=>setTimeout(r,250)); n++; continue; }}
                m.hitByPlayer=true; w.damageMonster(m, 99999, 'player'); n++; await new Promise(r=>setTimeout(r,500));
                for (const d of [...w.drops]) w.pickupDrop(d, 0, 0);
              }} return n; }}""")

        await pg.wait_for_timeout(1500)
        await pg.screenshot(path=OUT+'n1_start.png')

        # --- tut_move: double jump
        await talk('elder')
        html = await pg.locator('.w-npc').inner_text(); print('TL npc window:', html.replace('\n',' | ')[:300])
        await click('[data-act="qaccept"][data-q="tut_move"]'); await run_dialog(); await esc()
        for i in range(3):
            await pg.keyboard.press('Space'); await pg.wait_for_timeout(180); await pg.keyboard.press('Space'); await pg.wait_for_timeout(900)
        print('tut_move', await st('tut_move'))
        await pg.screenshot(path=OUT+'n2_tracker.png')
        await talk('elder'); await click('[data-act="qdone"][data-q="tut_move"]'); await run_dialog()
        # --- m1
        await click('[data-act="qaccept"][data-q="m1"]'); await run_dialog('n3_m1.png'); await esc()
        await talk('healer'); await click('[data-act="qtalk"][data-q="m1"]'); await run_dialog(); print('m1', await st('m1'))
        # --- tut_potion
        await click('[data-act="qaccept"][data-q="tut_potion"]'); await run_dialog(); await esc()
        await pg.wait_for_timeout(300); await pg.keyboard.press('Digit1'); await pg.wait_for_timeout(500); await pg.keyboard.press('Digit1'); await pg.wait_for_timeout(300)
        print('tut_potion', await st('tut_potion'))
        await talk('healer'); await click('[data-act="qdone"][data-q="tut_potion"]'); await run_dialog()
        # --- m2 kill wisp
        await click('[data-act="qaccept"][data-q="m2"]'); await run_dialog(); await esc()
        await kill('wisp','forest',300,"(w.ch.quests.m2||{}).p>=8")
        print('m2', await st('m2'))
        await talk('elder'); await click('[data-act="qdone"][data-q="m2"]'); await run_dialog(); print('m2 after', await st('m2'))
        await click('[data-act="qaccept"][data-q="m3"]'); await run_dialog(); await esc()
        await kill('fox','forest',900,"w.ch.inventory.some(e=>e.id==='q_bell')")
        print('lv', await pg.evaluate("__game().ch.level"))
        await talk('priest'); await click('[data-act="qdone"][data-q="m3"]'); await run_dialog('n4_bell.png'); print('m3', await st('m3'))
        await click('[data-act="qaccept"][data-q="m4"]'); await run_dialog(); await esc()
        await talk('elder'); await click('[data-act="qtalk"][data-q="m4"]'); await run_dialog(); print('m4', await st('m4'))
        # --- tut_stat & skill
        await pg.evaluate("__game().giveExp(400)")
        await esc(); await talk('elder'); await click('[data-act="qaccept"][data-q="tut_stat"]'); await run_dialog('n5_stat.png'); await esc()
        await pg.keyboard.press('KeyC'); await pg.wait_for_timeout(200)
        for i in range(3): await click('[data-act="stat"][data-stat="str"]')
        print('tut_stat', await st('tut_stat')); await esc()
        await talk('priest'); await click('[data-act="qaccept"][data-q="tut_skill"]'); await run_dialog(); await esc()
        await pg.keyboard.press('KeyK'); await pg.wait_for_timeout(200); await click('[data-act="skillup"]'); print('tut_skill', await st('tut_skill')); await esc()
        # --- forge tutorials
        await pg.evaluate("__game().giveExp(4000); __game().ch.gold += 5000")
        print('lv now', await pg.evaluate("__game().ch.level"))
        await talk('smith'); await click('[data-act="qaccept"][data-q="tut_forge1"]'); await run_dialog('n6_forge_intro.png')
        await talk('smith'); await click('[data-act="forge"]'); await pg.wait_for_timeout(200)
        await click('[data-act="enhance"]'); await pg.wait_for_timeout(200); await pg.screenshot(path=OUT+'n7_forge_enh.png')
        print('tut_forge1', await st('tut_forge1'))
        await talk('smith'); await click('[data-act="qdone"][data-q="tut_forge1"]'); await run_dialog()
        await click('[data-act="qaccept"][data-q="tut_forge2"]'); await run_dialog()
        await talk('smith'); await click('[data-act="forge"]'); await click('[data-act="ftab"][data-t="gem"]')
        await pg.screenshot(path=OUT+'n8_forge_gem_before.png')
        await click('[data-act="socket"]:not([disabled])'); await pg.wait_for_timeout(200)
        await pg.screenshot(path=OUT+'n9_forge_gem_after.png')
        print('tut_forge2', await st('tut_forge2'), 'weapon gems', await pg.evaluate("JSON.stringify(__game().ch.equip.weapon.g)"), 'atk', await pg.evaluate("__game().stats.atk"))
        await talk('smith'); await click('[data-act="qdone"][data-q="tut_forge2"]'); await run_dialog()
        await pg.evaluate("__game().giveExp(9000)")
        await talk('smith'); await click('[data-act="qaccept"][data-q="tut_forge3"]'); await run_dialog()
        await talk('smith'); await click('[data-act="forge"]'); await click('[data-act="ftab"][data-t="fuse"]'); await pg.screenshot(path=OUT+'n10_fuse_before.png')
        await click('[data-act="fuse"]:not([disabled])'); await pg.wait_for_timeout(200); await pg.screenshot(path=OUT+'n11_fuse_after.png')
        print('tut_forge3', await st('tut_forge3'), 'gems', await pg.evaluate("__game().ch.inventory.filter(e=>e.id.startsWith('gem')).map(e=>e.id+'x'+e.qty).join(',')"))
        # unsocket test
        await click('[data-act="ftab"][data-t="gem"]'); await click('[data-act="unsock"]'); print('after unsock weapon gems', await pg.evaluate("JSON.stringify(__game().ch.equip.weapon.g||[])"))
        await esc()
        # --- chatter: let NPC talk
        await pg.evaluate("const w=__game(); w.player.x=600; w.player.y=250; w.banterCd=0; for (const n of w.npcs) n.chatT=0.5")
        await pg.wait_for_timeout(1500); await pg.screenshot(path=OUT+'n12_chatter.png')
        await pg.wait_for_timeout(4000); await pg.screenshot(path=OUT+'n13_chatter2.png')
        print('chat:', await pg.evaluate("[...document.querySelectorAll('#chatLog .cl.npc')].map(e=>e.textContent).join(' || ')"))
        print('bubbles:', await pg.evaluate("__game().npcs.filter(n=>n.say).map(n=>n.id+': '+n.say.text).join(' || ')"))
        # greet variety
        greets=set()
        for i in range(6):
            await talk('smith'); greets.add(await pg.locator('.w-npc blockquote').inner_text()); await esc()
        print('thoren greets:', greets)
        # quest log
        await pg.keyboard.press('KeyL'); await pg.wait_for_timeout(300); await pg.screenshot(path=OUT+'n14_log.png'); await esc()
        print(errs or 'no errors'); await b.close()
asyncio.run(main())
