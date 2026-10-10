// SVG body-map renderer. Draws a creature as ellipse parts; shows damage, severed gaps, mutation glow and floating numbers.
import { MUTS, TAGS } from './data/mutations.js';
import { SLOT_LABEL } from './creature.js';

const E = (cx, cy, rx, ry, rot = 0) => ({ cx, cy, rx, ry, rot });
export const LAYOUTS = {
  quad: { tail: E(62, 108, 36, 9, -28), hind: E(100, 152, 17, 36, 8), torso: E(145, 112, 62, 38), back: E(145, 74, 44, 13), fore: E(190, 154, 15, 34, -8),
    head: E(218, 84, 28, 24, -10), jaws: E(248, 102, 22, 10, 8), eyes: E(228, 76, 8, 6), ext1: E(110, 48, 14, 14), ext2: E(178, 44, 13, 13) },
  serpent: { tail: E(48, 152, 50, 10, 18), torso: E(140, 125, 80, 28, -6), back: E(140, 92, 55, 10, -6), fore: E(190, 160, 12, 20), hind: E(95, 162, 12, 18),
    head: E(232, 92, 27, 22, -15), jaws: E(258, 106, 20, 9, 10), eyes: E(240, 84, 7, 6), ext1: E(150, 58, 14, 14), ext2: E(204, 54, 13, 13) },
  tall: { tail: E(98, 170, 32, 7, 25), hind: E(150, 182, 16, 30), torso: E(150, 114, 36, 54), back: E(112, 100, 13, 44), fore: E(200, 112, 13, 38, -12),
    head: E(150, 44, 25, 22), jaws: E(150, 64, 15, 8), eyes: E(150, 40, 14, 5), ext1: E(212, 52, 13, 13), ext2: E(90, 54, 13, 13) },
  blob: { torso: E(150, 125, 72, 52), jaws: E(214, 120, 22, 12), back: E(150, 72, 44, 14), ext1: E(86, 150, 17, 15), ext2: E(214, 156, 17, 15),
    head: E(215, 90, 22, 18), eyes: E(222, 86, 7, 6), tail: E(70, 110, 30, 9, -20), fore: E(190, 165, 14, 20), hind: E(100, 165, 14, 20) },
};
const ORDER = ['tail', 'hind', 'torso', 'back', 'fore', 'ext1', 'ext2', 'head', 'jaws', 'eyes'];

