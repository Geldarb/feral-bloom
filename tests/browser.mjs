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
const shots = process.argv[3] || '/tmp/fb-shots'; fs.mkdirSync(shots, { recursive: true });
const browser = await puppeteer.launch({ executablePath: chromePath, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('requestfailed', r => errors.push('requestfailed: ' + r.url()));
page.on('response', r => { if (r.status() >= 400) errors.push('http ' + r.status() + ' ' + r.url()); });
page.on('dialog', d => d.accept());

const sleep = ms => new Promise(r => setTimeout(r, ms));
const phase = () => page.evaluate(() => { const f = window.__feral; if (!f) return 'noferal'; const r = f.run; return r ? (r.over ? 'over' : r.phase) + (r.replace ? '+replace' : '') : 'title:' + f.ui.screen; });
const press = async k => { await page.keyboard.press(k); await sleep(30); };
const clickSel = async sel => { const el = await page.$(sel); if (!el) return false; await el.click(); await sleep(30); return true; };

await page.goto(url, { waitUntil: 'networkidle0' });
const title = await page.title();
const h1 = await page.$eval('h1', e => e.textContent);
console.log('title:', title, '| h1:', h1);
if (!/Feral Bloom/.test(h1)) errors.push('title screen missing');
await page.screenshot({ path: path.join(shots, '1-title.png') });
await press('n'); await sleep(50);
await page.screenshot({ path: path.join(shots, '2-setup.png') });
await press('Enter'); await sleep(100);
console.log('after start:', await phase());
await page.screenshot({ path: path.join(shots, '3-map.png') });
// open pet sheet then close
await press('p'); await sleep(50); const sheetOpen = await page.$eval('#modal', e => e.className); await press('Escape');
console.log('pet sheet opened:', sheetOpen);

let steps = 0, shotCombat = false, fights = 0, sawTarget = false;
const seen = new Set();
while (steps++ < 600) {
  const ph = await phase();
  seen.add(ph);
  if (ph === 'over') break;
  if (ph.endsWith('+replace')) { await press('1'); continue; }
  if (ph === 'map') { await press('1'); continue; }
  if (ph === 'combat') {
    const step = await page.evaluate(() => window.__feral.ui.cs.step);
    if (step === 'action') { await press('1'); }
    else if (step === 'move') { const ok = await page.evaluate(() => [...document.querySelectorAll('[data-act=cmove]')].filter(b => !b.disabled).length); if (!ok) await press('Escape'); else { await page.evaluate(() => { const bs = [...document.querySelectorAll('[data-act=cmove]')].filter(b => !b.disabled); bs[Math.floor(Math.random() * bs.length)].click(); }); await sleep(30); } }
    else if (step === 'target') {
      sawTarget = true;
      if (!shotCombat) { await page.screenshot({ path: path.join(shots, '4-combat-target.png') }); shotCombat = true; }
      // alternate keyboard and mouse targeting
      if (steps % 2) await press('1'); else { const ok = await clickSel('svg.enemy .part.tgt'); if (!ok) await press('1'); }
    } else await press('Escape');
    continue;
  }
  if (ph === 'post') {
    if (fights++ === 0) await page.screenshot({ path: path.join(shots, '5-post.png') });
    await page.evaluate(() => { document.querySelectorAll('[data-act=absorb]').forEach(b => b.click()); });
    await sleep(30);
    if ((await phase()).includes('replace')) continue;
    await page.evaluate(() => { document.querySelectorAll('[data-act=rchoice][data-oi="0"]').forEach(b => b.click()); });
    await clickSel('[data-act=reward]'); await sleep(30);
    if ((await phase()).includes('replace')) continue;
    await clickSel('[data-act=postleave]'); continue;
  }
  if (['feed', 'rest', 'shrine', 'event'].includes(ph)) {
    const done = await page.evaluate(() => !!window.__feral.run.pending.result);
    if (done) await press('Enter'); else await press('1');
    continue;
  }
  throw new Error('unexpected phase ' + ph);
}
const end = await phase();
console.log('ended phase:', end, 'steps:', steps, 'phases seen:', [...seen].join(','));
await page.screenshot({ path: path.join(shots, '6-end.png') });
const summary = await page.evaluate(() => { const r = window.__feral.run; return r && r.over ? { how: r.over.how, depth: r.depth, ending: r.over.ending.title, score: r.over.score } : null; });
console.log('result:', JSON.stringify(summary));
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
// restart & menu pages
await press('Escape'); await sleep(50);
for (const k of ['h', 'Escape', 'x', 'Escape', 's', 'Escape']) { await press(k); await sleep(30); }
await page.screenshot({ path: path.join(shots, '7-title2.png') });
if (!sawTarget) errors.push('never reached target step');
if (end !== 'over') errors.push('run did not finish');
await browser.close(); if (server) server.close();
if (errors.length) { console.log('ERRORS:\n' + [...new Set(errors)].join('\n')); process.exit(1); }
console.log('BROWSER TEST PASSED (no console errors)');
