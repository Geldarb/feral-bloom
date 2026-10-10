// Set bonuses: owning 3+ active mutations carrying a tag unlocks the bonus.
const st = (k, ch, t, p) => ({ k, ch, t, p });
export const SYNERGY_NEED = 3;
export const SYNERGIES = [
  { tag: 'venom', name: 'Toxic Cloud', desc: 'Every round the enemy is poisoned by a lingering cloud.', mods: { auraSt: [st('venom', 1, 2, 1)] } },
  { tag: 'fire', name: 'Inferno Blood', desc: '+8% damage and 35% of hits ignite.', mods: { dmg: 8, onHit: [st('burn', 0.35, 3, 2)] } },
  { tag: 'frost', name: 'Permafrost', desc: 'Enemy -2 speed and constantly chilled.', mods: { enemySpd: -2, auraSt: [st('chill', 1, 2, 1)] } },
  { tag: 'armor', name: 'Fortress', desc: '+1 armour everywhere, torso takes 25% less while back intact.', mods: { armAll: 1, guard: 0.25 } },
  { tag: 'speed', name: 'Blur', desc: '+12% dodge and you always strike first.', mods: { dodge: 12, firstStrike: 1 } },
  { tag: 'sensory', name: 'Omniscience', desc: '+12 accuracy, +10% crit, +2 damage to hurt parts.', mods: { acc: 12, crit: 10, severBonus: 2 } },
  { tag: 'regen', name: 'Hydra Tissue', desc: 'Severed parts regrow mid-fight (after 4 rounds, at 30% HP).', mods: { combatRegrow: 4 } },
  { tag: 'parasite', name: 'Hive Mind', desc: '+10% lifesteal, enemies 8% to cower.', mods: { lifesteal: 10, fear: 8 } },
  { tag: 'aquatic', name: 'Tidecaller', desc: '+2 regen, resist venom and frost 20%.', mods: { regen: 2, res: { venom: 0.2, frost: 0.2 } } },
  { tag: 'flight', name: 'Aerial Grace', desc: '+12% dodge, +2 speed.', mods: { dodge: 12, spd: 2 } },
  { tag: 'psychic', name: 'Mindstorm', desc: 'Enemies 15% to cower and -10 accuracy.', mods: { fear: 15, enemyAcc: 10 } },
  { tag: 'bone', name: 'Bone Garden', desc: '+3 thorns and 15% to counter-attack.', mods: { thorns: 3, counter: 15 } },
  { tag: 'sonic', name: 'Resonance', desc: '15% of hits stun.', mods: { onHit: [st('stun', 0.15, 1, 1)] } },
  { tag: 'camo', name: 'Ambusher', desc: 'Enemy first attack misses, your first strike crits, +10% crit.', mods: { ambush: 1, crit: 10 } },
  { tag: 'cursed', name: 'Dark Pact', desc: '+30% damage, -1 HP/round, drains bond.', mods: { dmg: 30, selfDmg: 1, bondDrain: 1 } },
];

// Negative interactions between body-plan themes.
export const PENALTIES = [
  { id: 'thermal', name: 'Thermal Stress', desc: 'Fire and frost fight inside you: -12% torso HP, -4 accuracy.', test: t => t.fire >= 1 && t.frost >= 1, mods: { hpPct: -12, acc: -4 } },
  { id: 'feedback', name: 'Psychic Feedback', desc: 'Mind and sound interfere: -6% dodge, -4 accuracy.', test: t => t.psychic >= 1 && t.sonic >= 1, mods: { dodge: -6, acc: -4 } },
  { id: 'deadweight', name: 'Dead Weight', desc: 'Too much plating for wings: -10% dodge, -2 speed.', test: t => t.armor >= 3 && t.flight >= 1, mods: { dodge: -10, spd: -2 } },
  { id: 'corruption', name: 'Corruption', desc: 'Two or more curses taint the bond: extra bond drain.', test: t => t.cursed >= 2, mods: { bondDrain: 1 } },
];
