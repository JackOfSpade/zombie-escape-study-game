import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
const fixture = JSON.parse(
  readFileSync("tests/fixtures/gametest/vault-five-props.json", "utf8"),
);
test("Space continues past five mixed barricades when each blocks the previous landing", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#start").click();
  await page.evaluate(async (s) => {
    const { TestRunner } = await import("/src/gametest/runner.ts" as string);
    const g = (window as any).__deadAir.game,
      scenario = new TestRunner(s, (window as any).__deadAir.roadmap).game;
    Object.assign(g, scenario);
    // A fresh run's force-field rules disable vaulting; use the scenario's.
    g.rules = scenario.rules;
    g.settings.view = "top-down";
  }, fixture);
  await page.locator("#world").focus();
  await page.keyboard.press("Space");
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__deadAir.game.survivors[0].x),
    )
    .toBeGreaterThan(20);
  const result = await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    return {
      events: g.events.filter(
        (e: any) => e.type === "vault" && e.actor === "human",
      ).length,
      intact: g.floors[0].furniture.every((o: any) => o.hp === o.maxHp),
    };
  });
  expect(result).toEqual({ events: 1, intact: true });
});
