// DOM rendering and input (mobile-first). All game rules live in game.js / combat.js.
import * as G from './game.js';
import { PET_SPECIES, SEED_COSTS } from './data/species.js';
import { MUTATIONS, MUTS, TAGS, SLOTS, HABITS } from './data/mutations.js';
import { BIOMES, ENEMIES, BOSSES } from './data/enemies.js';
import { FOODS } from './data/foods.js';
import { ITEMS } from './data/items.js';
import { EVENTS } from './events.js';
import { ENDINGS } from './endings.js';
import { derive, listMoves, activeSynergies, activePenalties, SLOT_ORDER, describeStatus, canPlace, makePet, makeEnemy, makeHeart } from './creature.js';
import { estimate, torsoGuard, REFUSE_BOND, suggestTarget, severPreview, initiativeHint } from './combat.js';
import { NODE_INFO, BIOME_SPANS, FINAL_LAYER, nodeById } from './map.js';
import { renderCreature } from './svg.js';
import { biomeBg } from './art/backgrounds.js';
import { icon } from './art/icons.js';
import { loadMeta, saveMeta, loadRun, resetAll, buySeed } from './store.js';
import { sfx, setSound } from './audio.js';

const app = document.getElementById('app');
const modalEl = document.getElementById('modal');
let meta = loadMeta();
let run = null;
const ui = { screen: 'title', cs: { step: 'action' }, events: [], setup: { species: 'mossling', name: '', seed: '', seedMut: '' }, modal: null, msg: '', hold: null, tab: 'muts', logOpen: false, mapFocus: null };
G.bindMeta(meta);
setSound(meta.sound !== false);

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (a, b) => Math.max(0, Math.min(100, Math.round((a / b) * 100)));
const bar = (a, b, cls = '') => { const f = a / b; return `<div class="bar ${cls || (f > 0.6 ? 'ok' : f > 0.3 ? 'mid' : 'low')}" role="progressbar" aria-valuenow="${Math.max(0, a)}" aria-valuemax="${b}"><i style="width:${pct(a, b)}%"></i></div>`; };
const I = (n, size, cls) => icon(n, { size: size || 18, cls });
const tagChip = t => `<span class="chip" style="--c:${TAGS[t]?.color || '#999'}">${I(t, 13)}${TAGS[t]?.name || t}</span>`;
const key = k => `<kbd>${k}</kbd>`;
const KEYS = '123456789';
const fast = () => meta.fast === true;
const quick = () => meta.quick === true;

function moveSummary(mv) {
  const st = (mv.st || []).map(x => `${describeStatus(x.k)}${x.ch < 1 ? ' ' + Math.round(x.ch * 100) + '%' : ''}`).join(', ');
  if (mv.tgt === 'self') return 'Self buff';
  if (mv.tgt === 'enemy') return st || 'Status';
  return `${mv.type} ${mv.pow}${mv.hits > 1 ? '\u00d7' + mv.hits : ''}${mv.tgt === 'all' ? ' to ALL parts' : ''}${mv.cd ? `, cooldown ${mv.cd}` : ''}${st ? ' \u00b7 ' + st : ''}${mv.sever ? ` \u00b7 +${mv.sever} vs parts` : ''}`;
}
const shortMove = mv => mv.tgt === 'self' ? 'buff' : mv.tgt === 'enemy' ? 'status' : `${mv.type} ${mv.pow}${mv.hits > 1 ? '\u00d7' + mv.hits : ''}${mv.tgt === 'all' ? ' all' : ''}`;
function mutRow(id, extra = '', tag = 'div', attrs = '') {
  const m = MUTS[id]; const c = TAGS[m.tags[0]].color;
  return `<${tag} class="mut rar-${m.rarity}" style="--c:${c}" ${attrs}><span class="mi">${I(m.tags[0], 26)}</span><span class="tx"><b>${esc(m.name)}</b> <span class="mini">${m.rarity} \u00b7 ${SLOTS[m.slot]}</span><span style="display:block">${m.tags.map(tagChip).join('')}</span><span class="small" style="display:block">${esc(m.desc)}</span>${m.move ? `<span class="mv2" style="display:block">${I('attack', 12)} ${esc(m.move.name)}: ${moveSummary(m.move)}</span>` : ''}${extra}</span></${tag}>`;
}
const mood = b => (b >= 70 ? ['Loyal', 'good'] : b >= 50 ? ['Content', 'good'] : b >= 30 ? ['Restless', 'amber'] : b > REFUSE_BOND ? ['Feral', 'bad'] : ['About to refuse you', 'bad']);
const bg = b => `<div class="bgbox">${biomeBg(b)}</div>`;
const cr = (c, o) => renderCreature(c, o);
function thumb(c, side = 'p') { return cr(c, { side, bars: 'none' }); }
function previewPet(mutId) {
  const pet = makePet(PET_SPECIES.mossling); const m = MUTS[mutId]; const slot = m.slot === 'extra' ? 'ext1' : m.slot;
  if (!pet.parts[slot]) pet.parts[slot] = { slot, label: SLOTS[m.slot], hp: 8, max: 8, arm: 0, b: { hp: 8, arm: 0 }, sev: false, muts: [], trait: null };
  pet.parts[slot].muts.push(mutId); return pet;
}
let mascotPet = null;
function mascot() {
  if (!mascotPet) { mascotPet = makePet(PET_SPECIES.mossling); mascotPet.parts.back.muts.push('membrane_wings'); mascotPet.parts.head.muts.push('marrow_horns'); mascotPet.parts.torso.muts.push('gills'); }
  return mascotPet;
}

// ---------------- chrome ----------------
function top({ left = '', title = '', sub = '', right = '' }) {
  return `<div class="top">${left || '<span style="width:46px"></span>'}<div class="ttl">${title}${sub ? `<small>${sub}</small>` : ''}</div>${right || '<span style="width:46px"></span>'}</div>`;
}
const gearBtn = `<button class="icon ghost" data-act="settings" data-key="m" aria-label="Settings">${I('gear', 24)}</button>`;
const backBtn = (act = 'title') => `<button class="icon ghost" data-act="${act}" data-key="Escape" aria-label="Back">${I('arrowleft', 24)}</button>`;
const petBtn = `<button class="icon ghost" data-act="sheet" data-key="p" aria-label="Pet">${I('paw', 24)}</button>`;

// ---------------- menu screens ----------------
function titleScreen() {
  const saved = loadRun(); const st = meta.stats;
  return `<div class="screen titlescr">${bg('title')}
  <div class="top" style="position:absolute;right:0;left:0;top:0;z-index:5"><span style="flex:1"></span>${gearBtn}</div>
  <div class="hero"><h1>Feral Bloom</h1><div class="tag">Raise one pet. Feed it, scar it, let it mutate. Cut away what stands in its way.</div><div class="mascot" style="height:min(30vh,230px);aspect-ratio:300/238">${cr(mascot(), { side: 'p', bars: 'none' })}</div></div>
  <div class="menu">${saved && !saved.over ? `<button class="primary" data-act="continue" data-key="c">${key('C')}${I('map', 22)}Continue run</button>` : ''}
   <button class="${saved && !saved.over ? '' : 'primary'}" data-act="new" data-key="n">${key('N')}${I('paw', 22)}New run</button>
   <div class="grid2"><button data-act="codex" data-key="x">${key('X')}${I('book', 20)}Codex <span class="mini">${meta.discovered.length}/${MUTATIONS.length}</span></button><button data-act="seedlab" data-key="s">${key('S')}${I('seed', 20)}Seed Lab</button></div>
   <button class="ghost" data-act="howto" data-key="h">${key('H')}${I('info', 20)}How to play</button></div>
  <div class="stats">Runs ${st.runs} \u00b7 Wins ${st.wins} \u00b7 Best depth ${st.bestDepth}/${FINAL_LAYER + 1} \u00b7 <span class="spore">${meta.spores} spores</span> \u00b7 Endings ${meta.endings.length}/8</div></div>`;
}

