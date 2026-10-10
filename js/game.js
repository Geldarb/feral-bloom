// Run controller: all game flow lives here (no DOM), so it can be driven by the UI or by headless tests.
import { RNG } from './rng.js';
import { PET_SPECIES } from './data/species.js';
import { ENEMIES, BOSSES, BIOMES, BIOME_ORDER, ELITE_TRAITS, ALLY_HABITS } from './data/enemies.js';
import { MUTS, HABITS } from './data/mutations.js';
import { FOODS, FOOD_IDS } from './data/foods.js';
import { ITEMS, ITEM_IDS, INV_MAX } from './data/items.js';
import { makePet, makeEnemy, makeHeart, canPlace, place, refresh, derive, tagCounts } from './creature.js';
import { generateMap, nodeById, FINAL_LAYER, NODE_INFO } from './map.js';
import { startCombat, playerAct, finishCombat } from './combat.js';
import { acquire, resolveReplace, candidates, regrowLost, checkAdaptations, checkSpontaneous, note } from './mutation.js';
import { EVENTS } from './events.js';
import { pickEnding, ENDINGS } from './endings.js';
import { saveRun, clearRun, saveMeta, checkUnlocks } from './store.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function attachRng(run) {
  Object.defineProperty(run, 'rng', { value: new RNG(run.rngS), enumerable: false, writable: true });
  return run;
}
export function restoreRun(raw) {
  const run = attachRng(raw);
  if (run.combat) { run.combat.p = run.pet; run.combat.inv = run.inv; }
  return run;
}
export function persist(run) { run.rngS = run.rng.s; if (!run.over) saveRun(run); }

export function newRun(meta, opts = {}) {
  const seed = (opts.seed && String(opts.seed).trim()) || Math.random().toString(36).slice(2, 8).toUpperCase();
  const sp = PET_SPECIES[opts.species && meta.species.includes(opts.species) ? opts.species : 'mossling'];
  const pet = makePet(sp, (opts.name || '').trim().slice(0, 16) || sp.name);
  const run = attachRng({
    v: 1, seed, rngS: new RNG('run:' + seed).s, speciesId: sp.id, pet, map: generateMap(new RNG('map:' + seed)), pos: null, cleared: [], depth: 0,
    biomeId: 'swamp', inv: ['salve'], bond: 60, abuse: 0, diet: {}, spont: {}, injuries: {}, phase: 'map', node: null, pending: null, combat: null, replace: null,
    stats: { kills: 0, severs: 0, lost: 0, devoured: 0, absorbed: 0, mutations: 0, turns: 0, bosses: 0, fights: 0, refusals: 0, maxBiome: 0 },
    seen: [], notes: [], over: null, lastLog: [],
  });
  for (const id of sp.start) { const r = canPlace(pet, id); if (r.ok) { place(pet, id, r.slot); run.seen.push(id); } }
  if (opts.seedMut && meta.seeds.includes(opts.seedMut) && MUTS[opts.seedMut]) {
    const r = canPlace(pet, opts.seedMut);
    if (r.ok) { place(pet, opts.seedMut, r.slot); run.seen.push(opts.seedMut); note(run, `${pet.name} was born with a seed: ${MUTS[opts.seedMut].name}.`, 'mut'); }
  }
  for (const p of Object.values(pet.parts)) p.hp = p.max;
  note(run, `${pet.name} the ${sp.name} wakes at the edge of the Drowned Bog.`, 'sys');
  persist(run);
  return run;
}

export function availableNodes(run) {
  if (run.phase !== 'map') return [];
  if (!run.pos) return run.map[0].map(n => n.id);
  return nodeById(run.map, run.pos).next;
}

function enemyScale(run, node, kind) {
  const d = run.depth;
  if (kind === 'boss') return { scale: 0.95 + 0.035 * d, dmg: 0.66 + 0.034 * d };
  if (kind === 'elite') return { scale: 0.95 + 0.05 * d, dmg: 0.74 + 0.034 * d };
  return { scale: 0.8 + 0.055 * d, dmg: 0.66 + 0.032 * d };
}

