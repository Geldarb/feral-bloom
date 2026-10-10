// Turn-based, part-targeted combat. Pure logic (no DOM). All state is plain JSON.
import { MUTS } from './data/mutations.js';
import { derive, listMoves, PART_ACC, TYPE_PART_MULT, IGNORE_ARMOR, SLOT_LABEL, refresh } from './creature.js';
import { ITEMS } from './data/items.js';

const MELEE = new Set(['slash', 'pierce', 'blunt']);
const opp = side => (side === 'p' ? 'e' : 'p');
const STATUS_RES = { venom: 'venom', burn: 'fire', chill: 'frost', bleed: 'bleed', rot: 'rot' };
const STRUGGLE = { id: 'struggle', name: 'Flail', src: 'torso', type: 'blunt', pow: 3, cd: 0 };
export const REFUSE_BOND = 15;

export function startCombat(run, enemy, rng) {
  const pet = run.pet;
  pet.st = {}; pet.cd = {}; pet.tmp = {}; pet.biome = run.biomeId;
  const bond = run.bond;
  pet.feral = Math.max(0, Math.min(1, (50 - bond) / 50));
  enemy.st = {}; enemy.cd = {}; enemy.tmp = {};
  const s = {
    turn: 1, p: pet, e: enemy, ground: [], log: [], ev: [], over: false, result: null, refusals: 0, bond, inv: run.inv,
    stats: { severs: 0, lost: [], injuries: {}, devoured: [], dealt: 0, taken: 0, bondDelta: 0, kills: 0, turns: 0 },
  };
  log(s, `${enemy.name} appears! ${enemy.desc ? '' : ''}`.trim(), 'sys');
  refresh(pet); refresh(enemy);
  return s;
}

function log(s, m, c = '') { s.log.push({ t: s.turn, m, c }); if (s.log.length > 400) s.log.shift(); }
const cname = (s, side) => (side === 'p' ? s.p.name : s.e.name);
const plabel = (c, slot) => (c.parts[slot] ? c.parts[slot].label : SLOT_LABEL[slot] || slot);

// ---------- estimates ----------
export function torsoGuard(def, D) {
  let g = 0;
  if (def.guard && def.guard.by.some(sl => def.parts[sl] && !def.parts[sl].sev)) g = def.guard.mult;
  if (D.guard && (!def.parts.back || !def.parts.back.sev)) g += D.guard;
  return Math.min(0.7, g);
}
export function hitChance(s, side, mv, slot) {
  const A = derive(s[side]), D = derive(s[opp(side)]);
  const ch = 82 + A.acc - D.enemyAcc + (mv.acc || 0) - D.dodge + (slot ? PART_ACC[slot] || 0 : 0);
  return Math.max(8, Math.min(97, Math.round(ch)));
}
// damage of a single hit (without crit / variance)
export function rawDamage(s, side, mv, slot) {
  const att = s[side], def = s[opp(side)];
  const A = derive(att), D = derive(def);
  const part = def.parts[slot];
  if (!part || mv.pow <= 0) return 0;
  let pow = mv.pow * att.atk * (1 + Math.max(-0.5, A.dmg / 100));
  if (att.tmp && att.tmp.whet) pow *= 1.6;
  if (mv.tgt === 'all') pow *= slot === 'torso' ? 0.5 : 0.4;
  pow *= (TYPE_PART_MULT[mv.type] && TYPE_PART_MULT[mv.type][slot]) || 1;
  pow *= 1 - (D.res[mv.type] || 0);
  if (slot === 'torso') pow *= 1 - torsoGuard(def, D);
  if (def.tmp && def.tmp.brace) pow *= 0.5;
  if (slot !== 'torso') { pow += mv.sever || 0; if (part.hp / part.max <= 0.4) pow += A.severBonus; }
  const arm = Math.max(0, part.arm - D.rot) * (1 - (IGNORE_ARMOR[mv.type] ?? 0));
  return Math.max(1, Math.round(pow - arm));
}
export function estimate(s, side, mv, slot) {
  const hits = mv.hits || 1;
  const dmg = mv.tgt === 'all' || mv.tgt === 'enemy' || mv.tgt === 'self' ? 0 : rawDamage(s, side, mv, slot);
  const part = s[opp(side)].parts[slot];
  return { hit: hitChance(s, side, mv, slot), dmg, hits, sever: !!part && slot !== 'torso' && dmg * hits >= part.hp, kill: !!part && slot === 'torso' && dmg * hits >= part.hp };
}

