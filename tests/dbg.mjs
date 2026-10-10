import { RNG } from '../js/rng.js';
import * as G from '../js/game.js';
import { defaultMeta } from '../js/store.js';
import { botCombatAct } from './bot.mjs';
import { BOSSES } from '../js/data/enemies.js';
import { makeEnemy } from '../js/creature.js';
import { startCombat } from '../js/combat.js';
const id = process.argv[2] || 'mother_mire';
const meta = defaultMeta(); G.bindMeta(meta);
const rng = new RNG('dbg');
let wins=0, turns=0, N=200, hpLeft=0;
for (let i=0;i<N;i++){
  const run = G.newRun(meta,{seed:'d'+i});
  run.depth = +(process.argv[3]||3); run.node='3-0'; run.pos='3-0';
  const e = makeEnemy(BOSSES[id]||undefined,{scale:0.95+0.035*run.depth,dmg:0.66+0.03*run.depth});
  run.combat = startCombat(run,e,run.rng); run.phase='combat';
  // mimic having done 3 nodes: hp 70%
  const s=run.combat; let guard=0;
  while(!s.over && guard++<80){ const a=botCombatAct(run,rng); const r=G.combatAct.call(null,run,a); if(!r.ok) throw new Error(r.error); if(run.phase!=='combat') break; }
  if(s.result==='win'){wins++; hpLeft+=s.p.parts.torso.hp/s.p.parts.torso.max;} turns+=s.turn;
  if(i===0) console.log(s.log.map(l=>l.m).join('\n'));
}
console.log(id,'win',wins/N,'avg turns',turns/N,'avg hp left',(hpLeft/Math.max(1,wins)).toFixed(2));
