import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "./helpers/offline-test";

/** An isolated renderer and a fresh, memory-only world. No player saves,
 * learner data, bridge requests or running game are involved in these views. */
async function createCityPreview(page: Page) {
  await page.goto("/lab.html");
  return page.evaluate(async () => {
    const [
      { FirstPersonView },
      { createPlayableGame },
      building,
      { FLOOR_HEIGHT },
    ] = await Promise.all([
      import("/src/view3d/scene.ts" as string),
      import("/src/world.ts" as string),
      import("/src/view3d/building.ts" as string),
      import("/src/stair-route.ts" as string),
    ]);
    const roadmap = await (await fetch("/curriculum.json")).json(),
      game = createPlayableGame(42, roadmap),
      actor = game.survivors[0],
      canvas = document.createElement("canvas");
    game.survivors = [actor];
    game.zombies = [];
    game.settings.reducedFlash = true;
    game.settings.view = "first-person";
    canvas.id = "city-preview";
    Object.assign(canvas.style, {
      position: "fixed",
      inset: "0",
      width: "1280px",
      height: "800px",
      zIndex: "100000",
    });
    document.body.append(canvas);
    const view = new FirstPersonView(canvas),
      before = JSON.stringify({
        floors: game.floors,
        rng: game.rng,
      });
    (window as any).__cityPreview = {
      view,
      game,
      before,
      building,
      floorHeight: FLOOR_HEIGHT,
    };
    return { floorHeight: FLOOR_HEIGHT, floorCount: game.floors.length };
  });
}

async function renderPose(
  page: Page,
  pose: { floor: number; x: number; z: number; yaw: number; pitch: number },
) {
  return page.evaluate((pose) => {
    const { game, view } = (window as any).__cityPreview,
      actor = game.survivors[0];
    Object.assign(actor, { floor: pose.floor, x: pose.x, y: pose.z });
    view.render(game, pose.yaw, pose.pitch, 1 / 60);
    return {
      camera: view.camera.position.toArray() as number[],
      drawCalls: view.drawCalls as number,
      exterior: !!view.exterior.enabled,
    };
  }, pose);
}

async function architectureGeometry(page: Page) {
  return page.evaluate(() => {
    const { view } = (window as any).__cityPreview;
    return [
      "merged-street-facade-props",
      "facade-structure",
      "stair-decks-and-treads",
    ].map((name) => ({
      name,
      geometry: view.scene.getObjectByName(name)?.geometry.uuid as
        string | undefined,
    }));
  });
}