// ---------- damage application ----------
function ev(s, side, slot, k, n) { s.ev.push({ side, slot, k, n }); }

function damagePart(s, side, slot, dmg, o = {}) {
  const c = s[side];
  let p = c.parts[slot];
  if (!p || p.sev) { p = c.parts.torso; slot = 'torso'; }
  dmg = Math.max(0, Math.round(dmg));
  if (dmg <= 0 || s.over) return 0;
  if (o.nonlethal && slot === 'torso') dmg = Math.min(dmg, Math.max(0, p.hp - 1));
  if (dmg <= 0) return 0;
  p.hp -= dmg;
  ev(s, side, slot, o.crit ? 'crit' : 'hit', dmg);
  if (side === 'p') { s.stats.taken += dmg; if (o.type) s.stats.injuries[o.type] = (s.stats.injuries[o.type] || 0) + 1; } else s.stats.dealt += dmg;
  if (slot === 'torso') {
    if (p.hp <= 0) kill(s, side);
  } else if (p.hp <= 0) {
    severPart(s, side, slot);
    if (o.spill !== false) damagePart(s, side, 'torso', Math.max(1, Math.floor(dmg * 0.2)), { spill: false });
  } else if (o.spill !== false) {
    const sp = Math.floor(dmg * 0.2);
    if (sp > 0) damagePart(s, side, 'torso', sp, { spill: false });
  }
  return dmg;
}

function kill(s, side) {
  const c = s[side]; const D = derive(c);
  if (D.phoenix && !c.tmp.phoenixUsed) {
    c.tmp.phoenixUsed = 1;
    c.parts.torso.hp = Math.max(1, Math.ceil(c.parts.torso.max * 0.35));
    log(s, `${c.name} refuses to die and surges back to life!`, 'good');
    ev(s, side, 'torso', 'heal', c.parts.torso.hp);
    return;
  }
  c.parts.torso.hp = 0;
  s.over = true; s.result = side === 'e' ? 'win' : 'loss';
  if (side === 'e') s.stats.kills = 1;
  log(s, side === 'e' ? `${c.name} collapses. Victory!` : `${c.name} falls...`, side === 'e' ? 'good' : 'bad');
}

function severPart(s, side, slot) {
  const c = s[side]; const p = c.parts[slot];
  p.sev = true; p.hp = 0;
  ev(s, side, slot, 'sever', 0);
  log(s, `${c.name}'s ${p.label.toLowerCase()} ${/s$/.test(p.label) ? 'are' : 'is'} SEVERED!`, side === 'e' ? 'good sever' : 'bad sever');
  if (side === 'e') {
    s.stats.severs++;
    s.ground.push({ slot, label: p.label, trait: p.trait, from: c.name, max: p.max, gone: false });
    if (c.regrow && c.regrow.slots.includes(slot)) p.regrowIn = c.regrow.every + 1;
  } else {
    if (!s.stats.lost.includes(slot)) s.stats.lost.push(slot);
    s.stats.bondDelta -= 1;
    const D = derive(c);
    if (D.combatRegrow) p.regrowIn = D.combatRegrow + 1;
  }
  if (c.parts.torso && !s.over) applyStatus(s, side, 'bleed', 2, 1, null, opp(side), true);
  refreshActive(s, side);
}
function refreshActive(s, side) { /* derived stats are computed on demand; nothing cached */ }

