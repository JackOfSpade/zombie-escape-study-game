import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  claimStation,
  human,
  nearestStation,
  releaseStation,
  step,
  takeLoot,
  toggleDoor,
} from "../src/engine";
import { type Floor, type Furniture, type Roadmap } from "../src/model";
import { decode, encode } from "../src/persistence";
import { canPlace } from "../src/spatial";
import {
  canSee,
  playerCanSee,
  rayDistance,
  sightRadius,
  visibilityPolygon,
  VISION,
} from "../src/visibility";
import { createGame } from "../src/world";
const r = JSON.parse(readFileSync("public/curriculum.json", "utf8")) as Roadmap;
const empty = (): Floor => ({
  index: 0,
  tiles: Array.from({ length: 34 }, (_, y) =>
    Array.from({ length: 44 }, (_, x) =>
      x === 0 || x === 43 || y === 0 || y === 33 ? 1 : 0,
    ),
  ),
  furniture: [],
  stations: [],
  dark: 0,
  name: "sight fixture",
  doors: [],
  stairs: { x: 22, y: 3 },
  entry: { x: 22, y: 30 },
});
const barrier = (kind: Furniture["kind"] = "door"): Furniture => ({
  id: "blocker",
  kind,
  x: 20.5,
  y: 15.5,
  floor: 0,
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
});
test("nearby terminals and loot cannot be used through walls or closed opaque cover", () => {
  const g = createGame(2, r),
    a = human(g),
    f = empty();
  g.floors[0] = f;
  a.x = 19.7;
  a.y = 15.5;
  const e = Object.values(g.encounters).find((e) => e.reward === "loot")!;
  f.stations = [{ id: "hidden-station", x: 21.3, y: 15.5, encounter: e.id }];
  e.state = "consumed";
  e.contributors = [a.id];
  const item = e.loot[0];
  assert.ok(item);
  f.tiles[15][20] = 1;
  assert.equal(nearestStation(g, a), undefined);
  assert.equal(claimStation(g, a, "hidden-station"), false);
  assert.equal(takeLoot(g, a, e.id, item.id), false);
  f.tiles[15][20] = 0;
  const door = { ...barrier(), w: 0.15 };
  f.furniture = [door];
  assert.equal(nearestStation(g, a), undefined);
  assert.equal(claimStation(g, a, "hidden-station"), false);
  assert.equal(takeLoot(g, a, e.id, item.id), false);
  door.open = true;
  assert.equal(nearestStation(g, a)?.id, "hidden-station");
  assert.equal(claimStation(g, a, "hidden-station"), true);
  assert.equal(takeLoot(g, a, e.id, item.id), true);
});
test("finite 360-degree sight: all angles visible in open space, range never infinite", () => {
  const f = empty(),
    a = { x: 22, y: 17 };
  for (let i = 0; i < 720; i++) {
    const angle = (i / 720) * Math.PI * 2;
    assert.equal(
      canSee(
        f,
        a,
        { x: a.x + Math.cos(angle) * 6, y: a.y + Math.sin(angle) * 6 },
        8,
      ),
      true,
    );
    assert.equal(
      canSee(
        f,
        a,
        { x: a.x + Math.cos(angle) * 8.1, y: a.y + Math.sin(angle) * 8.1 },
        8,
      ),
      false,
    );
  }
  assert.equal(visibilityPolygon(f, a, 8).length, 512);
  for (const p of visibilityPolygon(f, a, 8))
    assert.ok(Math.hypot(p.x - a.x, p.y - a.y) <= 8.000001);
});
test("actor perception and physical reach: walls and closed doors occlude; opening and destruction restore only actual sight paths", () => {
  const f = empty(),
    a = { x: 17.5, y: 15.5 },
    target = { x: 24.5, y: 15.5 };
  for (let y = 1; y < 33; y++) f.tiles[y][20] = 1;
  assert.equal(canSee(f, a, target), false);
  for (let y = 14; y <= 16; y++) f.tiles[y][20] = 0;
  const door = barrier();
  f.furniture = [door];
  assert.equal(canSee(f, a, target), false);
  assert.equal(rayDistance(f, a, 0, 11), 2.5);
  assert.equal(
    canSee(f, a, door, 11, door.id),
    true,
    "Blocking surface itself can be inspected",
  );
  door.open = true;
  assert.equal(canSee(f, a, target), true);
  door.open = false;
  door.destroyed = true;
  assert.equal(canSee(f, a, target), true);
  f.tiles[15][23] = 1;
  assert.equal(
    canSee(f, a, target),
    false,
    "A breached door does not reveal through the next wall",
  );
});
test("opaque furniture shadows use orientation and disappear when moved/broken", () => {
  const f = empty(),
    a = { x: 17.5, y: 15.5 },
    target = { x: 24.5, y: 15.5 },
    shelf = barrier("shelf");
  f.furniture = [shelf];
  assert.equal(canSee(f, a, target), false);
  shelf.y = 20;
  assert.equal(canSee(f, a, target), true);
  shelf.y = 15.5;
  shelf.destroyed = true;
  assert.equal(canSee(f, a, target), true);
});
test("dim/dark radii remain bounded; saved normal/Surge geometry gives identical visibility", () => {
  const g = createGame(300, r),
    a = human(g),
    f = g.floors[0];
  a.x = 21.5;
  a.y = 15.5;
  const targets = [
    { x: 21.5, y: 20.5 },
    { x: 5.5, y: 5.5 },
    { x: 28.5, y: 15.5 },
  ];
  const before = targets.map((p) => canSee(f, a, p));
  g.surge.state = "active";
  const restored = decode(encode(g));
  assert.deepEqual(
    targets.map((p) => canSee(restored.floors[0], restored.survivors[0], p)),
    before,
  );
  f.dark = 0.5;
  assert.equal(sightRadius(f), VISION.dim);
  f.dark = 0.95;
  assert.equal(sightRadius(f), VISION.dark);
  assert.ok(sightRadius(f) <= VISION.max);
});
test("E releases a door latch without moving its leaf or closing through an occupant", () => {
  const g = createGame(1, r);
  g.floors[0] = empty();
  const a = human(g),
    door = barrier();
  g.floors[0].furniture = [door];
  a.x = 19;
  a.y = 15.5;
  assert.equal(toggleDoor(g, a, door.id), true);
  assert.equal(door.open, true);
  assert.equal(door.angle, 0, "unlatching does not move the leaf");
  a.x = 20.5;
  assert.equal(toggleDoor(g, a, door.id), true);
  assert.equal(door.open, true);
  assert.equal(door.door!.latched, false);
  assert.equal(
    toggleDoor(g, a, door.id, false),
    false,
    "closing requires physical contact",
  );
  assert.equal(door.angle, 0);
  a.x = 10;
  assert.equal(toggleDoor(g, a, door.id), false);
});
test("physical station occupancy protects both human and NPC seats", () => {
  const g = createGame(2, r),
    s = g.floors[0].stations[0],
    a = human(g),
    b = g.survivors[1];
  for (const actor of [a, b]) {
    actor.x = s.x;
    actor.y = s.y;
  }
  assert.equal(claimStation(g, a, s.id), true);
  assert.equal(claimStation(g, b, s.id), false);
  releaseStation(a);
  assert.equal(claimStation(g, b, s.id), true);
  assert.equal(claimStation(g, a, s.id), false);
});
test("zombie stair traversal takes causal time and waits for the landing", () => {
  const g = createGame(3, r);
  g.status = "playing";
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  human(g).escaped = true;
  g.survivors = g.survivors.slice(0, 1);
  const start = g.floors[0].stairs;
  g.zombies = [
    {
      id: "traveler",
      ...start,
      floor: 0,
      hp: 60,
      path: [],
      repath: 100,
      cooldown: 0,
      memory: 0,
      stagger: 0,
      origin: "outside",
    },
  ];
  step(g, 0.1);
  assert.equal(g.zombies[0].floor, 0);
  assert.ok(g.zombies[0].stairUntil! > g.time);
  for (let i = 0; i < 15; i++) step(g, 0.1);
  assert.equal(g.zombies[0].floor, 0);
  for (let i = 0; i < 10; i++) step(g, 0.1);
  assert.equal(g.zombies[0].floor, 1);
  assert.ok(g.events.some((e) => e.type === "horde-stairs"));
});