export function createEncounter(run, node, rng = run.rng) {
  if (node.type === 'boss') {
    const { scale, dmg } = enemyScale(run, node, 'boss');
    if (node.layer === FINAL_LAYER) { const e = makeHeart(BOSSES.heart_of_bloom, run.pet, scale); e.atk = dmg; return e; }
    return makeEnemy(BOSSES[BIOMES[node.biome].boss], { scale, dmg });
  }
  const b = BIOMES[node.biome];
  const tpl = ENEMIES[rng.pick(b.enemies)];
  const elite = node.type === 'elite';
  const { scale, dmg } = enemyScale(run, node, elite ? 'elite' : 'fight');
  return makeEnemy(tpl, { scale, dmg: dmg + (elite ? 0.1 : 0), elite: elite ? rng.pick(ELITE_TRAITS) : null });
}

export function enterNode(run, id) {
  if (!availableNodes(run).includes(id)) return { ok: false, error: 'Not reachable' };
  const node = nodeById(run.map, id);
  run.pos = id; run.node = id; run.biomeId = node.biome;
  run.stats.maxBiome = Math.max(run.stats.maxBiome, BIOME_ORDER.indexOf(node.biome));
  const rng = run.rng;
  if (node.type === 'fight' || node.type === 'elite' || node.type === 'boss') {
    const enemy = createEncounter(run, node);
    run.combat = startCombat(run, enemy, rng);
    run.phase = 'combat'; run.pending = null;
  } else if (node.type === 'feed') {
    const pool = FOOD_IDS.filter(f => FOODS[f].biomes.includes(node.biome));
    run.pending = { type: 'feed', foods: rng.sample(pool, 4), result: null };
    run.phase = 'feed';
  } else if (node.type === 'rest') {
    run.pending = { type: 'rest', result: null }; run.phase = 'rest';
  } else if (node.type === 'shrine') {
    run.pending = { type: 'shrine', offers: candidates(run, rng, { count: 3, mode: 'offer', rarityBoost: 1.7 }), result: null };
    for (const id of run.pending.offers) if (!run.seen.includes(id)) run.seen.push(id);
    run.phase = 'shrine';
  } else if (node.type === 'event') {
    run.pending = { type: 'event', eventId: rng.pick(EVENTS).id, result: null }; run.phase = 'event';
  }
  persist(run);
  return { ok: true, node };
}

export function completeNode(run) {
  run.cleared.push(run.node);
  run.depth++;
  run.phase = 'map'; run.pending = null; run.combat = null;
  persist(run);
}

// ------------ feeding / rest / shrine / event ------------
export function eat(run, foodId) {
  const f = FOODS[foodId]; const rng = run.rng;
  if (run.phase !== 'feed' || run.pending.result) return null;
  for (const [t, n] of Object.entries(f.tags)) run.diet[t] = (run.diet[t] || 0) + n;
  const t = run.pet.parts.torso;
  const h = Math.min(t.max - t.hp, Math.round(t.max * f.heal));
  t.hp += h;
  run.bond = clamp(run.bond + f.bond, 0, 100);
  const msgs = [`${run.pet.name} gobbles the ${f.name}${h ? ` (+${h} HP)` : ''}${f.bond ? ` (${f.bond > 0 ? '+' : ''}${f.bond} bond)` : ''}.`];
  msgs.push(...checkSpontaneous(run, rng));
  run.pending.result = msgs.join(' ');
  note(run, run.pending.result, 'feed');
  persist(run);
  return run.pending.result;
}
export function skipFeed(run) { run.pending.result = 'You move on without feeding.'; persist(run); }

