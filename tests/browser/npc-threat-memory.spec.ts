import { expect, test } from "@playwright/test";
test("an NPC retains a recent actual sighting after cover occludes its view while the player can see through that cover", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Enter the building" }).click();
  const baseline = await page.evaluate(async () => {
    const g = (window as any).__deadAir.game,
      f = g.floors[0],
      root = "/src/",
      { actor } = await import(root + "world.ts"),
      shelf = f.furniture.find((o: any) => o.kind === "shelf");
    Object.assign(shelf, { id: "memory-cover", x: 12.5, y: 10.5, w: 1, h: 3 });
    f.furniture = [shelf];
    f.stations = [];
    f.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
    for (let y = 0; y < 34; y++) if (y < 9 || y > 11) f.tiles[y][12] = 1;
    f.stairs = { x: 9.5, y: 10.5 };
    const a = Object.assign(actor("memory-runner", "Runner", 2), {
      x: 11.45,
      y: 10.5,
      access: [0],
      risk: 0.1,
      activity: "fleeing",
      fleeFloor: 0,
      fleeUntil: g.time + 3,
      fleeTarget: { x: 13.55, y: 10.5 },
      fleeRouteThreats: [],
    });
    Object.assign(g.survivors[0], { x: 16.5, y: 10.5 });
    g.survivors = [g.survivors[0], a];
    g.nextSpawn = 999999;
    g.surge.anchor = 999999;
    g.zombies = [
      {
        id: "recent-chaser",
        floor: 0,
        x: 9,
        y: 10.5,
        hp: 60,
        path: [],
        repath: 0,
        cooldown: 0,
        memory: g.time + 9,
        stagger: 0.8,
        origin: "outside",
      },
    ];
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    const c = document.querySelector<HTMLCanvasElement>("#world")!,
      rect = c.getBoundingClientRect(),
      dpr = c.width / rect.width;
    const { camera } = await import(root + "camera.ts");
    const { scale, ox, oy } = camera(rect.width, rect.height, g.survivors[0]),
      z = g.zombies[0];
    return {
      time: g.time,
      learning: JSON.stringify(g.study),
      enemyFloor: z.floor,
      pixel: Array.from(
        c
          .getContext("2d")!
          .getImageData(
            Math.floor((ox + z.x * scale) * dpr),
            Math.floor((oy + z.y * scale) * dpr),
            1,
            1,
          ).data,
      ),
    };
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__deadAir.game.time))
    .toBeGreaterThan(baseline.time + 3.2);
  const state = await page.evaluate(async () => {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    const g = (window as any).__deadAir.game,
      a = g.survivors[1],
      z = g.zombies[0];
    return {
      jumps: g.events.filter(
        (e: any) => e.type === "vault" && e.actor === a.id,
      ),
      memory: a.threatMemory,
      enemy: { x: z.x, y: z.y, floor: z.floor },
      x: a.x,
      learning: JSON.stringify(g.study),
    };
  });
  expect(state.jumps).toHaveLength(1);
  expect(state.x).toBeGreaterThan(13.5);
  expect(state.memory.observations[0].x).toBe(9);
  expect(state.enemy.x).not.toBe(9);
  expect(baseline.enemyFloor).toBe(0);
  expect(baseline.pixel[1]).toBeGreaterThan(baseline.pixel[2] + 10);
  expect(state.learning).toBe(baseline.learning);
  await page.screenshot({ path: "test-results/npc-threat-memory.png" });
  await page.evaluate(async () => {
    const root = "/src/",
      { save } = await import(root + "persistence.ts");
    await save((window as any).__deadAir.game);
  });
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as any).__deadAir?.game.survivors[1].threatMemory
            ?.observations[0]?.x,
      ),
    )
    .toBe(9);
});
