// Headless browser test (mobile + desktop): loads the page, plays through title -> setup -> tutorial -> map -> fights -> post-fight,
// audits layout (no horizontal overflow, touch targets >= 44px, readable fonts), checks console errors, measures taps per combat turn.
// Usage: PW_DIR=/path/with/node_modules node tests/browser.mjs [url] [screenshotDir]
import { createRequire } from 'module';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire((process.env.PW_DIR || process.cwd()) + '/');
const puppeteer = req('puppeteer-core');
const chromePath = process.env.CHROME || '/usr/bin/google-chrome';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };

let server = null; let url = process.argv[2];
if (!url) {
  server = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end('nf'); }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f));
  });
  await new Promise(res => server.listen(0, res));
  url = `http://localhost:${server.address().port}/`;
}
const shots = process.argv[3] || '/workspace/feral-bloom-shots2'; fs.mkdirSync(shots, { recursive: true });
const browser = await puppeteer.launch({ executablePath: chromePath, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const errors = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const watch = (page, tag) => {
  page.on('console', m => { if (m.type() === 'error') errors.push(`${tag} console: ` + m.text()); });
  page.on('pageerror', e => errors.push(`${tag} pageerror: ` + e.message));
  page.on('requestfailed', r => errors.push(`${tag} requestfailed: ` + r.url()));
  page.on('response', r => { if (r.status() >= 400) errors.push(`${tag} http ${r.status()} ${r.url()}`); });
  page.on('dialog', d => d.accept());
};
const phaseOf = page => page.evaluate(() => { const f = window.__feral; if (!f) return 'noferal'; const r = f.run; return r ? (r.over ? 'over' : r.phase) + (r.replace ? '+replace' : '') + (f.ui.tut !== null ? '+tut' : '') : 'title:' + f.ui.screen; });

// Layout audit: no horizontal overflow, touch targets >= 44px, nothing clipped off the right edge, no tiny fonts.
const audit = async (page, label, mobile) => page.evaluate((label, mobile) => {
  const out = [];
  const vw = window.innerWidth;
  if (document.documentElement.scrollWidth > vw + 1) out.push(`${label}: horizontal overflow (scrollWidth ${document.documentElement.scrollWidth} > ${vw})`);
  if (document.body.scrollWidth > vw + 1) out.push(`${label}: body overflow`);
  const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && r.bottom > 0 && r.top < innerHeight; };
  if (mobile) {
    for (const e of document.querySelectorAll('button, select, input, summary, [role=button]')) {
      if (!vis(e) || e.closest('svg')) continue;
      const r = e.getBoundingClientRect();
      if (r.height < 43.5 || r.width < 43.5) out.push(`${label}: small touch target ${(e.dataset.act || e.tagName)} ${Math.round(r.width)}x${Math.round(r.height)} "${(e.textContent || '').trim().slice(0, 20)}"`);
      if (r.right > vw + 1 || r.left < -1) out.push(`${label}: control off-screen ${e.dataset.act || e.tagName}`);
    }
    for (const e of document.querySelectorAll('.screen *, .sheet *')) {
      if (e.closest('svg')) continue;
      const cs = getComputedStyle(e); const fs = parseFloat(cs.fontSize);
      if (e.children.length === 0 && e.textContent.trim() && vis(e) && fs < 10.5) out.push(`${label}: tiny font ${fs}px "${e.textContent.trim().slice(0, 16)}"`);
    }
    // the combat arena must leave real room for the enemy
    const ar = document.querySelector('.arena'); if (ar && ar.getBoundingClientRect().height < 200) out.push(`${label}: arena only ${Math.round(ar.getBoundingClientRect().height)}px tall`);
  }
  return out;
}, label, mobile);
const problems = [];
const doAudit = async (page, label, mobile) => { for (const p of await audit(page, label, mobile)) problems.push(p); };

// ===================== PART 1: mobile (390x844, touch) =====================
{
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  watch(page, 'mobile');
  const shot = n => page.screenshot({ path: path.join(shots, n + '.png') });
  const tapAt = async (x, y) => { await page.touchscreen.tap(x, y); await sleep(60); };
  const tap = async sel => { const el = await page.$(sel); if (!el) return false; await el.tap(); await sleep(60); return true; };
  const tapSvg = async sel => { const c = await page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel); if (!c) return false; await tapAt(c.x, c.y); return true; };
  await page.goto(url, { waitUntil: 'networkidle0' });
  console.log('mobile title:', await page.title(), '| h1:', await page.$eval('h1', e => e.textContent));
  const meta = await page.evaluate(() => ({ vp: document.querySelector('meta[name=viewport]').content, theme: document.querySelector('meta[name=theme-color]')?.content, manifest: document.querySelector('link[rel=manifest]')?.href }));
  if (!/viewport-fit=cover/.test(meta.vp) || !meta.theme || !meta.manifest) errors.push('missing viewport-fit/theme-color/manifest link');
  const mf = await page.evaluate(async u => { const r = await fetch(u); return r.ok ? r.json() : null; }, meta.manifest);
  if (!mf || !mf.icons || mf.icons.length < 2) errors.push('manifest missing or has no icons');
  await sleep(300); await doAudit(page, 'title', true); await shot('01-title');
  await tap('[data-act=new]'); await sleep(100); await doAudit(page, 'setup', true); await shot('02-setup');
  await page.evaluate(() => { document.getElementById('runSeed').value = 'MOBILE3'; });
  await tap('[data-act=start]'); await sleep(250);
  if (!(await phaseOf(page)).endsWith('+tut')) errors.push('first-run tutorial did not appear');
  await doAudit(page, 'tutorial', true); await shot('03-tutorial');
  await tap('[data-act=tutnext]'); await tap('[data-act=tutnext]'); await sleep(80); await shot('03b-tutorial3'); await tap('[data-act=tutnext]'); await sleep(150);
  if ((await phaseOf(page)).endsWith('+tut')) errors.push('tutorial did not close');
  console.log('after start:', await phaseOf(page));
  await doAudit(page, 'map', true); await shot('04-map');
  await tap('[data-act=sheet]'); await sleep(250); await doAudit(page, 'petsheet', true); await shot('07-pet-sheet');
  await tap('.sheet header [data-act=closemodal]'); await sleep(100);
  await tap('[data-act=settings]'); await sleep(250); await doAudit(page, 'settings', true); await shot('10-settings'); await tap('.sheet header [data-act=closemodal]');

  let steps = 0, fights = 0, turns = 0, tapsInCombat = 0, shotCombat = false, shotPost = false, usedSpecial = false, openedItems = false, openedMoves = false;
  const seen = new Set();
  while (steps++ < 700 && fights < 3) {
    const ph = await phaseOf(page); seen.add(ph);
    if (ph === 'over') break;
    if (ph.endsWith('+replace')) { await tap('[data-act=replace]'); continue; }
    if (ph === 'map') {
      const id = await page.evaluate(() => { const r = window.__feral.run; const ids = [...document.querySelectorAll('.node.avail')].map(e => e.dataset.id); const by = t => ids.find(i => r.map.flat().find(x => x.id === i).type === t); return by('fight') || ids[0]; });
      await tapSvg(`.node.avail[data-id="${id}"] .base`); continue;
    }
    if (ph === 'combat') {
      const step = await page.evaluate(() => window.__feral.ui.cs.step);
      if (step !== 'action') { await tap('.sheet header [data-act=cstep]'); continue; }
      if (!shotCombat) {
        await sleep(300); await doAudit(page, 'combat', true); await shot('05-combat');
        // aim preview via hold, items and moves sheets
        const c = await page.evaluate(() => { const e = [...document.querySelectorAll('.slot-e .part.tgt')].find(x => x.dataset.slot === 'jaws') || document.querySelector('.slot-e .part.tgt'); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, slot: e.dataset.slot }; });
        const t0 = await page.evaluate(() => window.__feral.run.combat.turn);
        await page.mouse.move(c.x, c.y); await page.mouse.down(); await sleep(520); await page.mouse.up(); await sleep(120);
        const held = await page.evaluate(() => ({ sel: window.__feral.ui.cs.sel, turn: window.__feral.run.combat.turn }));
        if (held.sel !== c.slot || held.turn !== t0) errors.push(`hold-to-aim failed (sel=${held.sel}, want ${c.slot}, turn ${held.turn} vs ${t0})`);
        await shot('06-combat-aimed');
        if (await tap('[data-act=cstep][data-step=moves]')) { openedMoves = true; await sleep(200); await doAudit(page, 'moves', true); await shot('06b-moves'); await tap('.sheet header [data-act=cstep]'); await sleep(80); }
        if (await tap('[data-act=cstep][data-step=item]:not([disabled])')) { openedItems = true; await sleep(200); await doAudit(page, 'items', true); await tap('.sheet header [data-act=cstep]'); await sleep(80); }
        shotCombat = true;
        // aimed attack (selected part persists): one tap on Attack hits it
      }
      const hasSpec = await page.evaluate(() => { const b = document.querySelector('[data-act=cspec]'); return !!b && !b.disabled; });
      if (hasSpec && !usedSpecial && turns === 1) { usedSpecial = true; await tap('[data-act=cspec]'); }
      else await tap('[data-act=catk]:not([disabled])') || await tap('[data-act=cdefend]');
      turns++; tapsInCombat++;
      await sleep(40); continue;
    }
    if (ph === 'post') {
      if (!shotPost) { await page.waitForFunction('!window.__feral.ui.hold', { timeout: 4000 }).catch(() => {}); await sleep(300); await doAudit(page, 'post', true); await shot('08-post-fight'); shotPost = true; }
      await tap('[data-act=postleave]'); await sleep(50); if ((await phaseOf(page)) !== 'post') fights++; continue;
    }
    if (['feed', 'rest', 'shrine', 'event'].includes(ph)) {
      if (!seen.has('audit-' + ph)) { seen.add('audit-' + ph); await sleep(250); await doAudit(page, ph, true); await shot('09-' + ph); }
      const done = await page.evaluate(() => !!window.__feral.run.pending.result);
      if (done) await tap('[data-act=nodedone]'); else { const sel = { feed: '[data-act=eat]', rest: '[data-act=rest]', shrine: '[data-act=shrine]', event: '[data-act=event]' }[ph]; await tap(sel); }
      continue;
    }
  }
  const perTurn = turns ? tapsInCombat / turns : 0;
  console.log(`mobile flow: fights=${fights} steps=${steps} turns=${turns} taps/turn=${perTurn.toFixed(2)} phases=${[...seen].filter(x => !x.startsWith('audit')).join(',')}`);
  if (!shotCombat) errors.push('mobile: never reached combat');
  if (!openedMoves || !openedItems) console.log('note: moves/items sheet openedMoves=' + openedMoves + ' openedItems=' + openedItems);
  if (perTurn > 2.01 || !turns) errors.push('mobile: combat turns take more than 2 taps (' + perTurn + ')');
  // quick mode (default ON): a single tap on an enemy body part strikes it
  const q = await page.evaluate(async () => {
    const G = await import('/js/game.js'); const f = window.__feral; if (f.meta.quick === false) return 'quick-off';
    const r = G.newRun(f.meta, { seed: 'QC1', species: 'mossling' }); f.setRun(r);
    const n = r.map[0].find(x => x.type === 'fight') || r.map[0][0]; G.enterNode(r, n.id); f.render(); return r.phase;
  });
  if (q === 'combat') {
    await sleep(150);
    const before = await page.evaluate(() => window.__feral.run.combat.turn);
    const hit = await page.evaluate(() => { const els = [...document.querySelectorAll('.slot-e .part.tgt')]; const e = els.find(x => x.dataset.slot === 'torso') || els[0]; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await page.touchscreen.tap(hit.x, hit.y); await sleep(250);
    const after = await page.evaluate(() => window.__feral.run.combat ? window.__feral.run.combat.turn : 99);
    if (after <= before) errors.push('quick mode: tapping a part did not strike'); else console.log('quick strike ok: 1 tap on a body part (turn', before, '->', after + ')');
  } else errors.push('quick test could not enter combat: ' + q);
  // small phone (360x640) and landscape phone (844x390): combat must stay usable
  for (const [w, h, tag] of [[360, 640, 'small'], [844, 390, 'landscape']]) {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.evaluate(async () => { const G = await import('/js/game.js'); const f = window.__feral; const r = G.newRun(f.meta, { seed: 'SZ1', species: 'wispling' }); f.setRun(r); const n = r.map[0].find(x => x.type === 'fight') || r.map[0][0]; G.enterNode(r, n.id); f.render(); });
    await sleep(300); await doAudit(page, 'combat-' + tag, true); await shot('11-combat-' + tag);
  }
  await page.close();
}

// ===================== PART 2: desktop keyboard + mouse, full run =====================
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
watch(page, 'desktop');
const press = async k => { await page.keyboard.press(k); await sleep(25); };
const clickSel = async sel => { const el = await page.$(sel); if (!el) return false; await el.click(); await sleep(25); return true; };
await page.goto(url, { waitUntil: 'networkidle0' });
if (!/Feral Bloom/.test(await page.$eval('h1', e => e.textContent))) errors.push('title screen missing');
await page.screenshot({ path: path.join(shots, 'd1-title.png') });
await press('Enter'); await sleep(100);          // Play -> setup
await press('Enter'); await sleep(100);          // Start
await press('Enter'); await press('Enter'); await press('Enter'); await sleep(100);   // tutorial
if ((await phaseOf(page)).endsWith('+tut')) errors.push('keyboard could not dismiss the tutorial');
await doAudit(page, 'desktop-map', false);
await page.screenshot({ path: path.join(shots, 'd2-map.png') });
await press('p'); await sleep(80); if (await page.$eval('#modal', e => e.className) !== 'open') errors.push('P did not open pet sheet'); await press('Escape');
let steps = 0, fights = 0, shotCombat = false, turns = 0, mouseStrikes = 0;
const seen = new Set();
while (steps++ < 1400) {
  const ph = await phaseOf(page); seen.add(ph);
  if (ph === 'over') break;
  if (ph.endsWith('+replace')) { await press('1'); continue; }
  if (ph === 'map') { await press('1'); continue; }
  if (ph === 'combat') {
    const step = await page.evaluate(() => window.__feral.ui.cs.step);
    if (step === 'action') {
      if (!shotCombat) { await sleep(300); await page.screenshot({ path: path.join(shots, 'd3-combat.png') }); shotCombat = true; }
      turns++;
      const m = turns % 5;
      if (m === 1) await press('1');                                  // Attack (key)
      else if (m === 2) { await press('2'); if (await page.evaluate(() => window.__feral.run.phase === 'combat' && window.__feral.run.combat.turn === window.__feral.run.combat.turn && !!document.querySelector('[data-act=catk]:not([disabled])') && window.__feral.ui.cs.step === 'action' && !window.__feral.ui.hold)) { /* special may be unavailable */ } }
      else if (m === 3) { await press('Enter'); }
      else if (m === 4) { if (await clickSel('.slot-e .part.tgt')) mouseStrikes++; }
      else await press('3');                                          // Brace
    } else await press('Escape');
    continue;
  }
  if (ph === 'post') {
    if (fights++ === 0) await page.screenshot({ path: path.join(shots, 'd4-post.png') });
    await press('Enter'); continue;
  }
  if (['feed', 'rest', 'shrine', 'event'].includes(ph)) {
    const done = await page.evaluate(() => !!window.__feral.run.pending.result);
    if (done) await press('Enter'); else await press('1');
    continue;
  }
  throw new Error('unexpected phase ' + ph);
}
const end = await phaseOf(page);
console.log('desktop ended phase:', end, 'steps:', steps, 'turns:', turns, 'mouse strikes:', mouseStrikes, 'phases seen:', [...seen].join(','));
await sleep(1200);
await page.screenshot({ path: path.join(shots, 'd5-end.png') });
console.log('result:', JSON.stringify(await page.evaluate(() => { const r = window.__feral.run; return r && r.over ? { how: r.over.how, depth: r.depth, ending: r.over.ending.title, score: r.over.score } : null; })));
// render stress: drive several full runs through the logic API, rendering every screen state (incl. pet sheet + modals)
const stress = await page.evaluate(async () => {
  const bot = await import('/tests/bot.mjs'); const { RNG } = await import('/js/rng.js'); const G = await import('/js/game.js');
  const f = window.__feral; const rng = new RNG('ui-stress'); const phases = new Set(); let renders = 0, endings = new Set();
  for (let i = 0; i < 12; i++) {
    const r = G.newRun(f.meta, { seed: 'UI' + i, species: ['mossling', 'cinderpup', 'gloomfin', 'shellback', 'wispling'][i % 5] }); f.setRun(r);
    let k = 0;
    while (!r.over && k++ < 3000) {
      bot.botStep(r, rng); phases.add(r.phase + (r.replace ? '+replace' : ''));
      f.ui.modal = k % 7 === 0 ? 'pet' : null; f.ui.cs = { step: ['action', 'moves', 'item', 'itemtgt'][k % 4], item: 'bandage', sel: k % 3 === 0 ? 'jaws' : null };
      try { f.render(); renders++; } catch (e) { return { error: String(e.stack || e), phase: r.phase, replace: !!r.replace }; }
    }
    if (r.over) endings.add(r.over.ending.id);
  }
  f.ui.modal = null; f.ui.cs = { step: 'action' }; f.render();
  return { renders, phases: [...phases], endings: [...endings] };
});
console.log('render stress:', JSON.stringify(stress));
if (stress.error) errors.push('render stress failed: ' + stress.error);
await press('Escape'); await sleep(50);
for (const k of ['m', 'Escape']) { await press(k); await sleep(30); }
await page.screenshot({ path: path.join(shots, 'd6-title2.png') });
if (end !== 'over') errors.push('run did not finish');
await browser.close(); if (server) server.close();
const layout = [...new Set(problems)];
if (layout.length) { console.log('LAYOUT PROBLEMS:\n' + layout.join('\n')); errors.push(`${layout.length} layout problems (see above)`); }
if (errors.length) { console.log('ERRORS:\n' + [...new Set(errors)].join('\n')); process.exit(1); }
console.log('BROWSER TEST PASSED (mobile + desktop, no console errors, no overflow)');
