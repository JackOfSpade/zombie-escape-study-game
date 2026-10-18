import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
for (const id of ["force-field-first-touch", "force-field-midway-rejection"]) {
  test(`${id}: the browser lab verifies instant admission and rejection without the study bridge`, async ({
    page,
  }) => {
    const scenario = readFileSync(`tests/fixtures/gametest/${id}.json`, "utf8");
    const bridge: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/")) bridge.push(request.url());
    });
    await page.goto("/lab.html");
    await expect(page.locator("#lab-message")).toContainText("Loaded");
    await page.locator("#lab-json").fill(scenario);
    await page.locator("#lab-apply-json").click();
    await page.locator("#lab-run").click();
    await expect(page.locator("#lab-status")).toHaveText("passed");
    expect(bridge).toEqual([]);
    await page.screenshot({
      path: `.artifacts/${id}-browser.png`,
      fullPage: true,
    });
  });
}
