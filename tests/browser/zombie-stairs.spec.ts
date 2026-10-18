import { expect, test } from "@playwright/test";
import { enterLegacyBuilding } from "./helpers/legacy-world";
test("a real-time stair landing barricade is attacked before the zombie appears on the upper floor", async ({
  page,
}) => {
  await enterLegacyBuilding(page);
  const baseline = await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      a = g.survivors[0],
      f = g.floors[1],
      ob = f.furniture.find((o: any) => o.kind === "fridge");
    g.survivors = [a];
    g.zombies = [];
    g.nextSpawn = 999999;
    g.surge.anchor = 999999;
    Object.assign(a, { floor: 1, x: f.entry.x, y: f.entry.y - 3 });
    Object.assign(ob, { x: f.entry.x, y: f.entry.y, hp: 8 });
    g.zombies = [
      {
        id: "controlled-stair-arrival",
        ...g.floors[0].stairs,
        floor: 0,
        hp: 60,
        path: [],
        repath: 100,
        cooldown: 0,
        memory: 0,
        stagger: 0,
        origin: "outside",
        stairUntil: g.time + 0.4,
      },
    ];
    return {
      study: JSON.stringify(g.study),
      obstacle: ob.id,
      flightUntil: g.zombies[0].stairUntil,
    };
  });
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__deadAir.game.zombies[0].floor),
    )
    .toBe(1);
  const result = await page.evaluate((id) => {
    const g = (window as any).__deadAir.game,
      z = g.zombies[0],
      ob = g.floors[1].furniture.find((o: any) => o.id === id);
    return {
      zombie: z,
      obstacle: ob,
      events: g.events.filter(
        (e: any) => e.actor === z.id || e.type === "breach",
      ),
      study: JSON.stringify(g.study),
    };
  }, baseline.obstacle);
  expect(result.obstacle.destroyed).toBe(true);
  expect(result.obstacle.hp).toBe(0);
  expect(result.zombie.origin).toBe("outside");
  expect(result.study).toBe(baseline.study);
  const hits = result.events.filter((e: any) => e.type === "barricade-hit"),
    breach = result.events.find((e: any) => e.type === "breach"),
    arrival = result.events.find((e: any) => e.type === "horde-climb");
  expect(hits).toHaveLength(2);
  expect(
    hits.every(
      (e: any) => e.floor === 1 && e.at >= baseline.flightUntil - 1e-8,
    ),
  ).toBe(true);
  expect(arrival.seq).toBeGreaterThan(breach.seq);
  expect(arrival.floor).toBe(1);
  await page.screenshot({ path: "test-results/zombie-stair-breach.png" });
});
