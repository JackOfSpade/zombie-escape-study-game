import { type Game, type Roadmap } from "../../src/model";
import { createGame } from "../../src/world";

export interface RoofScenario {
  description: string;
  sourceConfiguration: { physicsSha256: string; stepSeconds: number };
  world: Omit<Game, "study">;
}
/** Restore recorded physical state while keeping a fresh, untouched ledger. */
export function restoreRoofScenario(r: Roadmap, snapshot: RoofScenario) {
  const g = createGame(snapshot.world.seed, r),
    study = g.study;
  Object.assign(g, structuredClone(snapshot.world), { study });
  const survivor = g.survivors.find((a) => a.alive && !a.escaped);
  if (!survivor || survivor.floor !== 4)
    throw Error("Expected the captured final rooftop survivor");
  return { g, survivor };
}
