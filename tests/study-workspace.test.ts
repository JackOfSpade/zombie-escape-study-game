import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { checkBridge, ensureProblem } from "../src/ai";
import { eligible, initialStudy } from "../src/curriculum";
import { complete, step } from "../src/engine";
import { TestRunner } from "../src/gametest/runner";
import { emptyScenario } from "../src/gametest/schema";
import type { Roadmap } from "../src/model";
import { decode, encode, recover } from "../src/persistence";
import { createPlayableGame } from "../src/world";
import {
  enterStudyWorkspace,
  exitStudyWorkspace,
  nextWorkspaceQuestion,
  workspaceQuestion,
  workspaceAssessment,
  workspaceProgressHtml,
} from "../src/study-workspace";

const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));

test("study workspace freezes the real GameTest world and restores the prior pause state", () => {
  const scenario = emptyScenario();
  scenario.simulation = "game";
  scenario.maxTicks = 30;
  scenario.entities = [
    { id: "human", kind: "player", x: 10, y: 10 },
    { id: "enemy", kind: "zombie", x: 15, y: 10 },
  ];
  scenario.checks = [
    {
      name: "World stays frozen",
      mode: "always",
      query: { type: "worldTime" },
      op: "eq",
      expected: 0,
    },
  ];
  const runner = new TestRunner(scenario, r);
  const g = runner.game;
  const before = structuredClone({
    survivors: g.survivors,
    zombies: g.zombies,
    rng: g.rng,
  });
  enterStudyWorkspace(g);
  g.paused = false; // Even an unrelated pause toggle cannot resume this view.
  assert.equal(runner.run().status, "passed");
  assert.deepEqual(
    { survivors: g.survivors, zombies: g.zombies, rng: g.rng },
    before,
  );
  const saved = recover(decode(encode(g)));
  enterStudyWorkspace(saved);
  assert.equal(saved.studyWorkspace?.wasPaused, false);
  exitStudyWorkspace(saved);
  step(saved, 1 / 30);
  assert.ok(saved.time > 0);
  saved.paused = true;
  enterStudyWorkspace(saved);
  enterStudyWorkspace(saved);
  exitStudyWorkspace(saved);
  assert.equal(saved.paused, true);
});

test("standalone questions use the formal scheduler without touching stations, world RNG or pacing", async () => {
  const g = createPlayableGame(122, r);
  const before = structuredClone({
    floors: g.floors,
    rng: g.rng,
    pacing: g.fieldPacing,
    spawn: g.study.topicSpawn,
  });
  const contract = eligible(r, g.study);
  enterStudyWorkspace(g);
  const e = nextWorkspaceQuestion(g, r);
  assert.equal(nextWorkspaceQuestion(g, r), e);
  assert.equal(e.studyOnly, true);
  await ensureProblem(g, e, r);
  assert.deepEqual(e.problem?.contract, contract);
  assert.deepEqual(
    {
      floors: g.floors,
      rng: g.rng,
      pacing: g.fieldPacing,
      spawn: g.study.topicSpawn,
    },
    before,
  );
  const keys = g.survivors[0].keys;
  const access = [...g.survivors[0].access];
  const ledger = structuredClone(g.study.learner);
  assert.equal(
    complete(g, e.id, "synthetic-completion", ["human"], "Synthetic outcome"),
    true,
  );
  assert.equal(complete(g, e.id, "duplicate", ["human"], "Duplicate"), false);
  assert.equal(g.survivors[0].keys, keys);
  assert.deepEqual(g.survivors[0].access, access);
  assert.deepEqual(g.study.learner, ledger);
  assert.match(g.events.at(-1)!.text, /Study question completed/);
});

test("workspace reuses an issued game question and ignores NPC-only preparation", () => {
  const g = createPlayableGame(123, r);
  const npc = Object.values(g.encounters)[0];
  npc.owner = "someone-else";
  npc.pendingGeneration = { requestId: "npc-only", payload: {} };
  enterStudyWorkspace(g);
  const e = nextWorkspaceQuestion(g, r);
  assert.notEqual(e, npc);
  e.state = "consumed";
  const issued = Object.values(g.encounters)[1];
  issued.problemPresentedSequence = 17;
  const count = Object.keys(g.encounters).length;
  assert.equal(workspaceQuestion(g), issued);
  assert.equal(nextWorkspaceQuestion(g, r), issued);
  assert.equal(Object.keys(g.encounters).length, count);
  // Retained unfinished work from a closed run is history, not a question the
  // current workspace may reopen or silently reinterpret as a pending visit.
  issued.state = "consumed";
  const archived = structuredClone(issued);
  archived.runId = "older-run";
  archived.state = "in-progress";
  archived.pendingGeneration = { requestId: "old-generation", payload: {} };
  g.study.archives.push(archived);
  assert.equal(workspaceQuestion(g), undefined);
  assert.notEqual(nextWorkspaceQuestion(g, r), archived);
});

