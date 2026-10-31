import { addDays, isDelayedReview, localDate } from "./learner";
import {
  reviewSignature,
  scopeKey,
  type LearnerLedger,
  type RetentionEvent,
  type ReviewRecord,
} from "./learning-model";
import type { Roadmap } from "./model";
import { observationInvalidated } from "./observation-validity";
import type { RoadmapReconciliation } from "./roadmap-adoption-types";

export const retentionEventText = (event: RetentionEvent) =>
  `<!-- RETENTION_EVENT ${encodeURIComponent(JSON.stringify(event))} -->`;
function advance(
  previous: ReviewRecord,
  session: string,
  observedAt?: string,
): ReviewRecord {
  const stage = Math.min(2, previous.stage + 1);
  const next = {
    ...previous,
    stage,
    verifiedReviews: previous.verifiedReviews + 1,
    lastIndependentAt: observedAt,
    sequence: session,
    due: addDays(localDate(observedAt!), [3, 7, 21][stage]),
  };
  delete next.lastIndependentDate;
  return next;
}
/** Replay only locally retained, receipt-backed full-scope delayed reviews.
 * Uploaded audit comments never become qualified events automatically. */
export function replayRetention(r: Roadmap, l: LearnerLedger, scopeId: string) {
  const history =
      l.retentionHistory?.filter((e) => e.scopeId === scopeId) ?? [],
    definition = l.scopes[scopeId];
  if (!history.length || !definition)
    throw Error(
      "Retention reassessment needs the original evidence-linked review history",
    );
  let result = structuredClone(history[0].before),
    previousAt = -Infinity;
  const ids = new Set<string>();
  for (const event of history) {
    const attempt = l.attempts.find((a) => a.id === event.attemptId),
      receipt = l.receipts[event.assessmentId],
      evidence = l.evidence.filter((e) => event.evidenceIds.includes(e.id)),
      observedAt = evidence
        .map((e) => e.observedAt)
        .filter((t): t is string => !!t)
        .sort()
        .at(-1),
      at = Date.parse(event.at);
    if (
      !attempt ||
      !receipt ||
      ids.has(event.assessmentId) ||
      !Number.isFinite(at) ||
      at < previousAt ||
      !attempt.contract.review ||
      !attempt.contract.objectiveIds.includes(definition.objectiveId) ||
      attempt.contract.depth !== definition.depth ||
      event.before.objectiveId !== definition.objectiveId ||
      event.before.depth !== definition.depth ||
      !event.evidenceIds.length ||
      new Set(event.evidenceIds).size !== event.evidenceIds.length ||
      evidence.length !== event.evidenceIds.length ||
      evidence.some(
        (e) =>
          e.attemptId !== event.attemptId ||
          !Number.isFinite(Date.parse(e.at)) ||
          Date.parse(e.at) > at ||
          e.objectiveId !== definition.objectiveId ||
          e.depth !== definition.depth ||
          e.outcome !== "independent" ||
          !e.observedAt ||
          !isDelayedReview(event.before, e.observedAt, attempt.session) ||
          !Object.values(l.receipts).some(
            (prior) =>
              prior.version <= receipt.version &&
              prior.evidenceIds.includes(e.id),
          ),
      ) ||
      !receipt.evidenceIds.some((ref) => event.evidenceIds.includes(ref)) ||
      !definition.facets.every((f) => evidence.some((e) => e.facet === f.id)) ||
      !isDelayedReview(event.before, event.at, attempt.session) ||
      reviewSignature(advance(event.before, attempt.session, observedAt)) !==
        reviewSignature(event.after)
    )
      throw Error(
        "Retention history failed its exact assessment, scope or transaction validation",
      );
    ids.add(event.assessmentId);
    previousAt = at;
    if (
      evidence.some((e) =>
        observationInvalidated(r, l, definition.objectiveId, e.id),
      )
    )
      continue;
    if (
      evidence.every(
        (e) =>
          e.observedAt &&
          isDelayedReview(result, e.observedAt, attempt.session),
      )
    )
      result = advance(result, attempt.session, observedAt);
  }
  return result;
}

export function reviewRetentionUpdates(
  r: Roadmap,
  before: LearnerLedger,
  work: LearnerLedger,
  p: RoadmapReconciliation,
  parsed: Roadmap,
) {
  if (
    !Array.isArray(p.retentionUpdates ?? []) ||
    (p.retentionUpdates?.length ?? 0) > 800
  )
    throw Error("Invalid retention reassessment declarations");
  const changed = new Set<string>();
  for (const ev of before.evidence) {
    const scope = scopeKey(ev.objectiveId, ev.depth);
    if (
      ev.outcome === "independent" &&
      before.reviews[scope]?.verifiedReviews > 0 &&
      !before.retentionHistory?.some((event) => event.scopeId === scope) &&
      before.attempts.some((a) => a.id === ev.attemptId && a.contract.review) &&
      !observationInvalidated(r, before, ev.objectiveId, ev.id) &&
      observationInvalidated(r, work, ev.objectiveId, ev.id)
    )
      throw Error(
        "Legacy retention correction needs its original evidence-linked review history; do not guess dates or counts",
      );
  }
  for (const event of before.retentionHistory ?? []) {
    const d = before.scopes[event.scopeId];
    if (
      d &&
      event.evidenceIds.some(
        (ref) =>
          !observationInvalidated(r, before, d.objectiveId, ref) &&
          observationInvalidated(r, work, d.objectiveId, ref),
      )
    )
      changed.add(event.scopeId);
  }
  const reviewed = new Set<string>();
  for (const update of p.retentionUpdates ?? []) {
    if (
      !update ||
      !changed.has(update.scopeId) ||
      reviewed.has(update.scopeId) ||
      typeof update.rationale !== "string" ||
      !update.rationale.trim() ||
      update.rationale.length > 1500
    )
      throw Error(
        "Retention reassessment must identify a newly invalidated recorded review and explain its correction",
      );
    const previous = replayRetention(r, before, update.scopeId),
      expected = replayRetention(r, work, update.scopeId);
    if (
      reviewSignature(previous) !==
      reviewSignature(before.reviews[update.scopeId])
    )
      throw Error(
        "Current retention differs from its retained review history; dedicated reconciliation is required",
      );
    if (
      reviewSignature(expected) !==
      reviewSignature(parsed.resume?.reviews?.[update.scopeId])
    )
      throw Error(
        "Reviewed retention must exactly replay the remaining valid observations without invented dates or counts",
      );
    const objective = parsed.tracks[
      expected.objectiveId.startsWith("PY:") ? "PY" : "PE"
    ].objectives.find((o) => o.id === expected.objectiveId);
    if (
      expected.depth === 1 &&
      objective &&
      objective.reviewDue !== expected.due
    )
      throw Error(
        "Reviewed retention due date must match the checkpoint's saved schedule",
      );
    reviewed.add(update.scopeId);
  }
  if ([...changed].some((id) => !reviewed.has(id)))
    throw Error(
      "Invalidating a delayed review requires an explicit evidence-linked retention reassessment",
    );
  return reviewed;
}
