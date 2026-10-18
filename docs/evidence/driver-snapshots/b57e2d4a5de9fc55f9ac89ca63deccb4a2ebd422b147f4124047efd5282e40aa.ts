import { type Encounter, type Game, event } from "./model";
import { canReachStation, human } from "./engine";
import { workspaceAt } from "./workspace-history";
import { humanUsingWorkspace, npcAtWorkstation } from "./npc-work-access";
export interface WorkspacePatch {
  prefix: number;
  removed: string;
  inserted: string;
}
export interface WorkspaceProposal {
  autonomous?: boolean;
  sourceProblem?: string;
  appliedAutomatically?: boolean;
  submissionId?: string;
  id: string;
  author: string;
  sourceRevision: number;
  sourceSequence: number;
  artifactSequence: number;
  patch: WorkspacePatch;
  state: "pending" | "applied" | "dismissed";
  reviewSequence?: number;
  appliedRevision?: number;
}
export function validateWorkspacePatch(patch: WorkspacePatch, source: string) {
  if (
    !patch ||
    !Number.isSafeInteger(patch.prefix) ||
    patch.prefix < 0 ||
    patch.prefix > source.length ||
    typeof patch.removed !== "string" ||
    typeof patch.inserted !== "string" ||
    patch.removed.length + patch.inserted.length > 32000 ||
    patch.removed === patch.inserted ||
    source.slice(patch.prefix, patch.prefix + patch.removed.length) !==
      patch.removed
  )
    throw Error("Candidate edit does not match its captured workspace");
  return (
    source.slice(0, patch.prefix) +
    patch.inserted +
    source.slice(patch.prefix + patch.removed.length)
  );
}
export function proposalText(text: string, patch: WorkspacePatch) {
  return `${text}\n\nProposed change at character ${patch.prefix}:\nRemove:\n${patch.removed || "(nothing)"}\nInsert:\n${patch.inserted || "(nothing)"}`;
}
export function proposalPreview(e: Encounter, p: WorkspaceProposal) {
  const base = workspaceAt(e, p.sourceSequence);
  if (base.revision !== p.sourceRevision)
    throw Error("Candidate source revision cannot be reconstructed");
  return validateWorkspacePatch(p.patch, base.content);
}
/** Human acceptance records review only. The authored code stays NPC work. */
export function reviewWorkspaceProposal(
  g: Game,
  e: Encounter,
  id: string,
  action: "apply" | "dismiss",
) {
  if (!["apply", "dismiss"].includes(action))
    throw Error("Unknown candidate review action");
  const p = e.proposals?.find((p) => p.id === id),
    a = human(g);
  const station = g.floors[a.floor].stations.find(
    (s) => s.id === a.station && s.encounter === e.id,
  );
  if (!p || p.state !== "pending")
    throw Error("Candidate was already reviewed or is unavailable");
  if (
    g.encounters[e.id] !== e ||
    g.status !== "playing" ||
    !e.problem ||
    e.mode !== "shared" ||
    e.floor !== a.floor ||
    !station ||
    !canReachStation(g, a, station) ||
    e.state === "consumed"
  )
    throw Error(
      "Return to this unfinished shared terminal to review its candidate",
    );
  const artifact = e.history.find(
    (h) =>
      h.seq === p.artifactSequence &&
      h.author === p.author &&
      h.kind === "npc-proposal",
  );
  if (
    !artifact ||
    artifact.revision !== p.sourceRevision ||
    !artifact.delta ||
    artifact.delta.prefix !== p.patch.prefix ||
    artifact.delta.removed !== p.patch.removed ||
    artifact.delta.inserted !== p.patch.inserted
  )
    throw Error("Candidate attribution or original patch is missing");
  let next: string | undefined;
  if (action === "apply") {
    if (e.revision !== p.sourceRevision)
      throw Error(
        "Candidate is stale. Ask for a new proposal based on the current revision.",
      );
    const base = workspaceAt(e, p.sourceSequence);
    if (base.content !== e.workspace)
      throw Error("Candidate source differs from the current workspace");
    next = proposalPreview(e, p);
  }
  const reviewed = event(
    g,
    "proposal-review",
    `Human ${action === "apply" ? "accepted" : "dismissed"} ${p.author}'s candidate.`,
    e.floor,
    "human",
    e.id,
  );
  e.history.push({
    seq: reviewed.seq,
    author: "human",
    kind: "activity",
    text: reviewed.text,
    at: g.time,
    wallTime: new Date().toISOString(),
    revision: e.revision,
    refs: [String(p.artifactSequence)],
  });
  p.reviewSequence = reviewed.seq;
  p.state = action === "apply" ? "applied" : "dismissed";
  if (next !== undefined) {
    e.workspaceBase ??= e.workspace;
    e.workspace = next;
    e.revision++;
    p.appliedRevision = e.revision;
    artifact.presented ??= reviewed.seq;
    const applied = event(
      g,
      "edit",
      `${p.author}'s reviewed candidate became workspace revision ${e.revision}; unvalidated and not executed.`,
      e.floor,
      p.author,
      e.id,
    );
    e.history.push({
      seq: applied.seq,
      author: p.author,
      kind: "edit",
      text: p.patch.inserted || `Removed: ${p.patch.removed}`,
      delta: { ...p.patch },
      revision: e.revision,
      at: g.time,
      wallTime: new Date().toISOString(),
      refs: [String(p.artifactSequence), String(reviewed.seq)],
      presented: applied.seq,
    });
  }
  return p;
}
export function presentWorkspaceProposal(g: Game, e: Encounter, id: string) {
  const p = e.proposals?.find((p) => p.id === id);
  const h =
    p &&
    e.history.find(
      (h) =>
        h.seq === p.artifactSequence &&
        h.kind === "npc-proposal" &&
        h.author === p.author,
    );
  if (!h || h.presented !== undefined) return;
  h.presented = event(
    g,
    "proposal-presented",
    "Candidate edit became visible to the human.",
    e.floor,
    p!.author,
    e.id,
  ).seq;
}

