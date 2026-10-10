// Mutation overlays: each mutation draws a visible feature attached to the part (slot) it lives on.
import { T, N, S, HL, circ, ell, LINE, teeth, mix } from './kit.js';
import { TAGS } from '../data/mutations.js';

const OA = {
  quad: { head: [236, 52], eyes: [250, 78], jaws: [270, 116], fore: [200, 196], hind: [98, 196], tail: [34, 66], tailBase: [92, 108], back: [150, 70], torso: [150, 116], ext1: [112, 36], ext2: [196, 30], muzzle: [288, 92] },
  lizard: { head: [240, 76], eyes: [250, 88], jaws: [264, 138], fore: [182, 200], hind: [78, 200], tail: [24, 164], tailBase: [84, 130], back: [140, 86], torso: [146, 130], ext1: [100, 58], ext2: [190, 48], muzzle: [284, 106] },
};
export const overlayAnchors = arch => OA[arch] || OA.quad;
const col = t => (TAGS[t] || {}).color || '#fff';
const G = (x, y, s, inner, cls = '') => `<g class="${cls}" transform="translate(${x} ${y}) scale(${s})">${inner}</g>`;

const K = {
  wings: (c, a, i, o) => {
    const wing = `M0 0 C-10 -44 -52 -78 -100 -70 C-86 -58 -86 -46 -88 -38 C-76 -44 -68 -40 -64 -28 C-54 -32 -44 -24 -40 -12 C-32 -16 -22 -12 -14 -2Z`;
    const bones = ['M0 0 L-100 -70', 'M0 0 L-88 -38', 'M0 0 L-64 -28', 'M0 0 L-40 -12'].map(d => S(d, LINE, 2, 'opacity=".5"')).join('');
    const f = o.feather ? `<g class="flap">${T(wing, mix('#ffffff', o.col, 0.4))}${bones}</g>` : `<g class="flap">${T(wing, o.col)}${bones}${HL('M-8 -10 C-24 -40 -50 -56 -78 -60')}</g>`;
    return { b: G(a[0] + 6, a[1] + 8, 1, `<g opacity=".85" transform="translate(26 -6) scale(.8)">${T(wing, mix(o.col, '#000', 0.35))}</g>`), f: G(a[0] - 4, a[1] + 8, 1, f) };
  },
  spines: (c, a, i, o) => { const n = o.n || 5; let s = ''; for (let j = 0; j < n; j++) { const x = a[0] - 40 + j * 20 + i * 4, y = a[1] + 6 - Math.sin((j / (n - 1)) * Math.PI) * 6; s += T(`M${x - 7} ${y + 8} L${x + 1} ${y - 26 - (j % 2) * 8} L${x + 8} ${y + 8}Z`, o.col); } return s; },
  plates: (c, a, i, o) => { const n = o.n || 4; let s = ''; for (let j = 0; j < n; j++) { const x = a[0] - 32 + j * 22 + (o.dx || 0), y = a[1] - 4 + (j % 2) * 8 + i * 6; s += T(`M${x - 11} ${y + 12} C${x - 13} ${y - 10} ${x + 13} ${y - 10} ${x + 11} ${y + 12} C${x + 4} ${y + 18} ${x - 4} ${y + 18} ${x - 11} ${y + 12}Z`, o.col) + S(`M${x - 6} ${y} q6 -6 12 0`, '#fff', 2, 'opacity=".45"') + circ(x, y + 10, 1.8, LINE, 'opacity=".5"'); } return s; },
  horns: (c, a, i, o) => T(`M${a[0] - 18 + i * 4} ${a[1] + 10} C${a[0] - 26} ${a[1] - 14} ${a[0] - 12} ${a[1] - 34} ${a[0] + 4} ${a[1] - 40} C${a[0] - 4} ${a[1] - 24} ${a[0] - 2} ${a[1] - 8} ${a[0] + 2} ${a[1] + 8}Z`, o.col) + T(`M${a[0] + 12} ${a[1] + 8} C${a[0] + 12} ${a[1] - 14} ${a[0] + 24} ${a[1] - 30} ${a[0] + 38} ${a[1] - 32} C${a[0] + 32} ${a[1] - 18} ${a[0] + 32} ${a[1] - 6} ${a[0] + 30} ${a[1] + 10}Z`, o.col),
  fangs: (c, a, i, o) => { const [x, y] = a; let s = T(`M${x - 18} ${y - 4} L${x - 14} ${y + 20} L${x - 9} ${y - 4}Z`, '#fffdf2') + T(`M${x + 2} ${y - 6} L${x + 7} ${y + 18} L${x + 12} ${y - 6}Z`, '#fffdf2'); if (o.drip) s += `<g class="drip"><path d="M${x - 14} ${y + 22} q-4 8 0 11 q4 -3 0 -11Z" fill="${o.col}"/></g><g class="drip d2"><path d="M${x + 7} ${y + 20} q-4 8 0 11 q4 -3 0 -11Z" fill="${o.col}"/></g>`; return s; },
  claws: (c, a, i, o) => { const [x, y] = a; let cl = ''; for (let j = 0; j < 3; j++) cl += T(`M${-12 + j * 12} 0 C${-12 + j * 12} 10 ${-6 + j * 12} 18 ${-2 + j * 12} 24 C${-4 + j * 12} 14 ${-2 + j * 12} 6 ${j * 12} 0Z`, o.col || '#efe6cc'); return (o.glow ? `<circle cx="${x + 6}" cy="${y - 4}" r="22" fill="${o.glow}" opacity=".4" class="pulse"/>` : '') + `<g transform="translate(${x + 12} ${y - 6}) rotate(-78) scale(1.25)">${cl}</g>`; },
  glands: (c, a, i, o) => { const n = o.n || 3; let s = ''; for (let j = 0; j < n; j++) { const x = a[0] - 22 + j * 22, y = a[1] + 4 + (j % 2) * -10 + i * 8, r = 8 - (j % 2) * 2; s += `<g class="pulse" style="animation-delay:${j * .3}s"><circle cx="${x}" cy="${y}" r="${r + 7}" fill="${o.col}" opacity=".3"/>${circ(x, y, r, o.col, `stroke="${LINE}" stroke-width="2.2"`)}${circ(x - 2, y - 2.5, r * 0.32, '#fff', 'opacity=".8"')}</g>`; } return s; },
  flames: (c, a, i, o) => { const [x, y] = a; return [-14, 0, 14].map((dx, j) => `<g transform="translate(${x + dx} ${y + (j === 1 ? -4 : 2)}) scale(${j === 1 ? 1.1 : .8})"><path class="flick ${j % 2 ? 'f2' : ''}" d="M0 0 C-12 -8 -10 -26 0 -44 C4 -30 14 -26 10 -8 C8 -2 4 2 0 0Z" fill="${o.col}" stroke="${LINE}" stroke-width="2" stroke-linejoin="round"/><path class="flick f2" d="M0 -2 C-6 -6 -5 -16 0 -26 C3 -18 8 -14 5 -6Z" fill="#ffe27a"/></g>`).join(''); },
  crystals: (c, a, i, o) => { const [x, y] = a; const sh = (dx, dy, s, r) => `<g transform="translate(${x + dx} ${y + dy}) rotate(${r}) scale(${s})">${T('M-9 0 L-6 -28 L0 -44 L7 -26 L9 0Z', `url(#${c.id}-ice)`)}${S('M-3 -4 L-2 -28', '#fff', 2, 'opacity=".7"')}</g>`; return sh(-26, 8, .8, -28) + sh(0, 4, 1.15, 0) + sh(26, 8, .85, 28); },
  eyeMod: (c, a, i, o) => {
    const [x, y] = a;
    if (o.v === 'hawk') return `<ellipse cx="${x}" cy="${y}" rx="15" ry="16" fill="none" stroke="#ffd23a" stroke-width="3" opacity=".9"/>` + S(`M${x - 18} ${y - 14} L${x + 16} ${y - 22}`, LINE, 4);
    if (o.v === 'compound') { let s = ''; for (let r = -1; r <= 1; r++) for (let q = -1; q <= 1; q++) s += `<circle cx="${x + q * 7}" cy="${y + r * 7}" r="3.2" fill="${o.col}" stroke="${LINE}" stroke-width="1" opacity=".85"/>`; return s; }
    if (o.v === 'hypno') return `<g class="spin" style="transform-origin:${x}px ${y}px"><path d="M${x} ${y} m0 -2 a2 2 0 1 1 -2 2 a5 5 0 1 1 5 5 a9 9 0 1 1 -9 -9 a13 13 0 1 1 13 13" fill="none" stroke="#d8b8ff" stroke-width="2.4" stroke-linecap="round"/></g>`;
    return `<circle cx="${x}" cy="${y}" r="15" fill="none" stroke="#ff5a5a" stroke-width="2"/>` + S(`M${x - 20} ${y} H${x + 20} M${x} ${y - 20} V${y + 20}`, '#ff5a5a', 2);
  },
  thirdEye: (c, a, i, o) => { const [x, y] = a; let s = `<g class="pulse"><circle cx="${x}" cy="${y}" r="26" fill="${o.col}" opacity=".25"/></g>`; for (let r = 0; r < 8; r++) { const an = r * Math.PI / 4; s += S(`M${x + Math.cos(an) * 18} ${y + Math.sin(an) * 18} L${x + Math.cos(an) * 25} ${y + Math.sin(an) * 25}`, o.col, 2.4, 'opacity=".7"'); } return `<g class="float">${s}<ellipse cx="${x}" cy="${y}" rx="13" ry="10" fill="#fffdf4" stroke="${LINE}" stroke-width="2.6"/><circle cx="${x}" cy="${y}" r="6.5" fill="${o.col}"/><circle cx="${x}" cy="${y}" r="3" fill="${LINE}"/><circle cx="${x - 2}" cy="${y - 2}" r="1.5" fill="#fff"/></g>`; },
  rings: (c, a, i, o) => [0, 1, 2].map(j => `<path class="wave" style="animation-delay:${j * .35}s" d="M${a[0] + 8 + j * 12} ${a[1] - 8 - j * 5} q${6 + j * 4} ${8 + j * 5} 0 ${16 + j * 10}" fill="none" stroke="${o.col}" stroke-width="3" stroke-linecap="round"/>`).join(''),
  whiskers: (c, a, i, o) => { const [x, y] = a; return [-8, 0, 8].map(d => S(`M${x} ${y + d * 0.5} C${x + 14} ${y + d} ${x + 22} ${y + d * 1.6} ${x + 28} ${y + d * 2}`, '#f4f0e0', 1.8)).join('') + circ(x + 28, y + 16, 2.4, o.col); },
  tailMod: (c, a, i, o) => {
    const [x, y] = a;
    if (o.v === 'mace') return T(`M${x + 10} ${y + 30} C${x - 8} ${y + 28} ${x - 22} ${y + 14} ${x - 18} ${y - 4} C${x - 6} ${y - 18} ${x + 16} ${y - 12} ${x + 18} ${y + 8}Z`, '#efe6cc') + [[-14, -2], [4, -12], [10, 14], [-6, 14], [-20, 10]].map(([dx, dy]) => T(`M${x + dx - 4} ${y + dy + 4} L${x + dx} ${y + dy - 10} L${x + dx + 5} ${y + dy + 4}Z`, '#d8ceb0')).join('');
    if (o.v === 'stinger') return T(`M${x + 14} ${y + 34} C${x - 6} ${y + 20} ${x - 14} ${y - 4} ${x - 6} ${y - 26} C${x + 2} ${y - 14} ${x + 8} ${y - 4} ${x + 20} ${y + 14}Z`, '#b8d86a') + T(`M${x - 6} ${y - 26} L${x - 10} ${y - 40} L${x + 2} ${y - 22}Z`, '#e8ffb0') + `<g class="drip"><path d="M${x - 9} ${y - 38} q-3 6 0 8 q3 -2 0 -8Z" fill="#9fd34a"/></g>`;
    if (o.v === 'whip') return S(`M${x + 20} ${y + 24} C${x - 8} ${y + 10} ${x - 20} ${y - 14} ${x - 4} ${y - 34}`, LINE, 9) + S(`M${x + 20} ${y + 24} C${x - 8} ${y + 10} ${x - 20} ${y - 14} ${x - 4} ${y - 34}`, o.col, 5) + S(`M${x - 4} ${y - 34} l10 -8 M${x - 4} ${y - 34} l-8 -10`, '#fff6a0', 2.4);
    return `<g class="float" opacity=".75">${[0, 1, 2].map(j => `<path d="M${x + j * 12} ${y + 22} c-10 -16 8 -22 -2 -40" fill="none" stroke="#2a1c3a" stroke-width="9" stroke-linecap="round" opacity=".55"/>`).join('')}</g>`;
  },
  patches: (c, a, i, o) => { const pts = [[-34, -12, 11], [-8, -26, 9], [22, -8, 12], [-20, 14, 8], [34, 14, 9], [6, 22, 7]]; return pts.map(([dx, dy, r], j) => `<ellipse cx="${a[0] + dx}" cy="${a[1] + dy}" rx="${r}" ry="${r * .75}" fill="${o.col}" opacity="${o.op || .55}"/>`).join(''); },
  stitches: (c, a, i, o) => { const [x, y] = a; let s = S(`M${x - 34} ${y - 6} C${x - 10} ${y - 16} ${x + 12} ${y - 14} ${x + 34} ${y - 2}`, '#2a1210', 2.4); for (let j = 0; j < 6; j++) s += S(`M${x - 28 + j * 11} ${y - 12 + Math.abs(j - 2.5)} l4 8`, '#2a1210', 2); return s + `<rect x="${x + 6}" y="${y + 10}" width="24" height="12" rx="3" fill="#ffd8a8" stroke="${LINE}" stroke-width="2" transform="rotate(-12 ${x + 18} ${y + 16})"/>`; },
  moss: (c, a, i, o) => [[-30, 2, 12], [-8, -6, 14], [16, 0, 12], [34, 6, 10]].map(([dx, dy, r], j) => T(`M${a[0] + dx - r} ${a[1] + dy + 8} C${a[0] + dx - r} ${a[1] + dy - r} ${a[0] + dx + r} ${a[1] + dy - r} ${a[0] + dx + r} ${a[1] + dy + 8}Z`, j % 2 ? '#6fae4a' : '#8ac860')).join('') + circ(a[0] + 4, a[1] - 14, 3, '#ffe0f0') + circ(a[0] - 22, a[1] - 8, 2.5, '#ffe0f0'),
  gillslits: (c, a, i, o) => [0, 1, 2].map(j => S(`M${a[0] + 26 + j * 7} ${a[1] - 18 + j * 2} q-4 14 0 28`, '#c0485e', 4.4) + S(`M${a[0] + 26 + j * 7} ${a[1] - 18 + j * 2} q-4 14 0 28`, '#ff8aa0', 2)).join(''),
  webfoot: (c, a, i, o) => T(`M${a[0] - 18} ${a[1] + 4} L${a[0] - 28} ${a[1] + 16} Q${a[0] - 8} ${a[1] + 24} ${a[0] + 16} ${a[1] + 16} L${a[0] + 12} ${a[1] + 2}Z`, '#6fc0d8', 'opacity=".9"'),
  pincer: (c, a, i, o) => T(`M${a[0] - 12} ${a[1] - 10} C${a[0] - 8} ${a[1] - 34} ${a[0] + 24} ${a[1] - 36} ${a[0] + 30} ${a[1] - 14} C${a[0] + 18} ${a[1] - 20} ${a[0] + 8} ${a[1] - 14} ${a[0] + 4} ${a[1] - 6}Z`, '#c8643a') + T(`M${a[0] - 10} ${a[1] - 4} C${a[0]} ${a[1] + 10} ${a[0] + 24} ${a[1] + 8} ${a[0] + 30} ${a[1] - 8} C${a[0] + 20} ${a[1] - 8} ${a[0] + 10} ${a[1] - 6} ${a[0] + 4} ${a[1] - 6}Z`, '#a8482a'),
  ribs: (c, a, i, o) => [0, 1, 2, 3].map(j => S(`M${a[0] - 18 + j * 14} ${a[1] - 22} q-8 20 4 40`, LINE, 7, 'opacity=".9"') + S(`M${a[0] - 18 + j * 14} ${a[1] - 22} q-8 20 4 40`, '#efe6cf', 4)).join(''),
  drum: (c, a, i, o) => [26, 17, 8].map((r, j) => `<circle class="wave2" style="animation-delay:${j * .25}s" cx="${a[0]}" cy="${a[1]}" r="${r}" fill="none" stroke="${o.col}" stroke-width="3" opacity=".8"/>`).join('') + circ(a[0], a[1], 4, o.col),
  bell: (c, a, i, o) => S(`M${a[0]} ${a[1] + 4} V${a[1] - 14}`, LINE, 3) + T(`M${a[0] - 16} ${a[1] + 22} C${a[0] - 16} ${a[1] + 2} ${a[0] - 10} ${a[1] - 8} ${a[0]} ${a[1] - 8} C${a[0] + 10} ${a[1] - 8} ${a[0] + 16} ${a[1] + 2} ${a[0] + 16} ${a[1] + 22}Z`, '#e8d890') + circ(a[0], a[1] + 24, 3.5, '#c8b050', `stroke="${LINE}" stroke-width="1.6"`),
  crown: (c, a, i, o) => T(`M${a[0] - 24} ${a[1] + 12} L${a[0] - 22} ${a[1] - 18} L${a[0] - 10} ${a[1] - 2} L${a[0]} ${a[1] - 26} L${a[0] + 10} ${a[1] - 2} L${a[0] + 22} ${a[1] - 18} L${a[0] + 24} ${a[1] + 12}Z`, o.fill || '#5a1018') + circ(a[0], a[1] - 4, 4, '#ff3a4a') + `<g class="drip"><path d="M${a[0] + 12} ${a[1] + 14} q-4 9 0 12 q4 -3 0 -12Z" fill="#ff3a4a"/></g>`,
  maw: (c, a, i, o) => teeth(a[0] - 22, a[1] - 6, 5, 7, 9) + teeth(a[0] - 18, a[1] + 14, 4, 6, 9, 1).replace(/l(-?[\d.]+) (-?[\d.]+) l(-?[\d.]+) (-?[\d.]+)/g, 'l$1 -$2 l$3 $4'),
  void: (c, a, i, o) => `<g class="pulse"><circle cx="${a[0]}" cy="${a[1] - 6}" r="26" fill="${o.col}" opacity=".25"/>${circ(a[0], a[1] - 6, 13, '#0a0610', `stroke="${o.col}" stroke-width="3"`)}</g><g class="spin" style="transform-origin:${a[0]}px ${a[1] - 6}px"><ellipse cx="${a[0]}" cy="${a[1] - 6}" rx="24" ry="8" fill="none" stroke="${o.col}" stroke-width="2.4" opacity=".8"/></g>`,
  heart: (c, a, i, o) => `<g class="pulse"><circle cx="${a[0]}" cy="${a[1]}" r="28" fill="${o.col}" opacity=".28"/>${T(`M${a[0]} ${a[1] + 15} C${a[0] - 24} ${a[1] - 4} ${a[0] - 24} ${a[1] - 22} ${a[0] - 9} ${a[1] - 22} C${a[0] - 2} ${a[1] - 22} ${a[0]} ${a[1] - 15} ${a[0]} ${a[1] - 13} C${a[0]} ${a[1] - 15} ${a[0] + 2} ${a[1] - 22} ${a[0] + 9} ${a[1] - 22} C${a[0] + 24} ${a[1] - 22} ${a[0] + 24} ${a[1] - 4} ${a[0]}  ${a[1] + 15}Z`, o.col)}${o.cracks ? S(`M${a[0] - 8} ${a[1] - 14} l6 10 l-4 8`, '#b8ff60', 2) : HL(`M${a[0] - 12} ${a[1] - 14} q-4 4 -2 8`)}</g>`,
  lamprey: (c, a, i, o) => `<circle cx="${a[0] - 4}" cy="${a[1] + 14}" r="15" fill="#6a1f35" stroke="${LINE}" stroke-width="2.6"/><circle cx="${a[0] - 4}" cy="${a[1] + 14}" r="8" fill="#2a0810"/>` + [0, 1, 2, 3, 4, 5].map(j => { const an = j * Math.PI / 3; return S(`M${a[0] - 4 + Math.cos(an) * 14} ${a[1] + 14 + Math.sin(an) * 14} L${a[0] - 4 + Math.cos(an) * 7} ${a[1] + 14 + Math.sin(an) * 7}`, '#fffdf2', 2.6); }).join(''),
  worm: (c, a, i, o) => S(`M${a[0] + 4} ${a[1] + 30} C${a[0] - 16} ${a[1] + 14} ${a[0] + 16} ${a[1]} ${a[0] - 4} ${a[1] - 18}`, LINE, 9) + S(`M${a[0] + 4} ${a[1] + 30} C${a[0] - 16} ${a[1] + 14} ${a[0] + 16} ${a[1]} ${a[0] - 4} ${a[1] - 18}`, '#e8a0c0', 5.5) + circ(a[0] - 4, a[1] - 18, 3.5, '#e8a0c0', `stroke="${LINE}" stroke-width="2"`),
  pouch: (c, a, i, o) => `<g class="pulse">${T(`M${a[0] - 24} ${a[1] + 16} C${a[0] - 30} ${a[1] - 20} ${a[0] + 30} ${a[1] - 20} ${a[0] + 24} ${a[1] + 16} C${a[0] + 10} ${a[1] + 24} ${a[0] - 10} ${a[1] + 24} ${a[0] - 24} ${a[1] + 16}Z`, '#d880a0')}${circ(a[0] - 8, a[1] - 2, 5, '#f0b0c8', 'opacity=".8"')}${circ(a[0] + 10, a[1] + 4, 4, '#f0b0c8', 'opacity=".8"')}</g>`,
  orb: (c, a, i, o) => `<g class="float"><circle cx="${a[0]}" cy="${a[1]}" r="24" fill="url(#${c.id}-gl)" opacity=".7"/>${circ(a[0], a[1], 11, o.col, `stroke="${LINE}" stroke-width="2.4"`)}${circ(a[0] - 3, a[1] - 3, 3, '#fff', 'opacity=".8"')}${o.cross ? S(`M${a[0]} ${a[1] - 6} v12 M${a[0] - 6} ${a[1]} h12`, '#fff', 2.6) : ''}</g>`,
  sparks: (c, a, i, o) => `<g class="pulse"><circle cx="${a[0]}" cy="${a[1]}" r="22" fill="#ffe45a" opacity=".3"/>${T(`M${a[0] - 12} ${a[1] + 8} C${a[0] - 14} ${a[1] - 8} ${a[0] - 4} ${a[1] - 14} ${a[0] + 4} ${a[1] - 12} C${a[0] + 14} ${a[1] - 10} ${a[0] + 16} ${a[1]} ${a[0] + 12} ${a[1] + 8} C${a[0] + 6} ${a[1] + 14} ${a[0] - 6} ${a[1] + 14} ${a[0] - 12} ${a[1] + 8}Z`, '#ffe45a')}${S(`M${a[0] - 6} ${a[1] - 2} l5 -5 l-2 8 l6 -4`, LINE, 2)}</g>` + S(`M${a[0] + 16} ${a[1] - 14} l8 -8 M${a[0] - 18} ${a[1] - 16} l-8 -8`, '#fff6a0', 2.4, 'class="flick"'),
  helmet: (c, a, i, o) => T(`M${a[0] - 36} ${a[1] + 34} C${a[0] - 40} ${a[1] - 6} ${a[0] - 14} ${a[1] - 18} ${a[0] + 10} ${a[1] - 16} C${a[0] + 34} ${a[1] - 14} ${a[0] + 48} ${a[1] + 6} ${a[0] + 46} ${a[1] + 30} C${a[0] + 20} ${a[1] + 18} ${a[0] - 14} ${a[1] + 20} ${a[0] - 36} ${a[1] + 34}Z`, o.col, 'opacity=".95"') + S(`M${a[0] - 12} ${a[1] - 14} l8 18 M${a[0] + 14} ${a[1] - 14} l-4 14`, LINE, 2, 'opacity=".5"') + HL(`M${a[0] - 24} ${a[1] + 4} q14 -14 36 -10`),
  dishEars: (c, a, i, o) => T(`M${a[0] - 24} ${a[1] + 18} C${a[0] - 40} ${a[1] - 20} ${a[0] - 20} ${a[1] - 44} ${a[0] - 6} ${a[1] - 44} C${a[0] + 2} ${a[1] - 28} ${a[0] + 4} ${a[1] - 6} ${a[0] + 2} ${a[1] + 14}Z`, o.col) + S(`M${a[0] - 16} ${a[1] + 6} q4 -20 14 -30`, '#fff', 2, 'opacity=".5"'),
  lightning: (c, a, i, o) => S(`M${a[0] - 4} ${a[1] - 4} l8 12 l-6 2 l8 14`, '#fff6a0', 3.2, 'class="flick"') + S(`M${a[0] - 4} ${a[1] - 4} l8 12 l-6 2 l8 14`, '#ffd23a', 1.4),
  aura: (c, a, i, o) => [[-44, -10], [40, 6], [-20, 34], [28, -30], [-4, -38]].map(([dx, dy], j) => `<g class="float" style="animation-delay:${j * .4}s">${S(`M${a[0] + dx} ${a[1] + dy - 7} v14 M${a[0] + dx - 6} ${a[1] + dy - 3.5} l12 7 M${a[0] + dx - 6} ${a[1] + dy + 3.5} l12 -7`, '#e8fbff', 2.4)}</g>`).join(''),
  spores: (c, a, i, o) => [[-26, -26, 7], [4, -40, 9], [30, -22, 6], [-8, -18, 5]].map(([dx, dy, r], j) => `<g class="float" style="animation-delay:${j * .35}s">${circ(a[0] + dx, a[1] + dy, r, o.col, 'opacity=".7"')}${circ(a[0] + dx - r * .3, a[1] + dy - r * .3, r * .3, '#fff', 'opacity=".6"')}</g>`).join(''),
  scales: (c, a, i, o) => { let s = ''; for (let r = 0; r < 3; r++) for (let q = 0; q < 6; q++) { const x = a[0] - 40 + q * 16 + (r % 2) * 8, y = a[1] - 24 + r * 15; s += `<path d="M${x - 8} ${y} q8 14 16 0" fill="${o.col}" stroke="${LINE}" stroke-width="1.8" opacity=".92"/>`; } return s; },
  coil: (c, a, i, o) => S(`M${a[0] - 14} ${a[1] - 40} l10 8 l-12 8 l12 8 l-10 8`, '#d0d0d8', 4, `stroke-opacity=".95"`) + S(`M${a[0] - 40} ${a[1] - 20} h-14 M${a[0] - 40} ${a[1] - 8} h-20`, '#fff6a0', 2.4, 'opacity=".7"'),
  greaves: (c, a, i, o) => T(`M${a[0] - 18} ${a[1] - 38} L${a[0] + 14} ${a[1] - 38} L${a[0] + 12} ${a[1] - 10} L${a[0] - 16} ${a[1] - 10}Z`, o.col) + S(`M${a[0] - 14} ${a[1] - 28} H${a[0] + 10}`, LINE, 2, 'opacity=".4"'),
  knuckles: (c, a, i, o) => T(`M${a[0] - 18} ${a[1] - 18} L${a[0] + 16} ${a[1] - 18} L${a[0] + 14} ${a[1] - 4} L${a[0] - 16} ${a[1] - 4}Z`, o.col) + [-10, 0, 10].map(d => circ(a[0] + d, a[1] - 11, 2.4, LINE, 'opacity=".6"')).join(''),
  shield: (c, a, i, o) => T(`M${a[0] - 30} ${a[1] - 14} C${a[0] - 30} ${a[1] + 20} ${a[0] - 10} ${a[1] + 26} ${a[0]} ${a[1] + 32} C${a[0] + 10} ${a[1] + 26} ${a[0] + 30} ${a[1] + 20} ${a[0] + 30} ${a[1] - 14} C${a[0] + 12} ${a[1] - 20} ${a[0] - 12} ${a[1] - 20} ${a[0] - 30} ${a[1] - 14}Z`, o.col) + S(`M${a[0]} ${a[1] - 16} V${a[1] + 28}`, LINE, 2, 'opacity=".35"') + HL(`M${a[0] - 22} ${a[1] - 8} q8 -6 18 -6`),
  drips: (c, a, i, o) => [0, 1, 2].map(j => `<g class="drip" style="animation-delay:${j * .4}s"><path d="M${a[0] - 8 + j * 12} ${a[1] + 18} q-4 8 0 11 q4 -3 0 -11Z" fill="${o.col}"/></g>`).join('') + circ(a[0] - 14, a[1] - 4, 6, o.col, 'opacity=".7"') + circ(a[0] + 8, a[1] - 8, 5, o.col, 'opacity=".7"'),
  whistle: (c, a, i, o) => `<g class="float">${T(`M${a[0] - 12} ${a[1] + 8} L${a[0] + 14} ${a[1] - 8} L${a[0] + 14} ${a[1] + 10}Z`, '#cfe4ff')}${circ(a[0] - 4, a[1] + 2, 3, LINE)}${S(`M${a[0] + 18} ${a[1] - 14} q6 4 0 10 M${a[0] + 24} ${a[1] - 18} q8 6 0 14`, o.col, 2.4)}</g>`,
  teethRing: (c, a, i, o) => `<g class="spin" style="transform-origin:${a[0]}px ${a[1]}px">` + [0, 1, 2, 3, 4, 5].map(j => { const an = j * Math.PI / 3; return `<g transform="translate(${a[0] + Math.cos(an) * 18} ${a[1] + Math.sin(an) * 18}) rotate(${j * 60 + 90})">${T('M-5 4 L0 -10 L5 4Z', '#fffdf2')}</g>`; }).join('') + `</g>` + circ(a[0], a[1], 5, '#a01828'),
  flower: (c, a, i, o) => `<g class="pulse">` + [0, 1, 2, 3, 4].map(j => `<g transform="translate(${a[0]} ${a[1]}) rotate(${j * 72})">${T('M0 0 C-9 -8 -8 -22 0 -30 C8 -22 9 -8 0 0Z', j % 2 ? '#ff7ab0' : '#ff9ac8')}</g>`).join('') + circ(a[0], a[1], 7, '#ffe27a', `stroke="${LINE}" stroke-width="2"`) + `</g>`,
  glowTorso: (c, a, i, o) => `<g class="pulse"><ellipse cx="${a[0]}" cy="${a[1]}" rx="34" ry="22" fill="${o.col}" opacity=".3"/></g>` + (o.cracks ? S(`M${a[0] - 24} ${a[1] - 8} l10 10 l-4 10 l12 8 M${a[0] + 4} ${a[1] - 18} l6 14 l-8 8 l10 8 M${a[0] + 26} ${a[1] - 8} l-8 12`, o.col, 4) + S(`M${a[0] - 24} ${a[1] - 8} l10 10 l-4 10 l12 8 M${a[0] + 4} ${a[1] - 18} l6 14 l-8 8 l10 8 M${a[0] + 26} ${a[1] - 8} l-8 12`, '#fff1b0', 1.4) : ''),
  voidHole: (c, a, i, o) => `<ellipse cx="${a[0]}" cy="${a[1]}" rx="22" ry="16" fill="#0a0610" stroke="${o.col}" stroke-width="3"/><g class="spin" style="transform-origin:${a[0]}px ${a[1]}px"><path d="M${a[0] - 14} ${a[1]} a14 10 0 0 1 28 0" fill="none" stroke="${o.col}" stroke-width="2" opacity=".7"/></g>`,
};

const OV = {
  venom_fangs: ['fangs', 'venom', { drip: 1 }], toxic_glands: ['glands', 'venom', { n: 3 }], barbed_stinger: ['tailMod', 'venom', { v: 'stinger' }], neurotoxin_sac: ['glands', 'venom', { n: 2 }],
  bile_spitter: ['drips', 'venom', {}], ember_glands: ['glands', 'fire', { n: 3 }], furnace_maw: ['flames', 'fire', {}], magma_blood: ['glowTorso', 'fire', { cracks: 1 }], cinder_hide: ['scales', 'fire', {}],
  scorching_claws: ['claws', 'fire', { glow: '#ff8a30', col: '#ffd0a0' }], rime_maw: ['fangs', 'frost', {}], glacial_carapace: ['crystals', 'frost', {}], chill_aura: ['aura', 'frost', {}], hoar_talons: ['claws', 'frost', { col: '#d8f4ff', glow: '#8fd3f0' }],
  chitin_carapace: ['plates', 'armor', { n: 4, col: '#8a7a5a' }], scrap_plates: ['plates', 'armor', { n: 3, col: '#8c8c88' }], shale_skull: ['helmet', 'armor', { col: '#8a8a84' }], iron_greaves: ['greaves', 'armor', { col: '#9a9a96' }],
  bulwark_shell: ['shield', 'armor', { col: '#a0a096' }], slag_knuckles: ['knuckles', 'armor', { col: '#7a6a62' }], spring_haunches: ['coil', 'speed', {}], adrenal_gland: ['glands', 'speed', { n: 2 }],
  whiplash_tail: ['tailMod', 'speed', { v: 'whip' }], flicker_nerves: ['lightning', 'speed', {}], reaper_scythes: ['claws', 'speed', { col: '#e8e8f0', glow: '#f2d64b' }],
  hawk_eyes: ['eyeMod', 'sensory', { v: 'hawk' }], compound_eyes: ['eyeMod', 'sensory', { v: 'compound' }], whisker_array: ['whiskers', 'sensory', {}], pit_organs: ['glands', 'sensory', { n: 2 }], weakpoint_sight: ['eyeMod', 'sensory', { v: 'cross' }],
  knitting_flesh: ['stitches', 'regen', {}], hydra_cells: ['glands', 'regen', { n: 4 }], mending_moss: ['moss', 'regen', {}], second_wind: ['orb', 'regen', { cross: 1 }], clotting_blood: ['patches', 'regen', { col: '#8a2a30', op: .7 }],
  leech_mouth: ['lamprey', 'parasite', {}], symbiotic_lichen: ['patches', 'parasite', { col: '#d8a050', op: .75 }], brood_pouch: ['pouch', 'parasite', {}], mind_worm: ['worm', 'parasite', {}],
  gills: ['gillslits', 'aquatic', {}], webbed_hindfeet: ['webfoot', 'aquatic', {}], electric_organ: ['sparks', 'aquatic', {}], ink_sac: ['drips', 'aquatic', { colOverride: '#2a1a4a' }], crushing_pincer: ['pincer', 'aquatic', {}],
  membrane_wings: ['wings', 'flight', { col: '#a07a5a' }], glide_flaps: ['wings', 'flight', { col: '#b89a70', small: 1 }], raptor_talons: ['claws', 'flight', { col: '#e8dcb8' }], hollow_bones: ['wings', 'flight', { col: '#e8e0c8', feather: 1, small: 1 }],
  third_eye: ['thirdEye', 'psychic', {}], hypnotic_gaze: ['eyeMod', 'psychic', { v: 'hypno' }], dream_spores: ['spores', 'psychic', {}], psychic_resonator: ['rings', 'psychic', {}],
  spinal_spikes: ['spines', 'bone', { col: '#efe6cf' }], bone_mace_tail: ['tailMod', 'bone', { v: 'mace' }], marrow_horns: ['horns', 'bone', { col: '#efe6cf' }], dense_marrow: ['patches', 'bone', { col: '#efe6cf', op: .8 }], rib_cage: ['ribs', 'bone', {}],
  resonant_larynx: ['rings', 'sonic', {}], echo_pits: ['dishEars', 'sonic', { col: '#b8c0f0' }], subsonic_drum: ['drum', 'sonic', {}], glass_whistle: ['whistle', 'sonic', {}], bell_skull: ['bell', 'sonic', {}],
  chameleon_skin: ['patches', 'camo', { col: '#9ae0a0', op: .45 }], pale_hide: ['patches', 'camo', { col: '#f4f0e0', op: .55 }], mottled_fur: ['patches', 'camo', { col: '#5a7a48', op: .6 }], shadow_tail: ['tailMod', 'camo', { v: 'shadow' }],
  hungry_maw: ['maw', 'cursed', {}], bloodlust_gland: ['glands', 'cursed', { n: 2 }], wailing_crown: ['crown', 'cursed', {}], rotting_heart: ['heart', 'cursed', { cracks: 1, colOverride: '#7a1a2a' }],
  pact_of_teeth: ['teethRing', 'cursed', {}], hollow_hunger: ['voidHole', 'cursed', {}], void_pulse: ['void', 'cursed', {}],
  hydra_crown: ['crown', 'legend', { fill: '#d8a830' }], choir_heart: ['heart', 'legend', {}], wyrm_scale: ['scales', 'fire', { col: '#c0452a' }], bloom_heart: ['flower', 'legend', {}],
};
// slot-specific anchor choice for kinds that live in different places
const ANCH = { fangs: 'jaws', claws: null, glands: null, flames: 'jaws', rings: null, drips: null };

export function overlayFor(c, arch, slot, mutId, idx, M) {
  const spec = OV[mutId];
  const O = OA[arch] || OA.quad;
  const tags = (M && M.tags) || [];
  const [kind, tag, o0] = spec || ['glands', tags[0] || 'legend', { n: 2 }];
  const o = { col: col(tag), ...o0 };
  if (o.colOverride) o.col = o.colOverride;
  let a = O[slot] || O.torso;
  // sensible anchors for a few kinds
  if (kind === 'rings' && slot === 'jaws') a = [O.jaws[0] + 6, O.jaws[1] + 4];
  if (kind === 'rings' && slot === 'head') a = [O.head[0] + 40, O.head[1] + 20];
  if (kind === 'flames') a = [O.jaws[0] + 10, O.jaws[1] + 6];
  if (kind === 'drips' && slot === 'head') a = [O.jaws[0], O.jaws[1] + 6];
  if (kind === 'drips' && slot === 'back') a = [O.back[0], O.back[1] + 10];
  if (kind === 'claws' && slot === 'fore') a = [O.fore[0] + 2, O.fore[1]];
  if (kind === 'claws' && slot === 'hind') a = [O.hind[0] - 2, O.hind[1]];
  if (kind === 'whiskers') a = O.muzzle;
  if (kind === 'lamprey') a = [O.jaws[0] + 0, O.jaws[1] + 6];
  if (kind === 'worm') a = [O.head[0] - 6, O.head[1] + 6];
  if (kind === 'eyeMod') a = O.eyes;
  if (kind === 'greaves' || kind === 'coil') a = [O.hind[0], O.hind[1] - 6];
  if (kind === 'knuckles') a = [O.fore[0], O.fore[1] - 30];
  if (kind === 'gillslits') a = [O.torso[0] + 18, O.torso[1] - 6];
  if (kind === 'ribs') a = [O.torso[0], O.torso[1] + 2];
  if (kind === 'webfoot') a = O.hind;
  if (kind === 'pincer') a = [O.fore[0], O.fore[1] - 4];
  if (kind === 'tailMod') a = O.tail;
  if (kind === 'wings') { a = O.back; if (o.small) o.sc = 0.7; }
  if (idx > 0 && ['plates', 'glands', 'patches', 'scales', 'spines'].includes(kind)) a = [a[0], a[1] + 8 * idx];
  const r = K[kind](c, a, idx, o);
  const sc = (SC[kind] || 1.25) * (kind === 'wings' && o.small ? 0.8 : 1);
  const wrap = str => str ? `<g transform="translate(${a[0]} ${a[1]}) scale(${sc}) translate(${-a[0]} ${-a[1]})">${str}</g>` : '';
  return typeof r === 'object' ? { b: wrap(r.b), f: wrap(r.f) } : wrap(r);
}
const SC = { fangs: 1.7, claws: 1, glands: 1.5, flames: 1.9, crystals: 1.5, plates: 1.35, spines: 1.4, horns: 1.4, helmet: 1.1, greaves: 1.6, knuckles: 1.6, coil: 1.4, lightning: 2.2, eyeMod: 1.4, whiskers: 1.6, tailMod: 1.5, stitches: 1.3, patches: 1.3, moss: 1.4, gillslits: 1.5, webfoot: 1.8, pincer: 1.7, ribs: 1.3, drum: 1.2, bell: 1.6, crown: 1.6, maw: 1.6, thirdEye: 1.3, rings: 1.5, sparks: 1.5, orb: 1.4, pouch: 1.4, lamprey: 1.5, worm: 1.4, spores: 1.4, aura: 1.4, scales: 1.2, teethRing: 1.4, heart: 1.3, flower: 1.8, voidHole: 1.2, void: 1.3, whistle: 1.6, dishEars: 1.5, shield: 1.3, drips: 1.6, wings: 1.3 };
export const overlayKind = id => (OV[id] || [])[0] || 'glands';
