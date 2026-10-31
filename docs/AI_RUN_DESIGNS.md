# AI-authored runs

New games offer AI design before play. The existing ChatGPT handoff authors one bounded blueprint for the whole run. Loading a saved game keeps its geometry, design and progress; it never requests a replacement design. Existing saves and seed-only GameTest worlds keep their previous behavior.

## Authored choices

The `RunDesign` contract (`src/run-design-contract.mjs` and its TypeScript declaration) includes:

- A title, premise, opening, four floor names and a roof name.
- Building footprint shape, width, depth and setbacks.
- Per-floor plan family, study-room order, furniture functions and density, permitted subroom types, field quotas and a seed for smaller spatial details.
- Nineteen named survivors with roles, skill, risk and sociability.
- Per-room power, six authored story cards per floor, and the damaged exterior guard bay.
- City road dimensions, district size, height range, palette and damage; building/quarantine signs, eight street/shop labels and skyline characteristics.
- Bounded horde cadence/capacity, NPC thought rate and helicopter timing.

New requests ask for version 2, which adds an individual scene for each study room:

- A room title, purpose, named owner, surface/metal/accent palette and condition.
- Specific pieces of physical furniture with a requested position within the room, rotation, color, condition, label and owner.
- Individual mugs, books, papers, pens, photos, notes, plants, bottles, phones, boxes, lamps and trophies attached to named furniture. Each has its own position on the surface, rotation, scale, colors, condition, label, owner and text.

Owners must belong to the authored survivor roster. The designer can connect a person's objects, notes and room purpose into a consistent fictional story. It supplies structured data from an approved catalog; no generated scripts, arbitrary asset URLs or executable world code are accepted. Version 1 saves and already captured requests retain their original contract and behavior.

Explicit furniture is placed before the procedural filler. The engine chooses the nearest valid position to the requested room anchor, preserving terminal access, passage clearance and egress. Furniture uses its ordinary visible geometry and native collision body. Worn pieces start at 85% health and damaged pieces at 45%, so the choice affects their usefulness as barricades. Surface props are decorative and follow their supporting furniture when it moves or rotates; destroying or removing that support hides its decorations. They add no invisible collision volumes.

Surface anchors describe positions within the usable tabletop. A bounded deterministic packing pass keeps rotated, scaled props supported and separated. A design that cannot fit is rejected with an item-specific repair reason; requested objects are never silently discarded. Each floor permits at most 16 authored furniture pieces and 48 small props. These budgets apply before any rendering work.

Looking closely at a prop or room sign shows its readable caption while the normal furniture interaction stays available. NPC dialogue can use nearby, currently visible inscriptions; it does not receive every room's story as hidden knowledge. Those observations are rechecked if the object moves, is destroyed or leaves sight. Each floor's individual labels share one texture atlas, and its authored dressing adds at most five instanced draw calls.

The engine still supplies unspecified furniture, small procedural details, physics and moment-to-moment behavior. Floor count, terminal capacity, curriculum eligibility, learning evidence, credential/key rules, collision dimensions, fall damage and the 180-second opening remain engine constraints. AI text is plain text rendered through escaped DOM or canvas operations.

## Generation and offline behavior

1. A new-run request captures a fresh seed, independent generation/chat IDs and up to five recent fictional design summaries. It contains no learner state, curriculum, conversations, credentials or real save content.
2. The UI stores the exact request before release and queues `design-run` through the configured ChatGPT handoff. It provides a copyable chat request and connection controls. There is no API-key integration.
3. The relay validates request/reply shape and correlation. The client validates the complete design, constructs an isolated candidate and checks the real building, floor-plan and furnishing invariants before replacing the active world.
4. Geometry failures or repeated designs request bounded repairs under the same generation/chat, with a new request ID for each revised packet. There are at most three model calls per attempt. Exact transport retries retain the original packet and ID. A native completion can fetch one bound repair continuation; it stops when no further job arrives.
5. Offline, timed-out or exhausted attempts remain visible with Retry, Cancel and **Use procedural run instead**. Fallback is an explicit player choice. Cancellation leaves the previous run intact and rejects late results.

The UI never presents procedural output as AI-authored. A bridge process being present does not mean ChatGPT is listening; a connected chat must actually serve the design request. Large captured packets use the existing exact chunk-reading protocol.

## Validation, novelty and persistence

The shared validator rejects unknown fields, wrong counts/types, unbounded strings and out-of-range choices. It requires a lit free study hall, nineteen unique names and a valid study-room permutation. Generated geometry must retain one shared shell, accessible portals, the force-field chain, enough free terminals for all survivors, spaced terminals with wide access and credentialed egress, and furnishing that leaves routes open. Designed floors retry smaller details within the requested family; failure requests AI repair rather than silently substituting a different family.

Novelty checks compare effective building/floor/street arrangement and require changes to at least two of atmosphere, cast and tempo, plus a distinct title and premise, against each of the last five accepted designs. Version 2 also compares physical furniture kinds and positions, using room-relative fifths and 30-degree heading bins. A different seed, object-key order, label, tabletop prop or tiny position nudge cannot disguise an identical spatial plan. This prevents recent exact patterns; it is not a guarantee that two runs can never feel similar.

`Game.design` stores the full accepted blueprint, source, request/generation IDs and a deterministic fingerprint. Floors store the descriptors used by rendering and collisions and the resolved scene manifest. Save decoding validates these against the canonical blueprint without rebuilding geometry, rerolling decorations, moving furniture or restoring damage. Pending design packets and recent fictional summaries use separate local-storage keys. An explicit cancellation can discard a corrupt design draft without changing a run save. Study progress continues across restarts through the existing archive/save flow.

## Automated evidence

`tests/fixtures/run-designs/harbor-archive.json` and `glass-orchard.json` are authored synthetic fixtures, not claimed live-model outputs. Unit coverage checks direct choices, actual layout differences, field rules, malformed packets, bounded repairs, novelty, cancellation, exact retry and save continuation. `ai-designed-run.json` runs the real engine offline and checks all nineteen NPCs reach study positions through a checkpoint. Browser tests exercise the full first-start/restart/reload flow with intercepted synthetic bridge replies and inspect actual authored scene textures. Tests never need a live model, real saves or private learning data.

The version 2 fixtures `botanical-office.json` and `observatory-records.json` add specific furniture and all twelve small prop kinds. `ai-scene-study-arrival.json` retains the same meaningful crowd/checkpoint checks with an authored scene. Further tests cover actual movement blocked by furniture and released after destruction, exact tabletop support, packed-prop rejection, saved pose/damage preservation, wall/visibility-limited reading, distinct rendered labels, and disposal of old scene textures. The complete app's design/retry/reload browser flows now use these version 2 fixtures.

The relay's operation code is loaded when the managed bridge starts. Restarting only Vite does not reload an already-running bridge. A managed bridge restart preserves durable requests and pairing but resets release/session state; reconnect explicitly afterward. Do not restart it during unrelated active study work merely to run tests.
