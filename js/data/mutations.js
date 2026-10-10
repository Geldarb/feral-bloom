// Mutation database. Each mutation: id, name, slot, rarity, tags, desc, mods, optional move, conflicts, partLabel.
// mods keys (all additive): hp, hpPct, php, phpSlot{slot:n}, arm{slot:n}, armAll, spd, acc, dodge, dmg(%), crit(%),
// thorns, regen, partRegen, lifesteal(%), counter(%), fear(%), firstStrike, res{type:0..1}, guard(0..1 torso damage cut
// while the back is intact), selfDmg, phoenix, onHit[{k,ch,t,p}], stPow{status:n}, severBonus, enemyAcc, enemySpd,
// ambush, bloodlust(% dmg below half HP), bondDrain, blindImmune, devourBonus, biomeDmg{biome:%}, auraSt[], combatRegrow.

export const SLOTS = { head: 'Head', eyes: 'Eyes', jaws: 'Jaws', fore: 'Forelimbs', hind: 'Hindlimbs', tail: 'Tail', back: 'Back', torso: 'Torso', extra: 'Extra limb' };
export const SOCKET_CAP = { head: 1, eyes: 1, jaws: 1, fore: 1, hind: 1, tail: 1, back: 2, torso: 2 };
export const MAX_EXT = 2;

export const TAGS = {
  venom: { name: 'Venom', color: '#9fd34a' },
  fire: { name: 'Fire', color: '#f0833a' },
  frost: { name: 'Frost', color: '#8fd3f0' },
  armor: { name: 'Armour', color: '#a7a79c' },
  speed: { name: 'Speed', color: '#f2d64b' },
  sensory: { name: 'Sensory', color: '#6fe0c8' },
  regen: { name: 'Regeneration', color: '#e57fa0' },
  parasite: { name: 'Parasite', color: '#c0507a' },
  aquatic: { name: 'Aquatic', color: '#4fa3d9' },
  flight: { name: 'Flight', color: '#d9c7a0' },
  psychic: { name: 'Psychic', color: '#b58cf0' },
  bone: { name: 'Bone', color: '#efe6cf' },
  sonic: { name: 'Sonic', color: '#8c9cf0' },
  camo: { name: 'Camouflage', color: '#7d9a6a' },
  cursed: { name: 'Cursed', color: '#c23a4a' },
  legend: { name: 'Legendary', color: '#ffd36b' },
};

export const RARITY_WEIGHT = { common: 60, uncommon: 30, rare: 10, legendary: 0 };

const list = [];
const st = (k, ch, t, p) => ({ k, ch, t, p });
function M(id, name, slot, rarity, tags, desc, o = {}) {
  list.push({
    id, name, slot, rarity, tags, desc,
    mods: o.mods || {},
    move: o.move ? { ...o.move, id } : null,
    conflicts: o.conflicts || [],
    partLabel: o.label || null,
  });
}

// ---------------- VENOM ----------------
M('venom_fangs', 'Venom Fangs', 'jaws', 'common', ['venom'], 'Hollow fangs. Unlocks Venom Bite, which poisons.',
  { move: { name: 'Venom Bite', type: 'pierce', pow: 6, cd: 1, st: [st('venom', 1, 3, 2)] } });
M('toxic_glands', 'Toxin Glands', 'back', 'common', ['venom'], '25% of your hits poison. Resist venom 30%.',
  { mods: { onHit: [st('venom', 0.25, 3, 1)], res: { venom: 0.3 } } });
M('barbed_stinger', 'Barbed Stinger', 'tail', 'uncommon', ['venom', 'bone'], 'Unlocks Sting: a strong poisoning pierce.',
  { move: { name: 'Sting', type: 'pierce', pow: 7, cd: 2, st: [st('venom', 1, 4, 2)] }, mods: { thorns: 1 } });
M('neurotoxin_sac', 'Neurotoxin Sac', 'torso', 'uncommon', ['venom'], 'Your venom is +1 stronger and you resist venom 50%.',
  { mods: { stPow: { venom: 1 }, res: { venom: 0.5 } } });
M('bile_spitter', 'Bile Spitter', 'head', 'rare', ['venom', 'parasite'], 'Spit Bile coats every enemy part in poison.',
  { move: { name: 'Spit Bile', type: 'venom', pow: 6, cd: 3, tgt: 'all', ranged: true, st: [st('venom', 1, 3, 1)] } });

