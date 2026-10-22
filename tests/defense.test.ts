import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  prepareScenario,
  pushAxis,
  siegeScenario,
  walkTo,
} from "../scripts/lib/defense-scenario";
import { pushFurniture, step, toggleDoor, vault } from "../src/engine";
import { CONFIG, distance, type Furniture, type Roadmap } from "../src/model";
import { survivorPath } from "../src/navigation";
import { decode, encode } from "../src/persistence";
import { canPlace, path, solid } from "../src/spatial";
import { actor, createGame } from "../src/world";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));

test("defense-aware generation: distinct hall plans, an inner one-tile mouth on every ordinary floor, reachable clear terminals and transport staging", () => {
  const layouts = new Set<string>(),
    fingerprints = new Set<string>();
  for (let seed = 0; seed < 12; seed++) {
    const g = createGame(seed, r);
    for (const f of g.floors.slice(0, CONFIG.floors)) {
      layouts.add(f.layout!);
      fingerprints.add(JSON.stringify(f.tiles));
      const annex = f.rooms!.find((room) => room.innerMouth)!;
      assert.ok(annex);
      const mouth = annex.innerMouth!,
        xx = Math.floor(mouth.x),
        yy = Math.floor(mouth.y);
      assert.equal(f.tiles[yy][xx], 0);
      assert.equal(f.tiles[yy - 1][xx], 1);
      assert.equal(f.tiles[yy + 1][xx], 1);
      for (const st of f.stations) {
        assert.equal(solid(f, st), false, `embedded ${st.id} seed ${seed}`);
        assert.ok(
          survivorPath(f, f.entry, st).length,
          `no route ${st.id} seed ${seed}`,
        );
      }
      const fridge = f.furniture.find(
        (o) => o.id === `f${f.index}-corridor-fridge`,
      )!;
      assert.ok(fridge);
      assert.ok(canPlace(f, fridge, fridge));
      assert.ok(f.furniture.filter((o) => o.kind === "shelf").length >= 8);
    }
  }
  assert.deepEqual([...layouts].sort(), ["archive", "gallery", "switchback"]);
  assert.ok(fingerprints.size >= 20);
});
function unit() {
  const g = createGame(11, r);
  g.survivors = g.survivors.slice(0, 1);
  const a = g.survivors[0],
    f = g.floors[0];
  f.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
  const o: Furniture = {
    id: "physical-fixture",
    floor: 0,
    x: 7.5,
    y: 10.5,
    w: 2.8,
    h: 1,
    kind: "shelf",
    hp: 2600,
    maxHp: 2600,
    speed: 0.32,
    rotation: 0,
    destroyed: false,
    movers: [],
    moved: 0,
    credited: [],
    turning: 0,
  };
  f.furniture = [o];
  return { g, a, f, o };
}
test("placement checks the complete footprint, including thin wall overlap; exact edge contact is valid", () => {
  const { f, o } = unit();
  for (let y = 0; y < 34; y++) f.tiles[y][10] = 1;
  assert.equal(canPlace(f, o, { x: 9.91, y: 10.5 }, 0.2, 1), false);
  assert.equal(canPlace(f, o, { x: 9.9, y: 10.5 }, 0.2, 1), true);
  assert.equal(canPlace(f, o, { x: -0.01, y: 10.5 }, 1, 1), false);
});
test("slightly imperfect handling alignment is corrected with bounded physical movement, without shrinking cover or changing HP", () => {
  const { g, a, f, o } = unit();
  for (let x = 10; x < 30; x++) {
    f.tiles[9][x] = 1;
    f.tiles[11][x] = 1;
  }
  o.y = 10.6;
  a.x = 5.55;
  a.y = 10.6;
  for (let i = 0; i < 160; i++) {
    const before = { x: o.x, y: o.y };
    pushFurniture(g, a, 1, 0, 0.1);
    assert.ok(distance(before, o) <= o.speed * 0.1 + 1e-8);
    assert.equal(solid(f, a), false);
  }
  assert.ok(o.x > 11);
  assert.ok(Math.abs(o.y - 10.5) < 1e-7);
  assert.equal(o.h, 1);
  assert.equal(o.hp, 2600);
});
test("pulling cannot leave the body in a wall or continue pulling the object into a blocked handler", () => {
  const { g, a, f, o } = unit();
  for (let y = 0; y < 34; y++) f.tiles[y][10] = 1;
  Object.assign(o, { x: 8.5, w: 1, h: 1, speed: 1 });
  Object.assign(a, { x: 9.75, y: 10.5 });
  for (let i = 0; i < 30; i++) pushFurniture(g, a, 1, 0, 0.1);
  assert.equal(o.x, 8.5);
  assert.equal(a.x, 9.75);
  assert.equal(solid(f, a), false);
});
test("cooperative handling integrates an object once per world tick instead of multiplying displacement by mover count", () => {
  const g = createGame(11, r);
  g.status = "playing";
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.spawned = CONFIG.openingHorde;
  g.nextSpawn = 999999;
  g.survivors = g.survivors.slice(0, 1);
  g.survivors[0].escaped = true;
  const f = g.floors[0],
    o = f.furniture.find((o) => o.id === "f0-room0-shelf5")!;
  for (const [i, offset] of [-1.1, 1.1].entries()) {
    const a = actor(`fixture-${i}`, `mover ${i}`, i);
    Object.assign(a, {
      x: o.x - 1.2,
      y: o.y + offset,
      role: "builder",
      intent: "f0-room0",
      handling: o.id,
    });
    g.survivors.push(a);
  }
  const start = o.x;
  for (let i = 0; i < 10; i++) {
    const before = o.x;
    step(g, 0.1);
    assert.ok(
      o.x - before <= o.speed * 1.9 * 0.1 + 1e-8,
      "motion applied more than once in one tick",
    );
  }
  assert.ok(o.x > start);
  assert.equal(o.hp, o.maxHp);
});

