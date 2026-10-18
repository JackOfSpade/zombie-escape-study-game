import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { executionRoute } from "../../scripts/execution-route.mjs";
import { createGame } from "../../src/world.ts";
import {
  initialStudy,
  eligible,
  evidencePacket,
} from "../../src/curriculum.ts";
import {
  initialLearner,
  reconcileGates,
  registerScopes,
  beginLearningAttempt,
  applyLearningAssessment,
} from "../../src/learner.ts";
import { edit } from "../../src/ai.ts";
import { runWorkspace } from "../../src/execution.ts";
import { step } from "../../src/engine.ts";
import { decode, encode } from "../../src/persistence.ts";

test("real HTTP/container execution stays bound to a saved revision across ongoing survival, edits and a fresh run", async () => {
  const server = createServer(executionRoute);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (url, options) =>
    originalFetch(new URL(url, base), options);
  try {
    const roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));
    const g = createGame(0, roadmap),
      e = g.encounters["f0-room0"];
    g.study = initialStudy(roadmap, "live");
    // Only the gate history is synthetic. Execution below is a real Docker
    // run through the production route, never fabricated learning evidence.
    const ledger = initialLearner(roadmap, "test");
    for (const o of roadmap.tracks.PY.objectives)
      ledger.cells[o.id].states[0] = "P";
    ledger.reviews = {};
    reconcileGates(roadmap, ledger);
    g.study.learner = ledger;
    e.problem = {
      title: "Pipeline fixture",
      prompt: "Synthetic scope; actual execution",
      rubric: [],
      starter: "",
      provenance: "study-mode",
      contract: eligible(roadmap, g.study),
      runtime: { language: "python" },
    };
    edit(g, e, "import time\ntime.sleep(.2)\nprint('captured revision')", 0);
    const pending = runWorkspace(g, e, roadmap),
      captured = e.workspace;
    edit(g, e, "print('later edit')", e.revision);
    g.survivors = g.survivors.slice(0, 1);
    g.status = "playing";
    g.nextSpawn = Infinity;
    for (let i = 0; i < 10; i++) step(g, 1 / 30);
    assert.ok(g.time > 0.3);
    g.study.archives.push(e);
    const next = createGame(1, roadmap, g.study);
    await pending;
    const job = e.executions[0];
    assert.equal(job.status, "finished", JSON.stringify(job));
    assert.equal(job.receipt.executed, true);
    assert.equal(job.receipt.exitCode, 0);
    assert.equal(job.receipt.stdout, "captured revision\n");
    assert.equal(job.code, captured);
    assert.equal(e.workspace, "print('later edit')");
    assert.equal(e.history.at(-1).revision, 1);
    assert.equal(next.encounters[e.id].workspace, "");
    assert.equal(next.encounters[e.id].executions, undefined);
    assert.equal(
      decode(encode(next)).study.archives[0].executions[0].receipt.stdout,
      "captured revision\n",
    );
    assert.equal(ledger.evidence.length, 0);
    const packet = evidencePacket(e, roadmap, e.history.at(-1).seq, ledger);
    assert.equal(packet.group.length, 0);
    assert.equal(packet.tutor.length, 0);
    const capturedEdit = packet.history.find(
      (h) => h.seq === job.artifactSequences[0],
    );
    assert.equal(capturedEdit.author, "human");
    assert.equal(capturedEdit.kind, "edit");
    assert.equal(capturedEdit.delta.inserted, captured);
    const runArtifact = packet.history.find((h) => h.executionId === job.id);
    assert.deepEqual(JSON.parse(runArtifact.text), job.receipt);
    assert.ok(runArtifact.refs.includes(`artifact:${capturedEdit.seq}`));
    assert.equal(packet.workspace.content, "print('later edit')");
    // Synthetic semantic judgment over real execution, never a real learner pass.
    const contract = e.problem.contract,
      objectiveId = contract.objectiveIds[0];
    const definition = {
      id: `${objectiveId}/D${contract.depth}`,
      objectiveId,
      depth: contract.depth,
      sourceScope: contract.scopes[0],
      facets: [
        {
          id: "captured-execution",
          description:
            "Controlled receipt observation; not complete objective coverage",
        },
      ],
    };
    e.problem.scopeDefinitions = [definition];
    registerScopes(roadmap, ledger, e);
    beginLearningAttempt(roadmap, ledger, e);
    const assessment = {
      id: "real-run-synthetic-partial-grade",
      encounter: e.id,
      sourceVersion: ledger.version,
      provenance: "test-fixture",
      status: "pending",
      visitOutcome: "unresolved",
      evidenceCutoffSequence: e.history.at(-1).seq,
      findings: [
        {
          objectiveId,
          depth: contract.depth,
          facet: "captured-execution",
          outcome: "independent",
          execution: "executed",
          evidence: job.artifactSequences,
          completeCheckpointScope: false,
          rationale:
            "Synthetic partial judgment with an actual matched container receipt",
        },
      ],
      scopeReviews: [
        {
          id: definition.id,
          completeCoverage: false,
          rationale:
            "Deliberately incomplete diagnostic criterion, not an objective pass",
        },
      ],
      helpAttributions: [],
    };
    applyLearningAssessment(
      roadmap,
      ledger,
      e,
      assessment,
      undefined,
      "test-fixture",
    );
    assert.equal(ledger.evidence.length, 1);
    assert.equal(ledger.evidence[0].execution, "executed");
    assert.deepEqual(
      ledger.evidence[0].artifactSequences,
      job.artifactSequences,
    );
    assert.equal(ledger.cells[objectiveId].states[contract.depth - 1], "G");
    assert.equal(ledger.cycle, 0);
    const invalid = await originalFetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "bash", code: "forbidden" }),
    });
    assert.equal(invalid.status, 400);
  } finally {
    globalThis.fetch = originalFetch;
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