function howtoScreen() {
  const sec = (t, b, open) => `<details class="how card" ${open ? 'open' : ''}><summary>${t}</summary>${b}</details>`;
  return `<div class="screen">${top({ left: backBtn(), title: 'How to play' })}<div class="content stack">
  ${sec('The goal', '<p>Guide one pet through the Drowned Bog, the Hollow Caves and the Ashlands to the Heart of the Bloom. Each run is a fresh pet and a new procedural map. If the pet dies, the run ends (permadeath). Spores earned unlock new species and starting mutation seeds.</p><p>On the map, tap a glowing node (or the buttons at the bottom) to travel. Fights, elites, feeding sites, rest, mutation shrines, mysteries and a boss at the end of each land.</p>', true)}
  ${sec('Fighting by body part', `<ul class="clean"><li>Tap a <b>move</b>, then tap the <b>exact body part</b> on the enemy (or use the part chips). A suggested part is pre-selected: just press <b>Strike</b> for a 2-tap turn. Turn on <b>quick confirm</b> in settings to strike the moment you tap a part.</li><li>Parts have their own HP and armour. At 0 HP a part is <b>severed</b> and the enemy loses what it did.</li><li><b>Eyes</b> blind it. <b>Jaws</b> stop bites. <b>Forelimbs</b> weaken attacks. <b>Hindlimbs</b> slow and cripple. <b>Tail</b> breaks balance. <b>Head</b> dazes. <b>Torso</b> is the only part that kills.</li><li>Slashing is great against limbs, piercing against eyes and jaws, blunt against heads and backs.</li><li>Enemies target <i>your</i> parts too. Hunters cut off your weapons, saboteurs go for eyes and legs, executioners wait for a weak torso.</li><li>Severed enemy parts can be <b>devoured</b> mid-fight to heal, or <b>absorbed</b> after to graft their trait.</li></ul>`)}
  ${sec('Mutation and care', '<ul class="clean"><li>Lost parts <b>regrow as something new</b>, shaped by diet, biome, old injuries and bond.</li><li>Four points of one food tag makes your pet mutate on the spot. Your pet visibly changes: wings, horns, plating, glowing glands.</li><li>3 mutations of one theme unlock a <b>set bonus</b>. Some themes clash (fire + frost, armour + wings).</li><li><b>Bond</b> falls as you push on. Low bond makes your pet feral: stronger, but it may ignore commands, and at the very end it refuses to fight. Care for it.</li><li>What your pet becomes decides which of the 8+ endings you get.</li></ul>')}
  ${sec('Controls', '<p>Touch: everything is tap. Desktop: number keys pick moves, parts and choices, <kbd>Enter</kbd> confirms, <kbd>Esc</kbd> goes back, <kbd>A</kbd> auto-targets, <kbd>P</kbd> opens your pet. Settings (gear) has <b>Fast mode</b> and <b>Quick confirm</b>.</p>')}
  </div><div class="bottom"><button class="primary wide" data-act="new" data-key="n">${key('N')}Start a run</button></div></div>`;
}

function setupScreen() {
  const s = ui.setup;
  const cards = Object.values(PET_SPECIES).map((sp, i) => {
    const owned = meta.species.includes(sp.id);
    const pet = makePet(sp);
    return `<button class="card listcard ${s.species === sp.id ? 'sel' : ''} ${owned ? '' : 'locked'}" ${owned ? `data-act="species" data-id="${sp.id}" data-key="${i + 1}"` : 'disabled'}>
    <span class="th">${thumb(pet)}</span><span class="tx"><b style="color:${sp.accent};font-size:1.05rem;font-family:Georgia,serif">${sp.name}</b> ${s.species === sp.id ? `<span class="chip" style="--c:#8fd27a">${I('check', 13)}Selected</span>` : ''}
    <span class="small dim" style="display:block">${esc(sp.desc)}</span><span class="mini" style="display:block;margin-top:2px">HP ${Math.round(sp.parts.torso[0] * 1.15)} \u00b7 Speed ${sp.spd}${sp.start.length ? ' \u00b7 ' + sp.start.map(i => MUTS[i].name).join(', ') : ''}</span>${owned ? '' : `<span class="warn small" style="display:block">${I('close', 12)} Locked: ${sp.unlock.text}</span>`}</span></button>`;
  }).join('');
  const seeds = meta.seeds.map(id => `<option value="${id}" ${s.seedMut === id ? 'selected' : ''}>${esc(MUTS[id].name)}</option>`).join('');
  return `<div class="screen">${top({ left: backBtn(), title: 'Choose your pet' })}<div class="content stack">${cards}
  <details class="card"><summary style="min-height:44px;display:flex;align-items:center;cursor:pointer;font-weight:700">Options: name, seed, mutation seed</summary><div class="stack" style="margin-top:8px"><label>Pet name<input id="petName" maxlength="16" placeholder="${PET_SPECIES[s.species].name}" value="${esc(s.name)}"></label>
  <label>Run seed (optional)<input id="runSeed" maxlength="20" placeholder="random" value="${esc(s.seed)}"></label>
  <label>Mutation seed<select id="seedMut"><option value="">None</option>${seeds}</select></label><p class="mini">Same seed = same map and encounters.</p></div></details></div>
  <div class="bottom"><button class="primary wide" data-act="start" data-key="Enter">${key('Enter')}Begin the run</button></div></div>`;
}

function seedlabScreen() {
  const rows = Object.entries(SEED_COSTS).filter(([id]) => MUTS[id]).map(([id, cost]) => {
    const own = meta.seeds.includes(id), known = meta.discovered.includes(id) || id === 'bloom_heart' && own;
    const body = known ? mutRow(id) : `<div class="mut"><span class="mi" style="--c:#667">${I('close', 22)}</span><span class="tx"><b>???</b><span class="small dim" style="display:block">Encounter this mutation in a run to unlock its seed.</span></span></div>`;
    return `<div class="card stack">${body}<div class="row">${own ? `<span class="good">${I('check', 16)} Owned</span>` : known ? `<button class="sm" data-act="buyseed" data-id="${id}" ${meta.spores < cost ? 'disabled' : ''}>Buy for <span class="spore">${cost} spores</span></button>` : `<span class="dim small">${cost} spores</span>`}</div></div>`;
  });
  return `<div class="screen">${top({ left: backBtn(), title: 'Seed Lab', sub: `${meta.spores} spores` })}<div class="content stack"><p class="dim small">Spend spores to start every future run with a mutation already grown. Winning a run unlocks the legendary <b>Bloom Heart</b> seed.</p>${rows.join('')}</div></div>`;
}

function creatureList() {
  const pet = makePet(PET_SPECIES.mossling);
  const all = [...Object.values(PET_SPECIES).map(sp => ({ id: sp.id, name: sp.name, biome: 'pet', c: makePet(sp), side: 'p' })),
    ...Object.values(ENEMIES).map(t => ({ id: t.id, name: t.name, biome: t.biome, c: makeEnemy(t, { scale: 1 }), side: 'e', t })),
    ...Object.values(BOSSES).map(t => ({ id: t.id, name: t.name, biome: t.biome, c: t.mirror ? makeHeart(t, pet, 1) : makeEnemy(t, { scale: 1 }), side: 'e', t, boss: true }))];
  return all;
}
function codexScreen() {
  const tabs = `<div class="tabs"><button data-act="tab" data-t="muts" class="${ui.tab === 'muts' ? 'on' : ''}">${I('dna', 16)}Mutations</button><button data-act="tab" data-t="best" class="${ui.tab === 'best' ? 'on' : ''}">${I('paw', 16)}Bestiary</button><button data-act="tab" data-t="ends" class="${ui.tab === 'ends' ? 'on' : ''}">${I('star', 16)}Endings</button></div>`;
  let body = '';
  if (ui.tab === 'muts') body = `<div class="stack">${MUTATIONS.map(m => meta.discovered.includes(m.id) ? mutRow(m.id, '', 'button', `data-act="mutinfo" data-id="${m.id}"`) : `<div class="mut" style="opacity:.55"><span class="mi" style="--c:#667">${I('close', 22)}</span><span class="tx"><b>???</b> <span class="mini">${m.rarity} \u00b7 ${SLOTS[m.slot]}</span></span></div>`).join('')}</div>`;
  else if (ui.tab === 'best') body = `<div class="crgrid">${creatureList().map(o => `<button class="card" data-act="beast" data-id="${o.id}" style="flex-direction:column;min-height:0">${cr(o.c, { side: o.side, bars: 'none' })}<b>${esc(o.name)}</b><span class="mini">${o.biome === 'pet' ? 'Your pet' : o.boss ? 'Boss \u00b7 ' + BIOMES[o.biome].short : BIOMES[o.biome].short}</span></button>`).join('')}</div>`;
  else body = `<div class="stack">${Object.values(ENDINGS).filter(e => !['quit', 'death'].includes(e.id)).map(e => meta.endings.includes(e.id) ? `<div class="card"><b class="amber">${e.title}</b><div class="small">${e.text}</div></div>` : `<div class="card locked"><b>???</b></div>`).join('')}</div>`;
  return `<div class="screen">${top({ left: backBtn(), title: 'Codex', sub: `${meta.discovered.length}/${MUTATIONS.length} mutations discovered` })}<div class="content">${tabs}${body}</div></div>`;
}

