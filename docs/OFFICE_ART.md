# Office art: sources, credits and techniques

The building's floors, walls and furniture are painted procedurally in `src/office-art.ts`. **No third-party image, texture or sprite file is bundled**, so there is nothing to attribute and no licence obligation. This file records the free sources that were evaluated (October 2026) so a future art pass can swap in bundled assets with the credit already researched.

## Evaluated free sources

| Source | Licence | What it offers | Why it was not bundled |
| --- | --- | --- | --- |
| [ambientCG](https://ambientcg.com/list?q=carpet) (e.g. `Carpet012`, `Carpet016`) | CC0 1.0, attribution optional ([licence](https://docs.ambientcg.com/license/)) | Photo-scanned PBR carpet, tile and concrete materials | Photo albedo maps are 1K–8K and built for 3D. At ~30 px per world unit they reduce to noise, and they would add megabytes to the build. The carpet-tile layout here imitates their quarter-turned tile pattern. |
| [ShareTextures carpet floors](https://www.sharetextures.com/textures/floor/carpet-11) | CC0 | Seamless carpet albedo/normal/roughness | Same scale and size issue as ambientCG. |
| [OpenGameArt "office set two" (gamekorp)](https://opengameart.org/content/office-set-two) | CC0 | Wheeled chair and desk | 3D models (28.7 MB zip, 2048² maps), not top-down sprites. |
| [MetroCity interior pack (jik-a-4)](https://jik-a-4.itch.io/metrocity) | CC0 | Top-down home/hospital tiles | Residential/hospital furniture, no desks or office chairs. |
| [Interior spritesheet 16×16 (OpenGameArt)](https://opengameart.org/content/interior-spritesheet-16x16-tiles) | CC0 | Tiny house interior sheet | 16 px pixel art clashes with the game's vector look; no office objects. |
| Cubicle mini tile set (Clint Bellanger, OpenGameArt) | CC-BY 3.0 | Cubicle tiles, chair | Requires attribution and is pixel art; procedural partitions match the style better. |
| [Pixel Office (Masalimov Ilnur)](https://masalimov-ilnur.itch.io/pixel-office), [Office Tile Map (Xanderwood)](https://xanderwood.itch.io/office-tile-map-sprites) | CC-BY 4.0 / paid | Top-down office sprites | Paid; not CC0. |

If you swap in a bundled asset, put the file under `public/art/`, list it here with author, source URL, licence and any changes, and load it once into the same caches (`terrainCanvas`, `furnitureSprite`) so the per-frame cost stays a few `drawImage` calls.

## Techniques used

- **Cached terrain.** The whole floor (carpet, vinyl, paving, wall caps, rims and contact shadows) is painted once into a 40 px-per-unit canvas and redrawn with a single `drawImage` inside the existing visibility clip. It is rebuilt only when that floor's walls, its layout version or the Surge theme change. Previously the renderer filled and stroked every visible tile each frame.
- **Zones from the floor plan.** `floorZone` gives study rooms commercial carpet tiles (50 cm tiles laid quarter-turned, with fibre direction lines; alternate rooms get a second colourway). Corridors and lobbies get 1 m vinyl composition tile with chip speckle, outside gets paving, and the roof gets membrane. All noise comes from a deterministic hash, so frames are pixel-stable.
- **Sprites per kind.** Each furniture kind is drawn in local units with a drop shadow, its back against the object's local north edge. The sprite is cached per kind, footprint and theme, and rotated with the body. Examples: desks carry a monitor, keyboard, papers and a mug; shelves hold coloured spines and binders; the cooler has its blue bottle; the plant has radiating leaves; partitions have aluminium end caps. Damage cracks and the shake are still drawn live over the sprite.
- **Two themes.** The Surge palette is a second material set, not a red overlay, as the design handoff requires.
- **Generated placement.** `src/office-layout.ts` stands office pieces back-to-wall in each generated room and lobby. A piece is placed only if it keeps clear of terminals and doorways, leaves a walking gap to neighbours and cuts off no reachable cell or terminal (flood-fill check).
