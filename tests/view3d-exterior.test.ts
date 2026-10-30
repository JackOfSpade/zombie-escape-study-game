import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createBuildingFootprint,
  footprintTiles,
} from "../src/building-layout";
import type { Floor } from "../src/model";
import {
  BufferGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  Raycaster,
  Vector3,
} from "three";
import { ExteriorDressing } from "../src/view3d/exterior";
import {
  clearStreetEdge,
  exteriorWallTiles,
  outsideBuilding,
  streetLayout,
} from "../src/view3d/exterior-layout";

function street(seed = 1): Floor {
  const boundary = createBuildingFootprint(seed),
    tiles = footprintTiles(boundary);
  for (let y = boundary.bottom; y < tiles.length; y++)
    for (let x = 18; x < 26; x++)
      if (y > boundary.bottom || (x >= 20 && x < 24)) tiles[y][x] = 0;
  return {
    boundary,
    tiles,
    index: 0,
    stations: [],
    furniture: [],
    dark: 0.1,
    name: "Synthetic street",
    doors: [],
    entry: { x: 22, y: 29 },
    stairs: { x: 22, y: 1 },
  };
}

test("street decoration requires a ground floor footprint and an open entrance approach", () => {
  const floor = street();
  assert.ok(streetLayout(floor));
  floor.index = 1;
  assert.equal(streetLayout(floor), undefined);
  floor.index = 0;
  const boundary = floor.boundary!;
  floor.tiles[boundary.bottom][22] = 1;
  assert.equal(streetLayout(floor), undefined);
  floor.tiles[boundary.bottom][22] = 0;
  floor.tiles[boundary.bottom + 1].fill(1);
  assert.equal(
    streetLayout(floor),
    undefined,
    "a footprint without an open street receives no dressing",
  );
  assert.equal(exteriorWallTiles(floor), floor.tiles);
  delete floor.boundary;
  assert.equal(streetLayout(floor), undefined);
  assert.equal(outsideBuilding(floor, 20, 30), false);
  assert.equal(
    exteriorWallTiles(floor),
    floor.tiles,
    "legacy and arenas retain their original wall geometry",
  );
});

test("parked cars, lamps, cones and debris occupy only blocked exterior tiles, keeping every walkable tile clear", () => {
  for (let seed = 1; seed <= 128; seed++) {
    const floor = street(seed),
      before = JSON.stringify(floor),
      layout = streetLayout(floor)!;
    assert.equal(layout.props.filter((p) => p.kind === "car").length, 2);
    assert.equal(
      layout.props.filter((p) => p.kind === "streetlight").length,
      2,
    );
    assert.equal(layout.props.filter((p) => p.kind === "cone").length, 2);
    for (const p of layout.props) {
      assert.ok(clearStreetEdge(floor, p), `seed ${seed}, ${p.kind}`);
      for (let y = Math.floor(p.y - p.h / 2); y < p.y + p.h / 2; y++)
        for (let x = Math.floor(p.x - p.w / 2); x < p.x + p.w / 2; x++) {
          assert.notEqual(floor.tiles[y][x], undefined);
          assert.notEqual(
            floor.tiles[y][x],
            0,
            "no decorative prop footprint overlaps walkable simulation space",
          );
          assert.ok(outsideBuilding(floor, x + 0.5, y + 0.5));
          assert.ok(
            x < 18 || x >= 26,
            "the complete walkable arrival lane, including its outer columns, stays empty",
          );
        }
    }
    assert.equal(
      JSON.stringify(floor),
      before,
      "dressing does not edit simulation tiles or RNG",
    );
  }
});

test("edge clearance validates the entire footprint and rejects central routes, portals and walkable cells", () => {
  const floor = street(),
    car = streetLayout(floor)!.props.find((p) => p.kind === "car")!;
  assert.ok(clearStreetEdge(floor, car));
  assert.equal(clearStreetEdge(floor, { ...car, x: 22 }), false);
  assert.equal(
    clearStreetEdge(floor, { ...car, w: 1.2 }),
    false,
    "overhanging into the next tile is rejected",
  );
  assert.equal(
    clearStreetEdge(floor, { ...car, y: 29 }),
    false,
    "no prop can overlap the portal row",
  );
  floor.tiles[32][17] = 0;
  assert.equal(
    clearStreetEdge(floor, car),
    false,
    "a walkable far end rejects an otherwise blocked footprint",
  );
  for (const value of [NaN, Infinity, -Infinity])
    assert.equal(clearStreetEdge(floor, { ...car, h: value }), false);
});

test("exterior wall geometry retains the solid shell, openings and all interior walls while removing distant black blocks", () => {
  const floor = street(),
    b = floor.boundary!,
    before = JSON.stringify(floor.tiles);
  floor.tiles[b.top + 5][22] = 1;
  const tiles = exteriorWallTiles(floor);
  assert.notEqual(tiles, floor.tiles);
  assert.equal(tiles[b.top + 5][22], 1);
  assert.equal(tiles[b.bottom][10], 1, "one-cell exterior shell remains solid");
  assert.equal(tiles[b.bottom][22], 0, "entrance remains open");
  assert.equal(
    tiles[b.bottom + 3][10],
    0,
    "distant simulation blockers are dressed as a street edge instead of tall masses",
  );
  floor.tiles[b.top + 5][22] = JSON.parse(before)[b.top + 5][22];
  assert.equal(JSON.stringify(floor.tiles), before);
});

test("street dressing closes the actual south map edge across the arrival lane", () => {
  // Build the real merged geometry without requiring a browser canvas texture.
  const dressing = Object.assign(Object.create(ExteriorDressing.prototype), {
    world: new Group(),
    group: new Group(),
    tint: new Color(),
    asphalt: new MeshStandardMaterial(),
    solid: new MeshStandardMaterial(),
    glass: new MeshStandardMaterial(),
    warm: new MeshStandardMaterial(),
    signMaterial: new MeshStandardMaterial(),
    entranceLight: new PointLight(),
    streetLight: new PointLight(),
  }) as ExteriorDressing;
  const floor = street();
  dressing.build(floor);
  const world = (dressing as any).world as Group,
    props = world.getObjectByName(
      "merged-street-facade-props",
    ) as Mesh<BufferGeometry>;
  assert.ok(props);
  props.updateMatrixWorld(true);
  // Every lane column hits a crosswise rail where simulation collision ends.
  for (let x = 18.5; x < 26; x++) {
    const ray = new Raycaster(
        new Vector3(x, 0.68, floor.tiles.length - 1),
        new Vector3(0, 0, 1),
      ),
      hit = ray.intersectObject(props)[0];
    assert.ok(hit, `south rail at x=${x}`);
    assert.ok(Math.abs(hit.point.z - floor.tiles.length) < 0.06);
  }
  for (const child of world.children)
    (child as Mesh<BufferGeometry>).geometry.dispose();
});
