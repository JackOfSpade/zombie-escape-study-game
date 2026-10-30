import assert from "node:assert/strict";
import test from "node:test";
import {
  createBuildingFootprint,
  footprintTiles,
} from "../src/building-layout";
import {
  cityCollisionBoxes,
  cityRayDistance,
  citySolid,
  cityWall,
  createCityPlan,
  inCityRectangle,
} from "../src/city-layout";
import type { Floor, Game } from "../src/model";
import { buildStairRoute, STAIR_ROUTE_WIDTH } from "../src/stair-route";
import {
  cityBackdrop,
  cityGroundRectangles,
} from "../src/view3d/exterior-layout";

function fixture(seed = 42): Floor {
  const boundary = createBuildingFootprint(seed),
    tiles = footprintTiles(boundary);
  for (let y = boundary.bottom; y < tiles.length; y++)
    for (let x = 18; x < 26; x++)
      if (y > boundary.bottom || (x >= 20 && x < 24)) tiles[y][x] = 0;
  return {
    index: 0,
    boundary,
    tiles,
    furniture: [],
    stations: [],
    dark: 0.1,
    name: "Synthetic city",
    doors: [],
    entry: { x: 22, y: 29 },
    stairs: { x: 22, y: boundary.top - 1 },
  };
}
function overlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return (
    Math.min(a.x + a.w / 2, b.x + b.w / 2) -
      Math.max(a.x - a.w / 2, b.x - b.w / 2) >
      1e-7 &&
    Math.min(a.y + a.h / 2, b.y + b.h / 2) -
      Math.max(a.y - a.h / 2, b.y - b.h / 2) >
      1e-7
  );
}

test("physical city is seeded, persisted data independent of the world random stream", () => {
  const floor = fixture(),
    before = JSON.stringify(floor),
    first = createCityPlan(floor, 42, 297);
  assert.deepEqual(createCityPlan(floor, 42, 297), first);
  assert.notDeepEqual(createCityPlan(floor, 43, 297), first);
  assert.equal(
    JSON.stringify(floor),
    before,
    "planning never edits the authored office",
  );
  floor.city = first;
  const restored = JSON.parse(JSON.stringify(floor)) as Floor;
  assert.deepEqual(
    restored.city,
    first,
    "save/checkpoint data retains the exact neighbourhood",
  );
  for (const p of [
    { x: 22, y: 40 },
    { x: 22, y: 250 },
    { x: -180, y: 46 },
  ])
    assert.equal(cityWall(restored, p.x, p.y), cityWall(floor, p.x, p.y));
});

test("every outward road has a long clear horde approach and an occluded feeder", () => {
  for (let seed = 1; seed <= 48; seed++) {
    const floor = fixture(seed),
      plan = createCityPlan(floor, seed, 297);
    floor.city = plan;
    assert.deepEqual(
      plan.approaches.map((a) => a.id),
      ["south", "west", "east"],
    );
    for (const a of plan.approaches) {
      assert.ok(
        Math.abs(a.length - 333) < 1e-7,
        `seed${seed} ${a.id}: enough physical runway`,
      );
      assert.equal(
        a.points[0].x === a.points[1].x || a.points[0].y === a.points[1].y,
        true,
      );
      assert.ok(
        Math.hypot(
          a.points[0].x - a.points[1].x,
          a.points[0].y - a.points[1].y,
        ) >= 12,
      );
      let measured = 0;
      for (let i = 1; i < a.points.length; i++) {
        const p = a.points[i - 1],
          q = a.points[i],
          length = Math.hypot(q.x - p.x, q.y - p.y);
        measured += length;
        for (let s = 0; s <= length; s += 0.7) {
          const t = s / length,
            x = p.x + (q.x - p.x) * t,
            y = p.y + (q.y - p.y) * t;
          assert.equal(
            cityWall(floor, x, y),
            false,
            `${a.id} clear at${x},${y}`,
          );
          for (const block of plan.obstacles)
            assert.equal(
              inCityRectangle(block, x, y),
              false,
              "route never passes through a natural blocker",
            );
        }
      }
      assert.ok(Math.abs(measured - a.length) < 1e-7);
      assert.ok(
        Math.abs(a.points.at(-1)!.y - (floor.boundary!.bottom + 1.42)) < 1e-7,
        "arrival uses the main-door physical contact face",
      );
    }
  }
});

