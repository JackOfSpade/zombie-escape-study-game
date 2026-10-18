import type { Encounter } from "./model";
// Reconstruct a version for an evidence packet without storing a full copy on
// every keystroke. Submissions remain immutable full snapshots.
export function workspaceAt(e: Encounter, cutoff = Infinity) {
  let content = e.workspaceBase ?? e.problem?.starter ?? "",
    revision = 0;
  for (const h of e.history
    .filter((h) => h.kind === "edit" && h.seq <= cutoff)
    .sort((a, b) => a.seq - b.seq)) {
    if (h.delta) {
      const { prefix, removed, inserted } = h.delta;
      if (
        prefix < 0 ||
        prefix > content.length ||
        content.slice(prefix, prefix + removed.length) !== removed
      )
        throw Error(`Invalid workspace history at revision ${h.revision}`);
      content =
        content.slice(0, prefix) +
        inserted +
        content.slice(prefix + removed.length);
    } else content = h.text; // Legacy saves stored full authored snapshots.
    revision = h.revision;
  }
  return { content, revision };
}
