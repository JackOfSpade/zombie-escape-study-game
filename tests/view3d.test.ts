import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { human } from "../src/engine";
import {
  BufferGeometry,
  Fog,
  Group,
  Mesh,
  MeshStandardMaterial,
  Raycaster,
  Vector3,
} from "three";
import { FirstPersonView } from "../src/view3d/scene";
import { lootSlot } from "../src/view3d/targeting";
import { playerCanSee } from "../src/visibility";
import type { Actor, Game, Point, Roadmap, Zombie } from "../src/model";
import { createGame } from "../src/world";
import { geometrySignature, wallRectangles } from "../src/view3d/geometry";
import {
  clampPitch,
  lookDirection,
  MAX_PITCH,
  movementInput,
} from "../src/view3d/math";
import { visibleActors } from "../src/view3d/visibility";

function near(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
}
function point(actual: Point, expected: Point) {
  near(actual.x, expected.x);
  near(actual.y, expected.y);
}

test("view direction maps world east/south/west/north into Y-up 3D", () => {
  for (const [yaw, x, z] of [
    [0, 1, 0],
    [Math.PI / 2, 0, 1],
    [Math.PI, -1, 0],
    [-Math.PI / 2, 0, -1],
    [Math.PI * 2, 1, 0],
  ]) {
    const direction = lookDirection(yaw, 0);
    near(direction.x, x);
    near(direction.y, 0);
    near(direction.z, z);
  }
});
test("positive pitch looks up and view direction remains normalized", () => {
  for (const yaw of [-7, -Math.PI, 0, 1.2, Math.PI * 4])
    for (const pitch of [-MAX_PITCH, -0.4, 0, 0.6, MAX_PITCH]) {
      const direction = lookDirection(yaw, pitch);
      near(Math.hypot(direction.x, direction.y, direction.z), 1);
      near(direction.y, Math.sin(pitch));
      near(
        Math.atan2(direction.y, Math.hypot(direction.x, direction.z)),
        pitch,
      );
    }
});
test("pitch clamps at 85 degrees without flipping the horizontal direction", () => {
  assert.equal(clampPitch(100), MAX_PITCH);
  assert.equal(clampPitch(-100), -MAX_PITCH);
  assert.equal(clampPitch(0.5), 0.5);
  assert.deepEqual(lookDirection(0, Math.PI), lookDirection(0, MAX_PITCH));
  assert.deepEqual(lookDirection(0, -Math.PI), lookDirection(0, -MAX_PITCH));
  assert.ok(lookDirection(0, MAX_PITCH).x > 0);
});
test("forward/back/strafe input follows the camera's yaw on the floor", () => {
  point(movementInput(0, 0, 1), { x: 1, y: 0 });
  point(movementInput(0, 0, -1), { x: -1, y: 0 });
  point(movementInput(0, 1, 0), { x: 0, y: 1 });
  point(movementInput(0, -1, 0), { x: 0, y: -1 });
  point(movementInput(Math.PI / 2, 0, 1), { x: 0, y: 1 });
  point(movementInput(Math.PI / 2, 1, 0), { x: -1, y: 0 });
  point(movementInput(-Math.PI / 2, 0, 1), { x: 0, y: -1 });
  point(movementInput(-Math.PI / 2, -1, 0), { x: -1, y: 0 });
});
test("diagonal movement has no speed boost at any yaw", () => {
  for (const yaw of [-9, -1, 0, 0.5, 1, Math.PI, 8])
    for (const right of [-1, 1])
      for (const forward of [-1, 1]) {
        const input = movementInput(yaw, right, forward),
          expectedYaw = yaw + Math.atan2(right, forward);
        near(Math.hypot(input.x, input.y), 1);
        near(input.x, Math.cos(expectedYaw));
        near(input.y, Math.sin(expectedYaw));
      }
});
test("zero/cancelled input stays still, and partial input retains its strength", () => {
  point(movementInput(1.2, 0, 0), { x: 0, y: 0 });
  point(movementInput(0, 0.3, 0.4), { x: 0.4, y: 0.3 });
  point(movementInput(Math.PI * 2, 0, 1), { x: 1, y: 0 });
});

