import { expect, test, type Page } from "@playwright/test";
async function scene(page: Page) {
  await page.goto("/");
  await page.locator("#start").click();
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      a = g.survivors[0],
      f = g.floors[0];
    g.survivors = [a];
    g.settings.view = "top-down";
    g.zombies = [];
    g.nextSpawn = 1e9;
    g.surge.anchor = 1e9;
    f.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
    f.stations = [];
    f.furniture = [];
    f.stairs = { x: 35, y: 25 };
    Object.assign(a, { x: 10, y: 12 });
  });
  await page.locator("#world").focus();
}
test("WASD contacts push a solid NPC body without crossing through it", async ({
  page,
}) => {
  await scene(page);
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    g.survivors.push({
      ...structuredClone(g.survivors[0]),
      id: "solid-npc",
      name: "Solid",
      x: 11,
      y: 12,
      speed: 0,
      inventory: [],
      path: [],
      seen: [],
      role: "analyst",
    });
  });
  await page.keyboard.down("d");
  await page.waitForTimeout(800);
  await page.keyboard.up("d");
  const p = await page.evaluate(() => {
    const [a, b] = (window as any).__deadAir.game.survivors;
    return { a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y } };
  });
  expect(Math.hypot(p.a.x - p.b.x, p.a.y - p.b.y)).toBeGreaterThan(0.49);
  expect(p.a.x).toBeLessThan(p.b.x);
  expect(p.b.x).toBeGreaterThan(11.1);
  await page.screenshot({ path: "test-results/rigid-character-contact.png" });
});
test("E releases the latch without animation; a real keyboard push swings the leaf and reload keeps its state", async ({
  page,
}) => {
  await scene(page);
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    Object.assign(g.survivors[0], { x: 11.4, y: 12.5 });
    g.floors[0].furniture = [
      {
        id: "physical-door",
        kind: "door",
        floor: 0,
        x: 12,
        y: 12.5,
        w: 1,
        h: 3,
        hp: 240,
        maxHp: 240,
        speed: 0,
        rotation: 0,
        destroyed: false,
        movers: [],
        moved: 0,
        credited: [],
        turning: 0,
        open: false,
      },
    ];
  });
  await page.keyboard.down("d");
  await page.waitForTimeout(400);
  await page.keyboard.up("d");
  expect(
    await page.evaluate(
      () => (window as any).__deadAir.game.floors[0].furniture[0].door.latched,
    ),
  ).toBe(true);
  await page.keyboard.press("e");
  const released = await page.evaluate(() => {
    const o = (window as any).__deadAir.game.floors[0].furniture[0];
    return { angle: o.angle, latched: o.door.latched };
  });
  expect(released.latched).toBe(false);
  expect(Math.abs(released.angle)).toBeLessThan(0.01);
  await page.keyboard.down("d");
  await page.waitForTimeout(900);
  await page.keyboard.up("d");
  expect(
    await page.evaluate(() =>
      Math.abs((window as any).__deadAir.game.floors[0].furniture[0].angle),
    ),
  ).toBeGreaterThan(0.1);
  await page.screenshot({ path: "test-results/rigid-door.png" });
  await page.keyboard.press("Escape");
  await expect(page.locator("#pause-save-status")).toContainText("saved");
  const saved = await page.evaluate(() =>
    JSON.stringify((window as any).__deadAir.game.floors[0].furniture[0]),
  );
  await page.reload();
  await expect(page.locator("#pause-menu")).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.stringify((window as any).__deadAir.game.floors[0].furniture[0]),
    ),
  ).toBe(saved);
});
test("E near a released free end grips it for a physical inward pull, then releases", async ({
  page,
}) => {
  await scene(page);
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      f = g.floors[0];
    Object.assign(g.survivors[0], { x: 11.9, y: 12.5 });
    for (let y = 0; y < 34; y++) if (y !== 12) f.tiles[y][12] = 1;
    for (let x = 8; x < 12; x++) {
      f.tiles[11][x] = 1;
      f.tiles[13][x] = 1;
    }
    const door = {
      id: "pull-door",
      kind: "door",
      floor: 0,
      x: 12.5,
      y: 12.5,
      w: 1,
      h: 1,
      hp: 240,
      maxHp: 240,
      speed: 0,
      rotation: 0,
      destroyed: false,
      movers: [],
      moved: 0,
      credited: [],
      turning: 0,
      open: false,
    };
    f.furniture = [
      door,
      {
        ...door,
        id: "outside-cover",
        kind: "fridge",
        x: 13.55,
        w: 1.1,
        h: 1.1,
        speed: 0.38,
      },
    ];
  });
  await page.keyboard.press("e");
  await page.keyboard.press("e");
  expect(
    await page.evaluate(
      () => (window as any).__deadAir.game.survivors[0].grip?.object,
    ),
  ).toBe("pull-door");
  await page.keyboard.down("a");
  await page.waitForTimeout(450);
  await page.keyboard.up("a");
  expect(
    await page.evaluate(
      () => (window as any).__deadAir.game.floors[0].furniture[0].angle,
    ),
  ).toBeGreaterThan(0.3);
  await page.keyboard.press("e");
  expect(
    await page.evaluate(() => (window as any).__deadAir.game.survivors[0].grip),
  ).toBeUndefined();
});
