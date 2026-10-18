import { expect, test, type Page } from "@playwright/test";
async function setup(page: Page) {
  await page.goto("/");
  await page.locator("#start").click();
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      a = g.survivors[0],
      f = g.floors[0];
    g.survivors = [a];
    g.zombies = [];
    g.nextSpawn = 1e9;
    g.surge.anchor = 1e9;
    f.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
    f.furniture = [];
    Object.assign(a, { x: 10, y: 10 });
    f.stairs = { x: 30, y: 30 };
    f.stations = [{ ...f.stations[0], x: 10.8, y: 10 }];
  });
}
test("Esc freezes survival while typing, preserves work and survives reload; resume has no catch-up", async ({
  page,
}) => {
  await setup(page);
  await page.keyboard.press("e");
  await page.locator("#workspace").fill("saved learner draft");
  await page.keyboard.press("Escape");
  await expect(page.locator("#pause-menu")).toBeVisible();
  const before = await page.evaluate(() =>
    JSON.stringify((window as any).__deadAir.game),
  );
  await page.keyboard.press("w");
  await page.keyboard.press("e");
  await page.waitForTimeout(700);
  expect(
    await page.evaluate(() => JSON.stringify((window as any).__deadAir.game)),
  ).toBe(before);
  await expect(page.locator("#pause-save-status")).toContainText("saved");
  await page.reload();
  await expect(page.locator("#pause-menu")).toBeVisible();
  const time = await page.evaluate(() => (window as any).__deadAir.game.time);
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => (window as any).__deadAir.game.time)).toBe(
    time,
  );
  await page.keyboard.press("Escape");
  await expect(page.locator("#pause-menu")).not.toBeVisible();
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect(page.locator("#workspace")).toHaveValue("saved learner draft");
  await page.waitForTimeout(250);
  const elapsed =
    (await page.evaluate(() => (window as any).__deadAir.game.time)) - time;
  expect(elapsed).toBeGreaterThan(0.15);
  expect(elapsed).toBeLessThan(1);
});
test("pause restart retains original progress and archives unfinished human work", async ({
  page,
}) => {
  await setup(page);
  await page.keyboard.press("e");
  await page
    .locator("#workspace")
    .fill("unfinished human reasoning survives restart");
  const before = await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    return {
      id: g.id,
      progress: g.study.learner,
      source: g.study.learner?.sourceHash,
      encounters: Object.keys(g.encounters),
    };
  });
  await page.keyboard.press("Escape");
  await page.locator("#restart-game").click();
  await expect(page.locator("#pause-menu")).not.toBeVisible();
  const after = await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    return {
      id: g.id,
      progress: g.study.learner,
      source: g.study.learner?.sourceHash,
      archives: g.study.archives.map((e: any) => e.workspace),
      paused: g.paused,
    };
  });
  expect(after.id).not.toBe(before.id);
  expect(after.progress).toEqual(before.progress);
  expect(after.source).toEqual(before.source);
  expect(after.archives).toContain(
    "unfinished human reasoning survives restart",
  );
  expect(after.paused).toBe(false);
});
test("E toggles a pivoting grip; old G/R/digit shortcuts do not act; Space vaults", async ({
  page,
}) => {
  await setup(page);
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      a = g.survivors[0],
      f = g.floors[0];
    f.stations = [];
    f.furniture = [
      {
        id: "test-sofa",
        kind: "sofa",
        floor: 0,
        x: 12,
        y: 12,
        w: 3.8,
        h: 1.2,
        hp: 100,
        maxHp: 100,
        speed: 1,
        rotation: 0,
        destroyed: false,
        movers: [],
        moved: 0,
        credited: [],
        turning: 0,
      },
    ];
    Object.assign(a, {
      x: 9.55,
      y: 12,
      hp: 50,
      inventory: [{ id: "medkit", kind: "medkit", weight: 1, charges: 1 }],
    });
    f.furniture.push({
      ...f.furniture[0],
      id: "closer-center-chair",
      kind: "chair",
      x: 9.55,
      y: 10.8,
      w: 0.6,
      h: 0.6,
    });
    f.stairs = { x: a.x, y: a.y + 2 }; // Nearby but out of reach: must not swallow E on the long sofa end.
  });
  await page.keyboard.press("r");
  await page.keyboard.press("1");
  expect(
    await page.evaluate(() => (window as any).__deadAir.game.survivors[0].hp),
  ).toBe(50);
  await page.keyboard.press("e");
  await page.keyboard.down("w");
  await page.waitForTimeout(500);
  await page.keyboard.up("w");
  const pose = await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    return { grip: g.survivors[0].grip, angle: g.floors[0].furniture[0].angle };
  });
  expect(pose.grip.object).toBe("test-sofa");
  expect(Math.abs(pose.angle)).toBeGreaterThan(0.05);
  await page.keyboard.press("e");
  expect(
    await page.evaluate(() => (window as any).__deadAir.game.survivors[0].grip),
  ).toBeUndefined();
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      o = g.floors[0].furniture[0],
      a = g.survivors[0];
    Object.assign(o, { angle: 0, x: 12, y: 12 });
    Object.assign(a, { x: 12, y: 10.85, heading: { x: 0, y: 1 } });
  });
  await page.keyboard.press("Space");
  expect(
    await page.evaluate(
      () => !!(window as any).__deadAir.game.survivors[0].vault,
    ),
  ).toBe(true);
  await page.waitForTimeout(1400);
  expect(
    await page.evaluate(() => (window as any).__deadAir.game.survivors[0].y),
  ).toBeGreaterThan(12.6);
});
test("downloadable diagnostics retain only newest three runs, including pause/restart and no drafts", async ({
  page,
}) => {
  await setup(page);
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("Escape");
    await page.locator("#restart-game").click();
  }
  await page.keyboard.press("Escape");
  const downloaded = page.waitForEvent("download");
  await page.locator("#pause-logs").click();
  const file = await downloaded;
  const path = await file.path();
  const { readFile } = await import("node:fs/promises");
  const log = JSON.parse(await readFile(path!, "utf8"));
  expect(log.runs).toHaveLength(3);
  expect(log.runs.at(-1).entries.some((e: any) => e.type === "pause")).toBe(
    true,
  );
  expect(log.runs.at(-2).entries.some((e: any) => e.type === "restart")).toBe(
    true,
  );
  expect(log.runs.at(-2).summary.outcome).toBe("restarted");
  expect(JSON.stringify(log)).not.toContain('"study"');
  await page.screenshot({
    path: "test-results/pause-menu.png",
    fullPage: true,
  });
});