function hex2rgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
function mix(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
const SHADE = { torso: 0, back: -0.15, head: 0.08, jaws: -0.08, eyes: 0, fore: -0.05, hind: -0.05, tail: -0.12, ext1: 0.1, ext2: 0.1 };

export function partCenter(c, slot) {
  const L = LAYOUTS[c.layout] || LAYOUTS.quad;
  const g = L[slot] || LAYOUTS.quad[slot];
  return g ? { x: g.cx, y: g.cy - g.ry } : { x: 150, y: 100 };
}

// opts: { side:'p'|'e', targetable:bool, flash:{slot:kind}, events:[{side,slot,k,n}], hl:slot }
export function renderCreature(c, opts = {}) {
  const L = LAYOUTS[c.layout] || LAYOUTS.quad;
  const flip = opts.side === 'e';
  let body = '';
  for (const slot of ORDER) {
    const p = c.parts[slot];
    if (!p) continue;
    const g = L[slot] || LAYOUTS.quad[slot];
    if (!g) continue;
    const frac = p.sev ? 0 : Math.max(0, p.hp / p.max);
    const base = mix(c.color, '#ffffff', Math.max(0, SHADE[slot] || 0)) ;
    const shaded = SHADE[slot] < 0 ? mix(c.color, '#000000', -SHADE[slot]) : base;
    const fill = p.sev ? 'none' : mix('#7a1c1c', shaded, 0.25 + 0.75 * frac);
    let stroke = '#10150f', sw = 2;
    const mut = p.muts.length ? MUTS[p.muts[0]] : null;
    if (mut && !p.sev) { stroke = TAGS[mut.tags[0]]?.color || '#fff'; sw = 3; }
    const cls = ['part', p.sev ? 'sev' : '', opts.targetable && !p.sev ? 'tgt' : '', opts.hl === slot ? 'hl' : '', opts.flash && opts.flash[slot] ? 'f-' + opts.flash[slot] : ''].join(' ');
    let shape = `<ellipse cx="${g.cx}" cy="${g.cy}" rx="${g.rx}" ry="${g.ry}" transform="rotate(${g.rot} ${g.cx} ${g.cy})" fill="${fill}" stroke="${p.sev ? '#c2514a' : stroke}" stroke-width="${sw}" ${p.sev ? 'stroke-dasharray="5 4"' : ''} />`;
    if (slot === 'eyes' && !p.sev) shape += `<circle cx="${g.cx + 2}" cy="${g.cy}" r="${Math.min(g.rx, g.ry) * 0.5}" fill="#101010"/><circle cx="${g.cx + 3.5}" cy="${g.cy - 1.2}" r="1.6" fill="#fff"/>`;
    if (!p.sev && frac < 0.65) {
      const n = frac < 0.3 ? 4 : 2; let cr = '';
      for (let i = 0; i < n; i++) { const a = (i + 1) * 1.7 + slot.length; const x = g.cx + Math.cos(a) * g.rx * 0.5, y = g.cy + Math.sin(a) * g.ry * 0.5; cr += `M${x.toFixed(1)} ${y.toFixed(1)} l${(Math.cos(a + 1) * 7).toFixed(1)} ${(Math.sin(a + 1) * 6).toFixed(1)} `; }
      shape += `<path d="${cr}" stroke="#ff7a6a" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".85"/>`;
    }
    if (p.sev) shape += `<path d="M${g.cx - 6} ${g.cy - 6} l12 12 M${g.cx + 6} ${g.cy - 6} l-12 12" stroke="#c2514a" stroke-width="2.2" opacity=".8"/>`;
    // mutation pips
    let pips = '';
    if (!p.sev) p.muts.forEach((m, i) => { const col = TAGS[MUTS[m].tags[0]]?.color || '#fff'; pips += `<circle cx="${g.cx - 6 + i * 12}" cy="${g.cy + g.ry * 0.0}" r="3.4" fill="${col}" stroke="#0b0f0c" stroke-width="1"/>`; });
    body += `<g class="${cls}" data-slot="${slot}" ${opts.targetable && !p.sev ? `data-act="ctarget" data-slot-arg="${slot}"` : ''}><title>${p.label}${p.sev ? ' (severed)' : ` ${p.hp}/${p.max}`}</title>${shape}${pips}</g>`;
  }
  let floats = '';
  for (const e of (opts.events || [])) {
    if (e.side !== opts.side || !e.slot || !c.parts[e.slot]) continue;
    const pc = partCenter(c, e.slot);
    const x = flip ? 300 - pc.x : pc.x;
    let txt = '', col = '#fff';
    if (e.k === 'hit') { txt = '-' + e.n; col = '#ff8a7a'; } else if (e.k === 'crit') { txt = '-' + e.n + '!'; col = '#ffd36b'; }
    else if (e.k === 'miss') { txt = 'miss'; col = '#9aa89c'; } else if (e.k === 'heal') { txt = '+' + e.n; col = '#8fe08a'; }
    else if (e.k === 'sever') { txt = 'SEVERED'; col = '#ff4d4d'; } else if (e.k === 'regrow') { txt = 'regrown'; col = '#8fe08a'; }
    if (txt) floats += `<text class="float" x="${x}" y="${pc.y}" fill="${col}" text-anchor="middle">${txt}</text>`;
  }
  const inner = flip ? `<g transform="translate(300,0) scale(-1,1)">${body}</g>` : body;
  return `<svg class="creature ${opts.side === 'e' ? 'enemy' : 'pet'}" viewBox="0 0 300 220" role="img" aria-label="${c.name} body map"><ellipse cx="150" cy="208" rx="105" ry="8" fill="#000" opacity=".35"/>${inner}${floats}</svg>`;
}
export { SLOT_LABEL };