export const REST_OPTIONS = [
  { id: 'groom', name: 'Groom & Play', desc: '+12 bond, heal 20% HP.' },
  { id: 'sleep', name: 'Sleep by the Fire', desc: 'Heal 50% HP, +3 bond.' },
  { id: 'tend', name: 'Tend Old Scars', desc: '+6 bond, heal 20%, calms aggression by 1.' },
  { id: 'train', name: 'Drive Hard Training', desc: '+5% damage, -10 bond, counts as abuse.' },
];
export function rest(run, id) {
  if (run.phase !== 'rest' || run.pending.result) return null;
  const pet = run.pet;
  let txt = '';
  if (id === 'groom') { run.bond = clamp(run.bond + 12, 0, 100); heal(run, 0.2); txt = `${pet.name} rolls in the moss, delighted. (+12 bond)`; }
  if (id === 'sleep') { heal(run, 0.5); run.bond = clamp(run.bond + 3, 0, 100); txt = `${pet.name} sleeps deeply.`; }
  if (id === 'tend') { run.bond = clamp(run.bond + 6, 0, 100); heal(run, 0.2); pet.aggr = Math.max(0, (pet.aggr || 0) - 1); txt = `You clean and soothe ${pet.name}'s scars. It calms.`; }
  if (id === 'train') { run.bond = clamp(run.bond - 10, 0, 100); run.abuse++; pet.extraMods.push({ dmg: 5 }); txt = `${pet.name} obeys, trembling. It hits harder now. (-10 bond)`; }
  run.pending.result = txt; note(run, txt, 'care'); persist(run);
  return txt;
}
function heal(run, frac) { const t = run.pet.parts.torso; t.hp = Math.min(t.max, t.hp + Math.round(t.max * frac)); }

export function shrineTake(run, idx) {
  if (run.phase !== 'shrine' || run.pending.result) return null;
  if (idx === null) { run.bond = clamp(run.bond + 3, 0, 100); run.pending.result = 'You leave an offering and take nothing. Your pet feels respected. (+3 bond)'; persist(run); return run.pending.result; }
  const id = run.pending.offers[idx];
  const a = acquire(run, id, 'accepted the shrine\u2019s gift');
  if (a.status === 'placed') run.pending.result = `${run.pet.name} gains ${MUTS[id].name}!`;
  else if (a.status === 'replace') run.pending.result = `Something must give way for ${MUTS[id].name}...`;
  else run.pending.result = 'There is no room for it. The shrine goes dark.';
  persist(run);
  return run.pending.result;
}

const eventApi = {
  bond: (r, n) => { r.bond = clamp(r.bond + n, 0, 100); },
  abuse: (r, n) => { r.abuse += n; },
  heal: (r, f) => heal(r, f),
  hurt: (r, n) => { const t = r.pet.parts.torso; t.hp = Math.max(1, t.hp - n); },
  diet: (r, tags) => { for (const [k, v] of Object.entries(tags)) r.diet[k] = (r.diet[k] || 0) + v; },
  addItem: (r, id) => { if (r.inv.length < INV_MAX) { r.inv.push(id); return true; } return false; },
  item: (r, rng) => { const id = rng.pick(ITEM_IDS); return eventApi.addItem(r, id) ? ITEMS[id].name : null; },
  habit: (r, rng) => {
    const pool = Object.keys(HABITS).filter(h => !r.pet.habits.includes(h));
    if (!pool.length || r.pet.habits.length >= 3) return null;
    const h = rng.pick(pool); r.pet.habits.push(h); refresh(r.pet); return HABITS[h].name;
  },
  mutate: (r, rng, o = {}) => {
    const c = candidates(r, rng, { ...o, count: 1, mode: 'fit' });
    if (!c.length) return null;
    const a = acquire(r, c[0], 'mutated');
    return a.status === 'placed' ? `${r.pet.name} mutates: ${MUTS[c[0]].name}!` : null;
  },
  boost: (r, mods) => { r.pet.extraMods.push(mods); refresh(r.pet); },
};
export function eventChoose(run, idx) {
  if (run.phase !== 'event' || run.pending.result) return null;
  const ev = EVENTS.find(e => e.id === run.pending.eventId);
  const txt = ev.choices[idx].fn(run, run.rng, eventApi);
  run.pending.result = txt; note(run, txt, 'event'); persist(run);
  return txt;
}

// ------------ combat ------------
export function combatAct(run, act) {
  if (run.phase !== 'combat') return { ok: false, error: 'not in combat' };
  const s = run.combat;
  const r = playerAct(s, run.rng, act);
  if (!r.ok) return r;
  if (s.over) onCombatEnd(run);
  else persist(run);
  return r;
}

