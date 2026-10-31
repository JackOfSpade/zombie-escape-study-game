import {
  ENVIRONMENT_FACTS,
  normalizeEnvironmentText,
  type EnvironmentManifest,
  type EnvironmentSummary,
  type SurfaceSlot,
  type TextPart,
} from "./environment-contract.mjs";
import { runDesignFingerprint } from "./run-design-contract.mjs";

interface Sample<T> {
  key: string;
  identity: string;
  value: T;
  floor: string;
  group: string;
  role: string;
  length: "short" | "long";
  field: string;
}

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const dimensions = ["floor", "group", "role", "length", "field"] as const;
const weights = [80, 40, 25, 12, 6];

/** Prefer unrepresented places and kinds before filling the remaining slots.
 * Stable ties make sampling independent of manifest iteration order. No RNG is
 * consumed, and a crowded first floor cannot take every history slot. */
function representative<T>(source: Sample<T>[], limit = 32): T[] {
  const remaining = [...source].sort((a, b) => compare(a.key, b.key)),
    counts = dimensions.map(() => new Map<string, number>()),
    selected = new Set<string>(),
    result: T[] = [];
  const score = (candidate: Sample<T>) =>
    dimensions.reduce((total, dimension, index) => {
      const count = counts[index].get(candidate[dimension]) ?? 0;
      return total + weights[index] / (count + 1);
    }, 0);
  while (result.length < limit) {
    let best = -1,
      bestScore = -Infinity;
    for (let index = 0; index < remaining.length; index++) {
      if (selected.has(remaining[index].identity)) continue;
      const value = score(remaining[index]);
      if (value > bestScore) {
        best = index;
        bestScore = value;
      }
    }
    if (best < 0) break;
    const [next] = remaining.splice(best, 1);
    selected.add(next.identity);
    result.push(next.value);
    dimensions.forEach((dimension, index) => {
      const value = next[dimension];
      counts[index].set(value, (counts[index].get(value) ?? 0) + 1);
    });
  }
  return result;
}

function location(slot: SurfaceSlot) {
  return {
    floor: `${slot.floor}:${slot.scope}`,
    group:
      slot.scope === "exterior"
        ? "exterior"
        : `f${slot.floor}:${slot.room ?? "common"}`,
    role: slot.role,
  };
}

/** Shared fragments are intentional reuse, not independent authored passages.
 * Keep adjacent ordinary parts together but never join prose across an omitted
 * fragment into a passage that was not actually written. */
function ordinarySpans(parts: readonly TextPart[]) {
  const spans: string[] = [];
  let current = "";
  for (const part of parts) {
    if ("text" in part) current += part.text;
    else {
      if (current) spans.push(current);
      current = "";
    }
  }
  if (current) spans.push(current);
  return spans;
}

/** New quality-first runs retain a representative fictional history using the
 * existing bounded summary schema. Historical summaries remain readable as-is. */
export function summarizeQualityEnvironment(
  manifest: EnvironmentManifest,
): EnvironmentSummary {
  const slots = new Map(manifest.surfaces.map((slot) => [slot.id, slot])),
    exempt = new Set(
      [
        ...Object.values(ENVIRONMENT_FACTS),
        ...manifest.fragments.flatMap((fragment) =>
          fragment.kind === "direction" ? [] : [fragment.text],
        ),
      ].map(normalizeEnvironmentText),
    ),
    prose: Sample<string>[] = [],
    art: Sample<{ hash: string; description: string }>[] = [];
  for (const entry of manifest.entries) {
    const slot = slots.get(entry.surfaceId);
    if (!slot) continue; // Accepted manifests have already validated every ID.
    const where = location(slot);
    for (const field of ["title", "body"] as const) {
      ordinarySpans(entry[field]).forEach((span, index) => {
        const normalized = normalizeEnvironmentText(span);
        if (normalized.length < 4 || exempt.has(normalized)) return;
        const value = normalized.slice(0, 120).trimEnd();
        prose.push({
          ...where,
          key: `${slot.id}:${field}:${index}:${value}`,
          identity: value,
          value,
          length: normalized.length <= 48 ? "short" : "long",
          field,
        });
      });
    }
    if (
      entry.drawing &&
      !exempt.has(normalizeEnvironmentText(entry.description))
    ) {
      const hash = runDesignFingerprint(entry.drawing),
        counts = new Map<string, number>();
      for (const primitive of entry.drawing.primitives)
        counts.set(primitive.kind, (counts.get(primitive.kind) ?? 0) + 1);
      const composition = [...counts]
          .sort(([a], [b]) => compare(a, b))
          .map(([kind, count]) => `${count} ${kind}`)
          .join(", "),
        description =
          `${entry.description.slice(0, 110)} [${composition}]`.slice(0, 160);
      art.push({
        ...where,
        key: `${slot.id}:${hash}`,
        identity: hash,
        value: { hash, description },
        length: entry.description.length <= 48 ? "short" : "long",
        field: "drawing",
      });
    }
  }
  const drawings = representative(art);
  return {
    fingerprint: runDesignFingerprint(manifest),
    phrases: representative(prose),
    art: drawings.map((drawing) => drawing.hash),
    artDescriptions: drawings.map((drawing) => drawing.description),
  };
}