// ---------- statuses ----------
function applyStatus(s, side, k, t, p, rng, srcSide, forced = false) {
  const c = s[side];
  if (s.over && !forced) return false;
  const D = derive(c);
  if (k === 'blind' && D.blindImmune) return false;
  if (k === 'stun' && c.tmp.stunImm) return false;
  const resKey = STATUS_RES[k];
  if (!forced && resKey && rng && D.res[resKey] > 0 && rng.chance(Math.min(0.85, D.res[resKey]))) return false;
  const old = c.st[k];
  if (k === 'venom') c.st[k] = { t: Math.max(t, old ? old.t : 0), p: old ? Math.min(5, Math.max(old.p, p) + 1) : p };
  else c.st[k] = { t: Math.max(t, old ? old.t : 0), p: old ? Math.max(old.p, p) : p };
  c.st[k].by = srcSide;
  ev(s, side, null, 'status', 0);
  log(s, `${c.name} is ${({ venom: 'poisoned', burn: 'burning', bleed: 'bleeding', chill: 'chilled', stun: 'stunned', blind: 'blinded', leech: 'being drained', rot: 'rotting' })[k]}.`, 'status');
  return true;
}
function healTorso(s, side, n) {
  const t = s[side].parts.torso;
  const h = Math.min(n, t.max - t.hp);
  if (h > 0) { t.hp += h; ev(s, side, 'torso', 'heal', h); }
  return h;
}

// ---------- attack resolution ----------
function strike(s, side, mv, slot, rng) {
  const att = s[side], dside = opp(side), def = s[dside];
  const A = derive(att);
  const hits = mv.hits || 1;
  let totalDealt = 0, anyHit = false;
  for (let h = 0; h < hits && !s.over; h++) {
    const D = derive(def);
    let tslot = slot;
    if (tslot && (!def.parts[tslot] || def.parts[tslot].sev)) tslot = 'torso';
    const chance = hitChance(s, side, mv, mv.tgt === 'all' || mv.tgt === 'enemy' ? null : tslot);
    if (D.ambush && !def.tmp.ambushUsed) {
      def.tmp.ambushUsed = 1; ev(s, dside, tslot, 'miss', 0);
      log(s, `${att.name}'s ${mv.name} strikes only shadows - ${def.name} was camouflaged!`, 'miss'); continue;
    }
    if (rng.next() * 100 >= chance) { ev(s, dside, tslot, 'miss', 0); log(s, `${att.name}'s ${mv.name} misses${tslot ? ' the ' + plabel(def, tslot).toLowerCase() : ''}.`, 'miss'); continue; }
    anyHit = true;
    let crit = rng.next() * 100 < A.crit;
    if (A.ambush && !att.tmp.ambushHit && mv.pow > 0) { crit = true; att.tmp.ambushHit = 1; }
    const mult = crit ? 1.6 : 1;
    if (mv.tgt === 'all') {
      log(s, `${att.name} unleashes ${mv.name}!`, side === 'p' ? 'player' : 'enemy');
      let dealt = 0;
      for (const sl of Object.keys(def.parts)) {
        if (def.parts[sl].sev || s.over) continue;
        const dmg = Math.round(rawDamage(s, side, mv, sl) * mult);
        dealt += damagePart(s, dside, sl, dmg, { type: mv.type, crit, spill: false });
      }
      totalDealt += dealt;
    } else if (mv.tgt === 'enemy') {
      log(s, `${att.name} uses ${mv.name}.`, side === 'p' ? 'player' : 'enemy');
    } else {
      let dmg = Math.round(rawDamage(s, side, mv, tslot) * mult * (0.9 + rng.next() * 0.2));
      if (mv.pow > 0 && dmg < 1) dmg = 1;
      const part = def.parts[tslot];
      const was = part.hp;
      const dealt = damagePart(s, dside, tslot, dmg, { type: mv.type, crit });
      totalDealt += dealt;
      log(s, `${att.name}'s ${mv.name} hits the ${part.label.toLowerCase()} for ${dealt}${crit ? ' (CRIT)' : ''}${was > 0 && part.sev ? '' : ''}.`, side === 'p' ? 'player' : 'enemy');
    }
    // on-hit statuses
    const list = [...(mv.st || []), ...(mv.pow > 0 ? A.onHit : [])];
    for (const x of list) {
      if (s.over) break;
      let chv = x.ch;
      if (def.boss && x.k === 'stun') chv *= 0.5;
      if (rng.next() < chv) applyStatus(s, dside, x.k, x.t, x.p + (A.stPow[x.k] || 0), rng, side);
    }
    // reactions
    if (totalDealt > 0 && MELEE.has(mv.type) && !mv.ranged && !s.over) {
      if (D.thorns > 0) {
        const src = att.parts[mv.src] && !att.parts[mv.src].sev ? mv.src : 'torso';
        const th = Math.round(D.thorns * def.atk);
        damagePart(s, side, src, th, { type: 'pierce', spill: false });
        log(s, `Thorns bite back at ${att.name}'s ${plabel(att, src).toLowerCase()} for ${th}.`, 'status');
      }
      if (!s.over && D.counter > 0 && rng.chance(D.counter / 100)) {
        const alive = Object.keys(att.parts).filter(k => !att.parts[k].sev);
        const tgt = rng.pick(alive);
        const cd = Math.round(5 * def.atk * (1 + D.dmg / 100));
        log(s, `${def.name} counter-attacks!`, 'status');
        damagePart(s, side, tgt, cd, { type: 'slash' });
      }
    }
  }
  if (totalDealt > 0 && A.lifesteal > 0 && !s.over) { const h = healTorso(s, side, Math.max(1, Math.round(totalDealt * A.lifesteal / 100))); if (h) log(s, `${att.name} drains ${h} HP.`, 'status'); }
  return anyHit;
}