test("camera framing keeps the whole finite 360-degree sight circle in view at a legible scale", async () => {
  const { camera } = await import("../src/camera");
  for (const [width, height] of [
    [732, 748],
    [1032, 748],
    [400, 600],
  ])
    for (const focus of [
      { x: 19.5, y: 30.5 },
      { x: 5.5, y: 6.5 },
    ]) {
      const p = camera(width, height, focus);
      assert.equal(p.ox + focus.x * p.scale, width / 2);
      assert.equal(p.oy + focus.y * p.scale, height / 2);
      for (let i = 0; i < 72; i++) {
        const theta = (i / 72) * 2 * Math.PI,
          x = p.ox + (focus.x + 11 * Math.cos(theta)) * p.scale,
          y = p.oy + (focus.y + 11 * Math.sin(theta)) * p.scale;
        assert.ok(x >= 0 && x <= width && y >= 0 && y <= height);
      }
      assert.ok(p.scale > Math.min(width / 44, height / 34));
    }
});

test("a vault is exposed above its own cover rather than becoming an invulnerability interval", () => {
  const { g, a, o } = unit();
  g.status = "playing";
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.spawned = CONFIG.openingHorde;
  g.nextSpawn = 999999;
  Object.assign(o, { x: 10.5, w: 1, h: 2.8 });
  Object.assign(a, { x: 9.45, y: 10.5, heading: { x: 1, y: 0 } });
  g.zombies = [
    {
      id: "contact",
      x: 9.7,
      y: 10.5,
      floor: 0,
      hp: 60,
      path: [],
      repath: 0,
      cooldown: 0.4,
      memory: 0,
      stagger: 0,
      origin: "outside",
    },
  ];
  assert.equal(vault(g, a), true);
  for (let i = 0; i < 6; i++) step(g, 0.1);
  assert.ok(a.vault, "still crossing the obstacle");
  assert.ok(a.hp < 100, "a nearby attacker can strike the raised survivor");
});
test("a zombie occupying the intended landing prevents a fake successful vault", () => {
  const { g, a, o } = unit();
  Object.assign(o, { x: 10.5, w: 1, h: 2.8 });
  Object.assign(a, { x: 9.45, y: 10.5, heading: { x: 1, y: 0 } });
  g.zombies = [
    {
      id: "occupied-landing",
      x: 11.55,
      y: 10.5,
      floor: 0,
      hp: 60,
      path: [],
      repath: 0,
      cooldown: 0,
      memory: 0,
      stagger: 0,
      origin: "outside",
    },
  ];
  assert.equal(vault(g, a), false);
  assert.equal(a.vault, undefined);
});

