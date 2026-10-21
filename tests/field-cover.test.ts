import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { step } from "../src/engine";
import { fieldBetween } from "../src/force-fields";
import { sectorAt } from "../src/floor-plan";
import {
  type Floor,
  type Furniture,
  type Game,
  type Point,
  type Roadmap,
  distance,
} from "../src/model";
import { actor, createPlayableGame } from "../src/world";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));

/** Cell centre one step in front of a field's middle, on the given sector's side. */
function front(f: Floor, o: Furniture, id: string): Point {
  const options =
    o.h > o.w
      ? [
          { x: o.x - 1, y: o.y },
          { x: o.x + 1, y: o.y },
        ]
      : [
          { x: o.x, y: o.y - 1 },
          { x: o.x, y: o.y + 1 },
        ];
  return options.find((p) => sectorAt(f, p)?.id === id)!;
}
function world() {
  const g = createPlayableGame(2219683494, r);
  g.status = "playing";
  const f = g.floors[0],
    door = f.furniture.find((o) => o.id === "f0-room2-door")!;
  // The zombie waits in the reception, right in front of the public gate; the
  // survivor starts at the nearest hall terminal it sees through that gate.
  const outside = front(f, door, "entry");
  const start = f.stations
    .filter(
      (s) =>
        g.encounters[s.encounter].questionRoom === "f0-room2" &&
        fieldBetween(f, s, outside),
    )
    .sort((a, b) => distance(a, door) - distance(b, door))[0];
  assert.ok(start, "a hall terminal faces the public gate");
  const human = g.survivors.find((s) => s.id === "human")!;
  human.escaped = true;
  const a = Object.assign(actor("covered", "Covered", 1), {
    floor: 0,
    x: start.x,
    y: start.y,
    access: [0],
    keys: 0,
  });
  delete a.stairwell;
  g.survivors = [human, a];
  g.nextSpawn = 999999;
  g.surge.anchor = 999999;
  g.zombies = [
    {
      id: "behind-field",
      floor: 0,
      x: outside.x,
      y: outside.y,
      hp: 60,
      path: [],
      repath: 0,
      cooldown: 0,
      memory: 0,
      stagger: 0,
      origin: "outside",
    },
  ];
  return { g, a, z: g.zombies[0], outside, door };
}
function tick(g: Game, n: number, each?: () => void) {
  for (let i = 0; i < n; i++) {
    step(g, 1 / 30);
    each?.();
  }
}

test("an intact force field covers a zombie; a destroyed one no longer does", () => {
  const { g, a, z, outside, door } = world(),
    f = g.floors[0];
  assert.ok(door?.field, "public door is a force field");
  assert.equal(door.destroyed, false);
  assert.equal(fieldBetween(f, a, z), true);
  let fled = 0;
  let furthest = 1;
  // Keep the zombie pinned behind the field; it would otherwise start hitting it.
  // Version 5 halls are wider than the old bands, so the walk to the forward
  // opening may take longer than the original 90 ticks.
  for (let i = 0; i < 600 && furthest < 2; i++)
    tick(g, 1, () => {
      Object.assign(z, { ...outside, floor: 0 });
      if (a.activity === "fleeing") fled++;
      furthest = Math.max(furthest, sectorAt(f, a)?.order ?? 0);
    });
  assert.equal(fled, 0, "never flees from a field-covered zombie");
  assert.ok(
    furthest >= 2,
    `advances through the forward opening (reached sector ${furthest})`,
  );
  assert.equal(a.floor, 0);

  // Same survivor, field destroyed and the zombie within reaction distance.
  door.destroyed = true;
  door.hp = 0;
  Object.assign(a, front(f, door, "room2"));
  a.path = [];
  a.repath = 0;
  Object.assign(z, { ...outside, floor: 0 });
  assert.equal(fieldBetween(f, a, z), false);
  assert.ok(distance(a, z) < 3);
  let fledAfter = false;
  for (let i = 0; i < 30 && !fledAfter; i++) {
    step(g, 1 / 30);
    if (a.activity === "fleeing") fledAfter = true;
  }
  assert.equal(fledAfter, true, "flees once the field is destroyed");
});
