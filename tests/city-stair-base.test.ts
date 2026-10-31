import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";
import { step } from "../src/engine";
import { type Actor, type Game, type Roadmap } from "../src/model";
import { decode, encode, recover } from "../src/persistence";
import { buildStairRoute, cityStairBase } from "../src/stair-route";
import { enterCityStairBase } from "../src/stair-travel";
import { buildCityStairFoundation } from "../src/view3d/stair-gallery";
import { createPlayableGame } from "../src/world";

const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
const DT = 1 / 30;
const idle = { x: 0, y: 0, grab: false, stairWalk: true };
function fixture() {
  const g = createPlayableGame(21, roadmap);
  g.id = "city-stair-base-test";
  g.status = "playing";
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.surge.anchor = Number.MAX_SAFE_INTEGER;
  g.zombies = [];
  g.survivors = g.survivors.slice(0, 1);
  const a = g.survivors[0],
    base = cityStairBase(g)!;
  Object.assign(a, {
    floor: 0,
    x: base.start.x + 0.2,
    y: base.start.y - 0.8,
    access: [],
  });
  return { g, a, base };
}
function walk(
  g: Game,
  input: { x: number; y: number },
  ticks: number,
  stairWalk = true,
) {
  for (let i = 0; i < ticks; i++)
    step(g, DT, { ...input, grab: false, stairWalk });
}
function pose(a: Actor) {
  return { x: a.x, y: a.elevated?.feet ?? a.floor * 3.6, z: a.y };
}

test("native court walking cannot pass through the solid lowest flight at any visible riser", () => {
  for (const offset of [0.72, 1.8, 3.6]) {
    for (const collider of [false, true]) {
      const { g, a, base } = fixture();
      if (!collider)
        g.floors[0].city!.obstacles = g.floors[0].city!.obstacles.filter(
          (o) => o.kind !== "stair-base",
        );
      Object.assign(a, {
        x: base.x - base.w / 2 - 1.2,
        y: base.start.y + offset,
      });
      walk(g, { x: 1, y: 0 }, 90, false);
      if (collider)
        assert.ok(
          a.x < base.x - base.w / 2 - 0.2,
          `the visible ${offset / 2}m riser has a real ground footprint`,
        );
      else
        assert.ok(
          a.x > base.x + base.w / 2,
          "without the authored foundation collider the original walk-through bug is reproduced",
        );
      assert.equal(a.stairTravel, undefined);
    }
  }
});

test("the visible foundation fills the underside without covering tread surfaces or duplicating their side planes", () => {
  const { g, base } = fixture(),
    geometry = buildCityStairFoundation(g)!,
    material = new MeshBasicMaterial({ side: DoubleSide }),
    mesh = new Mesh(geometry, material);
  mesh.updateMatrixWorld(true);
  const bounds = geometry.boundingBox!;
  assert.ok(bounds.min.y < 0 && bounds.max.y < base.rise);
  assert.ok(
    bounds.min.x > base.x - base.w / 2 && bounds.max.x < base.x + base.w / 2,
  );
  assert.ok(bounds.min.z > base.start.y && bounds.max.z < base.end.y);
  for (const offset of [0.72, 1.8, 3.6, 7]) {
    const ray = new Raycaster(
      new Vector3(base.x - 3, offset * 0.25, base.start.y + offset),
      new Vector3(1, 0, 0),
      0,
      6,
    );
    assert.ok(
      ray.intersectObject(mesh).length > 0,
      `solid concrete is visible below the ${offset / 2}m tread height`,
    );
  }
  geometry.dispose();
  material.dispose();
});

