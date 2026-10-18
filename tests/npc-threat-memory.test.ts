import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { step } from "../src/engine";
import { type Roadmap } from "../src/model";
import {
  rememberedThreats,
  rememberThreats,
  THREAT_MEMORY,
} from "../src/npc-threat-memory";
import { decode, encode, recover } from "../src/persistence";
import { canSee } from "../src/visibility";
import { actor, createGame } from "../src/world";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));
function retreatFixture() {
  const g = createGame(0, r),
    f = g.floors[0],
    shelf = structuredClone(f.furniture.find((o) => o.kind === "shelf")!);
  Object.assign(shelf, {
    id: "occluding-retreat-cover",
    x: 12.5,
    y: 10.5,
    w: 1,
    h: 3,
  });
  f.furniture = [shelf];
  f.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
  for (let y = 0; y < 34; y++) if (y < 9 || y > 11) f.tiles[y][12] = 1;
  f.stairs = { x: 9.5, y: 10.5 };
  const a = Object.assign(actor("memory-runner", "Runner", 2), {
    x: 11.45,
    y: 10.5,
    access: [0],
    risk: 0.1,
    activity: "fleeing" as const,
    fleeFloor: 0,
    fleeUntil: 3,
    fleeTarget: { x: 13.55, y: 10.5 },
    fleeRouteThreats: [],
  });
  g.status = "playing";
  g.nextSpawn = 999999;
  g.surge.anchor = 999999;
  g.survivors = [g.survivors[0], a];
  g.survivors[0].escaped = true;
  g.zombies = [
    {
      id: "recently-seen-chaser",
      floor: 0,
      x: 9,
      y: 10.5,
      hp: 60,
      path: [],
      repath: 0,
      cooldown: 0,
      memory: 9,
      stagger: 0.8,
      origin: "outside",
    },
  ];
  return { g, a, shelf };
}
test("an NPC that vaults into cover does not immediately vault back toward its recently seen hidden pursuer", () => {
  const { g, a } = retreatFixture();
  for (let i = 0; i < 96 && a.alive; i++) step(g, 1 / 30);
  const jumps = g.events.filter((e) => e.type === "vault" && e.actor === a.id);
  assert.equal(
    jumps.length,
    1,
    `immediate repeated return: ${JSON.stringify(jumps)}`,
  );
  assert.equal(a.floor, 0);
  assert.ok(a.x > 13.5);
  assert.ok(a.alive);
});