test("ordinary layered preparation uses running survival and real handlers, reaches the terminal, and preserves physical state across a backup", () => {
  const s = prepareScenario(r, 2, "layered", 0.06),
    g = s.g,
    a = g.survivors[0];
  assert.ok(s.preparationSeconds > 60 && s.preparationSeconds < 150);
  assert.ok(a.station);
  assert.equal(a.hp, 100);
  assert.ok(g.spawned > 0);
  assert.ok(g.zombies.every((z) => z.origin === "outside"));
  assert.ok(g.floors[0].furniture.filter((o) => o.moved > 0.8).length >= 3);
  assert.deepEqual(
    g.floors.map((f) => f.tiles),
    createGame(2, r).floors.map((f) => f.tiles),
    "preparation cannot rewrite geometry",
  );
  const saved = encode(g),
    copy = decode(saved);
  assert.equal(encode(copy), saved);
  assert.deepEqual(copy.floors[0].rooms, g.floors[0].rooms);
  assert.equal(copy.study.learner!.evidence.length, 0);
  assert.equal(copy.study.learner!.attempts.length, 0);
  assert.equal(
    copy.study.visits.length,
    0,
    "physical preparation awards no study visit",
  );
});

test("NPC thought continues at a reduced rate while physically vaulting instead of stopping with the animation", () => {
  const { g, a, o } = unit();
  g.status = "playing";
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.spawned = CONFIG.openingHorde;
  g.nextSpawn = 999999;
  a.escaped = true;
  Object.assign(o, { x: 10.5, w: 1, h: 2.8 });
  const npc = actor("thinking-mover", "fixture", 1);
  Object.assign(npc, {
    x: 9.45,
    y: 10.5,
    heading: { x: 1, y: 0 },
    intent: "f0-room1",
    thought: 0,
  });
  g.survivors.push(npc);
  assert.equal(vault(g, npc), true);
  for (let i = 0; i < 8; i++) step(g, 0.1);
  assert.ok(npc.vault);
  assert.ok(npc.thought > 0);
  assert.ok(npc.thought < 0.8 * (0.65 + npc.skill * 0.7));
  assert.equal(g.study.learner!.evidence.length, 0);
});

test("an NPC already at an available helicopter boards instead of fleeing away from its escape", () => {
  const g = createGame(11, r);
  g.status = "playing";
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.spawned = CONFIG.openingHorde;
  g.nextSpawn = 999999;
  g.survivors = g.survivors.slice(0, 2);
  g.survivors[0].escaped = true;
  const a = g.survivors[1];
  Object.assign(a, {
    floor: CONFIG.floors,
    x: 21.5,
    y: 10.5,
    handling: "old-cover",
  });
  g.helicopter.until = 20;
  g.helicopter.trip = 1;
  g.helicopter.next = 100;
  g.zombies = [
    {
      id: "roof-threat",
      floor: CONFIG.floors,
      x: 22.3,
      y: 10.5,
      hp: 60,
      path: [],
      repath: 0,
      cooldown: 0,
      memory: 0,
      stagger: 0,
      origin: "outside",
    },
  ];
  step(g, 0.1);
  assert.equal(a.escaped, true);
  assert.equal(a.handling, undefined);
  assert.equal(g.stats.rescued, 1);
  assert.equal(g.study.learner!.evidence.length, 0);
});

test("navigation caching preserves exact cold routes, copies mutable results, and invalidates doors, furniture and wall changes", () => {
  const { f, o } = unit();
  f.tiles = Array.from({ length: 34 }, () => Array(44).fill(1));
  for (let y = 1; y < 33; y++) f.tiles[y][20] = 0;
  Object.assign(o, { kind: "door", x: 20.5, y: 15.5, w: 1, h: 1, open: false });
  const from = { x: 20.5, y: 30.5 },
    to = { x: 20.5, y: 3.5 };
  assert.deepEqual(path(f, from, to), []);
  o.open = true;
  const first = path(f, from, to),
    expected = structuredClone(first);
  assert.ok(first.length);
  first[0].x = 0;
  first.shift();
  assert.deepEqual(path(f, from, to), expected);
  assert.deepEqual(path(f, from, to), path(structuredClone(f), from, to));
  o.open = false;
  assert.deepEqual(path(f, from, to), []);
  assert.ok(path(f, from, to, true).length);
  o.x = 25.5;
  assert.ok(path(f, from, to).length);
  f.tiles[20][20] = 1;
  assert.deepEqual(path(f, from, to), []);
});

