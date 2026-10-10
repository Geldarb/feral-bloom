// DOM rendering and input. All game rules live in game.js / combat.js.
import * as G from './game.js';
import { PET_SPECIES, SEED_COSTS } from './data/species.js';
import { MUTATIONS, MUTS, TAGS, SLOTS, HABITS, SOCKET_CAP } from './data/mutations.js';
import { SYNERGIES } from './data/synergies.js';
import { BIOMES, BIOME_ORDER } from './data/enemies.js';
import { FOODS } from './data/foods.js';
import { ITEMS } from './data/items.js';
import { EVENTS } from './events.js';
import { ENDINGS } from './endings.js';
import { derive, listMoves, activeSynergies, activePenalties, SLOT_ORDER, SLOT_LABEL, describeStatus, canPlace, replaceOptions } from './creature.js';
import { estimate, torsoGuard, REFUSE_BOND } from './combat.js';
import { NODE_INFO, BIOME_SPANS, FINAL_LAYER } from './map.js';
import { nodeById } from './map.js';
import { renderCreature } from './svg.js';
import { loadMeta, saveMeta, loadRun, clearRun, resetAll, buySeed } from './store.js';
import { sfx, setSound } from './audio.js';

const app = document.getElementById('app');
const modalEl = document.getElementById('modal');
let meta = loadMeta();
let run = null;
const ui = { screen: 'title', cs: { step: 'action' }, events: [], setup: { species: 'mossling', name: '', seed: '', seedMut: '' }, modal: null, hl: null, msg: '' };
G.bindMeta(meta);
setSound(meta.sound !== false);

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (a, b) => Math.max(0, Math.min(100, Math.round((a / b) * 100)));
const bar = (a, b, cls = '') => `<div class="bar ${cls}" role="progressbar" aria-valuenow="${Math.max(0, a)}" aria-valuemax="${b}"><i style="width:${pct(a, b)}%"></i></div>`;
const tagChip = t => `<span class="chip" style="--c:${TAGS[t]?.color || '#999'}">${TAGS[t]?.name || t}</span>`;
const key = k => `<kbd>${k}</kbd>`;
const KEYS = '123456789';

function moveSummary(mv) {
  const st = (mv.st || []).map(x => `${describeStatus(x.k)}${x.ch < 1 ? ' ' + Math.round(x.ch * 100) + '%' : ''}`).join(', ');
  if (mv.tgt === 'self') return 'Self buff';
  if (mv.tgt === 'enemy') return st || 'Status';
  return `${mv.type} ${mv.pow}${mv.hits > 1 ? '\u00d7' + mv.hits : ''}${mv.tgt === 'all' ? ' to ALL parts' : ''}${mv.cd ? `, cooldown ${mv.cd}` : ''}${st ? ' \u00b7 ' + st : ''}${mv.sever ? ` \u00b7 +${mv.sever} vs parts` : ''}`;
}
function mutCard(id, extra = '') {
  const m = MUTS[id];
  return `<div class="mut rar-${m.rarity}"><b>${esc(m.name)}</b> <span class="mini">${m.rarity} \u00b7 ${SLOTS[m.slot]}</span><div>${m.tags.map(tagChip).join('')}</div><div class="small">${esc(m.desc)}</div>${m.move ? `<div class="mini">\u2694 ${esc(m.move.name)}: ${moveSummary(m.move)}</div>` : ''}${extra}</div>`;
}
const mood = b => (b >= 70 ? ['Loyal', 'good'] : b >= 50 ? ['Content', 'good'] : b >= 30 ? ['Restless', 'amber'] : b > REFUSE_BOND ? ['Feral', 'bad'] : ['About to refuse you', 'bad']);

// ---------------- screens ----------------
function topbar() {
  const o = run && !run.over && ui.screen === 'run';
  const node = o && run.node ? nodeById(run.map, run.node) : null;
  return `<div class="topbar"><span class="brand">\u2766 Feral Bloom</span>
  <span class="meta">${o ? `<span>${BIOMES[run.biomeId].name}</span><span>Step ${run.depth + 1}/${FINAL_LAYER + 1}</span><span>Seed ${esc(run.seed)}</span>` : `<span class="spore">${meta.spores} spores</span>`}</span>
  <span class="row">${o ? `<button class="small" data-act="sheet" data-key="p">${key('P')}Pet</button>` : ''}<button class="small" data-act="sound" data-key="m" title="Toggle sound">${key('M')}${meta.sound !== false ? 'Sound on' : 'Sound off'}</button>${o ? '<button class="small danger" data-act="quit">Abandon</button>' : ui.screen !== 'title' && ui.screen !== 'run' ? '<button class="small" data-act="title" data-key="Escape">' + key('Esc') + 'Menu</button>' : ''}</span></div>`;
}

function titleScreen() {
  const saved = loadRun();
  const st = meta.stats;
  return `<div class="wrap"><div class="title"><h1>Feral Bloom</h1>
  <div class="tag">Raise one pet. Feed it, scar it, let it mutate.<br>Cut away what stands in its way.</div>
  <div class="menu">
   ${saved && !saved.over ? `<button class="primary" data-act="continue" data-key="c">${key('C')}Continue run</button>` : ''}
   <button class="primary" data-act="new" data-key="n">${key('N')}New run</button>
   <button data-act="seedlab" data-key="s">${key('S')}Seed Lab <span class="spore">(${meta.spores} spores)</span></button>
   <button data-act="codex" data-key="x">${key('X')}Mutation Codex (${meta.discovered.length}/${MUTATIONS.length})</button>
   <button data-act="howto" data-key="h">${key('H')}How to play</button>
   <button data-act="sound" data-key="m">${key('M')}Sound: ${meta.sound !== false ? 'on' : 'off'}</button>
  </div>
  <p class="dim small" style="margin-top:26px">Runs: ${st.runs} \u00b7 Wins: ${st.wins} \u00b7 Best depth: ${st.bestDepth}/${FINAL_LAYER + 1} \u00b7 Best score: ${st.bestScore} \u00b7 Endings seen: ${meta.endings.length}/8${meta.bestRun ? `<br>Best run: ${esc(meta.bestRun.name)} the ${esc(meta.bestRun.species)} \u2014 ${esc(meta.bestRun.ending)}` : ''}</p>
  <p class="mini"><a href="#" data-act="reset" style="color:#6f8277">Reset all saved progress</a></p></div></div>`;
}

