import { expect, test } from "@playwright/test";
const state = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const d = (window as any).__deadAir,
      g = d.game;
    return {
      view: d.view,
      time: g.time,
      seq: g.seq,
      x: g.survivors[0].x,
      floorName: g.floors[1].name,
    };
  });
test("after death the frozen building can be watched floor by floor with a free camera", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Enter the building" }).click();
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      a = g.survivors[0];
    g.zombies = [];
    g.nextSpawn = 999999;
    Object.assign(a, { alive: false, hp: 0 });
    g.status = "dead";
  });
  await expect(
    page.getByRole("button", { name: "Begin another run" }),
  ).toBeVisible();
  await expect(page.locator("#spectator")).toBeHidden();
  const before = await state(page);
  await page.getByRole("button", { name: "Watch the building" }).click();
  await expect(page.locator("#start-card")).toBeHidden();
  await expect(page.locator("#spectator")).toBeVisible();
  await expect(page.locator("body")).toHaveClass(/spectating/);
  await expect(page.locator("#hud")).toBeHidden();
  const floors = page.locator("#spectator-floors button");
  await expect(floors).toHaveText(["1", "2", "3", "4", "ROOF"]);
  await expect(floors.nth(0)).toHaveAttribute("aria-pressed", "true");
  const opened = await state(page);
  expect(opened.view.floor).toBe(0);
  expect(opened.view.zoom).toBe(1);
  expect(opened.view.focus.x).toBeCloseTo(before.x, 6);
  await floors.filter({ hasText: "ROOF" }).click();
  await expect(page.locator("#floor-label")).toHaveText("ROOFTOP / EXTRACTION");
  await expect(floors.nth(4)).toHaveAttribute("aria-pressed", "true");
  await expect(floors.nth(0)).toHaveAttribute("aria-pressed", "false");
  expect((await state(page)).view.floor).toBe(4);
  await floors.nth(1).click();
  await expect(page.locator("#floor-label")).toHaveText("FLOOR 02 / 4");
  await expect(page.locator("#floor-name")).toHaveText(before.floorName);
  // Keys pan the camera on the viewed floor.
  await page.locator("#world").focus();
  const start = (await state(page)).view.focus.x;
  await page.keyboard.down("d");
  await page.waitForTimeout(300);
  await page.keyboard.up("d");
  const panned = await state(page);
  expect(panned.view.floor).toBe(1);
  expect(panned.view.focus.x).toBeGreaterThan(start + 1);
  // The wheel zooms, within bounds.
  const box = (await page.locator("#world").boundingBox())!;
  const cx = box.x + box.width / 2,
    cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.wheel(0, -100);
  await expect
    .poll(async () => (await state(page)).view.zoom)
    .toBeGreaterThan(1);
  expect((await state(page)).view.zoom).toBeLessThanOrEqual(2.5);
  await page.mouse.wheel(0, 100);
  await page.mouse.wheel(0, 100);
  await expect
    .poll(async () => (await state(page)).view.zoom)
    .toBeLessThanOrEqual(1);
  // Dragging the world right moves the focus left.
  const beforeDrag = (await state(page)).view.focus.x;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 60, cy, { steps: 4 });
  await page.mouse.move(cx + 120, cy, { steps: 4 });
  await page.mouse.up();
  const dragged = (await state(page)).view.focus.x;
  expect(dragged).toBeLessThan(beforeDrag - 1);
  expect(dragged).toBeGreaterThanOrEqual(0);
  // The summary comes back on demand and Esc toggles it.
  await page.getByRole("button", { name: "Run summary" }).click();
  await expect(
    page.getByRole("button", { name: "Begin another run" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#start-card")).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.locator("#start-card")).toBeVisible();
  // Nothing in the world moved while spectating.
  const after = await state(page);
  expect(after.time).toBe(before.time);
  expect(after.seq).toBe(before.seq);
  expect(after.x).toBe(before.x);
  // The ended save still offers spectating after a reload.
  await page.reload();
  await page.getByRole("button", { name: "Watch the building" }).click();
  await expect(page.locator("#spectator")).toBeVisible();
  await expect(page.locator("#floor-label")).toHaveText("FLOOR 01 / 4");
  // A new run leaves spectator mode.
  await page.getByRole("button", { name: "Run summary" }).click();
  await page.getByRole("button", { name: "Begin another run" }).click();
  await expect(page.locator("body")).not.toHaveClass(/spectating/);
  await expect(page.locator("#spectator")).toBeHidden();
  await expect(page.locator("#start-card")).toBeHidden();
  await expect(page.locator("#hud")).toBeVisible();
  expect((await state(page)).view).toBeUndefined();
});
