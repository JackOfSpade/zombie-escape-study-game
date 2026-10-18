import type { Game, Roadmap } from "../../src/model";
import { createGame } from "../../src/world";
export interface SurvivalScenario {
  description: string;
  sourceConfiguration: { physicsSha256: string; stepSeconds: number };
  world: Omit<Game, "study">;
}
/** Captured world replay never inherits a learner ledger or awards human work. */
export function restoreSurvivalScenario(
  r: Roadmap,
  snapshot: SurvivalScenario,
) {
  const g = createGame(snapshot.world.seed, r),
    study = g.study;
  Object.assign(g, structuredClone(snapshot.world), { study });
  return g;
}
