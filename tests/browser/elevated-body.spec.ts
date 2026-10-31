import { mkdir } from "node:fs/promises";
import { expect, test } from "./helpers/offline-test";

test("free stair motion meets visible guards, falls through a damaged bay and keeps the camera at physical height", async ({
  page,
}) => {
  await page.routeWebSocket("**/*", () => {});
  await page.goto("/lab.html");
  await page.setViewportSize({ width: 1100, height: 760 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const guard = await page.evaluate(async () => {
    const [
      { FirstPersonView },
      { createPlayableGame },
      { exteriorStructure },
      { step },
    ] = await Promise.all([
      import("/src/view3d/scene.ts" as string),
      import("/src/world.ts" as string),
      import("/src/exterior-structure.ts" as string),
      import("/src/engine.ts" as string),
    ]);
    const roadmap = await (await fetch("/curriculum.json")).json(),
      game = createPlayableGame(42, roadmap),
      actor = game.survivors[0],
      canvas = document.createElement("canvas");
    game.survivors = [actor];
    game.zombies = [];
    game.nextSpawn = Number.MAX_SAFE_INTEGER;
    game.status = "playing";
    game.settings.reducedFlash = true;
    canvas.id = "elevated-body-preview";
    Object.assign(canvas.style, {
      position: "fixed",
      inset: "0",
      width: "1100px",
      height: "760px",
      zIndex: "100000",
    });
    document.body.append(canvas);
    const view = new FirstPersonView(canvas),
      structure = exteriorStructure(game),
      broken = structure.guards.find((b: any) => b.level === 0 && b.broken),
      intact = structure.guards.find(
        (b: any) =>
          b.level === 0 &&
          !b.broken &&
          !b.corner &&
          b.base1 === 3.6 &&
          b.base2 === 3.6,
      );
    if (!broken || !intact)
      throw Error("Missing physical upper gallery guard bays");
    const place = (bay: any) => {
      const x = (bay.x1 + bay.x2) / 2,
        y = (bay.y1 + bay.y2) / 2,
        run = Math.hypot(bay.x2 - bay.x1, bay.y2 - bay.y1);
      let nx = -(bay.y2 - bay.y1) / run,
        ny = (bay.x2 - bay.x1) / run;
      if ((x - 22) * nx + (y - 15) * ny < 0) {
        nx *= -1;
        ny *= -1;
      }
      Object.assign(actor, {
        x: x - nx * 0.81,
        y: y - ny * 0.81,
        floor: 1,
        elevated: { feet: 3.6, vx: 0, vy: 0, vz: 0, peak: 3.6, grounded: true },
        stairTravel: {
          fromFloor: 0,
          toFloor: 1,
          origin: { ...game.floors[0].stairs },
          destination: { ...game.floors[1].entry },
          until: 0,
          walked: 0,
          left: true,
        },
      });
      delete actor.physics;
      return { x, y, nx, ny };
    };
    let maxCameraError = 0;
    const draw = (yaw: number, pitch = -0.12) => {
      view.render(game, yaw, pitch, 1 / 30);
      maxCameraError = Math.max(
        maxCameraError,
        Math.abs(
          view.camera.position.y -
            ((actor.elevated?.feet ?? actor.floor * 3.6) + 1.6),
        ),
      );
    };
    const p = place(intact),
      start = { x: actor.x, y: actor.y };
    for (let i = 0; i < 30; i++) {
      step(game, 1 / 30, { x: p.nx, y: p.ny, grab: false, stairWalk: true });
      draw(Math.atan2(p.ny, p.nx));
    }
    const field = view.scene.getObjectByName("stair-access-field-well-0");
    const locked = field?.visible;
    actor.access = [0];
    draw(Math.atan2(p.ny, p.nx));
    const unlocked = field?.visible;
    (window as any).__elevatedPreview = {
      game,
      actor,
      view,
      broken,
      place,
      draw,
      step,
      cameraError: () => maxCameraError,
      guardDirection: p,
    };
    return {
      moved: Math.hypot(actor.x - start.x, actor.y - start.y),
      gap: Math.hypot(actor.x - p.x, actor.y - p.y),
      hp: actor.hp,
      grounded: actor.elevated?.grounded,
      locked,
      unlocked,
    };
  });
  expect(guard.moved).toBeGreaterThan(0.3);
  expect(guard.moved).toBeLessThan(0.7);
  expect(guard.gap).toBeGreaterThanOrEqual(0.25);
  expect(guard.grounded).toBe(true);
  expect(guard.hp).toBe(100);
  expect(guard.locked).toBe(true);
  expect(guard.unlocked).toBe(false);
  await mkdir(".artifacts/handoff/stairs", { recursive: true });
  await page.evaluate(() => {
    const p = (window as any).__elevatedPreview;
    p.draw(Math.atan2(p.guardDirection.ny, p.guardDirection.nx), -0.95);
  });
  await page
    .locator("#elevated-body-preview")
    .screenshot({ path: ".artifacts/handoff/stairs/intact-guard.png" });
  await page.evaluate(() => {
    const p = (window as any).__elevatedPreview,
      dir = p.place(p.broken);
    p.draw(Math.atan2(dir.ny, dir.nx), -0.65);
  });
  await page
    .locator("#elevated-body-preview")
    .screenshot({ path: ".artifacts/handoff/stairs/broken-guard-gap.png" });
  const falling = await page.evaluate(() => {
    const p = (window as any).__elevatedPreview,
      dir = p.place(p.broken);
    p.direction = dir;
    for (let i = 0; i < 45; i++) {
      p.step(p.game, 1 / 30, {
        x: dir.nx,
        y: dir.ny,
        grab: false,
        stairWalk: true,
      });
      p.draw(Math.atan2(dir.ny, dir.nx), -0.4);
      if (p.actor.elevated && p.actor.elevated.feet < 3.4) break;
    }
    return {
      feet: p.actor.elevated?.feet,
      falling: p.actor.elevated && !p.actor.elevated.grounded,
      cameraError: p.cameraError(),
    };
  });
  expect(falling.falling).toBe(true);
  expect(falling.feet).toBeLessThan(3.4);
  expect(falling.cameraError).toBeLessThan(1e-8);
  await page
    .locator("#elevated-body-preview")
    .screenshot({ path: ".artifacts/handoff/stairs/broken-bay-fall.png" });
  const landed = await page.evaluate(() => {
    const p = (window as any).__elevatedPreview;
    for (let i = 0; i < 90; i++) {
      p.step(p.game, 1 / 30, { x: 0, y: 0, grab: false, stairWalk: true });
      p.draw(Math.atan2(p.direction.ny, p.direction.nx), -0.1);
      if (!p.actor.elevated) break;
    }
    const result = {
      hp: p.actor.hp,
      alive: p.actor.alive,
      floor: p.actor.floor,
      elevated: !!p.actor.elevated,
      cameraError: p.cameraError(),
      fallEvents: p.game.events.filter((e: any) => e.type === "fall").length,
    };
    p.step(p.game, 1 / 30, {
      x: 0,
      y: 0,
      grab: false,
      stairWalk: true,
      jump: true,
    });
    let jumpPeak = p.actor.elevated?.feet ?? 0;
    for (let i = 0; i < 45; i++) {
      p.step(p.game, 1 / 30, { x: 0, y: 0, grab: false, stairWalk: true });
      p.draw(Math.atan2(p.direction.ny, p.direction.nx), -0.1);
      jumpPeak = Math.max(jumpPeak, p.actor.elevated?.feet ?? 0);
      if (!p.actor.elevated) break;
    }
    Object.assign(result, {
      jumpPeak,
      jumpLanded: !p.actor.elevated,
      jumpHp: p.actor.hp,
      cameraError: p.cameraError(),
    });
    delete p.actor.elevated;
    delete p.actor.stairTravel;
    Object.assign(p.actor, {
      floor: 0,
      x: p.game.floors[0].stairs.x,
      y: p.game.floors[0].stairs.y + 1.6,
      access: [],
    });
    p.draw(-Math.PI / 2, 0);
    return result;
  });
  expect(landed.hp).toBeGreaterThan(80);
  expect(landed.hp).toBeLessThan(90);
  expect(landed.alive).toBe(true);
  expect(landed.floor).toBe(0);
  expect(landed.elevated).toBe(false);
  expect(landed.fallEvents).toBe(1);
  expect(landed.cameraError).toBeLessThan(1e-8);
  expect((landed as any).jumpPeak).toBeGreaterThan(1.05);
  expect((landed as any).jumpPeak).toBeLessThan(1.15);
  expect((landed as any).jumpLanded).toBe(true);
  expect((landed as any).jumpHp).toBe(landed.hp);
  await page
    .locator("#elevated-body-preview")
    .screenshot({ path: ".artifacts/handoff/stairs/locked-well-field.png" });
  expect(errors).toEqual([]);
  await page.evaluate(() => (window as any).__elevatedPreview.view.dispose());
});
