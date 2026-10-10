// Creature model: body maps, derived stats, mutation sockets. Everything is plain JSON so runs can be saved.
import { MUTS, HABITS, SOCKET_CAP, MAX_EXT } from './data/mutations.js';
import { SYNERGIES, PENALTIES, SYNERGY_NEED } from './data/synergies.js';

export const SLOT_ORDER = ['head', 'eyes', 'jaws', 'fore', 'hind', 'tail', 'back', 'torso', 'ext1', 'ext2'];
export const SLOT_LABEL = { head: 'Head', eyes: 'Eyes', jaws: 'Jaws', fore: 'Forelimbs', hind: 'Hindlimbs', tail: 'Tail', back: 'Back', torso: 'Torso', ext1: 'Extra 1', ext2: 'Extra 2' };
export const PART_ACC = { head: -8, eyes: -28, jaws: -12, fore: -4, hind: 0, tail: -8, back: 2, torso: 10, ext1: -6, ext2: -6 };
// damage-type multipliers against particular parts (cutting favours limbs, piercing favours eyes...)
export const TYPE_PART_MULT = {
  slash: { fore: 1.25, hind: 1.25, tail: 1.3 },
  pierce: { eyes: 1.4, jaws: 1.15, ext1: 1.15, ext2: 1.15 },
  blunt: { head: 1.2, back: 1.2, torso: 1.1, jaws: 1.1 },
  fire: { back: 1.15, tail: 1.15 },
  frost: { hind: 1.2, fore: 1.2 },
  sonic: { head: 1.2, eyes: 1.3 },
  shock: { jaws: 1.1 },
};
export const IGNORE_ARMOR = { fire: 0.75, venom: 0.75, psychic: 0.75, sonic: 0.75, shock: 1, rot: 0.75, frost: 0.4, pierce: 0.5, bleed: 1, slash: 0, blunt: 0 };

export function makePart(slot, hp, arm, label, trait) {
  return { slot, label: label || SLOT_LABEL[slot], hp, max: hp, arm, b: { hp, arm }, sev: false, muts: [], trait: trait || null, regrowIn: null };
}

export function makePet(species, name) {
  const c = {
    id: species.id, name: name || species.name, species: species.id, isPlayer: true, layout: species.layout, color: species.color, accent: species.accent,
    spd: species.spd, atk: 1, baseMods: species.mods || {}, extraMods: [], habits: [], adapt: {}, aggr: 0, feral: 0, biome: null,
    parts: {}, moves: [], st: {}, cd: {}, tmp: {},
  };
  for (const [slot, [hp, arm]] of Object.entries(species.parts)) c.parts[slot] = makePart(slot, Math.round(hp * (slot === 'torso' ? 1.15 : 1.3)), arm);
  refresh(c);
  return c;
}

export function makeEnemy(tpl, { scale = 1, dmg = 1, elite = null } = {}) {
  const c = {
    id: tpl.id, name: tpl.name, species: tpl.id, isPlayer: false, layout: tpl.layout, color: tpl.color, ai: tpl.ai, boss: !!tpl.boss, elite: !!elite,
    spd: tpl.spd || 0, atk: dmg, baseMods: JSON.parse(JSON.stringify(tpl.mods || {})), extraMods: [], habits: [], adapt: {}, aggr: 0, feral: 0, biome: tpl.biome,
    guard: tpl.guard || null, regrow: tpl.regrow || null, enrage: tpl.enrage || null, special: tpl.special || null, desc: tpl.desc, reward: tpl.reward || null,
    parts: {}, moves: JSON.parse(JSON.stringify(tpl.moves || [])), st: {}, cd: {}, tmp: {},
  };
  for (const [slot, def] of Object.entries(tpl.parts)) {
    const [hp, arm, trait, label] = def;
    const p = makePart(slot, Math.max(3, Math.round(hp * scale)), arm, label, trait);
    c.parts[slot] = p;
  }
  if (elite) {
    c.name = 'Alpha ' + tpl.name; c.extraMods.push(elite.mods); c.eliteTrait = elite.name;
    for (const p of Object.values(c.parts)) { p.b.hp = Math.round(p.b.hp * 1.3); p.b.arm += (p.slot === 'torso' ? 1 : 0); }
    c.parts.torso.b.hp = Math.round(c.parts.torso.b.hp * 1.15);
  }
  refresh(c);
  for (const p of Object.values(c.parts)) p.hp = p.max;
  return c;
}

