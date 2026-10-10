// Per-species art: archetype + palette + options + decorations (attached to a slot, so they sever/highlight with it).
import { T, N, S, HL, circ, ell, LINE, makePal, mix } from './kit.js';

const flame = (x, y, s, col, k) => `<g transform="translate(${x} ${y}) scale(${s})"><path class="flick" d="M0 0 C-14 -10 -12 -30 0 -52 C4 -36 16 -30 12 -10 C10 -2 4 2 0 0Z" fill="${col}" stroke="${LINE}" stroke-width="2.2" stroke-linejoin="round"/><path class="flick f2" d="M0 -2 C-7 -8 -6 -20 0 -32 C3 -22 9 -18 6 -8Z" fill="#ffe27a"/></g>`;
const leaf = (x, y, r, fill) => `<g transform="translate(${x} ${y}) rotate(${r})">${T('M0 0 C-12 -10 -10 -30 0 -42 C10 -30 12 -10 0 0Z', fill)}${S('M0 -2 L0 -34', LINE, 1.4, 'opacity=".4"')}</g>`;
const crystal = (x, y, s, id, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})">${T('M-9 0 L-6 -26 L0 -40 L7 -24 L9 0Z', `url(#${id}-cr)`)}${S('M-3 -4 L-2 -26', '#fff', 2, 'opacity=".6"')}</g>`;

