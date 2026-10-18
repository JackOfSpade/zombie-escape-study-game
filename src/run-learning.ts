import { encounterKey, interruptLearningAttempt } from "./learner";
import type { Game } from "./model";

/** Preserve actual human context, including an issued but unanswered question. */
export function retainRunLearning(g: Game, archive = false) {
  const retained = Object.values(g.encounters).filter(
    (e) =>
      e.problemPresentedSequence !== undefined ||
      e.history.some((h) => h.author === "human") ||
      e.contributors.includes("human") ||
      (e.executions?.length ?? 0) > 0 ||
      g.study.learner?.attempts.some((a) => a.encounter === encounterKey(e)),
  );
  for (const e of retained) {
    if (
      archive &&
      !g.study.archives.some((a) => encounterKey(a) === encounterKey(e))
    )
      g.study.archives.push(e);
    if (g.study.learner) interruptLearningAttempt(g.study.learner, e);
  }
  return retained;
}
