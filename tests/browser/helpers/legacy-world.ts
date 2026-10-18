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
    // Legacy worlds carry no rules flag; a fresh run's force-field rules must
    // not survive the swap, since they change spawning and disable vaulting.
    delete g.rules;
    Object.assign(g, legacy, { status: "playing" });
  });
}
