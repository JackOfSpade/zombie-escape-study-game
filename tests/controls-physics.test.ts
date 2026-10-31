import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { dragFurniture, rotate, step, toggleGrip, vault } from "../src/engine";
import { localPoint, worldPoint } from "../src/furniture-geometry";
import { FURNITURE, type Roadmap } from "../src/model";
import { survivorPath, walkSegment } from "../src/navigation";
import { canPlace, inFurniture, solid } from "../src/spatial";
import { createGame } from "../src/world";
const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
function scene() {
  const g = createGame(11, roadmap),
    f = g.floors[0],
    a = g.survivors[0],
    o = f.furniture.find((o) => o.kind === "sofa")!;
  g.status = "playing";
  g.survivors = [a];
  g.zombies = [];
  g.nextSpawn = 1e9;
  g.surge.anchor = 1e9;
  f.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
  f.stations = [];
  f.furniture = [o];
  Object.assign(o, { x: 12, y: 12, w: 3.8, h: 1.2, turning: 0, angle: 0 });
  Object.assign(a, { x: 9.55, y: 12 });
  return { g, f, a, o };
}
test("off-center E grip persists without holding a key and pivots the real sofa; E releases", () => {
  const { g, f, a, o } = scene();
  assert.ok(toggleGrip(g, a));
  const before = { ...o };
  for (let i = 0; i < 30; i++) step(g, 1 / 30, { x: 0, y: -1, grab: false });
  assert.equal(a.grip?.object, o.id);
  assert.ok(Math.abs(o.angle!) > 0.05);
  assert.ok(o.y < before.y);
  assert.ok(canPlace(f, o, o));
  assert.ok(!inFurniture(a, o, 0.22));
  const local = localPoint(a, o);
  assert.ok(
    Math.hypot(local.x - a.grip!.local.x, local.y - a.grip!.local.y) < 1e-6,
  );
  assert.ok(toggleGrip(g, a));
  assert.equal(a.grip, undefined);
  const pose = [o.x, o.y, o.angle];
  step(g, 0.1, { x: -1, y: 0, grab: false });
  assert.ok(
    Math.hypot(o.x - pose[0]!, o.y - pose[1]!) < 0.3,
    "release preserves bounded momentum",
  );
  for (let i = 0; i < 90; i++) step(g, 1 / 30);
  assert.ok(
    Math.hypot(o.physics!.x, o.physics!.y) < 0.01,
    "floor friction brings released furniture to rest",
  );
});
test("drag sweeps reject walls and bodies rather than clipping rotated corners", () => {
  const { g, f, a, o } = scene();
  assert.ok(toggleGrip(g, a));
  f.tiles[11][10] = 1;
  const pose = JSON.stringify(o);
  assert.equal(dragFurniture(g, a, 0, -1, 0.1), false);
  assert.equal(JSON.stringify(o), pose);
  f.tiles[11][10] = 0;
  const npc = { ...a, id: "blocking-body", x: 12, y: 11.15 };
  g.survivors.push(npc);
  for (let i = 0; i < 100; i++) dragFurniture(g, a, 0, -1, 1 / 30);
  assert.ok(!inFurniture(npc, o, 0.23));
  assert.ok(!solid(f, a));
});
test("Esc pause freezes the entire engine including timers, paths and damage", () => {
  const { g } = scene();
  g.paused = true;
  const before = JSON.stringify(g);
  step(g, 0.1, { x: 1, y: 1, grab: true });
  assert.equal(JSON.stringify(g), before);
});
test("rotated furniture uses matching collision, swept walk and cross-face vault geometry", () => {
  const { g, f, a, o } = scene();
  o.angle = Math.PI / 4;
  Object.assign(a, worldPoint({ x: 0, y: -o.h / 2 - 0.55 }, o));
  a.heading = worldPoint({ x: 0, y: 1 }, { x: 0, y: 0, angle: o.angle });
  const target = worldPoint({ x: 0, y: o.h / 2 + 0.55 }, o);
  assert.equal(walkSegment(f, a, target), false);
  assert.ok(survivorPath(f, a, target).length);
  assert.ok(vault(g, a, o.id));
  assert.ok(
    Math.hypot(a.vault!.to.x - target.x, a.vault!.to.y - target.y) < 1e-6,
  );
  for (let i = 0; i < 50; i++) step(g, 1 / 30);
  assert.ok(!solid(f, a));
});