// ---------------- run: map ----------------
function petStrip() {
  const pet = run.pet, t = pet.parts.torso; const [m, mc] = mood(run.bond);
  const nm = Object.values(pet.parts).reduce((a, p) => a + p.muts.length, 0);
  return `<button class="pstrip" data-act="sheet"><span class="thumb">${thumb(pet)}</span><span class="info"><span class="nm"><span>${esc(pet.name)}</span><span class="small ${mc}">${m}</span></span>
   <span class="st"><span>${I('heart', 12)} ${t.hp}/${t.max}</span><span>${nm} mutations \u00b7 ${run.inv.length}/4 items</span></span>${bar(t.hp, t.max)}<span style="display:block;margin-top:3px">${bar(run.bond, 100, 'bond thin')}</span></span></button>`;
}
function mapSVG(avail) {
  const W = 360, GAP = 76, PADT = 64, PADB = 56, H = PADT + FINAL_LAYER * GAP + PADB;
  const X = (n, idx) => 180 + (idx - (n - 1) / 2) * 100;
  const Y = layer => H - PADB - layer * GAP;
  let bands = '';
  const spans = [...BIOME_SPANS, { biome: 'ashlands', from: FINAL_LAYER, to: FINAL_LAYER, final: true }];
  for (const sp of BIOME_SPANS) { const b = BIOMES[sp.biome]; const y1 = Y(sp.to) - GAP / 2, y2 = Y(sp.from) + GAP / 2; bands += `<rect x="0" y="${y1}" width="${W}" height="${y2 - y1}" fill="${b.color}" opacity=".13"/><rect x="0" y="${y1}" width="${W}" height="3" fill="${b.color}" opacity=".5"/><text x="12" y="${y1 + 22}" fill="${b.color}" font-size="15" font-family="Georgia,serif" font-weight="700">${b.name}</text>`; }
  void spans;
  let edges = '', nodes = '';
  const cleared = new Set(run.cleared);
  for (const L of run.map) for (const n of L) for (const nx of n.next) {
    const m = nodeById(run.map, nx);
    const hot = n.id === run.pos && avail.includes(nx), done = cleared.has(n.id) && (cleared.has(nx) || nx === run.pos);
    const x1 = X(n.n, n.idx), y1 = Y(n.layer), x2 = X(m.n, m.idx), y2 = Y(m.layer), ym = (y1 + y2) / 2;
    edges += `<path d="M${x1} ${y1} C${x1} ${ym} ${x2} ${ym} ${x2} ${y2}" fill="none" stroke="${hot ? '#f0b04a' : done ? '#6fa862' : '#3a5042'}" stroke-width="${hot ? 4 : 2.5}" ${hot || done ? '' : 'stroke-dasharray="3 6"'} stroke-linecap="round"/>`;
  }
  for (const L of run.map) for (const n of L) {
    const info = NODE_INFO[n.type], av = avail.includes(n.id), done = cleared.has(n.id), cur = n.id === run.pos;
    const r = n.type === 'boss' ? 29 : 23, x = X(n.n, n.idx), y = Y(n.layer), s = n.type === 'boss' ? 34 : 26;
    nodes += `<g class="node ${av ? 'avail' : ''} ${cur ? 'cur' : ''}" style="color:${info.color}" ${av ? `data-act="node" data-id="${n.id}" tabindex="0" role="button" aria-label="${info.name}"` : ''} opacity="${done && !cur ? 0.5 : 1}">
     ${av ? `<circle class="ring" cx="${x}" cy="${y}" r="${r + 5}" fill="none" stroke="${info.color}" stroke-width="2.5"/><circle cx="${x}" cy="${y}" r="${r + 12}" fill="transparent"/>` : ''}
     <circle class="base" cx="${x}" cy="${y}" r="${r}" fill="#0d1410" stroke="${cur ? '#fff' : info.color}" stroke-width="${cur ? 4 : 3}"/>
     <g transform="translate(${x - s / 2} ${y - s / 2})" style="color:${info.color}">${I(done && !cur ? 'check' : n.type, s)}</g></g>`;
  }
  return `<svg class="map" viewBox="0 0 ${W} ${H}" role="img" aria-label="Run map">${bands}${edges}${nodes}</svg>`;
}
function mapScreen() {
  const avail = G.availableNodes(run); const b = BIOMES[run.biomeId];
  const btns = avail.map((id, i) => { const n = nodeById(run.map, id), inf = NODE_INFO[n.type]; return `<button class="nbtn" data-act="node" data-id="${id}" data-key="${i + 1}" style="border-color:${inf.color}66"><span style="color:${inf.color}">${I(n.type, 26)}</span><b>${key(i + 1)}${inf.name}</b><small>${BIOMES[n.biome].short}</small></button>`; }).join('');
  const notes = run.notes.slice(-3).map(n => `<div class="${n.c === 'mut' ? 'good' : ''}">\u2022 ${esc(n.m)}</div>`).join('');
  return `<div class="screen">${top({ left: gearBtn, title: b.name, sub: `Step ${run.depth + 1}/${FINAL_LAYER + 1} \u00b7 Seed ${esc(run.seed)}`, right: petBtn })}
  <div class="content stack">${petStrip()}<div class="mapwrap">${mapSVG(avail)}</div><div class="notes">${notes}</div></div>
  <div class="bottom"><div class="row" style="flex-wrap:nowrap;gap:8px">${btns}</div></div></div>`;
}

// ---------------- run: choice screens (stage + sheet) ----------------
function stage(glyph, color) {
  return `<div class="stage">${bg(run.biomeId)}<div class="glyph" style="--c:${color}">${I(glyph, 42)}</div><div class="petw">${cr(run.pet, { side: 'p', bars: 'none' })}</div></div>`;
}
function sheetScreen(topTitle, glyph, color, bodyHtml, footHtml = '') {
  const b = BIOMES[run.biomeId];
  return `<div class="screen">${top({ left: gearBtn, title: topTitle, sub: b.name, right: petBtn })}${stage(glyph, color)}<div class="sheetpanel"><div class="grab"></div><div class="sbody">${bodyHtml}</div>${footHtml ? `<div class="sfoot">${footHtml}</div>` : ''}</div></div>`;
}
const contBtn = `<button class="primary wide" data-act="nodedone" data-key="Enter">${key('Enter')}Continue ${I('chevron', 18)}</button>`;
function feedScreen() {
  const p = run.pending;
  const foods = p.foods.map((id, i) => { const f = FOODS[id]; return `<button class="card food" data-act="eat" data-id="${id}" data-key="${i + 1}" ${p.result ? 'disabled' : ''}>${I(id, 40)}<b>${key(i + 1)}${f.name}</b><span class="mini" style="color:#b6c6b8">${f.desc}</span><span>${Object.entries(f.tags).map(([t, n]) => `<span class="chip" style="--c:${TAGS[t].color}">${I(t, 12)}${TAGS[t].name} +${n}</span>`).join('')}</span><span class="mini">Heal ${Math.round(f.heal * 100)}%${f.bond ? ` \u00b7 bond ${f.bond > 0 ? '+' : ''}${f.bond}` : ''}</span></button>`; }).join('');
  const body = `<h2>Feeding Site</h2><p class="dim small">${BIOMES[run.biomeId].short} forage. Your pet is what it eats: every tag pushes its next mutation, and four of a kind makes it mutate on the spot.</p><div class="foods">${foods}</div>${p.result ? `<div class="result">${esc(p.result)}</div>` : ''}`;
  return sheetScreen('Feeding Site', 'feed', '#8fc66a', body, p.result ? contBtn : `<button class="wide ghost" data-act="feedskip" data-key="5">${key(5)}Move on hungry</button>`);
}
function restScreen() {
  const p = run.pending;
  const opts = G.REST_OPTIONS.map((o, i) => `<button class="card choice ${o.id === 'train' ? 'danger' : ''}" data-act="rest" data-id="${o.id}" data-key="${i + 1}" ${p.result ? 'disabled' : ''} style="--c:${o.id === 'train' ? '#e0584c' : '#79b8d9'}"><span class="gi">${I(o.id === 'train' ? 'fight' : o.id === 'sleep' ? 'rest' : o.id === 'groom' ? 'heart' : 'regen', 26)}</span><span class="tx"><b>${key(i + 1)}${o.name}</b><span class="small dim">${o.desc}</span></span></button>`).join('');
  const body = `<h2>Rest &amp; Care</h2><p class="dim small">A quiet spot. How you treat your pet decides whether it stays loyal or goes feral.</p><div class="stack">${opts}</div>${p.result ? `<div class="result">${esc(p.result)}</div>` : ''}`;
  return sheetScreen('Rest & Care', 'rest', '#79b8d9', body, p.result ? contBtn : '');
}
function shrineScreen() {
  const p = run.pending;
  const cards = p.offers.map((id, i) => {
    const r = canPlace(run.pet, id);
    const note = r.ok ? '<span class="mini good" style="display:block">Fits a free socket.</span>' : r.reason === 'conflict' ? `<span class="mini warn" style="display:block">Conflicts with ${esc(MUTS[r.with].name)} (you choose what to replace).</span>` : '<span class="mini warn" style="display:block">Socket full: you will replace something.</span>';
    return mutRow(id, note, 'button', `data-act="shrine" data-idx="${i}" data-key="${i + 1}" ${p.result ? 'disabled' : ''}`);
  }).join('');
  const body = `<h2>Mutation Shrine</h2><p class="dim small">Three gifts, weighted by what your pet has eaten, suffered and become. Tap one to take it.</p><div class="stack">${cards}</div>${p.result ? `<div class="result">${esc(p.result)}</div>` : ''}`;
  return sheetScreen('Mutation Shrine', 'shrine', '#b58cf0', body, p.result ? (run.replace ? '' : contBtn) : `<button class="wide ghost" data-act="shrineskip" data-key="4">${key(4)}Leave an offering instead (+3 bond)</button>`);
}
function eventScreen() {
  const p = run.pending; const ev = EVENTS.find(e => e.id === p.eventId);
  const ch = ev.choices.map((c, i) => `<button class="card choice" data-act="event" data-idx="${i}" data-key="${i + 1}" ${p.result ? 'disabled' : ''} style="--c:#d6c88a"><span class="gi">${I('event', 26)}</span><span class="tx"><b>${key(i + 1)}${c.label}</b><span class="small dim">${c.hint}</span></span></button>`).join('');
  const body = `<h2>${ev.title}</h2><p>${ev.text}</p><div class="stack">${ch}</div>${p.result ? `<div class="result">${esc(p.result)}</div>` : ''}`;
  return sheetScreen('Mystery', 'event', '#d6c88a', body, p.result ? contBtn : '');
}

