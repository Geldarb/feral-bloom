// Drawing kit for hand-authored creature SVG: palettes, gradients, outlined paths, expressive eyes.
export const LINE = '#161110';
const h2r = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
export function mix(a, b, t) { const A = h2r(a), B = h2r(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }

export function makePal(base, o = {}) {
  return {
    base, light: o.light || mix(base, '#ffffff', 0.36), dark: o.dark || mix(base, '#0b0606', 0.5),
    belly: o.belly || mix(base, '#fff6dc', 0.66), accent: o.accent || mix(base, '#ffffff', 0.2), eye: o.eye || '#ffd23a',
    glow: o.glow || '#ff9a3a', ichor: o.ichor || '#b3121c', horn: o.horn || '#efe6cc', pink: o.pink || '#f08aa0', mood: o.mood || 'cute',
  };
}
export function defs(id, P) {
  const g = (n, a, b, c) => `<linearGradient id="${id}-${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>`;
  return `<defs>${g('b', P.light, P.base, P.dark)}${g('d', mix(P.base, '#000', 0.05), mix(P.base, '#000', 0.24), mix(P.base, '#000', 0.46))}${g('s', mix(P.belly, '#fff', 0.4), P.belly, mix(P.belly, P.base, 0.45))}${g('a', mix(P.accent, '#fff', 0.3), P.accent, mix(P.accent, '#000', 0.4))}
<radialGradient id="${id}-gl"><stop offset="0" stop-color="${P.glow}" stop-opacity=".95"/><stop offset="1" stop-color="${P.glow}" stop-opacity="0"/></radialGradient>
<linearGradient id="${id}-cr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="${mix(P.glow, '#ffffff', 0.35)}"/><stop offset="1" stop-color="${mix(P.glow, '#202040', 0.45)}"/></linearGradient>
<linearGradient id="${id}-ice" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4fdff"/><stop offset=".5" stop-color="#9adcf6"/><stop offset="1" stop-color="#4a8fc8"/></linearGradient>
<radialGradient id="${id}-sh"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>`;
}
// outlined path
export const T = (d, fill, o = '') => `<path d="${d}" fill="${fill}" stroke="${LINE}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" ${o}/>`;
export const N = (d, fill, o = '') => `<path d="${d}" fill="${fill}" ${o}/>`;
export const S = (d, stroke, w = 3, o = '') => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${o}/>`;
export const HL = d => S(d, '#ffffff', 4.5, 'opacity=".32"');       // soft highlight stroke
export const SH = d => N(d, '#000', 'opacity=".22"');               // shadow fill
export const circ = (x, y, r, fill, o = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${o}/>`;
export const ell = (x, y, rx, ry, fill, o = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${o}/>`;

// Expressive eye. mood: cute | angry | wild | sleepy | blank
export function eye(x, y, r, P, o = {}) {
  const mood = o.mood || P.mood || 'cute';
  const iris = o.iris || P.eye;
  const pr = mood === 'wild' ? r * 0.28 : r * 0.42;
  let s = `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.12}" fill="#fffdf4" stroke="${LINE}" stroke-width="2.6"/>`;
  s += `<ellipse cx="${x + r * 0.12}" cy="${y + r * 0.08}" rx="${r * 0.74}" ry="${r * 0.86}" fill="${iris}"/>`;
  s += `<ellipse cx="${x + r * 0.12}" cy="${y + r * 0.34}" rx="${r * 0.6}" ry="${r * 0.4}" fill="#fff" opacity=".3"/>`;
  s += mood === 'wild' ? `<ellipse cx="${x + r * 0.12}" cy="${y + r * 0.08}" rx="${pr}" ry="${r * 0.8}" fill="${LINE}"/>` : `<circle cx="${x + r * 0.14}" cy="${y + r * 0.08}" r="${pr}" fill="${LINE}"/>`;
  s += `<circle cx="${x - r * 0.12}" cy="${y - r * 0.32}" r="${r * 0.26}" fill="#fff"/><circle cx="${x + r * 0.42}" cy="${y + r * 0.34}" r="${r * 0.12}" fill="#fff" opacity=".9"/>`;
  if (mood === 'angry' || mood === 'wild') s += `<path d="M${x - r * 1.25} ${y - r * 0.55} L${x + r * 1.15} ${y - r * 1.15} L${x + r * 1.15} ${y - r * 0.1} Q${x} ${y - r * 0.9} ${x - r * 1.0} ${y - r * 0.2}Z" fill="${P.dark}" stroke="${LINE}" stroke-width="2.4" stroke-linejoin="round"/>`;
  else if (mood === 'sleepy') s += `<path d="M${x - r * 1.1} ${y - r * 0.1} Q${x} ${y - r * 1.5} ${x + r * 1.1} ${y - r * 0.1}Z" fill="${P.base}" stroke="${LINE}" stroke-width="2.4"/>`;
  else s += `<path d="M${x - r * 1.05} ${y - r * 0.5} Q${x} ${y - r * 1.55} ${x + r * 1.05} ${y - r * 0.5}" fill="none" stroke="${LINE}" stroke-width="3" stroke-linecap="round"/>`;
  return s;
}
export function teeth(x, y, n, size = 6, gap = 10, flip = 1) {
  let s = '';
  for (let i = 0; i < n; i++) { const px = x + i * gap * flip; s += `<path d="M${px} ${y} l${size * 0.55 * flip} ${size * 1.4} l${size * 0.55 * flip} ${-size * 1.4}Z" fill="#fffdf2" stroke="${LINE}" stroke-width="1.6" stroke-linejoin="round"/>`; }
  return s;
}
