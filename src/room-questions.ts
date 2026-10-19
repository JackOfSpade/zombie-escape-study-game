import type { Encounter, Game, Problem, Roadmap } from "./model";
import { devProblem } from "./practice-problem";
import { recordSpawn, spawnContract } from "./topic-spawn";

export function roomEncounters(g: Game, e: Encounter) {
  return e.questionRoom
    ? Object.values(g.encounters).filter(
        (peer) =>
          peer.floor === e.floor && peer.questionRoom === e.questionRoom,
      )
    : [e];
}
/** Copy only the prompt contract. Never share mutable drafts, tutor history or completion. */
export function assignRoomProblem(
  g: Game,
  source: Encounter,
  problem: Problem,
) {
  for (const e of roomEncounters(g, source)) {
    if (e.problem || e.state === "consumed") continue;
    e.problem = structuredClone(problem);
    delete e.error;
    if (!e.workspace && e.revision === 0) e.workspace = problem.starter;
    e.state = "in-progress";
  }
}
/** Local practice requires no connector. Live questions are generated on request. */
export function preparePracticeRooms(g: Game, roadmap: Roadmap) {
  if (g.study.profile !== "development") return;
  for (const e of Object.values(g.encounters)) {
    if (!e.questionRoom || e.problem || e.state === "consumed") continue;
    try {
      // Room questions have their own seeded stream; spawning and NPC decisions
      // must not change merely because a question was prepared.
      const rng =
        Array.from(e.questionRoom).reduce(
          (hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619),
          g.seed,
        ) >>> 0;
      // Rooms rotate topics: the formal visit stays reachable while other
      // rooms practise cooled topics, gaps first, for variety and recall.
      const contract = spawnContract(roadmap, g.study);
      assignRoomProblem(g, e, devProblem({ ...g, rng }, roadmap, contract));
      recordSpawn(g.study, contract, e.questionRoom, g.time);
    } catch {
      // A curriculum gate can have no eligible next task. Do not invent one.
      return;
    }
  }
}
