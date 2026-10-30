import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { type Furniture, type Roadmap } from "../src/model";
import { walkSegment } from "../src/navigation";
import { canPlace, line, path, solid, soundGain } from "../src/spatial";
import { createPlayableGame } from "../src/world";

const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);

test("exterior swept routes respect actual city blocks between valid road positions", () => {
  const g = createPlayableGame(42, roadmap),
    f = g.floors[0],
    west = f.city!.approaches.find((r) => r.id === "west")!,
    a = west.points[1],
    b = { x: 22, y: 200 };
  assert.equal(solid(f, a), false);
  assert.equal(solid(f, b), false);
  assert.equal(
    line(f, a, b),
    false,
    "the direct segment crosses a real building",
  );
  assert.equal(
    walkSegment(f, a, b),
    false,
    "a navigation shortcut cannot cross that facade",
  );
  assert.equal(
    walkSegment(f, { x: 22, y: 100 }, b),
    true,
    "the real avenue remains traversable",
  );
});

test("outdoor furniture placement respects exact facade clearance instead of a phantom full tile", () => {
  const g = createPlayableGame(42, roadmap),
    f = g.floors[0],
    chair = {
      id: "street-chair",
      kind: "chair",
      w: 0.2,
      h: 0.2,
      floor: 0,
    } as Furniture;
  assert.equal(solid(f, { x: 17.8, y: 200 }, 0.1), false);
  assert.equal(canPlace(f, chair, { x: 17.8, y: 200 }), true);
  assert.equal(
    canPlace(f, chair, { x: 17.4, y: 200 }),
    false,
    "actual masonry remains solid",
  );
  assert.equal(
    canPlace(f, chair, { x: 22, y: f.city!.bounds.bottom + 5 }),
    false,
  );
});

test("bounded indoor path and hearing queries safely handle real exterior coordinates", () => {
  const g = createPlayableGame(42, roadmap),
    f = g.floors[0],
    a = { x: 22, y: 200 },
    b = f.city!.approaches.find((r) => r.id === "west")!.points[1];
  assert.deepEqual(path(f, a, b), [], "the city road graph owns this route");
  assert.deepEqual(path(f, { x: 22, y: 26.5 }, a), []);
  assert.deepEqual(path(f, a, { x: 22, y: 26.5 }), []);
  assert.equal(
    soundGain(f, a, b),
    0.15,
    "a muffled exterior clue cannot enter an invalid grid backtrace",
  );
  assert.equal(soundGain(f, a, { x: 22, y: 210 }), 1);
});
