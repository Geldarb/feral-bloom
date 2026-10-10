// Mystery events. Each choice's fn(run, rng, api) returns a result string.
export const EVENTS = [
  { id: 'wanderer', title: 'The Wounded Traveller', text: 'A bandaged traveller slumps against a root. Their own pet-companion eyes yours warily.',
    choices: [
      { label: 'Share your food', hint: 'Befriend them (ally habit, +bond)', fn: (r, g, a) => { a.bond(r, 4); const h = a.habit(r, g); return h ? `Their companion nuzzles your pet. Your pet learns a habit: ${h}.` : 'They thank you warmly. Your pet feels proud.'; } },
      { label: 'Rob them', hint: '2 items, -5 bond', fn: (r, g, a) => { a.bond(r, -5); a.abuse(r, 1); const x = a.item(r, g), y = a.item(r, g); return `You take ${[x, y].filter(Boolean).join(' and ') || 'nothing useful'}. Your pet will not meet your eyes.`; } },
      { label: 'Walk on', hint: 'Nothing happens', fn: () => 'You leave them to their luck.' } ] },
  { id: 'pool', title: 'The Glowing Pool', text: 'Luminous water laps at the bank. Your pet stares into it, hungry and curious.',
    choices: [
      { label: 'Let your pet drink', hint: 'Gamble: mutation, healing, or poison', fn: (r, g, a) => { const x = g.next(); if (x < 0.5) return a.mutate(r, g) || 'The water tingles, but nothing changes.'; if (x < 0.8) { a.heal(r, 0.5); return 'The water heals your pet beautifully.'; } a.hurt(r, 8); a.diet(r, { venom: 2 }); return 'The water is tainted! Your pet retches (-8 HP) but its blood adapts to toxins.'; } },
      { label: 'Bottle some', hint: 'Gain a Marsh Salve', fn: (r, g, a) => { a.addItem(r, 'salve'); return 'You fill a vial. It will do for a wound.'; } },
      { label: 'Leave', hint: '', fn: () => 'You are not that thirsty.' } ] },
  { id: 'cage', title: 'The Rusted Cage', text: 'A starved creature rattles a cage of bone and wire. Your pet growls at it - hungry, or kind?',
    choices: [
      { label: 'Free it', hint: '+8 bond, small risk', fn: (r, g, a) => { a.bond(r, 8); if (g.chance(0.25)) { a.hurt(r, 6); return 'It bites you as it bolts (-6 HP). Your pet loved that you tried.'; } a.addItem(r, 'bait'); return 'It leaves a gift: a lump of bait meat. Your pet wags its tail.'; } },
      { label: 'Let your pet feast', hint: 'Heal 25%, -6 bond, cursed diet', fn: (r, g, a) => { a.heal(r, 0.25); a.bond(r, -6); a.abuse(r, 1); a.diet(r, { cursed: 1, bone: 1 }); return 'Your pet eats, eyes on you the whole time.'; } },
      { label: 'Leave', hint: '', fn: () => 'The rattling fades behind you.' } ] },
  { id: 'idol', title: 'The Whispering Idol', text: 'A little idol of black wax hums, offering something that is not for free.',
    choices: [
      { label: 'Touch the idol', hint: 'Gain a cursed mutation, -5 bond', fn: (r, g, a) => { a.bond(r, -5); return a.mutate(r, g, { tag: 'cursed' }) || 'The idol is silent. It was only wax.'; } },
      { label: 'Smash it', hint: '+Whetstone, +2 bond', fn: (r, g, a) => { a.bond(r, 2); a.addItem(r, 'whetstone'); return 'It shatters into a sharp black shard that makes a fine whetstone.'; } },
      { label: 'Leave', hint: '', fn: () => 'The humming follows you for a while.' } ] },
  { id: 'trainer', title: 'The Rival Trainer', text: 'A stranger with a scarred pet nods at the path. "Spar, or trade?"',
    choices: [
      { label: 'Spar', hint: '-6 HP, +6 bond, +3% damage', fn: (r, g, a) => { a.hurt(r, 6); a.bond(r, 6); a.boost(r, { dmg: 3 }); return 'A friendly bout. Your pet learns a trick (+3% damage, +6 bond).'; } },
      { label: 'Trade', hint: 'Swap an item for a random one', fn: (r, g, a) => { if (!r.inv.length) return 'You have nothing to trade.'; r.inv.shift(); const i = a.item(r, g); return `You trade for ${i || 'a bit of lint'}.`; } },
      { label: 'Ignore', hint: '', fn: () => 'You nod and walk on.' } ] },
  { id: 'camp', title: 'The Abandoned Camp', text: 'A cold fire and an open pack. Nobody home.',
    choices: [
      { label: 'Search', hint: '2 items, maybe a trap', fn: (r, g, a) => { const x = a.item(r, g), y = a.item(r, g); let t = `You find ${[x, y].filter(Boolean).join(' and ') || 'nothing'}.`; if (g.chance(0.3)) { a.hurt(r, 8); t += ' A snare bites your pet (-8 HP).'; } return t; } },
      { label: 'Rest there', hint: 'Heal 25%', fn: (r, g, a) => { a.heal(r, 0.25); return 'You both nap by the dead fire.'; } } ] },
  { id: 'goad', title: 'The Bone Goad', text: 'A cruel hooked rod hangs from a branch. Trainers use these to drive their pets harder.',
    choices: [
      { label: 'Take it', hint: '+Frenzy Tonic', fn: (r, g, a) => { a.addItem(r, 'tonic'); return 'You pocket a vial of dark tonic that was hanging beside it.'; } },
      { label: 'Drive your pet with it', hint: '+6% damage, -12 bond, abuse', fn: (r, g, a) => { a.boost(r, { dmg: 6 }); a.bond(r, -12); a.abuse(r, 2); return 'Your pet fights harder now. It has stopped expecting kindness.'; } },
      { label: 'Burn it', hint: '+5 bond', fn: (r, g, a) => { a.bond(r, 5); return 'You burn the goad. Your pet watches the fire with something like thanks.'; } } ] },
  { id: 'husk', title: 'The Molting Husk', text: 'A huge shed carapace lies in the dirt, still warm.',
    choices: [
      { label: 'Let your pet eat it', hint: 'Armour diet +2, heal 10%', fn: (r, g, a) => { a.diet(r, { armor: 2 }); a.heal(r, 0.1); return 'Crunch. Your pet licks its lips.'; } },
      { label: 'Fashion armour', hint: '+1 armour everywhere, -1 speed', fn: (r, g, a) => { a.boost(r, { armAll: 1, spd: -1 }); return 'You lash plates to your pet. It is safer, if slower.'; } },
      { label: 'Leave', hint: '', fn: () => 'You leave it to the beetles.' } ] },
  { id: 'garden', title: 'The Fungal Garden', text: 'Glowing caps sway in a windless hollow.',
    choices: [
      { label: 'Eat the spores', hint: 'Psychic and sensory diet, -4 HP', fn: (r, g, a) => { a.diet(r, { psychic: 2, sensory: 2 }); a.hurt(r, 4); return 'Colours bloom behind your pet\u2019s eyes (-4 HP).'; } },
      { label: 'Tend the garden', hint: '+10 bond, heal 15%', fn: (r, g, a) => { a.bond(r, 10); a.heal(r, 0.15); return 'You and your pet tend the little garden. It is peaceful.'; } } ] },
  { id: 'echo', title: 'The Echoing Well', text: 'You drop a pebble. Nothing hits the bottom, but something calls back.',
    choices: [
      { label: 'Call down', hint: 'Sonic diet +2, maybe a mutation', fn: (r, g, a) => { a.diet(r, { sonic: 2 }); return g.chance(0.4) ? a.mutate(r, g, { tag: 'sonic' }) || 'The echo fades.' : 'The echo returns richer. Your pet\u2019s ears twitch.'; } },
      { label: 'Throw in a treat', hint: '+6 bond', fn: (r, g, a) => { a.bond(r, 6); return 'Something purrs from below. Your pet purrs back.'; } } ] },
];
