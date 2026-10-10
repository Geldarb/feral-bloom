// Meta-progression persistence (localStorage with in-memory fallback for tests).
import { PET_SPECIES, SEED_COSTS } from './data/species.js';
const META_KEY = 'feralbloom.meta.v1';
const RUN_KEY = 'feralbloom.run.v1';
const mem = {};
const ls = () => { try { return globalThis.localStorage || null; } catch (e) { return null; } };
function get(k) { const l = ls(); try { return l ? l.getItem(k) : mem[k] || null; } catch (e) { return mem[k] || null; } }
function set(k, v) { const l = ls(); try { if (l) l.setItem(k, v); else mem[k] = v; } catch (e) { mem[k] = v; } }
function del(k) { const l = ls(); try { if (l) l.removeItem(k); } catch (e) { /* ignore */ } delete mem[k]; }

export function defaultMeta() {
  return { v: 1, spores: 0, species: ['mossling'], seeds: [], discovered: [], endings: [],
    stats: { runs: 0, wins: 0, bestDepth: 0, bestScore: 0, kills: 0, severs: 0, bosses: 0, maxBiome: 0, deaths: 0 }, bestRun: null, sound: true };
}
export function loadMeta() {
  try { const raw = get(META_KEY); if (raw) { const m = JSON.parse(raw); return { ...defaultMeta(), ...m, stats: { ...defaultMeta().stats, ...(m.stats || {}) } }; } } catch (e) { /* ignore */ }
  return defaultMeta();
}
export function saveMeta(m) { set(META_KEY, JSON.stringify(m)); }
export function saveRun(run) { try { set(RUN_KEY, JSON.stringify(run)); } catch (e) { /* ignore */ } }
export function loadRun() { try { const r = get(RUN_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
export function clearRun() { del(RUN_KEY); }
export function resetAll() { del(META_KEY); del(RUN_KEY); }

export function checkUnlocks(meta) {
  const out = [];
  for (const sp of Object.values(PET_SPECIES)) {
    if (meta.species.includes(sp.id) || !sp.unlock) continue;
    const u = sp.unlock; const st = meta.stats;
    const ok = (u.type === 'biome' && st.maxBiome >= u.n) || (u.type === 'kills' && st.kills >= u.n) || (u.type === 'severs' && st.severs >= u.n) || (u.type === 'endings' && meta.endings.length >= u.n);
    if (ok) { meta.species.push(sp.id); out.push(sp.id); }
  }
  return out;
}
export function buySeed(meta, id) {
  const cost = SEED_COSTS[id];
  if (cost === undefined || meta.seeds.includes(id) || meta.spores < cost) return false;
  meta.spores -= cost; meta.seeds.push(id); saveMeta(meta); return true;
}
