# Additional confirmed design decisions

## Finite omnidirectional visibility — user request, 2026-10-15

The survivor sees 360 degrees around their position, independent of heading, over a finite distance. They cannot see through walls or closed doors. This is a binding addition to the handoff and applies equally during normal play and the Surge.

Implementation: `src/visibility.ts` casts world-space rays against wall cells and the actual footprints of closed doors, the entrance gate, fridges and tall bookshelves. Low furniture does not block eye-level sight. Distances default to 11 tiles in lit areas, 8 in dim areas and 5.4 in darkness. These are configurable presentation defaults, not academic difficulty settings.

`src/render.ts` clips the entire live world to the visibility polygon, including actor bodies, nameplates, terminal glow, effects and placement previews. Previously explored map cells do not display current activity through walls. NPC discovery uses the same bounded observer rules; zombie vision is also occlusion-aware and pursuit can follow audible movement/last-known positions without granting visual knowledge through barriers.

Room doors are physical, destructible objects. Press E nearby to open/close; closing is rejected if a survivor, zombie or furniture occupies the panel. Opening/breaking a door changes sight paths immediately. Zombies break closed doors rather than opening or vaulting them.

Old saves retain established geometry; doors and additional rooftop cover are generated on a new run. Finite visibility applies to old saves as well. Do not silently add objects to a previously established floor when loading it.

Verification:

- `tests/visibility.test.ts`: 720 directions, finite range, walls, door open/closed/broken, opaque furniture moved/broken, bounded dark radii, save/Surge consistency, door collision, physical station occupancy, stair travel, 30-seed furniture placement and solo-instance isolation.
- `tests/browser/play.spec.ts`: real Canvas pixel checks show a rearward visible actor, conceal an actor behind a closed door and outside the radius, reveal the actor when opened, then conceal it again with the Surge palette. Screenshots are emitted under test-results/.

## Simulation fixes in the same development cycle

Station assignments remain stable while approaching. One physical station supports one active survivor; fleeing releases its reservation. NPC-only progress remains explicitly simulated, not human academic evidence. Fleeing considers open local routes instead of aiming directly into corners. Stair flights take two seconds and zombies queue when the connected landing is occupied. Finite roof furniture supports waiting for later aircraft.

All solo stations have distinct encounters. Shared stations alone share one encounter. Each ordinary floor currently has two five-station shared stair encounters, six individual stair encounters and three individual optional caches. These are finite per run, with no terminal respawn.


## Player sight: only walls occlude — 2026-10-17

The user explicitly changed player visibility: see through everything except walls, including doors/windows. The human rendering and light use a finite360-degree wall-only ray. Doors, gates and furniture do not hide actors, terminals, names or cues. A window/opening represented as non-wall space does not stop sight; no new window object or map architecture is introduced by this visibility change. Physical contact, door traversal, projectiles, NPC perception and acoustic barriers remain separately modeled. This supersedes the earlier player sight rule that treated closed doors and tall cover as opaque.

## 2026-10-17 — Human feedback: pause, fewer keys, pivoting furniture and recent-game logs

Explicit Escape pauses survival, including while typing; terminal use by itself continues to run in real time. Restart is available during a run and retains learning progress and unfinished work. E toggles a furniture grip instead of requiring G, and movement supplies off-center drag torque instead of requiring R. Space crosses a nearby barricade. Equipment uses the visible pack controls instead of number shortcuts. These choices supersede earlier Escape/G/R instructions.

Zombies share the survivor body silhouette in puke green, with the old diagonal arm/slash removed. Moving cover invalidates NPC routes and rotated cover participates in physical navigation and vaulting. Diagnostics retain only the last three games with a fixed per-game cap; their retention policy never deletes learning archives. Logs are local browser data and can be downloaded from Pause or Settings.

## Shared rigid-body contacts and door handles — 2026-10-17

The user requested physical player/NPC/zombie bodies, physical furniture and doors that must first be released with E, swing under contact and latch again when pushed closed. A shared Planck solver replaces live actor overlap and proxy furniture motion. Circle bodies match the common survivor-style figure; walls remain fixed. Continuous rotated geometry still drives reach, placement, visibility and navigation independently of the human's wall-only sight.

Doors retain a physical leaf after release. E near an already released free end offers the same grip/release concept as furniture, allowing a pull when an outside barricade blocks the outward swing. NPCs use that same reachable handle rather than disappearing doors, moving barricades remotely or changing coordinates. They must close and release the latch again before reversing a committed swing. Recorded movement/learning histories are preserved.

Historical escape fixtures assumed a human could move through a dense live horde. That win expectation is incompatible with the requested solid bodies. Quiet layered-egress cases separately prove actual human/NPC access and retained plans; the live-pursuit regression accepts only a real hallway arrival or a witnessed contact death. It never removes the horde or grants health, speed, items or learning credit to manufacture a win. Balance and feel still require the final human playtest. Source-bound current checks and any representative long-study measurement are recorded in `docs/evidence/rigid-world-physics.json`; archived balance reports are not relabeled as measurements of this solver.