// The final boss mirrors the pet's body plan and borrows its strongest moves.
export function makeHeart(tpl, pet, scale) {
  const c = makeEnemy({ ...tpl, parts: { torso: tpl.parts.torso, back: tpl.parts.back, ext1: tpl.parts.ext1, ext2: tpl.parts.ext2 }, moves: [], layout: pet.layout }, { scale, dmg: 1 });
  c.layout = pet.layout;
  for (const [slot, p] of Object.entries(pet.parts)) {
    if (slot === 'torso' || slot === 'back' || slot.startsWith('ext')) continue;
    c.parts[slot] = makePart(slot, Math.round(p.b.hp * 1.4 * scale) + 4, 1, null, null);
  }
  const petMoves = listMovesRaw(pet).filter(m => m.pow > 0 && m.tgt !== 'self').sort((a, b) => b.pow * (b.hits || 1) - a.pow * (a.hits || 1)).slice(0, 3);
  c.moves = tpl.moves.map(m => ({ ...m }));
  for (const m of petMoves) {
    const src = c.parts[m.src] && !m.src.startsWith('ext') ? m.src : 'torso';
    c.moves.push({ ...m, id: 'mirror_' + m.id, name: m.name + ' (echo)', src, cd: Math.max(m.cd || 0, 1) });
  }
  refresh(c);
  for (const p of Object.values(c.parts)) p.hp = p.max;
  return c;
}

// ---------- derived stats ----------
function blank() {
  return { acc: 0, dodge: 0, spd: 0, dmg: 0, crit: 5, thorns: 0, regen: 0, partRegen: 0, lifesteal: 0, counter: 0, fear: 0, firstStrike: 0,
    res: {}, guard: 0, selfDmg: 0, phoenix: 0, onHit: [], stPow: {}, severBonus: 0, enemyAcc: 0, enemySpd: 0, ambush: 0, bloodlust: 0, bondDrain: 0,
    blindImmune: 0, devourBonus: 0, biomeDmg: {}, auraSt: [], combatRegrow: 0, php: 0, hp: 0, hpPct: 0, phpSlot: {}, arm: {}, armAll: 0, rot: 0 };
}
function add(d, m) {
  if (!m) return;
  for (const [k, v] of Object.entries(m)) {
    if (k === 'res' || k === 'stPow' || k === 'biomeDmg' || k === 'phpSlot' || k === 'arm') { for (const [kk, vv] of Object.entries(v)) d[k][kk] = (d[k][kk] || 0) + vv; }
    else if (k === 'onHit' || k === 'auraSt') d[k].push(...v);
    else d[k] = (d[k] || 0) + v;
  }
}
export function activeMutIds(c) {
  const out = [];
  for (const p of Object.values(c.parts)) if (!p.sev) out.push(...p.muts);
  return out;
}
export function allMutIds(c) { return Object.values(c.parts).flatMap(p => p.muts); }
export function tagCounts(c) {
  const t = {};
  for (const id of activeMutIds(c)) for (const g of MUTS[id].tags) t[g] = (t[g] || 0) + 1;
  return t;
}
export function activeSynergies(c) {
  const t = tagCounts(c);
  return SYNERGIES.filter(s => (t[s.tag] || 0) >= SYNERGY_NEED);
}
export function activePenalties(c) {
  const t = tagCounts(c);
  return PENALTIES.filter(p => p.test(t));
}