// ---------------- FIRE ----------------
M('ember_glands', 'Ember Glands', 'back', 'common', ['fire'], '25% of your hits set the target ablaze. Resist fire 30%.',
  { mods: { onHit: [st('burn', 0.25, 3, 2)], res: { fire: 0.3 } } });
M('furnace_maw', 'Furnace Maw', 'jaws', 'uncommon', ['fire'], 'Unlocks Flame Breath, which scorches every enemy part.',
  { move: { name: 'Flame Breath', type: 'fire', pow: 8, cd: 3, tgt: 'all', ranged: true, st: [st('burn', 1, 3, 2)] } });
M('magma_blood', 'Magma Blood', 'torso', 'rare', ['fire'], '+6 torso HP, resist fire 50%, thorns 2. Weak to frost.',
  { mods: { hp: 6, res: { fire: 0.5, frost: -0.3 }, thorns: 2 }, conflicts: ['glacial_carapace', 'chill_aura'] });
M('cinder_hide', 'Cinder Hide', 'torso', 'common', ['fire', 'armor'], '+1 torso armour, resist fire 25%, 10% burn on hit.',
  { mods: { arm: { torso: 1 }, res: { fire: 0.25 }, onHit: [st('burn', 0.1, 2, 2)] } });
M('scorching_claws', 'Scorching Claws', 'fore', 'common', ['fire'], 'Unlocks Scorch Slash (fire damage, burns).',
  { move: { name: 'Scorch Slash', type: 'fire', pow: 8, cd: 1, st: [st('burn', 1, 2, 2)] } });

// ---------------- FROST ----------------
M('rime_maw', 'Rime Maw', 'jaws', 'uncommon', ['frost'], 'Unlocks Frost Bite, which chills.',
  { move: { name: 'Frost Bite', type: 'frost', pow: 7, cd: 1, st: [st('chill', 1, 3, 1)] } });
M('glacial_carapace', 'Glacial Carapace', 'back', 'uncommon', ['frost', 'armor'], '+2 back armour, resist frost 40%, -1 speed.',
  { mods: { arm: { back: 2 }, res: { frost: 0.4 }, spd: -1 }, conflicts: ['magma_blood'] });
M('chill_aura', 'Chill Aura', 'torso', 'rare', ['frost'], 'The enemy is -2 speed. 20% of hits chill.',
  { mods: { enemySpd: -2, onHit: [st('chill', 0.2, 2, 1)] }, conflicts: ['magma_blood'] });
M('hoar_talons', 'Hoar Talons', 'fore', 'common', ['frost'], 'Unlocks Freeze Slash (frost, chills).',
  { move: { name: 'Freeze Slash', type: 'frost', pow: 7, cd: 1, st: [st('chill', 1, 2, 1)] } });

// ---------------- ARMOUR ----------------
M('chitin_carapace', 'Chitin Carapace', 'back', 'common', ['armor'], '+2 torso armour. While your back is intact, torso takes 20% less. -1 speed.',
  { mods: { arm: { torso: 2 }, guard: 0.2, spd: -1 } });
M('scrap_plates', 'Scrap-Iron Plates', 'torso', 'common', ['armor'], '+1 armour on every part, +2 on torso. -1 speed.',
  { mods: { armAll: 1, arm: { torso: 2 }, spd: -1 } });
M('shale_skull', 'Shale Skull', 'head', 'common', ['armor', 'bone'], '+3 head armour, +4 head HP. Unlocks Skull Ram (stuns).',
  { mods: { arm: { head: 3 }, phpSlot: { head: 4 } }, move: { name: 'Skull Ram', type: 'blunt', pow: 9, cd: 2, st: [st('stun', 0.3, 1, 1)] } });
M('iron_greaves', 'Iron Greaves', 'hind', 'uncommon', ['armor'], '+3 hindlimb armour, +4 hindlimb HP, -1 speed.',
  { mods: { arm: { hind: 3 }, phpSlot: { hind: 4 }, spd: -1 } });
M('bulwark_shell', 'Bulwark Shell', 'torso', 'rare', ['armor'], '+3 torso armour, torso takes 35% less while back intact. -2 speed. Too heavy to fly.',
  { mods: { arm: { torso: 3 }, guard: 0.35, spd: -2 }, conflicts: ['membrane_wings', 'hollow_bones'] });
M('slag_knuckles', 'Slag Knuckles', 'fore', 'common', ['armor', 'fire'], '+2 forelimb armour. Unlocks Slag Hammer (heavy blunt).',
  { mods: { arm: { fore: 2 } }, move: { name: 'Slag Hammer', type: 'blunt', pow: 10, cd: 2, sever: 2 } });

