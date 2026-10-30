import { mkdir } from "node:fs/promises";
import { expect, test } from "./helpers/offline-test";

test("fresh streets contain a visible approaching invasion, physical urban edges and bounded incident particles", async ({
  page,
}) => {
  // The synthetic renderer must survive concurrent source edits by agents;
  // no live bridge is used and Vite HMR is unnecessary in this fixture.
  await page.routeWebSocket("**/*", () => {});
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/lab.html");
  const result = await page.evaluate(async () => {
    const [{ FirstPersonView }, { createPlayableGame }, { cityWall }] =
        await Promise.all([
          import("/src/view3d/scene.ts" as string),
          import("/src/world.ts" as string),
          import("/src/city-layout.ts" as string),
        ]),
      roadmap = await (await fetch("/curriculum.json")).json(),
      game = createPlayableGame(42, roadmap),
      human = game.survivors[0],
      canvas = document.createElement("canvas");
    canvas.id = "neighbourhood-preview";
    Object.assign(canvas.style, {
      position: "fixed",
      inset: "0",
      width: "1280px",
      height: "800px",
      zIndex: "100000",
    });
    document.body.append(canvas);
    const view = new FirstPersonView(canvas);
    game.status = "playing";
    game.settings.reducedFlash = false;
    game.survivors = [human];
    Object.assign(human, { x: 22, y: 31.5, floor: 0 });
    view.render(game, Math.PI / 2, 0, 1 / 60);
    const pixels = (renderer: any) => {
        const gl = renderer.getContext(),
          data = new Uint8Array(
            gl.drawingBufferWidth * gl.drawingBufferHeight * 4,
          );
        gl.readPixels(
          0,
          0,
          gl.drawingBufferWidth,
          gl.drawingBufferHeight,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          data,
        );
        return {
          data,
          width: gl.drawingBufferWidth,
          height: gl.drawingBufferHeight,
        };
      },
      withHorde = pixels((view as any).renderer),
      emptyCanvas = document.createElement("canvas");
    Object.assign(emptyCanvas.style, {
      position: "fixed",
      left: "-2000px",
      width: "1280px",
      height: "800px",
    });
    document.body.append(emptyCanvas);
    const emptyView = new FirstPersonView(emptyCanvas);
    emptyView.render({ ...game, zombies: [] }, Math.PI / 2, 0, 1 / 60);
    const withoutHorde = pixels((emptyView as any).renderer);
    let hordePixels = 0;
    for (let y = withHorde.height / 2 - 50; y < withHorde.height / 2 + 50; y++)
      for (
        let x = withHorde.width / 2 - 100;
        x < withHorde.width / 2 + 100;
        x++
      ) {
        const i = (y * withHorde.width + x) * 4;
        if (
          Math.max(
            Math.abs(withHorde.data[i] - withoutHorde.data[i]),
            Math.abs(withHorde.data[i + 1] - withoutHorde.data[i + 1]),
            Math.abs(withHorde.data[i + 2] - withoutHorde.data[i + 2]),
          ) > 8
        )
          hordePixels++;
      }
    emptyView.dispose();
    emptyCanvas.remove();
    const smoke = view.scene.getObjectByName("incident-smoke-particles"),
      flames = view.scene.getObjectByName("incident-fire-particles"),
      before = Array.from(smoke.geometry.getAttribute("position").array),
      originalFloor = JSON.stringify(game.floors),
      originalRng = game.rng,
      visible = view.visibleActors,
      firstFront = Math.min(
        ...game.zombies.map((z: any) =>
          Math.hypot(z.x - human.x, z.y - human.y),
        ),
      );
    const { Raycaster, Vector3 } = await import(
        "/node_modules/three/build/three.module.js" as string
      ),
      incident = (view.exterior as any).incidents[0],
      ray = new Raycaster(
        new Vector3(
          incident.x + incident.nx * 5 - incident.nz * 0.1739,
          3.5,
          incident.z + incident.nz * 5 + incident.nx * 0.1739,
        ),
        new Vector3(-incident.nx, 0, -incident.nz),
        0,
        7,
      ),
      facadeHits = ray.intersectObject(
        view.scene.getObjectByName("merged-street-facade-props"),
        false,
      ),
      nearestFaces = facadeHits.filter(
        (h: any) => Math.abs(h.distance - facadeHits[0].distance) < 1e-5,
      ).length;
    const base = game.floors[0].city.obstacles.find(
        (o: any) => o.kind === "stair-base",
      ),
      foundation = view.scene.getObjectByName("ground-stair-concrete-base");
    if (!base || !foundation)
      throw Error("The physical lowest-flight support is missing");
    const foundationHeights = [0.2, 0.5, 0.8].map((t) => {
      const z = base.y - base.h / 2 + base.h * t,
        ray = new Raycaster(
          new Vector3(base.x, base.height + 3, z),
          new Vector3(0, -1, 0),
          0,
          10,
        ),
        hit = ray.intersectObject(foundation, false)[0];
      return { t, height: hit?.point.y, expected: base.height * t };
    });
    const underStairCityBox = new Raycaster(
      new Vector3(base.x, 10, base.y),
      new Vector3(0, -1, 0),
      0,
      12,
    )
      .intersectObject(
        view.scene.getObjectByName("merged-street-facade-props"),
        false,
      )
      .filter((h: any) => h.point.y > 0.1).length;
    view.exterior.update(5, false);
    const moved = Array.from(smoke.geometry.getAttribute("position").array);
    view.exterior.update(5, true);
    const reduced = Array.from(smoke.geometry.getAttribute("position").array);
    view.exterior.update(105, true);
    const reducedAfter = Array.from(
      smoke.geometry.getAttribute("position").array,
    );
    view.exterior.update(0, false);
    (window as any).__neighbourhood = {
      view,
      game,
      incident: (view.exterior as any).incidents[0],
      pixels,
    };
    return {
      city: !!game.floors[0].city,
      visible,
      hordePixels,
      nearestFaces,
      foundationOwner: foundation.parent.name,
      foundationHeights,
      underStairCityBox,
      zombies: game.zombies.length,
      firstFront,
      drawCalls: view.drawCalls,
      oldBorderOpen: cityWall(game.floors[0], 22, 34) === false,
      smoke: smoke.geometry.getAttribute("position").count,
      flames: flames.geometry.getAttribute("position").count,
      animated: JSON.stringify(before) !== JSON.stringify(moved),
      reducedStable: JSON.stringify(reduced) === JSON.stringify(reducedAfter),
      unchanged:
        originalFloor === JSON.stringify(game.floors) &&
        originalRng === game.rng,
    };
  });
  console.log("City neighbourhood proof", JSON.stringify(result));
  expect(result.city).toBe(true);
  expect(result.oldBorderOpen).toBe(true);
  expect(result.zombies).toBeGreaterThan(30);
  expect(result.visible).toBeGreaterThan(10);
  expect(result.hordePixels).toBeGreaterThan(10);
  expect(result.nearestFaces).toBe(1);
  expect(result.foundationOwner).toBe("continuous-stair-gallery");
  for (const hit of result.foundationHeights)
    expect(hit.height).toBeCloseTo(hit.expected, 5);
  expect(result.underStairCityBox).toBe(0);
  expect(result.firstFront).toBeGreaterThan(200);
  expect(result.drawCalls).toBeLessThan(90);
  expect(result.smoke).toBeLessThanOrEqual(72);
  expect(result.flames).toBeLessThanOrEqual(54);
  expect(result.animated).toBe(true);
  expect(result.reducedStable).toBe(true);
  expect(result.unchanged).toBe(true);
  await mkdir(".artifacts", { recursive: true });
  await page
    .locator("#neighbourhood-preview")
    .screenshot({ path: ".artifacts/city-invasion-avenue.png" });
  await page.evaluate(() => {
    const { view, game, incident } = (window as any).__neighbourhood;
    const a = game.survivors[0];
    a.x = incident.x + incident.nx * 5.5;
    a.y = incident.z + incident.nz * 5.5;
    view.render(game, Math.atan2(-incident.nz, -incident.nx), 0.1, 1 / 60);
  });
  await page
    .locator("#neighbourhood-preview")
    .screenshot({ path: ".artifacts/city-incidents-court.png" });
  const upper = await page.evaluate(async () => {
    const { view, game, pixels } = (window as any).__neighbourhood,
      { perimeterWindows } = await import("/src/view3d/building.ts" as string),
      floor = game.floors[2],
      opening = perimeterWindows(floor)
        .filter((w: any) => w.axis === "x" && w.normal === 1)
        .sort((a: any, b: any) => Math.abs(a.x - 22) - Math.abs(b.x - 22))[0],
      human = game.survivors[0];
    if (!opening) throw Error("No physical south-facing upper office window");
    Object.assign(human, { floor: 2, x: opening.x, y: opening.z - 1.1 });
    view.render(game, Math.PI / 2, -0.025, 1 / 60);
    const withHorde = pixels(view.renderer),
      ground = view.floorScenes.get(game.floors[0]);
    if (!ground) throw Error("Upper window has no real ground scene");
    for (const pool of ground.poolList) pool.mesh.visible = false;
    view.renderer.clear();
    view.renderer.render(view.scene, view.camera);
    const withoutHorde = pixels(view.renderer);
    let changed = 0;
    for (let i = 0; i < withHorde.data.length; i += 4)
      if (
        Math.max(
          Math.abs(withHorde.data[i] - withoutHorde.data[i]),
          Math.abs(withHorde.data[i + 1] - withoutHorde.data[i + 1]),
          Math.abs(withHorde.data[i + 2] - withoutHorde.data[i + 2]),
        ) > 8
      )
        changed++;
    for (const pool of ground.poolList) pool.mesh.visible = true;
    view.renderer.clear();
    view.renderer.render(view.scene, view.camera);
    return {
      changed,
      groundY: ground.root.position.y,
      cameraY: view.camera.position.y,
      opening,
    };
  });
  console.log("Upper window invasion proof", JSON.stringify(upper));
  expect(upper.changed).toBeGreaterThan(10);
  expect(upper.groundY).toBe(0);
  expect(upper.cameraY).toBeCloseTo(8.8, 5);
  await page
    .locator("#neighbourhood-preview")
    .screenshot({ path: ".artifacts/city-invasion-upper-window.png" });
  await page.evaluate(() => {
    const { view, game } = (window as any).__neighbourhood;
    Object.assign(game.survivors[0], {
      floor: game.floors.length - 1,
      x: 22,
      y: 16,
    });
    view.render(game, -Math.PI / 2, -0.1, 1 / 60);
  });
  await page
    .locator("#neighbourhood-preview")
    .screenshot({ path: ".artifacts/city-north-roof.png" });
  await page.evaluate(() => {
    const { view, game } = (window as any).__neighbourhood,
      base = game.floors[0].city.obstacles.find(
        (o: any) => o.kind === "stair-base",
      );
    Object.assign(game.survivors[0], { floor: 0, x: base.x + 5, y: base.y });
    view.render(game, Math.PI, 0.1, 1 / 60);
  });
  await page
    .locator("#neighbourhood-preview")
    .screenshot({ path: ".artifacts/city-stair-foundation.png" });
  await page.evaluate(() => (window as any).__neighbourhood.view.dispose());
});
