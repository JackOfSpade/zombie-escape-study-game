import type { Page } from "@playwright/test";

/** Opt drawing and world-axis control regressions into the classic view. */
export async function selectTopDown(page: Page) {
  await page.waitForFunction(() => !!(window as any).__deadAir);
  await page.evaluate(() => {
    (window as any).__deadAir.game.settings.view = "top-down";
  });
  await page.waitForFunction(
    () =>
      document.querySelector<HTMLCanvasElement>("#world")!.clientWidth > 300,
  );
}
