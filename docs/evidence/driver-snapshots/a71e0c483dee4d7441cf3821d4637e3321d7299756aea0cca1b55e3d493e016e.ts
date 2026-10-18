// Synthetic source-bound reviews only. No actual human results are corrected.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Roadmap } from "../src/model";
import type {
  RoadmapReconciliationPayload,
  RoadmapReconciliation,
} from "../src/roadmap-adoption-types";
import { createGame } from "../src/world";
import {
  finalRequirements,
  finalRequirementStatus,
} from "../src/final-requirements";
import {
  reconcileRoadmap,
  adoptReconciledRoadmap,
} from "../src/roadmap-adoption";
import {
  projectIdentifierCounters,
  readIdentifierCounters,
} from "../src/roadmap-identifiers";
import { inspectMergedDocument } from "../src/roadmap-structure";
import { independentProofValid } from "../src/historical-proof";
import { prepareRoadmapExport } from "../src/roadmap-export";
import { eligibleLearning, beginLearningAttempt } from "../src/learner";
import { encode, decode, recover } from "../src/persistence";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));
const final = finalRequirements(r, "PY").find((d) => d.id === "PY:T01")!;
const excerpt =
  "Synthetic independently observed changed-context reasoning, without supplied choices; full source-defined facet was reviewed.";
const originalTask =
  "| S0007-A98 | S0007 / 2026-10-16 | T01 changed-context assessment | PARTIAL; task remains open despite its qualifying scope evidence | S0007-EV98 | Synthetic source-issued task; no gameplay visit |";
const evidence =
  "| S0007-EV98 | S0007-A98 | 2026-10-16 | T01 | D4 changed-context reasoning | TRANSFER | NONE | 3 | " +
  excerpt +
  " |";
