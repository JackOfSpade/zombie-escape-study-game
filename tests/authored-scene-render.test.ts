import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { InstancedMesh, Matrix4, Vector3 } from "three";
import { type Furniture, type Roadmap } from "../src/model";
import {
  PROP_CATALOG,
  SCENE_LIMITS,
  SCENE_SURFACE_KINDS,
  type ScenePropKind,
} from "../src/scene-catalog.mjs";
import { AuthoredScene, authoredPropParts } from "../src/view3d/authored-scene";
import { InteriorAtmosphere } from "../src/view3d/interior-atmosphere";
import { InteriorLightmap } from "../src/view3d/interior-lightmap";
import { FirstPersonView } from "../src/view3d/scene";
import { createPlayableGame } from "../src/world";
import { savedRunDesign, sceneDesignFixture } from "./helpers/run-design";

const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
function fixture() {
  return createPlayableGame(
    42,
    roadmap,
    undefined,
    savedRunDesign(sceneDesignFixture()),
  );
}
function matrices(mesh: InstancedMesh) {
  return Array.from({ length: mesh.count }, (_, index) => {
    const matrix = new Matrix4();
    mesh.getMatrixAt(index, matrix);
    return matrix;
  });
}
function close(actual: number, expected: number) {
  assert.ok(
    Math.abs(actual - expected) < 1e-4,
    `${actual} differs from ${expected}`,
  );
}

test("all authored prop shapes and condition marks stay within the shared physical envelope", () => {
  for (const kind of Object.keys(PROP_CATALOG) as ScenePropKind[])
    for (const scale of [0.65, 1, 1.25]) {
      const shapes = [];
      for (const condition of ["intact", "worn", "damaged"] as const) {
        const size = PROP_CATALOG[kind],
          parts = authoredPropParts({
            kind,
            scale,
            color: "#316749",
            accent: "#c3aa64",
            condition,
          });
        assert.ok(parts.length > 0 && parts.length <= 16);
        for (const part of parts) {
          assert.ok(
            Math.abs(part.x) + part.w / 2 <= (size.w * scale) / 2 + 1e-9,
            `${kind} ${condition} width`,
          );
          assert.ok(
            Math.abs(part.z) + part.d / 2 <= (size.d * scale) / 2 + 1e-9,
            `${kind} ${condition} depth`,
          );
          assert.ok(
            part.y - part.h / 2 >= -1e-9,
            `${kind} never sinks through its supporting surface`,
          );
          assert.ok(
            part.y + part.h / 2 <= size.h * scale + 1e-9,
            `${kind} ${condition} height`,
          );
        }
        shapes.push(parts);
      }
      assert.notDeepEqual(shapes[0], shapes[1]);
      assert.notDeepEqual(shapes[1], shapes[2]);
    }
});

test("authored prop meshes follow a moved and rotated native host and disappear with its destruction", () => {
  const game = fixture(),
    floor = game.floors[0],
    host = floor.furniture.find(
      (f) => f.id === floor.scene!.props[0].furnitureId,
    )!,
    map = new InteriorLightmap(),
    scene = new AuthoredScene(floor, map),
    mesh = scene.group.getObjectByName(
      "authored-scene-cylinder",
    ) as InstancedMesh,
    before = matrices(mesh),
    hostBefore = { x: host.x, y: host.y },
    snapshot = JSON.stringify(game);
  scene.sync();
  assert.equal(
    JSON.stringify(game),
    snapshot,
    "rendering never modifies simulation state",
  );
  host.x += 2;
  host.y += 3;
  host.angle = Math.PI / 2;
  scene.sync();
  const after = matrices(mesh);
  // The first cylinder is the first authored mug, supported by this table.
  const p = new Vector3().setFromMatrixPosition(before[0]),
    moved = new Vector3().setFromMatrixPosition(after[0]);
  close(moved.x, host.x - (p.z - hostBefore.y));
  close(moved.z, host.y + (p.x - hostBefore.x));
  close(moved.y, p.y);
  host.destroyed = true;
  scene.sync();
  assert.equal(matrices(mesh)[0].determinant(), 0);
  // A bottle on a different room's table survives this destruction.
  assert.ok(matrices(mesh).some((matrix) => matrix.determinant() !== 0));
  scene.dispose();
  map.dispose();
});