function onCombatEnd(run) {
  const s = run.combat;
  const node = nodeById(run.map, run.node);
  const fin = finishCombat(s);
  run.stats.turns += s.stats.turns; run.stats.fights++;
  run.stats.severs += s.stats.severs;
  run.stats.lost += s.stats.lost.length;
  run.stats.devoured += s.stats.devoured.length;
  for (const [t, n] of Object.entries(s.stats.injuries)) run.injuries[t] = (run.injuries[t] || 0) + n;
  run.lastLog = s.log.slice(-14);
  if (s.result === 'refused') { run.stats.refusals++; return endRun(run, 'refused', s.e.name); }
  if (s.result === 'loss') return endRun(run, 'death', s.e.name);
  // victory
  const pet = run.pet; const rng = run.rng;
  run.stats.kills++;
  if (node.type === 'boss') run.stats.bosses++;
  for (const tr of s.stats.devoured) if (tr && MUTS[tr]) for (const g of MUTS[tr].tags) if (g !== 'legend') run.diet[g] = (run.diet[g] || 0) + 1;
  const D = derive(pet);
  const drift = 2 + Math.floor(run.abuse / 2) + D.bondDrain + Math.max(0, -s.stats.bondDelta);
  run.bond = clamp(run.bond - drift, 0, 100);
  const t = pet.parts.torso; t.hp = Math.min(t.max, t.hp + Math.round(t.max * (node.type === 'boss' ? 0.4 : 0.22)));
  const adapt = checkAdaptations(run);
  const rg = regrowLost(run, s.stats.lost, rng);
  for (const g of fin.ground) if (g.trait && !run.seen.includes(g.trait)) run.seen.push(g.trait);
  const enemy = s.e;
  const pending = {
    type: 'post', enemy: { name: enemy.name, id: enemy.id, boss: enemy.boss, elite: enemy.elite, reward: enemy.reward, desc: enemy.desc },
    absorb: fin.ground.filter(g => g.trait && MUTS[g.trait]).map(g => ({ ...g, done: false })),
    regrow: rg.results, choices: rg.choices, adapt, bondDrift: drift, reward: null, items: [],
  };
  if (node.type === 'boss' && node.layer !== FINAL_LAYER) pending.reward = { type: 'trophy', id: enemy.reward, taken: false };
  else if (node.type === 'elite') {
    pending.reward = { type: 'elite', habit: ALLY_HABITS[enemy.id], essence: candidates(run, rng, { count: 3, mode: 'offer', rarityBoost: 2 }), taken: false };
    for (const id of pending.reward.essence) if (!run.seen.includes(id)) run.seen.push(id);
  }
  const nItems = node.type === 'boss' ? 2 : node.type === 'elite' ? 1 : rng.chance(0.35) ? 1 : 0;
  for (let i = 0; i < nItems; i++) { const id = rng.pick(ITEM_IDS); if (eventApi.addItem(run, id)) pending.items.push(id); }
  run.pending = pending; run.phase = 'post';
  persist(run);
}