// ---------------- SPEED ----------------
M('spring_haunches', 'Springloaded Haunches', 'hind', 'common', ['speed'], '+3 speed, +5% dodge.',
  { mods: { spd: 3, dodge: 5 } });
M('adrenal_gland', 'Adrenal Gland', 'torso', 'uncommon', ['speed'], 'You act first each round. +2 speed.',
  { mods: { firstStrike: 1, spd: 2 } });
M('whiplash_tail', 'Whiplash Tail', 'tail', 'uncommon', ['speed'], 'Unlocks Lash: two quick strikes. +4% dodge.',
  { mods: { dodge: 4 }, move: { name: 'Lash', type: 'blunt', pow: 5, cd: 1, hits: 2 } });
M('flicker_nerves', 'Flicker Nerves', 'head', 'rare', ['speed', 'sensory'], '+10% dodge, +2 speed, -4 head HP.',
  { mods: { dodge: 10, spd: 2, phpSlot: { head: -4 } } });
M('reaper_scythes', 'Reaper Scythes', 'fore', 'uncommon', ['speed', 'bone'], 'Unlocks Reap: slashing, great against limbs.',
  { move: { name: 'Reap', type: 'slash', pow: 9, cd: 1, sever: 3 } });

// ---------------- SENSORY ----------------
M('hawk_eyes', 'Hawk Eyes', 'eyes', 'common', ['sensory'], '+10 accuracy, +5% crit.',
  { mods: { acc: 10, crit: 5 } });
M('compound_eyes', 'Compound Eyes', 'eyes', 'uncommon', ['sensory'], '+6 accuracy, +6% dodge.',
  { mods: { acc: 6, dodge: 6 } });
M('whisker_array', 'Whisker Array', 'head', 'common', ['sensory'], '+6% dodge, +4 accuracy.',
  { mods: { dodge: 6, acc: 4 } });
M('pit_organs', 'Pit Organs', 'extra', 'uncommon', ['sensory'], 'Heat-sensing pits: +8 accuracy, +8% crit.',
  { mods: { acc: 8, crit: 8 }, label: 'Pit Organs' });
M('weakpoint_sight', 'Weakpoint Sight', 'eyes', 'rare', ['sensory'], 'You see where it hurts: +4 damage to damaged parts, +8% crit.',
  { mods: { severBonus: 4, crit: 8 } });

// ---------------- REGENERATION ----------------
M('knitting_flesh', 'Knitting Flesh', 'torso', 'common', ['regen'], 'Recover 1 torso HP each round.',
  { mods: { regen: 1 } });
M('hydra_cells', 'Hydra Cells', 'torso', 'rare', ['regen'], 'Recover 2 torso HP and 2 HP on each damaged part per round.',
  { mods: { regen: 2, partRegen: 2 } });
M('mending_moss', 'Mending Moss', 'back', 'common', ['regen', 'camo'], 'Damaged parts recover 1 HP per round. Resist rot.',
  { mods: { partRegen: 1, res: { rot: 0.4 } } });
M('second_wind', 'Second Wind Gland', 'extra', 'rare', ['regen'], 'Once per fight, survive a killing blow and revive at 35%.',
  { mods: { phoenix: 1 }, label: 'Wind Gland' });
M('clotting_blood', 'Clotting Blood', 'torso', 'common', ['regen'], '+4 torso HP, immune to bleeding.',
  { mods: { hp: 4, res: { bleed: 1 } } });

// ---------------- PARASITE / SYMBIOTE ----------------
M('leech_mouth', 'Leech Mouth', 'jaws', 'common', ['parasite'], 'Unlocks Drain Bite (leeches life). 5% lifesteal.',
  { mods: { lifesteal: 5 }, move: { name: 'Drain Bite', type: 'pierce', pow: 5, cd: 1, st: [st('leech', 1, 3, 2)] } });
M('symbiotic_lichen', 'Symbiotic Lichen', 'back', 'uncommon', ['parasite', 'regen'], 'A living cloak: +1 torso regen, +1 thorns.',
  { mods: { regen: 1, thorns: 1 } });
M('brood_pouch', 'Brood Pouch', 'extra', 'rare', ['parasite'], 'Unlocks Release Brood: grubs gnaw every part.',
  { move: { name: 'Release Brood', type: 'pierce', pow: 5, cd: 3, tgt: 'all', st: [st('leech', 1, 3, 1)] }, label: 'Brood Pouch' });
