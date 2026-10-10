// Creature renderer: assembles hand-authored archetype art + species decorations + mutation overlays into an SVG
// whose parts are clickable regions. Handles damage, severed stumps (with ichor), bars, target highlights and floats.
import { MUTS, TAGS } from './data/mutations.js';
import { SLOT_LABEL } from './creature.js';
import { ARCH, extArt } from './art/arch.js';
import { ART, DECO } from './art/species.js';
import { overlayFor, overlayAnchors } from './art/overlays.js';
import { defs, makePal, LINE, T, S, circ } from './art/kit.js';

const ORDER_ALL = ['tail', 'hind', 'torso', 'back', 'fore', 'head', 'jaws', 'eyes', 'ext1', 'ext2'];
const BAR_OFF = { head: [-6, -38], eyes: [30, -24], jaws: [12, 36], fore: [6, 40], hind: [-4, 40], tail: [-2, -30], back: [0, -36], torso: [0, 10], ext1: [0, -30], ext2: [0, -30] };
const PULL = { head: 0.4, fore: 0.45, hind: 0.45, tail: 0.55 };
const ICHOR = { swamp: '#8ab832', caves: '#8a6ae0', ashlands: '#f07a28' };
let uid = 0;

function artOf(c) {
  const id = c.mirrorOf || c.species || c.id;
  let a = ART[c.id] || ART[id];
  if (!a) a = ART.mossling;
  let arch = a.arch;
  if (!arch) arch = (ART[c.mirrorOf] || ART.mossling).arch;
  return { a, arch, archName: arch };
}
export function anchorsOf(c) { const { arch } = artOf(c); return ARCH[arch].A; }
export function partCenter(c, slot) { const A = anchorsOf(c); const a = A[slot] || A.torso; return { x: a[0], y: a[1] }; }

function ctxFor(c) {
  const { a, arch } = artOf(c);
  const id = 'cr' + (++uid);
  const P = { ...a.pal };
  if (c.mirrorOf === undefined && c.isPlayer) P.ichor = '#b3121c';
  const feral = c.isPlayer && (c.feral || 0) > 0;
  const k = { id, P, f: `url(#${id}-b)`, fd: `url(#${id}-d)`, fs: `url(#${id}-s)`, fa: `url(#${id}-a)`, o: { ...a.o }, A: ARCH[arch].A, arch, has: {}, cos: {}, mood: feral ? 'wild' : P.mood };
  for (const sl of ORDER_ALL) k.has[sl] = !!c.parts[sl];
  for (const sl of ARCH[arch].cosmetic || []) if (!c.parts[sl]) k.cos[sl] = true;
  if (arch === 'biped' && !c.parts.head) k.cos.head = true;
  return { k, a, arch };
}

// Socket (where the part attaches to the body) and direction the part pointed, per body plan: [x, y, angle in degrees].
const SOCK = {
  quad: { head: [214, 102, -15], fore: [196, 128, 90], hind: [100, 128, 90], tail: [92, 112, 195], back: [150, 74, -90], eyes: [250, 78], jaws: [270, 118] },
  lizard: { head: [216, 112, -10], fore: [180, 152, 90], hind: [92, 150, 90], tail: [82, 134, 190], back: [140, 90, -90], eyes: [246, 86], jaws: [264, 142] },
  serpent: { head: [228, 118, -40], tail: [92, 178, 185], back: [140, 146, -90], eyes: [256, 80], jaws: [266, 118] },
  winged: { head: [200, 98, -15], hind: [140, 168, 90], tail: [112, 132, 195], back: [140, 80, -90], eyes: [230, 80], jaws: [240, 112] },
  crab: { head: [212, 104, -10], fore: [236, 132, 0], hind: [120, 160, 100], back: [150, 136, -90], eyes: [214, 130, -80], jaws: [230, 130] },
  spider: { head: [188, 112, 0], fore: [200, 140, 20], hind: [92, 150, 100], back: [122, 74, -90], eyes: [226, 106], jaws: [236, 128] },
  biped: { head: [152, 58, -90], fore: [196, 94, 0], hind: [152, 172, 90], tail: [130, 160, 190], back: [124, 80, 200], eyes: [152, 34], jaws: [152, 56] },
  blob: { back: [140, 92, -90], eyes: [214, 96], jaws: [222, 118] },
};
function stump(x, y, ang, ichor, fresh, k, slot) {
  const drips = `<g class="drip"><path d="M-4 8 q-3 9 0 12 q3 -3 0 -12Z" fill="${ichor}"/></g><g class="drip d2"><path d="M5 7 q-3 7 0 10 q3 -3 0 -10Z" fill="${ichor}"/></g>`;
  const splash = `<circle cx="-12" cy="9" r="2" fill="${ichor}"/><circle cx="13" cy="5" r="1.6" fill="${ichor}"/>`;
  if (ang === undefined) {
    // eye socket / torn jaw: a dark bleeding hollow right on the face
    const big = slot === 'jaws' ? 1.5 : 1;
    return `<g class="stump ${fresh ? 'fresh' : ''}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${big})"><circle r="14" fill="${ichor}" opacity=".3" class="pulse"/><ellipse rx="9" ry="8" fill="${ichor}" stroke="${LINE}" stroke-width="2.4"/><ellipse rx="5" ry="4.6" fill="#2a0508"/>${drips}${splash}</g>`;
  }
  const big = slot === 'back' ? 1.4 : 1;
  const stub = `<g transform="rotate(${ang})"><path d="M-6 -12 C4 -11 10 -10 12 -8 Q15 0 12 8 C10 10 4 11 -6 12Z" fill="${k.f}" stroke="${LINE}" stroke-width="3" stroke-linejoin="round"/><ellipse cx="12" cy="0" rx="4" ry="8" fill="${ichor}" stroke="${LINE}" stroke-width="2.4"/><ellipse cx="12.4" cy="0" rx="1.8" ry="3.8" fill="#f4e6d0"/></g>`;
  return `<g class="stump ${fresh ? 'fresh' : ''}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${big})"><circle r="16" fill="${ichor}" opacity=".28" class="pulse"/>${stub}${drips}${splash}</g>`;
}