function howtoScreen() {
  return `<div class="wrap">${topbar()}<div class="how card"><h2>How to play</h2>
  <p><b>Goal.</b> Guide one pet through the Drowned Bog, the Hollow Caves and the Ashlands to the Heart of the Bloom. Each run is a fresh pet and a new procedural map. If the pet dies, the run ends (permadeath). Spores earned unlock new species and starting mutation seeds.</p>
  <h3>The map</h3><p>Pick a path through branching nodes: <b>\u2694 fights</b>, <b>\u2620 elites</b> (alphas with big rewards), <b>\u2766 feeding sites</b> (what your pet eats pushes its mutations), <b>\u263e rest &amp; care</b> (bond vs. harsh training), <b>\u2726 mutation shrines</b> (pick 1 of 3), <b>? mysteries</b>, and a <b>\u265b boss</b> at the end of each land.</p>
  <h3>Combat is about body parts</h3><ul class="clean"><li>Every creature has a body map: head, eyes, jaws, forelimbs, hindlimbs, tail, back, torso and mutated extras. Each part has its own HP and armour.</li>
  <li>Choose an action (Attack, Brace, Item, Devour), then <b>choose the exact part to hit</b>. At 0 HP a part is <b>severed</b>.</li>
  <li><b>Eyes</b> \u2192 blind/inaccurate. <b>Jaws</b> \u2192 no bites or venom. <b>Forelimbs</b> \u2192 fewer attacks, less damage. <b>Hindlimbs</b> \u2192 slow, limp. <b>Tail</b> \u2192 no balance or counter. <b>Back</b> \u2192 mutation organs (wings, spines, sacs) switch off. <b>Head</b> \u2192 dazed. <b>Torso</b> \u2192 the only part that kills, and the best protected.</li>
  <li>Slashing is great against limbs and tails, piercing against eyes and jaws, blunt against heads and backs. Armour reduces damage; some damage types ignore it.</li>
  <li>Enemies target <i>your</i> parts too, and they are smart about it: hunters cut off your weapons, saboteurs go for your eyes and legs, executioners wait for your torso to weaken. Some bosses regrow parts on a timer \u2014 time your severs.</li>
  <li>Severed enemy parts fall to the ground. <b>Devour</b> one mid-fight to heal, or <b>absorb</b> it after the fight to graft its trait onto your pet.</li></ul>
  <h3>Mutation &amp; care</h3><ul class="clean"><li>Lost parts <b>regrow after the fight as something new</b>, shaped by diet, biome, old injuries and bond. High bond lets you choose between regrowth options.</li>
  <li>Feeding tallies build up; at 4 points of one tag your pet mutates spontaneously. Get hurt by one damage type often and scars become adaptations (resistance, but more aggression).</li>
  <li>3 mutations of one tag unlock a <b>set bonus</b> (3 venom = toxic cloud). Some mutations conflict, and some themes clash (fire + frost, armour + wings, mind + sound).</li>
  <li><b>Bond</b> falls as you push on. Low bond makes your pet feral: stronger, but it may ignore commands. At very low bond it refuses to fight and the run ends. Care for it.</li>
  <li>What your pet has become decides which of the 8+ endings you get.</li></ul>
  <h3>Keyboard</h3><p>Every button shows its hotkey. Numbers pick options, targets and moves; <kbd>Esc</kbd> goes back; <kbd>P</kbd> opens your pet sheet; <kbd>M</kbd> toggles sound. Click a part on the enemy's body map to target it.</p>
  <div class="row"><button class="primary" data-act="new" data-key="n">${key('N')}Start a run</button><button data-act="title" data-key="Escape">${key('Esc')}Back</button></div></div></div>`;
}

function setupScreen() {
  const s = ui.setup;
  const cards = Object.values(PET_SPECIES).map((sp, i) => {
    const owned = meta.species.includes(sp.id);
    return `<div class="card ${s.species === sp.id ? 'sel' : ''} ${owned ? '' : 'locked'}"><h3 style="color:${sp.accent}">${sp.name}</h3><div class="small">${esc(sp.desc)}</div>
    <div class="mini" style="margin:6px 0">HP ${Math.round(sp.parts.torso[0] * 1.15)} \u00b7 Speed ${sp.spd} ${sp.start.length ? '\u00b7 Starts with ' + sp.start.map(i => MUTS[i].name).join(', ') : ''}</div>
    ${owned ? `<button data-act="species" data-id="${sp.id}" data-key="${i + 1}">${key(i + 1)}${s.species === sp.id ? 'Selected' : 'Choose'}</button>` : `<div class="warn small">Locked: ${sp.unlock.text}</div>`}</div>`;
  }).join('');
  const seeds = meta.seeds.map(id => `<option value="${id}" ${s.seedMut === id ? 'selected' : ''}>${esc(MUTS[id].name)}</option>`).join('');
  return `<div class="wrap">${topbar()}<h2>Choose your pet</h2><div class="grid g5">${cards}</div>
  <div class="card sec"><div class="grid g3"><label>Pet name<br><input id="petName" maxlength="16" placeholder="${PET_SPECIES[s.species].name}" value="${esc(s.name)}"></label>
  <label>Run seed (optional)<br><input id="runSeed" maxlength="20" placeholder="random" value="${esc(s.seed)}"></label>
  <label>Mutation seed<br><select id="seedMut"><option value="">None</option>${seeds}</select></label></div>
  <p class="mini">Same seed = same map and encounters. Buy more mutation seeds in the Seed Lab with spores.</p>
  <div class="row"><button class="primary" data-act="start" data-key="Enter">${key('Enter')}Begin the run</button><button data-act="title" data-key="Escape">${key('Esc')}Back</button></div></div></div>`;
}

function seedlabScreen() {
  const rows = Object.entries(SEED_COSTS).filter(([id]) => MUTS[id]).map(([id, cost]) => {
    const own = meta.seeds.includes(id), known = meta.discovered.includes(id) || id === 'bloom_heart' && own;
    const body = known ? mutCard(id) : `<div class="mut"><b>???</b><div class="small dim">Encounter this mutation in a run to unlock its seed.</div></div>`;
    return `<div class="card">${body}<div class="row" style="margin-top:6px">${own ? '<span class="good">Owned</span>' : known ? `<button data-act="buyseed" data-id="${id}" ${meta.spores < cost ? 'disabled' : ''}>Buy for <span class="spore">${cost} spores</span></button>` : `<span class="dim small">${cost} spores</span>`}</div></div>`;
  }).filter(Boolean);
  return `<div class="wrap">${topbar()}<h2>Seed Lab</h2><p class="dim">Spend spores to start every future run with a mutation already grown. You have <b class="spore">${meta.spores}</b> spores. Winning a run unlocks the legendary <b>Bloom Heart</b> seed.</p><div class="grid g3">${rows.join('')}</div><p><button data-act="title" data-key="Escape">${key('Esc')}Back</button></p></div>`;
}

