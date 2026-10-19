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

## Topic variety at terminals

`src/topic-spawn.ts` decides which topic a terminal spawns. The curriculum scheduler (`eligible`, `eligibleLearning`) still names exactly one formal visit, but left alone every terminal in a run spawned that same topic, so a run walked one branch and recall of the other topics was never tested. Now a topic is not spawned again while it is among the last `SPAWN_COOLDOWN` spawns on its track when another unfinished topic of the same tier exists; cooled topics with open recorded knowledge gaps come back first; the player can disable topics in Inspect; and a due review or a visit already bound to a terminal is never displaced. Variety terminals carry a `practice` contract (development: `devPracticeContract`; live: `practiceContract` in `src/learner.ts`, same facet bookkeeping at the current tier). `beginVisit` returns without binding for them, `assess` skips them and `canRunWorkspace` allows their runtime only by depth, so they never become academic evidence; their knowledge probes are recorded like any other terminal. Spawn history is kept on `study.topicSpawn`, bounded and carried across runs.

## Office building art and furniture weight — 2026-10-19

The building now reads as an office. Study rooms are carpeted, corridors and lobbies have vinyl tile, walls have lit caps, and every furniture kind has a recognisable top-down sprite. All of it is procedural; sources and techniques are in [OFFICE_ART.md](OFFICE_ART.md). New kinds are office chair, meeting table, filing cabinet, water cooler, plant, printer, mobile whiteboard and cubicle partition (`FURNITURE` in `src/model.ts`). Each is an ordinary physical object with its own footprint, handling speed, health and floor friction (`resist`). Generated floors place them back-to-wall per room: a meeting room with a whiteboard, open-plan partitions with a printer, a break area with a water cooler, and storage cabinets. Placement never cuts off a terminal or a reachable cell (`src/office-layout.ts`). Saved floors are never re-furnished on load.

Fresh force-field runs are furnished too, at the user's request: "i want the environments to look like a real office building with real objects (cubicles, water tanks, tables, chairs, whiteboards, etc.) with physics". This supersedes the earlier rule that fresh runs contain no movable furniture. `redesign()` still strips the generated legacy furniture, then `furnishOffice` places 17–20 movable pieces per floor (64 seeds measured) using `pursuitOfficeZones`. Every cell of every field opening, the stairs and the entry are kept clear (`fieldClearance`), so a piece cannot seal a force-field entrance. `pursuitLayoutErrors` passes on all 64 seeds × 4 floors. The crowded rear free hall often receives none. Route search now caches a per-floor furniture cell grid instead of scanning every object per expanded cell. That keeps the 600-zombie benchmark at parity: dense mean 10.6 ms (10.8 before), p95 13.4 ms (12.4); normal mean 7.1 ms (6.8). Render cost on a furnished fresh floor with 300 zombies is a median of 0.8–0.9 ms against 1.9 ms for the previous per-tile renderer, with p95 about 2.4 ms for both.

Zombies pushed furniture far too easily. Measurements identified three causes:

1. **planck 1.5.1's FrictionJoint never applied its linear impulse.** Its clamp aliases the accumulated impulse (`oldImpulse = this.m_linearImpulse`, then `add`, then `sub`), so unheld furniture was only slowed by linear damping. Floor friction is now applied directly as a Coulomb impulse each substep. The joint is kept for turning, where it works, and its torque now scales with the footprint.
2. **Zombie velocity was reset every frame.** That injects m·v of momentum per frame: an unbounded push that grew with display frame rate. At 120 Hz, 10 zombies slid a 3,200-HP shelf aside in 5.7 s; at 60 Hz, 10 pushed a fridge out in 16 s. A zombie touching movable furniture, directly or through other zombies, now drives with a bounded force (`ZOMBIE_PUSH`). Free zombies and all survivors keep direct velocity control, so survivor/zombie contact is unchanged. Zombies are no longer planck bullets, because TOI sub-steps resolved their impacts without joints.
3. **Solver creep under crowd compression.** An unheld object now rests as a static body and becomes dynamic only when the contact push it receives exceeds its floor resistance (static friction). Only body type and velocity change; positions are never written.

Each object's `resist` is measured against one zombie's push of 30. Chairs (20), office chairs (8) and plants (25) are lighter than one zombie, so a zombie keeps walking into them and shoves them aside while striking (`engine.ts`). Heavier objects stop the zombie, which attacks under the existing contact-slot rules. Furniture still has individual health; there is no shared pool and nothing is teleported. A line `[fridge][chair][fridge]` is now weak at the chair in two ways: it breaks fastest and it can be shoved. NPC furniture routes now finish within 0.03 of each waypoint, because a released object no longer coasts into place.

Verification: `heavy-furniture-holds-crowd.json` (8 zombies vs a fridge, 60 s), `desk-blocks-crowd.json` (4 zombies vs a desk across a two-cell opening, 60 s) and `zombie-shoves-chair.json`. The first two fail against the previous source (the fridge is pushed 0.05 by tick 1357; the desk slides at tick 147). The chair case fails before because the zombie spent 30 s breaking the chair. `tests/zombie-furniture-push.test.ts` replays all three at 30, 60 and 120 Hz; all six cases fail on the previous source.