// ---------------- combat ----------------
function statusChips(c) {
  let h = Object.entries(c.st).map(([k, v]) => `<span class="chip st" title="${describeStatus(k)}">${I(k, 12)}${describeStatus(k)}${v.p > 1 ? ' ' + v.p + '\u00d7' : ''} ${v.t}</span>`).join('');
  if (c.tmp.brace) h += `<span class="chip" style="--c:#8fc66a">${I('defend', 12)}Braced</span>`;
  if (c.tmp.enrage) h += `<span class="chip" style="--c:#ff6a5a">${I('fire', 12)}Enraged</span>`;
  return h;
}
function plate(c, side) {
  const t = c.parts.torso;
  const tg = side === 'e' ? (c.boss ? '<span class="tag2 boss">BOSS</span>' : c.elite ? '<span class="tag2 elite">ELITE</span>' : '') : '';
  const inner = `<div style="flex:1;min-width:0"><div class="row" style="flex-wrap:nowrap;gap:6px"><span class="nm">${esc(c.name)}</span>${tg}<span style="flex:1"></span><span class="hpn" style="display:block">${t.hp}/${t.max}</span></div>${bar(t.hp, t.max)}<div class="sts" style="margin-top:2px">${statusChips(c)}</div></div>${side === 'e' ? `<span style="color:var(--dim)">${I('info', 20)}</span>` : ''}`;
  return side === 'e' ? `<button class="plate" data-act="beastinfo" style="border-radius:0;border:0;min-height:48px;justify-content:flex-start;text-align:left;width:100%">${inner}</button>` : `<div class="plate">${inner}</div>`;
}
function animFor(evs, s, held) {
  const k = ev => ['hit', 'crit', 'miss', 'sever'].includes(ev.k);
  const dmg = ev => ['hit', 'crit', 'sever'].includes(ev.k);
  const petLunge = evs.some(e => e.side === 'e' && k(e)), enLunge = evs.some(e => e.side === 'p' && k(e));
  const petHit = evs.some(e => e.side === 'p' && dmg(e)), enHit = evs.some(e => e.side === 'e' && dmg(e));
  const crit = side => evs.some(e => e.side === side && e.k === 'crit');
  let pa = petHit ? (crit('p') ? 'crit' : 'hit') : '', ea = enHit ? (crit('e') ? 'crit' : 'hit') : '';
  if (held) { if (s.result === 'win') ea = 'faint'; else pa = 'faint'; }
  return { petLunge, enLunge, pa, ea };
}
function combatScreen(s, held) {
  const P = s.p, E = s.e, cs = ui.cs;
  let step = held ? 'action' : (['target', 'item', 'itemtgt', 'devour'].includes(cs.step) ? cs.step : 'action');
  const selMove = step === 'target' ? listMoves(P).find(m => m.id === cs.move) : null;
  if (step === 'target' && !selMove) step = 'action';
  const tgtMode = step === 'target' && selMove;
  const evs = held ? (s.ev || []) : ui.events;
  const an = animFor(evs, s, !!held);
  const sevNowE = evs.filter(e => e.side === 'e' && e.k === 'sever').map(e => e.slot), sevNowP = evs.filter(e => e.side === 'p' && e.k === 'sever').map(e => e.slot);
  const flash = side => { const f = {}; for (const e of evs) if (e.side === side && e.slot && ['hit', 'crit', 'heal', 'regrow', 'sever'].includes(e.k)) f[e.slot] = e.k; return f; };
  const sel = tgtMode ? (cs.sel && E.parts[cs.sel] && !E.parts[cs.sel].sev ? cs.sel : null) : null;
  const sug = tgtMode ? suggestTarget(s, selMove) : null;
  let badges = null;
  if (tgtMode) { badges = {}; for (const sl of [sel, sug]) if (sl && !E.parts[sl].sev) badges[sl] = estimate(s, 'p', selMove, sl).hit + '%'; }
  const ih = initiativeHint(s);
  const initp = `<span class="initp ${ih.first === 'p' ? 'p' : ih.first === 'e' ? 'e' : ''}">${I('bolt', 13)}${ih.first === 'p' ? 'You act first' : ih.first === 'e' ? 'Foe acts first' : 'Close race'}</span>`;
  const tail = s.log.slice(-2).map(l => `<div class="lg-${(l.c || '').split(' ')[0] || 'sys'} ${l.c && l.c.includes('sever') ? 'lg-sever' : ''}">${esc(l.m)}</div>`).join('');
  const arena = `<div class="arena ${tgtMode ? 'tgtmode' : ''}">${bg(run.biomeId)}<div class="dim-overlay"></div>
   <div class="slot slot-e"><div class="crw ${an.enLunge ? 'lunge-e' : ''}">${cr(E, { side: 'e', targetable: !!tgtMode, hl: sel, suggest: sug && sug !== sel ? sug : null, bars: tgtMode ? 'all' : 'damaged', badges, flash: flash('e'), events: evs, anim: an.ea, sevNow: sevNowE })}</div></div>
   <div class="slot slot-p" data-act="sheet"><div class="crw ${an.petLunge ? 'lunge-p' : ''}">${cr(P, { side: 'p', bars: 'damaged', flash: flash('p'), events: evs, anim: an.pa, sevNow: sevNowP })}</div></div></div>`;
  const ticker = `<button class="ticker" data-act="logopen" aria-label="Open combat log"><span class="lines">${tail}</span><span style="color:var(--dim)">${I('log', 20)}</span></button>`;
  return `<div class="screen combat ${held ? 'held' : ''}">${top({ left: gearBtn, title: `Round ${s.turn}`, sub: BIOMES[run.biomeId].short, right: `${initp}${petBtn}` })}
   ${plate(E, 'e')}${arena}${plate(P, 'p')}${ticker}<div class="bottom">${held ? `<div class="tut">${s.result === 'win' ? `${esc(E.name)} falls!` : `${esc(P.name)} has fallen...`}</div>` : actionPanel(s, step, selMove, sel, sug)}</div></div>`;
}
function actionPanel(s, step, mv, sel, sug) {
  const P = s.p, E = s.e;
  if (step === 'target' && mv) {
    const alive = SLOT_ORDER.filter(sl => E.parts[sl] && !E.parts[sl].sev);
    const chips = alive.map((sl, i) => { const e = estimate(s, 'p', mv, sl); return `<button class="pchip ${sel === sl ? 'sel' : ''} ${sug === sl ? 'sug' : ''} ${e.sever ? 'sevc' : ''} ${e.kill ? 'killc' : ''}" data-act="ctarget" data-slot-arg="${sl}" data-key="${KEYS[i] || ''}">${I(sl, 18)}<b>${esc(E.parts[sl].label)}</b><span class="pc">${e.hit}%</span></button>`; }).join('');
    let prev = '<div class="l1"><span>Tap a body part</span></div><div class="l2">Tap the creature or a chip. Suggested part is outlined.</div>';
    if (sel) {
      const p = E.parts[sel], e = estimate(s, 'p', mv, sel), tot = e.dmg * e.hits;
      const fx = e.kill ? 'Would KILL it' : e.sever ? 'SEVERS: ' + severPreview(s, sel).join(' \u00b7 ') : `Leaves ~${Math.max(0, p.hp - tot)} HP${p.arm ? ` (armour ${p.arm})` : ''}`;
      prev = `<div class="l1"><span>${esc(p.label)} \u00b7 ${p.hp}/${p.max}${p.arm ? ` ${I('armor', 13)}${p.arm}` : ''}</span><span>${e.hit}% \u00b7 ~${tot} dmg</span></div><div class="l2 ${e.sever || e.kill ? 'sevfx' : ''}">${esc(fx)}</div>`;
    }
    return `<div class="actionbar"><div class="tgthead"><b>${I('attack', 16)} ${esc(mv.name)}</b><button class="qtoggle sm ghost" data-act="qtoggle">Quick: ${quick() ? 'on' : 'off'}</button></div>
     <div class="pchips">${chips}</div><div class="prev">${prev}</div>
     <div class="tgtbtns"><button class="ghost" data-act="cstep" data-step="action" data-key="Escape">${I('arrowleft', 18)}${key('Esc')}Back</button><button data-act="cauto" data-key="a">${I('star', 18)}${key('A')}Auto</button><button class="primary go" data-act="cconfirm" data-key="Enter" ${sel ? '' : 'disabled'}>${key('Enter')}Strike!</button></div></div>`;
  }
  const moves = listMoves(P);
  const warn = `${P.feral > 0 ? `<div class="feralwarn">Feral: ~${Math.round(Math.min(1, 0.4 * P.feral + 0.03 * (P.aggr || 0)) * 100)}% to ignore your command, but it hits ${Math.round(P.feral * 30)}% harder.</div>` : ''}${s.bond <= REFUSE_BOND ? `<div class="feralwarn">${esc(P.name)} may refuse to fight (${s.refusals}/3)!</div>` : ''}`;
  const groundN = s.ground.filter(g => !g.gone).length;
  const tip = run.stats.fights === 0 && s.turn <= 2 ? '<div class="tut">Tap a move, then a body part. Cut off eyes to blind it, jaws to stop bites. Torso kills.</div>' : '';
  return `<div class="actionbar">${tip}${warn}<div class="mvgrid">${moves.map((m, i) => `<button class="mvb ${i === 0 ? 'main' : ''}" data-act="cmove" data-id="${m.id}" data-key="${KEYS[i] || ''}" ${m.cdLeft > 0 ? 'disabled' : ''}><span>${key(KEYS[i] || '-')}${esc(m.name)}</span><small>${shortMove(m)} \u00b7 ${esc(P.parts[m.src].label)}</small>${m.cdLeft > 0 ? `<span class="cd">cd ${m.cdLeft}</span>` : ''}</button>`).join('')}</div>
   <div class="acrow"><button data-act="cdefend" data-key="b">${I('defend', 20)}${key('B')}Brace</button><button data-act="cstep" data-step="item" data-key="i" ${run.inv.length ? '' : 'disabled'}>${I('item', 20)}${key('I')}Item ${run.inv.length}</button><button data-act="cstep" data-step="devour" data-key="d" ${groundN ? '' : 'disabled'}>${I('devour', 20)}${key('D')}Devour ${groundN}</button></div></div>`;
}

