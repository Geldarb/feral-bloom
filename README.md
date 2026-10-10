# Feral Bloom

**A mutation roguelike in your browser.** Raise one pet through three hostile biomes. Feed it, scar it, sever its enemies' limbs and watch it become something you did not plan. No build step, no dependencies: plain HTML, CSS and ES modules.

> **Play it live: https://feral-bloom.onrender.com**

## The pitch

- **One pet per run.** No catching, no swapping. Every run is a fresh, seeded, procedurally generated map and a fresh pet; if it dies, the run is over (permadeath).
- **Part-targeted combat.** Every creature has a body map: *head, eyes, jaws, forelimbs, hindlimbs, tail, back, torso* plus mutated extra limbs. Every part has its own HP and armour. Pick an action, then pick **which part to hit**. Reduce a part to 0 and it is **severed**:
  - **Eyes** gone: blind, accuracy collapses. **Jaws** gone: no bites or venom. **Forelimbs** gone: fewer attacks, less damage. **Hindlimbs** gone: slow, limping, easy to hit. **Tail** gone: no balance, no counter-attacks. **Back** gone: mutation organs (wings, spines, sacs) switch off. **Head** gone: dazed. **Torso**: the only killing blow, and the best protected.
  - Slashing is great against limbs/tails, piercing against eyes/jaws, blunt against heads/backs.
  - Enemies target *your* parts, intelligently (hunters disarm you, saboteurs go for eyes and legs, executioners wait for a weak torso). Bosses regrow severed parts on a timer, so timing matters.
  - Severed enemy parts fall to the ground: **devour** one mid-fight to heal, or **absorb** it afterwards to graft its trait onto your pet.
- **Mutation is a living system** (77 mutations in `js/data/mutations.js`):
  - **Food**: fire pepper grows heat glands, scrap metal grows plating... four points of one tag and your pet mutates on the spot.
  - **Biome**: the Bog favours venom/aquatic/parasite, the Caves sonic/bone/frost/sensory, the Ashlands fire/armour/cursed.
  - **Injuries**: get burned often and you earn fire resistance... and aggression.
  - **Regrowth**: lost parts regrow after the fight as a new mutation shaped by diet, biome, injuries and bond. High bond lets you choose; low bond leaves it to the wild.
  - **Allies and bosses**: spare an elite alpha to gain an ally habit; every boss drops a legendary trophy mutation.
  - **Synergies** (3 mutations of a theme: Toxic Cloud, Inferno Blood, Hydra Tissue, Dark Pact...), **conflicts** (some mutations cannot coexist) and **clashing themes** (fire+frost, armour+wings, mind+sound).
- **Bond and ferality.** Care makes your pet loyal. Neglect makes it feral: stronger, but it may ignore your orders. Push it too far and it **refuses to fight**.
- **8+ endings** based on what your pet became, plus the "Conscientious Objector" ending if it refuses you.
- **Meta-progression** (saved in `localStorage`): spores, unlockable pet species (5), purchasable mutation seeds, a mutation codex, an endings log and best-run stats.

## Content

| | |
|---|---|
| Mutations | 77 (15 themed categories + 4 boss trophies), plus 6 ally habits |
| Enemy species | 15 (5 per biome) with distinct body maps, moves and AI profiles; elite "Alpha" variants |
| Bosses | 4: Mother Mire (regrowing hydra), The Stonechoir (crystal roar), Cinder Wyrm (molts and rages), Heart of the Bloom (mirrors your pet) |
| Node types | fight, elite fight, feeding site, rest & care, mutation shrine, mystery event (10 events), boss |
| Map | 15 steps across Swamp, Caves, Ashlands, Heart |
| Pet species | Mossling, Cinderpup, Gloomfin, Shellback, Wispling |
| Items | 8 |

## How to play

1. **Play**, pick a pet card, **Start**. (A 3-step skippable tour appears on your first run.)
2. On the map tap a glowing node. Each biome ends with a boss; the Heart of the Bloom waits at the end.
3. In a fight, **one tap per turn**: the best body part is pre-selected, so just tap **Attack** (the game picks the best move for that part), or tap a body part on the enemy to strike it right away. **Hold** a part to aim at it without striking; the strip above the buttons shows hit %, damage and whether it cuts the part off. **Special** uses your best mutation move, **Brace** guards, **Items** lists items and severed parts you can devour. The small list button next to the preview pins a specific move.
4. After a win there is a single **Continue**: switches decide which severed traits to absorb (and which reward to take).
5. Keep an eye on **bond** (pink bar). Rest, groom, and feed treats. The gear menu holds Sound, Fast animations, "Tap a part to strike" (on by default), the combat log and Give up.

