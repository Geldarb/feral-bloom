// Mutation engine: what the pet can become, driven by diet, biome, injuries, bond.
import { MUTATIONS, MUTS, RARITY_WEIGHT } from './data/mutations.js';
import { BIOMES } from './data/enemies.js';
import { canPlace, place, tagCounts, hasMut, extCount, refresh, removeMut } from './creature.js';

const INJ_TAG = { fire: ['fire', 'armor'], frost: ['frost'], venom: ['venom', 'regen'], bleed: ['regen'], blunt: ['bone', 'armor'], pierce: ['armor'], slash: ['armor', 'bone'], sonic: ['sonic'], psychic: ['psychic'], shock: ['aquatic'], rot: ['regen'] };

export function feralness(run) { return Math.max(0, Math.min(1, (50 - run.bond) / 50)); }

export function affinity(run, m, opts = {}) {
  const biome = BIOMES[run.biomeId] || BIOMES.swamp;
  let w = RARITY_WEIGHT[m.rarity] || 0;
  if (opts.rarityBoost && m.rarity !== 'common') w *= opts.rarityBoost;
  const have = tagCounts(run.pet);
  let mult = 1;
  for (const tag of m.tags) {
    if (tag === 'legend') continue;
    mult *= 1 + (run.diet[tag] || 0) * 0.35;
    mult *= biome.bias[tag] ?? 0.8;
    let inj = 0;
    for (const [type, tags] of Object.entries(INJ_TAG)) if (tags.includes(tag)) inj += (run.injuries[type] || 0) * 0.04;
    mult *= 1 + Math.min(inj, 1);
    mult *= 1 + 0.2 * (have[tag] || 0);
    if (tag === 'cursed') mult *= 0.25 + feralness(run) * 3;
  }
  if (opts.memory && opts.memory.includes(m.id)) mult *= 3;
  return w * mult;
}

// Mutation candidates. mode 'fit' = must fit a free socket; 'offer' = may require replacing something.
export function candidates(run, rng, { slot = null, tag = null, count = 3, mode = 'offer', rarityBoost = 1, memory = null, exclude = [] } = {}) {
  const pet = run.pet;
  const pool = MUTATIONS.filter(m => {
    if (m.rarity === 'legendary' || exclude.includes(m.id) || hasMut(pet, m.id)) return false;
    if (slot && m.slot !== slot) return false;
    if (tag && !m.tags.includes(tag)) return false;
    const r = canPlace(pet, m.id);
    if (mode === 'fit') return r.ok;
    return r.ok || r.reason === 'full' || r.reason === 'conflict';
  });
  return rng.sample(pool, count, m => affinity(run, m, { rarityBoost, memory })).map(m => m.id);
}

// Add a mutation; returns {status:'placed'|'replace'|'blocked'|'dupe'}
export function acquire(run, id, how = 'gained') {
  const pet = run.pet;
  if (hasMut(pet, id)) return { status: 'dupe' };
  const r = canPlace(pet, id);
  if (r.ok) {
    place(pet, id, r.slot);
    run.stats.mutations++;
    if (!run.seen.includes(id)) run.seen.push(id);
    note(run, `${pet.name} ${how}: ${MUTS[id].name}.`, 'mut');
    return { status: 'placed', slot: r.slot };
  }
  const options = replaceOptionsFor(run, id);
  if (!options.length) return { status: 'blocked', reason: r.reason };
  run.replace = { id, options, how };
  return { status: 'replace' };
}
import { replaceOptions } from './creature.js';
function replaceOptionsFor(run, id) { return replaceOptions(run.pet, id); }

export function resolveReplace(run, optId) {
  const rp = run.replace; run.replace = null;
  if (!rp || !optId) return { status: 'discarded' };
  removeMut(run.pet, optId);
  const r = canPlace(run.pet, rp.id);
  if (!r.ok) return { status: 'blocked' };
  place(run.pet, rp.id, r.slot);
  run.stats.mutations++;
  if (!run.seen.includes(rp.id)) run.seen.push(rp.id);
  note(run, `${run.pet.name} replaced ${MUTS[optId].name} with ${MUTS[rp.id].name}.`, 'mut');
  return { status: 'placed' };
}