function executeAttack(s, side, mv, slot, rng) {
  const att = s[side];
  att.cd[mv.id] = (mv.cd || 0) + 1;
  if (mv.tgt === 'self') {
    log(s, `${att.name} uses ${mv.name}.`, side === 'p' ? 'player' : 'enemy');
    if (mv.self && mv.self.guard) att.tmp.brace = true;
    if (mv.self && mv.self.heal) healTorso(s, side, mv.self.heal);
    return;
  }
  strike(s, side, mv, slot, rng);
  if (mv.recoil && !s.over) damagePart(s, side, 'torso', Math.round(mv.recoil), { spill: false, nonlethal: true });
  att.tmp.whet = false;
}

// ---------- player actions ----------
export function playerMoves(s) { return listMoves(s.p); }

export function playerAct(s, rng, act) {
  if (s.over) return { ok: false, error: 'over' };
  s.ev = [];
  const P = s.p;
  let mv = null;
  if (act.type === 'attack') {
    mv = listMoves(P).find(m => m.id === act.move);
    if (!mv) return { ok: false, error: 'No such move' };
    if (mv.cdLeft > 0) return { ok: false, error: 'Move on cooldown' };
    if (mv.tgt !== 'all' && mv.tgt !== 'enemy' && mv.tgt !== 'self') {
      const tp = s.e.parts[act.target];
      if (!tp || tp.sev) return { ok: false, error: 'Invalid target' };
    }
  } else if (act.type === 'item') {
    if (!s.inv.includes(act.item)) return { ok: false, error: 'No such item' };
    const def = ITEMS[act.item];
    if (def.target === 'ownPart' && !(P.parts[act.target] && !P.parts[act.target].sev)) return { ok: false, error: 'Pick one of your parts' };
    if (def.target === 'ownSevered' && !(P.parts[act.target] && P.parts[act.target].sev)) return { ok: false, error: 'Pick a severed part' };
  } else if (act.type === 'devour') {
    const g = s.ground[act.idx];
    if (!g || g.gone) return { ok: false, error: 'Nothing to devour' };
  } else if (act.type !== 'defend') return { ok: false, error: 'Unknown action' };

  const D_P = derive(P), D_E = derive(s.e);
  const iP = D_P.spd - D_E.enemySpd + rng.next() * 2.5 + (D_P.firstStrike ? 100 : 0);
  const iE = D_E.spd - D_P.enemySpd + rng.next() * 2.5 + (D_E.firstStrike ? 100 : 0);
  const pFirst = act.type !== 'attack' || iP >= iE;
  if (pFirst) { playerTurn(s, rng, act, mv); if (!s.over) enemyTurn(s, rng); }
  else { enemyTurn(s, rng); if (!s.over) playerTurn(s, rng, act, mv); }
  if (!s.over) endRound(s, rng);
  s.stats.turns++;
  return { ok: true };
}