test("rotated corner placement distinguishes actual wall contact from empty bounding-box corners", () => {
  const { f, o } = scene();
  o.angle = Math.PI / 4;
  f.tiles[13][10] = 1;
  assert.ok(
    canPlace(f, o, o),
    "empty lower-left bounding-box corner stays clear",
  );
  f.tiles[13][13] = 1;
  assert.equal(
    canPlace(f, o, o),
    false,
    "actual far corner cannot rotate through wall",
  );
});
test("swept dragging advances toward a wall then stops without embedding the held end or far corner", () => {
  const { g, f, a, o } = scene();
  f.tiles[10][10] = 1;
  assert.ok(canPlace(f, o, o));
  assert.ok(toggleGrip(g, a));
  const before = { x: o.x, y: o.y };
  let moved = false;
  for (let i = 0; i < 300; i++) {
    moved = dragFurniture(g, a, 0, -1, 1 / 30) || moved;
    assert.ok(canPlace(f, o, o));
    assert.ok(!solid(f, a));
  }
  assert.ok(moved);
  assert.ok(Math.hypot(o.x - before.x, o.y - before.y) > 0.01);
  assert.equal(
    dragFurniture(g, a, 0, -1, 1 / 30),
    false,
    "blocked pose holds instead of tunneling",
  );
});

test("NPC quarter-turns reject a survivor inside the rotated target footprint outside its old axis-aligned bounds", () => {
  const { g, f, a, o } = scene();
  o.angle = Math.PI / 4;
  Object.assign(a, worldPoint({ x: -o.w / 2 - 0.55, y: 0 }, o));
  const bystander = {
    ...a,
    id: "bystander",
    ...worldPoint({ x: 0, y: 1.6 }, o),
  };
  g.survivors.push(bystander);
  assert.ok(
    !solid(f, bystander),
    "bystander starts outside existing furniture",
  );
  assert.ok(inFurniture(bystander, { ...o, w: o.h, h: o.w }, 0.25));
  const pose = [o.x, o.y, o.w, o.h, o.angle];
  assert.equal(rotate(g, a), false);
  assert.deepEqual([o.x, o.y, o.w, o.h, o.angle], pose);
  g.survivors.pop();
  assert.equal(
    rotate(g, a),
    true,
    "turn remains available after the actual obstruction clears",
  );
});

for (const kind of ["chair", "desk", "sofa", "fridge", "shelf"] as const)
  test(`${kind} drags at full walking speed despite its weight`, () => {
    const { g, a, o } = scene();
    Object.assign(o, FURNITURE[kind], { kind });
    Object.assign(a, { x: o.x - o.w / 2 - 0.55, y: o.y });
    const start = a.x;
    assert.ok(toggleGrip(g, a, o.id));
    for (let i = 0; i < 60; i++) step(g, 1 / 30, { x: -1, y: 0, grab: false });
    assert.ok(
      Math.abs(start - a.x - a.speed * 2) < 0.04,
      `${start - a.x} vs ${a.speed * 2}`,
    );
    assert.ok(Math.abs(o.angle ?? 0) < 0.01);
  });

test("Space selects the faced long barricade even when another object's center is nearer", () => {
  const { g, f, a, o } = scene();
  Object.assign(o, { w: 6, h: 1 });
  Object.assign(a, { x: 14.7, y: 10.95, heading: { x: 0, y: 1 } });
  f.furniture.push({
    ...o,
    id: "chair-behind",
    kind: "chair",
    x: a.x,
    y: 9.5,
    w: 0.8,
    h: 0.8,
  });
  assert.ok(vault(g, a));
  assert.equal(a.vault?.obstacle, o.id);
  for (let i = 0; i < 50; i++) step(g, 1 / 30);
  assert.ok(a.y > 12.7);
  assert.ok(!solid(f, a));
});

