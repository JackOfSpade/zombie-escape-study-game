import { expect, test } from "./helpers/offline-test";
import { enterLegacyBuilding } from "./helpers/legacy-world";

test("an uninformed zombie explores, then pursues only when the survivor becomes visible", async ({
  page,
}) => {
  await enterLegacyBuilding(page);
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    g.nextSpawn = Number.MAX_SAFE_INTEGER;
    g.surge.anchor = Number.MAX_SAFE_INTEGER;
    g.survivors = [g.survivors[0]];
    Object.assign(g.survivors[0], { floor: 1, x: 35, y: 25 });
    g.floors[0].tiles = Array.from({ length: 34 }, (_, y) =>
      Array.from({ length: 44 }, (_, x) =>
        x === 0 || x === 43 || y === 0 || y === 33 ? 1 : 0,
      ),
    );
    g.floors[0].furniture = [];
    g.zombies = [
      {
        id: "searcher",
        x: 12.5,
        y: 22.5,
        floor: 0,
        hp: 60,
        path: [],
        repath: 0,
        cooldown: 0,
        memory: 0,
        stagger: 0,
        origin: "outside",
      },
    ];
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__deadAir.game.zombies[0].search?.decisions ?? 0,
      ),
    )
    .toBeGreaterThanOrEqual(2);
  const searching = await page.evaluate(() => {
    const z = (window as any).__deadAir.game.zombies[0];
    return {
      moved: Math.hypot(z.x - 12.5, z.y - 22.5),
      target: z.target ?? null,
    };
  });
  expect(searching.moved).toBeGreaterThan(1);
  expect(searching.target).toBeNull();
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      z = g.zombies[0];
    Object.assign(g.survivors[0], { floor: 0, x: z.x + 2, y: z.y });
  });
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__deadAir.game.survivors[0].hp),
    )
    .toBeLessThan(100);
});
