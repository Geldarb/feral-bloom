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
import { estimate, torsoGuard, REFUSE_BOND, suggestTarget, severPreview, bestMove } from './combat.js';
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
const ui = { screen: 'title', cs: { step: 'action' }, events: [], setup: { species: 'mossling', name: '', seed: '', seedMut: '' }, modal: null, msg: '', hold: null, tut: null, post: null, holdFired: false, tab: 'muts', logOpen: false, mapFocus: null };
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
const quick = () => meta.quick !== false;

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
  const saved = loadRun(); const cont = saved && !saved.over; const st = meta.stats;
  return `<div class="screen titlescr">${bg('title')}
  <div class="top" style="position:absolute;right:0;left:0;top:0;z-index:5"><span style="flex:1"></span>${gearBtn}</div>
  <div class="hero"><h1>Feral Bloom</h1><div class="tag">Raise a pet. Feed it. Let it mutate.</div><div class="mascot" style="height:min(32vh,240px);aspect-ratio:300/238">${cr(mascot(), { side: 'p', bars: 'none' })}</div></div>
  <div class="menu"><button class="primary big" data-act="${cont ? 'continue' : 'new'}" data-key="Enter">${I('play', 26)}${cont ? 'Continue' : 'Play'}</button>
   ${cont ? `<button class="ghost" data-act="new">${I('paw', 20)}New run</button>` : ''}
   <div class="iconrow"><button data-act="codex" aria-label="Codex">${I('book', 26)}<small>Codex</small></button><button data-act="seedlab" aria-label="Seed Lab">${I('seed', 26)}<small>Seeds</small></button><button data-act="howto" aria-label="How to play">${I('info', 26)}<small>Help</small></button></div></div>
  <div class="stats">Best ${st.bestDepth}/${FINAL_LAYER + 1} \u00b7 Wins ${st.wins} \u00b7 <span class="spore">${meta.spores} spores</span></div></div>`;
}

function howtoScreen() {
  const sec = (t, b, open) => `<details class="how card" ${open ? 'open' : ''}><summary>${t}</summary>${b}</details>`;
  return `<div class="screen">${top({ left: backBtn(), title: 'How to play' })}<div class="content stack">
  ${sec('The goal', '<p>Guide one pet through the Drowned Bog, the Hollow Caves and the Ashlands to the Heart of the Bloom. Each run is a fresh pet and a new procedural map. If the pet dies, the run ends (permadeath). Spores earned unlock new species and starting mutation seeds.</p><p>On the map, tap a glowing node to travel. Fights, elites, feeding sites, rest, mutation shrines, mysteries and a boss at the end of each land.</p>', true)}
  ${sec('Fighting by body part', `<ul class="clean"><li>The best body part is pre-selected. Tap <b>Attack</b> and the game uses your best move on it: <b>one tap per turn</b>.</li><li>Or tap any part on the enemy to hit it right away. <b>Hold</b> a part to aim without striking (you will see hit %, damage and whether it cuts the part off).</li><li>Parts have their own HP and armour. At 0 HP a part is <b>severed</b> and the enemy loses what it did: no eyes means it misses, no jaws means no bites, no legs means it is slow.</li><li><b>Special</b> fires a mutation move, <b>Brace</b> guards, <b>Items</b> heals or lets you eat a severed part. The list button by the preview lets you pin a move.</li></ul>`, true)}
  ${sec('Mutation and care', '<ul class="clean"><li>Lost parts <b>regrow as something new</b>, shaped by diet, biome, old injuries and bond.</li><li>Four points of one food tag makes your pet mutate on the spot. Your pet visibly changes: wings, horns, plating, glowing glands.</li><li>3 mutations of one theme unlock a <b>set bonus</b>. Some themes clash (fire + frost, armour + wings).</li><li><b>Bond</b> falls as you push on. Low bond makes your pet feral: stronger, but it may ignore commands, and at the very end it refuses to fight. Care for it.</li><li>What your pet becomes decides which of the 8+ endings you get.</li></ul>')}
  ${sec('Controls', '<p>Touch: everything is a tap. Desktop: <kbd>1</kbd>-<kbd>4</kbd> are Attack, Special, Brace, Items (and pick options elsewhere), <kbd>Enter</kbd> is the main button, <kbd>Esc</kbd> goes back, <kbd>P</kbd> opens your pet and <kbd>M</kbd> the menu.</p>')}
  </div><div class="bottom"><button class="primary wide" data-act="new" data-key="Enter">Play</button></div></div>`;
}

