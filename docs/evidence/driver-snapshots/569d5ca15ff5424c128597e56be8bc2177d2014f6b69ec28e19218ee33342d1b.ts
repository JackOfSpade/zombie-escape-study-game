import type { Roadmap } from "./model";
import type { LearnerLedger } from "./learning-model";
import { inspectMergedDocument } from "./roadmap-structure";
const cache = new WeakMap<
  LearnerLedger,
  { text: string; invalid: Set<string>; attempts: Map<string, string> }
>();
/** Later retained source dispositions qualify earlier receipts. Keeping an
 * observation is not permission to keep counting it after its task is invalid. */
export function observationInvalidated(
  r: Roadmap,
  l: LearnerLedger,
  objective: string,
  ref: string,
) {
  const text = l.roadmapAdoptions?.at(-1)?.proposal.canonical ?? r.raw;
  let read = cache.get(l);
  if (read?.text !== text) {
    const invalid = new Set<string>(),
      attempts = new Map<string, string>();
    for (const [key, row] of inspectMergedDocument(text).rows) {
      const c = row
          .split("|")
          .slice(1, -1)
          .map((s) => s.trim()),
        track = key.split("_")[0];
      if (
        key.includes("/0.5.1 Attempt status register/") &&
        /^INVALIDATED\b/.test(c[3] ?? "")
      )
        invalid.add(`${track}:${c[0]}`);
      if (key.includes("/0.5 Assessment evidence register/"))
        attempts.set(`${track}:${c[0]}`, c[1]);
    }
    read = { text, invalid, attempts };
    cache.set(l, read);
  }
  const track = objective.split(":")[0];
  const actual = l.evidence.find(
    (e) => e.id === ref && e.objectiveId === objective,
  );
  const attempt = actual?.attemptId ?? read.attempts.get(`${track}:${ref}`);
  return !!attempt && read.invalid.has(`${track}:${attempt}`);
}
