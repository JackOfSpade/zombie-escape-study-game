import { chooseDesignedRun, startDesignedRun } from "./helpers/designed-run";
import { openGameMenu } from "./helpers/game-menu";
import { test, expect } from "@playwright/test";

test("real IndexedDB recovers after a synchronous open failure and commits the next save", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const root = "/src/",
      { createDurableStorage } = await import(root + "storage.ts");
    let calls = 0;
    const storage = createDurableStorage(() => ({
      open(name: string, version?: number) {
        if (calls++ === 0)
          throw new DOMException("Synthetic temporary denial", "SecurityError");
        return indexedDB.open(name, version);
      },
    }));
    let failed = false;
    try {
      await storage.read("maintenance-probe");
    } catch {
      failed = true;
    }
    await storage.write("maintenance-probe", "durable retry");
    return { failed, calls, value: await storage.read("maintenance-probe") };
  });
  expect(result).toEqual({ failed: true, calls: 2, value: "durable retry" });
});

test("a delayed roadmap export cannot commit its old snapshot to a restarted run", async ({
  page,
}) => {
  await page.goto("/");
  await startDesignedRun(page);
  const oldId = await page.evaluate(async () => {
    const root = "/src/",
      { initialLearner } = await import(root + "learner.ts"),
      g = (window as any).__deadAir.game;
    g.survivors = g.survivors.slice(0, 1);
    g.zombies = [];
    g.nextSpawn = 1e9;
    g.surge.anchor = 1e9;
    g.study.profile = "live";
    g.study.learner = initialLearner((window as any).__deadAir.roadmap);
    return g.id;
  });
  await openGameMenu(page);
  await page.locator("#curriculum-button").click();
  await page.evaluate(() => {
    const original = crypto.subtle.digest.bind(crypto.subtle);
    let first = true;
    crypto.subtle.digest = async (algorithm, data) => {
      if (first) {
        first = false;
        (window as any).__exportWaiting = true;
        await new Promise<void>((resolve) => {
          (window as any).__releaseExport = () => {
            crypto.subtle.digest = original;
            resolve();
          };
        });
      }
      return original(algorithm, data);
    };
  });
  await page.locator("#progress-export").click();
  await page.waitForFunction(() => (window as any).__exportWaiting === true);
  await page.keyboard.press("Escape");
  await page.locator("#restart-game").click();
  await chooseDesignedRun(page);
  // Restart saves learning first; release the export once the new run exists.
  await expect(page.locator("#pause-menu")).not.toBeVisible();
  await page.evaluate(() => (window as any).__releaseExport());
  await expect(page.locator("#progress-export-status")).toContainText(
    "Run changed during export",
  );
  const after = await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    return { id: g.id, cache: g.study.roadmapExport ?? null };
  });
  expect(after.id).not.toBe(oldId);
  expect(after.cache).toBeNull();
});

test("an older handoff status response cannot undo a newer local disable result", async ({
  page,
}) => {
  let release!: () => void,
    hold = false,
    controlled = false,
    held = 0;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/handoff/status", async (route) => {
    // Startup also checks relay metadata. Only hold settings requests, and
    // distinguish control completion from independent periodic status polls.
    const old = hold && !controlled;
    if (old) {
      held++;
      await gate;
    }
    await route.fulfill({
      json: {
        enabled: old,
        autonomousWork: false,
        queued: 0,
        working: 0,
        done: old ? 99 : 0,
        public: { configured: false },
      },
    });
  });
  // This fixture never forwards a control mutation to the actual bridge.
  await page.route("**/api/handoff/control", (route) => {
    controlled = true;
    return route.fulfill({ json: { enabled: false } });
  });
  await page.goto("/");
  await openGameMenu(page);
  hold = true;
  await page.locator("#settings-toggle").click();
  await expect.poll(() => held).toBeGreaterThanOrEqual(1);
  await page.locator("#handoff-enable").evaluate((input: HTMLInputElement) => {
    input.checked = false;
    input.dispatchEvent(new Event("change"));
  });
  await expect.poll(() => controlled).toBe(true);
  await expect(page.locator("#handoff-status")).toContainText("Disabled");
  const late = page.waitForResponse(
    async (response) =>
      response.url().endsWith("/api/handoff/status") &&
      (await response.json()).done === 99,
  );
  release();
  await (await late).finished();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(page.locator("#handoff-enable")).not.toBeChecked();
  await expect(page.locator("#handoff-status")).not.toContainText(
    "99 answered",
  );
});
