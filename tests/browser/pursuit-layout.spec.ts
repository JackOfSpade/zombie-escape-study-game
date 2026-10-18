import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
for (const id of [
  "pursuit-main-breach",
  "pursuit-solved-egress",
  "pursuit-randomized-egress",
])
  test(`${id}: current layout works in the browser Test Lab`, async ({
    page,
  }) => {
    await page.goto("/lab.html");
    await expect(page.locator("#lab-message")).toContainText("Loaded");
    await page
      .locator("#lab-json")
      .fill(readFileSync(`tests/fixtures/gametest/${id}.json`, "utf8"));
    await page.locator("#lab-apply-json").click();
    if (id === "pursuit-main-breach")
      await page
        .locator("#lab-world")
        .screenshot({ path: ".artifacts/pursuit-floor-overview.png" });
    await page.locator("#lab-run").click();
    await expect(page.locator("#lab-status")).toHaveText("passed");
  });
