import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  autonomousNpcWork,
  checkBridge,
  materializeObservedWork,
  retrySubmission,
} from "../src/ai";
import { eligible } from "../src/curriculum";
import { claimStation, releaseStation } from "../src/engine";
import {
  assistanceSources,
  initialLearner,
  reconcileGates,
} from "../src/learner";
import type { Roadmap } from "../src/model";
import { recordNpcWork } from "../src/npc-cognition";
import {
  materializeNpcWork,
  type WorkPayload,
} from "../src/npc-materialization";
import { decode, encode, recover } from "../src/persistence";
import { sha256 } from "../src/roadmap-export";
import { presentSharedWorkspace } from "../src/workspace-exposure";
import { applyAutonomousProposal } from "../src/workspace-proposals";
import { createGame } from "../src/world";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));
function fixture() {
  const g = createGame(7, r),
    e = g.encounters["f0-room0"],
    ss = g.floors[0].stations.filter((s) => s.encounter === e.id),
    a = g.survivors[1],
    h = g.survivors[0];
  g.status = "playing";
  g.study.profile = "live";
  g.zombies = [];
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.survivors = [h, a];
  g.floors[0].furniture = [];
  g.floors[0].tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
  Object.assign(a, {
    x: ss[1].x,
    y: ss[1].y,
    station: ss[1].id,
    intent: e.id,
    activity: "studying",
    milestone: 1,
  });
  Object.assign(h, { x: ss[0].x, y: ss[0].y, station: undefined });
  e.state = "in-progress";
  e.humanEngaged = true;
  e.workspace = e.workspaceBase = "abc";
  e.problem = {
    title: "Synthetic autonomy fixture",
    prompt: "Boundary reasoning",
    starter: "abc",
    rubric: ["fixture"],
    provenance: "study-mode",
    contract: eligible(r, g.study),
  };
  recordNpcWork(g, e, a, false);
  return { g, e, a, h, ss };
}
function reply(p: WorkPayload) {
  return {
    requestId: p.requestId,
    sourceRevision: p.sourceRevision,
    notes: p.work.map((w) => ({
      workId: w.id,
      author: w.actor,
      text: "Tentative boundary candidate.",
      refs: [w.seq],
      patch: { prefix: 1, removed: "b", inserted: "BOUNDARY" },
      readyToSubmit: true,
    })),
  };
}
async function prepare(f: ReturnType<typeof fixture>) {
  await materializeNpcWork(f.g, f.e, async (p) => reply(p), false, {
    background: true,
    allowAutonomous: true,
  });
  assert.equal(f.e.proposals?.length, 1);
  return f.e.proposals![0];
}
test("autonomous edits are attributed, unexposed until the current workspace is displayed, and deduplicated on reload", async () => {
  const f = fixture(),
    p = await prepare(f),
    study = JSON.stringify(f.g.study);
  applyAutonomousProposal(f.g, f.e, p.id);
  assert.equal(f.e.workspace, "aBOUNDARYc");
  assert.equal(f.e.history.at(-1)?.author, f.a.id);
  assert.equal(assistanceSources(f.e).length, 0);
  presentSharedWorkspace(f.g, f.e);
  assert.equal(assistanceSources(f.e).length, 0);
  f.h.station = f.ss[0].id;
  presentSharedWorkspace(f.g, f.e);
  const sources = assistanceSources(f.e);
  assert.equal(sources.length, 1);
  assert.ok(sources[0].text.includes("aBOUNDARYc"));
  assert.equal(JSON.stringify(f.g.study), study);
  const saved = recover(decode(encode(f.g))),
    e = saved.encounters[f.e.id];
  saved.survivors[0].station = f.ss[0].id;
  presentSharedWorkspace(saved, e);
  assert.equal(e.history.filter((h) => h.kind === "workspace-view").length, 1);
});
test("active human, changed source, absent author and unapproved candidates reject atomically", async () => {
  for (const scenario of [
    "human",
    "stale",
    "dead",
    "unseated",
    "solo",
    "pending",
    "unapproved",
    "wrongrun",
    "question",
  ]) {
    const f = fixture(),
      p = await prepare(f);
    if (scenario === "human") f.h.station = f.ss[0].id;
    if (scenario === "stale") f.e.workspace += "changed";
    if (scenario === "dead") f.a.alive = false;
    if (scenario === "unseated") f.a.station = undefined;
    if (scenario === "solo") f.e.mode = "solo";
    if (scenario === "pending")
      f.e.submissions.push({
        id: "pending",
        revision: 0,
        author: "human",
        content: "abc",
        status: "pending",
        feedback: "",
        seq: 0,
      });
    if (scenario === "unapproved")
      f.e.materializations![0].autonomyAllowed = false;
    if (scenario === "wrongrun") f.e.runId = "other";
    if (scenario === "question") f.e.problem!.prompt = "changed question";
    const before = JSON.stringify(f.g);
    assert.throws(
      () => applyAutonomousProposal(f.g, f.e, p.id),
      Error,
      scenario,
    );
    assert.equal(JSON.stringify(f.g), before, scenario);
  }
});
test("provider readiness cannot activate autonomy without client opt-in", async () => {
  const f = fixture();
  f.h.station = f.ss[0].id;
  await materializeNpcWork(f.g, f.e, async (p) => reply(p));
  assert.equal(f.e.materializations![0].state, "failed");
  assert.equal(f.e.proposals?.length ?? 0, 0);
});
test("background NPC completion uses public history, preserves authorship and earns no human evidence or study visits", async () => {
  const f = fixture(),
    original = globalThis.fetch;
  let completions = 0,
    requests = 0,
    captured: any;
  f.e.tutor.push({
    id: "secret",
    author: "human",
    kind: "human",
    text: "PRIVATE_SECRET",
    seq: ++f.g.seq,
    worldTime: 0,
    provenance: "live-human",
  });
  f.e.history.push({
    seq: f.g.seq,
    author: "human",
    kind: "chat",
    text: "PRIVATE_SECRET",
    at: 0,
    revision: 0,
  });
  globalThis.fetch = async (input, init) => {
    if (String(input) === "/api/status")
      return Response.json({
        mode: "study-mode",
        label: "Synthetic",
        detail: "Not genuine native verification",
        capabilities: ["materialize-work", "autonomous-work"],
      });
    const body = JSON.parse(String(init?.body));
    requests++;
    if (body.operation === "materialize-work")
      return Response.json(reply(body.payload));
    assert.equal(body.operation, "complete");
    completions++;
    captured = body.payload;
    return Response.json({
      complete: true,
      feedback: "Synthetic acceptance",
      qualified: [f.a.id],
    });
  };
  try {
    await checkBridge();
    await autonomousNpcWork(f.g, r);
    assert.equal(f.e.workspace, "abc");
    await autonomousNpcWork(f.g, r);
    assert.equal(completions, 1);
    assert.equal(f.e.state, "consumed");
    assert.equal(f.e.submissions[0].author, f.a.id);
    assert.ok(!JSON.stringify(captured).includes("PRIVATE_SECRET"));
    assert.equal(f.g.study.visits.length, 0);
    assert.equal(f.g.study.learner!.evidence.length, 0);
    assert.equal(f.g.study.assessments.length, 0);
    assert.ok(f.a.access.includes(0));
    assert.ok(!f.h.access.includes(0));
    assert.equal(f.e.group.length, 0);
    assert.equal(
      assistanceSources(f.e).filter((s) => s.kind === "npc").length,
      0,
    );
    assert.equal(autonomousNpcWork(f.g, r), undefined);
    assert.equal(requests, 2);
  } finally {
    globalThis.fetch = async () =>
      Response.json({
        mode: "development",
        label: "Fixture ended",
        detail: "",
        capabilities: [],
      });
    await checkBridge();
    globalThis.fetch = original;
  }
});
test("failed captured autonomous submission is retained without automatic retry", async () => {
  const f = fixture(),
    original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (input, init) => {
    if (String(input) === "/api/status")
      return Response.json({
        mode: "study-mode",
        label: "Synthetic",
        detail: "Fixture",
        capabilities: ["materialize-work", "autonomous-work"],
      });
    const b = JSON.parse(String(init?.body));
    if (b.operation === "materialize-work")
      return Response.json(reply(b.payload));
    calls++;
    throw Error("offline");
  };
  try {
    await checkBridge();
    await autonomousNpcWork(f.g, r);
    await autonomousNpcWork(f.g, r);
    assert.equal(f.e.submissions[0].status, "error");
    for (let i = 0; i < 5; i++) await autonomousNpcWork(f.g, r);
    assert.equal(calls, 1);
    assert.equal(f.e.submissions.length, 1);
    assert.equal(f.g.study.visits.length, 0);
  } finally {
    globalThis.fetch = async () =>
      Response.json({
        mode: "development",
        label: "Fixture ended",
        detail: "",
        capabilities: [],
      });
    await checkBridge();
    globalThis.fetch = original;
  }
});
test("NPC executable submissions carry only NPC edit references and actual captured runner receipts", async () => {
  const f = fixture(),
    original = globalThis.fetch,
    l = initialLearner(r, "test");
  for (const o of r.tracks.PY.objectives) l.cells[o.id].states[0] = "P";
  l.reviews = {};
  reconcileGates(r, l);
  f.g.study.learner = l;
  f.e.problem!.contract = eligible(r, f.g.study);
  f.e.problem!.runtime = { language: "python" };
  assert.equal(f.e.problem!.contract.depth, 2);
  let captured: any;
  globalThis.fetch = async (input, init) => {
    if (String(input) === "/api/status")
      return Response.json({
        mode: "study-mode",
        label: "Synthetic",
        detail: "Not native verification",
        capabilities: ["materialize-work", "autonomous-work"],
      });
    const body = JSON.parse(String(init?.body));
    if (String(input) === "/api/execute")
      return Response.json({
        id: "synthetic-npc-receipt",
        language: "python",
        executed: true,
        status: "completed",
        codeHash: await sha256(body.code),
        imageId: `sha256:${"0".repeat(64)}`,
        stdout: "fixture output",
        stderr: "",
        exitCode: 0,
      });
    if (body.operation === "materialize-work")
      return Response.json(reply(body.payload));
    captured = body.payload;
    return Response.json({
      complete: true,
      feedback: "Synthetic only",
      qualified: [f.a.id],
    });
  };
  try {
    await checkBridge();
    await autonomousNpcWork(f.g, r);
    await autonomousNpcWork(f.g, r);
    const j = f.e.executions![0];
    assert.equal(j.author, f.a.id);
    assert.ok(j.artifactSequences.length);
    assert.ok(
      j.artifactSequences.every(
        (seq) => f.e.history.find((h) => h.seq === seq)?.author === f.a.id,
      ),
    );
    assert.equal(captured.executions[0].receipt.stdout, "fixture output");
    assert.equal(f.g.study.visits.length, 0);
    assert.equal(l.evidence.length, 0);
  } finally {
    globalThis.fetch = async () =>
      Response.json({
        mode: "development",
        label: "Fixture ended",
        detail: "",
        capabilities: [],
      });
    await checkBridge();
    globalThis.fetch = original;
  }
});
test("first presentation captures a deletion repair without replaying hidden intermediate drafts", async () => {
  const f = fixture(),
    p = await prepare(f);
  applyAutonomousProposal(f.g, f.e, p.id);
  // A second real NPC edit removes its earlier tentative insertion before return.
  const old = f.e.workspace;
  f.e.workspace = "ac";
  f.e.revision++;
  f.e.history.push({
    seq: ++f.g.seq,
    author: f.a.id,
    kind: "edit",
    text: "Removed tentative insertion",
    delta: { prefix: 1, removed: "BOUNDARY", inserted: "" },
    at: 0,
    revision: f.e.revision,
  });
  f.h.station = f.ss[0].id;
  presentSharedWorkspace(f.g, f.e);
  const shown = f.e.history.filter((h) => h.kind === "workspace-view");
  assert.equal(shown.length, 1);
  assert.ok(shown[0].text.endsWith("\nac"));
  assert.ok(!shown[0].text.includes(old));
  assert.equal(shown[0].presented, shown[0].seq);
  assert.ok(shown[0].seq > p.artifactSequence);
  assert.equal(assistanceSources(f.e).length, 1);
});
test("NPC needs-work feedback becomes assistance only on presentation and permits fresh bounded reasoning", async () => {
  const f = fixture(),
    original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (String(input) === "/api/status")
      return Response.json({
        mode: "study-mode",
        label: "Synthetic",
        detail: "Fixture",
        capabilities: ["materialize-work", "autonomous-work"],
      });
    const b = JSON.parse(String(init?.body));
    return Response.json(
      b.operation === "materialize-work"
        ? reply(b.payload)
        : {
            complete: false,
            feedback: "Reconsider the boundary case",
            qualified: [],
          },
    );
  };
  try {
    await checkBridge();
    await autonomousNpcWork(f.g, r);
    await autonomousNpcWork(f.g, r);
    assert.equal(f.e.state, "in-progress");
    assert.equal(f.e.submissions[0].status, "needs-work");
    const h = f.e.history.find((h) => h.kind === "validation")!;
    assert.ok(h.text.includes("not a runtime receipt"));
    assert.equal(assistanceSources(f.e).length, 0);
    const { presentWorkLog } = await import("../src/ai");
    presentWorkLog(f.g, f.e);
    assert.ok(
      assistanceSources(f.e).some((s) =>
        s.text.includes("Reconsider the boundary case"),
      ),
    );
  } finally {
    globalThis.fetch = async () =>
      Response.json({
        mode: "development",
        label: "Fixture ended",
        detail: "",
        capabilities: [],
      });
    await checkBridge();
    globalThis.fetch = original;
  }
});

