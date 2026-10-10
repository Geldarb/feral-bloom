// Deterministic logic tests for the core rules. Run: node tests/logic.mjs
import assert from 'assert';
import { RNG } from '../js/rng.js';
import * as G from '../js/game.js';
import { defaultMeta } from '../js/store.js';
import { MUTATIONS, MUTS, TAGS } from '../js/data/mutations.js';
import { ENEMIES, BOSSES } from '../js/data/enemies.js';
import { SYNERGIES } from '../js/data/synergies.js';
import { PET_SPECIES } from '../js/data/species.js';
import { makePet, makeEnemy, derive, place, canPlace, activeSynergies, listMoves, tagCounts } from '../js/creature.js';
import { startCombat, playerAct, estimate, finishCombat } from '../js/combat.js';
import { regrowLost } from '../js/mutation.js';
import { ENDINGS } from '../js/endings.js';
import { botStep } from './bot.mjs';
import { EVENTS } from '../js/events.js';
import { FOODS } from '../js/data/foods.js';

let n = 0; const ok = (name, fn) => { fn(); n++; console.log('  ok -', name); };
const meta = defaultMeta(); meta.species = Object.keys(PET_SPECIES); G.bindMeta(meta);

ok('data sizes', () => {
  assert(MUTATIONS.length >= 60, 'mutations ' + MUTATIONS.length);
  assert.strictEqual(Object.keys(ENEMIES).length, 15); assert.strictEqual(Object.keys(BOSSES).length, 4);
  for (const t of Object.keys(TAGS).filter(t => t !== 'legend')) assert(MUTATIONS.filter(m => m.tags.includes(t)).length >= 3, 'tag coverage ' + t);
  for (const m of MUTATIONS) { assert(m.name && m.slot && m.rarity && m.desc && m.tags.length, m.id); for (const c of m.conflicts) assert(MUTS[c], 'conflict target ' + c); }
  for (const e of Object.values(ENEMIES)) for (const [slot, def] of Object.entries(e.parts)) if (def[2]) assert(MUTS[def[2]], e.id + ' trait ' + def[2]);
  for (const e of [...Object.values(ENEMIES), ...Object.values(BOSSES)]) for (const mv of e.moves) assert(e.parts[mv.src], `${e.id} move ${mv.id} src ${mv.src}`);
  assert(SYNERGIES.length >= 14); assert(Object.keys(ENDINGS).length >= 8);
});

ok('part severing rules, eyes blind, devour, absorb', () => {
  const run = G.newRun(meta, { species: 'mossling', seed: 'T1' });
  const rng = new RNG(5);
  const e = makeEnemy(ENEMIES.bog_toad, { scale: 1, dmg: 1 });
  run.combat = startCombat(run, e, rng); run.phase = 'combat'; run.node = '0-0'; run.pos = '0-0';
  const s = run.combat;
  e.parts.eyes.hp = 1; // one hit severs
  let guard = 0;
  while (!e.parts.eyes.sev && guard++ < 40) { s.p.cd = {}; playerAct(s, rng, { type: 'attack', move: 'base_jaws', target: 'eyes' }); if (s.over) break; }
  assert(e.parts.eyes.sev, 'eyes severed');
  assert(s.ground.some(g => g.slot === 'eyes'), 'ground has eyes');
  assert(derive(e).acc <= -40, 'blind enemy accuracy drop');
  // jaws removal disables bite/spit
  e.parts.jaws.hp = 1; s.p.cd = {}; if (!s.over) { for (let i = 0; i < 30 && !e.parts.jaws.sev && !s.over; i++) { s.p.cd = {}; playerAct(s, rng, { type: 'attack', move: 'base_jaws', target: 'jaws' }); } }
  if (!s.over) assert(!listMoves(e).some(m => m.src === 'jaws'), 'no jaw moves after sever');
  if (!s.over) { const idx = s.ground.findIndex(g => !g.gone); s.p.parts.torso.hp = 5; const before = s.p.parts.torso.hp; playerAct(s, rng, { type: 'devour', idx }); assert(s.ground[idx].gone, 'devoured'); }
});

ok('mutations modify stats, synergies, conflicts', () => {
  const pet = makePet(PET_SPECIES.mossling);
  const tough = pet.parts.torso.max;
  place(pet, 'dense_marrow', 'torso'); assert(pet.parts.torso.max > tough, 'hp up');
  assert(!canPlace(pet, 'hollow_bones').ok, 'conflict blocks hollow_bones');
  for (const id of ['venom_fangs', 'toxic_glands', 'barbed_stinger']) { const r = canPlace(pet, id); assert(r.ok, id); place(pet, id, r.slot); }
  assert(activeSynergies(pet).some(s => s.tag === 'venom'), 'venom synergy');
  assert(derive(pet).auraSt.length > 0);
  pet.parts.jaws.sev = true; assert(!listMoves(pet).some(m => m.id === 'venom_fangs'), 'severed jaws disables mutation move');
  assert(derive(pet).acc === 0);
  const p2 = makePet(PET_SPECIES.mossling); place(p2, 'ember_glands', 'back'); place(p2, 'rime_maw', 'jaws');
  assert(derive(p2).hpPct < 0 || derive(p2).acc < 0, 'fire+frost penalty');
});

ok('regrow after fight creates mutation / respects slots', () => {
  const run = G.newRun(meta, { species: 'mossling', seed: 'T2' });
  run.pet.parts.jaws.sev = true; run.pet.parts.tail.sev = true;
  const out = regrowLost(run, ['jaws', 'tail'], new RNG(1));
  assert(out.results.length === 2); assert(!run.pet.parts.jaws.sev && !run.pet.parts.tail.sev);
  for (const p of Object.values(run.pet.parts)) for (const id of p.muts) assert(MUTS[id].slot === p.slot || MUTS[id].slot === 'extra');
});

