// Branching node map generation.
import { BIOME_ORDER } from './data/enemies.js';

// layer index ranges per biome; the final layer is the Heart of the Bloom.
export const BIOME_SPANS = [{ biome: 'swamp', from: 0, to: 3 }, { biome: 'caves', from: 4, to: 8 }, { biome: 'ashlands', from: 9, to: 13 }];
export const FINAL_LAYER = 14;
export const NODE_INFO = {
  fight: { name: 'Fight', glyph: '\u2694', color: '#c46a5a', desc: 'A wild creature blocks the path.' },
  elite: { name: 'Elite Fight', glyph: '\u2620', color: '#e0a23a', desc: 'A dangerous alpha. Rich rewards, ally potential.' },
  feed: { name: 'Feeding Site', glyph: '\u2766', color: '#8fc66a', desc: 'Choose food. What it eats shapes what it becomes.' },
  rest: { name: 'Rest & Care', glyph: '\u263e', color: '#79b8d9', desc: 'Strengthen the bond, or push it harder.' },
  shrine: { name: 'Mutation Shrine', glyph: '\u2726', color: '#b58cf0', desc: 'Choose 1 of 3 mutations.' },
  event: { name: 'Mystery', glyph: '?', color: '#d6c88a', desc: 'Something unknown lies ahead.' },
  boss: { name: 'Boss', glyph: '\u265b', color: '#e8504a', desc: 'A guardian of this land.' },
};

export function biomeOfLayer(i) {
  for (const s of BIOME_SPANS) if (i >= s.from && i <= s.to) return s.biome;
  return 'ashlands';
}
export function isBossLayer(i) { return BIOME_SPANS.some(s => s.to === i) || i === FINAL_LAYER; }

export function generateMap(rng) {
  const layers = [];
  const preBoss = new Set(BIOME_SPANS.map(s => s.to - 1).concat([]));
  for (let i = 0; i <= FINAL_LAYER; i++) {
    const biome = biomeOfLayer(i);
    let types;
    if (isBossLayer(i)) types = ['boss'];
    else if (i === 0) types = ['fight', 'fight', 'feed'];
    else if (preBoss.has(i)) types = rng.shuffle(['rest', 'shrine', rng.pick(['fight', 'feed', 'event'])]);
    else {
      const n = rng.int(2, 3);
      const firstOfBiome = BIOME_SPANS.some(s => s.from === i);
      types = [];
      for (let j = 0; j < n; j++) {
        const t = rng.weighted(['fight', 'elite', 'feed', 'rest', 'shrine', 'event'], k => ({ fight: 38, elite: i >= 2 && !firstOfBiome ? 13 : 0, feed: 15, rest: 11, shrine: 14, event: 12 })[k]);
        types.push(t);
      }
      if (new Set(types).size === 1) types[0] = types[0] === 'fight' ? 'feed' : 'fight';
      if (!types.some(t => t === 'fight' || t === 'elite')) types[rng.int(0, n - 1)] = 'fight';
    }
    layers.push(types.map((type, j) => ({ id: `${i}-${j}`, layer: i, idx: j, n: types.length, type, biome: i === FINAL_LAYER ? 'ashlands' : biome, next: [] })));
  }
  for (let i = 0; i < layers.length - 1; i++) {
    const a = layers[i], b = layers[i + 1];
    for (const node of a) {
      const target = b.length === 1 ? 0 : Math.round((a.length === 1 ? 0.5 : node.idx / (a.length - 1)) * (b.length - 1));
      const set = new Set([target]);
      if (b.length > 1 && rng.chance(0.5)) { const o = target + (rng.chance(0.5) ? 1 : -1); if (o >= 0 && o < b.length) set.add(o); }
      node.next = [...set].map(k => b[k].id);
    }
    for (const bn of b) {
      if (!a.some(an => an.next.includes(bn.id))) {
        const pos = b.length === 1 ? 0.5 : bn.idx / (b.length - 1);
        let bestA = a[0], bd = 9;
        for (const an of a) { const d = Math.abs((a.length === 1 ? 0.5 : an.idx / (a.length - 1)) - pos); if (d < bd) { bd = d; bestA = an; } }
        bestA.next.push(bn.id);
      }
    }
  }
  return layers;
}
export function nodeById(map, id) { const [l, j] = id.split('-').map(Number); return map[l] && map[l][j]; }
