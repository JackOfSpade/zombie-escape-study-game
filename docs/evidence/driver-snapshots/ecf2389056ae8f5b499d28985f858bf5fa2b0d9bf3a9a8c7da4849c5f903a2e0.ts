import { type Game, type Encounter, event } from "./model";
import { canReachStation, human } from "./engine";
/** Record the actual visible snapshot, not hidden intermediate NPC drafts.
 * Snapshot attribution remains in edit history; this is exposure, not authorship. */
export function presentSharedWorkspace(g: Game, e: Encounter) {
  const a = human(g),
    station = g.floors[a.floor].stations.find(
      (s) => s.id === a.station && s.encounter === e.id,
    );
  if (
    g.encounters[e.id] !== e ||
    !e.problem ||
    e.mode !== "shared" ||
    a.floor !== e.floor ||
    !station ||
    !canReachStation(g, a, station, 2.2)
  )
    return;
  const accepted = e.submissions.find((s) => s.id === e.accepted),
    cutoff = accepted?.seq ?? Infinity;
  const edits = e.history.filter(
    (h) =>
      h.kind === "edit" &&
      h.presented === undefined &&
      h.author !== "human" &&
      h.author !== "generator" &&
      h.seq <= cutoff,
  );
  if (!edits.length) return;
  const key = `workspace-view:${edits.at(-1)!.seq}:${e.accepted ?? "draft"}`;
  if (
    e.history.some(
      (h) =>
        h.kind === "workspace-view" &&
        h.refs?.includes(key) &&
        h.presented !== undefined,
    )
  )
    return;
  const ev = event(
    g,
    "workspace-presented",
    "A shared workspace containing prior NPC edits became visible.",
    e.floor,
    "workspace",
    e.id,
  );
  e.history.push({
    seq: ev.seq,
    author: "workspace",
    kind: "workspace-view",
    text: `Visible shared workspace v${e.revision}. Authorship remains in the attributed edit history; no execution or correctness is implied.\n${e.workspace}`,
    at: g.time,
    revision: e.revision,
    refs: [key, ...edits.map((h) => `edit:${h.seq}`)],
    presented: ev.seq,
  });
}
