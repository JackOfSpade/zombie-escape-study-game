import { expect, test, type Page } from "@playwright/test";

async function safeRun(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Enter the building" }).click();
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      a = g.survivors[0],
      f = g.floors[0];
    g.survivors = [a];
    g.zombies = [];
    g.nextSpawn = Number.MAX_SAFE_INTEGER;
    g.surge.anchor = Number.MAX_SAFE_INTEGER;
    f.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
    f.furniture = [];
    Object.assign(a, { x: 10, y: 10, hp: 60 });
    a.inventory = [
      { id: "keyboard-medkit", kind: "medkit", weight: 1, charges: 1 },
    ];
    f.stations = [{ ...f.stations[0], x: 10.8, y: 10 }];
  });
}
async function survivor(page: Page) {
  return page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      a = g.survivors[0];
    return { x: a.x, y: a.y, hp: a.hp, inventory: a.inventory, time: g.time };
  });
}

test("curriculum dropdown owns navigation and shortcuts while real-time survival continues", async ({
  page,
}) => {
  await safeRun(page);
  await page.getByRole("button", { name: "Inspect ↗" }).click();
  await page
    .getByText("Practical environment observations", { exact: true })
    .click();
  const select = page.locator("#environment-item");
  await select.focus();
  await page.evaluate(() => {
    (window as any).keyboardDefaults = [];
    window.addEventListener("keydown", (event) => {
      (window as any).keyboardDefaults.push({
        code: event.code,
        prevented: event.defaultPrevented,
      });
    });
  });
  const before = await survivor(page);
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(400);
  await page.keyboard.up("ArrowDown");
  await page.keyboard.press("1");
  await page.keyboard.press("e");
  const after = await survivor(page);
  expect({ ...after, time: before.time }).toEqual(before);
  expect(after.time).toBeGreaterThan(before.time + 0.2);
  await expect(page.locator("#terminal")).toBeHidden();
  expect(await page.evaluate(() => (window as any).keyboardDefaults)).toEqual([
    { code: "ArrowDown", prevented: false },
    { code: "Digit1", prevented: false },
    { code: "KeyE", prevented: false },
  ]);
});

test("settings has keyboard focus and explicit close preserves the terminal", async ({
  page,
}) => {
  await safeRun(page);
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect(page.locator("#terminal")).toBeVisible();
  await page.locator("#workspace").fill("preserved while changing settings");
  const toggle = page.getByRole("button", { name: "Settings", exact: true });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Transmission settings" }),
  ).toBeVisible();
  await expect(page.locator("#volume")).toBeFocused();
  const before = await survivor(page);
  await page.keyboard.press("ArrowLeft");
  await page.locator("#settings-close").click();
  await expect(page.locator("#settings")).toBeHidden();
  await expect(toggle).toBeFocused();
  await expect(page.locator("#terminal")).toBeVisible();
  await expect(page.locator("#workspace")).toHaveValue(
    "preserved while changing settings",
  );
  const after = await survivor(page);
  expect([after.x, after.y]).toEqual([before.x, before.y]);
  await page.locator("#leave").click();
  await expect(page.locator("#terminal")).toBeHidden();
  await expect(page.locator("#world")).toBeFocused();
  await page.keyboard.down("w");
  await page.waitForTimeout(200);
  await page.keyboard.up("w");
  expect((await survivor(page)).y).toBeLessThan(before.y);
});

test("opening panels clears held movement and close restores the invoking control", async ({
  page,
}) => {
  await safeRun(page);
  await page.locator("#world").focus();
  await page.keyboard.down("d");
  await page.waitForTimeout(100);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const before = await survivor(page);
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.waitForTimeout(200);
  const after = await survivor(page);
  expect([after.x, after.y]).toEqual([before.x, before.y]);
  await page.keyboard.up("d");
  await expect(page.locator("#settings-toggle")).toBeFocused();
  const inspect = page.getByRole("button", { name: "Inspect ↗" });
  await inspect.click();
  await expect(
    page.getByRole("dialog", { name: "Learning continuity", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#inspector-title")).toBeFocused();
  await page.locator("#close-inspector").click();
  await expect(page.locator("#inspector")).toBeHidden();
  await expect(inspect).toBeFocused();
});

test("panels remain modeless, close in display order and preserve navigation back to the world", async ({
  page,
}) => {
  await safeRun(page);
  const inspect = page.getByRole("button", { name: "Inspect ↗" }),
    settings = page.getByRole("button", { name: "Settings", exact: true });
  await inspect.click();
  await settings.click();
  await expect(inspect).toHaveAttribute("aria-expanded", "true");
  await expect(settings).toHaveAttribute("aria-expanded", "true");
  expect(
    await page
      .locator("#settings")
      .evaluate((el) => Number(getComputedStyle(el).zIndex)),
  ).toBeGreaterThan(
    await page
      .locator("#inspector")
      .evaluate((el) => Number(getComputedStyle(el).zIndex)),
  );
  await page.locator("#settings-close").click();
  await expect(page.locator("#settings")).toBeHidden();
  await expect(settings).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#inspector")).toBeVisible();
  await page.locator("#world").focus();
  const before = await survivor(page);
  await page.keyboard.down("w");
  await page.waitForTimeout(200);
  await page.keyboard.up("w");
  expect((await survivor(page)).y).toBeLessThan(before.y);
  await page.locator("#close-inspector").click();
  await expect(page.locator("#inspector")).toBeHidden();
  await expect(inspect).toBeFocused();
  await expect(inspect).toHaveAttribute("aria-expanded", "false");
});
