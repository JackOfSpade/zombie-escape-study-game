import { startProceduralRun } from "./helpers/procedural-run";
import { expect, test } from "@playwright/test";
test("E at a red field with zero keys denies entry without a timed unlock", async ({
  page,
}) => {
  await page.goto("/");
  await startProceduralRun(page);
  await page.evaluate(async () => {
    const root = "/src/";
    const { TestRunner } = await import(
      /* @vite-ignore */ root + "gametest/runner.ts"
    );
    const s = await (
      await fetch("/tests/fixtures/gametest/force-field-no-key.json")
    ).json();
    s.actions = [];
    s.checks = [];
    s.simulation = "game";
    s.entities = s.entities.filter((e: any) => e.kind !== "npc");
    const roadmap = await (await fetch("/curriculum.json")).json();
    Object.assign(
      (window as any).__deadAir.game,
      new TestRunner(s, roadmap).game,
    );
    (window as any).__deadAir.game.settings.view = "top-down";
    (window as any).__fieldLabels = [];
    const fill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (
      text,
      x,
      y,
      ...rest
    ) {
      (window as any).__fieldLabels.push(String(text));
      return fill.call(this, text, x, y, ...rest);
    };
  });
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect
    .poll(() => page.evaluate(() => (window as any).__deadAir.game.notice))
    .toMatch(/one key required/i);
  await page.keyboard.down("d");
  await page.waitForTimeout(500);
  await page.keyboard.up("d");
  const state = await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      a = g.survivors[0];
    return {
      keys: a.keys,
      x: a.x,
      authorized: g.floors[0].furniture[0].field.authorized,
      labels: (window as any).__fieldLabels,
    };
  });
  expect(state.keys).toBe(0);
  expect(state.x).toBeLessThanOrEqual(11.8);
  expect(state.authorized).toEqual([]);
  expect(state.labels.some((s: string) => s.includes("KEY REQUIRED"))).toBe(
    true,
  );
  expect(state.labels.some((s: string) => /hack/i.test(s))).toBe(false);
});
test("E at a red field spends a key even beside another survivor's solo terminal", async ({
  page,
}) => {
  await page.goto("/");
  await startProceduralRun(page);
  await page.evaluate(async () => {
    const root = "/src/";
    const { TestRunner } = await import(
      /* @vite-ignore */ root + "gametest/runner.ts"
    );
    const s = await (
      await fetch("/tests/fixtures/gametest/force-field-no-key.json")
    ).json();
    s.actions = [];
    s.checks = [];
    s.simulation = "game";
    s.entities = s.entities.filter((e: any) => e.kind !== "npc");
    const roadmap = await (await fetch("/curriculum.json")).json();
    const live = (window as any).__deadAir.game;
    const solo = structuredClone(
      Object.values(live.encounters).find((e: any) => e.mode === "solo"),
    ) as any;
    Object.assign(live, new TestRunner(s, roadmap).game);
    live.settings.view = "top-down";
    // A neighbour's terminal in reach and nearer than the field's frame used
    // to take E, so a player holding a key could never open the field.
    solo.owner = "npc-1";
    live.encounters = { [solo.id]: solo };
    live.floors[0].stations = [
      { id: "neighbour-station", encounter: solo.id, x: 10.2, y: 11.2 },
    ];
    live.survivors[0].keys = 1;
  });
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect
    .poll(() => page.evaluate(() => (window as any).__deadAir.game.notice))
    .toMatch(/key consumed/i);
  const state = await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    return {
      keys: g.survivors[0].keys,
      authorized: g.floors[0].furniture[0].field.authorized,
    };
  });
  expect(state.keys).toBe(0);
  expect(state.authorized).toEqual(["human"]);
});