export function derive(c) {
  const d = blank();
  d.spd = c.spd || 0;
  add(d, c.baseMods);
  for (const id of activeMutIds(c)) add(d, MUTS[id].mods);
  for (const h of c.habits) add(d, HABITS[h]?.mods);
  for (const m of c.extraMods) add(d, m);
  for (const s of activeSynergies(c)) add(d, s.mods);
  for (const p of activePenalties(c)) add(d, p.mods);
  for (const [type, lvl] of Object.entries(c.adapt || {})) d.res[type] = (d.res[type] || 0) + 0.2 * lvl;
  d.dmg += 6 * (c.aggr || 0) + 30 * (c.feral || 0);
  const P = c.parts;
  if (P.eyes) { if (P.eyes.sev) d.acc -= 40; else if (P.eyes.hp / P.eyes.max < 0.5) d.acc -= 12; }
  if (P.head && P.head.sev) { d.acc -= 25; d.dodge -= 10; }
  if (P.hind) { if (P.hind.sev) { d.spd -= 4; d.dodge -= 12; } else if (P.hind.hp / P.hind.max < 0.5) d.spd -= 1; }
  if (P.tail) { if (P.tail.sev) d.dodge -= 8; else { d.counter += 10; d.dodge += 3; } }
  if (P.fore && P.fore.sev) d.dmg -= 10;
  if (P.torso && P.torso.hp / P.torso.max < 0.5) d.dmg += d.bloodlust;
  if (c.biome && d.biomeDmg[c.biome]) d.dmg += d.biomeDmg[c.biome];
  for (const k of Object.keys(d.res)) d.res[k] = Math.min(0.85, d.res[k]);
  // statuses & temporary buffs
  const S = c.st || {};
  if (S.chill) { d.spd -= 3 * Math.min(2, S.chill.p); d.acc -= 8; }
  if (S.blind && !d.blindImmune) d.acc -= 35;
  if (S.rot) d.rot = S.rot.p;
  if (c.tmp) {
    if (c.tmp.tonic) d.dmg += 30;
    if (c.tmp.enemySpd) d.spd += c.tmp.enemySpd;
    if (c.tmp.enemyAcc) d.acc -= c.tmp.enemyAcc;
    if (c.tmp.enrage) d.dmg += c.tmp.enrage;
    if (c.tmp.brace) d.dodge += 5;
  }
  return d;
}

// Recompute max HP / armour after any structural change (mutation gained / lost).
export function refresh(c) {
  const d = derive(c);
  for (const p of Object.values(c.parts)) {
    const old = p.max;
    let m;
    if (p.slot === 'torso') m = Math.round((p.b.hp + d.hp) * (1 + d.hpPct / 100));
    else m = p.b.hp + d.php + (d.phpSlot[p.slot] || 0);
    m = Math.max(p.slot === 'torso' ? 8 : 3, m);
    p.max = m;
    if (!p.sev) { if (m > old) p.hp += m - old; p.hp = Math.min(p.hp, m); }
    p.arm = Math.max(0, p.b.arm + (d.arm[p.slot] || 0) + d.armAll);
  }
  return d;
}

// ---------- moves ----------
export const BASE_MOVES = {
  fore: { name: 'Claw Slash', type: 'slash', pow: 7, cd: 0 },
  jaws: { name: 'Bite', type: 'pierce', pow: 8, cd: 0, st: [{ k: 'bleed', ch: 0.2, t: 2, p: 1 }] },
  hind: { name: 'Kick', type: 'blunt', pow: 6, cd: 0 },
  tail: { name: 'Tail Whip', type: 'blunt', pow: 4, cd: 0, st: [{ k: 'stun', ch: 0.2, t: 1, p: 1 }] },
  head: { name: 'Headbutt', type: 'blunt', pow: 6, cd: 0, st: [{ k: 'stun', ch: 0.15, t: 1, p: 1 }], recoil: 1 },
  torso: { name: 'Body Slam', type: 'blunt', pow: 9, cd: 1, acc: -8, recoil: 2 },
};
function listMovesRaw(c) {
  const out = [];
  for (const p of Object.values(c.parts)) {
    if (p.sev) continue;
    if (c.isPlayer) {
      const bm = BASE_MOVES[p.slot];
      if (bm) out.push({ ...bm, id: 'base_' + p.slot, src: p.slot });
      for (const id of p.muts) { const m = MUTS[id]; if (m.move) out.push({ ...m.move, src: p.slot }); }
    }
  }
  if (!c.isPlayer) for (const m of c.moves) { const sp = c.parts[m.src]; if (sp && !sp.sev) out.push(m); }
  return out;
}
export function listMoves(c) {
  return listMovesRaw(c).map(m => ({ ...m, cdLeft: c.cd[m.id] || 0 }));
}