test("city collision is exactly the visible solid complement of its roads, with no old map-edge wall", () => {
  for (let seed = 1; seed <= 24; seed++) {
    const floor = fixture(seed),
      plan = createCityPlan(floor, seed, 297);
    floor.city = plan;
    assert.equal(
      cityWall(floor, 22, 34),
      false,
      "old south map border is a real street",
    );
    assert.equal(
      cityWall(floor, 22, 80),
      false,
      "players can walk into the city",
    );
    assert.equal(
      cityWall(floor, 22, 15),
      undefined,
      "the office grid retains its own walls",
    );
    const boxes = cityCollisionBoxes(plan);
    for (const road of plan.roads)
      for (const block of plan.obstacles.filter((o) => o.kind === "building"))
        assert.equal(
          overlap(road, block),
          false,
          "a visible block cannot seal an approach",
        );
    for (let y = plan.bounds.top + 0.37; y < plan.bounds.bottom; y += 7.1)
      for (let x = plan.bounds.left + 0.23; x < plan.bounds.right; x += 7.3) {
        const wall = cityWall(floor, x, y);
        if (wall === undefined) continue;
        assert.equal(
          boxes.some((r) => inCityRectangle(r, x, y)),
          wall,
          `seed${seed}: physical urban mass owns blocked point${x},${y}`,
        );
      }
    for (const x of [plan.bounds.left + 0.1, plan.bounds.right - 0.1])
      for (let y = plan.bounds.top + 0.2; y < plan.bounds.bottom; y += 5)
        assert.equal(
          cityWall(floor, x, y),
          true,
          "solid addresses close the outer district",
        );
    for (const y of [plan.bounds.top + 0.1, plan.bounds.bottom - 0.1])
      for (let x = plan.bounds.left + 0.2; x < plan.bounds.right; x += 5)
        assert.equal(
          cityWall(floor, x, y),
          true,
          "road ends terminate before the physical city edge",
        );
    assert.ok(plan.obstacles.some((o) => o.kind === "vehicle"));
    assert.ok(plan.obstacles.some((o) => o.kind === "rubble"));
    const vehicle = plan.obstacles.find((o) => o.kind === "vehicle")!;
    assert.equal(
      cityWall(floor, vehicle.x, vehicle.y),
      true,
      "parked vehicles are real urban obstacles even inside a street court",
    );
    assert.equal(
      citySolid(floor, { x: plan.bounds.left - 10, y: plan.bounds.top - 10 }),
      true,
      "positions beyond the closed physical district remain out of bounds",
    );
  }
});

test("historical worlds and upper-floor physics retain their own geometry", () => {
  const floor = fixture();
  assert.equal(cityWall(floor, 22, 80), undefined);
  floor.city = createCityPlan(floor, 42, 297);
  floor.index = 1;
  assert.equal(cityWall(floor, 22, 80), undefined);
});

test("half-cell city facades use exact circular contact and ray intersections", () => {
  const floor = fixture();
  floor.city = createCityPlan(floor, 42, 297);
  floor.city.obstacles = [
    {
      x: 66.25,
      y: 40,
      w: 4.5,
      h: 4.5,
      kind: "building",
      height: 12,
      color: "#555555",
      damaged: false,
    },
  ];
  assert.equal(citySolid(floor, { x: 63.75, y: 40 }, 0.22), false);
  assert.equal(citySolid(floor, { x: 63.85, y: 40 }, 0.22), true);
  assert.equal(
    citySolid(floor, { x: 63.84, y: 37.59 }, 0.22),
    false,
    "outside a circular corner, though inside its square expansion",
  );
  assert.equal(citySolid(floor, { x: 63.87, y: 37.62 }, 0.22), true);
  assert.equal(
    citySolid(floor, { x: 22, y: 15 }),
    undefined,
    "authored interior is checked by its original grid",
  );
  assert.equal(cityRayDistance(floor, { x: 60, y: 40 }, 1, 0, 20), 4);
  assert.equal(cityRayDistance(floor, { x: 60, y: 43 }, 1, 0, 20), 20);
  assert.equal(cityRayDistance(floor, { x: 65, y: 40 }, 1, 0, 20), 0);
});