M('mind_worm', 'Mind-Worm', 'head', 'uncommon', ['parasite', 'psychic'], '6% lifesteal, enemies 10% to cower. Costs bond every fight.',
  { mods: { lifesteal: 6, fear: 10, bondDrain: 1 } });

// ---------------- AQUATIC ----------------
M('gills', 'Gills', 'torso', 'common', ['aquatic'], 'Resist venom 20% and frost 15%, +1 regen.',
  { mods: { res: { venom: 0.2, frost: 0.15 }, regen: 1 } });
M('webbed_hindfeet', 'Webbed Hindfeet', 'hind', 'common', ['aquatic'], '+1 speed, +4% dodge, +12% damage in the Swamp.',
  { mods: { spd: 1, dodge: 4, biomeDmg: { swamp: 12 } } });
M('electric_organ', 'Electric Organ', 'extra', 'uncommon', ['aquatic'], 'Unlocks Discharge: shock that ignores armour and may stun.',
  { move: { name: 'Discharge', type: 'shock', pow: 8, cd: 2, ranged: true, st: [st('stun', 0.3, 1, 1)] }, label: 'Electric Organ' });
M('ink_sac', 'Ink Sac', 'back', 'uncommon', ['aquatic', 'camo'], 'Unlocks Ink Cloud: blinds the enemy.',
  { move: { name: 'Ink Cloud', type: 'venom', pow: 0, cd: 3, tgt: 'enemy', st: [st('blind', 1, 3, 1)] } });
M('crushing_pincer', 'Crushing Pincer', 'fore', 'uncommon', ['aquatic', 'armor'], 'Unlocks Crab Crush: heavy blunt, finishes parts.',
  { move: { name: 'Crab Crush', type: 'blunt', pow: 10, cd: 2, sever: 3 } });

// ---------------- FLIGHT ----------------
M('membrane_wings', 'Membrane Wings', 'back', 'uncommon', ['flight'], '+10% dodge, +2 speed. Unlocks Dive Strike.',
  { mods: { dodge: 10, spd: 2 }, move: { name: 'Dive Strike', type: 'slash', pow: 9, cd: 2, acc: -5 }, conflicts: ['bulwark_shell'] });
M('glide_flaps', 'Glide Flaps', 'extra', 'common', ['flight'], '+6% dodge, +1 speed.',
  { mods: { dodge: 6, spd: 1 }, label: 'Glide Flaps' });
M('raptor_talons', 'Raptor Talons', 'hind', 'uncommon', ['flight', 'speed'], '+4 accuracy. Unlocks Swoop Rake (bleeds).',
  { mods: { acc: 4 }, move: { name: 'Swoop Rake', type: 'slash', pow: 8, cd: 1, st: [st('bleed', 0.6, 3, 2)] } });
M('hollow_bones', 'Hollow Bones', 'torso', 'rare', ['flight', 'bone'], '+2 speed, +6% dodge, -6 torso HP.',
  { mods: { spd: 2, dodge: 6, hp: -6 }, conflicts: ['dense_marrow', 'bulwark_shell'] });

// ---------------- PSYCHIC ----------------
M('third_eye', 'Third Eye', 'extra', 'rare', ['psychic', 'sensory'], '+8 accuracy. Unlocks Mind Spike (psychic, mostly ignores armour).',
  { mods: { acc: 8 }, move: { name: 'Mind Spike', type: 'psychic', pow: 8, cd: 1, ranged: true }, label: 'Third Eye' });
M('hypnotic_gaze', 'Hypnotic Gaze', 'eyes', 'uncommon', ['psychic'], 'Unlocks Hypno Stare: 60% to stun the enemy.',
  { move: { name: 'Hypno Stare', type: 'psychic', pow: 0, cd: 4, tgt: 'enemy', st: [st('stun', 0.6, 1, 1)] } });
M('dream_spores', 'Dream Spores', 'back', 'rare', ['psychic', 'camo'], 'A drowsy haze: enemy -10 accuracy, 8% to cower.',
  { mods: { enemyAcc: 10, fear: 8 } });
M('psychic_resonator', 'Psychic Resonator', 'head', 'rare', ['psychic'], 'Unlocks Mind Blast. Resist psychic 50%.',
  { mods: { res: { psychic: 0.5 } }, move: { name: 'Mind Blast', type: 'psychic', pow: 13, cd: 3, ranged: true }, conflicts: ['bell_skull'] });