function playerTurn(s, rng, act, mv) {
  const P = s.p;
  if (P.st.stun) { delete P.st.stun; P.tmp.stunImm = 2; log(s, `${P.name} is stunned and cannot act!`, 'bad'); return; }
  // refusal
  if (s.bond <= REFUSE_BOND) {
    const pr = 0.2 + (REFUSE_BOND - s.bond) * 0.03;
    if (s.bond <= 0 || rng.chance(pr)) {
      s.refusals++;
      log(s, `${P.name} sits down and refuses to fight...`, 'bad');
      if (s.refusals >= 3 || s.bond <= 0) { s.over = true; s.result = 'refused'; log(s, `${P.name} will not fight for you any more.`, 'bad'); }
      return;
    }
  }
  // feral disobedience
  if (act.type === 'attack' && P.feral > 0 && rng.chance(0.4 * P.feral + 0.03 * (P.aggr || 0))) {
    const moves = listMoves(P).filter(m => m.cdLeft === 0 && m.tgt !== 'self');
    if (moves.length) {
      const wm = rng.pick(moves);
      const alive = Object.keys(s.e.parts).filter(k => !s.e.parts[k].sev);
      const slot = rng.pick(alive);
      log(s, `${P.name}'s feral instincts take over - it ignores your command!`, 'bad');
      executeAttack(s, 'p', wm, slot, rng);
      return;
    }
  }
  if (act.type === 'attack') {
    const E = s.e;
    log(s, `${P.name} uses ${mv.name}${mv.tgt === 'all' || mv.tgt === 'enemy' || mv.tgt === 'self' ? '' : ' on the ' + plabel(E, act.target).toLowerCase()}.`, 'player');
    executeAttack(s, 'p', mv, act.target, rng);
  } else if (act.type === 'defend') {
    P.tmp.brace = true; healTorso(s, 'p', 2);
    log(s, `${P.name} braces itself.`, 'player');
  } else if (act.type === 'devour') {
    const g = s.ground[act.idx]; g.gone = true;
    const D = derive(P);
    const h = healTorso(s, 'p', 5 + Math.round(g.max * 0.3) + D.devourBonus);
    s.stats.devoured.push(g.trait || null);
    log(s, `${P.name} devours the ${g.from}'s ${g.label.toLowerCase()} and recovers ${h} HP.`, 'good');
  } else if (act.type === 'item') {
    useItem(s, rng, act);
  }
}

function useItem(s, rng, act) {
  const P = s.p, E = s.e;
  const i = s.inv.indexOf(act.item); s.inv.splice(i, 1);
  const name = ITEMS[act.item].name;
  log(s, `${P.name} uses ${name}.`, 'player');
  switch (act.item) {
    case 'salve': healTorso(s, 'p', 14); break;
    case 'bandage': { const p = P.parts[act.target]; p.hp = p.max; ev(s, 'p', act.target, 'heal', p.max); break; }
    case 'antidote': P.st = {}; break;
    case 'thread': { const p = P.parts[act.target]; p.sev = false; p.hp = Math.ceil(p.max * 0.5); p.regrowIn = null; s.stats.lost = s.stats.lost.filter(x => x !== act.target); ev(s, 'p', act.target, 'heal', p.hp); log(s, `The ${p.label.toLowerCase()} is stitched back on!`, 'good'); break; }
    case 'pepper_bomb': for (const sl of Object.keys(E.parts)) if (!E.parts[sl].sev && !s.over) damagePart(s, 'e', sl, Math.round(8 * (1 - (derive(E).res.fire || 0))), { spill: false, type: 'fire' }); break;
    case 'bait': E.tmp.distract = true; break;
    case 'whetstone': P.tmp.whet = true; break;
    case 'tonic': P.tmp.tonic = true; s.stats.bondDelta -= 6; break;
  }
}

