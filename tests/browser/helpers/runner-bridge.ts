import type { Page } from "@playwright/test";

/** Exercise the real local runner without releasing study/model requests. */
export async function isolateRunnerBridge(page: Page) {
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/execute") return route.continue();
    if (path === "/api/status")
      return route.fulfill({
        json: {
          mode: "development",
          label: "Synthetic runner fixture",
          capabilities: [],
          detail: "Only the local restricted execution route is connected.",
        },
      });
    if (path === "/api/handoff/status")
      return route.fulfill({
        json: {
          enabled: false,
          autonomousWork: false,
          queued: 0,
          working: 0,
          done: 0,
          public: { configured: false },
          tunnel: { state: "off", verified: false },
        },
      });
    return route.fulfill({
      status: 503,
      json: { error: "Study requests are isolated in this runner fixture" },
    });
  });
}
