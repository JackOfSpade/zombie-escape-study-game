import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { InstancedMesh, Matrix4, Vector3 } from "three";
import type {
  EnvironmentManifest,
  SurfaceContent,
  SurfaceSlot,
} from "../src/environment-contract.mjs";
import {
  ENVIRONMENT_LIMITS,
  environmentSurfaceFingerprint,
} from "../src/environment-contract.mjs";
import { createPlayableGame } from "../src/world";
import { savedRunDesign, sceneDesignFixture } from "./helpers/run-design";
import { propSurfaceFace } from "../src/environment-faces";
import { surfaceWorldPose } from "../src/environment-surfaces";
import { InteriorAtmosphere } from "../src/view3d/interior-atmosphere";
import {
  EnvironmentSurfaces,
  environmentAtlasPages,
  paintEnvironmentSurface,
} from "../src/view3d/environment-surfaces";
import type { Roadmap } from "../src/model";

const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
function slot(id: string, width = 1.2, height = 0.7): SurfaceSlot {
  return {
    id,
    floor: 0,
    scope: "interior",
    role: "wall-poster",
    room: null,
    owner: null,
    context: "A synthetic test surface.",
    maxTitle: 48,
    maxBody: 240,
    allowsArt: true,
    binding: {
      kind: "fixed",
      x: 10,
      y: 10,
      z: 1.5,
      width,
      height,
      yaw: 0,
      pitch: 0,
    },
  };
}
function manifest(surfaces: SurfaceSlot[]): EnvironmentManifest {
  return {
    version: 1,
    surfaceFingerprint: environmentSurfaceFingerprint(surfaces),
    surfaces,
    fragments: [],
    entries: surfaces.map((s) => ({
      surfaceId: s.id,
      layout: "text",
      title: [{ text: `Written for ${s.id}` }],
      body: [],
      description: "",
      drawing: null,
    })),
  };
}

test("a maximum-sized surface inventory has bounded, distinct padded atlas regions and deterministic packing", () => {
  const sizes = [
      [0.018, 0.12],
      [0.62, 0.86],
      [3.05, 0.6],
      [1.7, 0.93],
      [0.5, 0.075],
      [0.136, 0.176],
    ],
    surfaces = Array.from({ length: ENVIRONMENT_LIMITS.surfaces }, (_, i) =>
      slot(`slot-${i}`, ...(sizes[i % sizes.length] as [number, number])),
    ),
    pages = environmentAtlasPages(surfaces);
  assert.deepEqual(environmentAtlasPages([...surfaces].reverse()), pages);
  assert.equal(
    pages.flatMap((p) => p.tiles).length,
    ENVIRONMENT_LIMITS.surfaces,
  );
  const seen = new Set<string>();
  for (const page of pages) {
    assert.ok(page.width <= 2048 && page.height <= 2048);
    for (const [index, tile] of page.tiles.entries()) {
      assert.ok(!seen.has(tile.surface.id));
      seen.add(tile.surface.id);
      assert.ok(tile.x >= 4 && tile.y >= 4);
      assert.ok(tile.x + tile.width <= page.width - 4);
      assert.ok(tile.y + tile.height <= page.height - 4);
      assert.ok(
        Math.abs(
          tile.width / tile.height -
            tile.surface.binding.width / tile.surface.binding.height,
        ) < 1e-9,
      );
      for (const previous of page.tiles.slice(0, index))
        assert.ok(
          tile.x >= previous.x + previous.width + 7.99 ||
            previous.x >= tile.x + tile.width + 7.99 ||
            tile.y >= previous.y + previous.height + 7.99 ||
            previous.y >= tile.y + tile.height + 7.99,
          "two unique surfaces cannot sample each other's text/art",
        );
    }
  }
  assert.ok(
    pages.length < 40,
    "page count stays bounded at the contract maximum",
  );
});