function exactWalls(tiles: number[][]) {
  const before = structuredClone(tiles),
    rectangles = wallRectangles(tiles),
    cells = tiles.map((row) => row.map(() => 0));
  for (const rectangle of rectangles) {
    assert.ok(Number.isInteger(rectangle.x) && Number.isInteger(rectangle.y));
    assert.ok(rectangle.w >= 1 && rectangle.h >= 1);
    for (let y = rectangle.y; y < rectangle.y + rectangle.h; y++)
      for (let x = rectangle.x; x < rectangle.x + rectangle.w; x++) {
        assert.notEqual(tiles[y]?.[x], undefined, "rectangle stays in the map");
        cells[y][x]++;
      }
  }
  assert.deepEqual(
    cells,
    tiles.map((row) => row.map((tile) => (tile === 0 ? 0 : 1))),
    "each wall cell is covered once; walkable cells remain empty",
  );
  assert.deepEqual(tiles, before);
  return rectangles;
}
test("wall extraction merges a solid block into one metre-aligned rectangle", () => {
  assert.deepEqual(
    exactWalls([
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 1, 1, 0],
    ]),
    [{ x: 1, y: 1, w: 2, h: 3 }],
  );
});
test("wall extraction preserves doors, holes and disconnected wall islands", () => {
  const tiles = [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 0, 0, 0, 1, 1],
  ];
  const rectangles = exactWalls(tiles);
  assert.ok(rectangles.length < tiles.flat().filter(Boolean).length);
});
test("wall extraction handles empty/non-square maps and every nonzero wall type", () => {
  assert.deepEqual(exactWalls([]), []);
  assert.deepEqual(exactWalls([[], []]), []);
  assert.deepEqual(exactWalls([[0, 0, 0]]), []);
  assert.deepEqual(exactWalls([[2, -1, 1]]), [{ x: 0, y: 0, w: 3, h: 1 }]);
  exactWalls([[1, 0, 1], [1], [], [0, 1]]);
});
test("wall extraction exactly covers varied deterministic floor masks", () => {
  for (let seed = 1; seed <= 40; seed++) {
    let state = seed;
    const tiles = Array.from({ length: 34 }, () =>
      Array.from({ length: 44 }, () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 0x1_0000_0000 < 0.35 ? 1 : 0;
      }),
    );
    exactWalls(tiles);
  }
});
test("geometry signatures follow wall values rather than array identity", () => {
  const tiles = [
      [0, 1, 0],
      [1, 0, 1],
    ],
    original = geometrySignature(tiles);
  assert.equal(geometrySignature(structuredClone(tiles)), original);
  tiles[0][0] = 1;
  assert.notEqual(geometrySignature(tiles), original);
  tiles[0][0] = 0;
  assert.equal(geometrySignature(tiles), original);
  tiles[0][1] = 2;
  assert.equal(geometrySignature(tiles), original, "same solid geometry");
  assert.notEqual(
    geometrySignature([[0, 1], [1]]),
    geometrySignature([[0], [1, 1]]),
  );
  assert.notEqual(geometrySignature([]), geometrySignature([[]]));
});

