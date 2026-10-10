import { tagCounts, allMutIds } from './creature.js';

export const ENDINGS = {
  companion: { id: 'companion', title: 'The Gardener\u2019s Companion', text: 'The Heart stills, and the Bloom lets go. Your pet looks back at you, not at the ruin. Whatever it became, it chose to stay. You walk out of the Ashlands together, and green creeps in behind your steps.' },
  apex: { id: 'apex', title: 'Apex of the Bloom', text: 'Wild and unleashed, your pet does not walk out. It lowers its head to the Heart and takes the seat at the centre of the Bloom. Somewhere in the distance, a new hunt begins. You are welcome to stay, as long as you can keep up.' },
  hive: { id: 'hive', title: 'The Hive Crown', text: 'Threads of symbiotes spill from your pet and into the roots. The Bloom does not die: it listens. A thousand small minds hum behind your pet\u2019s eyes and call you friend. The swamps will be very organised from now on.' },
  colossus: { id: 'colossus', title: 'The Living Fortress', text: 'Plate over bone over plate. Your pet is a wall that walks. It settles over the broken Heart like a mountain over a spring, and the Bloom grows slowly, safely, in its shadow.' },
  abomination: { id: 'abomination', title: 'The Blight King', text: 'Too many curses, too many hungers. The Heart is dead but its power flows into your pet, and the power has opinions. You are not sure the thing that follows you home is still the pet you raised. It is certain it is still yours.' },
  ascendant: { id: 'ascendant', title: 'The Wisp Ascendant', text: 'Sound, sight and thought lift your pet from the ash. It rises and the Bloom\u2019s petals open towards it. You watch it become a light, and a song, and then a rumour of both.' },
  tidal: { id: 'tidal', title: 'The Tidal Wild', text: 'Gills and shadows, mending flesh, a body that remembers water. The ashlands flood with the Heart\u2019s dying blood, and your pet slips beneath it, free. Rivers will be named after it.' },
  drifters: { id: 'drifters', title: 'Wanderers of the Bloom', text: 'Neither tamed nor wild, neither monster nor friend: you and your pet leave the Heart behind and keep walking. There are other blooms. There is always another bloom.' },
  strike: { id: 'strike', title: 'The Conscientious Objector', text: 'Your pet sits down in the middle of the road and will not stand. It has fought for you for as long as it could. In the silence that follows, you finally hear what it was trying to say all along.' },
  death: { id: 'death', title: 'Compost', text: 'The Bloom takes what it is owed. Your pet\u2019s body feeds the roots, and something small and green is already growing from the place where it fell.' },
  quit: { id: 'quit', title: 'Left Behind', text: 'You turned back. The Bloom will wait; it has always waited.' },
};

export function pickEnding(run) {
  const pet = run.pet;
  const t = tagCounts(pet);
  const g = k => t[k] || 0;
  const total = allMutIds(pet).length;
  if (g('cursed') >= 2 || (total >= 10 && run.bond < 50)) return ENDINGS.abomination;
  if (g('parasite') + g('venom') >= 4 && g('parasite') >= 2) return ENDINGS.hive;
  if (g('armor') + g('bone') >= 5) return ENDINGS.colossus;
  if (g('flight') + g('psychic') + g('sonic') + g('sensory') >= 5) return ENDINGS.ascendant;
  if (g('aquatic') + g('camo') + g('regen') >= 5) return ENDINGS.tidal;
  if (run.bond >= 65 && run.abuse <= 2) return ENDINGS.companion;
  if (run.bond < 35 || pet.feral > 0.3) return ENDINGS.apex;
  return ENDINGS.drifters;
}
