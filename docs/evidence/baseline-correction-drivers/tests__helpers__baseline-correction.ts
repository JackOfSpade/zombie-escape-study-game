// Controlled source-audit fixture. Never a real judgment about the learner.
import { readFileSync } from "node:fs";
import type { Game, Roadmap } from "../../src/model";
import type {
  RoadmapReconciliationPayload,
  RoadmapReconciliation,
} from "../../src/roadmap-adoption-types";
import { historicalScope } from "../../src/historical-scope";
import { baselineCheckpointRefs } from "../../src/observation-validity";
import { prepareRoadmapExport } from "../../src/roadmap-export";
import { inspectMergedDocument } from "../../src/roadmap-structure";
import {
  readIdentifierCounters,
  projectIdentifierCounters,
} from "../../src/roadmap-identifiers";
export const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
export async function baselineFixture(g: Game, id = "PY:T05.2") {
  const r = roadmap,
    l = g.study.learner!,
    track = id.startsWith("PY:") ? "PY" : "PE";
  const objective = r.tracks[track].objectives.find((o) => o.id === id)!;
  const history = historicalScope(r, track, id, 1);
  const ref = baselineCheckpointRefs(r, id, 1)[0];
  const observation = history.evidenceRows.find(
    (row) => row.split("|")[1].trim() === ref,
  )!;
  const task = observation.split("|")[2].trim();
  g.study.roadmapExport ??= await prepareRoadmapExport(r, l);
  // Model a manually reviewed source file without issuing a new task just
  // to force a game export. Original evidence, questions and reviews remain.
  const partial = history.evidenceRows.length > 1;
  let raw = g.study.roadmapExport.content
    .replace(
      /^revision: \d+$/m,
      `revision: ${g.study.roadmapExport.revision + 1}`,
    )
    .replace(
      /^previous_revision: \d+$/m,
      `previous_revision: ${g.study.roadmapExport.revision}`,
    )
    .replace(
      /^parent_file_sha256: .+$/m,
      `parent_file_sha256: ${g.study.roadmapExport.hash}`,
    );
  const objectiveKey = [...inspectMergedDocument(raw).rows.keys()].find(
    (k) =>
      k.startsWith(`${track}_PROGRESS/0.4 Objective checkpoint ledger/`) &&
      k.endsWith("/" + id.split(":")[1]),
  )!;
  const objectiveRow = inspectMergedDocument(raw).rows.get(objectiveKey)!;
  const objectiveCells = objectiveRow
    .split("|")
    .slice(1, -1)
    .map((c) => c.trim());
  objectiveCells[2] = partial ? "G" : "U";
  raw = raw.replace(objectiveRow, `| ${objectiveCells.join(" | ")} |`);
  const countKey = [...inspectMergedDocument(raw).rows.keys()].find(
    (k) =>
      k.startsWith(`${track}_PROGRESS/0.1 Learner profile and dashboard/`) &&
      k.endsWith("/Required checkpoint passes"),
  )!;
  const countRow = inspectMergedDocument(raw).rows.get(countKey)!;
  const countCells = countRow
    .split("|")
    .slice(1, -1)
    .map((c) => c.trim());
  const oldCount = track === "PY" ? 2 : 8,
    total = track === "PY" ? 240 : 337,
    roster = track === "PY" ? 80 : 112;
  countCells[1] = `${oldCount - 1}/${total}; D1 ${oldCount - 1}/${roster}; exact original observations retained under reviewed scoring correction`;
  raw = raw.replace(countRow, `| ${countCells.join(" | ")} |`);
  const sharedKey = [...inspectMergedDocument(raw).rows.keys()].find(
    (k) =>
      k.startsWith("SHARED_PROGRESS/S0.1 Unified dashboard/") &&
      k.endsWith("/" + track),
  )!;
  const sharedRow = inspectMergedDocument(raw).rows.get(sharedKey)!;
  const sharedCells = sharedRow
    .split("|")
    .slice(1, -1)
    .map((c) => c.trim());
  sharedCells[3] = `${oldCount - 1}/${total}; D1 ${oldCount - 1}/${roster}`;
  raw = raw.replace(sharedRow, `| ${sharedCells.join(" | ")} |`);
  const key = [...inspectMergedDocument(raw).rows.keys()].find(
    (k) =>
      k.startsWith(`${track}_PROGRESS/0.5.1 Attempt status register/`) &&
      k.endsWith("/" + task),
  )!;
  const previous = inspectMergedDocument(raw).rows.get(key)!;
  const cells = previous
    .split("|")
    .slice(1, -1)
    .map((c) => c.trim());
  cells[3] =
    "INVALIDATED; controlled source scoring correction, preserve original observation";
  raw = raw.replace(previous, `| ${cells.join(" | ")} |`);
  const decisionId = `DEC${String(readIdentifierCounters(raw, false).counters.nextDecision).padStart(4, "0")}`;
  const excerpt =
    "Synthetic source audit found supplied reasoning in this scored task; withdraw its checkpoint support while retaining all original observations and unaffected knowledge.";
  const decision = `| ${decisionId} | 2026-10-17 / synthetic source audit | ASSESSMENT_CORRECTION | ${track}:${task} | ${excerpt} | Original facts and all unaffected history retained | ACTIVE |`;
  const at = raw.indexOf("### S0.4 Merged session history");
  raw = raw.slice(0, at).trimEnd() + "\n" + decision + "\n\n" + raw.slice(at);
  raw = projectIdentifierCounters(
    raw,
    readIdentifierCounters(raw, false).counters,
  );
  const scope = `${id}/D1`;
  const mappings = history.evidenceRows.map((row, i) => {
    const c = row
      .split("|")
      .slice(1, -1)
      .map((s) => s.trim());
    return {
      scopeId: scope,
      facet: `source-${i}`,
      outcome:
        c[0] === ref
          ? ("unknown" as const)
          : c[7] === "1" && c[5] === "DIAGNOSTIC"
            ? ("contradicted" as const)
            : ("assisted" as const),
      evidenceIds: [c[0]],
      sourceExcerpts: { [c[0]]: c[8] },
      rationale:
        "Synthetic complete historical-scope review retaining this attributed observation",
    };
  });
  function proposal(p: RoadmapReconciliationPayload): RoadmapReconciliation {
    const prior = inspectMergedDocument(p.local).rows;
    return {
      requestId: p.requestId,
      localHash: p.localHash,
      candidateHash: p.candidateHash,
      canonical: p.candidate,
      definitions: [
        {
          id: scope,
          objectiveId: id,
          depth: 1,
          sourceScope: objective.scope,
          facets: mappings.map((m, i) => ({
            id: m.facet,
            description: `Synthetic source-defined facet ${i}: ${objective.scope}`,
          })),
        },
      ],
      mappings: structuredClone(mappings),
      completeScopes: [scope],
      attemptUpdates: [
        {
          track,
          attemptId: task,
          rationale: "Controlled explicit original baseline correction",
          correctionDecision: { id: decisionId, excerpt },
        },
      ],
      decisions: [...inspectMergedDocument(p.candidate).rows]
        .filter(([k, row]) => prior.has(k) && prior.get(k) !== row)
        .map(([key]) => ({
          key,
          choice: "incoming",
          rationale:
            "Use exact reviewed correction while retaining original records",
        })),
      rationale: "Synthetic source audit only; no actual human learning result",
    };
  }
  return {
    raw,
    proposal,
    id,
    scope,
    ref,
    task,
    decision,
    decisionId,
    history,
    partial,
    key,
    previous,
  };
}