const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
function sightGame() {
  const game = createGame(3, roadmap),
    player = human(game),
    floor = game.floors[0];
  player.x = 22;
  player.y = 17;
  player.floor = 0;
  floor.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
  floor.furniture = [];
  floor.dark = 0;
  game.survivors = [player];
  game.zombies = [];
  return game;
}
function survivor(game: Game, id: string, x: number, y: number): Actor {
  const actor = { ...human(game), id, x, y };
  game.survivors.push(actor);
  return actor;
}
function zombie(game: Game, id: string, x: number, y: number): Zombie {
  const actor: Zombie = {
    id,
    x,
    y,
    floor: 0,
    hp: 100,
    path: [],
    repath: 0,
    cooldown: 0,
    memory: 0,
    stagger: 0,
    origin: "outside",
  };
  game.zombies.push(actor);
  return actor;
}
test("visible actor filtering excludes self, dead/escaped actors and other floors", () => {
  const game = sightGame(),
    npc = survivor(game, "near", 23, 17),
    undead = zombie(game, "near-zombie", 21, 17);
  survivor(game, "dead", 22, 18).alive = false;
  survivor(game, "escaped", 22, 18).escaped = true;
  survivor(game, "upstairs", 22, 18).floor = 1;
  zombie(game, "dead-zombie", 22, 18).hp = 0;
  zombie(game, "upstairs-zombie", 22, 18).floor = 1;
  assert.deepEqual(visibleActors(game), {
    survivors: [npc],
    zombies: [undead],
  });
  assert.equal(
    visibleActors(game).survivors[0],
    npc,
    "stable entity references",
  );
});
test("visibility is finite in all directions and respects the current floor's darkness", () => {
  const game = sightGame(),
    near = survivor(game, "near", 27, 17),
    mid = survivor(game, "mid", 31, 17),
    far = survivor(game, "far", 34, 17),
    nearZombie = zombie(game, "near-zombie", 17, 17),
    midZombie = zombie(game, "mid-zombie", 13, 17),
    farZombie = zombie(game, "far-zombie", 10, 17);
  assert.deepEqual(visibleActors(game), {
    survivors: [near, mid],
    zombies: [nearZombie, midZombie],
  });
  game.floors[0].dark = 0.5;
  assert.deepEqual(visibleActors(game), {
    survivors: [near],
    zombies: [nearZombie],
  });
  game.floors[0].dark = 1;
  near.x = 27.5;
  nearZombie.x = 16.5;
  assert.deepEqual(visibleActors(game), { survivors: [], zombies: [] });
  assert.ok(!visibleActors(game).survivors.includes(far));
  assert.ok(!visibleActors(game).zombies.includes(farZombie));
});
test("actor filtering hides wall-occluded bodies and observes tile edits immediately", () => {
  const game = sightGame(),
    npc = survivor(game, "hidden", 26, 17),
    undead = zombie(game, "hidden-zombie", 26, 17.5);
  for (let y = 0; y < 34; y++) game.floors[0].tiles[y][24] = 1;
  assert.deepEqual(visibleActors(game), { survivors: [], zombies: [] });
  game.floors[0].tiles[17][24] = 0;
  assert.deepEqual(visibleActors(game), {
    survivors: [npc],
    zombies: [undead],
  });
  game.surge.state = "active";
  assert.deepEqual(visibleActors(game), {
    survivors: [npc],
    zombies: [undead],
  });
});
test("player-view filtering retains wall-only sight through closed furniture", () => {
  const game = sightGame(),
    npc = survivor(game, "behind-cover", 26, 17),
    undead = zombie(game, "behind-cover-zombie", 26, 17.5),
    furniture = createGame(3, roadmap).floors[0].furniture[0];
  game.floors[0].furniture = [
    {
      ...furniture,
      kind: "shelf",
      x: 24,
      y: 17,
      w: 1,
      h: 6,
      destroyed: false,
      open: false,
    },
  ];
  const before = JSON.stringify(game);
  assert.deepEqual(visibleActors(game), {
    survivors: [npc],
    zombies: [undead],
  });
  assert.equal(
    JSON.stringify(game),
    before,
    "presentation does not mutate simulation",
  );
});

test("static doors, furniture and stations within fog distance survive centre LOS occlusion; actors do not", () => {
  const game = sightGame(),
    player = human(game),
    floor = game.floors[0],
    source = createGame(3, roadmap).floors[0].furniture[0],
    door = {
      ...source,
      id: "door",
      kind: "door" as const,
      x: 24.5,
      y: 17,
      w: 0.2,
      h: 1,
      destroyed: false,
    },
    desk = {
      ...source,
      id: "desk",
      kind: "desk" as const,
      x: 25.5,
      y: 17,
      w: 2,
      h: 1,
      destroyed: false,
    },
    far = { ...desk, id: "far", x: 40 },
    station = { ...floor.stations[0], x: 25.5, y: 17 },
    drawn: object[] = [];
  floor.furniture = [door, desk, far];
  floor.stations = [station];
  for (let y = 0; y < 34; y++) floor.tiles[y][24] = 1;
  zombie(game, "hidden", 25.5, 17);
  assert.equal(playerCanSee(floor, player, door), false);
  assert.equal(playerCanSee(floor, player, station), false);
  const view = Object.assign(Object.create(FirstPersonView.prototype), {
    frame: 0,
    scene: { fog: new Fog(0, 2, 11) },
    visuals: new Map(),
    markPresent() {},
    furniture(object: object) {
      drawn.push(object);
    },
    station(object: object) {
      drawn.push(object);
    },
    actor(object: object) {
      drawn.push(object);
    },
  });
  view.sync(game, player, floor, {});
  assert.deepEqual(drawn, [door, desk, station]);
});