// ---------------- post combat ----------------
function postScreen() {
  const p = run.pending;
  const abs = p.absorb.map((a, i) => {
    const pl = canPlace(run.pet, a.trait); const where = pl.ok ? `<span class="mini good" style="display:block">Fits a free ${esc((MUTS[a.trait].slot === 'extra' ? 'extra' : SLOTS[MUTS[a.trait].slot]).toLowerCase())} socket.</span>` : '<span class="mini warn" style="display:block">Socket full: you will choose what to replace.</span>';
    return `<div class="card stack" style="padding:10px"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><b>${I(a.slot, 18)} ${esc(a.from)}'s ${esc(a.label.toLowerCase())}</b>${a.done ? `<span class="good small">${esc(a.result || '')}</span>` : ''}</div>${mutRow(a.trait, a.done ? '' : where)}${a.done ? '' : `<button class="primary wide" data-act="absorb" data-idx="${i}" data-key="${KEYS[i]}">${key(KEYS[i])}${I('dna', 20)}Absorb &amp; graft <span class="mini" style="color:#d0e8c8">(-1 bond)</span></button>`}</div>`;
  }).join('');
  const rg = p.regrow.map(r => `<div class="small">\u21bb ${esc(r.text)}</div>`).join('');
  const ch = p.choices.map((c, ci) => `<div class="card stack" style="padding:10px"><b>${esc(c.label)} is regrowing.</b> ${c.chosen === null ? `<span class="small dim">Your bond lets you guide it:</span>${c.options.map((id, oi) => mutRow(id, '', 'button', `data-act="rchoice" data-ci="${ci}" data-oi="${oi}"`)).join('')}<button class="sm" data-act="rchoice" data-ci="${ci}" data-oi="-1">Let it regrow plain</button>` : `<span class="good small">${esc(c.result)}</span>`}</div>`).join('');
  let reward = '';
  const rw = p.reward;
  if (rw && rw.type === 'trophy') reward = `<div class="card stack"><h3>${I('boss', 20)} Boss trophy</h3>${mutRow(rw.id)}${rw.taken ? `<div class="good small">${esc(rw.result || '')}</div>` : `<button class="primary wide" data-act="reward" data-choice="trophy" data-key="t">${key('T')}Claim trophy</button>`}</div>`;
  if (rw && rw.type === 'elite') reward = `<div class="card stack"><h3>${I('elite', 20)} The alpha lies beaten</h3><p class="small dim">Spare it and bond with it (gain an ally habit), or take its essence.</p>${rw.taken ? `<div class="good small">${esc(rw.result || '')}</div>` : `<button class="wide" data-act="reward" data-choice="ally">${I('heart', 20)}<span>Bond: <b>${esc(HABITS[rw.habit].name)}</b><br><span class="mini">${esc(HABITS[rw.habit].desc)}</span></span></button>${rw.essence.map((id, i) => mutRow(id, '', 'button', `data-act="reward" data-choice="${i}" data-key="${KEYS[i]}"`)).join('')}<button class="sm ghost" data-act="reward" data-choice="none">Leave it</button>`}</div>`;
  const pending = p.choices.some(c => c.chosen === null) || run.replace;
  const final = nodeById(run.map, run.node).layer === FINAL_LAYER;
  const body = `<div class="banner">${I('fight', 18)} <b>${esc(p.enemy.name)}</b> defeated. ${p.items.length ? 'Found: ' + p.items.map(i => `${I(i, 16)}${ITEMS[i].name}`).join(', ') + '. ' : ''}<span class="dim small">Bond drifted ${p.bondDrift}.</span></div>
   ${rg || p.adapt.length ? `<div class="card">${rg}${p.adapt.map(a => `<div class="small amber">\u2736 ${esc(a)}</div>`).join('')}</div>` : ''}${ch}
   <h3 style="margin-top:10px">Severed parts</h3><p class="small dim">Absorbing grafts the trait onto your pet.</p><div class="stack">${abs || '<div class="small dim">No usable traits dropped.</div>'}</div>${reward ? `<div style="margin-top:10px">${reward}</div>` : ''}`;
  return sheetScreen('Victory', 'check', '#8fd27a', body, `<button class="primary wide" data-act="postleave" data-key="Enter" ${pending ? 'disabled' : ''}>${key('Enter')}${final ? 'Face the ending' : 'Continue'} ${I('chevron', 18)}</button>${pending ? '<div class="warn mini" style="text-align:center;margin-top:4px">Resolve the open choices first.</div>' : ''}`);
}

