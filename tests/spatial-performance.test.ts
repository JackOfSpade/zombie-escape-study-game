import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { localPoint } from "../src/furniture-geometry";
import { H, W, type Furniture, type Roadmap } from "../src/model";
import { survivorPath } from "../src/navigation";
import { inFurniture } from "../src/spatial";
import { createGame } from "../src/world";
const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
test("fast furniture rejection preserves rotated footprint and circular clearance across poses", () => {
  const g = createGame(2172668951, roadmap);
  const prop = g.floors[0].furniture[0];
  let seed = 67;
  const random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 10000; i++) {
    const f = {
      ...prop,
      w: 0.1 + random() * 10,
      h: 0.1 + random() * 10,
      angle: (random() - 0.5) * Math.PI * 4,
      open: i % 17 === 0,
      destroyed: i % 19 === 0,
      door: undefined,
    } as Furniture;
    const p = {
        x: f.x + (random() - 0.5) * 30,
        y: f.y + (random() - 0.5) * 30,
      },
      pad = random() * 0.8;
    const q = localPoint(p, f);
    const expected =
      !f.destroyed &&
      !f.open &&
      !(f.kind === "gate" && f.turning < 0) &&
      Math.hypot(
        Math.max(0, Math.abs(q.x) - f.w / 2),
        Math.max(0, Math.abs(q.y) - f.h / 2),
      ) < pad;
    assert.equal(inFurniture(p, f, pad), expected, `pose ${i}`);
  }
});
test("cached grid wall clearance invalidates on wall edits while furniture rebuilds retain exact geometry", () => {
  const f = createGame(2172668951, roadmap).floors[0];
  f.tiles = Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) =>
      x === 0 || y === 0 || x === W - 1 || y === H - 1 || (x === 6 && y !== 8)
        ? 1
        : 0,
    ),
  );
  f.furniture = f.furniture.slice(0, 1);
  Object.assign(f.furniture[0], {
    x: 20,
    y: 20,
    w: 1,
    h: 1,
    door: undefined,
    kind: "chair",
    destroyed: false,
    open: false,
  });
  const a = { x: 3.5, y: 3.5 },
    b = { x: 10.5, y: 3.5 };
  assert.ok(survivorPath(f, a, b).length);
  f.furniture[0].x += 0.1;
  assert.ok(survivorPath(f, a, b).length);
  f.tiles[8][6] = 1;
  assert.equal(
    survivorPath(f, a, b).length,
    0,
    "closed wall gap must not reuse old clear edges",
  );
  f.tiles[15][6] = 0;
  assert.ok(
    survivorPath(f, a, b).length,
    "new wall opening is immediately usable",
  );
});