import { localHandoff } from "./helpers/local-handoff";
test("actual ChatGPT unattended workflow requires both opt-ins, rejects late local revocation, holds server-revoked completion and explicitly retries exact NPC work", async () => {
  const f = fixture(),
    relay = await localHandoff(),
    original = globalThis.fetch;
  f.e.tutor.push({
    id: "secret-optin",
    author: "tutor",
    kind: "tutor",
    text: "PRIVATE_AUTONOMY_EXCLUDED",
    seq: ++f.g.seq,
    worldTime: 0,
    provenance: "study-mode",
  });
  f.e.history.push({
    seq: f.g.seq,
    author: "tutor",
    kind: "tutor",
    text: "PRIVATE_AUTONOMY_EXCLUDED",
    at: 0,
    revision: 0,
  });
  globalThis.fetch = (url, options) =>
    original(new URL(String(url), relay.base), {
      ...options,
      headers: { ...options?.headers, Origin: "http://127.0.0.1:5173" },
    });
  const worker = "synthetic-optional-worker";
  const post = (body: unknown) =>
    original(relay.base + "/api/handoff/worker", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer synthetic-optional-token",
      },
      body: JSON.stringify(body),
    });
  const next = async (operation: string) => {
    let job: any;
    for (let n = 0; n < 200; n++) {
      job = await (await post({ action: "get", worker })).json();
      if (job.operation) break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.equal(job.operation, operation);
    return job;
  };
  const answer = (job: any, value: unknown) =>
    post({
      action: "submit",
      worker,
      jobId: job.jobId,
      claim: job.claim,
      answer: value,
    });
  try {
    await checkBridge();
    f.g.settings.handoffAutonomous = true;
    assert.equal(
      autonomousNpcWork(f.g, r),
      undefined,
      "The local preference alone cannot grant server release",
    );
    relay.queue.setAutonomous(true);
    await checkBridge();
    f.g.settings.handoffAutonomous = false;
    assert.equal(
      autonomousNpcWork(f.g, r),
      undefined,
      "Server capability alone cannot opt this client in",
    );
    assert.equal(relay.queue.snapshot().queued, 0);
    f.g.settings.handoffAutonomous = true;
    const drafting = autonomousNpcWork(f.g, r),
      draft = await next("materialize-work");
    assert.equal(draft.payload.provider, "chatgpt-handoff");
    assert.equal(draft.payload.background, true);
    assert.ok(
      !JSON.stringify(draft.payload).includes("PRIVATE_AUTONOMY_EXCLUDED"),
    );
    // Local revocation takes effect before the server-control roundtrip.
    f.g.settings.handoffAutonomous = false;
    assert.equal((await answer(draft, reply(draft.payload))).status, 200);
    await drafting;
    assert.equal(f.e.materializations![0].state, "failed");
    assert.equal(f.e.proposals?.length ?? 0, 0);
    assert.equal(f.e.workspace, "abc");
    f.g.settings.handoffAutonomous = true;
    assert.equal(
      autonomousNpcWork(f.g, r),
      undefined,
      "Failed captured work is never automatically rerun",
    );
    assert.ok(claimStation(f.g, f.h, f.ss[0].id));
    await materializeObservedWork(f.g, f.e, true);
    assert.equal(
      f.e.materializations![0].state,
      "applied",
      f.e.materializations![0].error,
    );
    assert.equal(f.e.proposals![0].provider, "chatgpt-handoff");
    assert.equal(
      f.e.workspace,
      "abc",
      "Even ready candidates cannot interrupt the present human",
    );
    assert.equal(autonomousNpcWork(f.g, r), undefined);
    releaseStation(f.h);
    const completing = autonomousNpcWork(f.g, r),
      completion = await next("complete");
    assert.equal(f.e.workspace, "aBOUNDARYc");
    assert.equal(completion.payload.provider, "chatgpt-handoff");
    assert.equal(completion.payload.submitter, f.a.id);
    assert.equal(completion.payload.autonomyAllowed, true);
    assert.ok(
      !JSON.stringify(completion.payload).includes("PRIVATE_AUTONOMY_EXCLUDED"),
    );
    relay.queue.setAutonomous(false);
    const valid = {
      complete: true,
      feedback: "Synthetic NPC acceptance only",
      qualified: [f.a.id],
    };
    assert.equal((await answer(completion, valid)).status, 409);
    await completing;
    assert.equal(f.e.submissions[0].status, "error");
    assert.notEqual(f.e.state, "consumed");
    assert.equal(relay.queue.snapshot().heldAutonomous, 1);
    relay.queue.setAutonomous(true);
    await checkBridge();
    assert.equal(
      autonomousNpcWork(f.g, r),
      undefined,
      "A captured failed submission requires explicit retry",
    );
    const retry = retrySubmission(f.g, f.e, r, f.e.submissions[0].id),
      same = await next("complete");
    assert.equal(same.jobId, completion.jobId);
    assert.equal(same.requestHash, completion.requestHash);
    assert.deepEqual(same.payload, completion.payload);
    assert.notEqual(same.claim, completion.claim);
    assert.equal((await answer(same, valid)).status, 200);
    await retry;
    assert.equal(f.e.state, "consumed");
    assert.equal(f.e.submissions[0].author, f.a.id);
    assert.ok(f.a.access.includes(0));
    assert.ok(!f.h.access.includes(0));
    assert.equal(f.g.study.visits.length, 0);
    assert.equal(f.g.study.assessments.length, 0);
    assert.equal(f.g.study.learner!.evidence.length, 0);
    assert.equal(relay.queue.snapshot().done, 2);
  } finally {
    globalThis.fetch = async () =>
      Response.json({
        mode: "development",
        label: "fixture ended",
        detail: "",
        capabilities: [],
      });
    await checkBridge();
    globalThis.fetch = original;
    await relay.close();
  }
});

