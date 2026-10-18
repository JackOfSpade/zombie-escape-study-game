import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { step, vault } from "../src/engine";
import { type Roadmap } from "../src/model";
import { actor, createGame } from "../src/world";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));
function fixture() {
  const g = createGame(0, r),
    f = g.floors[0],
    chair = structuredClone(f.furniture.find((o) => o.kind === "chair")!);
  Object.assign(chair, { id: "cooldown-exit", x: 12.5, y: 10.5 });
  f.furniture = [chair];
  f.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
  for (let i = 8; i <= 12; i++) {
    f.tiles[8][i] = 1;
    f.tiles[12][i] = 1;
    f.tiles[i][8] = 1;
    f.tiles[i][12] = 1;
  }
  f.tiles[10][12] = 0;
  const a = Object.assign(actor("cooldown-runner", "Runner", 2), {
    x: chair.x - chair.w / 2 - 0.55,
    y: 10.5,
    cooldown: 0.3,
    risk: 0.1,
    activity: "fleeing" as const,
    fleeFloor: 0,
    fleeUntil: 3,
    fleeTarget: { x: chair.x + chair.w / 2 + 0.55, y: 10.5 },
    fleeRouteThreats: [],
  });
  g.status = "playing";
  g.nextSpawn = 999999;
  g.surge.anchor = 999999;
  g.survivors = [g.survivors[0], a];
  g.survivors[0].escaped = true;
  g.zombies = [
    {
      id: "visible-chaser",
      floor: 0,
      x: a.x - 1.45,
      y: a.y,
      hp: 60,
      path: [],
      repath: 0,
      cooldown: 0,
      memory: 9,
      stagger: 0,
      origin: "outside",
    },
  ];
  return { g, a, chair };
}
test("a chased NPC starts its legal vault when the actual cooldown expires without an extra route retry delay", () => {
  const { g, a } = fixture();
  for (let i = 0; i < 12; i++) step(g, 1 / 30);
  const jump = g.events.find((e) => e.type === "vault" && e.actor === a.id);
  assert.ok(jump, "legal vault stayed stalled after its real cooldown expired");
  assert.ok(jump.at >= 0.3 - 1e-8);
  assert.ok(jump.at <= 0.4);
  assert.ok(a.alive);
});
test("dead or extracted actors cannot create new vault work after their run ends", () => {
  for (const state of ["dead", "escaped"]) {
    const { g, a, chair } = fixture();
    a.cooldown = 0;
    a.heading = { x: 1, y: 0 };
    a.alive = state !== "dead";
    a.escaped = state === "escaped";
    const before = JSON.stringify(g);
    assert.equal(vault(g, a, chair.id), false);
    assert.equal(JSON.stringify(g), before);
  }
});
test("the real recovery duration is preserved rather than bypassed by the route follower", () => {
  const { g, a } = fixture();
  a.cooldown = 0.8;
  // A real stunned threat keeps this legal route stable while recovery elapses.
  g.zombies[0].stagger = 2;
  for (let i = 0; i < 20; i++) step(g, 1 / 30);
  assert.equal(
    g.events.some((e) => e.type === "vault" && e.actor === a.id),
    false,
  );
  for (let i = 0; i < 6; i++) step(g, 1 / 30);
  const jump = g.events.find((e) => e.type === "vault" && e.actor === a.id);
  assert.ok(
    jump,
    JSON.stringify({
      position: [a.x, a.y],
      cooldown: a.cooldown,
      activity: a.activity,
      goal: a.fleeTarget,
      path: a.path,
      events: g.events.slice(-5),
    }),
  );
  assert.ok(jump.at >= 0.8 - 1e-8);
  assert.ok(jump.at <= 26 / 30 + 1e-8);
});
test("a retained vault route and its remaining cooldown resume with the same timing after reload", async () => {
  const { encode, decode, recover } = await import("../src/persistence");
  const { g, a } = fixture();
  for (let i = 0; i < 4; i++) step(g, 1 / 30);
  const restored = recover(decode(encode(g))),
    b = restored.survivors[1];
  assert.equal(b.cooldown, a.cooldown);
  for (let i = 0; i < 8; i++) {
    step(g, 1 / 30);
    step(restored, 1 / 30);
  }
  const jumps = (world: typeof g) =>
    JSON.stringify(
      world.events.filter((e) => e.type === "vault" && e.actor === a.id),
    );
  assert.notEqual(jumps(g), "[]");
  assert.equal(jumps(restored), jumps(g));
  assert.equal(b.hp, a.hp);
  assert.equal(JSON.stringify(restored.study), JSON.stringify(g.study));
});