test("the visible lowest stair flight has an exact solid city base, matching its walking route", () => {
  for (let seed = 1; seed <= 32; seed++) {
    const floor = fixture(seed);
    floor.city = createCityPlan(floor, seed, 297);
    const upper = {
        ...floor,
        index: 1,
        entry: { x: 22, y: floor.boundary!.bottom + 1 },
      },
      game = { floors: [floor, upper] } as Game,
      route = buildStairRoute(game, {
        fromFloor: 0,
        toFloor: 1,
        origin: floor.stairs,
        destination: upper.entry,
        until: 0,
      }),
      base = floor.city.obstacles.find((o) => o.kind === "stair-base")!;
    assert.ok(base, "every fresh city reserves a real concrete flight support");
    assert.equal(base.x, route.points[2].x);
    assert.ok(Math.abs(base.y - base.h / 2 - route.points[2].z) < 1e-7);
    assert.ok(Math.abs(base.y + base.h / 2 - route.points[3].z) < 1e-7);
    assert.equal(base.w, STAIR_ROUTE_WIDTH + 0.12);
    assert.equal(base.height, route.points[3].y - route.points[2].y);
    for (const t of [0.1, 0.25, 0.5, 0.9]) {
      const p = {
        x: base.x,
        y: route.points[2].z + (route.points[3].z - route.points[2].z) * t,
      };
      assert.equal(
        citySolid(floor, p),
        true,
        "a flat walker cannot pass through low visible treads",
      );
      assert.equal(cityWall(floor, p.x, p.y), true);
    }
  }
});

test("rooftop skylines surround every district beyond its physical streets and ground fades beyond them", () => {
  for (let seed = 1; seed <= 32; seed++) {
    const floor = fixture(seed);
    floor.city = createCityPlan(floor, seed, 297);
    const skyline = cityBackdrop(floor),
      b = floor.city.bounds,
      before = JSON.stringify(floor);
    assert.equal(
      skyline.length,
      64,
      "outer silhouettes have a fixed mesh budget",
    );
    assert.deepEqual(cityBackdrop(floor), skyline);
    assert.deepEqual(
      cityBackdrop({ ...floor, index: 4 }),
      skyline,
      "every storey sees the same seeded city",
    );
    for (const block of skyline)
      assert.ok(
        block.x + block.w / 2 <= b.left - 80 ||
          block.x - block.w / 2 >= b.right + 80 ||
          block.y + block.d / 2 <= b.top - 80 ||
          block.y - block.d / 2 >= b.bottom + 80,
        "backdrop never occupies a physical city road",
      );
    assert.ok(skyline.some((o) => o.y + o.d / 2 < b.top));
    assert.ok(skyline.some((o) => o.y - o.d / 2 > b.bottom));
    assert.ok(skyline.some((o) => o.x + o.w / 2 < b.left));
    assert.ok(skyline.some((o) => o.x - o.w / 2 > b.right));
    const ground = cityGroundRectangles(floor);
    assert.ok(Math.min(...ground.map((o) => o.x - o.w / 2)) <= b.left - 600);
    assert.ok(Math.max(...ground.map((o) => o.x + o.w / 2)) >= b.right + 600);
    assert.ok(Math.min(...ground.map((o) => o.z - o.d / 2)) <= b.top - 600);
    assert.ok(Math.max(...ground.map((o) => o.z + o.d / 2)) >= b.bottom + 600);
    assert.equal(JSON.stringify(floor), before);
  }
});