const wound = (x, y, frac, ichor) => {
  if (frac > 0.55) return '';
  const n = frac < 0.25 ? 3 : 2; let s = '';
  for (let i = 0; i < n; i++) s += `<path d="M${(x - 12 + i * 11).toFixed(0)} ${(y - 6 + (i % 2) * 8).toFixed(0)} l9 7 M${(x - 9 + i * 11).toFixed(0)} ${(y - 9 + (i % 2) * 8).toFixed(0)} l6 3" stroke="${ichor}" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".9"/>`;
  return s;
};

// opts: { side:'p'|'e', targetable, flash:{slot:kind}, events, hl, suggest, bars:'none'|'damaged'|'all', anim:'lunge'|'hit'|'faint'..., sevNow:[slots], badges:{slot:text}, size }
export function renderCreature(c, opts = {}) {
  const { k, a, arch } = ctxFor(c);
  const AR = ARCH[arch];
  const flip = opts.side === 'e';
  const ichor = c.isPlayer ? '#b3121c' : (a.pal.ichor && a.pal.ichor !== '#b3121c' ? a.pal.ichor : (ICHOR[c.biome] || '#8ab832'));
  const parts = c.parts;
  const headGone = parts.head && parts.head.sev;
  const slotCls = (sl, p) => ['part', 'p-' + sl, opts.targetable && !p.sev ? 'tgt' : '', opts.hl === sl ? 'hl' : '', opts.suggest === sl ? 'sug' : '', opts.flash && opts.flash[sl] ? 'f-' + opts.flash[sl] : ''].join(' ');
  const attrs = (sl, p) => `data-slot="${sl}" ${opts.targetable && !p.sev ? `data-act="ctarget" data-slot-arg="${sl}"` : ''}`;
    const behind = [], front = [], tops = [];

  const build = (sl, p) => {
    let art = AR.parts[sl] ? AR.parts[sl](k) : '';
    let b = '', f = '';
    if (art && typeof art === 'object') { b = art.b || ''; f = art.f || ''; } else f = art || '';
    if (sl === 'head' && !c.parts.eyes && !a.blind && AR.parts.eyes) f += AR.parts.eyes(k);
    const decos = (a.decos || []).filter(d => d.slot === sl);
    for (const d of decos) { const dd = DECO[d.kind] ? DECO[d.kind](k, sl) : ''; if (d.replace) f = dd; else f += dd; }
    const ek = a.ext && a.ext[sl];
    if (ek) f += extArt(ek, k, sl);
    // mutation overlays
    p.muts.forEach((m, i) => {
      const ov = overlayFor(k, arch, sl, m, i, MUTS[m]);
      if (ov && typeof ov === 'object') { b += ov.b || ''; f += ov.f || ''; } else f += ov || '';
    });
    f += wound(partCenter(c, sl).x, partCenter(c, sl).y, p.hp / p.max, ichor);
    return { b, f };
  };

  const stumps = [], ghosts = [];
  for (const sl of AR.order) {
    const p = parts[sl];
    if (!p) continue;
    const cen = partCenter(c, sl);
    const pull = PULL[sl] || 0;
    const tc = k.A.torso;
    const sx = cen.x + (tc[0] - cen.x) * pull, sy = cen.y + (tc[1] - cen.y) * pull;
    const hidden = headGone && (sl === 'eyes' || sl === 'jaws');
    if (p.sev) {
      const sk = (SOCK[arch] || SOCK.quad)[sl]; stumps.push(sk ? stump(sk[0], sk[1], sk[2], ichor, (opts.sevNow || []).includes(sl), k, sl) : stump(sx, sy, 0, ichor, (opts.sevNow || []).includes(sl), k, sl));
      if ((opts.sevNow || []).includes(sl)) { const { b, f } = build(sl, { ...p, muts: [] }); ghosts.push(`<g class="flyoff">${b}${f}</g>`); }
      continue;
    }
    if (hidden) continue;
    const { b, f } = build(sl, p);
    const cls = slotCls(sl, p), at = attrs(sl, p);
    const motion = sl === 'tail' ? 'wag' : (sl === 'head' || sl === 'jaws' || sl === 'eyes') ? 'headbob' : '';
    const org = `style="transform-origin:${sl === 'tail' ? cen.x + 40 : k.A.torso[0] + 50}px ${sl === 'tail' ? cen.y + 12 : k.A.torso[1] + 4}px"`;
    if (b) behind.push(`<g class="${cls}" ${at}>${b}</g>`);
    const pad = `<circle class="pad" cx="${cen.x}" cy="${cen.y}" r="${sl === 'eyes' ? 15 : 19}" fill="#000" fill-opacity="0"/>`;
    front.push(`<g class="${cls} ${motion}" ${at} ${motion ? org : ''}>${f}${pad}</g>`);
  }
  // bars, rings, badges, floats in screen space (never mirrored)
  const X = x => flip ? 300 - x : x;
  let hud = '';
  const barsMode = opts.bars || 'damaged';
  for (const sl of AR.order) {
    const p = parts[sl]; if (!p || p.sev) continue;
    const cen = partCenter(c, sl);
    const o = BAR_OFF[sl] || [0, -30];
    const bx = X(cen.x + (flip ? -o[0] : o[0])), by = cen.y + o[1];
    const frac = Math.max(0, p.hp / p.max);
    if (opts.hl === sl || opts.suggest === sl) {
      const pc = partCenter(c, sl);
      hud += `<circle class="ring ${opts.suggest === sl && opts.hl !== sl ? 'sugr' : ''}" cx="${X(pc.x)}" cy="${pc.y}" r="${sl === 'eyes' ? 16 : 24}"/>`;
    }
    if (barsMode === 'none') continue;
    if (barsMode === 'damaged' && frac >= 1 && !p.arm) continue;
    if (barsMode === 'damaged' && frac >= 1 && p.arm && !opts.targetable) continue;
    const col = frac > 0.6 ? '#7fcf6a' : frac > 0.3 ? '#e0b43a' : '#e0503a';
    hud += `<g class="pbar" transform="translate(${(bx - 15).toFixed(1)} ${by.toFixed(1)})"><rect width="30" height="7" rx="3.5" fill="#0b0806" stroke="#000" stroke-width="1.2" opacity=".85"/><rect x="1" y="1" width="${Math.max(0, 28 * frac).toFixed(1)}" height="5" rx="2.5" fill="${col}"/>${p.arm > 0 ? `<g transform="translate(32 -2)"><path d="M0 0 h9 v7 l-4.5 4 l-4.5 -4Z" fill="#9aa4ad" stroke="#000" stroke-width="1.2"/><text x="4.5" y="7" font-size="7.5" font-weight="800" text-anchor="middle" fill="#0b0f12">${p.arm}</text></g>` : ''}</g>`;
    if (opts.badges && opts.badges[sl]) hud += `<g class="badge" transform="translate(${bx.toFixed(1)} ${(by - 7).toFixed(1)})"><text text-anchor="middle" font-size="11.5" font-weight="800" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke">${opts.badges[sl]}</text></g>`;
  }
  let floats = '';
  let fi = 0;
  for (const e of (opts.events || [])) {
    if (e.side !== opts.side || !e.slot || !parts[e.slot]) continue;
    const pc = partCenter(c, e.slot);
    let txt = '', colr = '#fff';
    if (e.k === 'hit') { txt = '-' + e.n; colr = '#ff8a7a'; } else if (e.k === 'crit') { txt = '-' + e.n + '!'; colr = '#ffd36b'; }
    else if (e.k === 'miss') { txt = 'miss'; colr = '#c0cbc2'; } else if (e.k === 'heal') { txt = '+' + e.n; colr = '#8fe08a'; }
    else if (e.k === 'sever') { txt = 'SEVERED!'; colr = '#ff4d4d'; } else if (e.k === 'regrow') { txt = 'regrown'; colr = '#8fe08a'; }
    if (txt) floats += `<text class="float" style="animation-delay:${(fi++ * 0.18).toFixed(2)}s" x="${X(pc.x)}" y="${pc.y - 8}" fill="${colr}" text-anchor="middle">${txt}</text>`;
  }
  const sc = a.scale || 1;
  const flipT = flip ? 'translate(300 0) scale(-1 1)' : '';
  const sizeT = sc !== 1 ? `translate(150 205) scale(${sc}) translate(-150 -205)` : '';
  const body = `<g class="idle">${behind.join('')}${front.join('')}${stumps.join('')}${ghosts.join('')}</g>`;
  const cls = `creature ${flip ? 'enemy' : 'pet'} ${opts.anim || ''} ${opts.targetable ? 'targeting' : ''}`;
  return `<svg class="${cls}" viewBox="0 -16 300 238" role="img" aria-label="${c.name}">${defs(k.id, k.P)}<ellipse cx="150" cy="206" rx="${110 * sc}" ry="9" fill="url(#${k.id}-sh)"/><g transform="${sizeT} ${flipT}">${body}</g>${hud}${floats}</svg>`;
}
export { SLOT_LABEL };
