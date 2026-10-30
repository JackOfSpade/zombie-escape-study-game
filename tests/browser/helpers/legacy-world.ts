import type { Page } from "@playwright/test";

/**
 * Fresh runs use the force-field redesign (forward layout, door/gate fields,
 * solo stations, personal keys). Specs that exercise the legacy building
 * mechanics (furniture, vaults, shared stations, twenty opportunities)
 * swap the live run for a legacy-layout world after entering the building.
 * The same roadmap and study state are kept; only the world changes.
 */
export async function enterLegacyBuilding(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Enter the building" }).click();
  await useLegacyWorld(page);
}

export async function useLegacyWorld(page: Page) {
  await page.waitForFunction(() => !!(window as any).__deadAir);
  await page.evaluate(async () => {
    const root = "/src/";
    const { createGame } = await import(/* @vite-ignore */ root + "world.ts");
    const g = (window as any).__deadAir.game;
    const legacy = createGame(
      g.seed,
      (window as any).__deadAir.roadmap,
      g.study,
    );
    // These historical fixtures use world-axis controls and Canvas 2D probes.
    legacy.settings.view = "top-down";
    // This is the actual historical factory, including its pacing and fresh
    // lifecycle. Object.assign alone would retain absent optional fields from
    // the playable world, silently mixing study timing with legacy geometry.
    delete g.rules;
    delete g.pacing;
    delete g.endedAt;
    delete g.lastStudyEncounter;
    Object.assign(g, legacy, { status: "playing" });
  });
}