test("a packed horde can pass an open one-tile mouth instead of forming a permanent collision arch", () => {
  const { g, a, f } = unit();
  g.status = "playing";
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.spawned = CONFIG.openingHorde;
  g.nextSpawn = 999999;
  f.furniture = [];
  for (let y = 0; y < 34; y++) f.tiles[y][20] = y === 15 ? 0 : 1;
  Object.assign(a, { x: 15.5, y: 15.5, speed: 0 });
  g.zombies = Array.from({ length: 24 }, (_, i) => ({
    id: `z${i}`,
    x: 21.6 + (i % 4) * 0.5,
    y: 13.3 + Math.floor(i / 4) * 0.5,
    floor: 0,
    hp: 60,
    path: [],
    repath: 0,
    cooldown: 0,
    memory: 999999,
    stagger: 0,
    origin: "outside" as const,
    target: { x: a.x, y: a.y },
  }));
  for (let i = 0; i < 900 && a.hp === 100; i++) step(g, 1 / 30);
  assert.ok(a.hp < 100, "open passage must continue to transmit pressure");
});
test("the captured switchback crowd jam resumes physical pursuit without teleporting or changing geometry", () => {
  const fixture = JSON.parse(
      readFileSync("tests/fixtures/entrance-crowd.json", "utf8"),
    ),
    g = createGame(fixture.seed, r);
  g.status = "playing";
  g.survivors = g.survivors.slice(0, 1);
  Object.assign(g.survivors[0], fixture.player);
  g.floors[0] = fixture.floor;
  g.zombies = fixture.zombies;
  g.rng = fixture.rng;
  g.time = fixture.time;
  g.surge = fixture.surge;
  g.helicopter = fixture.helicopter;
  g.spawned = 90;
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  const tiles = JSON.stringify(g.floors[0].tiles),
    a = g.survivors[0];
  for (let i = 0; i < 1200 && a.hp === 100; i++) {
    const before = g.zombies.map((z) => ({ ...z }));
    step(g, 1 / 30);
    for (let j = 0; j < g.zombies.length; j++)
      assert.ok(
        distance(before[j], g.zombies[j]) <=
          4 / 30 +
            Math.max(
              0,
              ...before
                .filter((z, k) => k !== j && z.floor === before[j].floor)
                .map((z) => 0.52 - distance(z, before[j])),
            ) +
            0.03,
        JSON.stringify({
          reason: "bounded native crowd recovery",
          frame: i,
          id: g.zombies[j].id,
          before: before[j],
          after: g.zombies[j],
          delta: distance(before[j], g.zombies[j]),
          overlap: Math.max(
            0,
            ...before
              .filter((z, k) => k !== j && z.floor === before[j].floor)
              .map((z) => 0.52 - distance(z, before[j])),
          ),
        }),
      );
  }
  assert.ok(a.hp < 100, "captured live jam must recover");
  assert.equal(JSON.stringify(g.floors[0].tiles), tiles);
});

test("an early layered-cover retreat keeps real outside pursuit and cannot bypass living attackers", () => {
  for (const seed of [0, 1, 2]) {
    const { g, room } = prepareScenario(
      r,
      seed,
      "layered",
      [-0.05, 0.04, 0.06][seed],
    );
    const f = g.floors[0],
      a = g.survivors[0],
      sign = room.side === "left" ? -1 : 1;
    const prefix = `f0-room${room.index}`;
    const inner = f.furniture.find((o) => o.id === `${prefix}-shelf5`)!;
    const middle = f.furniture.find((o) => o.id === `${prefix}-shelf0`)!;
    const door = f.furniture.find((o) => o.id === `${prefix}-door`)!;
    const start = g.time,
      spawned = g.spawned;
    const learning = JSON.stringify(g.study);
    // Quiet egress is proved separately. A live dense horde can physically
    // block this no-item route; a genuine contact death is an honest outcome.
    try {
      pushAxis(g, inner, "x", inner.x + sign * 2.3);
      pushAxis(g, middle, "x", middle.x + sign * 0.8);
      walkTo(g, { x: door.x + sign * 1.05, y: door.y });
      assert.equal(toggleDoor(g, a, door.id, true), true);
      walkTo(g, { x: 21.5, y: door.y + 2 });
    } catch (error) {
      if (g.status !== "dead") throw error;
      assert.match(String(error), /Human lost/);
    }
    if (a.alive) {
      assert.ok(
        a.x >= 17 && a.x <= 27,
        "the living survivor actually reaches the hallway",
      );
      assert.ok(g.time < start + 60);
      assert.equal(solid(f, a), false);
    } else {
      assert.equal(g.status, "dead");
      assert.ok(a.hp <= 0);
      assert.ok(
        g.events.some((e) => e.at > start && e.type === "survivor-hit"),
      );
      assert.ok(
        g.zombies.some(
          (z) => z.hp > 0 && z.floor === a.floor && distance(z, a) < 0.95,
        ),
        "combat death requires an actual nearby attacker",
      );
    }
    assert.ok(g.spawned >= spawned);
    assert.ok(g.events.some((e) => e.at > start && e.type === "vault"));
    assert.equal(JSON.stringify(g.study), learning);
  }
});