function revision(raw: string, hash: string, n: number) {
  return raw
    .replace(/^revision: \d+$/m, `revision: ${n}`)
    .replace(/^previous_revision: \d+$/m, `previous_revision: ${n - 1}`)
    .replace(/^parent_file_sha256: .+$/m, `parent_file_sha256: ${hash}`);
}
function proposal(p: RoadmapReconciliationPayload): RoadmapReconciliation {
  return {
    requestId: p.requestId,
    localHash: p.localHash,
    candidateHash: p.candidateHash,
    canonical: p.candidate,
    definitions: [],
    mappings: [],
    completeScopes: [],
    decisions: [],
    rationale: "Synthetic source-backed review only, not real learning",
  };
}
function finalRow(raw: string, status: string) {
  const key = [...inspectMergedDocument(raw).rows.keys()].find(
    (k) =>
      k.startsWith("PY_PROGRESS/0.7 Topic transfer and retention/") &&
      k.endsWith("/T01"),
  )!;
  const row = inspectMergedDocument(raw).rows.get(key)!,
    c = row
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
  c[1] = status;
  c[2] = "S0007-EV98" + (raw.includes("| S0007-EV99 |") ? ", S0007-EV99" : "");
  const start = raw.indexOf("<!-- BEGIN PY_PROGRESS -->"),
    end = raw.indexOf("<!-- END PY_PROGRESS -->");
  return (
    raw.slice(0, start) +
    raw.slice(start, end).replace(row, `| ${c.join(" | ")} |`) +
    raw.slice(end)
  );
}
async function setup(partial = false, gap = false) {
  const g = createGame(7, r);
  g.study.profile = "live";
  let raw = revision(r.raw, r.sourceHash, 10),
    at = raw.indexOf(
      "### 0.5.1 Attempt status register",
      raw.indexOf("<!-- BEGIN PY_PROGRESS -->"),
    );
  const extra = evidence
    .replaceAll("98", "99")
    .replace("| 3 |", gap ? "| 1 |" : "| 3 |");
  raw =
    raw.slice(0, at) +
    evidence +
    "\n" +
    (partial ? extra + "\n" : "") +
    "\n" +
    raw.slice(at);
  at = raw.indexOf("### 0.6 Facet gaps", at);
  raw =
    raw.slice(0, at) +
    originalTask +
    "\n" +
    (partial ? originalTask.replaceAll("98", "99") + "\n" : "") +
    "\n" +
    raw.slice(at);
  raw = projectIdentifierCounters(
    finalRow(raw, gap ? "G" : "P"),
    readIdentifierCounters(raw, false).counters,
  );
  await reconcileRoadmap(g, r, raw, async (p) => {
    const out = proposal(p),
      facets = [
        { id: "primary", description: "Synthetic complete source scope facet" },
      ];
    if (partial)
      facets.push({
        id: "secondary",
        description: "Separate synthetic retained scope facet",
      });
    out.definitions = [
      {
        id: "PY:T01/T4",
        objectiveId: "PY:T01",
        depth: 4,
        sourceScope: final.scope,
        facets,
      },
    ];
    out.mappings = facets.map((f, i) => ({
      scopeId: "PY:T01/T4",
      facet: f.id,
      outcome: gap && i === 1 ? "contradicted" : "independent",
      evidenceIds: [`S0007-EV${98 + i}`],
      sourceExcerpts: { [`S0007-EV${98 + i}`]: excerpt },
      rationale: "Synthetic exact-source independent facet mapping",
    }));
    out.completeScopes = gap ? [] : ["PY:T01/T4"];
    return out;
  });
  const job = g.study.roadmapReconciliations!.at(-1)!;
  assert.equal(job.state, "ready", job.error);
  await adoptReconciledRoadmap(g, r, job.id);
  return g;
}
async function withdraw(
  g: ReturnType<typeof createGame>,
  status = "U",
  recycle = false,
) {
  const local = g.study.roadmapExport!;
  let raw = revision(local.content, local.hash, local.revision + 1).replace(
    originalTask,
    originalTask.replace(
      "PARTIAL; task remains open despite its qualifying scope evidence",
      "INVALIDATED; ambiguous supplied task is withdrawn without learner failure",
    ),
  );
  raw = finalRow(raw, status);
  await reconcileRoadmap(g, r, raw, async (p) => {
    const out = proposal(p),
      localRows = inspectMergedDocument(p.local).rows;
    out.attemptUpdates = [
      {
        track: "PY",
        attemptId: "S0007-A98",
        rationale:
          "Source-recorded invalidation of supplied task, not a new contradiction or learner failure",
      },
    ];
    out.decisions = [...inspectMergedDocument(p.candidate).rows]
      .filter(([key, row]) => localRows.has(key) && localRows.get(key) !== row)
      .map(([key]) => ({
        key,
        choice: "incoming",
        rationale:
          "Use exact incoming disposition/status and retain the original observations and audit",
      }));
    if (recycle)
      out.mappings = [
        {
          scopeId: "PY:T01/T4",
          facet: "primary",
          outcome: "independent",
          evidenceIds: ["S0007-EV98"],
          sourceExcerpts: { "S0007-EV98": excerpt },
          rationale: "Synthetic invalid recycled proof",
        },
      ];
    return out;
  });
  return g.study.roadmapReconciliations!.at(-1)!;
}
test("later reviewed invalidation withdraws an older imported pass without changing observations or inventing a learner failure", async () => {
  const g = await setup(),
    before = structuredClone(g.study.learner!),
    old = JSON.stringify(g.study.learner!.roadmapAdoptions![0]);
  assert.equal(
    independentProofValid(
      r,
      g.study.learner!,
      "PY:T01",
      4,
      "primary",
      "S0007-EV98",
    ),
    true,
  );
  const job = await withdraw(g);
  assert.equal(job.state, "ready", job.error);
  assert.equal(
    JSON.stringify(g.study.learner),
    JSON.stringify(before),
    "proposal is not applied before adoption",
  );
  await adoptReconciledRoadmap(g, r, job.id);
  const l = g.study.learner!;
  assert.equal(finalRequirementStatus(r, l, final), "U");
  assert.equal(
    independentProofValid(r, l, "PY:T01", 4, "primary", "S0007-EV98"),
    false,
  );
  assert.equal(
    l.finalProgress!["PY:T01"].facets["D4:primary"].outcome,
    "unknown",
  );
  assert.deepEqual(
    l.finalProgress!["PY:T01"].facets["D4:primary"].evidenceIds,
    ["S0007-EV98"],
  );
  assert.equal(JSON.stringify(l.roadmapAdoptions![0]), old);
  assert.ok(job.proposal!.canonical.includes(evidence));
  assert.ok(job.proposal!.canonical.includes("<!-- ATTEMPT_UPDATE "));
  assert.deepEqual(l.cells, before.cells);
  assert.deepEqual(l.tracks, before.tracks);
  assert.deepEqual(l.evidence, before.evidence);
  assert.equal(g.study.visits.length, 0);
  const copy = recover(decode(encode(g)));
  assert.equal(
    independentProofValid(
      r,
      copy.study.learner!,
      "PY:T01",
      4,
      "primary",
      "S0007-EV98",
    ),
    false,
  );
  const e = copy.encounters["f0-room0"];
  e.problem = {
    title: "Later synthetic study",
    prompt: "Continue eligible scope",
    starter: "",
    rubric: [],
    provenance: "study-mode",
    contract: eligibleLearning(r, copy.study.learner!, "2026-10-17T12:00:00Z"),
  };
  beginLearningAttempt(r, copy.study.learner!, e, "2026-10-17T12:00:00Z");
  const next = await prepareRoadmapExport(
    r,
    copy.study.learner!,
    copy.study.roadmapExport,
  );
  assert.ok(next.content.includes(evidence));
  assert.ok(next.content.includes("INVALIDATED; ambiguous supplied task"));
  assert.notEqual(next.content, job.proposal!.canonical);
  // Even a directly retained local observation cannot bypass the latest task
  // disposition. This isolated proof query does not export an orphan fixture.
  copy.study.learner!.evidence.push({
    id: "S0007-EV98",
    attemptId: "S0007-A98",
    encounter: "fixture",
    objectiveId: "PY:T01",
    depth: 4,
    facet: "primary",
    outcome: "independent",
    artifactSequences: [1],
    helpMessageIds: [],
    at: "2026-10-16T12:00:00Z",
    execution: "not-run",
    rationale: "Synthetic direct-evidence guard",
  });
  assert.equal(
    independentProofValid(
      r,
      copy.study.learner!,
      "PY:T01",
      4,
      "primary",
      "S0007-EV98",
    ),
    false,
  );
});
test("unaffected independent facets are retained and require partial rather than unknown status", async () => {
  const g = await setup(true),
    job = await withdraw(g, "G");
  assert.equal(job.state, "ready", job.error);
  await adoptReconciledRoadmap(g, r, job.id);
  const l = g.study.learner!;
  assert.equal(finalRequirementStatus(r, l, final), "G");
  assert.equal(
    l.finalProgress!["PY:T01"].facets["D4:primary"].outcome,
    "unknown",
  );
  assert.equal(
    l.finalProgress!["PY:T01"].facets["D4:secondary"].outcome,
    "independent",
  );
  assert.equal(
    independentProofValid(r, l, "PY:T01", 4, "secondary", "S0007-EV99"),
    true,
  );
});
test("retaining an unsupported pass, treating withdrawal as a failure, dropping unaffected facets or recycling invalidated proof rejects", async () => {
  for (const [status, partial, recycle] of [
    ["P", false, false],
    ["R", false, false],
    ["U", true, false],
    ["P", false, true],
  ] as const) {
    const g = await setup(partial),
      before = JSON.stringify(g.study.learner),
      job = await withdraw(g, status, recycle);
    assert.equal(job.state, "error", `${status}/${partial}/${recycle}`);
    assert.equal(JSON.stringify(g.study.learner), before);
  }
});

test("withdrawal preserves a separately observed existing material gap rather than erasing it or inventing a new failure", async () => {
  const g = await setup(true, true),
    before = structuredClone(
      g.study.learner!.finalProgress!["PY:T01"].facets["D4:secondary"],
    );
  const refused = await withdraw(g, "U");
  assert.equal(refused.state, "error");
  // A fresh review, not retrying the rejected exact canonical file.
  const accepted = await withdraw(g, "G");
  assert.equal(accepted.state, "ready", accepted.error);
  await adoptReconciledRoadmap(g, r, accepted.id);
  const p = g.study.learner!.finalProgress!["PY:T01"];
  assert.equal(p.status, "G");
  assert.equal(p.facets["D4:primary"].outcome, "unknown");
  assert.deepEqual(p.facets["D4:secondary"], before);
});
