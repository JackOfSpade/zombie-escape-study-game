// Synthetic questions exercise formal lifecycle, never genuine Study Mode quality.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { presentProblem } from "../src/ai";
import { eligible, initialStudy } from "../src/curriculum";
import { complete } from "../src/engine";
import {
  applyLearningAssessment,
  encounterKey,
  registerScopes,
} from "../src/learner";
import type { Assessment, Encounter, Game, Roadmap } from "../src/model";
import { decode, encode } from "../src/persistence";
import { prepareRoadmapExport } from "../src/roadmap-export";
import { retainRunLearning } from "../src/run-learning";
import { createGame } from "../src/world";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));
function question(g: Game, e: Encounter) {
  const c = eligible(r, g.study);
  e.problem = {
    title: "Synthetic unanswered assessment",
    prompt: "PRIVATE_QUESTION_MUST_STAY_OUT_OF_ROADMAP",
    starter: "Supplied starter",
    rubric: [],
    provenance: "study-mode",
    contract: c,
    scopeDefinitions: c.objectiveIds.map((id, i) => ({
      id: `${id}/D${c.depth}`,
      objectiveId: id,
      depth: c.depth,
      sourceScope: c.scopes[i],
      facets: [{ id: "scope", description: "Synthetic scope" }],
    })),
  };
  e.workspace = e.problem.starter;
  e.state = "in-progress";
  registerScopes(r, g.study.learner!, e);
}
function fixture() {
  const g = createGame(33, r, initialStudy(r, "live")),
    e = g.encounters["f0-room0"];
  g.study.learner!.reviews = {};
  question(g, e);
  return { g, e, l: g.study.learner! };
}
test("presentation issues exactly one pending task, generation and reinspection do not issue or serve it", async () => {
  const { g, e, l } = fixture();
  const cycle = l.cycle,
    tracks = JSON.stringify(l.tracks);
  assert.equal(l.attempts.length, 0);
  assert.equal(l.currentSession, undefined);
  presentProblem(g, e, r);
  assert.equal(l.attempts.length, 1);
  assert.equal(l.attempts[0].status, "in-progress");
  assert.equal(l.attempts[0].encounter, encounterKey(e));
  assert.equal(l.evidence.length, 0);
  assert.equal(l.cycle, cycle);
  assert.equal(JSON.stringify(l.tracks), tracks);
  const saved = JSON.stringify(g.study),
    history = JSON.stringify(e.history);
  presentProblem(g, e, r);
  assert.equal(JSON.stringify(g.study), saved);
  assert.equal(JSON.stringify(e.history), history);
  const restored = decode(encode(g));
  presentProblem(restored, restored.encounters[e.id], r);
  assert.equal(JSON.stringify(restored.study), saved);
  const exported = await prepareRoadmapExport(r, l);
  assert.match(
    exported.content,
    new RegExp(`\\| ${l.attempts[0].id} \\|[^\\n]*PENDING`),
  );
  assert.ok(
    !exported.content.includes("PRIVATE_QUESTION_MUST_STAY_OUT_OF_ROADMAP"),
  );
});
test("unanswered issued work survives death/archive/reload and is superseded only by actual fresh linked issuance", async () => {
  const { g, e, l } = fixture();
  presentProblem(g, e, r);
  const old = structuredClone(e.problem),
    id = l.attempts[0].id,
    cycle = l.cycle;
  retainRunLearning(g);
  assert.equal(l.attempts[0].status, "interrupted");
  assert.equal(l.continuations.length, 1);
  const before = await prepareRoadmapExport(r, l);
  assert.match(
    before.content,
    new RegExp(`\\| ${id} \\|[^\\n]*PENDING; INTERRUPTED`),
  );
  retainRunLearning(g, true);
  retainRunLearning(g, true);
  assert.equal(l.continuations.length, 1);
  assert.equal(g.study.archives.length, 1);
  const restored = decode(encode(g)),
    fresh = createGame(34, r, restored.study),
    next = fresh.encounters[e.id];
  assert.equal(
    JSON.stringify(fresh.study.archives[0].problem),
    JSON.stringify(old),
  );
  assert.equal(fresh.study.archives[0].workspace, "Supplied starter");
  question(fresh, next);
  assert.equal(
    fresh.study.learner!.attempts.length,
    1,
    "unobserved generation is not replacement issuance",
  );
  presentProblem(fresh, next, r);
  const child = fresh.study.learner!.attempts[1];
  assert.equal(child.parentAttempt, id);
  assert.notEqual(child.encounter, l.attempts[0].encounter);
  assert.equal(fresh.study.learner!.cycle, cycle);
  assert.equal(fresh.study.learner!.evidence.length, 0);
  const after = await prepareRoadmapExport(r, fresh.study.learner!);
  assert.match(
    after.content,
    new RegExp(`\\| ${id} \\|[^\\n]*SUPERSEDED[^\\n]*${child.id}`),
  );
});
test("unknown or NPC-only assessment of an issued task cannot count a visit, create evidence, or use later work", () => {
  const { g, e, l } = fixture();
  presentProblem(g, e, r);
  const cycle = l.cycle,
    c = e.problem!.contract;
  const a: Assessment = {
    id: "synthetic-unanswered",
    encounter: e.id,
    sourceVersion: l.version,
    provenance: "study-mode",
    status: "pending",
    evidenceCutoffSequence: g.seq,
    visitOutcome: "unresolved",
    findings: [
      {
        objectiveId: c.objectiveIds[0],
        depth: c.depth,
        facet: "scope",
        outcome: "unknown",
        completeCheckpointScope: false,
        evidence: [],
        rationale: "No human technical answer",
      },
    ],
  };
  const baseline = JSON.stringify(l);
  assert.throws(
    () => applyLearningAssessment(r, l, e, { ...a, visitOutcome: "usable" }),
    /unanswered/,
  );
  assert.equal(JSON.stringify(l), baseline);
  e.history.push({
    seq: g.seq + 1,
    author: "human",
    kind: "reasoning",
    text: "Later actual reasoning",
    at: 1,
    revision: 0,
  });
  assert.throws(
    () => applyLearningAssessment(r, l, e, { ...a, visitOutcome: "usable" }),
    /unanswered/,
  );
  e.history.pop();
  applyLearningAssessment(r, l, e, a);
  assert.equal(l.cycle, cycle);
  assert.equal(l.evidence.length, 0);
  assert.equal(l.attempts[0].status, "in-progress");
});
test("shared defender earns world access while unanswered study detaches from the consumed lock", () => {
  const { g, e, l } = fixture();
  presentProblem(g, e, r);
  const cycle = l.cycle;
  assert.ok(
    complete(
      g,
      e.id,
      "npc-actual-work",
      ["human"],
      "Synthetic completed shared work",
    ),
  );
  assert.ok(g.survivors[0].access.includes(e.floor));
  assert.equal(l.attempts[0].status, "interrupted");
  assert.equal(l.cycle, cycle);
  assert.equal(l.evidence.length, 0);
  presentProblem(g, e, r);
  assert.equal(l.attempts.length, 1);
  const next = g.encounters["f0-room1"];
  question(g, next);
  presentProblem(g, next, r);
  assert.equal(l.attempts[1].parentAttempt, l.attempts[0].id);
});
test("unobserved and unscheduled shared work stays outside formal issuance; development remains practice", () => {
  const { g, e, l } = fixture(),
    other = g.encounters["f0-room1"];
  question(g, other);
  other.problem!.contract.track =
    other.problem!.contract.track === "PY" ? "PE" : "PY";
  presentProblem(g, other, r);
  assert.equal(l.attempts.length, 0);
  assert.match(other.error!, /scheduled/);
  assert.equal(retainRunLearning(g, true).length, 1);
  assert.equal(g.study.archives[0], other);
  assert.ok(!g.study.archives.includes(e));
  g.study.profile = "development";
  presentProblem(g, e, r);
  assert.equal(l.attempts.length, 0);
  const unseen = g.encounters["f0-room2"];
  question(g, unseen);
  complete(
    g,
    unseen.id,
    "unobserved-npc",
    ["human"],
    "Synthetic defender reward",
  );
  presentProblem(g, unseen, r);
  assert.equal(l.attempts.length, 0);
});
