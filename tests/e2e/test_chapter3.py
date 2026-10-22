import os, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
SERVER = os.environ.get('GAME_URL', 'http://localhost:8803/')
os.makedirs(ROOT/'tests'/'e2e'/'out', exist_ok=True)
import asyncio, json
from playwright.async_api import async_playwright
OUT=str(ROOT/'tests'/'e2e'/'out')+'/'
MAIN = ['m1','m2','m3','m4','st1','st2','st3','st4','st4b','st5','st6','st6b','st6c','st6d','st7','st8','st8b','st9','st10','st10b','st10c','st11','st11b','st11c','st12']

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':1280,'height':720})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        # ---- 1. Migration: old-style character that finished st7 + q_boss
        await pg.goto((ROOT/'client'/'dist'/'index.html').as_uri()); await pg.wait_for_timeout(600)
        old = {'id':'oldc1','name':'Lão Làng','cls':'taoist','level':15,'exp':0,'gold':900,'hp':300,'mp':100,'stats':{'str':4,'dex':4,'int':20,'vit':8},
               'statPoints':0,'skillPoints':0,'skills':{'ta_thunder':1},'inventory':[],'equip':{'weapon':{'uid':'w1','id':'w_taoist3','qty':1,'r':1,'b':{}}},
               'quests':{'st1':{'s':'done','p':1},'st7':{'s':'done','p':1},'q_boss':{'s':'done','p':1},'q_wisp':{'s':'done','p':8},'q_jiang':{'s':'active','p':3},'q_pet':{'s':'done','p':3}},
               'map':'village','x':400,'playTime':100}
        await pg.evaluate(f"localStorage.setItem('qmq_chars', JSON.stringify({{oldc1: {json.dumps(old)}}}))")
        await pg.reload(); await pg.wait_for_timeout(900)
        await pg.screenshot(path=OUT+'o1_select.png')
        cards = pg.locator('[data-act="play"], .card button, .card')
        print('cards', await cards.count())
        await pg.locator('[data-play]').first.click(); await pg.wait_for_timeout(1200)
        q = await pg.evaluate("JSON.stringify(Object.fromEntries(Object.entries(__game().ch.quests).map(([k,v])=>[k,v.s])))")
        print('migrated quests:', q)
        print('npcs:', await pg.evaluate("__game().npcs.map(n=>n.id).join(',')"))
        # ---- 2. Chapter 3 on a fresh character
        await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(800)
        if await pg.locator('#newC').count(): await pg.click('#newC')
        await pg.click('.cls[data-c="assassin"]'); await pg.fill('#cName','Kết Truyện'); await pg.click('#createF button[type=submit]'); await pg.wait_for_timeout(800)
        await pg.evaluate("const w=__game(); w.player.invuln=99999; w.giveExp(900000); for (const q of %s) w.ch.quests[q]={s:'done',p:1}; w.refreshNpcs();" % json.dumps(MAIN))
        st = lambda q: pg.evaluate(f"JSON.stringify(__game().ch.quests['{q}']||null)")
        async def talk(npc, mp, x):
            await pg.evaluate(f"const w=__game(); if (w.mapId!=='{mp}') w.loadMap('{mp}', {x}); w.player.x={x}-7; w.player.y=250; w.player.vy=0")
            await pg.wait_for_timeout(300); await pg.keyboard.press('KeyE'); await pg.wait_for_timeout(250)
        async def click(sel):
            loc = pg.locator(sel)
            if await loc.count()==0: print('  MISSING', sel); return False
            await loc.first.click(); await pg.wait_for_timeout(150); return True
        async def run_dialog(shot=None, collect=None):
            n=0
            while await pg.locator('#win:not([hidden]) .dlg').count() and n<30:
                if collect is not None: collect.append(await pg.locator('.dlg-text').inner_text())
                if shot and n==shot[1]: await pg.screenshot(path=OUT+shot[0])
                btn = pg.locator('[data-act="dnext"], [data-act="daccept"], [data-act="dend"]')
                if await btn.count()==0: break
                await btn.first.click(); await pg.wait_for_timeout(100); n+=1
            return n
        async def esc():
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(120)
            if await pg.locator('.w-sys').count(): await pg.keyboard.press('Escape')
        print('lv', await pg.evaluate("__game().ch.level"))
        # st13 hoasu -> tieulan
        await talk('fire_master','volcano',200); await click('[data-act="qaccept"][data-q="st13"]'); await run_dialog(); await esc()
        await talk('lan','village',640); print('lang npcs', await pg.evaluate("__game().npcs.map(n=>n.id).join(',')"))
        await click('[data-act="qtalk"][data-q="st13"]'); await run_dialog(('c1_tieulan.png',2)); print('st13', await st('st13'))
        await click('[data-act="qaccept"][data-q="st14"]'); await run_dialog(); await esc()
        await talk('elder','village',220); await click('[data-act="qtalk"][data-q="st14"]'); await run_dialog(('c2_diary.png',6)); print('st14', await st('st14'))
        await click('[data-act="qaccept"][data-q="st15"]'); await run_dialog(); await esc()
        # nghiadia portal check before/after
        await pg.evaluate("__game().loadMap('graveyard', 1200)")
        print('portals before st15 done:', await pg.evaluate("__game().portals.map(p=>p.to).join(',')"))
        await talk('huntress','snow_peak',200); await click('[data-act="qtalk"][data-q="st15"]'); await run_dialog(); print('st15', await st('st15')); await esc()
        await pg.evaluate("__game().loadMap('graveyard', 1200)"); await pg.wait_for_timeout(500)
        print('portals after:', await pg.evaluate("__game().portals.map(p=>p.to).join(',')"))
        await pg.evaluate("const w=__game(); w.player.x=1300; w.player.y=250"); await pg.wait_for_timeout(600); await pg.screenshot(path=OUT+'c3_portal.png')
        await pg.keyboard.press('ArrowUp'); await pg.wait_for_timeout(900)
        print('map', await pg.evaluate("__game().mapId"), 'npcs', await pg.evaluate("__game().npcs.map(n=>n.id).join(',')"))
        await pg.evaluate("const w=__game(); w.player.x=600; w.player.y=250"); await pg.wait_for_timeout(1200); await pg.screenshot(path=OUT+'c4_cotu.png')
        await talk('huntress_temple','temple',170); await click('[data-act="qaccept"][data-q="st16"]'); await run_dialog(); await esc()
        await pg.evaluate("const w=__game(); w.player.x=1500; w.player.y=250"); await pg.wait_for_timeout(1500); await pg.screenshot(path=OUT+'c5_mobs.png')
        await pg.evaluate("__game().ch.quests.st16.p=15")
        await talk('huntress_temple','temple',170); await click('[data-act="qdone"][data-q="st16"]'); await run_dialog()
        await click('[data-act="qaccept"][data-q="st16b"]'); await run_dialog(); await esc()
        await pg.wait_for_timeout(2500); print('st16b boss', await pg.evaluate("__game().monsters.filter(m=>m.named).map(m=>m.def.name).join(',')"))
        await pg.evaluate("const w=__game(); const m=w.monsters.find(m=>m.named==='nb_blood_jiangshi'); m.hitByPlayer=true; w.damageMonster(m, 9999999, 'player')")
        await talk('huntress_temple','temple',170); await click('[data-act="qdone"][data-q="st16b"]'); await run_dialog()
        await talk('fire_master_temple','temple',250); await click('[data-act="qaccept"][data-q="st17"]'); await run_dialog(); await esc()
        await pg.evaluate("const w=__game(); w.ch.inventory.push({uid:'b2',id:'q_bell2',qty:1,r:0,b:{}})")
        await talk('smith','village',760); await click('[data-act="qdone"][data-q="st17"]'); await run_dialog(('c6_bell.png',5)); print('st17', await st('st17'))
        await talk('elder','village',220); await click('[data-act="qaccept"][data-q="st18"]'); await run_dialog(); await esc()
        print('lang npcs during st18', await pg.evaluate("__game().npcs.map(n=>n.id).join(',')"))
        # enter the sanctum -> scene with choices
        await pg.evaluate("__game().loadMap('sanctum', 80)"); await pg.wait_for_timeout(1500)
        lines=[]
        n=0
        while n<8 and await pg.locator('[data-act="dnext"]').count():
            lines.append(await pg.locator('.dlg-text').inner_text()); await pg.locator('[data-act="dnext"]').click(); await pg.wait_for_timeout(100); n+=1
        await pg.screenshot(path=OUT+'c7_choice.png')
        print('choices:', await pg.locator('.choice').all_inner_texts())
        await pg.locator('.choice').nth(1).click(); await pg.wait_for_timeout(200)
        await run_dialog(('c8_branch.png',1))
        print('flags', await pg.evaluate("JSON.stringify(__game().ch.flags)"))
        await pg.evaluate("const w=__game(); w.player.x=560; w.player.y=250"); await pg.wait_for_timeout(2500); await pg.screenshot(path=OUT+'c9_boss.png')
        # kill the boss
        await pg.evaluate("const w=__game(); const m=w.monsters.find(m=>m.id==='blood_demon'); m.hp=m.maxHp*0.45"); await pg.wait_for_timeout(2500); await pg.screenshot(path=OUT+'c10_rage.png')
        await pg.evaluate("const w=__game(); const m=w.monsters.find(m=>m.id==='blood_demon'); m.hitByPlayer=true; w.damageMonster(m, 999999, 'player')"); await pg.wait_for_timeout(600)
        print('st18', await st('st18'))
        await talk('elder','village',220)
        outro=[]
        await click('[data-act="qdone"][data-q="st18"]'); await run_dialog(('c11_end.png',3), outro)
        print('OUTRO:'); [print('  ', l.replace('\n',': ')) for l in outro]
        print('title', await pg.evaluate("__game().ch.title"), 'npcs', await pg.evaluate("__game().npcs.map(n=>n.id).join(',')"))
        await pg.keyboard.press('KeyL'); await pg.wait_for_timeout(200); await pg.screenshot(path=OUT+'c12_log.png')
        print(errs or 'no errors'); await b.close()
asyncio.run(main())