test("saved surfaces follow their real prop and furniture and release each GPU resource once", () => {
  const game = createPlayableGame(
      42,
      roadmap,
      undefined,
      savedRunDesign(sceneDesignFixture()),
    ),
    floor = game.floors[0],
    prop = floor.scene!.props[0],
    host = floor.furniture.find((f) => f.id === prop.furnitureId)!,
    surface = slot("bound-prop"),
    before = JSON.stringify(game);
  surface.binding = {
    kind: "prop",
    furnitureId: host.id,
    propId: prop.id,
    ...propSurfaceFace(prop),
  };
  const drawing = new EnvironmentSurfaces(
      floor,
      manifest([surface]),
      "interior",
    ),
    mesh = drawing.group.children[0] as InstancedMesh,
    matrix = new Matrix4();
  const inspect = () => {
    mesh.getMatrixAt(0, matrix);
    return new Vector3().setFromMatrixPosition(matrix);
  };
  const first = inspect(),
    pose = surfaceWorldPose(floor, surface)!;
  assert.deepEqual(
    first.toArray().map((x) => +x.toFixed(5)),
    [pose.x, pose.z, pose.y].map((x) => +x.toFixed(5)),
  );
  assert.equal(JSON.stringify(game), before);
  const x = host.x,
    y = host.y;
  host.x += 0.7;
  host.y -= 0.3;
  host.angle = (host.angle ?? 0) + Math.PI / 2;
  drawing.sync();
  const moved = inspect();
  assert.ok(Math.abs(moved.x - (host.x - (first.z - y))) < 1e-5);
  assert.ok(Math.abs(moved.z - (host.y + (first.x - x))) < 1e-5);
  host.destroyed = true;
  drawing.sync();
  mesh.getMatrixAt(0, matrix);
  assert.equal(matrix.determinant(), 0);
  let geometry = 0,
    material = 0,
    instance = 0;
  mesh.geometry.addEventListener("dispose", () => geometry++);
  (mesh.material as any).addEventListener("dispose", () => material++);
  mesh.addEventListener("dispose", () => instance++);
  drawing.dispose();
  drawing.dispose();
  assert.deepEqual(
    { geometry, material, instance },
    { geometry: 1, material: 1, instance: 1 },
  );
});

test("v3 uses its frozen desk bindings, suppresses shared text cards, and retains solid authored props", () => {
  const game = createPlayableGame(
      42,
      roadmap,
      undefined,
      savedRunDesign(sceneDesignFixture()),
    ),
    floor = game.floors[0],
    host = floor.furniture.find((f) => !f.appearance && f.kind === "desk")!,
    surface = slot("frozen-note");
  assert.ok(host);
  surface.role = "desk-note";
  surface.binding = {
    ...surface.binding,
    kind: "furniture",
    furnitureId: host.id,
  };
  floor.environment = manifest([surface]);
  const atmosphere = new InteriorAtmosphere();
  atmosphere.build(floor, game.seed);
  assert.equal(
    atmosphere.group.getObjectByName("office-story-surface-0"),
    undefined,
  );
  const authored = atmosphere.group.getObjectByName("authored-scene")!;
  assert.equal(
    (authored.getObjectByName("authored-scene-labels") as InstancedMesh).count,
    0,
  );
  assert.ok(
    (authored.getObjectByName("authored-scene-box") as InstancedMesh).count > 0,
  );
  const context = atmosphere.group.getObjectByName("office-atmosphere-0")!;
  assert.equal(context.userData.furnishedObjects, 1);
  host.destroyed = true;
  atmosphere.build(floor, game.seed);
  assert.equal(
    atmosphere.group.getObjectByName("office-atmosphere-0")!.userData
      .furnishedObjects,
    1,
    "destroying a written desk must not select an unwritten replacement",
  );
  atmosphere.dispose();
});

test("narrow surfaces draw every expanded word and long unbroken title without ellipses", () => {
  const words: string[] = [],
    operations: string[] = [],
    base = {
      font: "12px sans-serif",
      measureText(value: string) {
        const size = Number(this.font.match(/[\d.]+(?=px)/)?.[0] ?? 12);
        return { width: [...value].length * size * 0.6 };
      },
      fillText(value: string) {
        words.push(value);
      },
    },
    ctx = new Proxy(base, {
      get(target, key) {
        if (key in target) return target[key as keyof typeof target];
        return (..._args: unknown[]) => operations.push(String(key));
      },
      set(target, key, value) {
        (target as any)[key] = value;
        return true;
      },
    }) as unknown as CanvasRenderingContext2D,
    surface = slot("narrow-title", 0.018, 0.12),
    content: SurfaceContent = {
      surfaceId: surface.id,
      layout: "mixed",
      title: [{ text: "UninterruptedLongPersonalInscription" }],
      body: [
        { text: "Every word including the last one " },
        { fragmentId: "shared" },
      ],
      description: "A red triangular route sketch beside the writing.",
      drawing: {
        version: 1,
        background: "transparent",
        primitives: [
          {
            kind: "polygon",
            points: [
              { x: 0.1, y: 0.1 },
              { x: 0.8, y: 0.1 },
              { x: 0.4, y: 0.9 },
            ],
            fill: "#cc4433",
            stroke: null,
            width: 0.01,
            opacity: 0.5,
          },
        ],
      },
    };
  paintEnvironmentSurface(
    ctx,
    surface,
    content,
    [
      {
        id: "shared",
        kind: "clue",
        text: "remains visible",
        reason: "Test",
        surfaces: [surface.id, "other"],
      },
    ],
    40,
    256,
  );
  assert.equal(
    words.join("").replace(/\s/g, ""),
    "UninterruptedLongPersonalInscriptionEverywordincludingthelastoneremainsvisible",
  );
  assert.ok(operations.includes("closePath") && operations.includes("clip"));
});