export function postAbsorb(run, i) {
  const a = run.pending.absorb[i];
  if (!a || a.done || run.phase !== 'post') return null;
  a.done = true;
  const r = acquire(run, a.trait, 'absorbed the ' + a.from + '\u2019s ' + a.label.toLowerCase());
  if (r.status === 'placed') { run.stats.absorbed++; run.bond = clamp(run.bond - 1, 0, 100); a.result = `Absorbed: ${MUTS[a.trait].name}.`; }
  else if (r.status === 'replace') a.result = 'Choose what to replace...';
  else if (r.status === 'dupe') a.result = 'Your pet already has this trait.';
  else a.result = 'No room for it.';
  persist(run); return a.result;
}
export function postRegrowChoice(run, ci, optIdx) {
  const c = run.pending.choices[ci];
  if (!c || c.chosen !== null) return null;
  c.chosen = optIdx;
  if (optIdx >= 0) { const r = acquire(run, c.options[optIdx], 'guided its regrowth'); c.result = r.status === 'placed' ? `${c.label} regrew as ${MUTS[c.options[optIdx]].name}.` : 'It could not take.'; }
  else c.result = `${c.label} regrew plain.`;
  persist(run); return c.result;
}
export function postClaimReward(run, choice) {
  const rw = run.pending.reward;
  if (!rw || rw.taken) return null;
  rw.taken = true;
  let txt = '';
  if (rw.type === 'trophy') { const r = acquire(run, rw.id, 'claimed the trophy'); txt = r.status === 'placed' ? `${MUTS[rw.id].name} fuses to your pet!` : r.status === 'replace' ? 'Choose what to replace...' : 'No room for the trophy.'; }
  else if (rw.type === 'elite') {
    if (choice === 'ally') {
      const h = rw.habit; if (run.pet.habits.length < 3 && !run.pet.habits.includes(h)) { run.pet.habits.push(h); refresh(run.pet); run.bond = clamp(run.bond + 6, 0, 100); txt = `You spare it. It bonds with your pet: ${HABITS[h].name}. (+6 bond)`; }
      else txt = 'Your pet has no more room for allies.';
    } else if (typeof choice === 'number') { const id = rw.essence[choice]; const r = acquire(run, id, 'took the alpha\u2019s essence'); txt = r.status === 'placed' ? `${MUTS[id].name} is yours.` : r.status === 'replace' ? 'Choose what to replace...' : 'No room for it.'; }
    else txt = 'You leave the alpha\u2019s remains.';
  }
  rw.result = txt;
  persist(run); return txt;
}
export function postLeave(run) {
  if (run.phase !== 'post' || run.replace) return { ok: false, error: 'Resolve pending choices first' };
  if (run.pending.choices.some(c => c.chosen === null)) return { ok: false, error: 'Guide your pet\u2019s regrowth first' };
  const node = nodeById(run.map, run.node);
  if (node.layer === FINAL_LAYER) { run.cleared.push(run.node); run.depth++; endRun(run, 'victory'); return { ok: true, ended: true }; }
  completeNode(run);
  return { ok: true };
}
export function resolveReplaceChoice(run, optId) {
  const r = resolveReplace(run, optId);
  persist(run); return r;
}

// ------------ end of run ------------
export function scoreRun(run, won) {
  const s = run.stats;
  return run.depth * 10 + s.kills * 5 + s.severs * 2 + s.bosses * 50 + (won ? 300 : 0) + s.mutations * 3;
}
let _meta = null;
export function bindMeta(m) { _meta = m; }
export function abandon(run) { return endRun(run, 'quit'); }
export function endRun(run, how, cause = '', meta = null) {
  meta = meta || _meta;
  const won = how === 'victory';
  const ending = how === 'victory' ? pickEnding(run) : how === 'refused' ? ENDINGS.strike : how === 'quit' ? ENDINGS.quit : ENDINGS.death;
  const s = run.stats;
  const spores = run.depth * 2 + s.bosses * 12 + s.kills + Math.floor(s.severs / 2) + (won ? 40 : 0);
  run.over = { how, cause, won, ending, score: scoreRun(run, won), spores, unlocked: [], tags: tagCounts(run.pet), newSpecies: [] };
  run.phase = 'over'; run.combat = null; run.pending = null;
  clearRun();
  if (meta) commitMeta(run, meta);
  return run.over;
}
export function commitMeta(run, meta) {
  if (run.committed) return;
  run.committed = true;
  const o = run.over; const s = run.stats; const m = meta.stats;
  m.runs++; if (o.won) m.wins++; if (o.how === 'death' || o.how === 'refused') m.deaths++;
  m.kills += s.kills; m.severs += s.severs; m.bosses += s.bosses;
  m.bestDepth = Math.max(m.bestDepth, run.depth); m.maxBiome = Math.max(m.maxBiome, s.maxBiome);
  meta.spores += o.spores;
  if (o.score > m.bestScore) { m.bestScore = o.score; meta.bestRun = { score: o.score, name: run.pet.name, species: run.speciesId, depth: run.depth, ending: o.ending.title, seed: run.seed }; }
  if (!meta.endings.includes(o.ending.id) && (o.won || o.how === 'refused')) meta.endings.push(o.ending.id);
  for (const id of run.seen) if (!meta.discovered.includes(id)) meta.discovered.push(id);
  if (o.won && !meta.seeds.includes('bloom_heart')) { meta.seeds.push('bloom_heart'); o.unlocked.push('Bloom Heart seed'); }
  const ns = checkUnlocks(meta);
  o.newSpecies = ns;
  saveMeta(meta);
}

export function petSummary(run) {
  const pet = run.pet;
  return { tags: tagCounts(pet), d: derive(pet) };
}
export { NODE_INFO };
