import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { step } from "../src/engine";
import { fieldBetween } from "../src/force-fields";
import { type Game, type Roadmap, distance } from "../src/model";
import { actor, createPlayableGame } from "../src/world";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));

function world() {
  const g = createPlayableGame(2219683494, r);
  g.status = "playing";
  const human = g.survivors.find((s) => s.id === "human")!;
  human.escaped = true;
  const a = Object.assign(actor("covered", "Covered", 1), {
    floor: 0,
    x: 18,
    y: 22.5,
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
      x: 21.5,
      y: 26.5,
      hp: 60,
      path: [],
      repath: 0,
      cooldown: 0,
      memory: 0,
      stagger: 0,
      origin: "outside",
    },
  ];
  return { g, a, z: g.zombies[0] };
}
function tick(g: Game, n: number, each?: () => void) {
  for (let i = 0; i < n; i++) {
    step(g, 1 / 30);
    each?.();
  }
}

test("an intact force field covers a zombie; a destroyed one no longer does", () => {
  const { g, a, z } = world(),
    f = g.floors[0],
    door = f.furniture.find((o) => o.id === "f0-room2-door")!;
  assert.ok(door?.field, "public door is a force field");
  assert.equal(door.destroyed, false);
  assert.equal(fieldBetween(f, a, z), true);
  let fled = 0;
  let minY = a.y;
  const exit = f.rooms!.find((room) => room.index === 2)!.forwardExit!;
  // Keep the zombie pinned behind the field; it would otherwise start hitting it.
  tick(g, 90, () => {
    Object.assign(z, { x: 21.5, y: 26.5, floor: 0 });
    if (a.activity === "fleeing") fled++;
    minY = Math.min(minY, a.y);
  });
  assert.equal(fled, 0, "never flees from a field-covered zombie");
  assert.ok(
    minY < exit.y - 1,
    `advances through the forward opening (y=${minY})`,
  );
  assert.equal(a.floor, 0);

  // Same survivor, field destroyed and the zombie within reaction distance.
  door.destroyed = true;
  door.hp = 0;
  Object.assign(a, { x: 18, y: 22.5 });
  a.path = [];
  a.repath = 0;
  Object.assign(z, { x: 19, y: 24, floor: 0 });
  assert.equal(fieldBetween(f, a, z), false);
  assert.ok(distance(a, z) < 3);
  let fledAfter = false;
  for (let i = 0; i < 30 && !fledAfter; i++) {
    step(g, 1 / 30);
    if (a.activity === "fleeing") fledAfter = true;
  }
  assert.equal(fledAfter, true, "flees once the field is destroyed");
});
