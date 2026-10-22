import { expect, test } from "@playwright/test";
test("entrance reinforcements continue beyond ninety births and preserve their actual deadline through reload", async ({
  page,
}) => {
  await page.route("**/api/**", (route) =>
    route.fulfill({
      json: {
        mode: "development",
        label: "Synthetic",
        detail: "Isolated inflow fixture",
        capabilities: [],
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Enter the building" }).click();
  const before = await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      a = g.survivors[0];
    Object.assign(a, { x: 5.5, y: 6.5 });
    g.survivors.slice(1).forEach((a: any) => {
      a.escaped = true;
    });
    // Fresh playable runs intentionally have a three-minute grace period.
    // Start this capacity regression at its actual end, not the retired 10s.
    g.time = 180;
    g.spawned = 90;
    g.nextSpawn = g.time + 0.1;
    g.surge.anchor = 999999;
    g.zombies = Array.from({ length: 90 }, (_, i) => ({
      id: `z${i}`,
      floor: 4,
      x: 3 + (i % 15) * 2.5,
      y: 3 + Math.floor(i / 15) * 3,
      hp: 60,
      path: [],
      repath: 0,
      cooldown: 0,
      memory: 0,
      stagger: 100,
      origin: "outside",
    }));
    return JSON.stringify(g.study);
  });
  // Reinforcements continue past ninety births; the swarm rules spawn in
  // batches, so count the actual births rather than assuming one.
  await expect
    .poll(() => page.evaluate(() => (window as any).__deadAir.game.spawned))
    .toBeGreaterThan(90);
  const first = await page.evaluate(async () => {
    const g = (window as any).__deadAir.game,
      root = "/src/",
      { save } = await import(root + "persistence.ts");
    await save(g);
    return {
      deadline: g.nextSpawn,
      z: g.zombies.find((z: any) => z.id === "z90"),
      count: g.zombies.length,
      spawned: g.spawned,
    };
  });
  expect(first.z.origin).toBe("outside");
  expect(first.z.floor).toBe(0);
  expect(first.z.y).toBeGreaterThan(28);
  expect(first.count).toBe(first.spawned);
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__deadAir);
  const restored = await page.evaluate(() => ({
    deadline: (window as any).__deadAir.game.nextSpawn,
    count: (window as any).__deadAir.game.spawned,
  }));
  expect(restored.deadline).toBe(first.deadline);
  expect(restored.count).toBe(first.spawned);
  await expect
    .poll(() => page.evaluate(() => (window as any).__deadAir.game.spawned), {
      timeout: 20000,
    })
    .toBeGreaterThan(first.spawned);
  const after = await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    return {
      ids: g.zombies.map((z: any) => z.id),
      outside: g.zombies.every((z: any) => z.origin === "outside"),
      upper: g.zombies
        .filter((z: any) => Number(z.id.slice(1)) < 90)
        .every((z: any) => z.floor === 4),
      learning: JSON.stringify(g.study),
    };
  });
  expect(new Set(after.ids).size).toBe(after.ids.length);
  expect(after.ids.length).toBeGreaterThan(first.spawned);
  expect(after.ids).toContain(`z${first.spawned}`);
  expect(after.outside).toBe(true);
  expect(after.upper).toBe(true);
  expect(after.learning).toBe(before);
});
