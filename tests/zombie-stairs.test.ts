import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { step } from "../src/engine";
import { type Roadmap, type Zombie, distance } from "../src/model";
import { decode, encode, recover } from "../src/persistence";
import { inFurniture, solid } from "../src/spatial";
import { createGame } from "../src/world";
import { stairContactCues } from "../src/zombie-stairs";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));
function fixture() {
  const g = createGame(3, r);
  g.status = "playing";
  g.nextSpawn = 999999;
  g.surge.anchor = 999999;
  g.survivors[0].escaped = true;
  g.survivors = g.survivors.slice(0, 1);
  const source = g.floors[0].stairs;
  const z: Zombie = {
    id: "stair-front",
    ...source,
    floor: 0,
    hp: 60,
    path: [],
    repath: 100,
    cooldown: 0,
    memory: 0,
    stagger: 0,
    origin: "outside",
    stairUntil: 0,
  };
  g.zombies = [z];
  return { g, z, next: g.floors[1] };
}
test("a zombie cannot emerge inside a barricade placed over the connected upper stair landing", () => {
  const { g, z, next } = fixture(),
    ob = next.furniture.find((o) => o.kind === "fridge")!;
  Object.assign(ob, { x: next.entry.x, y: next.entry.y });
  const hp = ob.hp;
  step(g, 1 / 30);
  assert.equal(z.floor, 0);
  assert.equal(inFurniture(next.entry, ob), true);
  assert.equal(ob.hp, hp - 4);
  assert.equal(z.origin, "outside");
});
function tick(g: ReturnType<typeof createGame>, n: number) {
  for (let i = 0; i < n; i++) step(g, 1 / 30);
}
test("a stair obstruction takes ordinary damage, breaches, then admits the original outside zombie without changing learning", () => {
  const { g, z, next } = fixture(),
    ob = next.furniture.find((o) => o.kind === "fridge")!;
  Object.assign(ob, { x: next.entry.x, y: next.entry.y, hp: 8 });
  const learning = JSON.stringify(g.study);
  step(g, 1 / 30);
  assert.equal(z.floor, 0);
  assert.equal(ob.hp, 4);
  while (!ob.destroyed && g.time < 4) step(g, 1 / 30);
  assert.equal(ob.destroyed, true);
  assert.equal(g.stats.breaches, 1);
  assert.equal(z.floor, 0);
  step(g, 1 / 30);
  assert.equal(z.floor, 1);
  assert.equal(solid(next, z), false);
  assert.equal(z.origin, "outside");
  assert.equal(JSON.stringify(g.study), learning);
  const hits = g.events.filter((e) => e.type === "barricade-hit");
  assert.equal(hits.length, 2);
  assert.ok(
    hits.every(
      (e) => e.floor === 1 && distance(e.position!, next.entry) < 0.01,
    ),
  );
  assert.equal(g.events.filter((e) => e.type === "horde-climb").length, 1);
});
test("queued stair attackers cannot rotate through the front cooldown to multiply barricade damage", () => {
  const { g, z, next } = fixture(),
    ob = next.furniture.find((o) => o.kind === "fridge")!;
  Object.assign(ob, { x: next.entry.x, y: next.entry.y, hp: 10000 });
  z.id = "0-front";
  for (let i = 1; i <= 10; i++)
    g.zombies.push({ ...z, id: `queue-${i}`, path: [] });
  for (let i = 0; i < 90; i++) {
    g.zombies.reverse();
    step(g, 1 / 30);
  }
  assert.equal(10000 - ob.hp, 12);
  assert.ok(g.zombies.every((other) => other.floor === 0));
  assert.ok(
    g.events
      .filter((e) => e.type === "barricade-hit")
      .every((e) => e.actor === "0-front"),
  );
  z.hp = 0;
  const before = ob.hp;
  step(g, 1 / 30);
  assert.equal(ob.hp, before - 4);
  assert.equal(
    g.events.filter((e) => e.type === "barricade-hit").at(-1)!.actor,
    "queue-1",
  );
});
test("a survivor blocking the stair exit is attackable but never receives an overlapping arriving zombie", () => {
  const { g, z, next } = fixture(),
    a = g.survivors[0];
  a.escaped = false;
  Object.assign(a, { floor: 1, ...next.entry });
  step(g, 1 / 30);
  assert.equal(z.floor, 0);
  assert.equal(a.hp, 86);
  assert.equal(
    g.events.filter((e) => e.type === "survivor-hit").at(-1)!.floor,
    1,
  );
  z.cooldown = 0;
  a.hp = 1;
  step(g, 1 / 30);
  assert.equal(a.alive, false);
  assert.equal(z.floor, 0);
  // The death ended the game; inspect the same world through one explicit resumed physics step.
  g.status = "playing";
  step(g, 1 / 30);
  assert.equal(z.floor, 1);
  assert.equal(z.origin, "outside");
  assert.equal(g.stats.deaths, 1);
});
test("an upper zombie occupies the exit and blocks a rear stair attack through its body", () => {
  const { g, z, next } = fixture(),
    a = g.survivors[0];
  a.escaped = false;
  Object.assign(a, { floor: 1, x: next.entry.x + 0.5, y: next.entry.y });
  const upper: Zombie = {
    ...z,
    id: "upper-body",
    floor: 1,
    ...next.entry,
    stairUntil: undefined,
    stagger: 10,
    path: [],
  };
  g.zombies.push(upper);
  step(g, 1 / 30);
  assert.equal(z.floor, 0);
  assert.equal(a.hp, 100);
  upper.hp = 0;
  step(g, 1 / 30);
  assert.equal(z.floor, 0);
  assert.equal(a.hp, 86);
});
test("Surge uses the same declared stair-contact damage and cannot damage a barricade before flight completion", () => {
  const { g, z, next } = fixture(),
    ob = next.furniture.find((o) => o.kind === "fridge")!;
  Object.assign(ob, { x: next.entry.x, y: next.entry.y });
  const hp = ob.hp;
  z.stairUntil = 2;
  g.surge.state = "active";
  g.surge.started = 0;
  g.surge.duration = 100;
  tick(g, 59);
  assert.equal(ob.hp, hp);
  assert.equal(z.floor, 0);
  tick(g, 1);
  assert.equal(ob.hp, hp - 7);
});
test("a live protective bubble excludes stair arrival and attacks until it expires", () => {
  const { g, z, next } = fixture(),
    a = g.survivors[0];
  a.escaped = false;
  Object.assign(a, { floor: 1, ...next.entry });
  g.effects.push({
    kind: "bubble",
    floor: 1,
    ...next.entry,
    until: 1,
    radius: 3,
  });
  tick(g, 20);
  assert.equal(z.floor, 0);
  assert.equal(a.hp, 100);
  assert.equal(
    g.events.some((e) => e.type === "survivor-hit"),
    false,
  );
  tick(g, 12);
  assert.equal(a.hp, 86);
  assert.equal(z.floor, 0);
});
test("immutable landing geometry remains solid and moving an obstruction never restores its durability", () => {
  const { g, z, next } = fixture(),
    ob = next.furniture.find((o) => o.kind === "fridge")!;
  const x = Math.floor(next.entry.x),
    y = Math.floor(next.entry.y);
  next.tiles[y][x] = 1;
  step(g, 1 / 30);
  assert.equal(z.floor, 0);
  assert.equal(
    g.events.some((e) => e.type === "horde-climb"),
    false,
  );
  next.tiles[y][x] = 0;
  Object.assign(ob, { x: next.entry.x, y: next.entry.y });
  const hp = ob.hp;
  step(g, 1 / 30);
  assert.equal(ob.hp, hp - 4);
  ob.x += 4;
  step(g, 1 / 30);
  assert.equal(z.floor, 1);
  assert.equal(ob.hp, hp - 4);
  assert.equal(inFurniture(z, ob), false);
});

