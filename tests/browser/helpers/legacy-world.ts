import { startDesignedRun } from "./designed-run";
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
  // Legacy fixtures are top-down. Never render the first-person city start:
  // software WebGL on CI makes each of those frames cost seconds.
  await page.waitForFunction(() => !!(window as any).__deadAir);
  await page.evaluate(() => {
    (window as any).__deadAir.game.settings.view = "top-down";
  });
  await startDesignedRun(page);
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
    for (const key of Object.keys(g))
      if (!Object.hasOwn(legacy, key)) delete g[key];
    Object.assign(g, legacy, { status: "playing" });
  });
}