// ---------- enemy AI ----------
function statusValue(mv, P) {
  let v = 0;
  for (const x of mv.st || []) {
    if (P.st[x.k]) continue;
    v += ({ stun: 14, blind: 10, venom: 7, burn: 7, bleed: 6, chill: 6, leech: 7, rot: 5 }[x.k] || 4) * x.ch;
  }
  return v;
}
function partValue(P, slot, ai) {
  const nm = listMoves(P).filter(m => m.src === slot).length;
  const p = P.parts[slot];
  let v = nm * 4 + (p.muts ? p.muts.length * 3 : 0);
  if (slot === 'eyes') v += 6; if (slot === 'hind') v += 5; if (slot === 'tail') v += 3; if (slot === 'head') v += 4; if (slot === 'back') v += 2;
  if (slot === 'torso') v = 0;
  if (ai === 'hunter') v = nm * 9 + v * 0.5;
  if (ai === 'saboteur') v *= slot === 'eyes' || slot === 'hind' || slot === 'head' ? 2.6 : 0.7;
  if (ai === 'brute') v *= 0.4;
  return v;
}
export function chooseEnemyAction(s, rng) {
  const E = s.e, P = s.p;
  const moves = listMoves(E).filter(m => m.cdLeft === 0);
  const alive = Object.keys(P.parts).filter(k => !P.parts[k].sev);
  if (!moves.length) return { mv: STRUGGLE, slot: rng.pick(alive) };
  if (E.special && s.turn % E.special.every === 0) {
    const sp = moves.find(m => m.id === E.special.move);
    if (sp) return { mv: sp, slot: sp.tgt ? null : pickBestSlot(s, sp, rng) || 'torso' };
  }
  const ai = E.ai;
  const tfrac = P.parts.torso.hp / P.parts.torso.max;
  let best = null;
  for (const mv of moves) {
    const cands = [];
    if (mv.tgt === 'self') {
      const ef = E.parts.torso.hp / E.parts.torso.max;
      cands.push({ slot: null, score: ef < 0.5 ? 12 : E.tmp.brace ? 0 : 3 });
    } else if (mv.tgt === 'enemy') {
      cands.push({ slot: null, score: statusValue(mv, P) * hitChance(s, 'e', mv, null) / 100 * (ai === 'saboteur' ? 1.8 : 1.2) });
    } else if (mv.tgt === 'all') {
      let sum = 0, sevs = 0;
      for (const sl of alive) { const d = rawDamage(s, 'e', mv, sl); sum += d; if (sl !== 'torso' && d >= P.parts[sl].hp) sevs += partValue(P, sl, ai); }
      cands.push({ slot: null, score: (sum * (mv.hits || 1) + sevs + statusValue(mv, P)) * hitChance(s, 'e', mv, null) / 100 * 0.8 });
    } else {
      for (const sl of alive) {
        const hits = mv.hits || 1;
        const d = rawDamage(s, 'e', mv, sl) * hits;
        const hc = hitChance(s, 'e', mv, sl) / 100;
        const part = P.parts[sl];
        let score = d * hc + statusValue(mv, P) * hc;
        if (sl === 'torso') {
          if (part.hp <= d) score += 100 * hc;
          if (ai === 'executioner' || ai === 'balanced') score *= tfrac < 0.5 ? 1.8 : 0.9;
          if (ai === 'brute') score *= tfrac < 0.6 ? 1.4 : 1;
        } else {
          if (d >= part.hp) score += partValue(P, sl, ai) * hc * 1.3;
          score += (1 - part.hp / part.max) * 4 * hc; // focus fire on hurt parts
          if (ai === 'executioner') score *= 0.8;
        }
        cands.push({ slot: sl, score });
      }
    }
    for (const c of cands) {
      let sc = c.score * (0.85 + rng.next() * 0.3);
      if (ai === 'wild') sc = c.score * (0.4 + rng.next() * 1.2);
      if (!best || sc > best.score) best = { mv, slot: c.slot, score: sc };
    }
  }
  return best || { mv: STRUGGLE, slot: rng.pick(alive) };
}
function pickBestSlot(s, mv, rng) {
  const P = s.p; let best = null;
  for (const sl of Object.keys(P.parts)) {
    if (P.parts[sl].sev) continue;
    const d = rawDamage(s, 'e', mv, sl) + rng.next();
    if (!best || d > best.d) best = { sl, d };
  }
  return best && best.sl;
}

