import { expect, test } from "@playwright/test";
test("walking into the personal staircase starts a saved flight; leaving the well cancels it", async ({
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
    // Fresh floors carve the staircase into the north wall; start in its lobby.
    Object.assign(a, { x: g.floors[0].stairs.x, y: g.floors[0].stairs.y + 3 });
    return { study: JSON.stringify(g.study), stairs: g.floors[0].stairs };
  });
  expect(baseline.stairs).toEqual({ x: 22, y: 1 });
  await page.locator("#world").focus();
  // No E: walking north into the well starts the flight by itself.
  await page.keyboard.down("w");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__deadAir.game.survivors[0].stairTravel?.until,
      ),
    )
    .toBeGreaterThan(0);
  await page.keyboard.up("w");
  const started = await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      a = g.survivors[0];
    return { floor: a.floor, until: a.stairTravel.until, time: g.time };
  });
  expect(started.floor).toBe(0);
  expect(started.until).toBeGreaterThan(started.time);
  // Walking back out of the well cancels; the survivor stays on this floor.
  await page.keyboard.down("s");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__deadAir.game.survivors[0].stairTravel,
      ),
    )
    .toBeUndefined();
  await page.keyboard.up("s");
  expect(
    await page.evaluate(
      () => (window as any).__deadAir.game.survivors[0].floor,
    ),
  ).toBe(0);
  expect(
    await page.evaluate(() => (window as any).__deadAir.game.notice),
  ).toMatch(/left the staircase/);
  // Walk back in: a new flight with its own saved deadline.
  await page.keyboard.down("w");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__deadAir.game.survivors[0].stairTravel?.until,
      ),
    )
    .toBeGreaterThan(0);
  await page.keyboard.up("w");
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
      stairwell: a.stairwell,
    };
  });
  expect(arrived.event.at - saved.start).toBeGreaterThanOrEqual(2 - 1e-8);
  expect(arrived.study).toBe(baseline.study);
  expect(arrived.access).toEqual([0]);
  expect(
    Math.hypot(arrived.x - arrived.entry.x, arrived.y - arrived.entry.y),
  ).toBeLessThan(0.1);
  // Arriving inside the descending well must not start the return flight.
  expect(arrived.stairwell).toBe("down");
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(() => {
      const a = (window as any).__deadAir.game.survivors[0];
      return { floor: a.floor, travel: a.stairTravel };
    }),
  ).toEqual({ floor: 1, travel: undefined });
});
