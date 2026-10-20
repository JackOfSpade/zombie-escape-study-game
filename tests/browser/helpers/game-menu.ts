import type { Page } from "@playwright/test";

/** Reveal the player pause menu without resuming an already paused game. */
export async function openPlayerMenu(page: Page) {
  if (await page.locator("#pause-menu").isHidden())
    await page.locator("#pause-toggle").click();
  if (await page.locator("#pause-home").isHidden())
    await page.locator("#pause-back").click();
}

/** Agent diagnostics stay available to synthetic browser fixtures without
 * adding developer controls to the normal player menu. */
export async function openGameMenu(page: Page) {
  await page.waitForFunction(
    () => typeof (window as any).__deadAir?.openAgentMenu === "function",
  );
  await page.evaluate(() => (window as any).__deadAir.openAgentMenu());
}