function codexScreen() {
  const cards = MUTATIONS.map(m => meta.discovered.includes(m.id) ? `<div class="card">${mutCard(m.id)}</div>` : `<div class="card locked"><div class="mut"><b>???</b> <span class="mini">${m.rarity} \u00b7 ${SLOTS[m.slot]}</span></div></div>`).join('');
  const ends = Object.values(ENDINGS).filter(e => !['quit', 'death'].includes(e.id)).map(e => meta.endings.includes(e.id) ? `<div class="card"><b class="amber">${e.title}</b><div class="small">${e.text}</div></div>` : `<div class="card locked"><b>???</b></div>`).join('');
  return `<div class="wrap">${topbar()}<h2>Mutation Codex <span class="dim small">${meta.discovered.length}/${MUTATIONS.length} discovered</span></h2><div class="grid g3">${cards}</div><h2 class="sec">Endings</h2><div class="grid g3">${ends}</div><p><button data-act="title" data-key="Escape">${key('Esc')}Back</button></p></div>`;
}

// ---------- run HUD ----------
function hudCards() {
  const pet = run.pet, t = pet.parts.torso, d = derive(pet);
  const [m, mc] = mood(run.bond);
  const syn = activeSynergies(pet), pen = activePenalties(pet);
  const muts = Object.values(pet.parts).flatMap(p => p.muts.map(id => `<span class="chip" style="--c:${TAGS[MUTS[id].tags[0]].color}" title="${esc(MUTS[id].desc)}">${esc(MUTS[id].name)}</span>`)).join('') || '<span class="dim small">No mutations yet</span>';
  const diet = Object.entries(run.diet).filter(([, v]) => v > 0).map(([k, v]) => `<span class="chip" style="--c:${TAGS[k]?.color}">${TAGS[k]?.name} ${v}</span>`).join('') || '<span class="dim small">Nothing eaten yet</span>';
  const inv = run.inv.map(i => `<span class="chip" title="${esc(ITEMS[i].desc)}">${esc(ITEMS[i].name)}</span>`).join('') || '<span class="dim small">Empty</span>';
  const habits = pet.habits.map(h => `<span class="chip" style="--c:#8fc66a" title="${esc(HABITS[h].desc)}">${esc(HABITS[h].name)}</span>`).join('');
  const adapt = Object.entries(pet.adapt).map(([k, v]) => `<span class="chip st">${k} resist L${v}</span>`).join('');
  return `<div class="hud"><div class="card"><div class="row" style="justify-content:space-between"><b>${esc(pet.name)}</b><span class="dim small">${PET_SPECIES[run.speciesId].name}</span></div>
   <div class="stat"><span>Torso HP</span><span>${t.hp}/${t.max}</span></div>${bar(t.hp, t.max)}
   <div class="stat" style="margin-top:6px"><span>Bond</span><span class="${mc}">${m} (${run.bond})</span></div>${bar(run.bond, 100, 'bond')}
   <div class="mini" style="margin-top:6px">${pet.aggr ? `Aggression ${pet.aggr} \u00b7 ` : ''}${run.bond < 50 ? `Feral: ${Math.round(Math.min(1, (50 - run.bond) / 50) * 40 + pet.aggr * 3)}% to ignore orders \u00b7 ` : ''}${run.bond <= REFUSE_BOND ? '<span class="bad">May refuse to fight!</span>' : ''}</div></div>
   <div class="card"><div class="stat"><span>Mutations</span><span>${Object.values(pet.parts).reduce((a, p) => a + p.muts.length, 0)}</span></div><div>${muts}</div>
   <div style="margin-top:4px">${syn.map(s => `<span class="chip" style="--c:#ffd36b" title="${esc(s.desc)}">\u2605 ${s.name}</span>`).join('')}${pen.map(s => `<span class="chip" style="--c:#f08a80" title="${esc(s.desc)}">\u26a0 ${s.name}</span>`).join('')}${habits}${adapt}</div></div>
   <div class="card"><div class="stat"><span>Items (${run.inv.length}/4)</span></div><div>${inv}</div><div class="stat" style="margin-top:6px"><span>Diet</span></div><div>${diet}</div></div></div>`;
}