test("the city surrounds a full-height building with real perimeter sightlines and no flashlight", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 800 });
  const setup = await createCityPreview(page),
    ground = await page.evaluate(() => {
      const f = (window as any).__cityPreview.game.floors[0];
      return { floor: 0, x: 22, z: f.boundary.bottom + 4, yaw: -Math.PI / 2 };
    });
  const entrance = await renderPose(page, { ...ground, pitch: 0.04 });
  expect(entrance.exterior).toBe(true);
  expect(entrance.camera[1]).toBeCloseTo(1.6, 5);
  expect(entrance.drawCalls).toBeGreaterThan(0);
  const architecture = await architectureGeometry(page);
  expect(architecture.every((mesh) => !!mesh.geometry)).toBe(true);
  await mkdir(".artifacts", { recursive: true });
  await page
    .locator("#city-preview")
    .screenshot({ path: ".artifacts/city-entrance.png" });

  await renderPose(page, { ...ground, x: 19.5, pitch: 0.72 });
  await page
    .locator("#city-preview")
    .screenshot({ path: ".artifacts/city-height.png" });

  await renderPose(page, {
    ...ground,
    yaw: Math.PI / 2,
    pitch: -0.03,
  });
  await page
    .locator("#city-preview")
    .screenshot({ path: ".artifacts/city-street.png" });

  const windows = await page.evaluate(async () => {
    const { game, building } = (window as any).__cityPreview,
      { wall } = await import("/src/spatial.ts" as string),
      f = game.floors[2],
      openings = building.perimeterWindows(f) as {
        x: number;
        z: number;
        axis: "x" | "z";
        normal: -1 | 1;
      }[];
    return {
      openings,
      sides: [...new Set(openings.map((w) => `${w.axis}/${w.normal}`))],
      allPhysicallySolid: openings.every((w) => wall(f, w.x, w.z)),
    };
  });
  expect(windows.sides.sort()).toEqual(["x/-1", "x/1", "z/-1", "z/1"]);
  expect(windows.allPhysicallySolid).toBe(true);
  const opening = windows.openings.find(
    (w) => w.axis === "z" && w.normal === 1,
  )!;
  const nx = opening.axis === "z" ? opening.normal : 0,
    nz = opening.axis === "x" ? opening.normal : 0;
  const windowPose = {
    floor: 2,
    x: opening.x - nx * 1.1,
    z: opening.z - nz * 1.1,
    yaw: Math.atan2(nz, nx),
    pitch: 0,
  };
  const upper = await renderPose(page, windowPose);
  expect(upper.exterior).toBe(true);
  expect(upper.camera[1]).toBeCloseTo(2 * setup.floorHeight + 1.6, 5);
  expect(await architectureGeometry(page)).toEqual(architecture);
  await page
    .locator("#city-preview")
    .screenshot({ path: ".artifacts/city-window.png" });

  const geometry = await page.evaluate(async () => {
    const { game, view, building, floorHeight, before } = (window as any)
        .__cityPreview,
      { Box3, Raycaster, Vector3 } = await import(
        "/node_modules/three/build/three.module.js" as string
      ),
      f = game.floors[2],
      openings = building.perimeterWindows(f),
      opaque: any[] = [];
    let spotlights = 0;
    view.scene.updateMatrixWorld(true);
    view.scene.traverse((object: any) => {
      if (object.isSpotLight) spotlights++;
      if (!object.isMesh || object.isInstancedMesh) return;
      // Test architectural occlusion, rather than a decorative lamp or prop.
      if (
        !["walls", "facade-structure", "facade-window-frames"].includes(
          object.name,
        )
      )
        return;
      opaque.push(object);
    });
    const sides: Record<string, { sill: boolean; clear: boolean }> = {};
    for (const w of openings) {
      const nx = w.axis === "z" ? w.normal : 0,
        nz = w.axis === "x" ? w.normal : 0,
        direction = new Vector3(nx, 0, nz),
        ray = (height: number) =>
          new Raycaster(
            new Vector3(
              w.x - nx * 1.1,
              2 * floorHeight + height,
              w.z - nz * 1.1,
            ),
            direction,
            0,
            2.2,
          ).intersectObjects(opaque, false),
        result = { sill: ray(0.4).length > 0, clear: ray(1.6).length === 0 },
        side = `${w.axis}/${w.normal}`;
      if (result.sill && result.clear) sides[side] = result;
    }
    const shell = view.scene.getObjectByName("building-shell"),
      bounds = shell ? new Box3().setFromObject(shell) : null;
    return {
      spotlights,
      openSides: Object.keys(sides).sort(),
      shellHeight: bounds ? bounds.max.y - bounds.min.y : 0,
      unchanged:
        before === JSON.stringify({ floors: game.floors, rng: game.rng }),
      fogFar: view.scene.fog.far as number,
    };
  });
  expect(geometry.spotlights).toBe(1); // Automatic phone light; no held flashlight.
  expect(geometry.openSides).toEqual(["x/-1", "x/1", "z/-1", "z/1"]);
  expect(geometry.shellHeight).toBeGreaterThanOrEqual(
    (setup.floorCount - 1) * setup.floorHeight,
  );
  expect(geometry.fogFar).toBeGreaterThan(60);
  expect(geometry.unchanged).toBe(true);

  const roof = await renderPose(page, {
    floor: setup.floorCount - 1,
    x: 22,
    z: 15,
    yaw: 0,
    pitch: -0.08,
  });
  expect(roof.exterior).toBe(true);
  expect(roof.camera[1]).toBeCloseTo(
    (setup.floorCount - 1) * setup.floorHeight + 1.6,
    5,
  );
  expect(await architectureGeometry(page)).toEqual(architecture);
  await page
    .locator("#city-preview")
    .screenshot({ path: ".artifacts/city-roof.png" });
  expect(errors).toEqual([]);
  await page.evaluate(() => (window as any).__cityPreview.view.dispose());
});

