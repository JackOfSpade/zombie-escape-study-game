import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { claimStation, stairs, step, vault } from "../src/engine";
import { canGrip } from "../src/handling";
import { type Game, type Roadmap, CONFIG, distance } from "../src/model";
import { decode, encode, recover } from "../src/persistence";
import { inFurniture } from "../src/spatial";
import { advanceStairs } from "../src/stair-travel";
import { actor, createGame, createPlayableGame } from "../src/world";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));
function fixture() {
  const g = createGame(2026, r),
    a = g.survivors[0];
  g.status = "playing";
  g.survivors = [a];
  g.nextSpawn = 999999;
  g.surge.anchor = 999999;
  Object.assign(a, g.floors[0].stairs);
  return { g, a };
}
function tick(g: Game, n: number) {
  for (let i = 0; i < n; i++) step(g, 1 / 30);
}
function lockedEvents(g: Game) {
  return g.events.filter(
    (e) => e.type === "stairs-locked" && e.actor === "human",
  ).length;
}
test("survivors require personal access and a full saved stair flight in either direction", () => {
  const { g, a } = fixture(),
    learning = JSON.stringify(g.study);
  assert.equal(stairs(g, a), false);
  tick(g, 1);
  assert.equal(a.stairTravel, undefined);
  assert.equal(a.floor, 0);
  a.access.push(0);
  const start = g.time;
  assert.ok(stairs(g, a));
  const until = a.stairTravel!.until;
  assert.equal(a.floor, 0);
  assert.equal(until, start + CONFIG.stairSeconds);
  tick(g, 29);
  assert.equal(a.floor, 0);
  assert.equal(stairs(g, a), false);
  assert.equal(a.stairTravel!.until, until);
  const restored = recover(decode(encode(g))),
    b = restored.survivors[0];
  assert.equal(b.stairTravel!.until, until);
  tick(restored, 30);
  assert.equal(b.floor, 0);
  tick(restored, 1);
  assert.equal(b.floor, 1);
  assert.equal(b.stairTravel, undefined);
  const entry = restored.floors[1].entry;
  assert.ok(distance(b, entry) < 0.01);
  assert.equal(b.access.includes(1), false);
  // Arriving inside the down well does not start the return flight by itself.
  tick(restored, 5);
  assert.equal(b.floor, 1);
  assert.equal(b.stairTravel, undefined);
  // Walk out of the well, then back in.
  Object.assign(b, { x: entry.x, y: entry.y - 2 });
  tick(restored, 1);
  assert.equal(b.stairwell, undefined);
  assert.equal(b.stairTravel, undefined);
  Object.assign(b, { x: entry.x, y: entry.y });
  tick(restored, 1);
  const descent = restored.survivors[0].stairTravel;
  assert.ok(descent);
  assert.equal(descent.toFloor, 0);
  assert.equal(b.floor, 1);
  tick(restored, 61);
  assert.equal(b.floor, 0);
  assert.equal(b.stairTravel, undefined);
  assert.ok(
    distance(b, { x: g.floors[0].stairs.x, y: g.floors[0].stairs.y + 1 }) <
      0.01,
  );
  assert.equal(JSON.stringify(restored.study), learning);
  const events = restored.events.filter(
    (e) =>
      e.actor === "human" &&
      (e.type === "survivor-stairs" || e.type === "climb"),
  );
  assert.deepEqual(
    events.map((e) => e.type),
    ["survivor-stairs", "climb", "survivor-stairs", "climb"],
  );
  assert.ok(events[1].at - events[0].at >= CONFIG.stairSeconds - 1e-8);
  assert.ok(events[3].at - events[2].at >= CONFIG.stairSeconds - 1e-8);
});
test("walking inside the well keeps the flight, leaving the well cancels it, and climbing cannot remotely use a terminal, vault or grip furniture", () => {
  const { g, a } = fixture(),
    f = g.floors[0];
  a.access.push(0);
  assert.ok(stairs(g, a));
  assert.equal(claimStation(g, a, f.stations[0].id), false);
  assert.equal(vault(g, a), false);
  assert.equal(canGrip(f, a, f.furniture[0]), false);
  step(g, 1 / 30, { x: 0, y: 1, grab: false });
  assert.ok(a.stairTravel);
  assert.equal(a.floor, 0);
  assert.ok(distance(a, f.stairs) < 1.15);
  Object.assign(a, { x: f.stairs.x, y: f.stairs.y + 1.3 });
  tick(g, 1);
  assert.equal(a.stairTravel, undefined);
  assert.equal(a.floor, 0);
  assert.match(g.notice, /You left the staircase/);
  tick(g, 90);
  assert.equal(a.floor, 0);
  assert.equal(
    g.events.some((e) => e.type === "climb" && e.actor === a.id),
    false,
  );
});
test("a locked staircase refuses a walking survivor and says why", () => {
  const { g, a } = fixture(),
    f = g.floors[0];
  Object.assign(a, { x: f.stairs.x, y: f.stairs.y + 2.5 });
  tick(g, 1);
  assert.equal(lockedEvents(g), 0);
  for (let i = 0; i < 120 && distance(a, f.stairs) >= 1.15; i++)
    step(g, 1 / 30, { x: 0, y: -1, grab: false });
  assert.ok(distance(a, f.stairs) < 1.15);
  tick(g, 10);
  assert.equal(a.floor, 0);
  assert.equal(a.stairTravel, undefined);
  assert.match(g.notice, /locked for you/);
  assert.equal(lockedEvents(g), 1);
  tick(g, 20);
  assert.equal(lockedEvents(g), 1);
  Object.assign(a, { x: f.stairs.x, y: f.stairs.y + 2.5 });
  tick(g, 1);
  for (let i = 0; i < 120 && distance(a, f.stairs) >= 1.15; i++)
    step(g, 1 / 30, { x: 0, y: -1, grab: false });
  tick(g, 2);
  assert.equal(lockedEvents(g), 2);
  assert.equal(a.floor, 0);
  assert.equal(a.stairTravel, undefined);
});
test("landing furniture on the entry moves arrival to a clear lobby spot without clipping, clock reset or durability changes", () => {
  const { g, a } = fixture(),
    f = g.floors[1],
    ob = f.furniture.find((o) => o.kind === "shelf")!;
  Object.assign(ob, { x: f.entry.x, y: f.entry.y, w: 3, h: 3 });
  const hp = ob.hp;
  a.access.push(0);
  assert.ok(stairs(g, a));
  const until = a.stairTravel!.until;
  tick(g, 59);
  assert.equal(a.floor, 0);
  assert.equal(a.stairTravel!.until, until);
  tick(g, 2);
  assert.equal(a.floor, 1);
  assert.equal(a.stairTravel, undefined);
  assert.equal(inFurniture(a, ob, 0.22), false);
  assert.ok(distance(a, f.entry) > 0.5);
  assert.equal(ob.hp, hp);
  assert.equal(ob.destroyed, false);
});
test("furniture covering every landing candidate delays arrival until it is cleared", () => {
  const { g, a } = fixture(),
    f = g.floors[1],
    ob = f.furniture.find((o) => o.kind === "shelf")!;
  Object.assign(ob, { x: f.entry.x, y: f.entry.y, w: 9, h: 9 });
  const hp = ob.hp;
  a.access.push(0);
  assert.ok(stairs(g, a));
  const until = a.stairTravel!.until;
  tick(g, 90);
  assert.equal(a.floor, 0);
  assert.ok(a.stairTravel);
  assert.equal(a.stairTravel.until, until);
  assert.equal(ob.hp, hp);
  assert.match(g.notice, /landing blocked/);
  ob.destroyed = true;
  ob.hp = 0;
  tick(g, 1);
  assert.equal(a.floor, 1);
  assert.ok(distance(a, f.entry) < 0.01);
});
test("arrival chooses a clear connected landing beyond the occupied well spots", () => {
  const { g, a } = fixture(),
    p = g.floors[1].entry;
  a.access.push(0);
  assert.ok(stairs(g, a));
  const offsets = [
    { x: 0, y: 0 },
    { x: 0, y: 0.7 },
    { x: 0.7, y: 0 },
    { x: -0.7, y: 0 },
    { x: 0, y: -0.7 },
  ];
  const blockers = offsets.map((v, i) =>
    Object.assign(actor(`block-${i}`, "Landing blocker", i + 1), {
      floor: 1,
      x: p.x + v.x,
      y: p.y + v.y,
    }),
  );
  g.survivors.push(...blockers);
  g.time = a.stairTravel!.until;
  assert.ok(advanceStairs(g, a));
  assert.equal(a.floor, 1);
  assert.equal(a.stairTravel, undefined);
  assert.ok(
    blockers.every((b) => distance(a, b) >= 0.55),
    "lands clear of every living blocker",
  );
  assert.ok(distance(a, p) < 4, "lands in the lobby in front of the well");
});
test("a landing crowded by bodies everywhere still completes the flight instead of waiting forever", () => {
  const { g, a } = fixture(),
    p = g.floors[1].entry;
  a.access.push(0);
  assert.ok(stairs(g, a));
  let n = 0;
  for (let dy = -1.5; dy <= 1.5; dy += 0.5)
    for (let dx = -4.5; dx <= 1.5; dx += 0.5)
      g.survivors.push(
        Object.assign(actor(`crowd-${n}`, "Crowd", (n++ % 5) + 1), {
          floor: 1,
          x: p.x + dy,
          y: p.y + dx,
        }),
      );
  g.time = a.stairTravel!.until;
  assert.ok(advanceStairs(g, a));
  assert.equal(a.floor, 1);
  assert.equal(a.stairTravel, undefined);
  assert.ok(distance(a, p) < 0.01, "takes the nearest clear landing");
});
test("a survivor remains vulnerable at departure and death cannot later complete a flight", () => {
  const { g, a } = fixture();
  a.access.push(0);
  a.hp = 1;
  assert.ok(stairs(g, a));
  g.zombies = [
    {
      id: "controlled-departure-contact",
      floor: 0,
      x: a.x,
      y: a.y + 0.4,
      hp: 60,
      path: [],
      repath: 0,
      cooldown: 0,
      memory: 0,
      stagger: 0,
      origin: "outside",
    },
  ];
  tick(g, 1);
  assert.equal(a.alive, false);
  assert.equal(a.floor, 0);
  assert.equal(a.stairTravel, undefined);
  assert.equal(g.status, "dead");
  g.time += 10;
  advanceStairs(g, a);
  assert.equal(a.floor, 0);
});
test("NPCs also traverse the timed flight through the normal engine rather than changing floor on entry", () => {
  const { g, a } = fixture();
  a.escaped = true;
  const npc = Object.assign(actor("npc-timed", "Timed NPC", 1), {
    ...g.floors[0].stairs,
    access: [0],
  });
  g.survivors.push(npc);
  tick(g, 1);
  assert.equal(npc.floor, 0);
  assert.ok(npc.stairTravel);
  tick(g, 59);
  assert.equal(npc.floor, 0);
  tick(g, 2);
  assert.equal(npc.floor, 1);
});
test("an exploring NPC placed in the fresh floor-1 arrival well walks out of it instead of parking", () => {
  const g = createPlayableGame(11, r),
    human = g.survivors.find((s) => s.id === "human")!;
  g.status = "playing";
  human.escaped = true;
  const parker = Object.assign(actor("parker", "Parker", 1), {
    floor: 1,
    x: 22,
    y: 29,
    stairwell: "down" as const,
    access: [] as number[],
    keys: 0,
  });
  g.survivors = [human, parker];
  g.zombies = [];
  for (const s of g.floors[1].stations)
    g.encounters[s.encounter].state = "consumed";
  g.nextSpawn = 999999;
  g.surge.anchor = 999999;
  tick(g, 150);
  assert.equal(parker.floor, 1);
  assert.ok(parker.y <= 27, `left the well (y=${parker.y})`);
  assert.equal(
    g.events.some((e) => e.type === "climb" && e.actor === "parker"),
    false,
  );
});
test("a fresh force-field floor carves the well into the north wall and a survivor walks in to climb", () => {
  const probe = createPlayableGame(11, r),
    f0 = probe.floors[0],
    f1 = probe.floors[1];
  assert.deepEqual({ x: f0.stairs.x, y: f0.stairs.y }, { x: 22, y: 1 });
  for (const [y, x] of [
    [0, 21],
    [0, 22],
    [1, 21],
    [1, 22],
  ])
    assert.equal(f0.tiles[y][x], 0, `floor 0 tile ${x},${y}`);
  assert.equal(f1.tiles[28][21], 0);
  assert.equal(f1.tiles[29][22], 0);
  assert.deepEqual({ x: f1.entry.x, y: f1.entry.y }, { x: 22, y: 29 });
  assert.deepEqual({ x: f0.entry.x, y: f0.entry.y }, { x: 21.5, y: 26.5 });
  function walk(access: number[]) {
    const g = createPlayableGame(11, r),
      a = g.survivors.find((s) => s.id === "human")!;
    g.status = "playing";
    g.survivors = [a];
    g.nextSpawn = 999999;
    g.surge.anchor = 999999;
    g.zombies = [];
    Object.assign(a, { x: 22, y: 4, floor: 0, access });
    delete a.stairwell;
    for (let i = 0; i < 150 && a.floor === 0; i++)
      step(g, 1 / 30, { x: 0, y: -1, grab: false });
    return { g, a };
  }
  const up = walk([0]);
  assert.equal(up.a.floor, 1);
  assert.ok(distance(up.a, { x: 22, y: 29 }) < 0.8);
  assert.equal(lockedEvents(up.g), 0);
  const locked = walk([]);
  assert.equal(locked.a.floor, 0);
  assert.equal(locked.a.stairTravel, undefined);
  assert.ok(distance(locked.a, locked.g.floors[0].stairs) < 1.15);
  assert.equal(lockedEvents(locked.g), 1);
});
