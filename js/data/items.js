export const ITEMS = {
  salve: { id: 'salve', name: 'Marsh Salve', desc: 'Heal 14 torso HP.', target: null },
  bandage: { id: 'bandage', name: 'Moss Bandage', desc: 'Fully heal one of your parts.', target: 'ownPart' },
  antidote: { id: 'antidote', name: 'Clear Antidote', desc: 'Cure all of your status ailments.', target: null },
  thread: { id: 'thread', name: 'Gut Thread', desc: 'Re-attach a severed part of yours at 50% HP.', target: 'ownSevered' },
  pepper_bomb: { id: 'pepper_bomb', name: 'Pepper Bomb', desc: 'Burns every enemy part for 8 fire damage.', target: null },
  bait: { id: 'bait', name: 'Bait Meat', desc: 'The enemy is distracted and loses its next turn.', target: null },
  whetstone: { id: 'whetstone', name: 'Whetstone', desc: 'Your next attack deals +60% damage.', target: null },
  tonic: { id: 'tonic', name: 'Frenzy Tonic', desc: '+30% damage this fight. Costs 6 bond.', target: null },
};
export const ITEM_IDS = Object.keys(ITEMS);
export const INV_MAX = 4;