// ---------------- BONE / SPINES ----------------
M('spinal_spikes', 'Spinal Spikes', 'back', 'common', ['bone'], 'Thorns 3. Unlocks Spine Flick (pierce).',
  { mods: { thorns: 3 }, move: { name: 'Spine Flick', type: 'pierce', pow: 7, cd: 1, ranged: true } });
M('bone_mace_tail', 'Bone Mace Tail', 'tail', 'common', ['bone'], 'Unlocks Mace Swing: heavy blunt.',
  { move: { name: 'Mace Swing', type: 'blunt', pow: 10, cd: 1, sever: 2 } });
M('marrow_horns', 'Marrow Horns', 'head', 'uncommon', ['bone'], '+1 head armour. Unlocks Gore (bleeds).',
  { mods: { arm: { head: 1 } }, move: { name: 'Gore', type: 'pierce', pow: 10, cd: 2, st: [st('bleed', 0.8, 3, 2)] } });
M('dense_marrow', 'Dense Marrow', 'torso', 'common', ['bone'], '+8 torso HP, +1 torso armour, -1 speed.',
  { mods: { hp: 8, arm: { torso: 1 }, spd: -1 }, conflicts: ['hollow_bones'] });
M('rib_cage', 'Rib Cage', 'torso', 'uncommon', ['bone', 'armor'], 'Torso takes 25% less while back intact; thorns 1.',
  { mods: { guard: 0.25, thorns: 1 } });

// ---------------- SONIC ----------------
M('resonant_larynx', 'Resonant Larynx', 'jaws', 'uncommon', ['sonic'], 'Unlocks Shriek: sonic damage to all parts, may stun.',
  { move: { name: 'Shriek', type: 'sonic', pow: 7, cd: 3, tgt: 'all', ranged: true, st: [st('stun', 0.2, 1, 1)] } });
M('echo_pits', 'Echolocation Pits', 'head', 'common', ['sonic', 'sensory'], 'Immune to blindness. +4 accuracy.',
  { mods: { blindImmune: 1, acc: 4 } });
M('subsonic_drum', 'Subsonic Drum', 'torso', 'rare', ['sonic'], 'Unlocks Quake Thump: sonic shockwave, 25% to stun.',
  { move: { name: 'Quake Thump', type: 'sonic', pow: 9, cd: 3, tgt: 'all', ranged: true, st: [st('stun', 0.25, 1, 1)] } });
M('glass_whistle', 'Glass Whistle', 'extra', 'common', ['sonic'], 'Unlocks Whistle: cheap sonic strike, 15% stun.',
  { move: { name: 'Whistle', type: 'sonic', pow: 5, cd: 1, ranged: true, st: [st('stun', 0.15, 1, 1)] }, label: 'Glass Whistle' });
M('bell_skull', 'Bell Skull', 'head', 'uncommon', ['sonic', 'bone'], 'Resist sonic 50%, +2 head armour.',
  { mods: { res: { sonic: 0.5 }, arm: { head: 2 } }, conflicts: ['psychic_resonator'] });

// ---------------- CAMOUFLAGE ----------------
M('chameleon_skin', 'Chameleon Skin', 'torso', 'uncommon', ['camo'], '+8% dodge. Enemy first attack misses; your first hit crits.',
  { mods: { dodge: 8, ambush: 1 } });
M('pale_hide', 'Pale Hide', 'torso', 'common', ['camo'], '+5% dodge, enemy -3 accuracy.',
  { mods: { dodge: 5, enemyAcc: 3 } });
M('mottled_fur', 'Mottled Fur', 'back', 'common', ['camo'], '+4% dodge, +4% crit.',
  { mods: { dodge: 4, crit: 4 } });
M('shadow_tail', 'Shadow Tail', 'tail', 'uncommon', ['camo'], '+6% dodge, +6% crit.',
  { mods: { dodge: 6, crit: 6 } });

// ---------------- CURSED / RISKY ----------------
M('hungry_maw', 'Hungry Maw', 'jaws', 'rare', ['cursed'], '+15% damage, Devouring Bite. Burns 1 HP/round and drains bond.',
  { mods: { dmg: 15, selfDmg: 1, bondDrain: 1 }, move: { name: 'Devouring Bite', type: 'pierce', pow: 12, cd: 1, st: [st('bleed', 0.5, 3, 2)] } });
