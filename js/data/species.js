// Playable pet species. parts: slot -> [hp, armour]
export const PET_SPECIES = {
  mossling: {
    id: 'mossling', name: 'Mossling', layout: 'quad', color: '#6f9a4a', accent: '#a8d070',
    desc: 'A balanced bog-pup, patient and adaptable. Mutates readily.',
    parts: { torso: [32, 1], head: [12, 0], eyes: [6, 0], jaws: [12, 0], fore: [14, 0], hind: [14, 0], tail: [10, 0], back: [12, 0] },
    mods: {}, spd: 3, start: [], unlock: null,
  },
  cinderpup: {
    id: 'cinderpup', name: 'Cinderpup', layout: 'quad', color: '#c8643a', accent: '#f6a05a',
    desc: 'Smouldering and fragile, hits hard. Born with ember glands.',
    parts: { torso: [27, 0], head: [11, 0], eyes: [6, 0], jaws: [12, 0], fore: [13, 0], hind: [13, 0], tail: [9, 0], back: [11, 0] },
    mods: { dmg: 8, res: { fire: 0.25 } }, spd: 4, start: ['ember_glands'], unlock: { type: 'biome', n: 2, text: 'Reach the Ashlands.' },
  },
  gloomfin: {
    id: 'gloomfin', name: 'Gloomfin', layout: 'serpent', color: '#3f7f8f', accent: '#79d0d8',
    desc: 'A long, slippery swimmer with no hindlimbs. Hard to hit. Born with gills.',
    parts: { torso: [30, 0], head: [12, 0], eyes: [6, 0], jaws: [12, 0], fore: [10, 0], tail: [14, 0], back: [12, 0] },
    mods: { dodge: 6, res: { frost: 0.2 } }, spd: 3, start: ['gills'], unlock: { type: 'kills', n: 20, text: 'Defeat 20 creatures in total.' },
  },
  shellback: {
    id: 'shellback', name: 'Shellback', layout: 'quad', color: '#8a7a5a', accent: '#cbb98a',
    desc: 'Slow, stout and armoured. Born with a chitin carapace.',
    parts: { torso: [38, 2], head: [14, 1], eyes: [6, 0], jaws: [12, 0], fore: [15, 1], hind: [15, 1], tail: [10, 0], back: [16, 2] },
    mods: {}, spd: 1, start: ['chitin_carapace'], unlock: { type: 'severs', n: 40, text: 'Sever 40 enemy parts in total.' },
  },
  wispling: {
    id: 'wispling', name: 'Wispling', layout: 'tall', color: '#8a72b8', accent: '#c9b0f2',
    desc: 'A pale, upright dream-creature. Accurate and quick, brittle. Born with a third eye.',
    parts: { torso: [24, 0], head: [11, 0], eyes: [8, 0], jaws: [10, 0], fore: [11, 0], hind: [11, 0], tail: [8, 0], back: [10, 0] },
    mods: { acc: 8, res: { psychic: 0.3 } }, spd: 5, start: ['third_eye'], unlock: { type: 'endings', n: 2, text: 'Witness 2 different endings.' },
  },
};

// Starting seeds the player can buy with spores and start a run with.
export const SEED_COSTS = {
  venom_fangs: 10, ember_glands: 10, hoar_talons: 10, chitin_carapace: 10, spring_haunches: 10, hawk_eyes: 10, knitting_flesh: 10,
  leech_mouth: 12, webbed_hindfeet: 10, spinal_spikes: 12, mottled_fur: 10, echo_pits: 10, glide_flaps: 10, glass_whistle: 12,
  scrap_plates: 14, bone_mace_tail: 14, toxic_glands: 12, clotting_blood: 12, cinder_hide: 14, dense_marrow: 14, pale_hide: 12,
  adrenal_gland: 24, rime_maw: 24, furnace_maw: 28, electric_organ: 26, third_eye: 40, hydra_cells: 45, bloom_heart: 0,
};
