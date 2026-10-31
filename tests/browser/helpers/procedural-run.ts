import { expect, type Page } from "@playwright/test";

const guardedPages = new WeakSet<Page>();
async function blockRunDesignRequests(page: Page) {
  if (guardedPages.has(page)) return;
  // The chooser starts checking availability immediately. Prevent a live local
  // bridge from queuing AI work before this fixture can select the fallback.
  await page.route("**/api/bridge", (route) => {
    const request = route.request();
    if (
      request.method() === "POST" &&
      request.postDataJSON()?.operation === "design-run"
    )
      return route.fulfill({
        status: 503,
        json: {
          error: "Synthetic fixture uses the explicit procedural option.",
        },
      });
    return route.fallback();
  });
  guardedPages.add(page);
}

/** Exercise the visible fallback in synthetic fixtures without requesting AI. */
export async function chooseProceduralRun(page: Page) {
  await blockRunDesignRequests(page);
  const dialog = page.locator("#run-design-dialog");
  await expect(dialog).toBeVisible();
  const previousId = await page.evaluate(
    () => (window as any).__deadAir.game.id as string,
  );
  await dialog.locator("#run-design-procedural").click();
  await page.waitForFunction((previous) => {
    const game = (window as any).__deadAir?.game;
    return (
      game &&
      game.id !== previous &&
      game.status === "playing" &&
      !game.preparingRun &&
      !game.paused
    );
  }, previousId);
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("#start-card")).toBeHidden();
}

/** A saved ready run resumes directly; only a new run needs a design choice. */
export async function startProceduralRun(page: Page) {
  await blockRunDesignRequests(page);
  await page.waitForFunction(() => !!(window as any).__deadAir);
  const preparing = await page.evaluate(
    () => !!(window as any).__deadAir.game.preparingRun,
  );
  await page.locator("#start").click();
  if (preparing) await chooseProceduralRun(page);
  else {
    await page.waitForFunction(() => {
      const game = (window as any).__deadAir.game;
      return game.status === "playing" && !game.paused;
    });
    await expect(page.locator("#start-card")).toBeHidden();
  }
}
