import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { exteriorStructure } from "../src/exterior-structure";
import { buildInteriorLighting, lightAt } from "../src/interior-lighting";
import type { Roadmap } from "../src/model";
import { parseRunDesign, type RunPower } from "../src/run-design-contract.mjs";
import { cityBackdrop } from "../src/view3d/exterior-layout";
import { createPlayableGame } from "../src/world";

const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
const design = parseRunDesign(
  JSON.parse(
    readFileSync("tests/fixtures/run-designs/harbor-archive.json", "utf8"),
  ),
);

test("authored circuits govern their rooms and subrooms and survive JSON reload without new random draws", () => {
  const game = createPlayableGame(42, roadmap),
    floor = game.floors[0],
    rng = game.rng;
  floor.design = structuredClone(design.floors[0]);
  const plan = buildInteriorLighting(floor, game.seed);
  for (const sector of floor.generation!.sectors!) {
    const match = /^room([0-3])$/.exec(sector.id);
    if (!match) continue;
    const expected: RunPower = floor.design.power[Number(match[1])];
    for (const zone of plan.zones.filter(
      (z) => z.id === sector.id || sector.rooms.some((r) => r.id === z.id),
    ))
      assert.equal(
        zone.power,
        expected,
        `${zone.id} inherits the authored ${sector.id} circuit`,
      );
    for (const room of sector.rooms)
      assert.equal(
        lightAt(plan, {
          x: (room.rect.x1 + room.rect.x2 + 1) / 2,
          y: (room.rect.y1 + room.rect.y2 + 1) / 2,
        }),
        { lit: 0.82, dim: 0.34, outage: 0.055 }[expected],
      );
  }
  assert.equal(plan.zones.find((z) => z.id === "entry")!.power, "lit");
  assert.deepEqual(
    buildInteriorLighting(JSON.parse(JSON.stringify(floor)), game.seed),
    plan,
  );
  assert.equal(game.rng, rng);
});

test("authored broken bays replace seeded gaps in the shared render/collision structure and survive reload", () => {
  const game = createPlayableGame(42, roadmap),
    floor = game.floors[0],
    rng = game.rng;
  floor.design = structuredClone(design.floors[0]);
  floor.design.brokenGuard = { segment: 3, bay: 1 };
  const first = exteriorStructure(game),
    firstGap = first.guards.filter((g) => g.level === 0 && g.broken);
  assert.equal(firstGap.length, 1);
  floor.design.brokenGuard = { segment: 4, bay: 2 };
  const second = exteriorStructure(game),
    secondGap = second.guards.filter((g) => g.level === 0 && g.broken);
  assert.equal(secondGap.length, 1);
  assert.notDeepEqual(secondGap, firstGap);
  assert.deepEqual(
    second.slabs,
    first.slabs,
    "authoring a missing guard does not move its deck",
  );
  assert.deepEqual(exteriorStructure(JSON.parse(JSON.stringify(game))), second);
  assert.equal(game.rng, rng);
});

test("authored skyline height and damage choices preserve the distant non-colliding district and seeded replay", () => {
  const game = createPlayableGame(42, roadmap),
    floor = game.floors[0],
    rng = game.rng;
  floor.exteriorDesign = structuredClone(design.exterior);
  floor.exteriorDesign.skyline = {
    minHeight: 24,
    maxHeight: 72,
    damageRate: 0,
  };
  const short = cityBackdrop(floor);
  assert.equal(short.length, 64);
  assert.ok(
    short.every(
      (b) => b.stories * 3.15 >= 24 && b.stories * 3.15 <= 72 && !b.damaged,
    ),
  );
  floor.exteriorDesign.skyline = {
    minHeight: 60,
    maxHeight: 140,
    damageRate: 0.7,
  };
  const tall = cityBackdrop(floor),
    bounds = floor.city!.bounds;
  assert.ok(
    tall.every((b) => b.stories * 3.15 >= 60 && b.stories * 3.15 <= 140),
  );
  assert.ok(tall.some((b) => b.damaged));
  assert.deepEqual(
    tall.map(({ x, y, w, d }) => ({ x, y, w, d })),
    short.map(({ x, y, w, d }) => ({ x, y, w, d })),
  );
  assert.ok(
    tall.every(
      (b) =>
        b.x + b.w / 2 < bounds.left ||
        b.x - b.w / 2 > bounds.right ||
        b.y + b.d / 2 < bounds.top ||
        b.y - b.d / 2 > bounds.bottom,
    ),
  );
  assert.deepEqual(cityBackdrop(JSON.parse(JSON.stringify(floor))), tall);
  assert.equal(game.rng, rng);
});
