import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Box3, Raycaster, Vector3 } from "three";
import type { Roadmap } from "../src/model";
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
