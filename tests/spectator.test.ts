import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CONFIG, H, W, type Roadmap } from "../src/model";
import {
  SPECTATOR_ZOOM,
  clampView,
  floorTitle,
  initialView,
  spectating,
  spectatorFloors,
} from "../src/spectator";
import { createPlayableGame } from "../src/world";
const roadmap = (): Roadmap =>
  JSON.parse(readFileSync("public/curriculum.json", "utf8"));

test("spectating begins only once the run has ended", () => {
  const g = createPlayableGame(7, roadmap());
  assert.equal(spectating(g), false);
  g.status = "playing";
  assert.equal(spectating(g), false);
  g.status = "dead";
  assert.equal(spectating(g), true);
  g.status = "escaped";
  assert.equal(spectating(g), true);
});

test("clampView keeps the camera on an existing floor inside the building", () => {
  assert.deepEqual(
    clampView({ floor: 9, focus: { x: -3, y: H + 5 }, zoom: 99 }),
    { floor: CONFIG.floors, focus: { x: 0, y: H }, zoom: SPECTATOR_ZOOM.max },
  );
  assert.deepEqual(
    clampView({ floor: -2, focus: { x: W + 1, y: -1 }, zoom: 0.01 }),
    { floor: 0, focus: { x: W, y: 0 }, zoom: SPECTATOR_ZOOM.min },
  );
  assert.deepEqual(
    clampView({ floor: 2.4, focus: { x: NaN, y: Infinity }, zoom: NaN }),
    { floor: 2, focus: { x: W / 2, y: H }, zoom: 1 },
  );
  assert.deepEqual(
    clampView({ floor: 1, focus: { x: 10, y: 12 }, zoom: 1.5 }),
    {
      floor: 1,
      focus: { x: 10, y: 12 },
      zoom: 1.5,
    },
  );
});

test("the view opens on the player's last position at zoom 1", () => {
  const g = createPlayableGame(7, roadmap());
  const a = g.survivors[0];
  a.floor = 3;
  a.x = 12.25;
  a.y = 7.5;
  assert.deepEqual(initialView(g), {
    floor: 3,
    focus: { x: 12.25, y: 7.5 },
    zoom: 1,
  });
});

test("floor buttons cover every level, ground floor first and the roof last", () => {
  const floors = spectatorFloors();
  assert.equal(floors.length, CONFIG.floors + 1);
  assert.deepEqual(
    floors.map((f) => f.label),
    ["1", "2", "3", "4", "ROOF"],
  );
  assert.deepEqual(
    floors.map((f) => f.floor),
    [0, 1, 2, 3, 4],
  );
  assert.equal(floors[0].title, "FLOOR 01 / 4");
  assert.equal(floorTitle(3), "FLOOR 04 / 4");
  assert.equal(floorTitle(CONFIG.floors), "ROOFTOP / EXTRACTION");
});
