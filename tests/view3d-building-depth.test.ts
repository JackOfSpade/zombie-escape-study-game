import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Box3, Raycaster, Vector3 } from "three";
import type { Roadmap } from "../src/model";
import {
  exteriorStructure,
  stairAccessPortals,
  slabTop,
} from "../src/exterior-structure";
import { buildStairRoute, FLOOR_HEIGHT } from "../src/stair-route";
import { BuildingShell } from "../src/view3d/building";
import { StairGallery } from "../src/view3d/stair-gallery";
import { createPlayableGame } from "../src/world";

const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);

test("structural floor plates stay below the visible finish on every storey", () => {
  const game = createPlayableGame(42, roadmap),
    shell = new BuildingShell();
  shell.build(game.floors);
  shell.group.updateMatrixWorld(true);
  const structure = shell.group.getObjectByName("facade-structure")!;
  for (const floor of game.floors) {
    const height = floor.index * FLOOR_HEIGHT;
    const hits = new Raycaster(
      new Vector3(22.317, height + 0.2, 15.453),
      new Vector3(0, -1, 0),
      0,
      0.5,
    ).intersectObject(structure, false);
    assert.ok(hits.length > 0, `floor ${floor.index} has its structural slab`);
    assert.ok(
      hits[0].point.y < height - 0.075,
      "the slab cannot hide or depth-fight the textured finish at -0.025m",
    );
  }
  shell.dispose();
});

test("each gallery landing and adjoining walkway has one visible top surface", () => {
  const game = createPlayableGame(42, roadmap),
    gallery = new StairGallery();
  // The production geometry is independent of sign textures. Suppress only
  // canvas labels so this actual geometry regression runs without a browser.
  (gallery as any).sign = () => {};
  gallery.build(game);
  gallery.group.updateMatrixWorld(true);
  const decks = gallery.group.getObjectByName("stair-decks-and-treads")!;
  const supports = gallery.group.getObjectByName("stair-support-columns")!;
  assert.ok(supports, "elevated galleries retain structural supports");
  const supportBounds = new Box3().setFromObject(supports);
  for (let level = 0; level < game.floors.length - 1; level++) {
    const route = buildStairRoute(game, {
      fromFloor: level,
      toFloor: level + 1,
      origin: game.floors[level].stairs,
      destination: game.floors[level + 1].entry,
      until: 0,
    });
    assert.ok(
      supportBounds.min.x > route.points[2].x + 0.85,
      "support columns stay outside the complete walking width instead of rising through landings",
    );
    for (let i = 1; i < route.points.length - 1; i++) {
      const a = route.points[i - 1],
        corner = route.points[i],
        b = route.points[i + 1];
      const cross =
        (corner.x - a.x) * (b.z - corner.z) -
        (corner.z - a.z) * (b.x - corner.x);
      if (Math.abs(cross) < 0.01) continue;
      const target = new Vector3(
        corner.x - 0.453,
        corner.y + 0.4,
        corner.z - 0.317,
      );
      const hits = new Raycaster(target, new Vector3(0, -1, 0), 0, 0.6)
        .intersectObject(decks, false)
        .filter((hit) => hit.face!.normal.y > 0.9);
      assert.ok(
        hits.length > 0,
        `floor ${level} turn ${i} has a supported landing`,
      );
      const top = hits[0].point.y;
      assert.equal(
        hits.filter((hit) => Math.abs(hit.point.y - top) < 0.0001).length,
        1,
        `floor ${level} turn ${i} cannot have coplanar decks competing at the corner`,
      );
      const centerHits = new Raycaster(
        new Vector3(corner.x + 0.033, corner.y + 0.4, corner.z + 0.077),
        new Vector3(0, -1, 0),
        0,
        0.6,
      )
        .intersectObjects([decks, supports], false)
        .filter((hit) => hit.face!.normal.y > 0.9);
      assert.ok(centerHits.length > 0);
      assert.equal(
        centerHits.filter((hit) => Math.abs(hit.point.y - corner.y) < 0.0001)
          .length,
        1,
        "the old support-column centre has exactly one landing top, without an exposed or coplanar post cap",
      );
    }
  }
  gallery.dispose();
});