function enemyTurn(s, rng) {
  const E = s.e, P = s.p;
  if (E.st.stun) { delete E.st.stun; E.tmp.stunImm = 2; log(s, `${E.name} is stunned!`, 'good'); return; }
  if (E.tmp.distract) { E.tmp.distract = false; log(s, `${E.name} is busy with the bait.`, 'good'); return; }
  const D = derive(P);
  if (D.fear && rng.chance(D.fear / 100)) { log(s, `${E.name} cowers, afraid.`, 'good'); return; }
  const a = chooseEnemyAction(s, rng);
  const tgtTxt = a.slot ? ` at the ${plabel(P, a.slot).toLowerCase()}` : '';
  if (a.mv.tgt !== 'all') log(s, `${E.name} uses ${a.mv.name}${a.mv.tgt === 'self' || a.mv.tgt === 'enemy' ? '' : tgtTxt}.`, 'enemy');
  executeAttack(s, 'e', a.mv, a.slot, rng);
}

// ---------- round end ----------
function tickStatuses(s, side, rng) {
  const c = s[side];
  for (const [k, v] of Object.entries(c.st)) {
    if (s.over) return;
    const D = derive(c);
    if (k === 'venom') { const d = Math.max(1, Math.round(v.p * (1 - (D.res.venom || 0)))); damagePart(s, side, 'torso', d, { spill: false, type: 'venom' }); log(s, `Venom wracks ${c.name} for ${d}.`, 'status'); }
    else if (k === 'burn') {
      const alive = Object.keys(c.parts).filter(x => !c.parts[x].sev);
      const sl = rng.pick(alive); const d = Math.max(1, Math.round(v.p * (1 - (D.res.fire || 0))));
      damagePart(s, side, sl, d, { spill: false, type: 'fire' }); log(s, `Flames sear ${c.name}'s ${plabel(c, sl).toLowerCase()} for ${d}.`, 'status');
    } else if (k === 'bleed') { const d = Math.max(1, Math.round(v.p * (1 - (D.res.bleed || 0)))); damagePart(s, side, 'torso', d, { spill: false, type: 'bleed' }); log(s, `${c.name} bleeds for ${d}.`, 'status'); }
    else if (k === 'leech') { damagePart(s, side, 'torso', v.p, { spill: false, type: 'venom' }); healTorso(s, opp(side), v.p); log(s, `${c.name} is drained for ${v.p}.`, 'status'); }
    v.t--;
    if (v.t <= 0) delete c.st[k];
  }
}
function regrowPart(s, side, slot, frac) {
  const c = s[side]; const p = c.parts[slot];
  p.sev = false; p.hp = Math.max(1, Math.ceil(p.max * frac)); p.regrowIn = null;
  ev(s, side, slot, 'regrow', 0);
  log(s, `${c.name}'s ${p.label.toLowerCase()} grows back!`, side === 'e' ? 'bad' : 'good');
  if (side === 'e') { for (let i = s.ground.length - 1; i >= 0; i--) { const g = s.ground[i]; if (!g.gone && g.slot === slot) { g.gone = true; break; } } }
  else s.stats.lost = s.stats.lost.filter(x => x !== slot);
}

