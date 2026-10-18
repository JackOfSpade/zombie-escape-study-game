import { expect, test } from "@playwright/test";
test("personal stairs have a saved traversal time and movement cancels on the departure floor", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Enter the building" }).click();
  const baseline = await page.evaluate(async () => {
    const d = (window as any).__deadAir,
      g = d.game,
      a = g.survivors[0],
      root = "/src/",
      { complete } = await import(root + "engine.ts");
    g.survivors = [a];
    g.zombies = [];
    g.nextSpawn = 999999;
    g.surge.anchor = 999999;
    complete(
      g,
      "f0-room0",
      "synthetic-stair-credential",
      ["human"],
      "World reward fixture; no learning claim",
    );
    Object.assign(a, g.floors[0].stairs);
    return JSON.stringify(g.study);
  });
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  const started = await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      a = g.survivors[0];
    return { floor: a.floor, until: a.stairTravel?.until, time: g.time };
  });
  expect(started.floor).toBe(0);
  expect(started.until).toBeGreaterThan(started.time);
  await page.keyboard.down("s");
  await page.waitForTimeout(120);
  await page.keyboard.up("s");
  expect(
    await page.evaluate(
      () => (window as any).__deadAir.game.survivors[0].stairTravel,
    ),
  ).toBeUndefined();
  expect(
    await page.evaluate(
      () => (window as any).__deadAir.game.survivors[0].floor,
    ),
  ).toBe(0);
  await page.keyboard.press("e");
  const saved = await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    return {
      until: g.survivors[0].stairTravel.until,
      start: g.events
        .filter((e: any) => e.type === "survivor-stairs" && e.actor === "human")
        .at(-1).at,
    };
  });
  await page.reload();
  await expect(page.locator("#world")).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as any).__deadAir.game.survivors[0].stairTravel?.until,
    ),
  ).toBe(saved.until);
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__deadAir.game.survivors[0].floor),
    )
    .toBe(1);
  const arrived = await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      a = g.survivors[0];
    return {
      event: g.events
        .filter((e: any) => e.type === "climb" && e.actor === "human")
        .at(-1),
      study: JSON.stringify(g.study),
      access: a.access,
      x: a.x,
      y: a.y,
      entry: g.floors[1].entry,
    };
  });
  expect(arrived.event.at - saved.start).toBeGreaterThanOrEqual(2 - 1e-8);
  expect(arrived.study).toBe(baseline);
  expect(arrived.access).toEqual([0]);
  expect(
    Math.hypot(arrived.x - arrived.entry.x, arrived.y - arrived.entry.y),
  ).toBeLessThan(0.1);
});
