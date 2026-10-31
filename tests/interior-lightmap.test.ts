import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PerspectiveCamera } from "three";
import {
  buildInteriorLighting,
  fixtureIntensity,
  fixturePools,
  poolIrradiance,
} from "../src/interior-lighting";
import { type Roadmap } from "../src/model";
import { InteriorAtmosphere } from "../src/view3d/interior-atmosphere";
import { InteriorLightmap } from "../src/view3d/interior-lightmap";
import { createPlayableGame } from "../src/world";

const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);

test("every powered fixture lights its room regardless of player distance", () => {
  const game = createPlayableGame(42, roadmap),
    floor = game.floors[1],
    plan = buildInteriorLighting(floor, game.seed),
    lightmap = new InteriorLightmap();
  lightmap.build(1, plan);
  const lit = plan.fixtures.filter((f) => f.level > 0.5);
  assert.ok(lit.length > 4);
  for (const f of lit) {
    const below = lightmap.sample(1, f.x, f.y)!;
    assert.ok(
      below.pool >= poolIrradiance(fixtureIntensity(f), 0) * 0.9,
      `${f.id} casts its full pool with no player nearby`,
    );
  }
  // Outage fixtures never contribute light.
  for (const f of plan.fixtures.filter((f) => f.level <= 0.2))
    assert.ok(
      fixturePools(plan).every((p) => p.fixture.id !== f.id),
      `${f.id} is dark`,
    );
});

test("walls occlude baked pools", () => {
  const game = createPlayableGame(42, roadmap),
    floor = game.floors[1],
    plan = buildInteriorLighting(floor, game.seed);
  for (const pool of fixturePools(plan))
    for (let y = 0; y < pool.h; y++)
      for (let x = 0; x < pool.w; x++) {
        if (!pool.values[y * pool.w + x]) continue;
        const tx = Math.floor((pool.x0 + x) / 2),
          ty = Math.floor((pool.y0 + y) / 2);
        if (floor.tiles[ty][tx]) continue;
        // A lit open texel two or more tiles away across a solid row/column
        // straight between it and the lamp would be a leak.
        const fx = Math.floor(pool.fixture.x),
          fy = Math.floor(pool.fixture.y);
        if (fy === ty && Math.abs(fx - tx) > 1) {
          const step = Math.sign(tx - fx);
          for (let i = fx + step; i !== tx; i += step)
            assert.equal(floor.tiles[ty][i], 0, `${pool.fixture.id} leaks`);
        }
      }
});

test("practical lights take over exactly the share they remove from the lightmap", () => {
  const game = createPlayableGame(42, roadmap),
    player = game.survivors[0],
    plan = buildInteriorLighting(game.floors[1], game.seed),
    fixture = plan.fixtures.find((f) => f.level > 0.5)!,
    atmosphere = new InteriorAtmosphere(),
    camera = new PerspectiveCamera();
  game.status = "playing";
  Object.assign(player, { floor: 1, x: fixture.x + 0.6, y: fixture.y });
  atmosphere.update(game, camera, 0);
  const lightmap = atmosphere.lightmap,
    full = poolIrradiance(fixtureIntensity(fixture), 0),
    under = lightmap.sample(1, fixture.x, fixture.y)!.pool;
  assert.ok(
    under < full * 0.5,
    "a nearby lamp is drawn by its point light, not twice",
  );
  // Walk far away: the lamp's light returns to the lightmap.
  Object.assign(player, { x: fixture.x + 30, y: fixture.y });
  for (let i = 0; i < 40; i++) atmosphere.update(game, camera, 0.1);
  assert.ok(lightmap.sample(1, fixture.x, fixture.y)!.pool >= full * 0.9);
  atmosphere.dispose();
});