function mapSVG(avail) {
  const W = 1000, H = 380, x = i => 55 + i * (890 / FINAL_LAYER);
  const y = (n, idx) => H / 2 + (idx - (n - 1) / 2) * 105;
  let bands = '';
  for (const sp of BIOME_SPANS) { const b = BIOMES[sp.biome]; bands += `<rect x="${x(sp.from) - 34}" y="6" width="${x(sp.to) - x(sp.from) + 68}" height="${H - 12}" rx="14" fill="${b.color}" opacity=".12"/><text x="${(x(sp.from) + x(sp.to)) / 2}" y="26" text-anchor="middle" fill="${b.color}" font-size="14" font-family="Georgia">${b.name}</text>`; }
  bands += `<rect x="${x(FINAL_LAYER) - 34}" y="6" width="68" height="${H - 12}" rx="14" fill="#a3365e" opacity=".14"/><text x="${x(FINAL_LAYER)}" y="26" text-anchor="middle" fill="#d9648f" font-size="13" font-family="Georgia">Heart</text>`;
  let edges = '', nodes = '';
  const cleared = new Set(run.cleared);
  for (const L of run.map) for (const n of L) for (const nx of n.next) {
    const m = nodeById(run.map, nx);
    const hot = n.id === run.pos && avail.includes(nx), done = cleared.has(n.id) && (cleared.has(nx) || nx === run.pos);
    edges += `<line x1="${x(n.layer)}" y1="${y(n.n, n.idx)}" x2="${x(m.layer)}" y2="${y(m.n, m.idx)}" stroke="${hot ? '#e0a23a' : done ? '#6fa862' : '#2f4439'}" stroke-width="${hot ? 3 : 2}" ${hot || done ? '' : 'stroke-dasharray="4 5"'}/>`;
  }
  for (const L of run.map) for (const n of L) {
    const info = NODE_INFO[n.type], av = avail.includes(n.id), done = cleared.has(n.id), cur = n.id === run.pos;
    const r = n.type === 'boss' ? 25 : 20;
    nodes += `<g class="node ${av ? 'avail' : ''}" ${av ? `data-act="node" data-id="${n.id}" tabindex="0" role="button"` : ''} opacity="${done && !cur ? 0.45 : 1}"><title>${info.name}${done ? ' (done)' : ''}</title>
     ${av ? `<circle class="ring" cx="${x(n.layer)}" cy="${y(n.n, n.idx)}" r="23" fill="none" stroke="${info.color}" stroke-width="2"/>` : ''}
     <circle class="base" cx="${x(n.layer)}" cy="${y(n.n, n.idx)}" r="${r}" fill="#101812" stroke="${cur ? '#fff' : info.color}" stroke-width="${cur ? 3.5 : 2.5}"/>
     <text x="${x(n.layer)}" y="${y(n.n, n.idx) + 7}" text-anchor="middle" font-size="${n.type === 'boss' ? 24 : 20}" fill="${info.color}">${done && !cur ? '\u2713' : info.glyph}</text></g>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Run map">${bands}${edges}${nodes}</svg>`;
}

function mapScreen() {
  const avail = G.availableNodes(run);
  const b = BIOMES[run.biomeId];
  const list = avail.map((id, i) => { const n = nodeById(run.map, id), inf = NODE_INFO[n.type]; return `<button class="choice" data-act="node" data-id="${id}" data-key="${i + 1}"><span class="gl" style="color:${inf.color}">${inf.glyph}</span><span>${key(i + 1)}<b>${inf.name}</b> <span class="dim small">in ${BIOMES[n.biome].short}</span><br><span class="small dim">${inf.desc}</span></span></button>`; }).join('');
  const notes = run.notes.slice(-4).map(n => `<div class="small ${n.c === 'mut' ? 'good' : 'dim'}">\u2022 ${esc(n.m)}</div>`).join('');
  return `<div class="wrap">${topbar()}${hudCards()}<div class="mapbox">${mapSVG(avail)}</div>
  <div class="card sec"><h3>Where next? <span class="dim small">${esc(b.flavor)}</span></h3><div class="choices">${list}</div></div><div class="sec">${notes}</div></div>`;
}

function nodeResultFooter() {
  return `<div class="row sec"><button class="primary" data-act="nodedone" data-key="Enter">${key('Enter')}Continue</button></div>`;
}
function feedScreen() {
  const p = run.pending;
  const foods = p.foods.map((id, i) => { const f = FOODS[id]; return `<button class="card choice" data-act="eat" data-id="${id}" data-key="${i + 1}" ${p.result ? 'disabled' : ''}><span>${key(i + 1)}<b>${f.name}</b><br><span class="small dim">${f.desc}</span><br>${Object.entries(f.tags).map(([t, n]) => `<span class="chip" style="--c:${TAGS[t].color}">${TAGS[t].name} +${n}</span>`).join('')}<span class="mini">Heal ${Math.round(f.heal * 100)}%${f.bond ? ` \u00b7 bond ${f.bond > 0 ? '+' : ''}${f.bond}` : ''}</span></span></button>`; }).join('');
  return `<div class="wrap">${topbar()}${hudCards()}<div class="card"><h2>\u2766 Feeding Site</h2><p class="dim">${BIOMES[run.biomeId].short} forage. Your pet is what it eats: every tag it gathers pushes its next mutation, and four of a kind makes it mutate on the spot.</p><div class="grid g4">${foods}</div>${p.result ? `<p class="good sec">${esc(p.result)}</p>${nodeResultFooter()}` : `<div class="row sec"><button data-act="feedskip" data-key="5">${key(5)}Move on hungry</button></div>`}</div></div>`;
}
function restScreen() {
  const p = run.pending;
  const opts = G.REST_OPTIONS.map((o, i) => `<button class="card choice ${o.id === 'train' ? 'danger' : ''}" data-act="rest" data-id="${o.id}" data-key="${i + 1}" ${p.result ? 'disabled' : ''}><span>${key(i + 1)}<b>${o.name}</b><br><span class="small dim">${o.desc}</span></span></button>`).join('');
  return `<div class="wrap">${topbar()}${hudCards()}<div class="card"><h2>\u263e Rest &amp; Care</h2><p class="dim">A quiet spot. How you treat your pet decides whether it stays loyal or goes feral.</p><div class="grid g4">${opts}</div>${p.result ? `<p class="good sec">${esc(p.result)}</p>${nodeResultFooter()}` : ''}</div></div>`;
}
function shrineScreen() {
  const p = run.pending;
  const cards = p.offers.map((id, i) => {
    const r = canPlace(run.pet, id); const m = MUTS[id];
    const note = r.ok ? '<div class="mini good">Fits a free socket.</div>' : r.reason === 'conflict' ? `<div class="mini warn">Conflicts with ${esc(MUTS[r.with].name)} (you will choose what to replace).</div>` : '<div class="mini warn">Socket full: you will replace something.</div>';
    return `<div class="card"><button style="width:100%" data-act="shrine" data-idx="${i}" data-key="${i + 1}" ${p.result ? 'disabled' : ''}>${key(i + 1)}Take this</button>${mutCard(id, note)}</div>`;
  }).join('');
  return `<div class="wrap">${topbar()}${hudCards()}<div class="card"><h2>\u2726 Mutation Shrine</h2><p class="dim">The shrine offers three gifts, weighted by what your pet has eaten, suffered and become. Take one.</p><div class="grid g3">${cards}</div>${p.result ? `<p class="good sec">${esc(p.result)}</p>${run.replace ? '' : nodeResultFooter()}` : `<div class="row sec"><button data-act="shrineskip" data-key="4">${key(4)}Leave an offering instead (+3 bond)</button></div>`}</div></div>`;
}
function eventScreen() {
  const p = run.pending; const ev = EVENTS.find(e => e.id === p.eventId);
  const ch = ev.choices.map((c, i) => `<button class="card choice" data-act="event" data-idx="${i}" data-key="${i + 1}" ${p.result ? 'disabled' : ''}><span>${key(i + 1)}<b>${c.label}</b><br><span class="small dim">${c.hint}</span></span></button>`).join('');
  return `<div class="wrap">${topbar()}${hudCards()}<div class="card"><h2>? ${ev.title}</h2><p>${ev.text}</p><div class="grid g3">${ch}</div>${p.result ? `<p class="good sec">${esc(p.result)}</p>${nodeResultFooter()}` : ''}</div></div>`;
}

// ---------- combat ----------
function statusChips(c) { return Object.entries(c.st).map(([k, v]) => `<span class="chip st">${describeStatus(k)} ${v.p > 1 ? v.p + '\u00d7' : ''}${v.t}t</span>`).join('') + (c.tmp.brace ? '<span class="chip" style="--c:#8fc66a">Braced</span>' : '') + (c.tmp.enrage ? '<span class="chip" style="--c:#ff6a5a">Enraged</span>' : ''); }
function flashMap(side) { const f = {}; for (const e of ui.events) if (e.side === side && e.slot && e.k !== 'status') f[e.slot] = e.k; return f; }
const AI_DESC = { brute: 'Brutish: hits the nearest, biggest target.', hunter: 'Hunter: cuts away your weapons first.', saboteur: 'Saboteur: goes for eyes, legs and head.', executioner: 'Executioner: waits for a weak torso.', wild: 'Erratic: unpredictable.', balanced: 'Cunning: adapts to your weak points.' };

function partTable(c, s, side, mv) {
  const rows = SLOT_ORDER.filter(sl => c.parts[sl]).map(sl => {
    const p = c.parts[sl];
    const muts = p.muts.map(id => `<span class="chip" style="--c:${TAGS[MUTS[id].tags[0]].color}">${esc(MUTS[id].name)}</span>`).join('');
    let extra = '';
    if (side === 'e' && !p.sev && p.trait && MUTS[p.trait]) extra = `<span class="mini"> trait: ${esc(MUTS[p.trait].name)}</span>`;
    if (sl === 'torso' && side === 'e') { const g = torsoGuard(c, derive(c)); if (g > 0) extra += `<span class="mini warn"> shielded ${Math.round(g * 100)}%</span>`; }
    if (p.sev && p.regrowIn != null) extra += `<span class="mini warn"> regrows in ${p.regrowIn - 1}</span>`;
    let hit = '';
    if (side === 'e' && mv && !p.sev) { const e = estimate(s, 'p', mv, sl); hit = `<span class="mini">${e.hit}% \u00b7 ~${e.dmg * e.hits}${e.sever ? ' <b class="sevtag">SEVER</b>' : ''}${e.kill ? ' <b class="sevtag">KILL</b>' : ''}</span>`; }
    return `<tr class="prow ${p.sev ? 'sev' : ''} ${side === 'e' && mv && !p.sev ? 'click' : ''}" data-hl="${sl}" ${side === 'e' && mv && !p.sev ? `data-act="ctarget" data-slot-arg="${sl}"` : ''}>
      <td>${esc(p.label)}</td><td class="bw">${p.sev ? '<span class="bad small">SEVERED</span>' : bar(p.hp, p.max, 'part thin')}</td><td class="small">${p.sev ? '' : `${p.hp}/${p.max}`}</td><td class="small dim">${p.arm > 0 && !p.sev ? '\u26e8' + p.arm : ''}</td><td>${hit || muts}${extra}</td></tr>`;
  }).join('');
  return `<table class="parts">${rows}</table>`;
}

function combatScreen() {
  const s = run.combat, P = s.p, E = s.e, cs = ui.cs;
  const selMove = cs.step === 'target' ? listMoves(P).find(m => m.id === cs.move) : null;
  const fl = ui.events;
  const petCard = `<div class="card side"><h3><span>${esc(P.name)} <span class="dim small">(you)</span></span><span class="small">${P.parts.torso.hp}/${P.parts.torso.max}</span></h3>${bar(P.parts.torso.hp, P.parts.torso.max)}<div style="min-height:22px">${statusChips(P)}</div>
   ${renderCreature(P, { side: 'p', flash: flashMap('p'), events: fl })}${partTable(P, s, 'p')}</div>`;
  const enCard = `<div class="card side"><h3><span>${esc(E.name)} ${E.boss ? '<span class="chip" style="--c:#e8504a">BOSS</span>' : E.elite ? '<span class="chip" style="--c:#e0a23a">ELITE</span>' : ''}</span><span class="small">${E.parts.torso.hp}/${E.parts.torso.max}</span></h3>${bar(E.parts.torso.hp, E.parts.torso.max)}<div style="min-height:22px">${statusChips(E)}</div>
   ${renderCreature(E, { side: 'e', targetable: cs.step === 'target', flash: flashMap('e'), events: fl })}${partTable(E, s, 'e', selMove)}
   <div class="mini">${AI_DESC[E.ai] || ''}${E.regrow ? ' Regrows: ' + E.regrow.slots.map(x => E.parts[x]?.label).join(', ') + ` every ${E.regrow.every} rounds.` : ''}${E.boss ? ' ' + esc(E.desc) : ''}</div></div>`;
  return `<div class="wrap">${topbar()}<div class="combat">${petCard}${enCard}</div>
   <div class="panel-bottom"><div class="card">${actionPanel(s)}</div><div class="log" id="log">${s.log.slice(-60).map(l => `<div class="${l.c}">${esc(l.m)}</div>`).join('')}</div></div></div>`;
}

function actionPanel(s) {
  const P = s.p, E = s.e, cs = ui.cs;
  const warn = `${P.feral > 0 ? `<div class="mini bad">Feral: ~${Math.round(Math.min(1, 0.4 * P.feral + 0.03 * (P.aggr || 0)) * 100)}% chance ${esc(P.name)} ignores your command, but it hits ${Math.round(P.feral * 30)}% harder.</div>` : ''}${s.bond <= REFUSE_BOND ? `<div class="mini bad">${esc(P.name)} may refuse to fight (${s.refusals}/3 refusals)!</div>` : ''}`;
  const back = `<button class="small" data-act="cstep" data-step="action" data-key="Escape">${key('Esc')}Back</button>`;
  if (cs.step === 'move') {
    const moves = listMoves(P);
    return `<h3>Choose an attack</h3><div class="actions">${moves.map((m, i) => `<button data-act="cmove" data-id="${m.id}" data-key="${KEYS[i] || ''}" ${m.cdLeft > 0 ? 'disabled' : ''}><div class="mv"><span>${key(KEYS[i] || '-')}<b>${esc(m.name)}</b> <span class="mini">(${esc(P.parts[m.src].label)})</span></span><span class="mini">${m.cdLeft > 0 ? 'cooldown ' + m.cdLeft : ''}</span></div><div class="d">${moveSummary(m)}</div></button>`).join('')}${back}</div>`;
  }
  if (cs.step === 'target') {
    const mv = listMoves(P).find(m => m.id === cs.move);
    const alive = SLOT_ORDER.filter(sl => E.parts[sl] && !E.parts[sl].sev);
    return `<h3>${esc(mv.name)}: which part? <span class="dim small">(or click it on the body map)</span></h3><div class="actions cols">${alive.map((sl, i) => { const e = estimate(s, 'p', mv, sl); return `<button data-act="ctarget" data-slot-arg="${sl}" data-key="${KEYS[i] || ''}" data-hl="${sl}">${key(KEYS[i] || '-')}<b>${esc(E.parts[sl].label)}</b> <span class="mini">${E.parts[sl].hp}/${E.parts[sl].max}${E.parts[sl].arm ? ' \u26e8' + E.parts[sl].arm : ''}</span><div class="d mini">${e.hit}% \u00b7 ~${e.dmg * e.hits} dmg${e.sever ? ' \u00b7 <b class="sevtag">SEVERS</b>' : ''}${e.kill ? ' \u00b7 <b class="sevtag">KILLS</b>' : ''}</div></button>`; }).join('')}${back}</div>`;
  }
  if (cs.step === 'item') {
    return `<h3>Use an item</h3><div class="actions">${run.inv.map((id, i) => `<button data-act="citem" data-id="${id}" data-key="${KEYS[i]}">${key(KEYS[i])}<b>${ITEMS[id].name}</b> <span class="mini">${ITEMS[id].desc}</span></button>`).join('') || '<div class="dim">No items.</div>'}${back}</div>`;
  }
  if (cs.step === 'itemtgt') {
    const def = ITEMS[cs.item]; const want = def.target === 'ownSevered';
    const slots = SLOT_ORDER.filter(sl => P.parts[sl] && (P.parts[sl].sev === want));
    return `<h3>${def.name}: which part?</h3><div class="actions cols">${slots.map((sl, i) => `<button data-act="citemtgt" data-slot-arg="${sl}" data-key="${KEYS[i]}">${key(KEYS[i])}${esc(P.parts[sl].label)} <span class="mini">${P.parts[sl].hp}/${P.parts[sl].max}</span></button>`).join('') || '<div class="dim">Nothing to use it on.</div>'}${back}</div>`;
  }
  if (cs.step === 'devour') {
    const g = s.ground.map((x, i) => ({ x, i })).filter(o => !o.x.gone);
    return `<h3>Devour a severed part</h3><p class="mini">Heals your pet now, but the part can no longer be absorbed for its trait.</p><div class="actions">${g.map((o, k) => `<button data-act="cdevour" data-idx="${o.i}" data-key="${KEYS[k]}">${key(KEYS[k])}${esc(o.x.from)}'s ${esc(o.x.label.toLowerCase())} <span class="mini">${o.x.trait ? 'trait: ' + esc(MUTS[o.x.trait].name) : 'plain flesh'}</span></button>`).join('')}${back}</div>`;
  }
  const groundN = s.ground.filter(g => !g.gone).length;
  const tip = run.stats.fights === 0 && s.turn <= 2 ? '<div class="mini amber" style="margin-bottom:6px">Tip: choose Attack, pick a weapon, then pick the enemy body part to hit. Cut off eyes to blind it, jaws to stop its bites, or hit the torso to kill. Severed parts can be devoured or absorbed.</div>' : '';
  return `<h3>Round ${s.turn}: your move</h3>${tip}${warn}<div class="actions cols">
   <button class="primary" data-act="cstep" data-step="move" data-key="1">${key(1)}Attack<div class="d mini">pick a weapon, then a body part</div></button>
   <button data-act="cdefend" data-key="2">${key(2)}Brace<div class="d mini">half damage this round, +2 HP</div></button>
   <button data-act="cstep" data-step="item" data-key="3" ${run.inv.length ? '' : 'disabled'}>${key(3)}Item (${run.inv.length})<div class="d mini">salves, bombs, thread...</div></button>
   <button data-act="cstep" data-step="devour" data-key="4" ${groundN ? '' : 'disabled'}>${key(4)}Devour (${groundN})<div class="d mini">eat a severed part to heal</div></button></div>`;
}

// ---------- post combat ----------
function postScreen() {
  const p = run.pending;
  const abs = p.absorb.map((a, i) => `<div class="mut"><div class="row" style="justify-content:space-between"><span><b>${esc(a.from)}'s ${esc(a.label.toLowerCase())}</b></span>${a.done ? `<span class="good small">${esc(a.result || '')}</span>` : `<button class="small" data-act="absorb" data-idx="${i}" data-key="${KEYS[i]}">${key(KEYS[i])}Absorb</button>`}</div>${mutCard(a.trait)}</div>`).join('');
  const rg = p.regrow.map(r => `<div class="small">\u21bb ${esc(r.text)}</div>`).join('');
  const ch = p.choices.map((c, ci) => `<div class="mut"><b>${esc(c.label)} is regrowing.</b> <span class="small dim">Your bond lets you guide it:</span><div class="row" style="margin-top:4px">${c.chosen === null ? c.options.map((id, oi) => `<button class="small" data-act="rchoice" data-ci="${ci}" data-oi="${oi}">${esc(MUTS[id].name)}</button>`).join('') + `<button class="small" data-act="rchoice" data-ci="${ci}" data-oi="-1">Plain</button>` : `<span class="good small">${esc(c.result)}</span>`}</div>${c.chosen === null ? c.options.map(id => mutCard(id)).join('') : ''}</div>`).join('');
  let reward = '';
  const rw = p.reward;
  if (rw && rw.type === 'trophy') reward = `<div class="card sec"><h3>\u265b Boss trophy</h3>${mutCard(rw.id)}${rw.taken ? `<div class="good small">${esc(rw.result || '')}</div>` : `<button class="primary" data-act="reward" data-choice="trophy" data-key="t">${key('T')}Claim trophy</button>`}</div>`;
  if (rw && rw.type === 'elite') reward = `<div class="card sec"><h3>\u2620 The alpha lies beaten</h3><p class="small dim">Spare it and bond with it (gain an ally habit), or take its essence.</p>${rw.taken ? `<div class="good small">${esc(rw.result || '')}</div>` : `<div class="row"><button data-act="reward" data-choice="ally">Bond: <b>${esc(HABITS[rw.habit].name)}</b> \u2014 ${esc(HABITS[rw.habit].desc)}</button></div><div class="grid g3" style="margin-top:8px">${rw.essence.map((id, i) => `<div><button class="small" style="width:100%" data-act="reward" data-choice="${i}" data-key="${KEYS[i]}">${key(KEYS[i])}Take essence</button>${mutCard(id)}</div>`).join('')}</div><button class="small" data-act="reward" data-choice="none" style="margin-top:6px">Leave it</button>`}</div>`;
  const log = run.lastLog.slice(-8).map(l => `<div class="${l.c}">${esc(l.m)}</div>`).join('');
  const pending = p.choices.some(c => c.chosen === null) || run.replace;
  const final = nodeById(run.map, run.node).layer === FINAL_LAYER;
  return `<div class="wrap">${topbar()}<div class="banner">\u2694 <b>${esc(p.enemy.name)}</b> defeated. ${p.items.length ? 'Found: ' + p.items.map(i => ITEMS[i].name).join(', ') + '. ' : ''}<span class="dim small">Bond drifted ${p.bondDrift} from the strain of battle.</span></div>${hudCards()}
  <div class="grid g2"><div class="card"><h3>Aftermath</h3>${rg || '<div class="small dim">Nothing was lost.</div>'}${p.adapt.map(a => `<div class="small amber">\u2736 ${esc(a)}</div>`).join('')}${ch}<div class="log" style="height:150px;margin-top:8px">${log}</div></div>
  <div class="card"><h3>Severed parts on the ground</h3><p class="small dim">Absorbing grafts the trait onto your pet (costs 1 bond). Skip to leave them.</p>${abs || '<div class="small dim">No usable traits dropped.</div>'}</div></div>${reward}
  <div class="row sec"><button class="primary" data-act="postleave" data-key="Enter" ${pending ? 'disabled' : ''}>${key('Enter')}${final ? 'Face the ending' : 'Continue'}</button>${pending ? '<span class="warn small">Resolve the open choices first.</span>' : ''}</div></div>`;
}

// ---------- end ----------
function overScreen() {
  const o = run.over, st = run.stats, pet = run.pet;
  const muts = Object.values(pet.parts).flatMap(p => p.muts).map(id => `<span class="chip" style="--c:${TAGS[MUTS[id].tags[0]].color}">${esc(MUTS[id].name)}</span>`).join('') || '<span class="dim">Nothing. A plain little creature.</span>';
  const title = o.won ? 'The Bloom is quiet' : o.how === 'refused' ? 'Your pet will not fight' : o.how === 'quit' ? 'Run abandoned' : 'Your pet has fallen';
  const cause = o.how === 'death' ? `Killed by ${esc(o.cause)}.` : o.how === 'refused' ? `It refused to fight ${esc(o.cause)} \u2014 bond too low.` : '';
  return `<div class="wrap">${topbar()}<h2 class="${o.won ? 'good' : 'bad'}">${title}</h2><p class="dim">${cause}</p>
  <div class="ending"><h2>${esc(o.ending.title)}</h2><p>${esc(o.ending.text)}</p></div>
  <div class="grid g2"><div class="card"><h3>Run summary</h3><table class="parts"><tr><td>Score</td><td><b>${o.score}</b></td></tr><tr><td>Steps cleared</td><td>${run.depth}/${FINAL_LAYER + 1}</td></tr><tr><td>Creatures defeated</td><td>${st.kills}</td></tr><tr><td>Bosses</td><td>${st.bosses}</td></tr><tr><td>Parts severed</td><td>${st.severs}</td></tr><tr><td>Parts lost</td><td>${st.lost}</td></tr><tr><td>Parts devoured / absorbed</td><td>${st.devoured} / ${st.absorbed}</td></tr><tr><td>Mutations gained</td><td>${st.mutations}</td></tr><tr><td>Final bond</td><td>${run.bond}</td></tr><tr><td>Seed</td><td>${esc(run.seed)}</td></tr></table>
  <p class="spore">+${o.spores} spores (total ${meta.spores})</p>${o.unlocked.map(u => `<p class="amber">Unlocked: ${esc(u)}</p>`).join('')}${o.newSpecies.map(u => `<p class="amber">New species unlocked: ${esc(PET_SPECIES[u].name)}!</p>`).join('')}</div>
  <div class="card"><h3>What ${esc(pet.name)} became</h3><div>${muts}</div><div class="sec">${activeSynergies(pet).map(s => `<span class="chip" style="--c:#ffd36b">\u2605 ${s.name}</span>`).join('')}</div>${renderCreature(pet, { side: 'p' })}</div></div>
  <div class="row sec"><button class="primary" data-act="new" data-key="n">${key('N')}New run</button><button data-act="seedlab" data-key="s">${key('S')}Seed Lab</button><button data-act="title" data-key="Escape">${key('Esc')}Title</button></div></div>`;
}

// ---------- modals ----------
function petSheet() {
  const pet = run.pet, d = derive(pet);
  const syn = activeSynergies(pet), pen = activePenalties(pet);
  const rows = SLOT_ORDER.filter(sl => pet.parts[sl]).map(sl => { const p = pet.parts[sl]; return `<tr class="${p.sev ? 'sev' : ''}"><td>${esc(p.label)}</td><td>${p.sev ? 'SEVERED' : p.hp + '/' + p.max}</td><td>${p.arm ? '\u26e8' + p.arm : ''}</td><td>${p.muts.map(id => esc(MUTS[id].name)).join(', ')}</td></tr>`; }).join('');
  const res = Object.entries(d.res).filter(([, v]) => v).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${Math.round(v * 100)}%`).join(', ') || 'none';
  return `<div class="back" data-act="closemodal"></div><div class="box"><button class="x small" data-act="closemodal" data-key="Escape">${key('Esc')}Close</button><h2>${esc(pet.name)} the ${PET_SPECIES[run.speciesId].name}</h2>
   <div class="grid g2"><div>${renderCreature(pet, { side: 'p' })}<table class="parts">${rows}</table></div>
   <div><h3>Stats</h3><div class="small">Speed ${d.spd} \u00b7 Accuracy ${d.acc >= 0 ? '+' : ''}${d.acc} \u00b7 Dodge ${d.dodge}% \u00b7 Damage ${d.dmg >= 0 ? '+' : ''}${Math.round(d.dmg)}% \u00b7 Crit ${d.crit}%<br>Thorns ${d.thorns} \u00b7 Regen ${d.regen}/round \u00b7 Lifesteal ${d.lifesteal}% \u00b7 Counter ${d.counter}%<br>Resist: ${res}<br>Bond ${run.bond} \u00b7 Abuse ${run.abuse} \u00b7 Aggression ${pet.aggr || 0}</div>
   <h3 class="sec">Set bonuses</h3>${syn.map(s => `<div class="small good">\u2605 <b>${s.name}</b>: ${s.desc}</div>`).join('') || '<div class="small dim">None yet. Collect 3 mutations of one theme.</div>'}${pen.map(s => `<div class="small bad">\u26a0 <b>${s.name}</b>: ${s.desc}</div>`).join('')}
   <h3 class="sec">Mutations</h3>${Object.values(pet.parts).flatMap(p => p.muts.map(id => mutCard(id, p.sev ? '<div class="mini bad">Inactive: part severed</div>' : ''))).join('') || '<div class="small dim">None.</div>'}</div></div></div>`;
}
function replaceModal() {
  const rp = run.replace;
  return `<div class="back"></div><div class="box"><h2>Something must give way</h2><p>${esc(run.pet.name)} cannot hold <b>${esc(MUTS[rp.id].name)}</b> as well. Replace one of these, or let it go.</p>${mutCard(rp.id)}<h3 class="sec">Replace which?</h3><div class="grid g2">${rp.options.map((id, i) => `<div><button style="width:100%" data-act="replace" data-id="${id}" data-key="${KEYS[i]}">${key(KEYS[i])}Replace ${esc(MUTS[id].name)}</button>${mutCard(id)}</div>`).join('')}</div><div class="row sec"><button data-act="replace" data-id="" data-key="Escape">${key('Esc')}Discard the new mutation</button></div></div>`;
}
function renderModal() {
  let html = '';
  if (run && !run.over && ui.screen === 'run' && run.replace) html = replaceModal();
  else if (ui.modal === 'pet' && run && ui.screen === 'run') html = petSheet();
  modalEl.className = html ? 'open' : '';
  modalEl.innerHTML = html;
}

// ---------- render loop ----------
function currentScreen() {
  if (ui.screen !== 'run') return ui.screen;
  if (!run) return 'title';
  if (run.over) return 'over';
  return run.phase;
}
const SCREENS = { title: titleScreen, howto: howtoScreen, setup: setupScreen, seedlab: seedlabScreen, codex: codexScreen, map: mapScreen, feed: feedScreen, rest: restScreen, shrine: shrineScreen, event: eventScreen, combat: combatScreen, post: postScreen, over: overScreen };
export function render() {
  const sc = currentScreen();
  const prevLog = document.getElementById('log');
  const keepScroll = prevLog ? prevLog.scrollTop : 0;
  app.innerHTML = SCREENS[sc]();
  const log = document.getElementById('log');
  if (log) log.scrollTop = log.scrollHeight;
  renderModal();
  document.title = 'Feral Bloom' + (run && !run.over && ui.screen === 'run' ? ` \u2014 ${BIOMES[run.biomeId].short}` : '');
}

function afterRunChange(prevPhase) {
  if (run && run.over) { if (!run._soundDone) { run._soundDone = true; (run.over.won ? sfx.win : sfx.lose)(); } }
  ui.cs = { step: 'action' };
}
function combatSound() {
  const k = new Set(ui.events.map(e => e.k));
  if (k.has('sever')) sfx.sever(); else if (k.has('crit')) sfx.crit(); else if (k.has('hit')) sfx.hit(); else if (k.has('heal') || k.has('regrow')) sfx.heal(); else if (k.has('miss')) sfx.miss();
}
function doCombat(act) {
  const before = run.phase;
  const r = G.combatAct(run, act);
  if (!r.ok) { ui.msg = r.error; return; }
  ui.events = run.combat ? run.combat.ev.slice() : [];
  if (run.phase !== 'combat') ui.events = [];
  combatSound();
  ui.cs = { step: 'action' };
  if (run.phase !== 'combat') afterRunChange(before);
}
function mutSound() { sfx.mutate(); }

const ACT = {
  title: () => { ui.screen = 'title'; ui.modal = null; },
  new: () => { ui.screen = 'setup'; ui.setup = { ...ui.setup, name: '', seed: '' }; },
  howto: () => { ui.screen = 'howto'; }, seedlab: () => { ui.screen = 'seedlab'; }, codex: () => { ui.screen = 'codex'; },
  sound: () => { meta.sound = meta.sound === false; setSound(meta.sound); saveMeta(meta); sfx.click(); },
  reset: () => { if (confirm('Erase all saved progress (spores, unlocks, codex)?')) { resetAll(); meta = loadMeta(); G.bindMeta(meta); run = null; } },
  continue: () => { const raw = loadRun(); if (raw) { run = G.restoreRun(raw); ui.screen = 'run'; ui.cs = { step: 'action' }; ui.events = []; } },
  species: d => { ui.setup.name = document.getElementById('petName')?.value || ''; ui.setup.seed = document.getElementById('runSeed')?.value || ''; ui.setup.seedMut = document.getElementById('seedMut')?.value || ''; ui.setup.species = d.id; },
  start: () => {
    ui.setup.name = document.getElementById('petName')?.value || ''; ui.setup.seed = document.getElementById('runSeed')?.value || ''; ui.setup.seedMut = document.getElementById('seedMut')?.value || '';
    run = G.newRun(meta, { species: ui.setup.species, name: ui.setup.name, seed: ui.setup.seed, seedMut: ui.setup.seedMut });
    ui.screen = 'run'; ui.cs = { step: 'action' }; ui.events = []; ui.modal = null;
  },
  buyseed: d => { if (buySeed(meta, d.id)) mutSound(); },
  node: d => { const r = G.enterNode(run, d.id); if (r.ok) { ui.cs = { step: 'action' }; ui.events = []; } },
  eat: d => { G.eat(run, d.id); sfx.heal(); }, feedskip: () => G.skipFeed(run),
  rest: d => { G.rest(run, d.id); sfx.heal(); },
  shrine: d => { G.shrineTake(run, +d.idx); mutSound(); }, shrineskip: () => G.shrineTake(run, null),
  event: d => { G.eventChoose(run, +d.idx); sfx.click(); },
  nodedone: () => { G.completeNode(run); },
  cstep: d => { ui.cs = { step: d.step }; },
  cmove: d => {
    const mv = listMoves(run.pet).find(m => m.id === d.id);
    if (!mv || mv.cdLeft > 0) return;
    if (mv.tgt === 'all' || mv.tgt === 'enemy' || mv.tgt === 'self') doCombat({ type: 'attack', move: mv.id, target: 'torso' });
    else ui.cs = { step: 'target', move: mv.id };
  },
  ctarget: d => { if (ui.cs.step !== 'target') return; doCombat({ type: 'attack', move: ui.cs.move, target: d.slotArg || d.slot }); },
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
  quit: () => { if (confirm('Abandon this run? The pet is lost (you still earn spores for progress).')) { G.abandon(run); } },
};

function handle(name, d, el) {
  if (!ACT[name]) return;
  if (name !== 'sound' && name !== 'ctarget') sfx.click();
  try { ACT[name](d, el); } catch (e) { console.error(e); ui.msg = String(e); }
  render();
}

export function init() {
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    e.preventDefault();
    handle(el.dataset.act, el.dataset, el);
  });
  document.addEventListener('mouseover', e => {
    const el = e.target.closest('[data-hl]');
    const sl = el ? el.dataset.hl : null;
    if (sl === ui.hl) return;
    document.querySelectorAll('.part.hl').forEach(n => n.classList.remove('hl'));
    ui.hl = sl;
    if (sl) document.querySelectorAll('svg.enemy .part[data-slot="' + sl + '"]').forEach(n => n.classList.add('hl'));
  });
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') { if (e.key === 'Enter' && ui.screen === 'setup') { e.preventDefault(); handle('start', {}, null); } return; }
    let k = e.key; if (k.length === 1) k = k.toLowerCase();
    const scope = modalEl.className === 'open' ? modalEl : app;
    let el = [...scope.querySelectorAll('[data-key]')].find(n => n.dataset.key === k && !n.disabled);
    if (!el && scope === modalEl && k === 'Escape') { ui.modal = null; render(); return; }
    if (el) { e.preventDefault(); el.click(); }
  });
  window.__feral = { get run() { return run; }, get meta() { return meta; }, ui, render, setRun: r => { run = r; ui.screen = 'run'; ui.cs = { step: 'action' }; ui.events = []; } }; // debug/test hook
  render();
}