test("Space uses the current movement direction and vaults the faced long barricade, not a nearer chair behind", async ({
  page,
}) => {
  await setup(page);
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      a = g.survivors[0],
      f = g.floors[0];
    f.stations = [];
    Object.assign(a, { x: 14.7, y: 10.95, heading: { x: 0, y: -1 } });
    const o = {
      id: "long-barricade",
      kind: "shelf",
      floor: 0,
      x: 12,
      y: 12,
      w: 6,
      h: 1,
      hp: 100,
      maxHp: 100,
      speed: 0.32,
      rotation: 0,
      destroyed: false,
      movers: [],
      moved: 0,
      credited: [],
      turning: 0,
    };
    f.furniture = [
      o,
      {
        ...o,
        id: "chair-behind",
        kind: "chair",
        x: a.x,
        y: 9.5,
        w: 0.8,
        h: 0.8,
      },
    ];
  });
  await page.locator("#world").focus();
  // Same input frame: Space must not use the previous heading.
  await page.keyboard.down("s");
  await page.keyboard.press("Space");
  await page.keyboard.up("s");
  expect(
    await page.evaluate(
      () => (window as any).__deadAir.game.survivors[0].vault?.obstacle,
    ),
  ).toBe("long-barricade");
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__deadAir.game.survivors[0].y),
    )
    .toBeGreaterThan(12.7);
});