test("live first-person keyboard movement starts a walking flight, stops on release and reverses out", async ({
  page,
}) => {
  // Keep this an actual first-person main.ts input test on hosts where native
  // pointer capture is unavailable. Keyboard turning/movement remains usable.
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.requestPointerLock = () =>
      Promise.reject(
        new DOMException("Synthetic capture refusal", "SecurityError"),
      );
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Enter the building" }).click();
  await expect(page.locator("#view3d")).toBeVisible();
  await page.evaluate(() => {
    const d = (window as any).__deadAir,
      game = d.game,
      actor = game.survivors[0],
      stairs = game.floors[0].stairs;
    game.survivors = [actor];
    game.zombies = [];
    game.nextSpawn = Number.MAX_SAFE_INTEGER;
    game.surge.anchor = Number.MAX_SAFE_INTEGER;
    actor.access = [0];
    Object.assign(actor, { floor: 0, x: stairs.x, y: stairs.y + 2 });
    delete actor.stairTravel;
    delete actor.stairwell;
    delete actor.physics;
    d.setLook(-Math.PI / 2, 0);
    (window as any).__continuousStairCanvas = document.querySelector("#view3d");
  });
  await page.locator("#view3d").focus();
  await page.keyboard.down("w");
  const observed = await page.waitForFunction(() => {
    const game = (window as any).__deadAir.game,
      actor = game.survivors[0];
    if (!(actor.stairTravel?.walked > 0.05)) return false;
    // Release on the observing frame so the automation round trip cannot add
    // more walking distance before the idle-state assertion begins.
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
    (window as any).__continuousStairIdleAt = game.time;
    return { floor: actor.floor, walked: actor.stairTravel.walked as number };
  });
  await page.keyboard.up("w");
  const started = await observed.jsonValue();
  if (!started)
    throw Error("Actual first-person KeyW did not start a walking flight");
  expect(started.floor).toBe(0);
  await page.waitForFunction(
    () =>
      (window as any).__deadAir.game.time >=
      (window as any).__continuousStairIdleAt + 3,
  );
  const idle = await page.evaluate(() => {
    const game = (window as any).__deadAir.game,
      actor = game.survivors[0];
    return {
      floor: actor.floor,
      walked: actor.stairTravel?.walked as number | undefined,
      firstPerson: game.settings.view !== "top-down",
      sameCanvas:
        document.querySelector("#view3d") ===
        (window as any).__continuousStairCanvas,
    };
  });
  expect(idle).toEqual({ ...started, firstPerson: true, sameCanvas: true });
  await expect(page.locator("#view3d")).toBeVisible();
  await expect(page.locator("#pause-menu")).toBeHidden();

  await page.keyboard.down("s");
  await page.waitForFunction(() => {
    const actor = (window as any).__deadAir.game.survivors[0];
    if (actor.stairTravel) return false;
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyS" }));
    return true;
  });
  await page.keyboard.up("s");
  const reversed = await page.evaluate(() => {
    const game = (window as any).__deadAir.game,
      actor = game.survivors[0];
    return {
      floor: actor.floor,
      traveling: !!actor.stairTravel,
      notice: game.notice,
    };
  });
  expect(reversed.floor).toBe(0);
  expect(reversed.traveling).toBe(false);
  expect(reversed.notice).toMatch(/left the staircase/);
});