export function note(run, text, cls = '') { run.notes.push({ m: text, c: cls }); if (run.notes.length > 60) run.notes.shift(); }

// After a fight: regrow lost parts, maybe with new mutations.
export function regrowLost(run, lost, rng) {
  const pet = run.pet; const results = []; const choices = [];
  for (const slot of lost) {
    const p = pet.parts[slot];
    if (!p) continue;
    const old = p.muts.slice();
    if (slot.startsWith('ext')) {
      // an extra limb is gone for good, but the body may sprout something new in its place
      delete pet.parts[slot]; refresh(pet);
      const oldId = old[0];
      const res = { slot, label: p.label, old, now: [], text: `${p.label} withered away.` };
      if (rng.chance(0.5 + 0.2 * feralness(run))) {
        const c = candidates(run, rng, { slot: 'extra', count: 1, mode: 'fit', memory: old });
        if (c.length) { const a = acquire(run, c[0], 'sprouted'); if (a.status === 'placed') { res.now.push(c[0]); res.text = `${p.label} withered, and ${MUTS[c[0]].name} sprouted in its place.`; } }
      }
      results.push(res);
      continue;
    }
    p.sev = false; p.muts = []; p.hp = p.max; p.regrowIn = null;
    refresh(pet);
    const res = { slot, label: p.label, old, now: [], text: '' };
    const rolls = Math.max(1, old.length);
    const base = 0.7 + 0.15 * feralness(run);
    for (let i = 0; i < rolls; i++) {
      if (!rng.chance(base)) continue;
      const bondHigh = run.bond >= 70;
      const opts = candidates(run, rng, { slot, count: bondHigh ? 2 : 1, mode: 'fit', memory: old });
      if (!opts.length) continue;
      if (bondHigh) choices.push({ slot, label: p.label, options: opts, chosen: null });
      else { const a = acquire(run, opts[0], 'regrew'); if (a.status === 'placed') res.now.push(opts[0]); }
    }
    res.text = res.now.length ? `${p.label} regrew as ${res.now.map(i => MUTS[i].name).join(' + ')}.` : choices.some(c => c.slot === slot) ? `${p.label} regrows... your bond lets you guide it.` : `${p.label} regrew plain${old.length ? ` (lost ${old.map(i => MUTS[i].name).join(', ')})` : ''}.`;
    results.push(res);
  }
  return { results, choices };
}

export function checkAdaptations(run) {
  const msgs = [];
  for (const [type, n] of Object.entries(run.injuries)) {
    const lvl = n >= 16 ? 2 : n >= 7 ? 1 : 0;
    const cur = run.pet.adapt[type] || 0;
    if (lvl > cur) {
      run.pet.adapt[type] = lvl;
      run.pet.aggr = Math.min(4, (run.pet.aggr || 0) + 1);
      msgs.push(`Scars heal into an adaptation: +${lvl * 20}% resistance to ${type}, but ${run.pet.name} grows more aggressive.`);
    }
  }
  msgs.forEach(m => note(run, m, 'adapt'));
  return msgs;
}

// Diet pressure triggers spontaneous mutation.
export function checkSpontaneous(run, rng) {
  const msgs = [];
  for (const [tag, n] of Object.entries(run.diet)) {
    const lvl = run.spont[tag] || 0;
    if (n >= 4 * (lvl + 1)) {
      run.spont[tag] = lvl + 1;
      const c = candidates(run, rng, { tag, count: 1, mode: 'fit' });
      if (c.length) {
        const a = acquire(run, c[0], 'mutated from its diet');
        if (a.status === 'placed') msgs.push(`Your diet of ${tag} pushes ${run.pet.name} to mutate: ${MUTS[c[0]].name}!`);
      }
    }
  }
  return msgs;
}
