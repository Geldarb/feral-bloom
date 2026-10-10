// Seeded RNG (mulberry32). State is a single integer so it can be saved in localStorage.
export function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export class RNG {
  constructor(seed) {
    this.s = typeof seed === 'string' ? hashSeed(seed) : (seed >>> 0);
  }
  next() {
    this.s = (this.s + 0x6d2b79f5) | 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
  chance(p) { return this.next() < p; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  // weighted pick: items array, weightFn(item) -> number
  weighted(items, wf) {
    let total = 0;
    const ws = items.map(i => { const w = Math.max(0, wf(i)); total += w; return w; });
    if (total <= 0) return items.length ? this.pick(items) : null;
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  }
  // sample n distinct items by weight
  sample(items, n, wf) {
    const pool = items.slice(); const out = [];
    while (out.length < n && pool.length) {
      const it = this.weighted(pool, wf || (() => 1));
      out.push(it); pool.splice(pool.indexOf(it), 1);
    }
    return out;
  }
}
