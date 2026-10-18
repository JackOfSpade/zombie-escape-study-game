import type { Game, Roadmap } from "../../src/model";
import { createGame } from "../../src/world";
export interface ExplorationScenario {
  description: string;
  sourceConfiguration: { physicsSha256: string; stepSeconds: number };
  world: Omit<Game, "study">;
}
export function restoreExplorationScenario(
  r: Roadmap,
  snapshot: ExplorationScenario,
) {
  const g = createGame(snapshot.world.seed, r),
    study = g.study;
  Object.assign(g, structuredClone(snapshot.world), { study });
  const survivors = g.survivors.filter(
    (a) => a.alive && !a.escaped && a.floor === 1,
  );
  if (
    survivors.length !== 3 ||
    survivors.some((a) =>
      a.seen.some((id) => id.startsWith("f1-room0-station")),
    )
  )
    throw Error("Expected three captured survivors with an undiscovered annex");
  return { g, survivors };
}
