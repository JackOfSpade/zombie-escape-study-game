import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { soundConnected } from "../src/acoustics";
import {
  recordZombieTrails,
  footprintPose,
  BLOOD_RESOLUTION,
} from "../src/blood";
import { ensureDoor, unlatchDoor } from "../src/doors";
import { step } from "../src/engine";
import {
  type Furniture,
  type Roadmap,
  type Zombie,
  H,
  W,
  event,
} from "../src/model";
import { encode, decode } from "../src/persistence";
import { hordeSound, soundEvents } from "../src/soundscape";
import { path } from "../src/spatial";
import { createGame } from "../src/world";
const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
function fixture() {
  const g = createGame(11, roadmap),
    f = g.floors[0],
    a = g.survivors[0];
  g.status = "playing";
  g.zombies = [];
  g.survivors = [a];
  g.nextSpawn = 1e9;
  g.surge.anchor = 1e9;
  f.tiles = Array.from({ length: H }, () => Array(W).fill(0));
  f.stations = [];
  f.furniture = [];
  for (let y = 0; y < H; y++) if (y < 15 || y >= 18) f.tiles[y][15] = 1;
  const o: Furniture = {
    id: "seal",
    kind: "shelf",
    floor: 0,
    x: 15.5,
    y: 16.5,
    w: 1,
    h: 3,
    hp: 100,
    maxHp: 100,
    speed: 1,
    rotation: 0,
    destroyed: false,
    movers: [],
    moved: 0,
    credited: [],
    turning: 0,
  };
  f.furniture = [o];
  Object.assign(a, { x: 10.5, y: 16.5 });
  const z: Zombie = {
    id: "trailer",
    x: 20.5,
    y: 16.5,
    floor: 0,
    hp: 100,
    path: [],
    repath: 0,
    cooldown: 0,
    memory: 0,
    stagger: 100,
    origin: "outside" as const,
  };
  g.zombies = [z];
  return { g, f, a, o, z };
}
test("sealed cover muffles ambience and individual impacts; even a 0.01-unit edge gap remains acoustically open", () => {
  const { g, f, a, o, z } = fixture();
  assert.equal(soundConnected(f, a, z), false);
  const sealed = hordeSound(g),
    before = g.seq;
  event(g, "barricade-hit", "impact", 0).position = { x: z.x, y: z.y };
  const impact = soundEvents(g, before)[0];
  assert.equal(sealed.cutoff, 120);
  assert.equal(impact.cutoff, 120);
  o.h = 2.98;
  assert.equal(
    path(f, a, z).length,
    0,
    "a walking-grid failure is not a sound seal",
  );
  assert.equal(soundConnected(f, a, z), true);
  const gap = hordeSound(g),
    openImpact = soundEvents(g, before)[0];
  assert.ok(gap.gain > sealed.gain * 20);
  assert.equal(gap.cutoff, 4800);
  assert.ok(openImpact.gain > impact.gain * 20);
  assert.equal(openImpact.cutoff, 4800);
  o.h = 3;
  assert.equal(
    soundConnected(f, a, z),
    false,
    "closing the same gap invalidates cached connectivity",
  );
  o.destroyed = true;
  assert.equal(soundConnected(f, a, z), true);
});
test("a different entrance, moved props and diagonal gaps prevent false sealed-room detection", () => {
  const { f, a, o, z } = fixture();
  f.tiles[25][15] = 0;
  assert.equal(soundConnected(f, a, z), true);
  f.tiles[25][15] = 1;
  assert.equal(soundConnected(f, a, z), false);
  Object.assign(o, { w: 1.5, h: 4, angle: 0.08 });
  assert.equal(
    soundConnected(f, a, z),
    false,
    "rotated cover overlaps both jambs",
  );
  Object.assign(o, { w: 0.5, h: 2.5, angle: 0.4 });
  assert.equal(
    soundConnected(f, a, z),
    true,
    "diagonal corner gaps conduct sound",
  );
  o.angle = 0;
  o.w = 1;
  o.h = 3;
  o.y = 16.53;
  assert.equal(soundConnected(f, a, z), true);
});
test("overlapping props can jointly seal; a narrow slit between them cannot", () => {
  const { f, a, o, z } = fixture();
  o.h = 1.6;
  o.y = 15.8;
  const other = { ...o, id: "lower", y: 17.2 };
  f.furniture.push(other);
  assert.equal(soundConnected(f, a, z), false);
  other.y = 17.41;
  assert.equal(soundConnected(f, a, z), true);
});
test("latched doors seal their jambs and an actual swung leaf reopens the acoustic path", () => {
  const { f, a, o, z } = fixture();
  o.kind = "door";
  o.speed = 0;
  ensureDoor(o);
  assert.equal(soundConnected(f, a, z), false);
  unlatchDoor(o);
  o.angle = 0.7;
  assert.equal(soundConnected(f, a, z), true);
});
test("permanent movement trails survive save/reload, floor changes and zombie removal without consuming RNG", () => {
  const { g, f, z } = fixture();
  const rng = g.rng;
  recordZombieTrails(g);
  z.x += 0.9;
  recordZombieTrails(g);
  assert.ok(f.blood?.some((row) => row?.match(/[a-p]/)));
  const marks = JSON.stringify(f.blood);
  const restored = decode(encode(g));
  assert.equal(JSON.stringify(restored.floors[0].blood), marks);
  g.time += 1e6;
  g.zombies = [];
  recordZombieTrails(g);
  assert.equal(JSON.stringify(f.blood), marks);
  assert.equal(g.rng, rng);
});
test("trail coverage saturates a fixed grid and never bridges a teleport or draws through a wall", () => {
  const { g, f, z } = fixture();
  recordZombieTrails(g);
  z.x = 35;
  recordZombieTrails(g);
  assert.equal(g.floors[0].blood, undefined);
  z.floor = 1;
  recordZombieTrails(g);
  assert.equal(g.floors[1].blood, undefined);
  z.floor = 0;
  z.x = 14.9;
  z.y = 10.5;
  recordZombieTrails(g);
  z.x = 15.6;
  recordZombieTrails(g);
  assert.ok(!f.blood?.[42]?.[62] || f.blood[42]![62] === "0");
  z.x = 20;
  z.y = 20;
  recordZombieTrails(g);
  for (let i = 0; i < 1000; i++) {
    z.x = i % 2 ? 20 : 20.9;
    recordZombieTrails(g);
  }
  assert.ok((f.blood?.length ?? 0) <= H * BLOOD_RESOLUTION);
  assert.ok(
    f.blood?.every(
      (row) =>
        !row ||
        (row.length === W * BLOOD_RESOLUTION && /^[0-3a-p]+$/.test(row)),
    ),
  );
  assert.ok(JSON.stringify(f.blood).length < W * H * 16 + H * 40);
});
test("actual simulation leaves trails, while pausing freezes blood and all other game state", () => {
  const { g, z } = fixture();
  z.stagger = 0;
  z.target = { x: 30, y: 16.5 };
  z.memory = 1e9;
  z.repath = 1e9;
  z.path = [{ x: 30, y: 16.5 }];
  for (let i = 0; i < 45; i++) step(g, 1 / 30);
  assert.ok(g.floors[0].blood?.some((row) => row?.match(/[123a-p]/)));
  g.paused = true;
  const before = JSON.stringify(g);
  step(g, 0.1);
  assert.equal(JSON.stringify(g), before);
});

test("bloody footsteps alternate feet, retain movement direction and restore the next foot after reload", () => {
  const { g, f, z } = fixture();
  recordZombieTrails(g);
  z.x += 0.9;
  recordZombieTrails(g);
  const poses = (f.blood ?? []).flatMap((row) =>
    [...(row ?? "")].map(footprintPose).filter((p) => p !== undefined),
  );
  assert.ok(poses.some((p) => p.side === -1));
  assert.ok(poses.some((p) => p.side === 1));
  assert.ok(poses.every((p) => p.angle === 0));
  const restored = decode(encode(g));
  assert.equal(restored.zombies[0].bloodStep?.right, z.bloodStep?.right);
  z.y += 0.9;
  recordZombieTrails(g);
  assert.ok(
    f.blood?.some((row) =>
      [...(row ?? "")].some(
        (mark) => footprintPose(mark)?.angle === Math.PI / 2,
      ),
    ),
  );
  assert.ok(
    footprintPose("1"),
    "old saved stains display as tiny footsteps too",
  );
});