ok('boss regrows severed parts on timer', () => {
  const run = G.newRun(meta, { species: 'mossling', seed: 'T3' });
  const rng = new RNG(9);
  const boss = makeEnemy(BOSSES.mother_mire, { scale: 1, dmg: 0.2 });
  run.combat = startCombat(run, boss, rng); run.phase = 'combat'; run.node = '3-0'; run.pos = '3-0';
  const s = run.combat; boss.parts.ext1.hp = 1;
  for (let i = 0; i < 6 && !boss.parts.ext1.sev; i++) { s.p.cd = {}; playerAct(s, rng, { type: 'attack', move: 'base_jaws', target: 'ext1' }); }
  assert(boss.parts.ext1.sev, 'ext1 severed');
  let rounds = 0; while (boss.parts.ext1.sev && rounds++ < 8 && !s.over) { s.p.parts.torso.hp = s.p.parts.torso.max; playerAct(s, rng, { type: 'defend' }); }
  assert(!boss.parts.ext1.sev, 'ext1 regrew after timer');
});

ok('feral pet ignores orders; low bond refuses to fight', () => {
  const run = G.newRun(meta, { species: 'mossling', seed: 'T4' }); run.bond = 5;
  const rng = new RNG(3);
  const e = makeEnemy(ENEMIES.bog_toad, { scale: 1, dmg: 0.1 });
  run.combat = startCombat(run, e, rng); run.phase = 'combat'; run.node = '0-0'; run.pos = '0-0';
  const s = run.combat; let g = 0;
  while (!s.over && g++ < 30) playerAct(s, rng, { type: 'defend' });
  assert.strictEqual(s.result, 'refused');
  const r2 = G.newRun(meta, { species: 'mossling', seed: 'T5' }); r2.bond = 20;
  const e2 = makeEnemy(ENEMIES.bog_toad, { scale: 1, dmg: 0.1 });
  r2.combat = startCombat(r2, e2, new RNG(4)); assert(r2.combat.p.feral > 0.5, 'feral computed');
  assert(derive(r2.combat.p).dmg > 15, 'feral = stronger');
});

ok('determinism: same seed => same map & same outcome', () => {
  const run = (seed) => { const m = defaultMeta(); m.species = meta.species; G.bindMeta(m); const r = G.newRun(m, { seed, species: 'mossling' }); const rg = new RNG(77); let i = 0; while (!r.over && i++ < 3000) botStep(r, rg); G.bindMeta(meta); return JSON.stringify([r.map.map(l => l.map(n => n.type)), r.depth, r.over.how, r.stats]); };
  assert.strictEqual(run('DET'), run('DET'));
  assert.notStrictEqual(run('DET'), run('DET2'));
});

ok('save / restore mid-combat roundtrip', () => {
  const run = G.newRun(meta, { species: 'gloomfin', seed: 'SAVE' }); const rg = new RNG(2);
  while (run.phase !== 'combat') botStep(run, rg);
  G.persist(run);
  const raw = JSON.parse(JSON.stringify(run)); const r2 = G.restoreRun(raw);
  assert(r2.combat.p === r2.pet, 'pet reference relinked');
  let i = 0; while (!r2.over && i++ < 3000) botStep(r2, rg);
  assert(r2.over, 'restored run finishes');
});

ok('all pet species, seed mutations and events/foods work', () => {
  for (const sp of Object.keys(PET_SPECIES)) { const m = defaultMeta(); m.species = meta.species; m.seeds = ['venom_fangs']; const r = G.newRun(m, { species: sp, seed: 'sp' + sp, seedMut: 'venom_fangs' }); assert(r.pet.parts.torso.max > 10, sp); }
  for (const ev of EVENTS) for (let ci = 0; ci < ev.choices.length; ci++) {
    const r = G.newRun(meta, { seed: 'ev' + ev.id }); r.phase = 'event'; r.pending = { type: 'event', eventId: ev.id, result: null }; r.node = '0-0';
    const t = G.eventChoose(r, ci); assert(typeof t === 'string' && t.length, ev.id + ci);
  }
  for (const f of Object.keys(FOODS)) { const r = G.newRun(meta, { seed: 'f' + f }); r.phase = 'feed'; r.pending = { type: 'feed', foods: [f], result: null }; assert(G.eat(r, f)); }
  const r = G.newRun(meta, { seed: 'diet' }); r.phase = 'feed';
  for (let i = 0; i < 3; i++) { r.pending = { type: 'feed', foods: ['fire_pepper'], result: null }; G.eat(r, 'fire_pepper'); }
  assert(r.stats.mutations >= 1, 'diet-driven spontaneous mutation (6 fire points)');
});

ok('at least 3+ distinct endings reachable', () => {
  const seen = new Set();
  const m = defaultMeta(); m.species = meta.species; G.bindMeta(m);
  const rg = new RNG(1234);
  for (let i = 0; i < 400 && seen.size < 4; i++) { const r = G.newRun(m, { seed: 'E' + i, species: Object.keys(PET_SPECIES)[i % 5] }); let k = 0; while (!r.over && k++ < 3000) botStep(r, rg); if (r.over.won) seen.add(r.over.ending.id); }
  G.bindMeta(meta);
  console.log('    endings seen:', [...seen].join(', ')); assert(seen.size >= 3);
});
console.log(`\n${n} logic test groups passed`);