function setupScreen() {
  const s = ui.setup;
  const cards = Object.values(PET_SPECIES).map((sp, i) => {
    const owned = meta.species.includes(sp.id);
    const pet = makePet(sp);
    const short = sp.desc.split('.')[0];
    return `<button class="card pick ${s.species === sp.id ? 'sel' : ''} ${owned ? '' : 'locked'}" ${owned ? `data-act="species" data-id="${sp.id}" data-key="${i + 1}"` : 'disabled'}>
    <span class="th">${thumb(pet)}</span><span class="tx"><b style="color:${sp.accent}">${sp.name}</b>
    <span class="small dim" style="display:block">${owned ? esc(short) : `${I('lock', 13)} ${esc(sp.unlock.text)}`}</span>
    ${owned ? `<span class="mini" style="display:block">${I('heart', 11)} ${Math.round(sp.parts.torso[0] * 1.15)} \u00b7 ${I('bolt', 11)} ${sp.spd}${sp.start.length ? ' \u00b7 ' + sp.start.map(i => MUTS[i].name).join(', ') : ''}</span>` : ''}</span></button>`;
  }).join('');
  const seeds = meta.seeds.map(id => `<option value="${id}" ${s.seedMut === id ? 'selected' : ''}>${esc(MUTS[id].name)}</option>`).join('');
  return `<div class="screen">${top({ left: backBtn(), title: 'Pick your pet' })}<div class="content stack">${cards}
  <details class="card"><summary style="min-height:44px;display:flex;align-items:center;cursor:pointer;font-weight:700">${I('gear', 18)}&nbsp;Options</summary><div class="stack" style="margin-top:8px"><label>Name<input id="petName" maxlength="16" placeholder="${PET_SPECIES[s.species].name}" value="${esc(s.name)}"></label>
  <label>Seed<input id="runSeed" maxlength="20" placeholder="random" value="${esc(s.seed)}"></label>
  <label>Starting mutation<select id="seedMut"><option value="">None</option>${seeds}</select></label></div></details></div>
  <div class="bottom"><button class="primary big wide" data-act="start" data-key="Enter">${I('play', 24)}Start</button></div></div>`;
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
  return `<button class="pstrip" data-act="sheet" aria-label="Pet"><span class="thumb">${thumb(pet)}</span><span class="info"><span class="nm"><span>${esc(pet.name)}</span><span class="small ${mc}">${I('heart', 12)} ${m}</span></span>
   <span class="st"><span>${t.hp}/${t.max} HP</span><span>${run.inv.length ? I('item', 12) + ' ' + run.inv.length : ''}</span></span>${bar(t.hp, t.max)}</span></button>`;
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
     <g transform="translate(${x - s / 2} ${y - s / 2})" style="color:${info.color}">${I(done && !cur ? 'check' : n.type, s)}</g>${av ? `<text x="${x}" y="${y + r + 17}" text-anchor="middle" font-size="12" font-weight="700" fill="${info.color}" stroke="#000" stroke-width="3" paint-order="stroke">${({ feed: 'Feed', shrine: 'Shrine', elite: 'Elite', event: 'Event' })[n.type] || info.name}</text>` : ''}</g>`;
  }
  return `<svg class="map" viewBox="0 0 ${W} ${H}" role="img" aria-label="Run map">${bands}${edges}${nodes}</svg>`;
}
function mapScreen() {
  const avail = G.availableNodes(run); const b = BIOMES[run.biomeId];
  return `<div class="screen">${top({ left: gearBtn, title: b.name, sub: `${run.depth + 1} / ${FINAL_LAYER + 1}`, right: petBtn })}
  <div class="mapstrip">${petStrip()}</div><div class="content stack"><div class="mapwrap">${mapSVG(avail)}</div></div>
  <div class="bottom hintbar">${I('map', 18)} Tap a glowing spot to travel</div></div>`;
}

// ---------------- run: choice screens (stage + sheet) ----------------
function stage(glyph, color) {
  return `<div class="stage">${bg(run.biomeId)}<div class="glyph" style="--c:${color}">${I(glyph, 42)}</div><div class="petw">${cr(run.pet, { side: 'p', bars: 'none' })}</div></div>`;
}
function sheetScreen(topTitle, glyph, color, bodyHtml, footHtml = '') {
  const b = BIOMES[run.biomeId];
  return `<div class="screen">${top({ left: gearBtn, title: topTitle, sub: b.name, right: petBtn })}${stage(glyph, color)}<div class="sheetpanel"><div class="grab"></div><div class="sbody">${bodyHtml}</div>${footHtml ? `<div class="sfoot">${footHtml}</div>` : ''}</div></div>`;
}
const contBtn = `<button class="primary big wide" data-act="nodedone" data-key="Enter">Continue</button>`;
function feedScreen() {
  const p = run.pending;
  const foods = p.foods.map((id, i) => { const f = FOODS[id]; return `<button class="card food" data-act="eat" data-id="${id}" data-key="${i + 1}" ${p.result ? 'disabled' : ''}>${I(id, 52)}<b>${f.name}</b><span>${Object.entries(f.tags).map(([t, n]) => `<span class="chip" style="--c:${TAGS[t].color}">${I(t, 12)}+${n}</span>`).join('')}</span></button>`; }).join('');
  const body = `<h2>Tap a food</h2><div class="foods">${foods}</div>${p.result ? `<div class="result">${esc(p.result)}</div>` : ''}`;
  return sheetScreen('Feeding Site', 'feed', '#8fc66a', body, p.result ? contBtn : `<button class="wide ghost" data-act="feedskip">Skip</button>`);
}
function restScreen() {
  const p = run.pending;
  const opts = G.REST_OPTIONS.map((o, i) => `<button class="card choice ${o.id === 'train' ? 'danger' : ''}" data-act="rest" data-id="${o.id}" data-key="${i + 1}" ${p.result ? 'disabled' : ''} style="--c:${o.id === 'train' ? '#e0584c' : '#79b8d9'}"><span class="gi">${I(o.id === 'train' ? 'fight' : o.id === 'sleep' ? 'rest' : o.id === 'groom' ? 'heart' : 'regen', 28)}</span><span class="tx"><b>${o.name}</b><span class="small dim">${o.desc}</span></span></button>`).join('');
  const body = `<h2>Rest</h2><div class="stack">${opts}</div>${p.result ? `<div class="result">${esc(p.result)}</div>` : ''}`;
  return sheetScreen('Rest', 'rest', '#79b8d9', body, p.result ? contBtn : '');
}
function shrineScreen() {
  const p = run.pending;
  const cards = p.offers.map((id, i) => {
    const m = MUTS[id], r = canPlace(run.pet, id);
    const note = r.ok ? '' : `<span class="mini warn" style="display:block">${r.reason === 'conflict' ? 'Replaces ' + esc(MUTS[r.with].name) : 'Replaces something'}</span>`;
    return `<button class="mut rar-${m.rarity}" style="--c:${TAGS[m.tags[0]].color}" data-act="shrine" data-idx="${i}" data-key="${i + 1}" ${p.result ? 'disabled' : ''}><span class="mi">${I(m.tags[0], 30)}</span><span class="tx"><b>${esc(m.name)}</b><span class="small" style="display:block">${esc(m.desc)}</span>${note}</span></button>`;
  }).join('');
  const body = `<h2>Pick a mutation</h2><div class="stack">${cards}</div>${p.result ? `<div class="result">${esc(p.result)}</div>` : ''}`;
  return sheetScreen('Mutation Shrine', 'shrine', '#b58cf0', body, p.result ? (run.replace ? '' : contBtn) : `<button class="wide ghost" data-act="shrineskip">Skip (+3 bond)</button>`);
}
function eventScreen() {
  const p = run.pending; const ev = EVENTS.find(e => e.id === p.eventId);
  const ch = ev.choices.map((c, i) => `<button class="card choice" data-act="event" data-idx="${i}" data-key="${i + 1}" ${p.result ? 'disabled' : ''} style="--c:#d6c88a"><span class="gi">${I('event', 28)}</span><span class="tx"><b>${c.label}</b><span class="small dim">${c.hint}</span></span></button>`).join('');
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
// Derive what the combat UI shows: the selected body part (defaults to the best one), the Attack move and the Special move.
function combatView(s) {
  const P = s.p, E = s.e, cs = ui.cs;
  const moves = listMoves(P);
  const base = moves.filter(m => m.id.startsWith('base_')), mut = moves.filter(m => !m.id.startsWith('base_'));
  const baseUse = base.filter(m => m.cdLeft <= 0);
  const manual = !!(cs.sel && E.parts[cs.sel] && !E.parts[cs.sel].sev);
  const pinned = cs.atk ? baseUse.find(m => m.id === cs.atk) : null;
  let sel = manual ? cs.sel : null;
  if (!sel) { const bp = bestMove(s, pinned ? [pinned] : baseUse); sel = bp ? bp.slot : Object.keys(E.parts).find(sl => !E.parts[sl].sev); }
  const atk = pinned || (bestMove(s, baseUse, sel) || {}).mv || baseUse[0] || null;
  const mutUse = mut.filter(m => m.cdLeft <= 0);
  const pinS = cs.spec ? mutUse.find(m => m.id === cs.spec) : null;
  const spec = pinS || (bestMove(s, mutUse.filter(m => m.tgt !== 'self' && m.tgt !== 'enemy'), sel) || {}).mv || mutUse[0] || null;
  return { P, E, moves, base, mut, baseUse, mutUse, sel, manual, atk, spec };
}
function previewStrip(s, v) {
  const { E, sel, atk } = v;
  if (!atk || !sel) return `<div class="prev"><span class="dim">Nothing to attack with: Brace or use an item.</span><button class="icon ghost mvbtn" data-act="cstep" data-step="moves" aria-label="Moves">${I('moves', 22)}</button></div>`;
  const p = E.parts[sel], e = estimate(s, 'p', atk, sel), tot = e.dmg * e.hits;
  const fx = e.kill ? '<b class="bad">KILL</b>' : e.sever ? `<b class="bad">${I('sever', 14)} cuts off</b>` : p.arm ? `<span class="dim">${I('armor', 13)} ${p.arm}</span>` : '';
  const why = e.sever && !e.kill ? `<span class="why">${esc(severPreview(s, sel)[0] || '')}</span>` : '';
  return `<div class="prev"><span class="pt">${I(sel, 20)}<b>${esc(p.label)}</b></span><span class="nums"><b>${e.hit}%</b> \u00b7 ~${tot}</span>${fx}<button class="icon ghost mvbtn" data-act="cstep" data-step="moves" aria-label="Moves">${I('moves', 22)}</button>${why}</div>`;
}
function combatScreen(s, held) {
  const P = s.p, E = s.e;
  const v = combatView(s);
  const live = !held;
  const evs = held ? (s.ev || []) : ui.events;
  const an = animFor(evs, s, !!held);
  const sevNowE = evs.filter(e => e.side === 'e' && e.k === 'sever').map(e => e.slot), sevNowP = evs.filter(e => e.side === 'p' && e.k === 'sever').map(e => e.slot);
  const flash = side => { const f = {}; for (const e of evs) if (e.side === side && e.slot && ['hit', 'crit', 'heal', 'regrow', 'sever'].includes(e.k)) f[e.slot] = e.k; return f; };
  const badges = live && v.sel && v.atk ? { [v.sel]: estimate(s, 'p', v.atk, v.sel).hit + '%' } : null;
  const last = s.log.length ? s.log[s.log.length - 1] : null;
  const line = last ? `<div class="toastline lg-${(last.c || '').split(' ')[0] || 'sys'}">${esc(last.m)}</div>` : '';
  const arena = `<div class="arena ${live ? 'tgtmode' : ''}">${bg(run.biomeId)}<div class="dim-overlay"></div>
   <div class="slot slot-e"><div class="crw ${an.enLunge ? 'lunge-e' : ''}">${cr(E, { side: 'e', targetable: live, hl: live ? v.sel : null, bars: 'damaged', badges, flash: flash('e'), events: evs, anim: an.ea, sevNow: sevNowE })}</div></div>
   <div class="slot slot-p" data-act="sheet"><div class="crw ${an.petLunge ? 'lunge-p' : ''}">${cr(P, { side: 'p', bars: 'damaged', flash: flash('p'), events: evs, anim: an.pa, sevNow: sevNowP })}</div></div>${line}</div>`;
  return `<div class="screen combat ${held ? 'held' : ''}">${top({ left: gearBtn, title: `Round ${s.turn}`, sub: BIOMES[run.biomeId].short, right: petBtn })}
   ${plate(E, 'e')}${arena}${plate(P, 'p')}<div class="bottom">${held ? `<div class="tut">${s.result === 'win' ? `${esc(E.name)} falls!` : `${esc(P.name)} has fallen...`}</div>` : actionPanel(s, v)}</div></div>`;
}
function actionPanel(s, v) {
  const { P, atk, spec } = v;
  const warn = `${P.feral > 0 ? `<div class="feralwarn">Feral: may ignore you, hits harder.</div>` : ''}${s.bond <= REFUSE_BOND ? `<div class="feralwarn">${esc(P.name)} may refuse to fight (${s.refusals}/3)!</div>` : ''}`;
  const groundN = s.ground.filter(g => !g.gone).length;
  const itemN = run.inv.length + groundN;
  const sp = spec ? `<span class="sub">${esc(spec.name)}</span>` : '<span class="sub">none</span>';
  return `<div class="actionbar">${warn}${previewStrip(s, v)}
   <div class="acts">
    <button class="abtn primary" data-act="catk" data-key="1" ${atk ? '' : 'disabled'}>${I('attack', 30)}<b>Attack</b><span class="sub">${atk ? esc(atk.name) : '-'}</span></button>
    <button class="abtn special" data-act="cspec" data-key="2" ${spec ? '' : 'disabled'}>${I('special', 30)}<b>Special</b>${sp}</button>
    <button class="abtn" data-act="cdefend" data-key="3">${I('defend', 30)}<b>Brace</b><span class="sub">guard</span></button>
    <button class="abtn" data-act="cstep" data-step="item" data-key="4" ${itemN ? '' : 'disabled'}>${I('item', 30)}<b>Items</b><span class="sub">${itemN || '-'}</span></button>
   </div><div class="hintbar2">${quick() ? 'Tap a body part to strike it \u00b7 hold to aim' : 'Tap a body part to aim, then Attack'}</div></div>`;
}

// ---------------- post combat ----------------
function postState() {
  const p = run.pending;
  if (!ui.post || ui.post.ref !== p) {
    const abs = {};
    p.absorb.forEach((a, i) => { abs[i] = !a.done && canPlace(run.pet, a.trait).ok; });
    ui.post = { ref: p, abs, reward: p.reward ? (p.reward.type === 'trophy' ? 'trophy' : 'ally') : null };
  }
  return ui.post;
}
function postScreen() {
  const p = run.pending; const ps = postState();
  const abs = p.absorb.map((a, i) => {
    const m = MUTS[a.trait]; const c = TAGS[m.tags[0]].color;
    const fits = canPlace(run.pet, a.trait).ok;
    if (a.done) return `<div class="mut done" style="--c:${c}"><span class="mi">${I(m.tags[0], 28)}</span><span class="tx"><b>${esc(m.name)}</b><span class="small good">${esc(a.result || 'Absorbed')}</span></span></div>`;
    return `<button class="mut tog ${ps.abs[i] ? 'on' : ''}" style="--c:${c}" data-act="abstoggle" data-idx="${i}" data-key="${i + 1}"><span class="mi">${I(m.tags[0], 28)}</span><span class="tx"><b>${esc(m.name)}</b><span class="small dim" style="display:block">${esc(a.from)}'s ${esc(a.label.toLowerCase())} \u00b7 ${esc(m.desc)}</span>${fits ? '' : '<span class="mini warn" style="display:block">Replaces a mutation</span>'}</span><span class="sw"></span></button>`;
  }).join('');
  const rg = p.regrow.map(r => `<div class="small">\u21bb ${esc(r.text)}</div>`).join('');
  const ch = p.choices.map((c, ci) => `<div class="card stack" style="padding:10px"><b>${esc(c.label)} regrows. Guide it?</b> ${c.chosen === null ? `${c.options.map((id, oi) => { const m = MUTS[id]; return `<button class="mut" style="--c:${TAGS[m.tags[0]].color}" data-act="rchoice" data-ci="${ci}" data-oi="${oi}"><span class="mi">${I(m.tags[0], 26)}</span><span class="tx"><b>${esc(m.name)}</b><span class="small dim" style="display:block">${esc(m.desc)}</span></span></button>`; }).join('')}<span class="small dim">Skip to let it regrow plain.</span>` : `<span class="good small">${esc(c.result)}</span>`}</div>`).join('');
  let reward = '';
  const rw = p.reward;
  if (rw && rw.type === 'trophy') reward = `<h3>${I('boss', 18)} Boss trophy</h3>${rw.taken ? `<div class="good small">${esc(rw.result || '')}</div>` : `<div class="mut tog on" style="--c:${TAGS[MUTS[rw.id].tags[0]].color}"><span class="mi">${I(MUTS[rw.id].tags[0], 28)}</span><span class="tx"><b>${esc(MUTS[rw.id].name)}</b><span class="small dim" style="display:block">${esc(MUTS[rw.id].desc)}</span></span></div>`}`;
  if (rw && rw.type === 'elite') {
    const opts = [{ k: 'ally', icon: 'heart', t: `Bond: ${HABITS[rw.habit].name}`, d: HABITS[rw.habit].desc }, ...rw.essence.map((id, i) => ({ k: String(i), icon: MUTS[id].tags[0], t: MUTS[id].name, d: MUTS[id].desc })), { k: 'none', icon: 'close', t: 'Leave it', d: '' }];
    reward = `<h3>${I('elite', 18)} Reward</h3>${rw.taken ? `<div class="good small">${esc(rw.result || '')}</div>` : `<div class="stack">${opts.map(o => `<button class="mut tog radio ${ps.reward === o.k ? 'on' : ''}" data-act="rwpick" data-k="${o.k}" style="--c:#8fc66a"><span class="mi">${I(o.icon, 26)}</span><span class="tx"><b>${esc(o.t)}</b>${o.d ? `<span class="small dim" style="display:block">${esc(o.d)}</span>` : ''}</span><span class="sw"></span></button>`).join('')}</div>`}`;
  }
  const final = nodeById(run.map, run.node).layer === FINAL_LAYER;
  const hasAbs = p.absorb.some(a => !a.done);
  const body = `<div class="banner">${I('fight', 18)} <b>${esc(p.enemy.name)}</b> defeated${p.items.length ? ' \u00b7 found ' + p.items.map(i => `${I(i, 16)}`).join(' ') : ''}</div>
   ${rg || p.adapt.length ? `<div class="card">${rg}${p.adapt.map(a => `<div class="small amber">\u2736 ${esc(a)}</div>`).join('')}</div>` : ''}${ch}
   ${hasAbs || p.absorb.length ? `<h3>${I('dna', 18)} Absorb traits <span class="mini dim">(switch on to graft)</span></h3><div class="stack">${abs}</div>` : ''}${reward ? `<div style="margin-top:6px">${reward}</div>` : ''}`;
  return sheetScreen('Victory', 'check', '#8fd27a', body, `<button class="primary big wide" data-act="postleave" data-key="Enter">${final ? 'Face the ending' : 'Continue'}</button>`);
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
  return sheet(pet.name === PET_SPECIES[run.speciesId].name ? esc(pet.name) : `${esc(pet.name)} the ${PET_SPECIES[run.speciesId].name}`, body, { enter });
}
function replaceSheet(enter) {
  const rp = run.replace;
  const body = `<p>${esc(run.pet.name)} cannot hold <b>${esc(MUTS[rp.id].name)}</b> as well. Replace one of these, or let it go.</p>${mutRow(rp.id)}<h3 style="margin-top:10px">Replace which?</h3><div class="stack">${rp.options.map((id, i) => mutRow(id, '', 'button', `data-act="replace" data-id="${id}" data-key="${KEYS[i]}"`)).join('')}<button class="wide danger" data-act="replace" data-id="" data-key="Escape">${key('Esc')}Discard the new mutation</button></div>`;
  return `<div class="sback"></div><div class="sheet ${enter ? 'enter' : ''}" role="dialog"><div class="grab"></div><header><h2>Something must give way</h2></header><div class="sb">${body}</div></div>`;
}
function settingsSheet(enter) {
  const inRun = run && !run.over && ui.screen === 'run';
  const inFight = inRun && run.phase === 'combat';
  const body = `<div class="stack">${toggle('sound', 'Sound', meta.sound !== false, meta.sound !== false ? 'sound' : 'mute')}${toggle('fasttoggle', 'Fast animations', fast(), 'fast')}${toggle('qtoggle', 'Tap a part to strike', quick(), 'target')}
   ${inFight ? `<button class="wide" data-act="logopen">${I('log', 20)}Combat log</button>` : ''}${inRun ? `<button class="wide" data-act="sheet">${I('paw', 20)}Pet</button>` : ''}<button class="wide" data-act="howto">${I('info', 20)}How to play</button>
   ${inRun ? `<button class="wide" data-act="title">${I('home', 20)}Save &amp; exit</button><button class="wide danger" data-act="quit">${I('skull', 20)}Give up</button>` : ''}
   ${ui.screen === 'title' ? `<button class="wide ghost danger" data-act="reset">Erase all progress</button>` : ''}</div>`;
  return sheet('Menu', body, { enter });
}
function logSheet(enter) {
  const s = ui.hold ? ui.hold.s : run && run.combat;
  const lines = s ? s.log.slice(-80).map(l => `<div class="lg-${(l.c || '').split(' ')[0] || 'sys'}"><span class="mini">R${l.t}</span> ${esc(l.m)}</div>`).join('') : '';
  return sheet('Combat log', `<div class="biglog" id="log">${lines}</div>`, { enter });
}
function pickSheet(enter) {
  const s = run.combat; const cs = ui.cs; const P = s.p; const v = combatView(s);
  let title = '', body = '';
  const mvRow = (m, on, act) => `<button class="choice card ${on ? 'sel' : ''}" data-act="${act}" data-id="${m.id}" ${m.cdLeft > 0 ? 'disabled' : ''}><span class="gi">${I(m.id.startsWith('base_') ? m.src : 'special', 26)}</span><span class="tx"><b>${esc(m.name)}</b><span class="small dim">${esc(moveSummary(m))}${m.cdLeft > 0 ? ` \u00b7 ready in ${m.cdLeft}` : ''}</span></span></button>`;
  if (cs.step === 'moves') {
    title = 'Moves';
    body = `<p class="small dim">Attack and Special pick the best move for the part you aim at. Pin one here if you prefer.</p><h3>Attack</h3><div class="stack"><button class="choice card ${cs.atk ? '' : 'sel'}" data-act="setatk" data-id=""><span class="gi">${I('star', 24)}</span><span class="tx"><b>Auto (best)</b></span></button>${v.base.map(m => mvRow(m, cs.atk === m.id, 'setatk')).join('')}</div>
     ${v.mut.length ? `<h3>Special</h3><div class="stack"><button class="choice card ${cs.spec ? '' : 'sel'}" data-act="setspec" data-id=""><span class="gi">${I('star', 24)}</span><span class="tx"><b>Auto (best)</b></span></button>${v.mut.map(m => mvRow(m, cs.spec === m.id, 'setspec')).join('')}</div>` : ''}`;
  } else if (cs.step === 'item') {
    title = 'Items';
    const g = s.ground.map((x, i) => ({ x, i })).filter(o => !o.x.gone);
    body = `<div class="stack">${run.inv.map(id => `<button class="choice card" data-act="citem" data-id="${id}"><span class="gi" style="--c:#cfe">${I(id, 32)}</span><span class="tx"><b>${ITEMS[id].name}</b><span class="small dim">${ITEMS[id].desc}</span></span></button>`).join('')}
     ${g.length ? `<h3>${I('devour', 18)} Eat a severed part <span class="mini dim">(heals, no graft)</span></h3>${g.map(o => `<button class="choice card" data-act="cdevour" data-idx="${o.i}"><span class="gi" style="--c:#e0584c">${I('devour', 28)}</span><span class="tx"><b>${esc(o.x.from)}'s ${esc(o.x.label.toLowerCase())}</b><span class="small dim">${o.x.trait ? esc(MUTS[o.x.trait].name) : 'plain flesh'}</span></span></button>`).join('')}` : ''}${!run.inv.length && !g.length ? '<div class="dim">Nothing here.</div>' : ''}</div>`;
  } else if (cs.step === 'itemtgt') {
    const def = ITEMS[cs.item]; const want = def.target === 'ownSevered'; title = `${def.name}: which part?`;
    const slots = SLOT_ORDER.filter(sl => P.parts[sl] && (P.parts[sl].sev === want));
    body = `<div class="stack">${slots.map(sl => `<button class="choice card" data-act="citemtgt" data-slot-arg="${sl}"><span class="gi">${I(sl, 28)}</span><span class="tx"><b>${esc(P.parts[sl].label)}</b><span class="small dim">${P.parts[sl].sev ? 'Severed' : P.parts[sl].hp + '/' + P.parts[sl].max}</span></span></button>`).join('') || '<div class="dim">Nothing to use it on.</div>'}</div>`;
  }
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
const TUT = [
  { ic: 'map', t: 'Travel', d: 'Tap a glowing spot on the map. Fights, food, rest and shrines each shape your pet.' },
  { ic: 'attack', t: 'Fight', d: 'Tap a body part to hit it. Cut off eyes, jaws or legs to cripple the enemy. Hold a part to aim without striking.' },
  { ic: 'dna', t: 'Mutate', d: 'Your pet changes with what it eats, where it goes and how it is hurt. Keep it happy, or it will refuse to fight.' },
];
function tutSheet(enter) {
  const t = TUT[ui.tut];
  return `<div class="sback"></div><div class="sheet tut ${enter ? 'enter' : ''}" role="dialog" aria-label="Quick tour"><div class="grab"></div><div class="sb" style="text-align:center"><div class="tutic">${I(t.ic, 56)}</div><h2>${t.t}</h2><p>${t.d}</p><div class="dots">${TUT.map((_, i) => `<i class="${i === ui.tut ? 'on' : ''}"></i>`).join('')}</div></div>
   <div class="sfoot row2"><button class="ghost" data-act="tutskip" data-key="Escape">Skip</button><button class="primary" data-act="tutnext" data-key="Enter">${ui.tut >= 2 ? 'Got it' : 'Next'}</button></div></div>`;
}
function renderModal() {
  let html = '', kind = '';
  const inRun = run && ui.screen === 'run';
  if (inRun && ui.tut !== null && !run.over) kind = 'tut';
  else if (inRun && !run.over && run.replace) { kind = 'replace'; }
  else if (inRun && !run.over && run.phase === 'combat' && !ui.hold && ['item', 'itemtgt', 'moves'].includes(ui.cs.step) && !ui.modal) kind = 'pick';
  else if (ui.modal) kind = ui.modal;
  if (kind === 'pet' && !(inRun && run.pet)) kind = '';
  if (kind === 'log' && !(inRun && (run.combat || ui.hold))) kind = '';
  if (kind === 'beastinfo' && !(inRun && (run.combat || ui.hold))) kind = '';
  const enter = modalEl.dataset.k !== kind;
  if (kind === 'tut') html = tutSheet(enter);
  else if (kind === 'replace') html = replaceSheet(enter);
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
  ui.cs = { step: 'action', atk: ui.cs.atk, spec: ui.cs.spec };
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
    ui.screen = 'run'; ui.cs = { step: 'action' }; ui.events = []; ui.modal = null; ui.hold = null; ui.mapFocus = null; ui.post = null;
    ui.tut = meta.tutorial ? null : 0;
  },
  buyseed: d => { if (buySeed(meta, d.id)) mutSound(); },
  node: d => { const r = G.enterNode(run, d.id); if (r.ok) { ui.cs = { step: 'action' }; ui.events = []; } },
  eat: d => { G.eat(run, d.id); sfx.heal(); }, feedskip: () => G.skipFeed(run),
  rest: d => { G.rest(run, d.id); sfx.heal(); },
  shrine: d => { G.shrineTake(run, +d.idx); mutSound(); }, shrineskip: () => G.shrineTake(run, null),
  event: d => { G.eventChoose(run, +d.idx); sfx.click(); },
  nodedone: () => { G.completeNode(run); },
  cstep: d => { ui.cs = { ...ui.cs, step: d.step }; ui.modal = null; },
  catk: () => { const v = combatView(run.combat); if (v.atk) doCombat({ type: 'attack', move: v.atk.id, target: v.sel }); },
  cspec: () => { const v = combatView(run.combat); const mv = v.spec; if (!mv) return; doCombat({ type: 'attack', move: mv.id, target: (mv.tgt === 'all' || mv.tgt === 'enemy' || mv.tgt === 'self') ? 'torso' : v.sel }); },
  setatk: d => { ui.cs = { ...ui.cs, atk: d.id || null, step: 'action' }; },
  setspec: d => { ui.cs = { ...ui.cs, spec: d.id || null, step: 'action' }; },
  ctarget: d => {
    if (ui.cs.step !== 'action') return;
    if (ui.holdFired) { ui.holdFired = false; return; }
    const slot = d.slotArg || d.slot; const s = run.combat; const v = combatView(s);
    if (quick() || (v.manual && ui.cs.sel === slot)) {
      const mv = (ui.cs.atk && v.baseUse.find(m => m.id === ui.cs.atk)) || (bestMove(s, v.baseUse, slot) || {}).mv || v.atk;
      if (mv) doCombat({ type: 'attack', move: mv.id, target: slot });
    } else ui.cs = { ...ui.cs, sel: slot };
  },
  cdefend: () => doCombat({ type: 'defend' }),
  citem: d => { const def = ITEMS[d.id]; if (def.target) ui.cs = { step: 'itemtgt', item: d.id }; else doCombat({ type: 'item', item: d.id }); },
  citemtgt: d => doCombat({ type: 'item', item: ui.cs.item, target: d.slotArg }),
  cdevour: d => doCombat({ type: 'devour', idx: +d.idx }),
  abstoggle: d => { const ps = postState(); ps.abs[d.idx] = !ps.abs[d.idx]; },
  rwpick: d => { postState().reward = d.k; },
  rchoice: d => { G.postRegrowChoice(run, +d.ci, +d.oi); mutSound(); },
  postleave: () => {
    const p = run.pending, ps = postState(); ps.going = true;
    p.choices.forEach((c, ci) => { if (c.chosen === null) G.postRegrowChoice(run, ci, -1); });
    const rw = p.reward;
    if (rw && !rw.taken && !run.replace) { if (rw.type === 'trophy') G.postClaimReward(run); else { const k = ps.reward; G.postClaimReward(run, k === 'ally' ? 'ally' : (k == null || k === 'none') ? 'none' : +k); } mutSound(); }
    for (let i = 0; i < p.absorb.length && !run.replace; i++) { const a = p.absorb[i]; if (!a.done && ps.abs[i]) { G.postAbsorb(run, i); mutSound(); } }
    if (run.replace) return;
    ps.going = false;
    const r = G.postLeave(run); if (r.ok) afterRunChange();
  },
  replace: d => { G.resolveReplaceChoice(run, d.id || null); mutSound(); if (ui.post && ui.post.going && run.phase === 'post' && !run.replace) ACT.postleave(); },
  tutnext: () => { if (ui.tut >= 2) ACT.tutskip(); else ui.tut++; },
  tutskip: () => { ui.tut = null; meta.tutorial = true; persistMeta(); },
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
    if (!el && scope === app && run && ui.screen === 'run' && !run.over && !ui.hold && modalEl.className !== 'open') {
      if (run.phase === 'map' && /^[1-9]$/.test(k)) { const id = G.availableNodes(run)[+k - 1]; if (id) { e.preventDefault(); handle('node', { id }, null); } return; }
      if (run.phase === 'combat' && k === 'Enter') { e.preventDefault(); handle('catk', {}, null); return; }
    }
    if (el) { e.preventDefault(); el.click(); }
  });
  let holdT = null;
  const stopHold = () => { clearTimeout(holdT); holdT = null; };
  document.addEventListener('pointerdown', e => {
    ui.holdFired = false;
    const el = e.target.closest && e.target.closest('.slot-e .part.tgt');
    if (!el || !run || !run.combat || ui.hold || ui.cs.step !== 'action') return;
    stopHold(); holdT = setTimeout(() => { ui.holdFired = true; ui.cs = { ...ui.cs, sel: el.dataset.slot }; render(); }, 380);
  });
  ['pointerup', 'pointercancel', 'pointermove'].forEach(t => document.addEventListener(t, e => { if (t !== 'pointermove' || (e.movementX || e.movementY) && Math.abs(e.movementX) + Math.abs(e.movementY) > 6) stopHold(); }));
  document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('.arena')) e.preventDefault(); });
  window.__feral = { get run() { return run; }, get meta() { return meta; }, ui, render, setRun: r => { run = r; ui.screen = 'run'; ui.cs = { step: 'action' }; ui.events = []; ui.hold = null; } }; // debug/test hook
  render();
}
