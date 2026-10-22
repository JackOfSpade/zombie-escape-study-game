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

/** Saved direct ChatGPT question session (structural; mirrors the model type). */
interface SavedDirectStudy {
  id: string;
  provider: string;
  payloadJson: string;
  questionFingerprint: string;
  state: "pending" | "interrupted" | "applied" | "superseded";
  responseDigest?: string;
  error?: string;
  transportPhase?: unknown;
  transportPhaseAt?: number;
}
const directOf = (e: Encounter) =>
  (e as { directStudy?: SavedDirectStudy }).directStudy;

export function releaseSettledRequests(e: Encounter, all = false): void {
  for (const job of e.tutorRequests ?? [])
    if (all || job.state === "applied" || job.state === "superseded")
      releaseRequestContext(job);
  // A pending/interrupted direct question keeps its exact frozen payload even
  // when archived; only settled sessions may drop static context.
  const direct = directOf(e);
  if (
    direct &&
    typeof direct.payloadJson === "string" &&
    (direct.state === "applied" || direct.state === "superseded")
  )
    releaseRequestContext(direct);
}

const DIRECT_STATES = new Set([
  "pending",
  "interrupted",
  "applied",
  "superseded",
]);
/** Validate a saved direct session as data; malformed sessions become interrupted. */
export function recoverDirectStudy(e: Encounter): void {
  const holder = e as { directStudy?: unknown };
  if (holder.directStudy === undefined) return;
  const s = holder.directStudy as Record<string, unknown> | null;
  if (!s || typeof s !== "object" || Array.isArray(s)) {
    delete holder.directStudy;
    return;
  }
  const malformed = (reason: string) => {
    if (s.state === "applied" || s.state === "superseded") return;
    s.state = "interrupted";
    s.error = `Saved ChatGPT question is malformed (${reason}); it cannot be retried.`;
  };
  delete s.transportPhase;
  delete s.transportPhaseAt;
  if (typeof s.state !== "string" || !DIRECT_STATES.has(s.state)) {
    s.state = "interrupted";
    s.error = "Saved ChatGPT question had an unknown state; retry is required.";
  }
  if (
    typeof s.id !== "string" ||
    !s.id ||
    typeof s.questionFingerprint !== "string" ||
    !/^[0-9a-f]{64}$/.test(s.questionFingerprint) ||
    typeof s.payloadJson !== "string"
  )
    return malformed("identity");
  let payload: unknown;
  try {
    payload = JSON.parse(s.payloadJson);
  } catch {
    return malformed("payload");
  }
  const p = payload as Record<string, unknown> | null;
  if (
    !p ||
    typeof p !== "object" ||
    Array.isArray(p) ||
    p.requestId !== s.id ||
    p.questionFingerprint !== s.questionFingerprint ||
    p.mode !== "terminal-direct" ||
    !p.problem ||
    typeof p.problem !== "object"
  )
    return malformed("payload binding");
  if (s.state === "pending") {
    s.state = "interrupted";
    s.error =
      "Application restarted while the ChatGPT question was open; it resumes with the exact saved question.";
  }
}

/** Preserve actual human context, including an issued but unanswered question. */
export function retainRunLearning(g: Game, archive = false) {
  const retained = Object.values(g.encounters).filter(
    (e) =>
      e.problemPresentedSequence !== undefined ||
      directOf(e) !== undefined ||
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