test("a credentialed player joins from the actual court position and looking or idle time never climbs", () => {
  const { g, a, base } = fixture(),
    origin = { x: a.x, y: a.y };
  a.access = [0];
  assert.equal(enterCityStairBase(g, a, { x: 0, y: 0 }), false);
  walk(g, { x: 0, y: 0 }, 60);
  assert.equal(a.stairTravel, undefined);
  assert.equal(enterCityStairBase(g, a, { x: 0, y: 1 }), true);
  assert.deepEqual({ x: a.x, y: a.y }, origin);
  assert.deepEqual(a.stairTravel!.origin, origin);
  assert.equal(a.stairTravel!.cityBase, true);
  const initial = pose(a);
  assert.deepEqual(initial, { x: origin.x, y: 0, z: origin.y });
  assert.equal(a.stairTravel!.walked, 0);
  let previous = initial;
  for (let i = 0; i < 24; i++) {
    step(g, DT, { x: 0, y: 1, grab: false, stairWalk: true });
    const next = pose(a);
    assert.ok(
      Math.hypot(next.x - previous.x, next.z - previous.z) <=
        a.speed * DT + 1e-7,
    );
    assert.ok(Math.abs(next.y - previous.y) <= 0.3 + 1e-7);
    previous = next;
  }
  assert.ok(previous.y > 0.4 && a.y > base.start.y);
  const distance = a.stairTravel!.walked;
  walk(g, idle, 120);
  assert.equal(a.stairTravel!.walked, distance);
  assert.deepEqual(pose(a), previous);
  assert.equal(g.events.filter((e) => e.type === "climb").length, 0);
});

test("unlicensed and sideways court walkers stay physically blocked and receive the ordinary credential explanation", () => {
  const { g, a, base } = fixture();
  walk(g, { x: 0, y: 1 }, 90);
  assert.equal(a.floor, 0);
  assert.equal(a.stairTravel, undefined);
  assert.ok(a.y < base.start.y - 0.2);
  assert.match(g.notice, /locked for you/);
  assert.equal(g.events.filter((e) => e.type === "stairs-locked").length, 1);
  a.access = [0];
  assert.equal(enterCityStairBase(g, a, { x: 1, y: 0 }), false);
  assert.equal(enterCityStairBase(g, a, { x: 0, y: -1 }), false);
});

test("a city-base ascent saves its exact body, reverses freely and reaches the upper landing by walking", () => {
  const original = fixture();
  original.a.access = [0];
  const origin = { x: original.a.x, y: original.a.y };
  assert.equal(
    enterCityStairBase(original.g, original.a, { x: 0, y: 1 }),
    true,
  );
  walk(original.g, { x: 0, y: 1 }, 30);
  const savedPose = pose(original.a),
    savedBody = structuredClone(original.a.elevated),
    g = recover(decode(encode(original.g))),
    a = g.survivors[0];
  assert.deepEqual(pose(a), savedPose);
  assert.deepEqual(a.elevated, savedBody);
  walk(g, { x: 0, y: -1 }, 50);
  assert.equal(a.stairTravel, undefined);
  assert.ok(
    a.y < origin.y,
    "reversal walks into the court without snapping to the old origin",
  );
  assert.equal(a.floor, 0);
  assert.equal(a.hp, 100);
  assert.equal(g.events.filter((e) => e.type === "climb").length, 0);
  const base = cityStairBase(g)!;
  for (let i = 0; i < 150 && !a.stairTravel; i++)
    step(g, DT, { x: 0, y: 1, grab: false, stairWalk: true });
  assert.ok((a as Actor).stairTravel?.cityBase);
  const route = buildStairRoute(g, a.stairTravel!);
  let previous = pose(a);
  for (const p of [
    ...route.points.slice(1),
    { x: g.floors[1].entry.x, z: g.floors[1].boundary!.bottom - 0.5 },
  ]) {
    for (
      let i = 0;
      i < 500 && Math.hypot(a.x - p.x, a.y - p.z) > a.speed * DT;
      i++
    ) {
      const dx = p.x - a.x,
        dy = p.z - a.y,
        n = Math.hypot(dx, dy);
      step(g, DT, { x: dx / n, y: dy / n, grab: false, stairWalk: true });
      const next = pose(a);
      assert.ok(
        Math.hypot(next.x - previous.x, next.z - previous.z) <=
          a.speed * DT + 1e-7,
      );
      assert.ok(Math.abs(next.y - previous.y) <= 0.3 + 1e-7);
      previous = next;
    }
    assert.ok(
      Math.hypot(a.x - p.x, a.y - p.z) <= a.speed * DT + 1e-7,
      `walk reaches (${p.x}, ${p.z}) from (${a.x}, ${a.y})`,
    );
  }
  assert.equal(a.floor, 1);
  assert.equal(a.stairTravel, undefined);
  assert.equal(a.hp, 100);
  assert.equal(a.access.includes(1), false);
  assert.ok(base.rise > 3.5);
});
