// Art regression test: every creature x every mutation overlay x severed combinations must render valid, self-contained SVG.
import { PET_SPECIES } from '../js/data/species.js';
import { ENEMIES, BOSSES } from '../js/data/enemies.js';
import { MUTATIONS } from '../js/data/mutations.js';
import { makePet, makeEnemy, makeHeart, SLOT_ORDER } from '../js/creature.js';
import { renderCreature } from '../js/svg.js';
import { ARCH } from '../js/art/arch.js';
import { overlayAnchors } from '../js/art/overlays.js';
let n = 0; const bad = [];
const check = (svg, what) => {
  n++;
  if (/NaN|undefined|\[object/.test(svg)) bad.push(what + ': contains NaN/undefined');
  if ((svg.match(/<svg/g) || []).length !== 1) bad.push(what + ': not exactly one <svg>');
  const open = (svg.match(/<g[ >]/g) || []).length, close = (svg.match(/<\/g>/g) || []).length;
  if (open !== close) bad.push(`${what}: unbalanced <g> (${open}/${close})`);
  for (const m of svg.matchAll(/url\(#([\w-]+)\)/g)) if (!svg.includes(`id="${m[1]}"`)) bad.push(`${what}: dangling reference #${m[1]}`);
};
const mk = [];
for (const s of Object.values(PET_SPECIES)) mk.push([s.id, () => makePet(s), 'p']);
const pet = makePet(PET_SPECIES.mossling);
for (const e of [...Object.values(ENEMIES), ...Object.values(BOSSES)]) mk.push([e.id, () => e.mirror ? makeHeart(e, pet, 1) : makeEnemy(e, { scale: 1 }), 'e']);
for (const [id, make, side] of mk) {
  check(renderCreature(make(), { side }), id + ' plain');
  for (const m of MUTATIONS) {
    const c = make(); const slot = m.slot === 'extra' ? 'ext1' : m.slot;
    if (!c.parts[slot]) c.parts[slot] = { slot, label: slot, hp: 8, max: 8, arm: 0, b: { hp: 8, arm: 0 }, sev: false, muts: [], trait: null };
    c.parts[slot].muts.push(m.id);
    check(renderCreature(c, { side }), `${id} + ${m.id}`);
  }
  const slots = Object.keys(make().parts);
  for (let mask = 0; mask < 1 << Math.min(slots.length, 9); mask += 7) {
    const c = make(); slots.forEach((sl, i) => { if (mask >> i & 1) c.parts[sl].sev = true; });
    check(renderCreature(c, { side, sevNow: slots.filter((_, i) => mask >> i & 1), bars: 'all', targetable: true, hl: slots[0] }), `${id} sever mask ${mask}`);
  }
  const c = make(); for (const p of Object.values(c.parts)) p.hp = 1; check(renderCreature(c, { side, bars: 'all' }), id + ' hurt');
}
// every body plan defines the anchors the renderer and overlays need
for (const [name, a] of Object.entries(ARCH)) { for (const sl of ['head', 'torso', 'back']) if (!a.A[sl]) bad.push(`arch ${name} missing anchor ${sl}`); if (!overlayAnchors(name).tc) bad.push(`arch ${name} has no overlay clip ellipse`); }
if (bad.length) { console.log(bad.slice(0, 30).join('\n')); console.log(`${bad.length} art problems`); process.exit(1); }
console.log(`art ok - ${n} renders (${mk.length} creatures x ${MUTATIONS.length} mutations + sever masks), no NaN/undefined, balanced groups, no dangling refs`);
