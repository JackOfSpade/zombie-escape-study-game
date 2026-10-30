import { mkdir, writeFile } from "node:fs/promises";
import { expect, test } from "./helpers/offline-test";

test("real office lights, personal effects and wall stories survive phone raise/stow through a lit-dark-lit walk", async ({
  page,
}) => {
  // This memory-only imported-source preview needs no live service or hot
  // reload socket; hold its scene steady throughout the visual comparison.
  await page.routeWebSocket("**/*", () => {});
  await page.goto("/lab.html");
  await page.setViewportSize({ width: 1100, height: 760 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const proof = await page.evaluate(async () => {
    const [
      { FirstPersonView },
      { createPlayableGame },
      { buildInteriorLighting, lightAt },
      { solid },
      { Raycaster, Vector3 },
      { playerCanSee },
    ] = await Promise.all([
      import("/src/view3d/scene.ts" as string),
      import("/src/world.ts" as string),
      import("/src/interior-lighting.ts" as string),
      import("/src/spatial.ts" as string),
      import("/node_modules/three/build/three.module.js" as string),
      import("/src/visibility.ts" as string),
    ]);
    const roadmap = await (await fetch("/curriculum.json")).json(),
      game = createPlayableGame(42, roadmap),
      actor = game.survivors[0],
      floor = game.floors[0],
      canvas = document.createElement("canvas");
    game.survivors = [actor];
    game.zombies = [];
    game.status = "playing";
    game.settings.reducedFlash = true;
    const before = JSON.stringify({
      floors: game.floors,
      study: game.study,
      rng: game.rng,
    });
    canvas.id = "office-atmosphere-preview";
    Object.assign(canvas.style, {
      position: "fixed",
      inset: "0",
      width: "1100px",
      height: "760px",
      zIndex: "100000",
    });
    document.body.append(canvas);
    const view = new FirstPersonView(canvas),
      plan = buildInteriorLighting(floor, game.seed),
      positions = floor.tiles.flatMap((row: number[], y: number) =>
        row.flatMap((tile: number, x: number) =>
          tile === 0 &&
          y >= floor.boundary.top &&
          y < floor.boundary.bottom &&
          x >= floor.boundary.rows[y].left &&
          x < floor.boundary.rows[y].right &&
          !solid(floor, { x: x + 0.5, y: y + 0.5 }, 0.3)
            ? [{ x: x + 0.5, y: y + 0.5 }]
            : [],
        ),
      ),
      visibleDesks = (p: any) =>
        floor.furniture.filter(
          (o: any) =>
            ["desk", "whiteboard", "table"].includes(o.kind) &&
            playerCanSee(floor, p, o, 7),
        ),
      score = (p: any) =>
        Math.min(
          100,
          ...visibleDesks(p).map((o: any) => {
            const d = Math.hypot(o.x - p.x, o.y - p.y);
            return d < 1.5 ? 50 : Math.abs(d - 2.7);
          }),
        ),
      dark = positions
        .filter((p: any) => lightAt(plan, p) < 0.2)
        .sort((a: any, b: any) => score(a) - score(b))[0],
      lit = positions
        .filter((p: any) => lightAt(plan, p) > 0.7)
        .sort((a: any, b: any) => score(a) - score(b))[0];
    if (!dark || !lit)
      throw Error("Synthetic office needs accessible powered and outage zones");
    const near = positions
      .filter((p: any) => lightAt(plan, p) < 0.2)
      .flatMap((p: any) =>
        [
          [0, 1],
          [1, 0],
          [0, -1],
          [-1, 0],
        ].flatMap(([dx, dy]) =>
          floor.tiles[Math.floor(p.y) + dy]?.[Math.floor(p.x) + dx] === 1
            ? [{ point: p, target: { x: p.x + dx, y: p.y + dy, height: 1.6 } }]
            : [],
        ),
      )[0];
    if (!near)
      throw Error("Synthetic outage needs a body-valid near-wall pose");
    async function renderAt(
      p: any,
      frames: number,
      look?: { x: number; y: number; height: number },
    ) {
      Object.assign(actor, p);
      const desk = visibleDesks(p).sort(
          (a: any, b: any) =>
            Math.abs(Math.hypot(a.x - p.x, a.y - p.y) - 2.7) -
            Math.abs(Math.hypot(b.x - p.x, b.y - p.y) - 2.7),
        )[0],
        target =
          look ??
          (desk
            ? {
                x: desk.x,
                y: desk.y,
                height: desk.kind === "whiteboard" ? 1.15 : 0.86,
              }
            : { x: p.x + 3, y: p.y, height: 1.6 }),
        yaw = Math.atan2(target.y - p.y, target.x - p.x),
        pitch = Math.atan2(
          target.height - 1.6,
          Math.hypot(target.x - p.x, target.y - p.y),
        );
      for (let i = 0; i < frames; i++) view.render(game, yaw, pitch, 0.1);
      await view.renderer.compileAsync((view as any).scene, view.camera);
      view.render(game, yaw, pitch, 0);
      const atmosphere = (view as any).atmosphere;
      const direction = view.camera.getWorldDirection(new Vector3());
      const hits =
        p === dark || look
          ? new Raycaster(view.camera.position, direction, 0.1, 10)
              .intersectObject((view as any).scene, true)
              .slice(0, 8)
              .map((hit: any) => ({
                name: hit.object.name,
                parent: hit.object.parent?.name,
                distance: hit.distance,
                point: hit.point.toArray(),
              }))
          : [];
      const gl = view.renderer.getContext(),
        width = gl.drawingBufferWidth,
        height = gl.drawingBufferHeight,
        pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let count = 0,
        visible = 0,
        total = 0;
      // The upper/middle world, excluding the phone/hand in the lower right.
      // This is actual framebuffer energy, not light settings or draw calls.
      for (let y = Math.floor(height * 0.45); y < Math.floor(height * 0.9); y++)
        for (
          let x = Math.floor(width * 0.05);
          x < Math.floor(width * 0.95);
          x++
        ) {
          const offset = (y * width + x) * 4,
            brightness =
              (pixels[offset] + pixels[offset + 1] + pixels[offset + 2]) / 3;
          count++;
          total += brightness;
          if (brightness > 8) visible++;
        }
      return {
        currentLight: atmosphere.currentLight,
        phone: { ...atmosphere.phone.userData },
        phoneVisible: atmosphere.phone.visible,
        spotlightIntensity: atmosphere.phoneLight.intensity,
        globalLighting: {
          hemisphere: (view as any).fill.intensity,
          moon: (view as any).moon.intensity,
          wallEmission: (view as any).materials.wall.emissive.getHexString(),
        },
        drawCalls: view.drawCalls,
        visibility: { mean: total / count, fraction: visible / count },
        image: canvas.toDataURL("image/png"),
        position: view.camera.position.toArray(),
        direction: direction.toArray(),
        hits,
        phoneSource: atmosphere.phoneLight
          .getWorldPosition(new Vector3())
          .toArray(),
        phoneTarget: atmosphere.phoneLight.target
          .getWorldPosition(new Vector3())
          .toArray(),
      };
    }
    const powered = await renderAt(lit, 5);
    game.status = "ready";
    const unassisted = await renderAt(dark, 5);
    game.status = "playing";
    const outage = await renderAt(dark, 10),
      nearWall = await renderAt(near.point, 2, near.target);
    const boardPose = plan.stories
      .filter((s: any) => s.story === 3)
      .flatMap((s: any) =>
        [1.6, 2.1].flatMap((distance) => {
          const p = { x: s.x + s.nx * distance, y: s.y + s.ny * distance };
          return !solid(floor, p, 0.3) && playerCanSee(floor, p, s, 3)
            ? [{ point: p, target: { x: s.x, y: s.y, height: 1.69 } }]
            : [];
        }),
      )[0];
    const deskPose = floor.furniture
      .filter((o: any) => o.kind === "desk" && !o.destroyed)
      .flatMap((o: any) =>
        [1.4, 1.9, 2.3].flatMap((distance) => {
          const angle = o.angle ?? 0,
            p = {
              x: o.x - Math.sin(angle) * distance,
              y: o.y + Math.cos(angle) * distance,
            };
          return !solid(floor, p, 0.3) && playerCanSee(floor, p, o, 3)
            ? [{ point: p, target: { x: o.x, y: o.y, height: 0.9 } }]
            : [];
        }),
      )[0];
    if (!boardPose || !deskPose)
      throw Error(
        "Synthetic office needs an accessible story board and personal desk",
      );
    const whiteboard = await renderAt(boardPose.point, 10, boardPose.target),
      desktop = await renderAt(deskPose.point, 10, deskPose.target);
    const atmosphere = (view as any).atmosphere,
      group = atmosphere.group,
      surfaces = Array.from({ length: 6 }, (_, i) =>
        group.getObjectByName(`office-story-surface-${i}`),
      ),
      textures = new Set(
        surfaces.map((o: any) => o.material.map?.uuid).filter(Boolean),
      );
    (window as any).__interiorPreview = {
      view,
      game,
      before,
      lit,
      dark,
      renderAt,
    };
    return {
      powered,
      outage,
      unassisted,
      nearWall,
      whiteboard,
      desktop,
      textures: textures.size,
      personalEffects: group.getObjectByName(
        "office-personal-effects-and-fixtures",
      )?.count,
      posters: plan.stories.length,
      circuits: plan.zones.map((z: any) => z.power),
      workingLamps: group.getObjectByName("working-ceiling-lamps")?.count,
    };
  });
  await mkdir(".artifacts", { recursive: true });
  for (const [name, frame] of [
    ["office-outage-phone", proof.outage],
    ["office-outage-near-wall", proof.nearWall],
    ["office-outage-unassisted", proof.unassisted],
    ["office-whiteboard-story", proof.whiteboard],
    ["office-desktop-story", proof.desktop],
  ] as const)
    await writeFile(
      `.artifacts/${name}.png`,
      Buffer.from(frame.image.split(",")[1], "base64"),
    );
  await writeFile(
    ".artifacts/interior-lighting-proof.json",
    JSON.stringify(
      {
        ...proof,
        powered: { ...proof.powered, image: undefined },
        outage: { ...proof.outage, image: undefined },
        unassisted: { ...proof.unassisted, image: undefined },
        nearWall: { ...proof.nearWall, image: undefined },
        whiteboard: { ...proof.whiteboard, image: undefined },
        desktop: { ...proof.desktop, image: undefined },
      },
      null,
      2,
    ),
  );
  expect(proof.powered.currentLight).toBeGreaterThan(0.7);
  expect(proof.powered.phoneVisible).toBe(false);
  expect(proof.outage.currentLight).toBeLessThan(0.2);
  expect(proof.outage.phone.raised).toBe(true);
  expect(proof.outage.phoneVisible).toBe(true);
  expect(proof.outage.spotlightIntensity).toBeGreaterThan(10);
  expect(proof.outage.globalLighting).toEqual(proof.unassisted.globalLighting);
  expect(proof.outage.visibility.mean).toBeGreaterThan(
    proof.unassisted.visibility.mean + 6,
  );
  for (const frame of [proof.outage, proof.nearWall]) {
    expect(frame.visibility.mean).toBeGreaterThan(8);
    expect(frame.visibility.fraction).toBeGreaterThan(0.4);
  }
  const nearWorldHit = proof.nearWall.hits.find(
    (hit: any) => hit.name === "walls",
  );
  expect(nearWorldHit?.distance).toBeCloseTo(0.5, 2);
  expect(proof.textures).toBe(6);
  expect(proof.personalEffects).toBeGreaterThan(20);
  expect(proof.posters).toBeGreaterThan(0);
  expect(proof.workingLamps).toBeGreaterThan(0);
  expect(proof.outage.drawCalls).toBeLessThan(180);
  const recovered = await page.evaluate(() => {
    const p = (window as any).__interiorPreview;
    return p.renderAt(p.lit, 18);
  });
  expect(recovered.phone.raised).toBe(false);
  expect(recovered.phoneVisible).toBe(false);
  expect(recovered.spotlightIntensity).toBe(0);
  await writeFile(
    ".artifacts/office-lit-storytelling.png",
    Buffer.from(recovered.image.split(",")[1], "base64"),
  );
  const unchanged = await page.evaluate(() => {
    const { view, game, before } = (window as any).__interiorPreview;
    const result =
      before ===
      JSON.stringify({ floors: game.floors, study: game.study, rng: game.rng });
    view.dispose();
    return result;
  });
  expect(unchanged).toBe(true);
  expect(errors).toEqual([]);
});
