import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { claimStation, stairs, step, vault } from "../src/engine";
import { canGrip } from "../src/handling";
import { type Roadmap, CONFIG, distance } from "../src/model";
import { decode, encode, recover } from "../src/persistence";
import { advanceStairs } from "../src/stair-travel";
import { actor, createGame } from "../src/world";
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
function tick(g: ReturnType<typeof createGame>, n: number) {
  for (let i = 0; i < n; i++) step(g, 1 / 30);
}
test("survivors require personal access and a full saved stair flight in either direction", () => {
  const { g, a } = fixture(),
    learning = JSON.stringify(g.study);
  assert.equal(stairs(g, a), false);
  a.access.push(0);
  assert.ok(stairs(g, a));
  const until = a.stairTravel!.until;
  assert.equal(a.floor, 0);
  assert.equal(until, g.time + CONFIG.stairSeconds);
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
  assert.ok(distance(b, restored.floors[1].entry) < 0.01);
  assert.equal(b.access.includes(1), false);
  assert.ok(stairs(restored, b, true));
  assert.equal(b.floor, 1);
  tick(restored, 60);
  assert.equal(b.floor, 0);
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
  assert.equal(events.length, 4);
  assert.ok(events[1].at - events[0].at >= CONFIG.stairSeconds - 1e-8);
});
test("movement cancels a flight on the original floor; climbing cannot remotely use a terminal, vault or grip furniture", () => {
  const { g, a } = fixture();
  a.access.push(0);
  assert.ok(stairs(g, a));
  assert.equal(claimStation(g, a, g.floors[0].stations[0].id), false);
  assert.equal(vault(g, a), false);
  assert.equal(canGrip(g.floors[0], a, g.floors[0].furniture[0]), false);
  const y = a.y;
  step(g, 1 / 30, { x: 0, y: 1, grab: false });
  assert.equal(a.stairTravel, undefined);
  assert.equal(a.floor, 0);
  assert.ok(a.y > y);
  tick(g, 90);
  assert.equal(a.floor, 0);
  assert.equal(
    g.events.some((e) => e.type === "climb" && e.actor === a.id),
    false,
  );
});
test("blocked landing furniture delays arrival without clipping, clock reset or durability changes", () => {
  const { g, a } = fixture(),
    f = g.floors[1],
    ob = f.furniture.find((o) => o.kind === "shelf")!;
  Object.assign(ob, { x: f.entry.x, y: f.entry.y, w: 3, h: 3 });
  const hp = ob.hp;
  a.access.push(0);
  assert.ok(stairs(g, a));
  const until = a.stairTravel!.until;
  tick(g, 90);
  assert.equal(a.floor, 0);
  assert.equal(a.stairTravel!.until, until);
  assert.equal(ob.hp, hp);
  assert.match(g.notice, /landing blocked/);
  ob.destroyed = true;
  ob.hp = 0;
  tick(g, 1);
  assert.equal(a.floor, 1);
  assert.ok(distance(a, f.entry) < 0.01);
});
test("arrival chooses a clear connected landing and queues when every landing is occupied", () => {
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
  assert.equal(a.floor, 0);
  blockers[1].alive = false;
  advanceStairs(g, a);
  assert.equal(a.floor, 1);
  assert.ok(
    g.survivors
      .filter((b) => b !== a && b.alive)
      .every((b) => distance(a, b) >= 0.55),
  );
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
