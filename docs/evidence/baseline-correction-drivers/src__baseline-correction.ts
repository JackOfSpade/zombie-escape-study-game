import type { Roadmap } from "./model";
import type { LearnerLedger } from "./learning-model";
import type { RoadmapReconciliation } from "./roadmap-adoption-types";
import { historicalScope } from "./historical-scope";
import {
  baselineCheckpointRefs,
  baselineCheckpointValid,
  observationInvalidated,
} from "./observation-validity";

/** A terminal audit alone cannot retract a trusted original checkpoint.
 * Require explicit whole-scope review of its complete attributed history. */
export function reviewBaselineCorrections(
  r: Roadmap,
  before: LearnerLedger,
  work: LearnerLedger,
  p: RoadmapReconciliation,
  parsed: Roadmap,
) {
  const affected = new Set<string>();
  for (const track of ["PY", "PE"] as const)
    for (const o of r.tracks[track].objectives)
      for (let depth = 1; depth <= o.target; depth++) {
        const id = `${o.id}/D${depth}`,
          support = baselineCheckpointRefs(r, o.id, depth);
        if (!support.length || baselineCheckpointValid(r, work, o.id, depth))
          continue;
        const review = before.reviews[id],
          nextReview = parsed.resume?.reviews
            ? parsed.resume.reviews[id]
            : review;
        const signature = (value: typeof review | undefined) =>
          JSON.stringify(
            Object.entries(value ?? {})
              .filter(([, v]) => v !== undefined)
              .sort(([a], [b]) => a.localeCompare(b)),
          );
        if (
          signature(review) !== signature(nextReview) ||
          (depth === 1 &&
            review &&
            parsed.tracks[track].objectives.find((item) => item.id === o.id)
              ?.reviewDue !== review.due)
        )
          throw Error(
            "Baseline withdrawal must retain exact retention dates, stage and verified-review counts",
          );
        if (!baselineCheckpointValid(r, before, o.id, depth)) continue;
        const history = historicalScope(r, track, o.id, depth),
          mappings = p.mappings.filter((m) => m.scopeId === id),
          definition = p.definitions.find((d) => d.id === id);
        if (before.cells[o.id].states[depth - 1] === "R")
          throw Error(
            "Baseline correction with a later material contradiction requires dedicated negative-evidence reassessment",
          );
        if (review && (review.stage > 0 || review.verifiedReviews > 0))
          throw Error(
            "Baseline correction with later verified retention requires dedicated retention reassessment",
          );
        if (
          !support.length ||
          !definition ||
          !p.completeScopes.includes(id) ||
          !definition.facets.every((f) =>
            mappings.some((m) => m.facet === f.id),
          )
        )
          throw Error(
            "Original baseline correction requires an explicit complete historical-scope review with every facet mapped",
          );
        const rows = history.evidenceRows.map((row) =>
          row
            .split("|")
            .slice(1, -1)
            .map((c) => c.trim()),
        );
        if (!support.every((ref) => rows.some((c) => c[0] === ref)))
          throw Error(
            "Baseline support must have exact historical scope records",
          );
        for (const c of rows) {
          const invalid = observationInvalidated(r, work, o.id, c[0]);
          const references = mappings.filter((m) =>
            m.evidenceIds.includes(c[0]),
          );
          if (
            !references.length ||
            (invalid && references.some((m) => m.outcome !== "unknown")) ||
            (!invalid &&
              ["DIAGNOSTIC", "GUIDED"].includes(c[5]) &&
              /^[0-3]$/.test(c[7]) &&
              !references.some((m) => m.outcome !== "unknown"))
          )
            throw Error(
              "Baseline correction must review every historical observation and preserve unaffected observed knowledge or gaps",
            );
          if (
            invalid &&
            !observationInvalidated(r, before, o.id, c[0]) &&
            !p.attemptUpdates?.some(
              (u) =>
                u.track === track &&
                u.attemptId === c[1] &&
                u.correctionDecision,
            )
          )
            throw Error(
              "Original baseline withdrawal needs exact source correction authority",
            );
        }
        affected.add(id);
      }
  return affected;
}