test("authored rooms use at most five draw calls and release owned buffers and materials exactly once", () => {
  const game = fixture(),
    floor = game.floors[0],
    hosts = floor.furniture.filter((object) => !!object.appearance),
    originalProps = floor.scene!.props;
  // Stress the renderer's documented ceiling in isolation. These overlapping
  // test copies are never passed to simulation or claimed as a playable plan.
  floor.scene!.furniture = [];
  floor.scene!.props = [];
  for (let i = 0; i < SCENE_LIMITS.furniture; i++) {
    const original = hosts[i % hosts.length],
      host = { ...original, id: `render-stress-host-${i}` };
    floor.furniture.push(host);
    floor.scene!.furniture.push({
      id: host.id,
      designId: host.id,
      room: host.appearance!.room,
      kind: host.kind as "cafeTable",
    });
    for (const prop of originalProps.filter(
      (p) => p.furnitureId === original.id,
    ))
      floor.scene!.props.push({
        ...prop,
        id: `${host.id}-${prop.id}`,
        furnitureId: host.id,
      });
  }
  assert.equal(floor.scene!.props.length, SCENE_LIMITS.props);
  const map = new InteriorLightmap(),
    scene = new AuthoredScene(floor, map),
    meshes = scene.group.children.filter(
      (node) => node instanceof InstancedMesh,
    ) as InstancedMesh[];
  assert.equal(meshes.length, 5);
  assert.equal(scene.group.userData.props, 48);
  assert.equal(scene.group.userData.labels, 68);
  let geometries = 0,
    materials = 0;
  for (const mesh of meshes)
    mesh.geometry.addEventListener("dispose", () => geometries++);
  const materialSet = new Set(meshes.map((mesh) => mesh.material));
  assert.equal(materialSet.size, 2);
  for (const material of materialSet) {
    assert.ok(!Array.isArray(material));
    material.addEventListener("dispose", () => materials++);
  }
  scene.dispose();
  scene.dispose();
  assert.equal(geometries, 5);
  assert.equal(materials, 2);
  map.dispose();
});

test("authored furniture replaces automatic clutter and its saved scene produces identical render transforms", () => {
  const game = fixture(),
    floor = game.floors[0],
    atmosphere = new InteriorAtmosphere();
  // Isolate the four authored hosts: no accidental extra mug/note set appears.
  floor.furniture = floor.furniture.filter((f) => !!f.appearance);
  atmosphere.build(floor, game.seed);
  const root = atmosphere.group.getObjectByName("office-atmosphere-0")!;
  assert.equal(root.userData.furnishedObjects, 0);
  assert.equal(root.getObjectByName("authored-scene")!.userData.props, 12);
  const snapshot = (view: InteriorAtmosphere) => {
    const group = view.group.getObjectByName("authored-scene")!;
    return group.children.map((node) => ({
      name: node.name,
      matrices: matrices(node as InstancedMesh).map(
        (matrix) => matrix.elements,
      ),
    }));
  };
  const before = snapshot(atmosphere),
    restored = JSON.parse(JSON.stringify(floor));
  atmosphere.reset();
  atmosphere.build(restored, game.seed);
  assert.deepEqual(snapshot(atmosphere), before);
  atmosphere.dispose();
});

test("every allowed support places props on the actual native mesh top, including cabinet and shelf edges", () => {
  type Part = {
    x: number;
    y: number;
    z: number;
    w: number;
    h: number;
    d: number;
  };
  const renderer = FirstPersonView.prototype as unknown as {
    furnitureParts(parts: Part[], object: Furniture): void;
  };
  for (const kind of SCENE_SURFACE_KINDS) {
    const design = sceneDesignFixture(),
      item = design.floors[0].scene!.rooms[0].furniture[0];
    item.kind = kind;
    item.condition = "intact";
    item.props = [item.props[0]];
    item.props[0].at = { x: 1, y: 1 };
    const game = createPlayableGame(
        42,
        roadmap,
        undefined,
        savedRunDesign(design),
      ),
      floor = game.floors[0],
      prop = floor.scene!.props[0],
      host = floor.furniture.find((f) => f.id === prop.furnitureId)!,
      parts: Part[] = [];
    renderer.furnitureParts.call(
      {
        part(
          target: Part[],
          x: number,
          y: number,
          z: number,
          w: number,
          h: number,
          d: number,
        ) {
          target.push({ x, y, z, w, h, d });
        },
      },
      parts,
      host,
    );
    const supports = parts.filter(
      (part) =>
        Math.abs(prop.x - part.x) + prop.w / 2 <= part.w / 2 + 1e-8 &&
        Math.abs(prop.y - part.z) + prop.d / 2 <= part.d / 2 + 1e-8,
    );
    assert.ok(
      supports.length > 0,
      `${kind} has a real mesh beneath the entire prop`,
    );
    const top = Math.max(...supports.map((part) => part.y + part.h / 2));
    close(prop.top, top + 0.002);
  }
});
