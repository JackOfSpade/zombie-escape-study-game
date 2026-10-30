import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
const stacked = JSON.parse(
  readFileSync("tests/fixtures/gametest/vault-stacked-barricade.json", "utf8"),
);
const forward = JSON.parse(
  readFileSync("tests/fixtures/gametest/forward-room-exit.json", "utf8"),
);
const randomized = JSON.parse(
  readFileSync(
    "tests/fixtures/gametest/building-footprint-consistency.json",
    "utf8",
  ),
);
test("new runs share one randomized boundary on every floor and retain it after pause/save/reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#start").click();
  const before = await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    return {
      id: g.id,
      floors: g.floors.map((f: any) => ({
        tiles: f.tiles,
        rooms: f.rooms,
        generation: f.generation,
        boundary: f.boundary,
        entry: f.entry,
        stairs: f.stairs,
      })),
    };
  });
  expect(
    before.floors
      .slice(0, 4)
      .every(
        (f: any) =>
          f.generation.version === 5 &&
          f.rooms.every((r: any) => r.forwardExit),
      ),
  ).toBe(true);
  expect(before.floors[0].boundary).toBeDefined();
  expect(before.floors[0].boundary.width).toBeGreaterThan(0);
  expect(before.floors[0].boundary.depth).toBeGreaterThan(0);
  for (const floor of before.floors)
    expect(floor.boundary).toEqual(before.floors[0].boundary);
  // The roof is part of the same structure, including the arrival shaft.
  expect(before.floors.at(-1).entry).toEqual({
    x: 22,
    y: before.floors[0].boundary.bottom + 1,
  });
  await page.keyboard.press("Escape");
  await expect(page.locator("#pause-save-status")).toContainText("saved");
  await page.reload();
  await expect(page.locator("#pause-menu")).toBeVisible();
  const after = await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    return {
      id: g.id,
      floors: g.floors.map((f: any) => ({
        tiles: f.tiles,
        rooms: f.rooms,
        generation: f.generation,
        boundary: f.boundary,
        entry: f.entry,
        stairs: f.stairs,
      })),
    };
  });
  expect(after).toEqual(before);
});
test("randomized footprint validation also runs in the browser lab across a checkpoint", async ({
  page,
}) => {
  await page.goto("/lab.html");
  await expect(page.locator("#lab-message")).toContainText("Loaded");
  await page.locator("#lab-json").fill(JSON.stringify(randomized));
  await page.locator("#lab-apply-json").click();
  await page.locator("#lab-run").click();
  await expect(page.locator("#lab-status")).toHaveText("passed");
  await expect(page.locator("#lab-results")).toContainText("got 0 at tick 120");
});
test("the actual Space key climbs a two-object barricade and records its attempt", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#start").click();
  await page.evaluate(async (s) => {
    const { TestRunner } = await import("/src/gametest/runner.ts" as string);
    const g = (window as any).__deadAir.game,
      scenario = new TestRunner(s, (window as any).__deadAir.roadmap).game;
    Object.assign(g, scenario);
    // The legacy barricade scenario has no rules field; a fresh run's
    // force-field rules must not survive the swap, since they disable vaulting.
    g.rules = scenario.rules;
    g.settings.view = "top-down";
  }, stacked);
  await page.locator("#world").focus();
  await page.keyboard.press("Space");
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__deadAir.game.survivors[0].x),
    )
    .toBeGreaterThan(12.3);
  const hp = await page.evaluate(
    () =>
      (window as any).__deadAir.game.floors[0].furniture.find(
        (o: any) => o.id === "back-desk",
      ).hp,
  );
  expect(hp).toBe(850);
  await page.keyboard.press("Escape");
  await expect(page.locator("#pause-save-status")).toContainText("saved");
  const attempts = await page.evaluate(async () => {
    const { readDurable } = await import("/src/storage.ts" as string);
    return JSON.parse(
      await readDurable("recent-game-diagnostics-v1"),
    ).runs.flatMap((r: any) =>
      r.entries.filter((e: any) => e.type === "vault-attempt"),
    );
  });
  expect(
    attempts.some((e: any) => e.data.ok && e.data.reason === "started"),
  ).toBe(true);
});
test("agents load and run the new forward-floor scenario through the optional visual debugger", async ({
  page,
}) => {
  await page.goto("/lab.html");
  await expect(page.locator("#lab-message")).toContainText("Loaded");
  await page.locator("#lab-json").fill(JSON.stringify(forward));
  await page.locator("#lab-apply-json").click();
  await page.screenshot({ path: "test-results/forward-floor.png" });
  await page.locator("#lab-run").click();
  await expect(page.locator("#lab-status")).toHaveText("passed");
});
