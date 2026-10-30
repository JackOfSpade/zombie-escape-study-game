import { expect, test } from "./helpers/offline-test";

test("busy first-person scene reports bounded render time and draw calls", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Enter the building" }).click();
  await page.evaluate(async () => {
    const { TestRunner } = await import("/src/gametest/runner.ts" as string),
      { emptyScenario } = await import("/src/gametest/schema.ts" as string),
      d = (window as any).__deadAir,
      scenario = emptyScenario();
    scenario.id = "first-person-busy-render";
    scenario.entities = [
      {
        id: "human",
        kind: "player",
        x: 11,
        y: 17,
        hp: 10000,
        heading: { x: 1, y: 0 },
      },
      ...Array.from({ length: 20 }, (_, i) => ({
        id: `busy-survivor-${i}`,
        kind: "npc",
        hp: 10000,
        x: 14.6 + Math.floor(i / 5) * 0.62,
        y: 15.6 + (i % 5) * 0.65,
        heading: { x: -1, y: 0 },
      })),
      ...Array.from({ length: 40 }, (_, i) => ({
        id: `busy-zombie-${i}`,
        kind: "zombie",
        hp: 10000,
        x: 17.2 + Math.floor(i / 8) * 0.62,
        y: 14.7 + (i % 8) * 0.65,
      })),
    ];
    const staged = new TestRunner(scenario, d.roadmap).game;
    // Survivors hold their stage positions; real zombie AI still walks and
    // strikes. Synthetic health keeps all 60 bodies alive for both windows.
    for (const a of staged.survivors) a.speed = 0;
    for (const z of staged.zombies) {
      z.target = { x: 11, y: 17 };
    }
    Object.assign(d.game, staged, {
      settings: { ...d.game.settings, view: "first-person" },
    });
    d.setLook(0, 0);
  });
  await expect(page.locator("#view3d")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__deadAir.renderPerformance().drawCalls,
      ),
    )
    .toBeGreaterThan(0);
  // Discard shader compilation, first-time labels and the floor build.
  await page.waitForTimeout(1500);
  await page.evaluate(() => (window as any).__deadAir.renderPerformance(true));
  const windows: any[] = [];
  let previousWindow = 0;
  for (let i = 0; i < 2; i++) {
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as any).__deadAir.renderPerformance().window,
        ),
      )
      .toBeGreaterThan(previousWindow);
    const sample = await page.evaluate(() =>
      (window as any).__deadAir.renderPerformance(),
    );
    previousWindow = sample.window;
    windows.push(sample);
  }
  const population = await page.evaluate(async () => {
    const { playerCanSee } = await import("/src/visibility.ts" as string),
      g = (window as any).__deadAir.game,
      a = g.survivors[0],
      floor = g.floors[a.floor];
    return {
      zombies: g.zombies.filter(
        (z: any) =>
          z.hp > 0 && z.floor === a.floor && playerCanSee(floor, a, z),
      ).length,
      survivors: g.survivors.filter(
        (s: any) =>
          s !== a &&
          s.alive &&
          s.floor === a.floor &&
          playerCanSee(floor, a, s),
      ).length,
    };
  });
  const frames = windows.reduce((sum, w) => sum + w.report.frames, 0),
    meanRenderMs =
      windows.reduce(
        (sum, w) => sum + w.report.avgRenderMs * w.report.frames,
        0,
      ) / frames,
    p95RenderMs = Math.max(...windows.map((w) => w.report.p95RenderMs)),
    drawCalls = Math.max(...windows.map((w) => w.maxDrawCalls)),
    result = {
      ...population,
      frames,
      meanRenderMs,
      p95RenderMs,
      drawCalls,
      windows,
    };
  console.log("First-person busy render benchmark", JSON.stringify(result));
  await testInfo.attach("first-person-busy-render.json", {
    body: JSON.stringify(result, null, 2),
    contentType: "application/json",
  });
  expect(population.zombies).toBeGreaterThanOrEqual(40);
  expect(population.survivors).toBeGreaterThanOrEqual(20);
  expect(windows.every((w) => w.firstPerson && w.report.frames > 1)).toBe(true);
  expect(windows.every((w) => w.minVisibleActors >= 60)).toBe(true);
  expect(drawCalls).toBeGreaterThan(0);
  expect(drawCalls).toBeLessThan(250);
  expect(p95RenderMs).toBeLessThan(12);
});