// ---------- mutation sockets ----------
export function socketsFree(c, slot) {
  const p = c.parts[slot];
  if (!p || p.sev) return 0;
  return (SOCKET_CAP[slot] || 0) - p.muts.length;
}
export function conflictWith(c, id) {
  const m = MUTS[id];
  for (const have of allMutIds(c)) {
    if (have === id) return have;
    if (m.conflicts.includes(have) || MUTS[have].conflicts.includes(id)) return have;
  }
  return null;
}
export function extCount(c) { return Object.keys(c.parts).filter(s => s.startsWith('ext')).length; }
export function hasMut(c, id) { return allMutIds(c).includes(id); }

// Returns {ok, slot} if the mutation can be placed without replacing anything.
export function canPlace(c, id) {
  const m = MUTS[id];
  if (conflictWith(c, id)) return { ok: false, reason: 'conflict', with: conflictWith(c, id) };
  if (m.slot === 'extra') {
    for (const s of ['ext1', 'ext2']) if (!c.parts[s]) return { ok: true, slot: s };
    return { ok: false, reason: 'full' };
  }
  if (!c.parts[m.slot]) return { ok: false, reason: 'nopart' };
  if (c.parts[m.slot].sev) return { ok: false, reason: 'severed' };
  if (socketsFree(c, m.slot) > 0) return { ok: true, slot: m.slot };
  return { ok: false, reason: 'full' };
}
export function place(c, id, slot) {
  const m = MUTS[id];
  if (m.slot === 'extra') {
    c.parts[slot] = makePart(slot, 8, 0, m.partLabel || m.name);
    c.parts[slot].muts.push(id);
    c.parts[slot].hp = c.parts[slot].max;
  } else c.parts[slot].muts.push(id);
  refresh(c);
  const p = c.parts[slot]; if (p) p.hp = Math.min(p.max, Math.max(p.hp, 1));
}
export function removeMut(c, id) {
  for (const p of Object.values(c.parts)) {
    const i = p.muts.indexOf(id);
    if (i >= 0) {
      p.muts.splice(i, 1);
      if (p.slot.startsWith('ext')) delete c.parts[p.slot];
      refresh(c);
      return true;
    }
  }
  return false;
}
// What can be replaced to fit this mutation: existing mutations in same slot (or conflicting one).
export function replaceOptions(c, id) {
  const m = MUTS[id]; const out = [];
  const conf = conflictWith(c, id);
  if (conf && conf !== id) out.push(conf);
  if (m.slot === 'extra') { for (const s of ['ext1', 'ext2']) if (c.parts[s]) for (const x of c.parts[s].muts) if (!out.includes(x)) out.push(x); }
  else if (c.parts[m.slot] && !c.parts[m.slot].sev) for (const x of c.parts[m.slot].muts) if (!out.includes(x)) out.push(x);
  return out;
}
export function describeStatus(k) {
  return { venom: 'Venom', burn: 'Burning', bleed: 'Bleeding', chill: 'Chilled', stun: 'Stunned', blind: 'Blinded', leech: 'Leeched', rot: 'Rotting' }[k] || k;
}