function endRound(s, rng) {
  for (const side of ['p', 'e']) {
    if (s.over) return;
    const c = s[side], other = s[opp(side)];
    tickStatuses(s, side, rng);
    if (s.over) return;
    const D = derive(c);
    if (D.regen > 0) healTorso(s, side, D.regen);
    if (D.partRegen > 0) for (const p of Object.values(c.parts)) if (!p.sev && p.hp < p.max) { p.hp = Math.min(p.max, p.hp + D.partRegen); }
    if (D.selfDmg > 0) damagePart(s, side, 'torso', D.selfDmg, { spill: false, nonlethal: true });
    for (const a of D.auraSt) applyStatus(s, opp(side), a.k, a.t, a.p, rng, side);
    for (const p of Object.values(c.parts)) {
      if (p.sev && p.regrowIn != null) { p.regrowIn--; if (p.regrowIn <= 0) regrowPart(s, side, p.slot, side === 'e' && c.regrow ? 0.5 : 0.3); }
    }
    for (const id of Object.keys(c.cd)) if (c.cd[id] > 0) c.cd[id]--;
    c.tmp.brace = false;
    if (c.tmp.stunImm) c.tmp.stunImm--;
    if (c.enrage && !c.tmp.enrage && c.parts.torso.hp / c.parts.torso.max <= c.enrage.at) {
      c.tmp.enrage = c.enrage.dmg * 100;
      log(s, `${c.name} ROARS in fury! It hits much harder now.`, 'bad');
    }
  }
  s.turn++;
}

// ---------- end of fight ----------
export function finishCombat(s) {
  const P = s.p;
  for (const p of Object.values(P.parts)) if (!p.sev) p.hp = p.max;
  P.st = {}; P.cd = {}; P.tmp = {};
  for (const p of Object.values(P.parts)) p.regrowIn = null;
  return {
    result: s.result, won: s.result === 'win',
    ground: s.ground.filter(g => !g.gone), stats: s.stats, turns: s.turn,
  };
}

// ---------- UI helpers (pure) ----------
const SEVER_FX = { eyes: 'Blinded: its accuracy collapses (-40)', head: 'Stunned head: -25 accuracy, easier to hit', hind: 'Crippled: much slower and easier to hit', tail: 'Loses balance: easier to hit, no counters', fore: 'Weakened: -10% damage', jaws: 'Bite attacks disabled', back: 'Back traits lost', ext1: 'Extra limb lost', ext2: 'Extra limb lost', torso: 'A killing blow' };
// What happens if `slot` of the enemy is severed: array of short strings
export function severPreview(s, slot) {
  const E = s.e, p = E.parts[slot]; if (!p) return [];
  const out = [];
  if (slot === 'torso') return ['Killing blow if it lands'];
  if (SEVER_FX[slot]) out.push(SEVER_FX[slot]);
  const dis = E.moves.filter(m => m.src === slot).map(m => m.name);
  if (dis.length) out.push('Disables: ' + [...new Set(dis)].join(', '));
  if (p.trait && MUTS[p.trait]) out.push('Graftable: ' + MUTS[p.trait].name);
  out.push('Causes bleeding');
  return out;
}
// Best part to hit with move `mv` (score = expected damage + value of severing/killing)
export function suggestTarget(s, mv) {
  const E = s.e; let best = null, bs = -1;
  for (const [slot, p] of Object.entries(E.parts)) {
    if (p.sev) continue;
    const e = estimate(s, 'p', mv, slot);
    let sc = (e.hit / 100) * e.dmg * e.hits;
    if (e.kill) sc += 80 * (e.hit / 100);
    if (e.sever) {
      const srcN = E.moves.filter(m => m.src === slot).length;
      sc += (e.hit / 100) * (5 + srcN * 5 + (slot === 'eyes' ? 7 : 0) + (slot === 'jaws' ? 2 : 0) + (p.trait ? 4 : 0) + (slot === 'hind' ? 4 : 0));
    }
    if (slot === 'torso' && !e.kill) sc *= 0.6;
    if (sc > bs) { bs = sc; best = slot; }
  }
  return best;
}
// who is likely to act first this round (deterministic part of the initiative roll)
export function initiativeHint(s) {
  const a = derive(s.p), b = derive(s.e);
  const iP = a.spd - b.enemySpd + (a.firstStrike ? 100 : 0), iE = b.spd - a.enemySpd + (b.firstStrike ? 100 : 0);
  return { p: iP, e: iE, first: iP - iE > 1.25 ? 'p' : iE - iP > 1.25 ? 'e' : 'tie' };
}
