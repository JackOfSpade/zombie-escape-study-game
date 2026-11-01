import type { Page } from "@playwright/test";

/** Geometry-mutating UI fixtures become independent test scenes. Their saved
 * coordinates must not claim to be the unchanged accepted authored inventory. */
export async function detachAuthoredScene(page: Page) {
  await page.evaluate(() => {
    const game = (window as any).__deadAir.game;
    delete game.design;
    for (const floor of game.floors) {
      delete floor.design;
      delete floor.exteriorDesign;
      delete floor.environment;
      delete floor.scene;
      for (const furniture of floor.furniture) delete furniture.appearance;
    }
  });
}