test("generation never overlaps furniture or embeds its initial footprint in walls", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const g = createGame(seed, r);
    for (const floor of g.floors)
      for (const object of floor.furniture) {
        assert.ok(
          canPlace(floor, object, object),
          `Invalid initial furniture ${object.id}, seed=${seed}`,
        );
      }
  }
});

test("solo stations are distinct one-use encounters with capacity for the survivor population", () => {
  const g = createGame(123, r);
  for (const f of g.floors.slice(0, 4)) {
    const solo = f.stations.filter(
      (s) => g.encounters[s.encounter].mode === "solo",
    );
    assert.equal(new Set(solo.map((s) => s.encounter)).size, solo.length);
    const stairSolo = solo.filter(
      (s) => g.encounters[s.encounter].reward === "stairs",
    );
    assert.equal(stairSolo.length, g.survivors.length - 2);
    const [a, b] = stairSolo.map((s) => g.encounters[s.encounter]);
    a.workspace = "private draft";
    assert.equal(b.workspace, "");
  }
});

test("player sight and light pass through all furniture, closed doors and gates while actual walls still occlude", () => {
  const f = empty(),
    origin = { x: 17.5, y: 15.5 },
    target = { x: 24.5, y: 15.5 };
  for (const kind of [
    "door",
    "gate",
    "shelf",
    "fridge",
    "chair",
    "desk",
    "sofa",
  ] as const) {
    f.furniture = [barrier(kind)];
    assert.equal(playerCanSee(f, origin, target), true, kind);
    assert.ok(
      visibilityPolygon(f, origin, 11).some(
        (p) => p.x > target.x && Math.abs(p.y - target.y) < 0.1,
      ),
      kind,
    );
    f.tiles[15][23] = 1;
    assert.equal(playerCanSee(f, origin, target), false, kind);
    f.tiles[15][23] = 0;
  }
  const g = createGame(2, r),
    a = human(g);
  g.floors[0] = f;
  Object.assign(a, { x: 19.7, y: 15.5 });
  const e = Object.values(g.encounters)[0];
  f.stations = [
    { id: "visible-but-blocked", x: 21.3, y: 15.5, encounter: e.id },
  ];
  f.furniture = [{ ...barrier(), w: 0.15 }];
  assert.equal(playerCanSee(f, a, f.stations[0]), true);
  assert.equal(claimStation(g, a, "visible-but-blocked"), false);
});
test("player's wall-only view keeps finite 360-degree range in normal and dark light", () => {
  const f = empty(),
    origin = { x: 22, y: 17 };
  f.furniture = [barrier("fridge")];
  for (const dark of [0, 0.5, 0.95]) {
    f.dark = dark;
    const radius = sightRadius(f);
    for (let i = 0; i < 64; i++) {
      const angle = (i * Math.PI) / 32;
      assert.equal(
        playerCanSee(f, origin, {
          x: origin.x + Math.cos(angle) * (radius - 0.2),
          y: origin.y + Math.sin(angle) * (radius - 0.2),
        }),
        true,
      );
      assert.equal(
        playerCanSee(f, origin, {
          x: origin.x + Math.cos(angle) * (radius + 0.2),
          y: origin.y + Math.sin(angle) * (radius + 0.2),
        }),
        false,
      );
    }
  }
});
