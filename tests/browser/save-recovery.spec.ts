import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { flushNativeSave, mockNativeStudy } from "./native-study-harness";

async function rawDurableSave(page: Page) {
  return page.evaluate(async () => {
    const root = "/src/";
    const { readDurable } = await import(
      /* @vite-ignore */ root + "storage.ts"
    );
    return readDurable("dead-air-save-v1");
  });
}

test("hiding a paused study tab synchronously checkpoints incomplete local work", async ({
  page,
}) => {
  await mockNativeStudy(page);
  await page.goto("/");
  await page.locator("#study-only-toggle").click();
  await flushNativeSave(page);
  const checkpoint = await page.evaluate(async () => {
    const root = "/src/";
    const { decode } = await import(/* @vite-ignore */ root + "persistence.ts");
    const g = (window as any).__deadAir.game;
    g.encounters["f0-room0"].chatDraft = "Synthetic unfinished local reasoning";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    const raw = JSON.parse(localStorage.getItem("dead-air-save-v1")!);
    return decode(raw.data).encounters["f0-room0"].chatDraft;
  });
  expect(checkpoint).toBe("Synthetic unfinished local reasoning");
  await page.reload();
  await expect(page.locator("#study-workspace")).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as any).__deadAir.game.encounters["f0-room0"].chatDraft,
    ),
  ).toBe("Synthetic unfinished local reasoning");
});

test("an unreadable checkpoint stays protected through lifecycle saves until a valid backup is restored", async ({
  page,
}) => {
  await mockNativeStudy(page);
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("synthetic-corrupt-save-seeded")) {
      localStorage.setItem("dead-air-save-v1", "synthetic damaged checkpoint");
      sessionStorage.setItem("synthetic-corrupt-save-seeded", "1");
    }
  });
  await page.goto("/");
  await expect(page.locator("#save-recovery-status")).toContainText(
    "Existing checkpoints have been protected",
  );
  await expect(
    page.getByRole("button", { name: "Enter the building" }),
  ).toHaveCount(0);
  expect(await rawDurableSave(page)).toBeNull();
  await page.evaluate(() => {
    window.dispatchEvent(new Event("blur"));
    window.dispatchEvent(new Event("pagehide"));
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(
    await page.evaluate(() => localStorage.getItem("dead-air-save-v1")),
  ).toBe("synthetic damaged checkpoint");
  expect(await rawDurableSave(page)).toBeNull();
  await page.locator("#study-only-toggle").click();
  await expect(page.locator("#study-workspace")).toBeHidden();

  const downloading = page.waitForEvent("download");
  await page.locator("#save-recovery-export").click();
  const downloaded = await downloading;
  expect(downloaded.suggestedFilename()).toBe(
    "zombie-escape-study-game-recovery.json",
  );
  const recoveredBytes = JSON.parse(
    await readFile((await downloaded.path())!, "utf8"),
  );
  expect(recoveredBytes.local).toBe("synthetic damaged checkpoint");
  await page.locator("#save-recovery-import").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}"),
  });
  await expect(page.locator("#save-recovery-status")).toContainText(
    "Import rejected",
  );
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  expect(
    await page.evaluate(() => localStorage.getItem("dead-air-save-v1")),
  ).toBe("synthetic damaged checkpoint");
  expect(await rawDurableSave(page)).toBeNull();

  const backup = await page.evaluate(async () => {
    const root = "/src/";
    const { encode } = await import(/* @vite-ignore */ root + "persistence.ts");
    const { createGame } = await import(/* @vite-ignore */ root + "world.ts");
    const g = createGame(123, (window as any).__deadAir.roadmap);
    g.encounters["f0-room0"].chatDraft =
      "Synthetic unfinished answer restored from backup";
    return encode(g);
  });
  await page.locator("#save-recovery-import").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(backup),
  });
  await expect(page.locator("#save-recovery-status")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Enter the building" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Enter the building" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as any).__deadAir.game.encounters["f0-room0"].chatDraft,
    ),
  ).toBe("Synthetic unfinished answer restored from backup");
});