export const DECO = {
  leaves: (k, sl) => { const [x, y] = k.A.back; return leaf(x - 30, y + 8, -50, k.P.accent) + leaf(x + 26, y + 8, 50, k.P.accent) + leaf(x - 4, y + 4, -8, mix(k.P.accent, '#fff', 0.2)); },
  flameTail: k => { const [x, y] = k.A.tail; return flame(x + 6, y + 4, 1.5, '#ff7a1c', k) + flame(x - 8, y + 12, 1, '#ff4a1c', k); },
  wispTail: k => { const [x, y] = k.A.tail; return flame(x + 4, y + 2, 1.3, '#b070ff', k) + flame(x - 10, y + 12, 0.9, '#7a4ad0', k); },
  emberCheek: k => `<circle cx="226" cy="108" r="6" fill="#ffb030" opacity=".85"/><circle cx="226" cy="108" r="12" fill="url(#${k.id}-gl)"/>`,
  jewel: k => `<g transform="translate(238 52)"><circle r="14" fill="url(#${k.id}-gl)"/>${T('M0 -9 L7 0 L0 9 L-7 0Z', '#e8b8ff')}${S('M-2 -4 L0 -7', '#fff', 1.6)}</g>`,
  shell: k => N('M100 116 C92 66 120 38 154 38 C190 38 216 66 208 116 C190 104 118 104 100 116Z', 'url(#' + k.id + '-a)', `stroke="${LINE}" stroke-width="3.2" stroke-linejoin="round"`) + S('M154 40 L154 108 M122 54 C124 76 128 94 134 108 M186 54 C184 76 180 94 174 108 M104 84 C130 92 178 92 206 84', LINE, 2.2, 'opacity=".5"') + HL('M114 70 C124 52 146 44 166 46'),
  crystalsBack: k => { const [x, y] = k.A.back; return crystal(x - 30, y + 14, 1, k.id, -25) + crystal(x, y + 12, 1.3, k.id) + crystal(x + 32, y + 16, 0.9, k.id, 25); },
  spikes: k => { const [x, y] = k.A.back; let s = ''; for (let i = -3; i <= 3; i++) s += T(`M${x + i * 15 - 7} ${y + 14} L${x + i * 15} ${y - 10 + Math.abs(i) * 4} L${x + i * 15 + 7} ${y + 14}Z`, k.fa); return s; },
  warts: k => [[110, 94, 5], [150, 86, 6], [186, 98, 4.5], [130, 112, 4], [172, 116, 5]].map(([x, y, r]) => circ(x, y, r, k.P.accent, `stroke="${LINE}" stroke-width="1.6" opacity=".95"`)).join(''),
  spots: k => [[110, 100, 7], [140, 88, 9], [176, 100, 7], [160, 130, 6], [118, 128, 5]].map(([x, y, r]) => circ(x, y, r, k.P.accent, 'opacity=".75"')).join(''),
  stripes: k => [0, 1, 2, 3].map(i => S(`M${108 + i * 24} 84 C${112 + i * 24} 100 ${108 + i * 24} 120 ${112 + i * 24} 136`, k.P.accent, 7, 'opacity=".7"')).join(''),
  lava: k => `<g class="pulse">${S('M110 100 L128 112 L124 128 L142 138 M150 80 L158 98 L148 112 L166 124 M184 96 L176 112 L192 126', k.P.glow, 4.5)}${S('M110 100 L128 112 L124 128 L142 138 M150 80 L158 98 L148 112 L166 124 M184 96 L176 112 L192 126', '#fff1b0', 1.6)}</g>`,
  lavaGolem: k => `<g class="pulse">${S('M112 76 L132 100 L124 126 L146 146 M176 74 L168 104 L184 122 M150 60 L152 90', k.P.glow, 5)}${S('M112 76 L132 100 L124 126 L146 146 M176 74 L168 104 L184 122 M150 60 L152 90', '#fff1b0', 1.8)}</g>`,
  gills: k => { const [x, y] = [206, 92]; const g = (a) => `<g transform="rotate(${a} ${x} ${y})">${S(`M${x} ${y} C${x - 14} ${y - 10} ${x - 24} ${y - 12} ${x - 36} ${y - 8}`, LINE, 7)}${S(`M${x} ${y} C${x - 14} ${y - 10} ${x - 24} ${y - 12} ${x - 36} ${y - 8}`, k.P.accent, 3.6)}${circ(x - 36, y - 8, 4.2, mix(k.P.accent, '#fff', 0.3), `stroke="${LINE}" stroke-width="1.8"`)}</g>`; return g(-34) + g(-6) + g(22); },
  moleNose: k => `<ellipse cx="292" cy="90" rx="8" ry="6.5" fill="#f2a0aa" stroke="${LINE}" stroke-width="2.4"/>`,
  spadeClaws: k => { const [x, y] = [214, 202]; return [0, 1, 2].map(i => T(`M${196 + i * 12} 196 L${202 + i * 12} 214 L${208 + i * 12} 196Z`, '#efe6cc')).join(''); },
  sacBack: k => { const [x, y] = k.A.back; return T(`M${x - 22} ${y + 20} C${x - 32} ${y - 20} ${x + 32} ${y - 20} ${x + 22} ${y + 20}Z`, '#a3c850') + circ(x - 6, y - 2, 4, '#e8ff90', 'opacity=".8"') + circ(x + 8, y + 6, 3, '#e8ff90', 'opacity=".8"'); },
  bloom: k => { const [x, y] = k.A.back; return `<g class="pulse">` + [-60, -30, 0, 30, 60].map(a => `<g transform="translate(${x} ${y + 12}) rotate(${a})">${T('M0 0 C-12 -10 -10 -34 0 -48 C10 -34 12 -10 0 0Z', a % 60 ? '#ff7ab0' : '#e0508a')}</g>`).join('') + circ(x, y + 8, 7, '#ffe27a', `stroke="${LINE}" stroke-width="2"`) + `</g>`; },
  heartGlow: k => `<g class="pulse"><circle cx="150" cy="116" r="28" fill="url(#${k.id}-gl)"/>${T('M150 132 C128 114 128 96 142 96 C148 96 150 102 150 104 C150 102 152 96 158 96 C172 96 172 114 150 132Z', '#ff5a8a')}</g>`,
  horns: k => { const [x, y] = k.A.head; return T(`M${x - 22} ${y - 20} C${x - 26} ${y - 44} ${x - 14} ${y - 60} ${x - 2} ${y - 66} C${x - 8} ${y - 48} ${x - 4} ${y - 36} ${x + 2} ${y - 28}Z`, k.P.horn) + T(`M${x + 14} ${y - 26} C${x + 14} ${y - 48} ${x + 24} ${y - 60} ${x + 34} ${y - 64} C${x + 32} ${y - 46} ${x + 32} ${y - 36} ${x + 28} ${y - 26}Z`, k.P.horn); },
  hornsSerpent: k => '', 
  mane: k => { const [x, y] = k.A.head; return `<g class="flick f2">${T(`M${x - 40} ${y + 8} C${x - 60} ${y - 8} ${x - 54} ${y - 40} ${x - 40} ${y - 52} C${x - 34} ${y - 36} ${x - 24} ${y - 40} ${x - 18} ${y - 56} C${x - 14} ${y - 36} ${x - 4} ${y - 34} ${x} ${y - 38} C${x - 6} ${y - 18} ${x - 16} ${y - 4} ${x - 24} ${y + 14}Z`, '#ff7a30')}</g>`; },
  scythes: k => '',
  plates: k => { const [x, y] = k.A.back; return [0, 1, 2, 3, 4].map(i => T(`M${x - 44 + i * 22} ${y + 26} C${x - 44 + i * 22} ${y - 4} ${x - 30 + i * 22} ${y - 8} ${x - 24 + i * 22} ${y + 26}Z`, k.fa)).join(''); },
  icicles: k => { const [x, y] = k.A.back; return crystal(x - 20, y + 66, 0.8, k.id, -30) + crystal(x + 10, y + 56, 1, k.id) + crystal(x + 40, y + 62, 0.7, k.id, 28); },
  crown: k => '',
};