Mobile: designed for phones in portrait (360-430px) and landscape (arena left, controls right): bottom-anchored action bar, bottom-sheet modals, 44px+ touch targets, safe-area insets. Add it to the home screen (PWA manifest + icons).

Keyboard (desktop): `1`-`4` = Attack / Special / Brace / Items (also pick options on choice screens and travel on the map), `Enter` = primary button, `Esc` = back/close, `P` pet, `M` menu.

## Art

All art is hand-authored SVG, generated in code (no image assets): `js/art/` holds a drawing kit (outlines, gradient shading, highlights), 8 body-plan archetypes (quadruped, lizard, serpent, winged, crab, spider, biped, blob), per-species palettes and decorations for the 5 pets, 15 enemies and 4 bosses, ~50 mutation overlays that visibly change the pet (wings, horns, fangs, plating, flames, extra eyes...), layered biome backgrounds and an icon set. Every targetable body part is its own clickable region; severed parts vanish into a bleeding stump drawn at the part's socket. Mutation overlays mount to per-body-plan anchor points (`js/art/overlays.js`): roots tuck behind the body, decals are clipped to the torso silhouette, and horns/wings/spines grow out from behind the part that hosts them. The five pets have distinct silhouettes: Mossling (chunky bog-pup), Cinderpup (lean long-snouted fox), Gloomfin (long newt/axolotl), Shellback (low-slung dome-shelled tortoise) and Wispling (upright big-eared sprite).

## Run locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

(Any static file server works. ES modules require serving over http, not opening `index.html` via `file://`.)

## Project layout

```
index.html, style.css, manifest.webmanifest, sw.js, icons/   (PWA)
js/
  main.js            entry point
  ui.js              screens, input, rendering
  svg.js             creature renderer (parts, stumps, overlays, bars, animation classes)
  art/               SVG art: kit, archetypes, species, mutation overlays, backgrounds, icons
  audio.js           WebAudio blips
  game.js            run controller (nodes, feeding, rest, shrine, events, post-fight, run end)
  combat.js          part-targeted turn-based combat, status effects, enemy AI
  creature.js        body maps, derived stats, mutation sockets
  mutation.js        mutation engine (diet/biome/injury/bond weighting, regrowth, adaptation)
  map.js             branching map generator
  events.js, endings.js, store.js, rng.js
  data/              mutations, synergies, enemies+bosses+biomes, species, foods, items
tests/
  logic.mjs          rule tests
  sim.mjs            headless simulation of hundreds of full runs with a bot
  bot.mjs            the bot
  browser.mjs        headless Chrome: mobile (390x844 touch) + desktop (keyboard/mouse) click-through, layout audit, screenshots
```

## Tests

```bash
node tests/logic.mjs        # rule tests: severing, regrowth, bosses, feral/refusal, determinism, save/restore, events
node tests/art.mjs          # renders every creature x every mutation x sever masks; checks for NaN/dangling refs/unbalanced SVG
node tests/sim.mjs 300      # bot plays 300 full runs; fails on any crash
# contact sheets of all creatures (plain / mutated / severed): open tools/contact.html?g=0..5 in a browser (or see tools/)
# headless browser click-through (installs nothing in the repo):
mkdir -p /tmp/pw && (cd /tmp/pw && npm i puppeteer-core) && PW_DIR=/tmp/pw node tests/browser.mjs [url] [screenshotDir]
# mobile pass: title -> setup -> tutorial -> map -> pet sheet -> fights (1 tap/turn) -> post-fight, plus hold-to-aim, tap-a-part strike,
# small-phone and landscape combat; checks no horizontal overflow, touch targets >= 44px, no console errors; screenshots go to /workspace/feral-bloom-shots2
```

## Notes

- All randomness is seeded (`js/rng.js`); the same seed gives the same map and encounters.
- A run is auto-saved after every step (`localStorage`), so you can close the tab and **Continue** later.
- Deploys as a static site (publish path `.`), no build.