test("live study-only generation receives the exact formal contract and preserves physical pacing", async () => {
  const original = globalThis.fetch;
  const sent: any[] = [];
  globalThis.fetch = async (url, init) => {
    if (String(url) === "/api/status")
      return Response.json({
        mode: "study-mode",
        label: "Synthetic",
        detail: "No live model",
        capabilities: ["generate"],
      });
    const packet = JSON.parse(String(init?.body));
    assert.equal(packet.operation, "generate");
    sent.push(packet.payload);
    const c = packet.payload.contract;
    return Response.json({
      title: "Synthetic scheduled question",
      prompt: "Explain the supplied mechanism.",
      starter: "",
      rubric: ["Explain the mechanism"],
      contract: c,
      scopeDefinitions: [
        {
          id: `${c.objectiveIds[0]}/D${c.depth}`,
          objectiveId: c.objectiveIds[0],
          depth: c.depth,
          sourceScope: c.scopes[0],
          facets: [{ id: "mechanism", description: "Explain the mechanism" }],
        },
      ],
      estimatedSolveSeconds: 300,
    });
  };
  try {
    await checkBridge();
    const g = createPlayableGame(126, r, initialStudy(r, "live"));
    enterStudyWorkspace(g);
    const formal = eligible(r, g.study);
    const pacing = structuredClone(g.fieldPacing);
    const e = nextWorkspaceQuestion(g, r);
    await ensureProblem(g, e, r);
    assert.equal(sent.length, 1);
    // The wire copy omits undefined fields; validation restores the trusted
    // original contract rather than adopting a provider-supplied scope.
    assert.deepEqual(sent[0].contract, JSON.parse(JSON.stringify(formal)));
    assert.deepEqual(e.problem?.contract, formal);
    assert.equal(e.problem?.provenance, "study-mode");
    assert.deepEqual(g.fieldPacing, pacing);
  } finally {
    globalThis.fetch = original;
    await checkBridge();
  }
});

test("next live question waits for its source-bound progress review, while unrelated historical reviews do not block it", () => {
  const g = createPlayableGame(124, r, initialStudy(r, "live"));
  enterStudyWorkspace(g);
  const e = nextWorkspaceQuestion(g, r);
  e.state = "consumed";
  g.study.assessments.push({
    id: "synthetic",
    encounter: e.id,
    sourceVersion: 0,
    findings: [],
    status: "pending",
    provenance: "synthetic",
  });
  assert.throws(
    () => nextWorkspaceQuestion(g, r),
    /reviewing your previous learning result/,
  );
  g.study.assessments[0].status = "review-required";
  assert.equal(workspaceAssessment(g)?.status, "review-required");
  assert.throws(() => nextWorkspaceQuestion(g, r), /reviewing/);
  g.study.assessments[0].status = "applied";
  g.study.assessments.push({
    ...g.study.assessments[0],
    id: "historical",
    encounter: "another-question",
    status: "review-required",
  });
  assert.notEqual(nextWorkspaceQuestion(g, r), e);
});

test("dashboard separates verified checkpoints from observations and escapes learner-facing content", () => {
  const g = createPlayableGame(125, r);
  const before = workspaceProgressHtml(g, r);
  enterStudyWorkspace(g);
  nextWorkspaceQuestion(g, r);
  assert.equal(workspaceProgressHtml(g, r), before);
  const clone = structuredClone(r);
  const c = eligible(clone, g.study);
  const topic = c.objectiveIds[0].split(":")[1].split(".")[0];
  clone.tracks[c.track].topics[topic] = '<script>alert("x")</script>';
  const html = workspaceProgressHtml(g, clone);
  assert.ok(!html.includes("<script>"));
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /practice does not add verified curriculum credit/);
});