const P = (base, o) => makePal(base, o);
export const ART = {
  // ---- pets ----
  mossling: { arch: 'quad', pal: P('#78b45a', { belly: '#f4ecc0', accent: '#4f8f48', eye: '#e8d03a', glow: '#b8ff7a' }), o: { ears: 'round', tail: 'bushy' }, decos: [{ slot: 'back', kind: 'leaves', replace: false }] },
  cinderpup: { arch: 'quad', pal: P('#d8603a', { belly: '#ffd9a0', accent: '#8a2e22', eye: '#ffd23a', glow: '#ffb030', pink: '#ffb08a' }), o: { ears: 'pointy', tail: 'thin' }, decos: [{ slot: 'tail', kind: 'flameTail' }, { slot: 'head', kind: 'emberCheek' }] },
  gloomfin: { arch: 'lizard', pal: P('#68bccb', { belly: '#e0f6f2', accent: '#f08aa8', eye: '#3a4a9a', glow: '#9af0ff' }), o: { head: 'newt', tail: 'fin' }, decos: [{ slot: 'head', kind: 'gills' }] },
  shellback: { arch: 'quad', pal: P('#b99f6b', { belly: '#f1e2b8', accent: '#7a5a3a', eye: '#ffb83a', glow: '#ffd070' }), o: { ears: 'round', tail: 'stub' }, decos: [{ slot: 'back', kind: 'shell', replace: true }] },
  wispling: { arch: 'quad', pal: P('#9e86d8', { belly: '#f1e8ff', accent: '#6a50b0', eye: '#7ff0ff', glow: '#e0b0ff', pink: '#ffc0e8' }), o: { ears: 'long', tail: 'thin' }, decos: [{ slot: 'head', kind: 'jewel' }, { slot: 'tail', kind: 'wispTail' }] },
  // ---- swamp ----
  bog_toad: { arch: 'lizard', pal: P('#6f9a3c', { belly: '#dede9c', accent: '#4a6e26', eye: '#ffd23a', mood: 'angry' }), o: { head: 'toad', tail: 'stub', fangs: false }, decos: [{ slot: 'torso', kind: 'warts' }] },
  leech_swarm: { arch: 'blob', pal: P('#8e3a4a', { belly: '#e0a0a8', accent: '#6a2434', eye: '#ffe0a0', mood: 'wild' }), o: {}, decos: [], ext: { ext1: 'sucker', ext2: 'sucker' } },
  reed_stalker: { arch: 'biped', pal: P('#8da84a', { belly: '#dce08c', accent: '#5d7a30', eye: '#ff7a3a', mood: 'angry' }), o: { kind: 'reed' }, decos: [] },
  mire_eel: { arch: 'serpent', pal: P('#3f8392', { belly: '#c4ece4', accent: '#2a5a6a', eye: '#ffe03a', mood: 'angry', glow: '#ffe45a' }), o: { head: 'snake' }, decos: [], ext: { ext1: 'organ' } },
  spore_moth: { arch: 'winged', pal: P('#c4a4dc', { belly: '#f6ecff', accent: '#9a76c4', eye: '#ff7ac0', glow: '#e8c8ff' }), o: { wing: 'moth' }, decos: [] },
  // ---- caves ----
  echo_bat: { arch: 'winged', pal: P('#62628e', { belly: '#bcbce0', accent: '#44447a', eye: '#8af0ff', mood: 'wild', pink: '#d890c0' }), o: { wing: 'bat' }, decos: [] },
  blind_delver: { blind: true, arch: 'quad', pal: P('#8a7660', { belly: '#c8b090', accent: '#6a5440', pink: '#c89080' }), o: { ears: 'round', snout: 'long', tail: 'stub', noseCol: '#f2a0aa' }, decos: [{ slot: 'head', kind: 'moleNose' }, { slot: 'fore', kind: 'spadeClaws' }] },
  stone_crab: { arch: 'crab', pal: P('#a07c58', { belly: '#dcc49a', accent: '#6a5238', eye: '#ffe08a', mood: 'angry' }), o: {}, decos: [] },
  pale_crawler: { arch: 'spider', pal: P('#dcd8c0', { belly: '#ffffff', accent: '#a8a48c', eye: '#ff5252', glow: '#ff6a6a', mood: 'wild' }), o: {}, decos: [], ext: { ext1: 'spinneret' } },
  rime_worm: { arch: 'serpent', pal: P('#9fcde2', { belly: '#ecf9ff', accent: '#6aa2c8', eye: '#3a7ac8', glow: '#aee8ff', mood: 'angry' }), o: { head: 'snake' }, decos: [{ slot: 'back', kind: 'icicles' }] },
  // ---- ashlands ----
  ash_hound: { arch: 'quad', pal: P('#5e4540', { belly: '#a08072', accent: '#ff7a30', eye: '#ffb030', glow: '#ff8a30', mood: 'angry' }), o: { ears: 'pointy', snout: 'long', tail: 'thin' }, decos: [{ slot: 'torso', kind: 'lava' }, { slot: 'head', kind: 'mane' }, { slot: 'tail', kind: 'flameTail' }] },
  slag_golem: { arch: 'biped', pal: P('#6c6058', { belly: '#a09488', accent: '#4a4038', eye: '#ff8a30', glow: '#ff6a2a', mood: 'angry' }), o: { kind: 'golem' }, decos: [{ slot: 'torso', kind: 'lavaGolem' }] },
  cinder_vulture: { arch: 'winged', pal: P('#54403c', { belly: '#7a5c52', accent: '#8a3b2d', eye: '#ffc030', glow: '#ff7a30', mood: 'angry', horn: '#e8b040' }), o: { wing: 'bird', bald: true }, decos: [] },
  magma_newt: { arch: 'lizard', pal: P('#3c2c2a', { belly: '#ffb060', accent: '#ff7a2a', eye: '#ffd23a', glow: '#ff8a30', mood: 'angry' }), o: { head: 'newt', tail: 'long' }, decos: [{ slot: 'torso', kind: 'spots' }, { slot: 'back', kind: 'spikes', replace: true }] },
  husk_pilgrim: { arch: 'biped', pal: P('#6a5a7e', { belly: '#a898c0', accent: '#8a78a8', eye: '#d8b8ff', glow: '#d8b0ff', mood: 'wild' }), o: { kind: 'pilgrim' }, decos: [] },
  // ---- bosses ----
  mother_mire: { arch: 'serpent', pal: P('#608e40', { belly: '#d6e090', accent: '#3e6a2a', eye: '#ffd23a', glow: '#b8ff50', mood: 'angry' }), o: { head: 'snake', noFins: true }, decos: [{ slot: 'back', kind: 'sacBack', replace: true }], ext: { ext1: 'head', ext2: 'head' } },
  stonechoir: { arch: 'biped', pal: P('#7e7c98', { belly: '#b8b6d0', accent: '#52506e', eye: '#a8b8ff', glow: '#a0b0ff', mood: 'angry' }), o: { kind: 'golem' }, decos: [{ slot: 'back', kind: 'crystalsBack', replace: true }], ext: { ext1: 'crystal' } },
  cinder_wyrm: { arch: 'serpent', pal: P('#b84a2c', { belly: '#ffd080', accent: '#6a2418', eye: '#ffe03a', glow: '#ff8a30', mood: 'angry' }), o: { head: 'dragon' }, decos: [{ slot: 'tail', kind: 'flameTail' }, { slot: 'back', kind: 'plates', replace: true }] },
  heart_of_bloom: { arch: null, pal: P('#b03a66', { belly: '#f4a8c0', accent: '#7a2248', eye: '#ffe27a', glow: '#ff7ab0', mood: 'wild', pink: '#ffb0d0' }), o: {}, decos: [{ slot: 'back', kind: 'bloom', replace: true }, { slot: 'torso', kind: 'heartGlow' }], ext: { ext1: 'root', ext2: 'root' } },
};