function observationFixture() {
  const g = createGame(4, r),
    a = Object.assign(actor("observer", "Observer", 2), { x: 10, y: 10 }),
    f = g.floors[0];
  f.furniture = [];
  f.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
  const z = {
    id: "seen",
    floor: 0,
    x: 12,
    y: 10,
    hp: 60,
    path: [],
    repath: 0,
    cooldown: 0,
    memory: 0,
    stagger: 0,
    origin: "outside" as const,
  };
  g.survivors = [g.survivors[0], a];
  g.zombies = [z];
  return { g, a, z, f };
}
test("remembered positions cannot follow a hidden pursuer or learn its unseen death", () => {
  const { g, a, z, f } = observationFixture();
  rememberThreats(g, a, [z]);
  const observed = JSON.stringify(rememberedThreats(g, a));
  const cover = structuredClone(
    createGame(0, r).floors[0].furniture.find((o) => o.kind === "shelf")!,
  );
  Object.assign(cover, { x: 11, y: 10, w: 0.8, h: 4 });
  f.furniture = [cover];
  z.x = 14;
  g.time = 0.3;
  assert.equal(canSee(f, a, z, 9), false);
  rememberThreats(g, a, g.zombies);
  assert.equal(JSON.stringify(rememberedThreats(g, a)), observed);
  z.hp = 0;
  z.x = 18;
  g.time = 0.6;
  rememberThreats(g, a, g.zombies);
  assert.equal(JSON.stringify(rememberedThreats(g, a)), observed);
});
test("only actual locally seen world actors can enter the bounded memory", () => {
  const { g, a, z, f } = observationFixture();
  for (let y = 0; y < 34; y++) f.tiles[y][13] = 1;
  const hidden = { ...z, id: "hidden", x: 14 },
    far = { ...z, id: "far", y: 25 },
    otherFloor = { ...z, id: "other-floor", floor: 1 };
  g.zombies.push(hidden, far, otherFloor);
  rememberThreats(g, a, [...g.zombies, { ...z, id: "not-in-world" }]);
  assert.deepEqual(
    rememberedThreats(g, a).map((p) => p.id),
    [z.id],
  );
  const learning = JSON.stringify(g.study),
    rng = g.rng,
    seq = g.seq;
  g.time = 0.3;
  rememberThreats(g, a, g.zombies);
  assert.equal(JSON.stringify(g.study), learning);
  assert.equal(g.rng, rng);
  assert.equal(g.seq, seq);
});
test("observations expire in simulation time, stay on their floor and cannot be imported from the future", () => {
  const { g, a, z } = observationFixture();
  rememberThreats(g, a, [z]);
  g.time = THREAT_MEMORY.seconds;
  assert.deepEqual(rememberedThreats(g, a), []);
  g.time = 0.5;
  a.floor = 1;
  assert.deepEqual(rememberedThreats(g, a), []);
  rememberThreats(g, a, []);
  assert.equal(a.threatMemory, undefined);
  a.floor = 0;
  rememberThreats(g, a, [z]);
  g.time = 0.1;
  assert.deepEqual(rememberedThreats(g, a), []);
});
test("sampling and capacity bound memory while new visible sightings and visible kills replace old information", () => {
  const { g, a, z } = observationFixture();
  g.zombies = Array.from({ length: 12 }, (_, i) => ({
    ...z,
    id: `seen-${i}`,
    x: 12 + i * 0.6,
    path: [],
  }));
  rememberThreats(g, a, g.zombies);
  assert.equal(rememberedThreats(g, a).length, THREAT_MEMORY.max);
  const first = g.zombies[0];
  first.x = 12.1;
  g.time = 0.1;
  rememberThreats(g, a, g.zombies);
  assert.equal(rememberedThreats(g, a).find((p) => p.id === first.id)!.x, 12);
  g.time = 0.3;
  rememberThreats(g, a, g.zombies);
  assert.equal(rememberedThreats(g, a).find((p) => p.id === first.id)!.x, 12.1);
  first.hp = 0;
  g.time = 0.31;
  rememberThreats(g, a, g.zombies);
  assert.equal(
    rememberedThreats(g, a).some((p) => p.id === first.id),
    false,
  );
});
test("a retained actual sighting and retreat survive reload without new knowledge or learning credit", () => {
  const { g, a } = retreatFixture();
  for (let i = 0; i < 45; i++) step(g, 1 / 30);
  const known = JSON.stringify(rememberedThreats(g, a)),
    learning = JSON.stringify(g.study);
  const restored = recover(decode(encode(g))),
    b = restored.survivors[1];
  assert.equal(JSON.stringify(rememberedThreats(restored, b)), known);
  for (let i = 0; i < 45; i++) {
    step(g, 1 / 30);
    step(restored, 1 / 30);
  }
  assert.equal(
    g.events.filter((e) => e.type === "vault" && e.actor === a.id).length,
    1,
  );
  assert.equal(
    restored.events.filter((e) => e.type === "vault" && e.actor === a.id)
      .length,
    1,
  );
  assert.equal(
    JSON.stringify(rememberedThreats(restored, b)),
    JSON.stringify(rememberedThreats(g, a)),
  );
  assert.equal(JSON.stringify(g.study), learning);
  assert.equal(JSON.stringify(restored.study), learning);
});

test("a brief newly seen threat is retained even between ordinary position samples", () => {
  const { g, a, z, f } = observationFixture();
  rememberThreats(g, a, [z]);
  const brief = { ...z, id: "brief-sighting", x: 12.5, y: 10.5 };
  g.zombies.push(brief);
  g.time = 0.1;
  rememberThreats(g, a, g.zombies);
  assert.equal(rememberedThreats(g, a).find((p) => p.id === brief.id)!.at, 0.1);
  assert.equal(rememberedThreats(g, a).find((p) => p.id === z.id)!.at, 0);
  const cover = structuredClone(
    createGame(0, r).floors[0].furniture.find((o) => o.kind === "shelf")!,
  );
  Object.assign(cover, { x: 11, y: 10, w: 0.4, h: 4 });
  f.furniture = [cover];
  brief.x = 15;
  g.time = 0.2;
  rememberThreats(g, a, g.zombies);
  assert.equal(rememberedThreats(g, a).find((p) => p.id === brief.id)!.x, 12.5);
  assert.equal(rememberedThreats(g, a).find((p) => p.id === brief.id)!.at, 0.1);
});
