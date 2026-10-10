import { RNG } from '../js/rng.js';
import * as G from '../js/game.js';
import { defaultMeta } from '../js/store.js';
import { playRun } from './bot.mjs';
import { PET_SPECIES } from '../js/data/species.js';

const N = +(process.argv[2] || 300);
const meta = defaultMeta(); meta.species = Object.keys(PET_SPECIES); meta.seeds = ['venom_fangs'];
G.bindMeta(meta);
const rng = new RNG('botseed');
const out = { runs: 0, wins: 0, byHow: {}, depth: [], bosses: 0, endings: {}, mutations: 0, errors: 0, severs: 0, lost: 0 };
const deaths = {};
for (let i = 0; i < N; i++) {
  const species = Object.keys(PET_SPECIES)[i % 5];
  try {
    const run = playRun(meta, { species, seed: 'S' + i, seedMut: i % 3 === 0 ? 'venom_fangs' : null }, rng);
    out.runs++; out.byHow[run.over.how] = (out.byHow[run.over.how] || 0) + 1;
    if (run.over.won) { out.wins++; out.endings[run.over.ending.id] = (out.endings[run.over.ending.id] || 0) + 1; }
    out.depth.push(run.depth); out.bosses += run.stats.bosses; out.mutations += run.stats.mutations; out.severs += run.stats.severs; out.lost += run.stats.lost;
    if (run.over.how === 'death') deaths[run.over.cause] = (deaths[run.over.cause] || 0) + 1;
  } catch (e) { out.errors++; console.error('ERROR run', i, e.stack); if (out.errors > 5) break; }
}
const avg = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);
console.log(JSON.stringify({ ...out, depth: undefined, avgDepth: avg(out.depth), avgMut: (out.mutations / out.runs).toFixed(1), avgSevers: (out.severs / out.runs).toFixed(1), avgLost: (out.lost / out.runs).toFixed(1), winRate: (out.wins / out.runs).toFixed(3) }, null, 1));
const hist = {}; out.depth.forEach(d => hist[d] = (hist[d] || 0) + 1); console.log('depth histogram', JSON.stringify(hist));
console.log('deaths', JSON.stringify(deaths));
if (out.errors) process.exit(1);
