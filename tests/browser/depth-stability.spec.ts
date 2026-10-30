import { mkdir, writeFile } from "node:fs/promises";
import { expect, test } from "./helpers/offline-test";

test("small camera translations keep one stable surface on an emergency-gallery corner", async ({
  page,
}) => {
  await page.goto("/lab.html");
  const result = await page.evaluate(async () => {
    const [
        { FirstPersonView },
        { createPlayableGame },
        { buildStairRoute },
        three,
        { beginStairs },
      ] = await Promise.all([
        import("/src/view3d/scene.ts" as string),
        import("/src/world.ts" as string),
        import("/src/stair-route.ts" as string),
        import("/node_modules/three/build/three.module.js" as string),
        import("/src/stair-travel.ts" as string),
      ]),
      { Mesh, MeshBasicMaterial, Scene, Vector3, Raycaster } = three,
      roadmap = await (await fetch("/curriculum.json")).json(),
      game = createPlayableGame(42, roadmap),
      canvas = document.createElement("canvas");
    game.survivors = [game.survivors[0]];
    game.zombies = [];
    game.settings.reducedFlash = true;
    Object.assign(canvas.style, { width: "385px", height: "257px" });
    document.body.append(canvas);
    const view = new FirstPersonView(canvas);
    Object.assign(game.survivors[0], game.floors[0].stairs);
    game.survivors[0].access = [0];
    if (!beginStairs(game, game.survivors[0], false, true))
      throw Error("Synthetic walking flight could not start");
    view.render(game, -Math.PI / 2, 0, 1 / 60);
    view.renderer.setPixelRatio(1);
    view.renderer.setSize(385, 257, false);
    view.camera.aspect = 385 / 257;
    view.camera.updateProjectionMatrix();
    const route = buildStairRoute(game, {
        fromFloor: 0,
        toFloor: 1,
        origin: game.floors[0].stairs,
        destination: game.floors[1].entry,
        until: 0,
      }),
      corner = route.points[2],
      target = new Vector3(corner.x - 0.453, corner.y, corner.z - 0.317),
      deck = view.scene.getObjectByName("stair-decks-and-treads");
    if (!deck) throw Error("The rendered stair gallery is missing");
    view.scene.updateMatrixWorld(true);
    const architecture: any[] = [],
      architectureObstructions: {
        segment: number;
        height: number;
        mesh: string;
        point: number[];
      }[] = [];
    view.scene.traverse((object: any) => {
      if (
        object.isMesh &&
        [
          "walls",
          "facade-structure",
          "merged-street-facade-props",
          "stair-support-columns",
        ].includes(object.name)
      )
        architecture.push(object);
    });
    for (let i = 0; i < route.points.length - 1; i++) {
      const a = route.points[i],
        b = route.points[i + 1],
        direction = new Vector3(b.x - a.x, b.y - a.y, b.z - a.z),
        length = direction.length();
      direction.normalize();
      const side = new Vector3(-direction.z, 0, direction.x).normalize();
      for (const height of [0.5, 1.3, 1.65])
        for (const lateral of [-0.23, 0, 0.23]) {
          const origin = new Vector3(a.x, a.y + height, a.z)
              .addScaledVector(side, lateral)
              .addScaledVector(direction, 0.01),
            hits = new Raycaster(
              origin,
              direction,
              0,
              length - 0.02,
            ).intersectObjects(architecture, false);
          for (const hit of hits)
            architectureObstructions.push({
              segment: i,
              height,
              mesh: hit.object.name,
              point: hit.point.toArray(),
            });
        }
    }
    const diagnostic = new Scene(),
      material = new MeshBasicMaterial({
        vertexColors: true,
        toneMapped: false,
      });
    // Keep the renderer's actual merged geometry and depth projection. Unlit
    // vertex colors identify which architectural face wins, excluding moving
    // lights, texture filtering and other legitimate image changes.
    diagnostic.add(new Mesh(deck.geometry, material));
    const colors = new Map<string, number[]>(),
      captures: { name: string; image: string }[] = [],
      gl = view.renderer.getContext(),
      pixel = new Uint8Array(4);
    for (let i = 0; i < 81; i++) {
      view.camera.position.set(
        corner.x - 3.5 + ((i % 9) - 4) * 0.006,
        corner.y + 1.6,
        corner.z - 0.7 + (Math.floor(i / 9) - 4) * 0.006,
      );
      view.camera.lookAt(target);
      if (i === 0) {
        view.renderer.clear();
        view.renderer.render(view.scene, view.camera);
        captures.push({
          name: "depth-corner-world",
          image: canvas.toDataURL(),
        });
      }
      view.renderer.clear();
      view.renderer.render(diagnostic, view.camera);
      gl.readPixels(192, 128, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      const key = [...pixel.slice(0, 3)].join(",");
      if (!colors.has(key)) {
        colors.set(key, [...pixel.slice(0, 3)]);
        if (captures.length < 5)
          captures.push({
            name: `depth-corner-surface-${colors.size}`,
            image: canvas.toDataURL(),
          });
      }
    }
    deck.updateMatrixWorld(true);
    const hits = new Raycaster(
        new Vector3(target.x, target.y + 1, target.z),
        new Vector3(0, -1, 0),
        0,
        1.1,
      )
        .intersectObject(deck, false)
        .filter((hit: any) => hit.face.normal.y > 0.9),
      nearest = hits[0]?.point.y,
      competingTopFaces = hits.filter(
        (hit: any) => Math.abs(hit.point.y - nearest) < 0.0001,
      ).length,
      report = {
        frames: 81,
        cameraTranslation: 0.048,
        target: target.toArray(),
        colors: [...colors.values()],
        competingTopFaces,
        surfaceHeights: hits.map((hit: any) => hit.point.y),
        architectureObstructions,
        depthBits: gl.getParameter(gl.DEPTH_BITS) as number,
        near: view.camera.near as number,
        far: view.camera.far as number,
      };
    material.dispose();
    view.dispose();
    return { report, captures };
  });
  await mkdir(".artifacts", { recursive: true });
  for (const capture of result.captures)
    await writeFile(
      `.artifacts/${capture.name}.png`,
      Buffer.from(capture.image.split(",")[1], "base64"),
    );
  await writeFile(
    ".artifacts/depth-corner-report.json",
    JSON.stringify(result.report, null, 2),
  );
  expect(result.report.colors, JSON.stringify(result.report)).toHaveLength(1);
  expect(result.report.competingTopFaces, JSON.stringify(result.report)).toBe(
    1,
  );
  expect(result.report.architectureObstructions).toEqual([]);
});

test("real floor finishes remain visible above structural slabs and outdoor ground is drawn once", async ({
  page,
}) => {
  await page.goto("/lab.html");
  const result = await page.evaluate(async () => {
    const [{ FirstPersonView }, { createPlayableGame }, { cityLayout }, three] =
        await Promise.all([
          import("/src/view3d/scene.ts" as string),
          import("/src/world.ts" as string),
          import("/src/view3d/exterior-layout.ts" as string),
          import("/node_modules/three/build/three.module.js" as string),
        ]),
      { MeshBasicMaterial, Raycaster, Vector3 } = three,
      roadmap = await (await fetch("/curriculum.json")).json(),
      game = createPlayableGame(42, roadmap),
      actor = game.survivors[0],
      canvas = document.createElement("canvas");
    game.survivors = [actor];
    game.zombies = [];
    game.settings.reducedFlash = true;
    Object.assign(canvas.style, { width: "385px", height: "257px" });
    document.body.append(canvas);
    const view = new FirstPersonView(canvas),
      highlight = new MeshBasicMaterial({
        color: "#ff00ff",
        toneMapped: false,
        fog: false,
      }),
      floors: {
        floor: number;
        pixel: number[];
        nearest: string;
        slabClearance: number;
      }[] = [];
    const clearPoint = (floor: any) => {
      for (let z = floor.boundary.top + 2; z < floor.boundary.bottom - 2; z++)
        for (
          let x = floor.boundary.rows[z].left + 2;
          x < floor.boundary.rows[z].right - 2;
          x++
        ) {
          const p = { x: x + 0.453, z: z + 0.317 };
          if (floor.tiles[z][x] !== 0) continue;
          if (
            floor.furniture.some(
              (o: any) =>
                Math.hypot(o.x - p.x, o.y - p.z) <
                Math.hypot(o.w, o.h) / 2 + 0.7,
            )
          )
            continue;
          if (
            floor.stations.some(
              (s: any) => Math.hypot(s.x - p.x, s.y - p.z) < 1.1,
            )
          )
            continue;
          return p;
        }
      throw Error(`No isolated floor sample on floor ${floor.index}`);
    };
    for (const index of [0, 2, 4]) {
      const floor = game.floors[index],
        point = clearPoint(floor),
        base = index * 3.6;
      Object.assign(actor, { floor: index, x: point.x, y: point.z });
      view.render(game, 0, -1.4, 1 / 60);
      view.renderer.setPixelRatio(1);
      view.renderer.setSize(385, 257, false);
      view.camera.aspect = 385 / 257;
      view.camera.updateProjectionMatrix();
      view.camera.position.set(point.x, base + 1.6, point.z);
      view.camera.lookAt(point.x, base, point.z);
      view.scene.updateMatrixWorld(true);
      const surfaces: any[] = [];
      view.scene.traverse((object: any) => {
        if (!object.isMesh || object.isInstancedMesh) return;
        if (object.name === "facade-structure" || object.name === "floor")
          surfaces.push(object);
      });
      const hits = new Raycaster(
          new Vector3(point.x, base + 1.6, point.z),
          new Vector3(0, -1, 0),
          0,
          2,
        ).intersectObjects(surfaces, false),
        finish = hits.find((hit: any) => hit.object.name === "floor"),
        slab = hits.find((hit: any) => hit.object.name === "facade-structure"),
        floorMeshes = view.floorScenes
          .get(floor)
          .staticWorld.children.filter(
            (object: any) => object.name === "floor",
          ),
        materials = floorMeshes.map((mesh: any) => mesh.material);
      // A color-ID draw of the actual complete scene proves the finish wins
      // the GPU depth test; a nearer duplicate slab would hide this signal.
      for (const mesh of floorMeshes) mesh.material = highlight;
      view.renderer.clear();
      view.renderer.render(view.scene, view.camera);
      const gl = view.renderer.getContext(),
        pixel = new Uint8Array(4);
      gl.readPixels(192, 128, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      floors.push({
        floor: index,
        pixel: [...pixel.slice(0, 3)],
        nearest: hits[0]?.object.name ?? "missing",
        slabClearance: finish && slab ? finish.point.y - slab.point.y : -1,
      });
      floorMeshes.forEach(
        (mesh: any, i: number) => (mesh.material = materials[i]),
      );
    }
    Object.assign(actor, { floor: 0, x: 22, y: 32 });
    view.render(game, Math.PI / 2, 0, 1 / 60);
    view.scene.updateMatrixWorld(true);
    const city = cityLayout(game.floors[0]),
      baseSurfaces: any[] = [];
    view.scene.traverse((object: any) => {
      if (
        object.isMesh &&
        ["floor", "asphalt-street", "continuous-city-ground"].includes(
          object.name,
        )
      )
        baseSurfaces.push(object);
    });
    const outdoors = [
      { name: "arrival lane", x: 19.453, z: 31.317 },
      { name: "east street", x: city.right + 9.453, z: 16.317 },
      { name: "west street", x: city.left - 9.453, z: 16.317 },
      { name: "north street", x: 22.453, z: city.north - 8.317 },
    ].map((p) => {
      const hits = new Raycaster(
          new Vector3(p.x, 0.8, p.z),
          new Vector3(0, -1, 0),
          0,
          1.2,
        ).intersectObjects(baseSurfaces, false),
        surfaces = [
          ...new Map(
            hits.map((hit: any) => [
              hit.object.uuid,
              { mesh: hit.object.name, height: hit.point.y },
            ]),
          ).values(),
        ];
      return { name: p.name, surfaces };
    });
    highlight.dispose();
    view.dispose();
    return { floors, outdoors };
  });
  await mkdir(".artifacts", { recursive: true });
  await writeFile(
    ".artifacts/depth-world-surfaces-report.json",
    JSON.stringify(result, null, 2),
  );
  for (const floor of result.floors) {
    expect(floor.nearest, JSON.stringify(floor)).toBe("floor");
    expect(floor.pixel, JSON.stringify(floor)).toEqual([255, 0, 255]);
    expect(floor.slabClearance, JSON.stringify(floor)).toBeGreaterThanOrEqual(
      0.04,
    );
  }
  for (const outdoor of result.outdoors)
    expect(outdoor.surfaces, JSON.stringify(outdoor)).toHaveLength(1);
});