test("vault cannot start remotely or cross a blocked landing", () => {
  const { g, f, a } = scene();
  Object.assign(a, { x: 12, y: 9.5, heading: { x: 0, y: 1 } });
  assert.equal(vault(g, a), false);
  a.y = 10.85;
  f.tiles[13][12] = 1;
  assert.equal(vault(g, a), false);
  assert.equal(a.vault, undefined);
});

test("full-speed native dragging still stops the entire object at walls", () => {
  const { g, f, a, o } = scene();
  Object.assign(o, FURNITURE.fridge, { kind: "fridge" });
  Object.assign(a, { x: o.x - o.w / 2 - 0.55, y: o.y });
  for (let y = 0; y < 34; y++) f.tiles[y][14] = 1;
  assert.ok(toggleGrip(g, a, o.id));
  for (let i = 0; i < 120; i++) {
    step(g, 1 / 30, { x: 1, y: 0, grab: false });
    assert.ok(o.x + o.w / 2 <= 14.03);
    assert.ok(a.x < o.x);
    assert.ok(!inFurniture(a, o, 0.22));
  }
  assert.ok(o.x > 13.3, "furniture actually reaches the wall");
});

for (const kind of ["chair", "desk", "sofa", "fridge", "shelf"] as const)
  test(`${kind} pivots without slowing the player's sideways walk`, () => {
    const { g, a, o } = scene();
    Object.assign(o, FURNITURE[kind], { kind });
    Object.assign(a, { x: o.x - o.w / 2 - 0.55, y: o.y });
    assert.ok(toggleGrip(g, a, o.id));
    let walked = 0;
    for (let i = 0; i < 60; i++) {
      const before = { x: a.x, y: a.y };
      step(g, 1 / 30, { x: 0, y: -1, grab: false });
      walked += Math.hypot(a.x - before.x, a.y - before.y);
    }
    assert.ok(
      Math.abs(walked - a.speed * 2) < 0.04,
      `${walked} vs ${a.speed * 2}`,
    );
    assert.ok(Math.abs(o.angle ?? 0) > 0.1);
  });

test("Space jumps in force-field play, releases a held object and lands without repeated input", () => {
  const { g, f, a, o } = scene();
  g.rules = "force-fields";
  assert.ok(toggleGrip(g, a, o.id));
  step(g, 1 / 30, { x: 0, y: 0, grab: false, jump: true });
  assert.equal(a.grip, undefined);
  assert.equal(a.handling, undefined);
  assert.ok(a.elevated && a.elevated.feet > 0);
  let peak = a.elevated.feet;
  for (let i = 0; i < 60; i++) {
    step(g, 1 / 30, { x: 0, y: 0, grab: false });
    peak = Math.max(peak, a.elevated?.feet ?? 0);
  }
  assert.ok(peak > 1 && peak <= 1.11, `jump peak ${peak}`);
  assert.equal(a.elevated, undefined);
  assert.equal(a.hp, 100);
  assert.ok(!solid(f, a));
});

test("legacy Space prefers a faced vault and otherwise performs a free jump", () => {
  const { g, a } = scene();
  Object.assign(a, { x: 12, y: 10.85, heading: { x: 0, y: 1 } });
  step(g, 1 / 30, { x: 0, y: 0, grab: false, jump: true });
  assert.ok(
    a.vault,
    "the familiar barricade crossing remains the first choice",
  );
  assert.equal(a.elevated, undefined);
  for (let i = 0; i < 60; i++) step(g, 1 / 30);
  Object.assign(a, { x: 5, y: 5 });
  step(g, 1 / 30, { x: 0, y: 0, grab: false, jump: true });
  const jumped = g.survivors[0].elevated;
  assert.ok(jumped && jumped.feet > 0, "a clear area uses the new jump");
  assert.equal(a.vault, undefined);
});
