import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Roadmap } from "../src/model";
import {
  beginFurnitureIndex,
  endFurnitureIndex,
  furnitureNear,
  inFurniture,
  solid,
} from "../src/spatial";
import { createPlayableGame } from "../src/world";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));

/** Deterministic points across the whole floor, including just outside it. */
function* points(n: number) {
  let s = 1234567;
  const next = () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 2 ** 32;
  for (let i = 0; i < n; i++) yield { x: next() * 46 - 1, y: next() * 36 - 1 };
}

test("the step-scoped furniture index answers exactly like a full scan", () => {
  const g = createPlayableGame(42, r);
  const pads = [0, 0.22, 0.23, 0.27, 0.5];
  const expected = g.floors.map((f) =>
    [...points(4000)].map((p) =>
      pads.map((pad) => ({
        solid: solid(f, p, pad),
        first: f.furniture.find((o) => inFurniture(p, o, pad))?.id,
      })),
    ),
  );
  beginFurnitureIndex(g.floors);
  try {
    g.floors.forEach((f, fi) => {
      [...points(4000)].forEach((p, pi) =>
        pads.forEach((pad, k) => {
          const near = furnitureNear(f, p, pad);
          const first = (near ?? f.furniture).find((o) =>
            inFurniture(p, o, pad),
          )?.id;
          assert.equal(solid(f, p, pad), expected[fi][pi][k].solid);
          assert.equal(
            first,
            expected[fi][pi][k].first,
            `floor ${fi} point ${pi}`,
          );
        }),
      );
    });
  } finally {
    endFurnitureIndex();
  }
});

test("the index covers furniture that moves within a step, and falls back outside its scope", () => {
  const g = createPlayableGame(7, r);
  const f = g.floors[0];
  const o = f.furniture.find((x) => !x.field && !x.door && x.speed > 0)!;
  assert.ok(o, "a movable office piece exists on the first floor");
  beginFurnitureIndex(g.floors);
  try {
    // Build the index, then move the object by the largest in-step distance.
    assert.ok(furnitureNear(f, o, 0.22));
    o.x += 0.9;
    const p = { x: o.x, y: o.y };
    assert.ok(furnitureNear(f, p, 0.22)!.includes(o));
    // The moved object's new centre is solid through the index, as in a scan.
    assert.equal(solid(f, p, 0.22), true);
    // Pads above the indexed bound, temporary floor copies and points off the
    // grid all scan the plain list.
    assert.equal(furnitureNear(f, p, 0.6), undefined);
    assert.equal(
      furnitureNear({ ...f, furniture: f.furniture.slice() }, p, 0.22),
      undefined,
    );
    assert.equal(furnitureNear(f, { x: -0.5, y: 3 }, 0.22), undefined);
    // Adding furniture mid-step rebuilds the floor's buckets.
    const copy = { ...o, id: "added", x: 30.5, y: 20.5 };
    f.furniture.push(copy);
    assert.ok(furnitureNear(f, copy, 0)!.includes(copy));
  } finally {
    endFurnitureIndex();
  }
  assert.equal(furnitureNear(f, o, 0.22), undefined, "outside a step");
});