test("reload preserves stair attack ownership, cooldown and exact damage without restarting the flight", () => {
  const { g, z, next } = fixture(),
    ob = next.furniture.find((o) => o.kind === "fridge")!;
  Object.assign(ob, { x: next.entry.x, y: next.entry.y });
  step(g, 1 / 30);
  const hp = ob.hp,
    until = z.stairUntil,
    cooldown = z.cooldown;
  const restored = recover(decode(encode(g))),
    rz = restored.zombies[0],
    ro = restored.floors[1].furniture.find((o) => o.id === ob.id)!;
  assert.equal(rz.stairUntil, until);
  assert.equal(rz.cooldown, cooldown);
  assert.equal(ro.hp, hp);
  tick(g, 40);
  tick(restored, 40);
  assert.equal(ro.hp, ob.hp);
  assert.equal(rz.floor, z.floor);
  assert.equal(rz.cooldown, z.cooldown);
  assert.equal(
    JSON.stringify(restored.events.filter((e) => e.type === "barricade-hit")),
    JSON.stringify(g.events.filter((e) => e.type === "barricade-hit")),
  );
});

test("player stair impact cues show through cover, but walls, floor and sight range still bound them", () => {
  const { g, z, next } = fixture(),
    a = g.survivors[0],
    ob = next.furniture.find((o) => o.kind === "fridge")!;
  a.escaped = false;
  Object.assign(a, { floor: 1, x: next.entry.x, y: next.entry.y - 3 });
  Object.assign(ob, { x: next.entry.x, y: next.entry.y, hp: 8 });
  step(g, 1 / 30);
  assert.equal(stairContactCues(g, a).length, 1);
  assert.equal(g.events.at(-1)!.stairContact, true);
  tick(g, 40);
  assert.equal(ob.destroyed, true);
  assert.ok(stairContactCues(g, a).length > 0);
  const y = Math.floor(next.entry.y) - 1,
    x = Math.floor(next.entry.x);
  next.tiles[y][x] = 1;
  assert.equal(stairContactCues(g, a).length, 0);
  next.tiles[y][x] = 0;
  a.y = next.entry.y - 12;
  assert.equal(stairContactCues(g, a).length, 0);
  a.y = next.entry.y - 3;
  a.floor = 0;
  assert.equal(stairContactCues(g, a).length, 0);
  a.floor = 1;
  g.time += 1;
  assert.equal(stairContactCues(g, a).length, 0);
  assert.equal(z.origin, "outside");
});
