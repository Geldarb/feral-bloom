// A simple bot that plays the game through the logic API (used by simulations and tests).
import * as G from '../js/game.js';
import { listMoves, derive } from '../js/creature.js';
import { estimate } from '../js/combat.js';
import { nodeById } from '../js/map.js';
import { EVENTS } from '../js/events.js';
import { FOODS } from '../js/data/foods.js';
import { REST_OPTIONS } from '../js/game.js';

export function botCombatAct(run, rng) {
  const s = run.combat, P = s.p, E = s.e;
  const hpf = P.parts.torso.hp / P.parts.torso.max;
  if (hpf < 0.35 && run.inv.includes('salve')) return { type: 'item', item: 'salve' };
  const g = s.ground.findIndex(x => !x.gone);
  if (hpf < 0.5 && g >= 0 && rng.chance(0.6)) return { type: 'devour', idx: g };
  if (hpf < 0.25 && rng.chance(0.4)) return { type: 'defend' };
  if (run.inv.includes('whetstone') && rng.chance(0.3)) return { type: 'item', item: 'whetstone' };
  const sev = P.parts.thread; // unused
  if (run.inv.includes('thread')) { const lost = Object.values(P.parts).find(p => p.sev); if (lost) return { type: 'item', item: 'thread', target: lost.slot }; }
  const moves = listMoves(P).filter(m => m.cdLeft === 0);
  const alive = Object.keys(E.parts).filter(k => !E.parts[k].sev);
  let best = null;
  for (const mv of moves) {
    if (mv.tgt === 'self') continue;
    if (mv.tgt === 'all' || mv.tgt === 'enemy') { const sc = mv.tgt === 'all' ? mv.pow * 3 : 6; if (!best || sc > best.sc) best = { mv, slot: null, sc }; continue; }
    for (const sl of alive) {
      const e = estimate(s, 'p', mv, sl);
      let sc = e.hit / 100 * e.dmg * e.hits;
      if (e.kill) sc += 100; else if (e.sever) sc += 6;
      if (sl === 'torso' && E.parts.torso.hp / E.parts.torso.max < 0.35) sc *= 1.5;
      if (!best || sc > best.sc) best = { mv, slot: sl, sc };
    }
  }
  if (!best) return { type: 'defend' };
  return { type: 'attack', move: best.mv.id, target: best.slot || 'torso' };
}

export function botStep(run, rng) {
  if (run.replace) { const opt = rng.chance(0.5) ? rng.pick(run.replace.options) : null; G.resolveReplaceChoice(run, opt); return; }
  switch (run.phase) {
    case 'map': {
      const nodes = G.availableNodes(run).map(id => nodeById(run.map, id));
      const hpf = run.pet.parts.torso.hp / run.pet.parts.torso.max;
      const pref = hpf < 0.5 ? ['rest', 'feed', 'shrine', 'event', 'fight', 'boss', 'elite'] : ['shrine', 'feed', 'fight', 'elite', 'event', 'rest', 'boss'];
      nodes.sort((a, b) => pref.indexOf(a.type) - pref.indexOf(b.type));
      G.enterNode(run, nodes[0].id); return;
    }
    case 'combat': { const r = G.combatAct(run, botCombatAct(run, rng)); if (!r.ok) throw new Error('bad action ' + r.error); return; }
    case 'post': {
      const p = run.pending;
      p.absorb.forEach((a, i) => { if (!a.done) G.postAbsorb(run, i); });
      if (run.replace) return;
      p.choices.forEach((c, i) => { if (c.chosen === null) G.postRegrowChoice(run, i, 0); });
      if (p.reward && !p.reward.taken) G.postClaimReward(run, p.reward.type === 'elite' ? (rng.chance(0.5) ? 'ally' : 0) : undefined);
      if (run.replace) return;
      const r = G.postLeave(run); if (!r.ok) throw new Error(r.error); return;
    }
    case 'feed': { if (!run.pending.result) G.eat(run, rng.pick(run.pending.foods)); else G.completeNode(run); return; }
    case 'rest': { if (!run.pending.result) { const hpf = run.pet.parts.torso.hp / run.pet.parts.torso.max; G.rest(run, hpf < 0.6 ? 'sleep' : rng.pick(['groom', 'tend', 'groom'])); } else G.completeNode(run); return; }
    case 'shrine': { if (!run.pending.result) G.shrineTake(run, rng.chance(0.9) ? 0 : null); else G.completeNode(run); return; }
    case 'event': { if (!run.pending.result) { const ev = EVENTS.find(e => e.id === run.pending.eventId); G.eventChoose(run, rng.int(0, ev.choices.length - 1)); } else G.completeNode(run); return; }
    default: throw new Error('phase ' + run.phase);
  }
}

export function playRun(meta, opts, rng, maxSteps = 4000) {
  const run = G.newRun(meta, opts);
  let steps = 0;
  while (!run.over && steps++ < maxSteps) botStep(run, rng);
  if (!run.over) throw new Error('run did not end');
  return run;
}