test("unattended candidates cannot change their authoring provider when a different bridge becomes available", async () => {
  const original = globalThis.fetch;
  try {
    for (const captured of ["study-mode", "chatgpt-handoff"] as const) {
      const f = fixture();
      await materializeNpcWork(f.g, f.e, async (p) => reply(p), false, {
        background: true,
        allowAutonomous: true,
        provider: captured,
      });
      assert.equal(f.e.proposals![0].provider, captured);
      const provider =
        captured === "study-mode" ? "chatgpt-handoff" : "study-mode";
      let requests = 0;
      globalThis.fetch = async (url) => {
        if (url === "/api/status")
          return Response.json({
            mode: provider,
            label: "Synthetic provider switch",
            detail: "",
            capabilities: ["autonomous-work", "materialize-work"],
          });
        requests++;
        throw Error(
          "A different provider must never receive the old candidate",
        );
      };
      await checkBridge();
      f.g.settings.handoffAutonomous = true;
      assert.equal(autonomousNpcWork(f.g, r), undefined);
      assert.equal(f.e.workspace, "abc");
      assert.equal(f.e.submissions.length, 0);
      assert.equal(requests, 0);
    }
  } finally {
    globalThis.fetch = async () =>
      Response.json({
        mode: "development",
        label: "fixture ended",
        detail: "",
        capabilities: [],
      });
    await checkBridge();
    globalThis.fetch = original;
  }
});
