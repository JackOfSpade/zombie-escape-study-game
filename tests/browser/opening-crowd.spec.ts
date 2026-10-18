import { expect, test } from "@playwright/test";
test("reported opening seed clears the entrance with solid NPC traffic", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#start").click();
  const result = await page.evaluate(async () => {
    const { createGame } = await import("/src/world.ts" as string),
      { step } = await import("/src/engine.ts" as string);
    const g = (window as any).__deadAir.game;
    Object.assign(g, createGame(4089087021, (window as any).__deadAir.roadmap));
    g.status = "playing";
    for (let i = 0; i < 126; i++) step(g, 1 / 30);
    const people = g.survivors;
    const minimum = Math.min(
      ...people.flatMap((a: any, i: number) =>
        people
          .slice(i + 1)
          .filter((b: any) => a.floor === b.floor)
          .map((b: any) => Math.hypot(a.x - b.x, a.y - b.y)),
      ),
    );
    const result = {
      inside: people.slice(1).filter((a: any) => a.y < 28).length,
      zombies: g.zombies.length,
      minimum,
    };
    g.paused = true;
    return result;
  });
  expect(result.inside).toBeGreaterThanOrEqual(16);
  expect(result.zombies).toBe(0);
  expect(result.minimum).toBeGreaterThanOrEqual(0.495);
  await expect(page.locator("#run-time")).toContainText("00:04");
  await page.screenshot({ path: "test-results/opening-crowd.png" });
});
