import { expect, test } from "@playwright/test";
test("normal play records local frame costs and pausing persists the diagnostic window", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#start").click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__deadAir.game.time))
    .toBeGreaterThan(3);
  await page.keyboard.press("Escape");
  await expect(page.locator("#pause-menu")).toBeVisible();
  const performanceEntries = await page.evaluate(async () => {
    const { readDurable } = await import("/src/storage.ts" as string);
    const raw = await readDurable("recent-game-diagnostics-v1");
    return raw
      ? JSON.parse(raw).runs.flatMap((r: any) =>
          r.entries.filter((e: any) => e.type === "performance"),
        )
      : [];
  });
  expect(performanceEntries.length).toBeGreaterThan(0);
  const data = performanceEntries.at(-1).data;
  expect(data.fps).toBeGreaterThan(0);
  expect(data.frames).toBeGreaterThan(1);
  expect(data.steps).toBeGreaterThan(0);
  expect(data.maxWorkMs).toBeGreaterThanOrEqual(data.avgWorkMs);
  expect(data.maxSimulationMs).toBeGreaterThan(0);
  // Persist/UI attribution is present, finite, internally consistent and
  // bounded by the whole-frame work it is part of.
  for (const key of [
    "avgPersistMs",
    "maxPersistMs",
    "avgUiMs",
    "maxUiMs",
    "avgWorkMs",
    "maxWorkMs",
  ]) {
    expect(typeof data[key]).toBe("number");
    expect(Number.isFinite(data[key])).toBe(true);
    expect(data[key]).toBeGreaterThanOrEqual(0);
  }
  expect(data.maxPersistMs).toBeGreaterThanOrEqual(data.avgPersistMs);
  expect(data.maxUiMs).toBeGreaterThanOrEqual(data.avgUiMs);
  expect(data.maxPersistMs).toBeLessThanOrEqual(data.maxWorkMs + 0.01);
  expect(data.maxUiMs).toBeLessThanOrEqual(data.maxWorkMs + 0.01);
  expect(data.maxWorkMs).toBeLessThan(data.wallMs);
});
test("reused light surfaces stay pixel-stable across frames, flares and resize", async ({
  page,
}) => {
  await page.goto("/lab.html");
  const result = await page.evaluate(async () => {
    const { render } = await import("/src/render.ts" as string),
      { TestRunner } = await import("/src/gametest/runner.ts" as string),
      { emptyScenario } = await import("/src/gametest/schema.ts" as string);
    const roadmap = await (await fetch("/curriculum.json")).json();
    const runner = new TestRunner(emptyScenario(), roadmap),
      g = runner.game;
    g.settings.view = "top-down";
    g.effects.push({
      kind: "flare",
      floor: 0,
      x: 10,
      y: 10,
      radius: 3,
      until: 20,
    });
    const c = document.createElement("canvas");
    c.style.width = "800px";
    c.style.height = "600px";
    document.body.append(c);
    render(c, g);
    const first = c.toDataURL();
    render(c, g);
    const second = c.toDataURL();
    c.style.width = "900px";
    render(c, g);
    c.style.width = "800px";
    render(c, g);
    const resized = c.toDataURL();
    c.remove();
    return { same: first === second, resizeStable: first === resized };
  });
  expect(result).toEqual({ same: true, resizeStable: true });
});