// ---------------- end ----------------
function overScreen() {
  const o = run.over, st = run.stats, pet = run.pet;
  const muts = Object.values(pet.parts).flatMap(p => p.muts).map(id => `<span class="chip" style="--c:${TAGS[MUTS[id].tags[0]].color}">${I(MUTS[id].tags[0], 12)}${esc(MUTS[id].name)}</span>`).join('') || '<span class="dim">Nothing. A plain little creature.</span>';
  const title = o.won ? 'The Bloom is quiet' : o.how === 'refused' ? 'Your pet will not fight' : o.how === 'quit' ? 'Run abandoned' : 'Your pet has fallen';
  const cause = o.how === 'death' ? `Killed by ${esc(o.cause)}.` : o.how === 'refused' ? `It refused to fight ${esc(o.cause)}: bond too low.` : '';
  const rows = [['Score', `<b>${o.score}</b>`], ['Steps cleared', `${run.depth}/${FINAL_LAYER + 1}`], ['Defeated', st.kills], ['Bosses', st.bosses], ['Severed', st.severs], ['Parts lost', st.lost], ['Devoured/absorbed', `${st.devoured}/${st.absorbed}`], ['Mutations', st.mutations], ['Final bond', run.bond], ['Seed', esc(run.seed)]].map(([k, v]) => `<div><span class="dim">${k}</span><span>${v}</span></div>`).join('');
  const body = `<h2 class="${o.won ? 'good' : 'bad'}">${title}</h2><p class="dim">${cause}</p><div class="ending"><h2>${esc(o.ending.title)}</h2><p>${esc(o.ending.text)}</p></div>
   <div class="card"><h3>What ${esc(pet.name)} became</h3><div>${muts}</div><div>${activeSynergies(pet).map(s => `<span class="chip" style="--c:#ffd36b">${I('star', 12)}${s.name}</span>`).join('')}</div></div>
   <div class="card sp0" style="margin-top:10px"><h3>Run summary</h3><div class="stats2">${rows}</div><p class="spore">+${o.spores} spores (total ${meta.spores})</p>${o.unlocked.map(u => `<p class="amber">Unlocked: ${esc(u)}</p>`).join('')}${o.newSpecies.map(u => `<p class="amber">New species unlocked: ${esc(PET_SPECIES[u].name)}!</p>`).join('')}</div>`;
  return `<div class="screen">${top({ left: gearBtn, title: 'Run over' })}<div class="stage">${bg(run.biomeId)}<div class="petw">${cr(pet, { side: 'p', bars: 'none', anim: o.won ? '' : 'dead' })}</div></div><div class="sheetpanel"><div class="grab"></div><div class="sbody">${body}</div><div class="sfoot"><div class="row" style="flex-wrap:nowrap"><button class="primary grow" data-act="new" data-key="n">${key('N')}New run</button><button class="grow" data-act="seedlab" data-key="s">${key('S')}Seed Lab</button><button class="icon" data-act="title" data-key="Escape" aria-label="Title">${I('home', 22)}</button></div></div></div></div>`;
}

