// Headless browser smoke test: loads the page, starts a run, clicks through fights and nodes, asserts no console errors.
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
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

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
const shots = process.argv[3] || '/workspace/feral-bloom-shots'; fs.mkdirSync(shots, { recursive: true });
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
const phaseOf = page => page.evaluate(() => { const f = window.__feral; if (!f) return 'noferal'; const r = f.run; return r ? (r.over ? 'over' : r.phase) + (r.replace ? '+replace' : '') : 'title:' + f.ui.screen; });

// Layout audit: no horizontal overflow, touch targets >= 44px, nothing clipped off the right edge.
const audit = async (page, label, mobile) => page.evaluate((label, mobile) => {
  const out = [];
  const vw = window.innerWidth;
  if (document.documentElement.scrollWidth > vw + 1) out.push(`${label}: horizontal overflow (scrollWidth ${document.documentElement.scrollWidth} > ${vw})`);
  if (document.body.scrollWidth > vw + 1) out.push(`${label}: body overflow`);
  const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && r.bottom > 0 && r.top < innerHeight; };
  if (mobile) {
    for (const e of document.querySelectorAll('button, select, input, summary, [role=button]')) {
      if (!vis(e) || e.closest('svg')) continue;
      if (e.closest('.ticker') || e.closest('.sback')) { /* full-width rows */ }
      const r = e.getBoundingClientRect();
      if (r.height < 43.5 || r.width < 43.5) out.push(`${label}: small touch target ${(e.dataset.act || e.tagName)} ${Math.round(r.width)}x${Math.round(r.height)} "${(e.textContent || '').trim().slice(0, 20)}"`);
      if (r.right > vw + 1 || r.left < -1) out.push(`${label}: control off-screen ${e.dataset.act || e.tagName}`);
    }
    for (const e of document.querySelectorAll('.screen *, .sheet *')) {
      if (e.closest('svg') && e.tagName !== 'svg') continue;
      const cs = getComputedStyle(e); const fs = parseFloat(cs.fontSize);
      if (e.children.length === 0 && e.textContent.trim() && vis(e) && fs < 10.5 && !e.closest('svg')) out.push(`${label}: tiny font ${fs}px "${e.textContent.trim().slice(0, 16)}"`);
    }
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
  const tap = async sel => { const el = await page.$(sel); if (!el) return false; await el.tap(); await sleep(60); return true; };
  await page.goto(url, { waitUntil: 'networkidle0' });
  console.log('mobile title:', await page.title(), '| h1:', await page.$eval('h1', e => e.textContent));
  const meta = await page.evaluate(() => ({ vp: document.querySelector('meta[name=viewport]').content, theme: document.querySelector('meta[name=theme-color]')?.content, manifest: document.querySelector('link[rel=manifest]')?.href }));
  console.log('pwa meta:', JSON.stringify(meta));
  if (!/viewport-fit=cover/.test(meta.vp) || !meta.theme || !meta.manifest) errors.push('missing viewport-fit/theme-color/manifest link');
  const mf = await page.evaluate(async u => { const r = await fetch(u); return r.ok ? r.json() : null; }, meta.manifest);
  if (!mf || !mf.icons || mf.icons.length < 2) errors.push('manifest missing or has no icons');
  await sleep(300); await doAudit(page, 'title', true); await shot('01-title');
  await tap('[data-act=new]'); await sleep(100); await doAudit(page, 'setup', true); await shot('02-setup');
  await page.evaluate(() => { document.getElementById('runSeed').value = 'MOBILE3'; });
  await tap('[data-act=start]'); await sleep(200);
  console.log('after start:', await phaseOf(page));
  await doAudit(page, 'map', true); await shot('03-map');
  await tap('[data-act=sheet]'); await sleep(250); await doAudit(page, 'petsheet', true); await shot('06-pet-sheet');
  await tap('.sheet header [data-act=closemodal]'); await sleep(100);
  await tap('[data-act=settings]'); await sleep(250); await doAudit(page, 'settings', true); await shot('09-settings'); await tap('.sheet header [data-act=closemodal]');

  let steps = 0, fights = 0, taps2 = [], turnTaps = 0, shotTarget = false, shotCombat = false, shotPost = false, sawFast = false;
  const seen = new Set();
  while (steps++ < 700 && fights < 3) {
    const ph = await phaseOf(page); seen.add(ph);
    if (ph === 'over') break;
    if (ph.endsWith('+replace')) { await tap('[data-act=replace]'); continue; }
    if (ph === 'map') {
      const id = await page.evaluate(() => { const r = window.__feral.run; const ids = [...document.querySelectorAll('.nbtn')].map(e => e.dataset.id); const by = t => ids.find(i => r.map.flat().find(x => x.id === i).type === t); return by('fight') || ids[0]; });
      await tap(`.nbtn[data-id="${id}"]`); continue;
    }
    if (ph === 'combat') {
      const step = await page.evaluate(() => window.__feral.ui.cs.step);
      if (step === 'action') {
        if (!shotCombat) { await sleep(300); await doAudit(page, 'combat', true); await shot('04-combat'); shotCombat = true; }
        turnTaps = 1;
        const mv = await page.evaluate(() => { const b = [...document.querySelectorAll('[data-act=cmove]')].filter(x => !x.disabled); const pick = b[0]; return pick ? pick.dataset.id : null; });
        if (mv) await tap(`[data-act=cmove][data-id="${mv}"]`); else await tap('[data-act=cdefend]');
      } else if (step === 'target') {
        if (!shotTarget) { await sleep(300); await doAudit(page, 'target', true); await shot('05-combat-target'); shotTarget = true; }
        // 2-tap flow: the suggested part is pre-selected, so one tap on Strike completes the turn
        const pre = await page.evaluate(() => !!window.__feral.ui.cs.sel);
        if (pre) { await tap('[data-act=cconfirm]'); turnTaps++; taps2.push(turnTaps); }
        else { await tap('[data-act=cauto]'); await tap('[data-act=cconfirm]'); }
      } else { await tap('.sheet header [data-act=cstep]') || await tap('[data-act=cstep][data-step=action]'); }
      continue;
    }
    if (ph === 'post') {
      if (!shotPost) { await sleep(300); await doAudit(page, 'post', true); await shot('07-post-fight'); shotPost = true; }
      for (let k = 0; k < 4; k++) { if (!(await tap('[data-act=absorb]'))) break; if ((await phaseOf(page)).includes('replace')) break; }
      if ((await phaseOf(page)).includes('replace')) continue;
      for (let k = 0; k < 3; k++) if (!(await tap('[data-act=rchoice][data-oi="0"]'))) break;
      await tap('[data-act=reward]'); await sleep(30);
      if ((await phaseOf(page)).includes('replace')) continue;
      await tap('[data-act=postleave]'); if ((await phaseOf(page)) !== 'post') fights++; continue;
    }
    if (['feed', 'rest', 'shrine', 'event'].includes(ph)) {
      if (!seen.has('audit-' + ph)) { seen.add('audit-' + ph); await sleep(250); await doAudit(page, ph, true); await shot('08-' + ph); }
      const done = await page.evaluate(() => !!window.__feral.run.pending.result);
      if (done) await tap('[data-act=nodedone]'); else { const sel = { feed: '[data-act=eat]', rest: '[data-act=rest]', shrine: '[data-act=shrine]', event: '[data-act=event]' }[ph]; await tap(sel); }
      continue;
    }
  }
  const avg = taps2.length ? taps2.reduce((a, b) => a + b, 0) / taps2.length : 0;
  console.log(`mobile flow: fights=${fights} steps=${steps} phases=${[...seen].filter(x => !x.startsWith('audit')).join(',')} avg taps/turn (move + strike) = ${avg.toFixed(2)}`);
  if (!shotTarget) errors.push('mobile: never reached target step');
  if (avg > 2.01) errors.push('mobile: combat turns take more than 2 taps (' + avg + ')');
  // quick-confirm mode: tapping a body part strikes immediately (move + part = 2 taps, no confirm)
  await page.evaluate(() => { window.__feral.meta.quick = true; });
  const q = await page.evaluate(async () => {
    const G = await import('/js/game.js'); const f = window.__feral; const r = G.newRun(f.meta, { seed: 'QC1', species: 'mossling' }); f.setRun(r);
    const n = r.map[0].find(x => x.type === 'fight') || r.map[0][0]; G.enterNode(r, n.id); f.render(); return r.phase;
  });
  if (q === 'combat') {
    await sleep(150); await tap('[data-act=cmove]'); await sleep(80);
    const before = await page.evaluate(() => window.__feral.run.combat.turn);
    const hit = await page.evaluate(() => { const els = [...document.querySelectorAll('.slot-e .part.tgt')]; const e = els.find(x => x.dataset.slot === 'torso') || els[0]; const r = e.getBoundingClientRect(); return { n: els.length, x: r.x + r.width / 2, y: r.y + r.height / 2, step: window.__feral.ui.cs.step, q: window.__feral.meta.quick }; });
    console.log('quick debug', JSON.stringify(hit));
    await page.touchscreen.tap(hit.x, hit.y); await sleep(250);
    const after = await page.evaluate(() => window.__feral.run.combat ? window.__feral.run.combat.turn : 99);
    if (after <= before) errors.push('quick confirm: tapping a part did not strike');
    else console.log('quick confirm ok (turn', before, '->', after + ')');
  }
  await page.evaluate(() => { window.__feral.meta.quick = false; });
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
await press('n'); await press('Enter'); await sleep(100);
await doAudit(page, 'desktop-map', false);
await page.screenshot({ path: path.join(shots, 'd2-map.png') });
await press('p'); await sleep(80); if (await page.$eval('#modal', e => e.className) !== 'open') errors.push('P did not open pet sheet'); await press('Escape');
let steps = 0, fights = 0, sawTarget = false, shotCombat = false;
const seen = new Set();
while (steps++ < 900) {
  const ph = await phaseOf(page); seen.add(ph);
  if (ph === 'over') break;
  if (ph.endsWith('+replace')) { await press('1'); continue; }
  if (ph === 'map') { await press('1'); continue; }
  if (ph === 'combat') {
    const step = await page.evaluate(() => window.__feral.ui.cs.step);
    if (step === 'action') {
      const ok = await page.evaluate(() => [...document.querySelectorAll('[data-act=cmove]')].filter(b => !b.disabled).length);
      if (!ok) { await press('b'); continue; }
      await page.evaluate(() => { const bs = [...document.querySelectorAll('[data-act=cmove]')].filter(b => !b.disabled); bs[Math.floor(Math.random() * bs.length)].click(); }); await sleep(25);
    } else if (step === 'target') {
      sawTarget = true;
      if (!shotCombat) { await sleep(200); await page.screenshot({ path: path.join(shots, 'd3-combat-target.png') }); shotCombat = true; }
      if (steps % 3 === 0) { await press('a'); await press('Enter'); }
      else if (steps % 3 === 1) { await press('1'); await press('1'); }       // key picks part, second press confirms
      else { const ok = await clickSel('.slot-e .part.tgt'); if (ok) { await clickSel('.slot-e .part.hl') || await press('Enter'); } else await press('Enter'); }
    } else await press('Escape');
    continue;
  }
  if (ph === 'post') {
    if (fights++ === 0) await page.screenshot({ path: path.join(shots, 'd4-post.png') });
    await page.evaluate(() => { document.querySelectorAll('[data-act=absorb]').forEach(b => b.click()); }); await sleep(25);
    if ((await phaseOf(page)).includes('replace')) continue;
    await page.evaluate(() => { document.querySelectorAll('[data-act=rchoice][data-oi="0"]').forEach(b => b.click()); });
    await clickSel('[data-act=reward]'); await sleep(25);
    if ((await phaseOf(page)).includes('replace')) continue;
    await clickSel('[data-act=postleave]'); continue;
  }
  if (['feed', 'rest', 'shrine', 'event'].includes(ph)) {
    const done = await page.evaluate(() => !!window.__feral.run.pending.result);
    if (done) await press('Enter'); else await press('1');
    continue;
  }
  throw new Error('unexpected phase ' + ph);
}
const end = await phaseOf(page);
console.log('desktop ended phase:', end, 'steps:', steps, 'phases seen:', [...seen].join(','));
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
      f.ui.modal = k % 7 === 0 ? 'pet' : null; f.ui.cs = { step: ['action', 'move', 'item', 'devour'][k % 4] };
      try { f.render(); renders++; } catch (e) { return { error: String(e.stack || e), phase: r.phase, replace: !!r.replace }; }
    }
    if (r.over) endings.add(r.over.ending.id);
  }
  f.ui.modal = null; f.render();
  return { renders, phases: [...phases], endings: [...endings] };
});
console.log('render stress:', JSON.stringify(stress));
if (stress.error) errors.push('render stress failed: ' + stress.error);
// menu pages (desktop)
await press('Escape'); await sleep(50);
for (const k of ['h', 'Escape', 'x', 'Escape', 's', 'Escape']) { await press(k); await sleep(30); }
await page.screenshot({ path: path.join(shots, 'd6-title2.png') });
if (!sawTarget) errors.push('never reached target step');
if (end !== 'over') errors.push('run did not finish');
await browser.close(); if (server) server.close();
const layout = [...new Set(problems)];
if (layout.length) { console.log('LAYOUT PROBLEMS:\n' + layout.join('\n')); errors.push(`${layout.length} layout problems (see above)`); }
if (errors.length) { console.log('ERRORS:\n' + [...new Set(errors)].join('\n')); process.exit(1); }
console.log('BROWSER TEST PASSED (mobile + desktop, no console errors, no overflow)');