test("rendered treads, intact guards and storm gaps match the shared collision structure", () => {
  const game = createPlayableGame(42, roadmap),
    gallery = new StairGallery();
  (gallery as any).sign = () => {};
  gallery.build(game);
  gallery.group.updateMatrixWorld(true);
  const structure = exteriorStructure(game),
    decks = gallery.group.getObjectByName("stair-decks-and-treads")!,
    guards = gallery.group.getObjectByName("stair-glass-guards")!,
    rails = gallery.group.getObjectByName("stair-handrails")!;
  for (const slab of structure.slabs) {
    for (let i = 0; i < slab.steps; i++) {
      const along =
          -slab.halfLength + (slab.halfLength * 2 * (i + 0.5)) / slab.steps,
        p = { x: slab.x + slab.ux * along, y: slab.y + slab.uy * along },
        top = slabTop(slab, p),
        hit = new Raycaster(
          new Vector3(p.x, top + 0.1, p.y),
          new Vector3(0, -1, 0),
          0,
          0.15,
        ).intersectObject(decks, false)[0];
      assert.ok(hit, "every physical tread has a visible walking surface");
      assert.ok(Math.abs(hit.point.y - top) < 1e-5);
    }
  }
  for (const bay of structure.guards) {
    const run = Math.hypot(bay.x2 - bay.x1, bay.y2 - bay.y1),
      nx = -(bay.y2 - bay.y1) / run,
      nz = (bay.x2 - bay.x1) / run,
      x = (bay.x1 + bay.x2) / 2,
      z = (bay.y1 + bay.y2) / 2,
      base = (bay.base1 + bay.base2) / 2;
    for (const height of [0.52, 1.14]) {
      const hits = new Raycaster(
        new Vector3(x + nx * 0.2, base + height, z + nz * 0.2),
        new Vector3(-nx, 0, -nz),
        0,
        0.4,
      ).intersectObjects([guards, rails], false);
      assert.equal(
        hits.length > 0,
        !bay.broken,
        `level ${bay.level} ${bay.broken ? "damaged" : "intact"} guard at height ${height}`,
      );
    }
    if (bay.broken) {
      const hits = new Raycaster(
        new Vector3(bay.x1 + nx * 0.2, bay.base1 + 0.6, bay.y1 + nz * 0.2),
        new Vector3(-nx, 0, -nz),
        0,
        0.4,
      ).intersectObject(rails, false);
      assert.ok(
        hits.length,
        "the damaged guard keeps its visible supporting posts",
      );
    }
  }
  assert.equal(
    structure.guards.filter((b) => b.broken).length,
    game.floors.length - 1,
  );
  gallery.dispose();
});

test("stair access fields visibly cover the shared one-way portal and follow personal permission", () => {
  const game = createPlayableGame(42, roadmap),
    gallery = new StairGallery(),
    actor = game.survivors[0];
  (gallery as any).sign = () => {};
  actor.access = [];
  gallery.build(game);
  for (const portal of stairAccessPortals(game)) {
    const field = gallery.group.getObjectByName(
      `stair-access-field-${portal.kind}-${portal.floor}`,
    )!;
    assert.ok(field.visible, "locked portals must show a real visible field");
    assert.equal(field.position.x, portal.x);
    assert.equal(field.position.y, portal.base + portal.height / 2);
    assert.equal(field.position.z, portal.y);
    assert.equal(field.userData.direction, portal.direction);
    assert.equal(field.rotation.y, portal.axis === "x" ? Math.PI / 2 : 0);
  }
  const side = gallery.group.getObjectByName(
      "stair-access-field-city-base-side-0",
    )!,
    front = gallery.group.getObjectByName("stair-access-field-city-base-0")!;
  assert.ok(
    side.visible,
    "the public-court side opening also shows its access barrier",
  );
  const sideBounds = new Box3().setFromObject(side);
  assert.ok(Math.abs(sideBounds.min.x - (front.position.x - 0.86)) < 1e-6);
  assert.ok(Math.abs(sideBounds.min.z - front.position.z) < 1e-6);
  assert.ok(Math.abs(sideBounds.max.z - (front.position.z + 0.96)) < 1e-6);
  assert.equal(
    side.userData.direction,
    1,
    "only entering eastward is locked; descending westward remains open",
  );
  actor.access = [0];
  gallery.update(game);
  assert.equal(
    gallery.group.getObjectByName("stair-access-field-well-0")!.visible,
    false,
  );
  assert.equal(
    gallery.group.getObjectByName("stair-access-field-city-base-0")!.visible,
    false,
  );
  assert.equal(side.visible, false);
  assert.equal(
    gallery.group.getObjectByName("stair-access-field-well-1")!.visible,
    true,
  );
  gallery.dispose();
});