// ---------------- sheets (bottom-sheet modals) ----------------
function sheet(title, body, o = {}) {
  return `<div class="sback" data-act="closemodal"></div><div class="sheet ${o.enter ? 'enter' : ''}" role="dialog" aria-label="${esc(title)}"><div class="grab"></div><header><h2>${title}</h2><button class="icon ghost" data-act="closemodal" data-key="Escape" aria-label="Close">${I('close', 24)}</button></header><div class="sb">${body}</div></div>`;
}
const toggle = (act, label, on, ic) => `<button class="toggle ${on ? 'on' : ''}" data-act="${act}">${I(ic, 22)}<span style="flex:1;margin-left:8px">${label}</span><span class="sw"></span></button>`;
function petSheet(enter) {
  const pet = run.pet, d = derive(pet);
  const syn = activeSynergies(pet), pen = activePenalties(pet);
  const rows = SLOT_ORDER.filter(sl => pet.parts[sl]).map(sl => { const p = pet.parts[sl]; return `<tr class="${p.sev ? 'sev' : ''}"><td>${I(sl, 16)} ${esc(p.label)}</td><td>${p.sev ? 'SEVERED' : p.hp + '/' + p.max}</td><td>${p.arm ? I('armor', 13) + p.arm : ''}</td><td class="small">${p.muts.map(id => esc(MUTS[id].name)).join(', ')}</td></tr>`; }).join('');
  const res = Object.entries(d.res).filter(([, v]) => v).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${Math.round(v * 100)}%`).join(', ') || 'none';
  const diet = Object.entries(run.diet).filter(([, v]) => v > 0).map(([k, v]) => `<span class="chip" style="--c:${TAGS[k]?.color}">${I(k, 12)}${TAGS[k]?.name} ${v}</span>`).join('') || '<span class="dim small">Nothing eaten yet</span>';
  const inv = run.inv.map(i => `<span class="chip" style="--c:#cfe">${I(i, 16)}${esc(ITEMS[i].name)}</span>`).join('') || '<span class="dim small">Empty</span>';
  const habits = pet.habits.map(h => `<span class="chip" style="--c:#8fc66a" title="${esc(HABITS[h].desc)}">${esc(HABITS[h].name)}</span>`).join('');
  const [m, mc] = mood(run.bond);
  const body = `<div class="bigcr">${cr(pet, { side: 'p', bars: 'damaged' })}</div>
   <div class="stack"><div class="card"><div class="row" style="justify-content:space-between"><b>${I('heart', 16)} ${pet.parts.torso.hp}/${pet.parts.torso.max}</b><span class="${mc}">${m} (${run.bond})</span></div>${bar(pet.parts.torso.hp, pet.parts.torso.max)}<div style="height:6px"></div>${bar(run.bond, 100, 'bond thin')}</div>
   <div class="card"><table class="parts">${rows}</table></div>
   <div class="card small">Speed ${d.spd} \u00b7 Accuracy ${d.acc >= 0 ? '+' : ''}${d.acc} \u00b7 Dodge ${d.dodge}% \u00b7 Damage ${d.dmg >= 0 ? '+' : ''}${Math.round(d.dmg)}% \u00b7 Crit ${d.crit}%<br>Thorns ${d.thorns} \u00b7 Regen ${d.regen}/rd \u00b7 Lifesteal ${d.lifesteal}% \u00b7 Counter ${d.counter}%<br>Resist: ${res}<br>Abuse ${run.abuse} \u00b7 Aggression ${pet.aggr || 0}</div>
   <div class="card"><h3>Set bonuses</h3>${syn.map(s => `<div class="small good">${I('star', 13)} <b>${s.name}</b>: ${s.desc}</div>`).join('') || '<div class="small dim">None yet. Collect 3 mutations of one theme.</div>'}${pen.map(s => `<div class="small bad">${I('close', 13)} <b>${s.name}</b>: ${s.desc}</div>`).join('')}</div>
   <h3>Mutations</h3>${Object.values(pet.parts).flatMap(p => p.muts.map(id => mutRow(id, p.sev ? '<span class="mini bad" style="display:block">Inactive: part severed</span>' : ''))).join('') || '<div class="small dim">None.</div>'}
   <div class="card"><b>Diet</b><div>${diet}</div><b>Items</b><div>${inv}</div>${habits ? `<b>Habits</b><div>${habits}</div>` : ''}</div></div>`;
  return sheet(`${esc(pet.name)} the ${PET_SPECIES[run.speciesId].name}`, body, { enter });
}
function replaceSheet(enter) {
  const rp = run.replace;
  const body = `<p>${esc(run.pet.name)} cannot hold <b>${esc(MUTS[rp.id].name)}</b> as well. Replace one of these, or let it go.</p>${mutRow(rp.id)}<h3 style="margin-top:10px">Replace which?</h3><div class="stack">${rp.options.map((id, i) => mutRow(id, '', 'button', `data-act="replace" data-id="${id}" data-key="${KEYS[i]}"`)).join('')}<button class="wide danger" data-act="replace" data-id="" data-key="Escape">${key('Esc')}Discard the new mutation</button></div>`;
  return `<div class="sback"></div><div class="sheet ${enter ? 'enter' : ''}" role="dialog"><div class="grab"></div><header><h2>Something must give way</h2></header><div class="sb">${body}</div></div>`;
}
function settingsSheet(enter) {
  const inRun = run && !run.over && ui.screen === 'run';
  const body = `<div class="stack">${toggle('sound', 'Sound', meta.sound !== false, meta.sound !== false ? 'sound' : 'mute')}${toggle('fasttoggle', 'Fast mode <span class="mini">(quicker animations and log)</span>', fast(), 'fast')}${toggle('qtoggle', 'Quick confirm <span class="mini">(tap a part to strike at once)</span>', quick(), 'target')}
   ${inRun ? `<button class="wide" data-act="sheet">${I('paw', 20)}Pet sheet</button>` : ''}<button class="wide" data-act="howto">${I('info', 20)}How to play</button>
   ${inRun ? `<button class="wide" data-act="title">${I('home', 20)}Save &amp; main menu</button><button class="wide danger" data-act="quit">${I('skull', 20)}Abandon run</button>` : ''}
   ${ui.screen === 'title' ? `<button class="wide ghost danger" data-act="reset">Erase all saved progress</button>` : ''}</div>`;
  return sheet('Settings', body, { enter });
}
function logSheet(enter) {
  const s = ui.hold ? ui.hold.s : run && run.combat;
  const lines = s ? s.log.slice(-80).map(l => `<div class="lg-${(l.c || '').split(' ')[0] || 'sys'}"><span class="mini">R${l.t}</span> ${esc(l.m)}</div>`).join('') : '';
  return sheet('Combat log', `<div class="biglog" id="log">${lines}</div>`, { enter });
}
function pickSheet(enter) {
  const s = run.combat; const cs = ui.cs; const P = s.p;
  let title = '', body = '';
  if (cs.step === 'item') { title = 'Use an item'; body = `<div class="stack">${run.inv.map((id, i) => `<button class="choice card" data-act="citem" data-id="${id}" data-key="${KEYS[i]}"><span class="gi" style="--c:#cfe">${I(id, 30)}</span><span class="tx"><b>${key(KEYS[i])}${ITEMS[id].name}</b><span class="small dim">${ITEMS[id].desc}</span></span></button>`).join('') || '<div class="dim">No items.</div>'}</div>`; }
  else if (cs.step === 'itemtgt') {
    const def = ITEMS[cs.item]; const want = def.target === 'ownSevered'; title = `${def.name}: which part?`;
    const slots = SLOT_ORDER.filter(sl => P.parts[sl] && (P.parts[sl].sev === want));
    body = `<div class="stack">${slots.map((sl, i) => `<button class="choice card" data-act="citemtgt" data-slot-arg="${sl}" data-key="${KEYS[i]}"><span class="gi">${I(sl, 26)}</span><span class="tx"><b>${key(KEYS[i])}${esc(P.parts[sl].label)}</b><span class="small dim">${P.parts[sl].sev ? 'Severed' : P.parts[sl].hp + '/' + P.parts[sl].max}</span></span></button>`).join('') || '<div class="dim">Nothing to use it on.</div>'}</div>`;
  } else { title = 'Devour a severed part'; const g = s.ground.map((x, i) => ({ x, i })).filter(o => !o.x.gone); body = `<p class="small dim">Heals your pet now, but the part can no longer be absorbed for its trait.</p><div class="stack">${g.map((o, k) => `<button class="choice card" data-act="cdevour" data-idx="${o.i}" data-key="${KEYS[k]}"><span class="gi" style="--c:#e0584c">${I('devour', 28)}</span><span class="tx"><b>${key(KEYS[k])}${esc(o.x.from)}'s ${esc(o.x.label.toLowerCase())}</b><span class="small dim">${o.x.trait ? 'trait: ' + esc(MUTS[o.x.trait].name) : 'plain flesh'}</span></span></button>`).join('') || '<div class="dim">Nothing left.</div>'}</div>`; }
  return `<div class="sback" data-act="cstep" data-step="action"></div><div class="sheet ${enter ? 'enter' : ''}" role="dialog"><div class="grab"></div><header><h2>${title}</h2><button class="icon ghost" data-act="cstep" data-step="action" data-key="Escape" aria-label="Close">${I('close', 24)}</button></header><div class="sb">${body}</div></div>`;
}
function beastSheet(id, enter) {
  const o = creatureList().find(x => x.id === id) || null;
  if (!o) return '';
  const c = o.c; const t = o.t;
  const parts = SLOT_ORDER.filter(sl => c.parts[sl]).map(sl => { const p = c.parts[sl]; return `<tr><td>${I(sl, 16)} ${esc(p.label)}</td><td>${p.hp} HP</td><td>${p.arm ? I('armor', 13) + p.arm : ''}</td><td class="small">${p.trait && MUTS[p.trait] ? 'graft: ' + esc(MUTS[p.trait].name) : ''}</td></tr>`; }).join('');
  const AI = { brute: 'Brutish: hits the nearest, biggest target.', hunter: 'Hunter: cuts away your weapons first.', saboteur: 'Saboteur: goes for eyes, legs and head.', executioner: 'Executioner: waits for a weak torso.', wild: 'Erratic: unpredictable.', balanced: 'Cunning: adapts to your weak points.' };
  const extra = t ? `<div class="card small"><b>${I('eye', 16)} Behaviour</b><br>${AI[t.ai] || ''}${t.regrow ? `<br>Regrows its ${t.regrow.slots.join(', ')} every ${t.regrow.every} rounds.` : ''}${t.desc ? `<br><span class="dim">${esc(t.desc)}</span>` : ''}</div>` : `<div class="card small dim">${esc(PET_SPECIES[o.id].desc)}</div>`;
  return sheet(esc(o.name), `<div class="bigcr">${cr(c, { side: o.side, bars: 'none' })}</div><div class="stack">${extra}<div class="card"><table class="parts">${parts}</table></div></div>`, { enter });
}
function beastInfoSheet(enter) {
  const s = ui.hold ? ui.hold.s : run && run.combat; if (!s) return '';
  const E = s.e;
  const AI = { brute: 'Brutish: hits the nearest, biggest target.', hunter: 'Hunter: cuts away your weapons first.', saboteur: 'Saboteur: goes for eyes, legs and head.', executioner: 'Executioner: waits for a weak torso.', wild: 'Erratic: unpredictable.', balanced: 'Cunning: adapts to your weak points.' };
  const rows = SLOT_ORDER.filter(sl => E.parts[sl]).map(sl => { const p = E.parts[sl]; return `<tr class="${p.sev ? 'sev' : ''}"><td>${I(sl, 16)} ${esc(p.label)}</td><td>${p.sev ? 'SEVERED' : p.hp + '/' + p.max}</td><td>${p.arm ? I('armor', 13) + p.arm : ''}</td><td class="small">${p.trait && MUTS[p.trait] && !p.sev ? 'graft: ' + esc(MUTS[p.trait].name) : ''}${p.sev && p.regrowIn != null ? 'regrows in ' + (p.regrowIn - 1) : ''}</td></tr>`; }).join('');
  const g = torsoGuard(E, derive(E));
  const body = `<div class="bigcr">${cr(E, { side: 'e', bars: 'all' })}</div><div class="stack"><div class="card small"><b>${I('eye', 16)} Behaviour</b><br>${AI[E.ai] || ''}${E.regrow ? `<br>Regrows: ${E.regrow.slots.map(x => E.parts[x]?.label).join(', ')} every ${E.regrow.every} rounds.` : ''}${g > 0 ? `<br><span class="warn">Torso shielded ${Math.round(g * 100)}% while other parts stand.</span>` : ''}${E.desc ? `<br><span class="dim">${esc(E.desc)}</span>` : ''}</div><div class="card"><table class="parts">${rows}</table></div></div>`;
  return sheet(esc(E.name), body, { enter });
}
function renderModal() {
  let html = '', kind = '';
  const inRun = run && ui.screen === 'run';
  if (inRun && !run.over && run.replace) { kind = 'replace'; }
  else if (inRun && !run.over && run.phase === 'combat' && !ui.hold && ['item', 'itemtgt', 'devour'].includes(ui.cs.step) && !ui.modal) kind = 'pick';
  else if (ui.modal) kind = ui.modal;
  if (kind === 'pet' && !(inRun && run.pet)) kind = '';
  if (kind === 'log' && !(inRun && (run.combat || ui.hold))) kind = '';
  if (kind === 'beastinfo' && !(inRun && (run.combat || ui.hold))) kind = '';
  const enter = modalEl.dataset.k !== kind;
  if (kind === 'replace') html = replaceSheet(enter);
  else if (kind === 'pick') html = pickSheet(enter);
  else if (kind === 'pet') html = petSheet(enter);
  else if (kind === 'settings') html = settingsSheet(enter);
  else if (kind === 'log') html = logSheet(enter);
  else if (kind === 'beastinfo') html = beastInfoSheet(enter);
  else if (kind.startsWith('mut:')) { const id = kind.slice(4); html = sheet(esc(MUTS[id].name), `<div class="bigcr">${cr(previewPet(id), { side: 'p', bars: 'none' })}</div><div class="stack">${mutRow(id)}<p class="small dim">Preview on a Mossling: this is how the mutation shows on the body.</p></div>`, { enter }); }
  else if (kind.startsWith('beast:')) html = beastSheet(kind.slice(6), enter);
  const prevScroll = modalEl.querySelector('.sb') ? modalEl.querySelector('.sb').scrollTop : 0;
  modalEl.className = html ? 'open' : '';
  modalEl.dataset.k = html ? kind : '';
  modalEl.innerHTML = html;
  const sb = modalEl.querySelector('.sb');
  if (sb) { if (kind === 'log') sb.scrollTop = sb.scrollHeight; else if (!enter) sb.scrollTop = prevScroll; }
  document.body.classList.toggle('fast', fast());
}

// ---------------- render loop ----------------
function currentScreen() {
  if (ui.screen !== 'run') return ui.screen;
  if (!run) return 'title';
  if (ui.hold) return 'combat';
  if (run.over) return 'over';
  return run.phase;
}
const SCREENS = { title: titleScreen, howto: howtoScreen, setup: setupScreen, seedlab: seedlabScreen, codex: codexScreen, map: mapScreen, feed: feedScreen, rest: restScreen, shrine: shrineScreen, event: eventScreen, post: postScreen, over: overScreen };
let lastScreen = '';
export function render() {
  const sc = currentScreen();
  const content = app.querySelector('.content, .sbody');
  const keepTop = content && lastScreen === sc ? content.scrollTop : 0;
  app.innerHTML = sc === 'combat' ? combatScreen(ui.hold ? ui.hold.s : run.combat, !!ui.hold) : SCREENS[sc]();
  const c2 = app.querySelector('.content, .sbody');
  if (c2) c2.scrollTop = keepTop;
  if (sc === 'map' && c2) {
    if (ui.mapFocus !== run.pos + ':' + run.depth) {
      ui.mapFocus = run.pos + ':' + run.depth;
      const t = c2.querySelector('.node.avail') || c2.querySelector('.node.cur');
      if (t) { const r = t.getBoundingClientRect(), cr2 = c2.getBoundingClientRect(); c2.scrollTop += (r.top - cr2.top) - cr2.height * 0.55; }
    }
  }
  lastScreen = sc;
  renderModal();
  document.title = 'Feral Bloom' + (run && !run.over && ui.screen === 'run' ? ` \u2014 ${BIOMES[run.biomeId].short}` : '');
}

function afterRunChange() {
  if (run && run.over) { if (!run._soundDone) { run._soundDone = true; (run.over.won ? sfx.win : sfx.lose)(); } }
  ui.cs = { step: 'action' };
}
function combatSound() {
  const k = new Set(ui.events.map(e => e.k));
  if (k.has('sever')) sfx.sever(); else if (k.has('crit')) sfx.crit(); else if (k.has('hit')) sfx.hit(); else if (k.has('heal') || k.has('regrow')) sfx.heal(); else if (k.has('miss')) sfx.miss();
}
function doCombat(act) {
  const s = run.combat;
  const r = G.combatAct(run, act);
  if (!r.ok) { ui.msg = r.error; return; }
  ui.events = s ? s.ev.slice() : [];
  combatSound();
  ui.cs = { step: 'action' };
  if (run.phase !== 'combat' || run.over) {
    const ms = fast() ? 450 : 950;
    ui.hold = { s };
    setTimeout(() => { if (ui.hold && ui.hold.s === s) { ui.hold = null; ui.events = []; render(); } }, ms);
    afterRunChange();
  }
}
function mutSound() { sfx.mutate(); }
const persistMeta = () => saveMeta(meta);

const ACT = {
  title: () => { ui.screen = 'title'; ui.modal = null; },
  new: () => { ui.screen = 'setup'; ui.modal = null; ui.setup = { ...ui.setup, name: '', seed: '' }; },
  howto: () => { ui.screen = 'howto'; ui.modal = null; }, seedlab: () => { ui.screen = 'seedlab'; ui.modal = null; }, codex: () => { ui.screen = 'codex'; },
  tab: d => { ui.tab = d.t; },
  mutinfo: d => { ui.modal = 'mut:' + d.id; }, beast: d => { ui.modal = 'beast:' + d.id; }, beastinfo: () => { ui.modal = 'beastinfo'; },
  settings: () => { ui.modal = ui.modal === 'settings' ? null : 'settings'; },
  logopen: () => { ui.modal = 'log'; },
  sound: () => { meta.sound = meta.sound === false; setSound(meta.sound); persistMeta(); sfx.click(); },
  fasttoggle: () => { meta.fast = !fast(); persistMeta(); },
  qtoggle: () => { meta.quick = !quick(); persistMeta(); },
  reset: () => { if (confirm('Erase all saved progress (spores, unlocks, codex)?')) { resetAll(); meta = loadMeta(); G.bindMeta(meta); run = null; ui.modal = null; } },
  continue: () => { const raw = loadRun(); if (raw) { run = G.restoreRun(raw); ui.screen = 'run'; ui.cs = { step: 'action' }; ui.events = []; ui.hold = null; ui.mapFocus = null; } },
  species: d => { ui.setup.name = document.getElementById('petName')?.value || ''; ui.setup.seed = document.getElementById('runSeed')?.value || ''; ui.setup.seedMut = document.getElementById('seedMut')?.value || ''; ui.setup.species = d.id; },
  start: () => {
    ui.setup.name = document.getElementById('petName')?.value || ui.setup.name; ui.setup.seed = document.getElementById('runSeed')?.value || ui.setup.seed; ui.setup.seedMut = document.getElementById('seedMut')?.value || ui.setup.seedMut;
    run = G.newRun(meta, { species: ui.setup.species, name: ui.setup.name, seed: ui.setup.seed, seedMut: ui.setup.seedMut });
    ui.screen = 'run'; ui.cs = { step: 'action' }; ui.events = []; ui.modal = null; ui.hold = null; ui.mapFocus = null;
  },
  buyseed: d => { if (buySeed(meta, d.id)) mutSound(); },
  node: d => { const r = G.enterNode(run, d.id); if (r.ok) { ui.cs = { step: 'action' }; ui.events = []; } },
  eat: d => { G.eat(run, d.id); sfx.heal(); }, feedskip: () => G.skipFeed(run),
  rest: d => { G.rest(run, d.id); sfx.heal(); },
  shrine: d => { G.shrineTake(run, +d.idx); mutSound(); }, shrineskip: () => G.shrineTake(run, null),
  event: d => { G.eventChoose(run, +d.idx); sfx.click(); },
  nodedone: () => { G.completeNode(run); },
  cstep: d => { ui.cs = { step: d.step }; ui.modal = null; },
  cmove: d => {
    const s = run.combat; const mv = listMoves(run.pet).find(m => m.id === d.id);
    if (!mv || mv.cdLeft > 0) return;
    if (mv.tgt === 'all' || mv.tgt === 'enemy' || mv.tgt === 'self') doCombat({ type: 'attack', move: mv.id, target: 'torso' });
    else ui.cs = { step: 'target', move: mv.id, sel: suggestTarget(s, mv) };
  },
  ctarget: d => {
    if (ui.cs.step !== 'target') return;
    const slot = d.slotArg || d.slot;
    if (quick() || ui.cs.sel === slot) doCombat({ type: 'attack', move: ui.cs.move, target: slot });
    else ui.cs.sel = slot;
  },
  cauto: () => { const mv = listMoves(run.pet).find(m => m.id === ui.cs.move); if (mv) ui.cs.sel = suggestTarget(run.combat, mv); },
  cconfirm: () => { if (ui.cs.step === 'target' && ui.cs.sel) doCombat({ type: 'attack', move: ui.cs.move, target: ui.cs.sel }); },
  cdefend: () => doCombat({ type: 'defend' }),
  citem: d => { const def = ITEMS[d.id]; if (def.target) ui.cs = { step: 'itemtgt', item: d.id }; else doCombat({ type: 'item', item: d.id }); },
  citemtgt: d => doCombat({ type: 'item', item: ui.cs.item, target: d.slotArg }),
  cdevour: d => doCombat({ type: 'devour', idx: +d.idx }),
  absorb: d => { G.postAbsorb(run, +d.idx); mutSound(); },
  rchoice: d => { G.postRegrowChoice(run, +d.ci, +d.oi); mutSound(); },
  reward: d => { const c = d.choice; G.postClaimReward(run, c === 'ally' ? 'ally' : c === 'none' ? 'none' : c === 'trophy' ? undefined : +c); mutSound(); },
  postleave: () => { const r = G.postLeave(run); if (r.ok) afterRunChange(); },
  replace: d => { G.resolveReplaceChoice(run, d.id || null); mutSound(); },
  sheet: () => { ui.modal = ui.modal === 'pet' ? null : 'pet'; },
  closemodal: () => { ui.modal = null; },
  quit: () => { if (confirm('Abandon this run? The pet is lost (you still earn spores for progress).')) { G.abandon(run); ui.modal = null; ui.hold = null; } },
};

function handle(name, d, el) {
  if (!ACT[name]) return;
  if (name !== 'sound' && name !== 'ctarget') sfx.click();
  if (ui.hold && !['settings', 'closemodal', 'logopen', 'sheet', 'title'].includes(name)) return; // let the finishing blow play out
  try { ACT[name](d, el); } catch (e) { console.error(e); ui.msg = String(e); }
  render();
}

export function init() {
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled || el.getAttribute('disabled') !== null) return;
    e.preventDefault();
    handle(el.dataset.act, el.dataset, el);
  });
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') { if (e.key === 'Enter' && ui.screen === 'setup') { e.preventDefault(); handle('start', {}, null); } return; }
    let k = e.key; if (k.length === 1) k = k.toLowerCase();
    const scope = modalEl.className === 'open' ? modalEl : app;
    const el = [...scope.querySelectorAll('[data-key]')].find(n => n.dataset.key === k && !n.disabled);
    if (!el && scope === modalEl && k === 'Escape') { ui.modal = null; render(); return; }
    if (el) { e.preventDefault(); el.click(); }
  });
  window.__feral = { get run() { return run; }, get meta() { return meta; }, ui, render, setRun: r => { run = r; ui.screen = 'run'; ui.cs = { step: 'action' }; ui.events = []; ui.hold = null; } }; // debug/test hook
  render();
}
