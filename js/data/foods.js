// Foods: tag amounts feed the diet (mutation pressure). heal = fraction of max torso HP. bond = bond change.
export const FOODS = {
  fire_pepper: { id: 'fire_pepper', name: 'Fire Pepper', desc: 'Burns going down. Grows heat glands.', tags: { fire: 2 }, heal: 0.08, bond: 0, biomes: ['ashlands', 'swamp'] },
  scrap_metal: { id: 'scrap_metal', name: 'Scrap Metal', desc: 'Crunchy. Encourages plating.', tags: { armor: 2 }, heal: 0.04, bond: -1, biomes: ['caves', 'ashlands'] },
  glowcap: { id: 'glowcap', name: 'Glowcap Mushroom', desc: 'Dreamy light. Sharpens senses.', tags: { psychic: 1, sensory: 1 }, heal: 0.08, bond: 1, biomes: ['caves', 'swamp'] },
  bog_leech: { id: 'bog_leech', name: 'Bog Leech', desc: 'Wriggles. Invites symbiotes.', tags: { parasite: 2 }, heal: 0.1, bond: 0, biomes: ['swamp'] },
  frost_berry: { id: 'frost_berry', name: 'Frost Berry', desc: 'Painfully cold and sweet.', tags: { frost: 2 }, heal: 0.08, bond: 1, biomes: ['caves'] },
  raw_meat: { id: 'raw_meat', name: 'Raw Meat', desc: 'Primal. Heals well but feeds wildness.', tags: { bone: 1, speed: 1, cursed: 1 }, heal: 0.2, bond: -3, biomes: ['swamp', 'caves', 'ashlands'] },
  sweet_nectar: { id: 'sweet_nectar', name: 'Sweet Nectar', desc: 'A treat your pet adores.', tags: { regen: 1, flight: 1 }, heal: 0.1, bond: 8, biomes: ['swamp', 'caves', 'ashlands'] },
  marrow_bone: { id: 'marrow_bone', name: 'Marrow Bone', desc: 'Grows spines and horns.', tags: { bone: 2 }, heal: 0.08, bond: 1, biomes: ['caves', 'ashlands'] },
  spider_cocoon: { id: 'spider_cocoon', name: 'Spider Cocoon', desc: 'Silky and a little toxic.', tags: { camo: 1, venom: 1 }, heal: 0.06, bond: 0, biomes: ['caves'] },
  toad_gland: { id: 'toad_gland', name: 'Toad Venom Gland', desc: 'Bitter. Builds toxins.', tags: { venom: 2 }, heal: 0.04, bond: 0, biomes: ['swamp'] },
  eel_roe: { id: 'eel_roe', name: 'Eel Roe', desc: 'Briny. Encourages gills and fins.', tags: { aquatic: 2 }, heal: 0.08, bond: 1, biomes: ['swamp'] },
  echo_shell: { id: 'echo_shell', name: 'Echo Shell', desc: 'Hums when chewed.', tags: { sonic: 2 }, heal: 0.06, bond: 0, biomes: ['caves'] },
  pale_root: { id: 'pale_root', name: 'Pale Root', desc: 'Bleaches the hide.', tags: { camo: 2 }, heal: 0.06, bond: 1, biomes: ['caves', 'swamp'] },
  bat_wing: { id: 'bat_wing', name: 'Dried Bat Wing', desc: 'Light and leathery.', tags: { flight: 2 }, heal: 0.06, bond: 0, biomes: ['caves', 'ashlands'] },
  rotfruit: { id: 'rotfruit', name: 'Rotfruit', desc: 'Spoiled. Powerful but sours your pet.', tags: { cursed: 2, regen: 1 }, heal: 0.12, bond: -4, biomes: ['swamp', 'ashlands'] },
  hearty_stew: { id: 'hearty_stew', name: 'Hearty Stew', desc: 'Warm and filling.', tags: { regen: 2 }, heal: 0.25, bond: 4, biomes: ['swamp', 'caves', 'ashlands'] },
};
export const FOOD_IDS = Object.keys(FOODS);