/** An explicitly prepared NPC draft can change the shared workspace only while
 * the human editor is detached. No human review or exposure is fabricated. */
export function applyAutonomousProposal(g: Game, e: Encounter, id: string) {
  const p = e.proposals?.find((p) => p.id === id);
  if (
    !p ||
    p.state !== "pending" ||
    !p.autonomous ||
    !npcAtWorkstation(g, e, p.author) ||
    humanUsingWorkspace(g, e) ||
    e.submissions.some((s) => s.status === "pending")
  )
    throw Error(
      "Autonomous candidate requires its seated author and an unattended unfinished shared workspace",
    );
  const batch = e.materializations?.find(
      (j) =>
        j.state === "applied" &&
        j.autonomyAllowed &&
        j.artifactSequences.includes(p.artifactSequence),
    ),
    artifact = e.history.find(
      (h) =>
        h.seq === p.artifactSequence &&
        h.kind === "npc-proposal" &&
        h.author === p.author,
    );
  if (
    !batch ||
    p.sourceProblem !== JSON.stringify(e.problem) ||
    !artifact ||
    !artifact.delta ||
    JSON.stringify(artifact.delta) !== JSON.stringify(p.patch) ||
    e.revision !== p.sourceRevision ||
    workspaceAt(e, p.sourceSequence).content !== e.workspace
  )
    throw Error("Autonomous candidate source or authorization is stale");
  const next = proposalPreview(e, p);
  e.workspaceBase ??= e.workspace;
  e.workspace = next;
  e.revision++;
  p.state = "applied";
  p.appliedAutomatically = true;
  p.appliedRevision = e.revision;
  const ev = event(
    g,
    "edit",
    `${p.author} edited the shared workspace while the human was away; not validated or executed.`,
    e.floor,
    p.author,
    e.id,
  );
  e.history.push({
    seq: ev.seq,
    author: p.author,
    kind: "edit",
    text: p.patch.inserted || `Removed: ${p.patch.removed}`,
    delta: structuredClone(p.patch),
    at: g.time,
    wallTime: new Date().toISOString(),
    revision: e.revision,
    refs: [String(p.artifactSequence)],
  });
  return p;
}