test("door and field lintels close the wall above fixed frames without filling their passage", () => {
  for (const field of [false, true]) {
    const game = sightGame(),
      floor = game.floors[0],
      source = createGame(3, roadmap).floors[0].furniture[0],
      frame = { x: 22.5, y: 17.5, w: 1, h: 0.2 };
    for (let x = 0; x < 44; x++) floor.tiles[17][x] = x === 22 ? 0 : 1;
    floor.furniture = [
      {
        ...source,
        kind: "door",
        ...frame,
        ...(field
          ? { field: { kind: "red" } }
          : {
              // The moving leaf is away from the opening; architecture follows frame.
              x: 23,
              y: 18,
              door: {
                frame,
                hinge: { x: 22, y: 17.5 },
                latched: false,
                swung: true,
                side: 1,
              },
            }),
      } as any,
    ];
    const staticWorld = new Group(),
      material = new MeshStandardMaterial(),
      view = Object.assign(Object.create(FirstPersonView.prototype), {
        staticWorld,
        clearStatic() {},
        exterior: { build() {} },
        building: { build() {} },
        materials: { wall: material, ceiling: material, stairs: material },
        floorMaterials: new Map(
          ["carpet", "carpetAlt", "lino", "concrete", "roof"].map((finish) => [
            finish,
            material,
          ]),
        ),
        buildPanels() {},
      });
    view.buildStatic(floor);
    staticWorld.updateMatrixWorld(true);
    const walls = staticWorld.getObjectByName("walls") as Mesh<BufferGeometry>;
    assert.ok(walls);
    const above = new Raycaster(
        new Vector3(22.5, 2.65, 15),
        new Vector3(0, 0, 1),
      ),
      passage = new Raycaster(new Vector3(22.5, 2.2, 15), new Vector3(0, 0, 1));
    assert.ok(
      above.intersectObject(walls).length > 0,
      "the lintel closes the upper slot",
    );
    assert.equal(
      passage.intersectObject(walls).length,
      0,
      "the passage itself remains open",
    );
    for (const child of staticWorld.children)
      (child as Mesh<BufferGeometry>).geometry.dispose();
    material.dispose();
  }
});

test("loot meshes rest on the desktop and share its target-slot positions", () => {
  const parts: any[] = [],
    rendered: number[][] = [],
    pool = {
      allocate: () => parts.length,
      set: (...values: number[]) => rendered.push(values),
    },
    view = Object.assign(Object.create(FirstPersonView.prototype), {
      visual: () => ({ parts }),
      pools: { screen: pool, box: pool },
    }),
    station = { x: 15, y: 12 };
  for (let i = 0; i < 8; i++) {
    parts.length = 0;
    rendered.length = 0;
    const slot = lootSlot(station, i, { x: 0, y: 0 });
    view.loot({ kind: "medkit" }, slot, {});
    const [, x, y, z, w, h, d] = rendered[0];
    assert.ok(
      Math.abs(y - h / 2 - 0.81) < 1e-10,
      "box bottom rests on desktop top",
    );
    assert.ok(x - w / 2 >= station.x - 0.49 && x + w / 2 <= station.x + 0.49);
    assert.ok(
      z - d / 2 >= station.y - 0.325 && z + d / 2 <= station.y + 0.325,
      "all loot footprint edges remain supported by the desk",
    );
    assert.equal(x, slot.x);
    assert.equal(z, slot.y);
  }
});
