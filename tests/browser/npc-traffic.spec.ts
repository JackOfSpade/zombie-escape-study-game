import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
for (const id of [
  "crowded-study-arrival",
  "stationary-traffic-island",
  "contact-traffic-release",
  "doorway-crowd-flow",
])
  test(`${id}: browser engine resolves friendly traffic`, async ({ page }) => {
    await page.goto("/lab.html");
    await expect(page.locator("#lab-message")).toContainText("Loaded");
    await page
      .locator("#lab-json")
      .fill(readFileSync(`tests/fixtures/gametest/${id}.json`, "utf8"));
    await page.locator("#lab-apply-json").click();
    if (id === "doorway-crowd-flow") {
      for (let i = 0; i < 3; i++) await page.locator("#lab-step30").click();
      await page
        .locator("#lab-world")
        .screenshot({ path: ".artifacts/doorway-flow.png" });
    }
    await page.locator("#lab-run").click();
    await expect(page.locator("#lab-status")).toHaveText("passed");
  });
