import { encounterKey, interruptLearningAttempt } from "./learner";
import type { Encounter, Game, TutorRequest } from "./model";

/** Static roadmap texts re-derivable from the curriculum; never re-read once settled. */
export const RELEASED_REQUEST_FIELDS = [
  "curriculum",
  "progressContext",
] as const;

/** Drop static context from a stored request; keeps every auditable field. */
export function releaseRequestContext(job: { payloadJson: string }): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(job.payloadJson);
  } catch {
    return false;
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return false;
  const record = payload as Record<string, unknown>;
  let removed = false;
  for (const field of RELEASED_REQUEST_FIELDS)
    if (field in record) {
      delete record[field];
      removed = true;
    }
  if (removed) job.payloadJson = JSON.stringify(record);
  return removed;
}

export function settleTutorRequest(
  job: TutorRequest,
  state: "applied" | "superseded",
): void {
  job.state = state;
  releaseRequestContext(job);
}

export function releaseSettledRequests(e: Encounter, all = false): void {
  for (const job of e.tutorRequests ?? [])
    if (all || job.state === "applied" || job.state === "superseded")
      releaseRequestContext(job);
}

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
    if (archive) {
      const archived = g.study.archives.filter(
        (a) => encounterKey(a) === encounterKey(e),
      );
      if (!archived.length) g.study.archives.push(e);
      for (const a of archived) releaseSettledRequests(a, true);
      releaseSettledRequests(e, true);
    }
    if (g.study.learner) interruptLearningAttempt(g.study.learner, e);
  }
  return retained;
}
