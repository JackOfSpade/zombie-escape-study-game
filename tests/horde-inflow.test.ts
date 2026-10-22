import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { step } from "../src/engine";
import { type Roadmap } from "../src/model";
import { decode, encode } from "../src/persistence";
import { createGame } from "../src/world";
const r = JSON.parse(readFileSync("public/curriculum.json", "utf8")) as Roadmap;
function fixture() {
  const g = createGame(42, r);
  g.status = "playing";
  g.survivors.forEach((a) => {
    a.escaped = true;
  });
  g.spawned = 90;
  g.time = 1000;
  g.nextSpawn = 1000;
  g.surge.anchor = 999999;
  return g;
}
test("outside arrivals continue after the opening rush without reusing identifiers or changing learning", () => {
  const g = fixture(),
    learning = JSON.stringify(g.study);
  step(g, 1 / 30);
  assert.equal(g.spawned, 91);
  assert.equal(g.zombies.length, 1);
  assert.equal(g.zombies[0].id, "z90");
  assert.equal(g.zombies[0].origin, "outside");
  assert.equal(g.zombies[0].floor, 0);
  assert.ok(g.zombies[0].y > 28);
  const before = g.spawned;
  for (let i = 0; i < 120; i++) step(g, 1 / 30);
  assert.equal(g.spawned, before);
  while (g.time < 1008.1) step(g, 1 / 30);
  assert.equal(g.spawned, 92);
  assert.equal(JSON.stringify(g.study), learning);
});
test("a full upstairs horde does not exhaust later entrance arrivals and old bodies remain physical", () => {
  const g = fixture();
  g.floors[4].furniture = []; // Isolate retained outside arrivals from decorative roof prop contacts.
  for (let i = 0; i < 90; i++)
    g.zombies.push({
      id: `z${i}`,
      floor: 4,
      x: 3 + (i % 15) * 2.5,
      y: 3 + Math.floor(i / 15) * 3,
      hp: 60,
      path: [],
      repath: 0,
      cooldown: 0,
      memory: 0,
      stagger: 100,
      origin: "outside",
    });
  const old = g.zombies.map((z) => ({
    id: z.id,
    x: z.x,
    y: z.y,
    floor: z.floor,
  }));
  step(g, 1 / 30);
  assert.equal(g.spawned, 91);
  assert.equal(g.zombies.length, 91);
  assert.deepEqual(
    g.zombies
      .slice(0, 90)
      .map((z) => ({ id: z.id, x: z.x, y: z.y, floor: z.floor })),
    old,
  );
});
test("outside occupancy delays a batch without indoor substitutes, lost IDs or a later catch-up burst", () => {
  const g = fixture();
  g.floors[0].furniture.push({
    ...g.floors[0].furniture[0],
    id: "sealed-exterior",
    kind: "shelf",
    x: 22,
    y: 33.4,
    w: 8,
    h: 1,
  });
  step(g, 1 / 30);
  assert.equal(g.spawned, 90);
  assert.equal(g.zombies.length, 0);
  g.floors[0].furniture.pop();
  while (g.time < 1008.1) step(g, 1 / 30);
  assert.equal(g.zombies.length, 1);
  assert.equal(g.zombies[0].id, "z90");
});
test("reload retains the reinforcement deadline and exact next outside batch without a timer reroll", () => {
  const g = fixture();
  step(g, 1 / 30);
  const copy = decode(encode(g));
  for (let i = 0; i < 250; i++) {
    step(g, 1 / 30);
    step(copy, 1 / 30);
  }
  assert.equal(encode(copy), encode(g));
  assert.equal(g.spawned, 92);
});

test("G09 actual outside arrivals during an active Surge immediately use its movement and attack modifiers without changing learning", () => {
  const calm = fixture(),
    active = fixture();
  Object.assign(active.surge, {
    state: "active",
    started: active.time,
    duration: 600,
  });
  const before = JSON.stringify(active.study);
  const born = { x: 18.6 + (calm.spawned % 12) * 0.6, y: 33.4 };
  step(calm, 1 / 30);
  step(active, 1 / 30);
  const z = active.zombies[0],
    ordinary = calm.zombies[0];
  assert.equal(z.id, "z90");
  assert.equal(z.origin, "outside");
  assert.equal(z.floor, 0);
  assert.ok(
    z.y > 28,
    "Birth remains outside the entrance, never inside a study room",
  );
  const travelled = (a: { x: number; y: number }) =>
    Math.hypot(a.x - born.x, a.y - born.y);
  assert.ok(travelled(ordinary) > 0);
  assert.ok(Math.abs(travelled(z) / travelled(ordinary) - 1.35) < 1e-8);
  for (const g of [calm, active]) {
    g.nextSpawn = Number.MAX_SAFE_INTEGER;
    const actor = g.survivors[0],
      newcomer = g.zombies[0];
    // Controlled contact tests the naturally spawned actor, without moving the
    // zombie or inventing an upstairs replacement.
    Object.assign(actor, {
      escaped: false,
      x: newcomer.x + 0.6,
      y: newcomer.y,
      floor: 0,
      hp: 100,
    });
    step(g, 1 / 30);
    assert.equal(actor.hp, g === active ? 79 : 86);
    assert.ok(
      g.events.some(
        (e) => e.type === "survivor-hit" && e.actor === newcomer.id,
      ),
    );
    actor.escaped = true;
    newcomer.cooldown = 0;
    const gate = g.floors[0].furniture.find((o) => o.id === "main-gate")!;
    assert.ok(gate && !gate.destroyed);
    const hp = gate.hp;
    // An audible lure on the outer face makes this a directed contact test;
    // the newcomer does not know where the building's stairs are.
    g.effects.push({
      kind: "decoy",
      floor: 0,
      x: gate.x,
      y: gate.y + gate.h / 2 + 0.25,
      radius: 10,
      until: g.time + 20,
    });
    // Let this same outside-born zombie physically reach the main entrance.
    for (
      let i = 0;
      i < 30 * 40 &&
      !g.events.some(
        (e) => e.type === "barricade-hit" && e.actor === newcomer.id,
      );
      i++
    )
      step(g, 1 / 30);
    assert.ok(
      g.events.some(
        (e) => e.type === "barricade-hit" && e.actor === newcomer.id,
      ),
    );
    assert.equal(gate.hp, hp - (g === active ? 7 : 4));
    assert.equal(newcomer.floor, 0);
  }
  assert.equal(JSON.stringify(active.study), before);
});
