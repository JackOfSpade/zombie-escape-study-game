import { expect, test } from "@playwright/test";
import { PRESETS } from "../../src/gametest/presets";
test("Test Lab runs real fixtures without touching game saves or contacting the study bridge", async ({
  page,
}) => {
  const bridge: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/")) bridge.push(r.url());
  });
  await page.addInitScript(() => {
    localStorage.setItem("dead-air-save-v1", "real-save-sentinel");
    localStorage.setItem("recent-game-diagnostics-v1", "real-logs-sentinel");
  });
  await page.goto("/lab.html");
  await expect(page.locator("#lab-message")).toContainText("Loaded");
  await page.locator("#lab-presets").selectOption("push-door");
  await page.locator("#lab-load").click();
  await page.locator("#lab-run").click();
  await expect(page.locator("#lab-status")).toHaveText("passed");
  await expect(page.locator("#lab-results")).toContainText(
    "Player crosses the frame",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("dead-air-save-v1")),
  ).toBe("real-save-sentinel");
  expect(
    await page.evaluate(() =>
      localStorage.getItem("recent-game-diagnostics-v1"),
    ),
  ).toBe("real-logs-sentinel");
  expect(bridge).toEqual([]);
  await page.locator("#lab-all").click();
  await expect(page.locator("#lab-suite li")).toHaveCount(PRESETS.length, {
    timeout: 30000,
  });
  await expect(page.locator('#lab-suite li[data-status="passed"]')).toHaveCount(
    PRESETS.length,
  );
  await page.screenshot({ path: "test-results/game-test-lab-suite.png" });
});
test("build, inspect, export and import a setup; exact-tick failure remains visible", async ({
  page,
}) => {
  await page.goto("/lab.html");
  await expect(page.locator("#lab-message")).toContainText("Loaded");
  await page.locator("#lab-new").click();
  await page.locator("#lab-tool").selectOption("zombie");
  const canvas = page.locator("#lab-world"),
    box = (await canvas.boundingBox())!;
  await canvas.click({
    position: { x: (box.width * 15.5) / 44, y: (box.height * 12.5) / 34 },
  });
  await expect(page.locator("#entity-inspector")).toBeVisible();
  await page.locator("#entity-hp").fill("12");
  await page.locator("#entity-apply").click();
  const setup = JSON.parse(await page.locator("#lab-json").inputValue());
  expect(
    setup.entities.some((e: any) => e.kind === "zombie" && e.hp === 12),
  ).toBe(true);
  await page.locator("#lab-save").click();
  await page.reload();
  await expect(page.locator("#lab-presets")).toContainText(
    "Custom arena · saved",
  );
  const s = JSON.parse(JSON.stringify(setup));
  s.maxTicks = 3;
  s.checks = [
    {
      name: "Deliberate failure",
      mode: "at",
      tick: 2,
      query: { type: "property", id: "human", field: "x" },
      op: "gte",
      expected: 40,
    },
  ];
  await page.locator("#lab-json").fill(JSON.stringify(s));
  await page.locator("#lab-apply-json").click();
  await page.locator("#lab-run").click();
  await expect(page.locator("#lab-status")).toHaveText("failed");
  await expect(page.locator("#lab-results")).toContainText("got 5.5 at tick 2");
  const download = page.waitForEvent("download");
  await page.locator("#lab-export").click();
  expect((await download).suggestedFilename()).toBe("custom-arena.json");
  await page.locator("#lab-new").click();
  await page.locator("#lab-import").setInputFiles({
    name: "fixture.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(s)),
  });
  await expect(page.locator("#lab-json")).toHaveValue(
    JSON.stringify(s, null, 2),
  );
  await page.locator("#lab-json").fill('{"schema":1,"payload":"real-save"}');
  await page.locator("#lab-apply-json").click();
  await expect(page.locator("#lab-message")).toContainText(
    "Unsupported scenario",
  );
});
test("recorded keyboard inputs replay from the original setup and sandbox cannot turn green", async ({
  page,
}) => {
  await page.goto("/lab.html");
  await expect(page.locator("#lab-message")).toContainText("Loaded");
  await page.locator("#lab-new").click();
  await page.locator("#lab-play").click();
  await page.keyboard.down("d");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__gameTestLab.runner.game.survivors[0].x,
      ),
    )
    .toBeGreaterThan(6);
  await page.keyboard.up("d");
  await page.keyboard.press("Escape");
  const result = await page.evaluate(async () => {
    const r = (window as any).__gameTestLab.runner,
      scenario = structuredClone(r.scenario),
      tick = r.tick;
    const expected = {
      x: r.game.survivors[0].x,
      y: r.game.survivors[0].y,
      time: r.game.time,
    };
    const { TestRunner } = await import("/src/gametest/runner.ts" as string),
      roadmap = await fetch("/curriculum.json").then((r) => r.json());
    const replay = new TestRunner(scenario, roadmap);
    replay.advance(tick);
    return {
      actions: scenario.actions,
      expected,
      actual: {
        x: replay.game.survivors[0].x,
        y: replay.game.survivors[0].y,
        time: replay.game.time,
      },
    };
  });
  expect(result.actions.some((a: any) => a.type === "move" && a.x === 1)).toBe(
    true,
  );
  expect(result.actual).toEqual(result.expected);
  await page.locator("#lab-run").click();
  await expect(page.locator("#lab-status")).toHaveText("unverified");
});