test("the defense benchmark rejects quiet survival without continued horde pressure", () => {
  const scenario = prepareScenario(r, 0, "door");
  // An intentionally invalid siege: the exterior never attacks. Surviving
  // this cannot be accepted as evidence of durable room defense.
  scenario.g.zombies = [];
  scenario.g.nextSpawn = Number.MAX_SAFE_INTEGER;
  const report = siegeScenario(scenario, 50);
  assert.equal(report.alive, true);
  assert.equal(report.pressureContinuous, false);
  assert.ok(report.maxAttackGapSeconds >= 49.99);
});

test("long-study pressure on unrelated room furniture cannot certify pressure on the prepared study defenses", () => {
  const scenario = prepareScenario(r, 0, "door"),
    { g } = scenario;
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.spawned = CONFIG.openingHorde;
  g.nextSpawn = 999999;
  g.zombies = [
    {
      id: "isolated-wrong-room-pursuer",
      floor: 0,
      x: 34.5,
      y: 20.5,
      hp: 60,
      path: [],
      repath: 0,
      cooldown: 0,
      memory: 0,
      stagger: 0,
      origin: "outside",
    },
  ];
  const unrelated = g.floors[0].furniture.filter((o) =>
    o.id.startsWith("f0-room3-"),
  );
  for (const o of unrelated) {
    o.hp = 1000;
    o.maxHp = 1000;
    o.moved = 1;
  }
  const cover = unrelated.find((o) => o.kind === "fridge")!;
  // A finite, local audible cue supplies actual pressure on the unrelated
  // defense; it does not reveal the hidden human or prepared room.
  g.effects.push({
    kind: "decoy",
    floor: 0,
    x: cover.x,
    y: cover.y - cover.h / 2 - 0.3,
    radius: 10,
    until: g.time + 20,
  });
  const before = unrelated.reduce((n, o) => n + o.hp, 0);
  const report = siegeScenario(scenario, 50);
  assert.ok(
    unrelated.reduce((n, o) => n + o.hp, 0) < before,
    "the isolated pursuer must actually damage unrelated room cover",
  );
  assert.equal(
    report.pressureContinuous,
    true,
    "the old floor-wide criterion would incorrectly accept this run",
  );
  assert.ok(report.maxDefenseAttackGapSeconds >= 49.99);
  assert.equal(report.defensePressureContinuous, false);
  assert.ok(report.maximumSimulationStepSeconds <= 1 / 30);
  assert.equal(report.humanEvidence, 0);
  assert.equal(report.humanVisits, 0);
  assert.ok(report.usableStationarySeconds >= 49.99);
});

test("natural pursuit retains a visible NPC target instead of injecting the hidden human's coordinates or infinite memory", () => {
  const g = createGame(0, r),
    f = g.floors[0],
    a = g.survivors[0],
    b = actor("visible-npc", "Visible", 2);
  g.status = "playing";
  g.nextSpawn = 999999;
  g.spawned = CONFIG.openingHorde;
  g.nextSpawn = 999999;
  g.surge.anchor = 999999;
  f.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
  for (let y = 0; y < 34; y++) f.tiles[y][10] = 1;
  f.furniture = [];
  Object.assign(a, { x: 5.5, y: 6.5 });
  Object.assign(b, { x: 16.5, y: 10.5 });
  g.survivors = [a, b];
  g.zombies = [
    {
      id: "natural-visibility-fixture",
      floor: 0,
      x: 17.5,
      y: 10.5,
      hp: 60,
      path: [],
      repath: 0,
      cooldown: 10,
      memory: 0,
      stagger: 0,
      origin: "outside",
    },
  ];
  const scenario = {
    g,
    room: f.rooms![0],
    population: "full" as const,
    preparationSeconds: 0,
    preparationSteps: { count: 0, maximum: 0 },
    policy: "door" as const,
    jitter: 0,
  };
  const report = siegeScenario(scenario, 0.3, 1 / 30, { pursuit: "natural" });
  assert.ok(g.zombies[0].target);
  assert.ok(g.zombies[0].target!.x > 10);
  assert.ok(Number.isFinite(g.zombies[0].memory));
  assert.ok(distance(g.zombies[0].target!, b) < 1);
  assert.ok(report.mode.includes("natural pursuit"));
  assert.equal(g.study.learner!.evidence.length, 0);
});