M('bloodlust_gland', 'Bloodlust Gland', 'extra', 'rare', ['cursed'], '+35% damage below half HP. Drains bond.',
  { mods: { bloodlust: 35, bondDrain: 1 }, label: 'Bloodlust Gland' });
M('wailing_crown', 'Wailing Crown', 'head', 'rare', ['cursed', 'psychic'], '+10% damage, enemies 15% to cower. -1 HP/round.',
  { mods: { dmg: 10, fear: 15, selfDmg: 1 } });
M('rotting_heart', 'Rotting Heart', 'torso', 'rare', ['cursed'], '+20% damage, hits may rot armour away. -1 HP/round.',
  { mods: { dmg: 20, onHit: [st('rot', 0.35, 4, 1)], selfDmg: 1 } });
M('pact_of_teeth', 'Pact of Teeth', 'extra', 'rare', ['cursed', 'bone'], 'Unlocks Frenzy Bites: four tiny bites. Drains bond x2.',
  { mods: { bondDrain: 2 }, move: { name: 'Frenzy Bites', type: 'pierce', pow: 4, cd: 2, hits: 4 }, label: 'Extra Teeth' });
M('hollow_hunger', 'Hollow Hunger', 'torso', 'rare', ['cursed', 'parasite'], '+10 torso HP, 15% lifesteal, -2 HP/round.',
  { mods: { hp: 10, lifesteal: 15, selfDmg: 2 } });
M('void_pulse', 'Void Pulse', 'back', 'rare', ['cursed'], 'Unlocks Entropy Wave: rots every part. -1 HP/round.',
  { mods: { selfDmg: 1 }, move: { name: 'Entropy Wave', type: 'rot', pow: 6, cd: 3, tgt: 'all', ranged: true, st: [st('rot', 1, 4, 1)] } });

// ---------------- LEGENDARY (boss trophies) ----------------
M('hydra_crown', "Mother's Hydra Crown", 'head', 'legendary', ['regen', 'legend'], 'Trophy of the Bog Mother: +6 head HP, regen 2, parts mend 3/round.',
  { mods: { regen: 2, partRegen: 3, phpSlot: { head: 6 } } });
M('choir_heart', 'Choir Heart', 'torso', 'legendary', ['sonic', 'legend'], 'Trophy of the Stonechoir: Choral Roar, resist sonic 60%.',
  { mods: { res: { sonic: 0.6 } }, move: { name: 'Choral Roar', type: 'sonic', pow: 10, cd: 3, tgt: 'all', ranged: true, st: [st('stun', 0.35, 1, 1)] } });
M('wyrm_scale', 'Wyrm Scale', 'back', 'legendary', ['fire', 'armor', 'legend'], 'Trophy of the Cinder Wyrm: +3 torso armour, resist fire 60%, thorns 3, Wyrm Breath.',
  { mods: { arm: { torso: 3 }, res: { fire: 0.6 }, thorns: 3 }, move: { name: 'Wyrm Breath', type: 'fire', pow: 11, cd: 3, tgt: 'all', ranged: true, st: [st('burn', 1, 3, 3)] } });
M('bloom_heart', 'Bloom Heart', 'extra', 'legendary', ['regen', 'legend'], 'Trophy of the Heart: regen 3, +20% damage, +10 accuracy, revive once.',
  { mods: { regen: 3, dmg: 20, acc: 10, phoenix: 1 }, label: 'Bloom Heart' });

export const MUTATIONS = list;
export const MUTS = Object.fromEntries(list.map(m => [m.id, m]));

// Ally habits: passive quirks gained by bonding with a defeated elite (no body socket, max 3).
export const HABITS = {
  pack_instinct: { id: 'pack_instinct', name: 'Pack Instinct', desc: 'Acts first more often (+2 speed).', mods: { spd: 2 } },
  stalker_patience: { id: 'stalker_patience', name: "Stalker's Patience", desc: '+8% crit.', mods: { crit: 8 } },
  scavenger: { id: 'scavenger', name: 'Scavenger', desc: 'Devouring parts heals +5 more.', mods: { devourBonus: 5 } },
  wary: { id: 'wary', name: 'Wary Eyes', desc: '+5% dodge.', mods: { dodge: 5 } },
  territorial: { id: 'territorial', name: 'Territorial', desc: '+8% damage.', mods: { dmg: 8 } },
  loyal_heart: { id: 'loyal_heart', name: 'Loyal Heart', desc: '+4 accuracy and +2 regen when bonded.', mods: { acc: 4, regen: 1 } },
};