test("continuous stairs show supported treads, clear turns and the real next floor before arrival", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 800 });
  await createCityPreview(page);
  const geometry = await page.evaluate(async () => {
    const { game, view } = (window as any).__cityPreview,
      [
        { beginStairs, advanceStairs },
        { buildStairRoute, sampleStairRoute },
        three,
      ] = await Promise.all([
        import("/src/stair-travel.ts" as string),
        import("/src/stair-route.ts" as string),
        import("/node_modules/three/build/three.module.js" as string),
      ]),
      { Raycaster, Vector3 } = three,
      actor = game.survivors[0];
    Object.assign(actor, game.floors[0].stairs);
    actor.access = [0];
    if (!beginStairs(game, actor, false, true))
      throw Error("Synthetic credentialed survivor could not enter the stairs");
    const travel = actor.stairTravel,
      route = buildStairRoute(game, travel),
      dt = 1 / 60,
      stride = actor.speed * dt,
      offsets = [0];
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1],
        b = route.points[i];
      offsets.push(
        offsets[i - 1] + Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z),
      );
    }
    let maxCameraError = 0,
      maxCameraStep = 0;
    const childCount = document.body.childElementCount;
    const renderAt = (walked: number, pitch = -0.12) => {
      travel.walked = walked;
      const pose = sampleStairRoute(game, travel);
      actor.x = pose.x;
      actor.y = pose.z;
      view.render(game, Math.atan2(pose.tangent.y, pose.tangent.x), pitch, dt);
      maxCameraError = Math.max(
        maxCameraError,
        Math.hypot(
          view.camera.position.x - pose.x,
          view.camera.position.y - pose.y - 1.6,
          view.camera.position.z - pose.z,
        ),
      );
      return view.camera.position.clone();
    };
    // Before, on and after every actual corner and flight/landing boundary:
    // each presented frame moves at the player's ordinary walking speed.
    for (const boundary of offsets.slice(1, -1)) {
      let previous: any;
      for (const walked of [boundary - stride, boundary, boundary + stride]) {
        const camera = renderAt(walked);
        if (previous)
          maxCameraStep = Math.max(maxCameraStep, camera.distanceTo(previous));
        previous = camera;
      }
    }
    renderAt(offsets[2] + (offsets[3] - offsets[2]) * 0.5);
    const gallery = view.scene.getObjectByName("continuous-stair-gallery"),
      decks = gallery?.getObjectByName("stair-decks-and-treads"),
      rails = gallery?.getObjectByName("stair-handrails"),
      guards = gallery?.getObjectByName("stair-glass-guards");
    if (!decks || !rails || !guards)
      throw Error("Continuous staircase structure is missing");
    view.scene.updateMatrixWorld(true);
    const pathObstructions: {
      segment: number;
      mesh: string;
      point: number[];
    }[] = [];
    for (let i = 0; i < route.points.length - 1; i++) {
      const a = route.points[i],
        b = route.points[i + 1],
        direction = new Vector3(b.x - a.x, b.y - a.y, b.z - a.z),
        length = direction.length();
      direction.normalize();
      const origin = new Vector3(a.x, a.y + 0.7, a.z).addScaledVector(
          direction,
          0.01,
        ),
        hits = new Raycaster(
          origin,
          direction,
          0,
          length - 0.02,
        ).intersectObjects([rails, guards], false);
      for (const hit of hits)
        pathObstructions.push({
          segment: i,
          mesh: hit.object.name,
          point: hit.point.toArray(),
        });
    }
    const stairStart = route.points[2],
      stairEnd = route.points[3],
      treadHeights: number[] = [];
    for (let j = 0; j < 20; j++) {
      const t = (j + 0.5) / 20,
        expected = stairStart.y + ((stairEnd.y - stairStart.y) * (j + 1)) / 20,
        ray = new Raycaster(
          new Vector3(
            stairStart.x + (stairEnd.x - stairStart.x) * t,
            expected + 0.5,
            stairStart.z + (stairEnd.z - stairStart.z) * t,
          ),
          new Vector3(0, -1, 0),
          0,
          1,
        ),
        hit = ray.intersectObject(decks, false)[0];
      if (!hit) throw Error(`Missing physical-looking stair tread ${j + 1}`);
      treadHeights.push(hit.point.y);
    }
    const halfway = sampleStairRoute(
        game,
        travel,
        offsets[2] + (offsets[3] - offsets[2]) * 0.5,
      ),
      side = new Vector3(-halfway.tangent.y, 0, halfway.tangent.x),
      guardHits = [-1, 1].map(
        (sign) =>
          new Raycaster(
            new Vector3(halfway.x, halfway.y + 0.65, halfway.z),
            side.clone().multiplyScalar(sign),
            0,
            1.1,
          ).intersectObjects([rails, guards], false).length > 0,
      ),
      destination = view.floorScenes.get(game.floors[1]),
      source = view.floorScenes.get(game.floors[0]);
    Object.assign((window as any).__cityPreview, {
      travel,
      route,
      offsets,
      renderAt,
      advanceStairs,
      destinationRoot: destination?.root,
    });
    return {
      maxCameraError,
      maxCameraStep,
      stride,
      treadHeights,
      guardHits,
      pathObstructions,
      sourceVisible: !!source?.root.visible,
      destinationVisible: !!destination?.root.visible,
      destinationMeshes: destination?.staticWorld.children.length ?? 0,
      sourceFloor: actor.floor,
      domUnchanged: document.body.childElementCount === childCount,
    };
  });
  expect(geometry.maxCameraError).toBeLessThan(1e-7);
  expect(geometry.maxCameraStep).toBeLessThanOrEqual(geometry.stride + 1e-7);
  expect(geometry.pathObstructions).toEqual([]);
  expect(geometry.guardHits).toEqual([true, true]);
  for (let i = 0; i < geometry.treadHeights.length; i++)
    expect(geometry.treadHeights[i]).toBeCloseTo(((i + 1) * 3.6) / 20, 4);
  expect(geometry.sourceVisible).toBe(true);
  expect(geometry.destinationVisible).toBe(true);
  expect(geometry.destinationMeshes).toBeGreaterThan(0);
  expect(geometry.sourceFloor).toBe(0);
  expect(geometry.domUnchanged).toBe(true);
  await mkdir(".artifacts", { recursive: true });
  await page.evaluate(() => {
    const { offsets, renderAt } = (window as any).__cityPreview;
    renderAt(offsets[2] + (offsets[3] - offsets[2]) * 0.35, -0.18);
  });
  await page
    .locator("#city-preview")
    .screenshot({ path: ".artifacts/city-stair-flight.png" });
  await page.evaluate(() => {
    const { offsets, renderAt } = (window as any).__cityPreview;
    renderAt(offsets[3] + (offsets[4] - offsets[3]) * 0.45, -0.1);
  });
  await page
    .locator("#city-preview")
    .screenshot({ path: ".artifacts/city-gallery.png" });

  const arrival = await page.evaluate(() => {
    const { game, view, route, renderAt, advanceStairs, destinationRoot } = (
        window as any
      ).__cityPreview,
      actor = game.survivors[0],
      before = renderAt(route.length);
    advanceStairs(game, actor);
    view.render(game, -Math.PI / 2, 0, 1 / 60);
    return {
      floor: actor.floor,
      traveling: !!actor.stairTravel,
      cameraJump: view.camera.position.distanceTo(before),
      sameDestinationScene:
        view.floorScenes.get(game.floors[1]).root === destinationRoot,
      destinationVisible: destinationRoot.visible as boolean,
    };
  });
  expect(arrival).toEqual({
    floor: 1,
    traveling: false,
    cameraJump: 0,
    sameDestinationScene: true,
    destinationVisible: true,
  });
  expect(errors).toEqual([]);
  await page.evaluate(() => (window as any).__cityPreview.view.dispose());
});
