import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { step, toggleDoor } from "../src/engine";
import { worldPoint } from "../src/furniture-geometry";
import { distance, type Furniture, type Roadmap } from "../src/model";
import {
  beginPhysics,
  BODY_RADIUS,
  finishPhysics,
  physicsMove,
} from "../src/physics";
import { actor, createGame } from "../src/world";
const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
function scene() {
  const g = createGame(11, roadmap),
    a = g.survivors[0];
  g.status = "playing";
  g.survivors = [a];
  g.zombies = [];
  g.nextSpawn = 1e9;
  g.surge.anchor = 1e9;
  for (const f of g.floors) {
    f.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
    f.furniture = [];
    f.stations = [];
    f.stairs = { x: 35, y: 25 };
  }
  Object.assign(a, { x: 10, y: 12 });
  return { g, a, f: g.floors[0] };
}
test("player and NPC solid bodies push instead of crossing through each other", () => {
  const { g, a } = scene(),
    npc = actor("stationary", "Stationary", 1);
  Object.assign(npc, { x: 11, y: 12, speed: 0 });
  g.survivors.push(npc);
  for (let i = 0; i < 90; i++) {
    step(g, 1 / 30, { x: 1, y: 0, grab: false });
    assert.ok(distance(a, npc) >= 2 * BODY_RADIUS - 0.025);
    assert.ok(a.x < npc.x);
  }
  assert.ok(
    npc.x > 11.1,
    "the other body can be physically pushed in free space",
  );
});
test("survivors and zombies cannot cross or overlap during physical contact", () => {
  const { g, a } = scene();
  const z = {
    id: "z0",
    x: 11,
    y: 12,
    floor: 0,
    hp: 60,
    path: [],
    repath: 0,
    cooldown: 0,
    memory: 0,
    stagger: 100,
    origin: "outside" as const,
  };
  g.zombies = [z];
  for (let i = 0; i < 90; i++) {
    step(g, 1 / 30, { x: 1, y: 0, grab: false });
    assert.ok(distance(a, z) >= 2 * BODY_RADIUS - 0.025);
    assert.ok(a.x < z.x);
  }
});
test("opposing NPC motors steer past one another in an open corridor without passing through bodies", () => {
  const { g, a } = scene(),
    npc = actor("other", "Other", 1);
  Object.assign(a, { x: 10, y: 12 });
  Object.assign(npc, { x: 12, y: 12 });
  g.survivors.push(npc);
  for (let i = 0; i < 90; i++) {
    beginPhysics(g);
    physicsMove(g, a, 0.08, 0, true);
    physicsMove(g, npc, -0.08, 0, true);
    finishPhysics(g, 1 / 30);
    assert.ok(distance(a, npc) >= 2 * BODY_RADIUS - 0.025);
  }
  assert.ok(a.x > npc.x, "actors actually pass on different sides");
});
function doorway() {
  const state = scene();
  const door: Furniture = {
    id: "hinged-door",
    kind: "door",
    floor: 0,
    x: 12,
    y: 12.5,
    w: 1,
    h: 3,
    hp: 240,
    maxHp: 240,
    speed: 0,
    rotation: 0,
    destroyed: false,
    movers: [],
    moved: 0,
    credited: [],
    turning: 0,
    open: false,
  };
  state.f.furniture = [door];
  Object.assign(state.a, { x: 10.5, y: 12.5 });
  return { ...state, door };
}
test("a latched door stays shut under contact; E only releases it, and physical contact swings its fixed hinge", () => {
  const { g, a, door } = doorway();
  for (let i = 0; i < 45; i++) step(g, 1 / 30, { x: 1, y: 0, grab: false });
  assert.ok(door.door?.latched);
  assert.ok(Math.abs(door.angle ?? 0) < 0.01);
  assert.ok(a.x < 11.7);
  assert.ok(toggleDoor(g, a, door.id));
  assert.equal(door.door.latched, false);
  assert.ok(Math.abs(door.angle ?? 0) < 0.01);
  step(g, 1 / 30);
  assert.ok(
    Math.abs(door.angle ?? 0) < 0.01,
    "E cannot animate the leaf open on its own",
  );
  for (let i = 0; i < 90; i++) {
    step(g, 1 / 30, { x: 1, y: 0, grab: false });
    const hinge = worldPoint(
      {
        x: door.door.hinge.x - door.door.frame.x,
        y: door.door.hinge.y - door.door.frame.y,
      },
      door,
    );
    assert.ok(distance(hinge, door.door.hinge) < 0.025);
  }
  assert.ok(Math.abs(door.angle ?? 0) > 0.1);
  assert.ok(a.x > 12.4);
});
test("pushing an opened door shut clicks its latch; opposite swing requires another E release", () => {
  const { g, a, door } = doorway();
  step(g, 1 / 30);
  Object.assign(a, { x: 11.4, y: 12.5 });
  assert.ok(toggleDoor(g, a, door.id));
  for (let i = 0; i < 60; i++) step(g, 1 / 30, { x: 1, y: 0, grab: false });
  assert.ok((door.angle ?? 0) < -0.05);
  const angle = door.angle!,
    n = { x: Math.cos(angle), y: Math.sin(angle) };
  Object.assign(a, { x: door.x + n.x * 0.65, y: door.y + n.y * 0.65 });
  for (let i = 0; i < 240 && !door.door!.latched; i++)
    step(g, 1 / 30, {
      x: -Math.cos(door.angle!),
      y: -Math.sin(door.angle!),
      grab: false,
    });
  assert.equal(door.door!.latched, true);
  assert.equal(door.open, false);
  assert.ok(g.events.some((e) => e.type === "door-latch"));
  for (let i = 0; i < 30; i++) step(g, 1 / 30, { x: -1, y: 0, grab: false });
  assert.ok(Math.abs(door.angle!) < 0.01);
  assert.equal(door.door!.latched, true);
  assert.ok(toggleDoor(g, a, door.id));
  for (let i = 0; i < 90; i++) step(g, 1 / 30, { x: -1, y: 0, grab: false });
  assert.ok(door.angle! > 0.05, "second release permits opposite swing");
});
test("doors push from either face and a real wall frame does not trap the hinged leaf", () => {
  for (const side of [-1, 1]) {
    const { g, a, f, door } = doorway();
    for (let y = 0; y < 34; y++) if (y < 11 || y > 13) f.tiles[y][12] = 1;
    Object.assign(a, { x: 12 + side * 0.6, y: 12.5 });
    step(g, 1 / 30);
    assert.ok(toggleDoor(g, a, door.id));
    for (let i = 0; i < 90; i++)
      step(g, 1 / 30, { x: -side, y: 0, grab: false });
    assert.ok(side * door.angle! > 0.1, `swing from face ${side}`);
    assert.ok(side * (a.x - 12) < -0.3, `pass through frame from face ${side}`);
  }
});
test("physics poses, hinge latch and momentum survive serialization; pause freezes them", () => {
  const { g, a, door } = doorway();
  Object.assign(a, { x: 11.4, y: 12.5 });
  step(g, 1 / 30);
  toggleDoor(g, a, door.id);
  for (let i = 0; i < 20; i++) step(g, 1 / 30, { x: 1, y: 0, grab: false });
  const restored = JSON.parse(JSON.stringify(g));
  const rd = restored.floors[0].furniture[0];
  assert.deepEqual(rd.door, door.door);
  assert.deepEqual(rd.physics, door.physics);
  restored.paused = true;
  const before = JSON.stringify(restored);
  step(restored, 0.1);
  assert.equal(JSON.stringify(restored), before);
  restored.paused = false;
  step(restored, 1 / 30);
  assert.ok(
    Math.abs(rd.angle - door.angle!) < 0.15,
    "restore keeps leaf near saved angle",
  );
  assert.equal(rd.door.latched, false);
});
test("zombies collide with one another and cannot be pushed through a fixed wall", () => {
  const { g, a, f } = scene();
  f.tiles.forEach((row) => (row[13] = 1));
  g.zombies = [11.5, 12.1].map((x, i) => ({
    id: `z${i}`,
    x,
    y: 12,
    floor: 0,
    hp: 60,
    path: [],
    repath: 0,
    cooldown: 0,
    memory: 0,
    stagger: 100,
    origin: "outside" as const,
  }));
  for (let i = 0; i < 120; i++) {
    step(g, 1 / 30, { x: 1, y: 0, grab: false });
    assert.ok(distance(g.zombies[0], g.zombies[1]) >= 2 * BODY_RADIUS - 0.025);
    assert.ok(g.zombies[1].x <= 13 - BODY_RADIUS + 0.015);
    assert.ok(distance(a, g.zombies[0]) >= 2 * BODY_RADIUS - 0.025);
    assert.ok(a.x <= 13 - BODY_RADIUS + 0.015);
  }
});
test("a one-tile doorway can be crossed and physically pushed back into its latch", async () => {
  const { g, a, f, door } = doorway();
  door.h = 1;
  for (let y = 0; y < 34; y++) if (y !== 12) f.tiles[y][12] = 1;
  Object.assign(a, { x: 11.4, y: 12.5 });
  step(g, 1 / 30);
  assert.ok(toggleDoor(g, a, door.id));
  for (let i = 0; i < 75; i++) step(g, 1 / 30, { x: 1, y: 0, grab: false });
  assert.ok(a.x > 12.6, "the player clears the physical opening");
  const { closeDoorByContact } =
    await import("../scripts/lib/defense-scenario");
  closeDoorByContact(g, door);
  assert.ok(door.door!.latched);
  assert.equal(door.angle, 0);
  assert.ok(g.events.some((e) => e.type === "door-latch"));
});
test("zero or invalid frame durations cannot corrupt physical state", () => {
  const { g } = scene();
  const before = JSON.stringify(g);
  for (const dt of [0, -1, NaN, Infinity]) step(g, dt);
  assert.equal(JSON.stringify(g), before);
});
test("opposing NPC bodies back out of a one-tile passage to a passing bay instead of phasing through one another", () => {
  const { g, a, f } = scene(),
    b = actor("yielding-npc", "Yielding", 1);
  for (let x = 1; x < 30; x++)
    if (x < 15 || x > 18) {
      f.tiles[11][x] = 1;
      f.tiles[13][x] = 1;
    }
  Object.assign(a, { x: 10, y: 12.5, heading: { x: 1, y: 0 } });
  Object.assign(b, { x: 16, y: 12.5, heading: { x: -1, y: 0 } });
  g.survivors.push(b);
  for (let i = 0; i < 240; i++) {
    g.time += 1 / 30;
    beginPhysics(g);
    physicsMove(g, a, 0.08, 0, true);
    physicsMove(g, b, -0.08, 0, true);
    finishPhysics(g, 1 / 30);
    assert.ok(distance(a, b) >= 2 * BODY_RADIUS - 0.025);
  }
  assert.ok(a.x > b.x, "the actors pass using open space beside the corridor");
});
test("E grip can physically pull a released door inward when an outside barricade blocks its push swing", async () => {
  const { g, a, f, door } = doorway();
  door.h = 1;
  door.x = 12.5;
  for (let y = 0; y < 34; y++) if (y !== 12) f.tiles[y][12] = 1;
  for (let x = 8; x < 12; x++) {
    f.tiles[11][x] = 1;
    f.tiles[13][x] = 1;
  }
  const fridge = {
    ...door,
    id: "outside-cover",
    kind: "fridge" as const,
    x: 13.55,
    y: 12.5,
    w: 1.1,
    h: 1.1,
    speed: 0.38,
  };
  f.furniture.push(fridge);
  Object.assign(a, { x: 11.9, y: 12.5 });
  step(g, 1 / 30);
  assert.ok(toggleDoor(g, a, door.id));
  const { toggleGrip } = await import("../src/engine");
  assert.ok(toggleGrip(g, a, door.id));
  for (let i = 0; i < 75; i++) step(g, 1 / 30, { x: -1, y: 0, grab: false });
  assert.ok(door.angle! > 0.8, "hand force turns the real hinge inward");
  assert.ok(a.x < 11.9);
  assert.ok(Math.abs(fridge.x - 13.55) < 0.03);
  assert.ok(toggleGrip(g, a));
  assert.equal(a.grip, undefined);
});
test("packed legacy bodies ease into solid collision size and preserve that migration through a save", async () => {
  const { g } = scene();
  g.zombies = Array.from({ length: 16 }, (_, i) => ({
    id: `legacy-${i}`,
    x: 20 + (i % 4) * 0.435,
    y: 20 + Math.floor(i / 4) * 0.435,
    floor: 0,
    hp: 60,
    path: [],
    repath: 0,
    cooldown: 0,
    memory: 0,
    stagger: 100,
    origin: "outside" as const,
  }));
  for (let i = 0; i < 20; i++) {
    const before = g.zombies.map((z) => ({ x: z.x, y: z.y }));
    step(g, 1 / 30);
    g.zombies.forEach((z, j) =>
      assert.ok(
        distance(z, before[j]) < 0.06,
        "migration must not eject a queue in one tick",
      ),
    );
  }
  assert.ok(g.zombies[0].physics!.radius! < BODY_RADIUS);
  const { encode, decode } = await import("../src/persistence"),
    restored = decode(encode(g));
  for (let i = 0; i < 150; i++) {
    step(g, 1 / 30);
    step(restored, 1 / 30);
  }
  assert.deepEqual(restored, g);
  for (const z of g.zombies) {
    assert.equal(z.physics!.radius, BODY_RADIUS);
    for (const other of g.zombies)
      if (z !== other) assert.ok(distance(z, other) > 0.495);
  }
});
test("an active end grip and rotating furniture continue identically after a save", async () => {
  const { g, a, f } = scene();
  const o: Furniture = {
    id: "saved-sofa",
    kind: "sofa",
    floor: 0,
    x: 12,
    y: 12,
    w: 3.8,
    h: 1.2,
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
  Object.assign(a, { x: 9.55, y: 12 });
  const { toggleGrip } = await import("../src/engine");
  assert.ok(toggleGrip(g, a));
  for (let i = 0; i < 20; i++) step(g, 1 / 30, { x: 0, y: -1, grab: false });
  const { encode, decode } = await import("../src/persistence"),
    restored = decode(encode(g));
  for (let i = 0; i < 30; i++) {
    step(g, 1 / 30, { x: -1, y: 0, grab: false });
    step(restored, 1 / 30, { x: -1, y: 0, grab: false });
  }
  assert.deepEqual(restored, g);
  assert.ok(Math.abs(o.angle ?? 0) > 0.05);
});

test("wall fixtures refresh once per floor/tick, independently of body count, and still follow changed tiles", () => {
  const { g, a, f } = scene();
  let scans = 0;
  for (const row of f.tiles)
    row.join = (...args) => {
      scans++;
      return Array.prototype.join.apply(row, args);
    };
  for (let i = 0; i < 30; i++) {
    const npc = actor(`load-${i}`, `Load ${i}`, i + 1);
    Object.assign(npc, {
      x: 20 + (i % 10) * 0.65,
      y: 20 + Math.floor(i / 10) * 0.65,
    });
    g.survivors.push(npc);
  }
  beginPhysics(g);
  finishPhysics(g, 1 / 30);
  assert.equal(scans, 34);
  a.y = 12.5;
  f.tiles[12][11] = 1;
  for (let i = 0; i < 30; i++) {
    beginPhysics(g);
    physicsMove(g, a, 0.1, 0);
    finishPhysics(g, 1 / 30);
  }
  assert.ok(a.x < 10.8, "a newly added wall actually blocks the body");
  assert.equal(scans, 34 * 31);
});
test("same-direction NPC traffic follows its lane instead of orbiting the next body", () => {
  const { g, a } = scene();
  const people = [
    a,
    actor("follower-1", "One", 1),
    actor("follower-2", "Two", 2),
  ];
  g.survivors = people;
  people.forEach((p, i) =>
    Object.assign(p, {
      x: 10 + i * 0.75,
      y: 12,
      heading: { x: 1, y: 0 },
      activity: "exploring",
    }),
  );
  for (let i = 0; i < 90; i++) {
    g.time += 1 / 30;
    beginPhysics(g);
    for (const p of people) physicsMove(g, p, 0.08, 0, true);
    finishPhysics(g, 1 / 30);
    for (const p of people) {
      assert.ok(
        Math.abs(p.y - 12) < 0.025,
        "followers retain the forward lane",
      );
      for (const other of people)
        if (p !== other)
          assert.ok(distance(p, other) >= 2 * BODY_RADIUS - 0.025);
    }
  }
  assert.ok(
    people.every((p) => p.x > 16),
    "the queue makes real forward progress",
  );
});
test("a body beside a route does not trigger an unnecessary circular detour", () => {
  const { g, a } = scene();
  const b = actor("bystander", "Bystander", 1);
  Object.assign(b, { x: 10.4, y: 12.8, activity: "waiting" });
  Object.assign(a, { heading: { x: 1, y: 0 } });
  g.survivors.push(b);
  beginPhysics(g);
  physicsMove(g, a, 0.08, 0, true);
  finishPhysics(g, 1 / 30);
  assert.ok(a.x > 10.07);
  assert.ok(Math.abs(a.y - 12) < 0.001);
});
test("the reported opening seed clears the physical entrance without a circling arrival pile", () => {
  const g = createGame(4089087021, roadmap);
  g.status = "playing";
  for (let i = 0; i < 126; i++) step(g, 1 / 30);
  assert.equal(g.zombies.length, 0);
  assert.ok(g.survivors.slice(1).filter((a) => a.y < 28).length >= 16);
  for (const a of g.survivors)
    for (const b of g.survivors)
      if (a !== b && a.floor === b.floor)
        assert.ok(distance(a, b) >= 2 * BODY_RADIUS - 0.025);
});
test("an idle player facing the same direction is not mistaken for moving traffic", () => {
  const { g, a } = scene();
  const b = actor("idle-player", "Idle", 1);
  Object.assign(b, { x: 10.6, y: 12, heading: { x: 1, y: 0 } });
  Object.assign(a, { heading: { x: 1, y: 0 }, activity: "exploring" });
  g.survivors.push(b);
  beginPhysics(g);
  physicsMove(g, a, 0.08, 0, true);
  finishPhysics(g, 1 / 30);
  assert.ok(
    a.y > 12.02,
    "the NPC moves around the idle body instead of queueing behind it",
  );
  assert.ok(distance(a, b) >= 2 * BODY_RADIUS - 0.025);
});
