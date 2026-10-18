import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { eligible } from "../src/curriculum";
import type { Roadmap } from "../src/model";
import {
  npcReasoningAvailable,
  npcWorkContext,
  recordNpcWork,
} from "../src/npc-cognition";
import { createGame } from "../src/world";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));
function fixture() {
  const g = createGame(7, r),
    e = g.encounters["f0-room0"],
    a = g.survivors[1];
  e.problem = {
    title: "Synthetic fixed question",
    prompt: "A single unchanged scope",
    starter: "",
    rubric: ["fixture"],
    provenance: "study-mode",
    contract: eligible(r, g.study),
  };
  e.humanEngaged = true;
  return { g, e, a };
}
test("repeating scoped stage cycles cannot mint new work records or simulated contribution without new public input", () => {
  const { g, e, a } = fixture();
  for (let n = 1; n <= 4; n++) {
    a.milestone = n;
    assert.ok(recordNpcWork(g, e, a, false) > 0);
  }
  const before = JSON.stringify(e),
    seq = g.seq,
    rng = g.rng;
  for (let n = 5; n <= 40; n++) {
    a.milestone = n;
    assert.equal(recordNpcWork(g, e, a, false), 0);
  }
  assert.equal(JSON.stringify(e), before);
  assert.equal(g.seq, seq);
  assert.equal(g.rng, rng);
});

import { edit } from "../src/ai";
import { claimStation, step } from "../src/engine";
import { event } from "../src/model";
import { materializeNpcWork } from "../src/npc-materialization";
import { decode, encode, recover } from "../src/persistence";
function exhaust(f: ReturnType<typeof fixture>) {
  for (let n = 1; n <= 4; n++) {
    f.a.milestone = n;
    recordNpcWork(f.g, f.e, f.a, false);
  }
  assert.equal(npcReasoningAvailable(f.e, f.a), false);
}
test("all supplied facets receive distinct stage work before modeled reasoning waits for public input", () => {
  const f = fixture(),
    c = f.e.problem!.contract;
  f.e.problem!.scopeDefinitions = [
    {
      id: `${c.objectiveIds[0]}/D${c.depth}`,
      objectiveId: c.objectiveIds[0],
      depth: c.depth,
      sourceScope: c.scopes[0],
      facets: [
        { id: "first", description: "First fixture facet" },
        { id: "second", description: "Second fixture facet" },
      ],
    },
  ];
  for (let n = 1; n <= 8; n++) {
    f.a.milestone = n;
    assert.ok(recordNpcWork(f.g, f.e, f.a, false) > 0);
  }
  assert.equal(
    new Set(f.e.npcWork!.map((w) => `${w.stage}/${w.facet}`)).size,
    8,
  );
  assert.equal(npcReasoningAvailable(f.e, f.a), false);
  assert.equal(f.g.study.learner!.evidence.length, 0);
});
test("time, Surge, NPC notes, presentation and private tutoring do not restart unchanged scoped work", () => {
  const f = fixture();
  exhaust(f);
  const key = npcWorkContext(f.e);
  f.g.time += 1800;
  f.g.surge.state = "active";
  const privateEvent = event(
    f.g,
    "message",
    "PRIVATE_SECRET",
    0,
    "human",
    f.e.id,
  );
  f.e.tutor.push({
    id: "private",
    author: "human",
    kind: "human",
    text: "PRIVATE_SECRET",
    seq: privateEvent.seq,
    worldTime: f.g.time,
    provenance: "live-human",
  });
  f.e.history.push({
    seq: privateEvent.seq,
    author: "human",
    kind: "chat",
    text: "PRIVATE_SECRET",
    revision: 0,
    at: f.g.time,
  });
  const npcEvent = event(
    f.g,
    "npc-proposal",
    "Tentative generated note",
    0,
    f.a.id,
    f.e.id,
  );
  f.e.group.push({
    id: "npc",
    author: f.a.id,
    kind: "npc",
    text: npcEvent.text,
    seq: npcEvent.seq,
    worldTime: f.g.time,
    provenance: "fixture",
  });
  f.e.history.push({
    seq: npcEvent.seq,
    author: f.a.id,
    kind: "npc-proposal",
    text: npcEvent.text,
    revision: 0,
    at: f.g.time,
    presented: ++f.g.seq,
  });
  assert.equal(npcWorkContext(f.e), key);
  assert.equal(npcReasoningAvailable(f.e, f.a), false);
  assert.ok(!key!.includes("PRIVATE_SECRET"));
});
test("a shared edit or a human public turn opens a new bounded reasoning context without changing academic scope", () => {
  for (const input of ["edit", "public"]) {
    const f = fixture();
    exhaust(f);
    const key = npcWorkContext(f.e),
      contract = JSON.stringify(f.e.problem!.contract),
      study = JSON.stringify(f.g.study);
    if (input === "edit") edit(f.g, f.e, "new shared reasoning", f.e.revision);
    else {
      const ev = event(
        f.g,
        "message",
        "What about this boundary?",
        0,
        "human",
        f.e.id,
      );
      f.e.group.push({
        id: "public",
        kind: "human",
        author: "human",
        text: ev.text,
        seq: ev.seq,
        worldTime: f.g.time,
        provenance: "live-human",
      });
    }
    assert.notEqual(npcWorkContext(f.e), key);
    assert.equal(npcReasoningAvailable(f.e, f.a), true);
    exhaust(f);
    assert.equal(JSON.stringify(f.e.problem!.contract), contract);
    assert.equal(JSON.stringify(f.g.study), study);
  }
});
test("only recorded executed output or actual needs-work feedback reopens review, not a pending job or NPC execution claim", () => {
  const f = fixture();
  exhaust(f);
  f.e.executions = [
    {
      id: "job",
      revision: 0,
      language: "python",
      code: "",
      artifactSequences: [],
      status: "pending",
    },
  ];
  assert.equal(npcReasoningAvailable(f.e, f.a), false);
  let ev = event(
    f.g,
    "npc-proposal",
    "I think a test would fail",
    0,
    f.a.id,
    f.e.id,
  );
  f.e.history.push({
    seq: ev.seq,
    author: f.a.id,
    kind: "npc-proposal",
    text: ev.text,
    revision: 0,
    at: f.g.time,
  });
  assert.equal(npcReasoningAvailable(f.e, f.a), false);
  const j = f.e.executions[0];
  j.status = "finished";
  j.receipt = {
    id: "fixture",
    language: "python",
    status: "completed",
    executed: true,
    exitCode: 1,
    stdout: "",
    stderr: "assertion failed",
  };
  ev = event(
    f.g,
    "execution",
    "Synthetic observed failure",
    0,
    "runner",
    f.e.id,
  );
  f.e.history.push({
    seq: ev.seq,
    author: "runner",
    kind: "execution",
    executionId: j.id,
    text: JSON.stringify(j.receipt),
    revision: 0,
    at: f.g.time,
  });
  assert.equal(npcReasoningAvailable(f.e, f.a), true);
  exhaust(f);
  f.e.submissions.push({
    id: "submission",
    author: "human",
    revision: 0,
    content: "",
    status: "pending",
    feedback: "Checking",
    seq: ++f.g.seq,
  });
  assert.equal(npcReasoningAvailable(f.e, f.a), false);
  f.e.submissions[0].status = "needs-work";
  assert.equal(npcReasoningAvailable(f.e, f.a), true);
  assert.equal(f.g.study.learner!.evidence.length, 0);
});
test("modeled review state survives reload and unknown offscreen work keeps its separate cheap simulation", () => {
  const f = fixture();
  exhaust(f);
  const loaded = recover(decode(encode(f.g)));
  assert.equal(
    npcReasoningAvailable(loaded.encounters[f.e.id], loaded.survivors[1]),
    false,
  );
  delete f.e.problem;
  assert.equal(npcReasoningAvailable(f.e, f.a), true);
  for (let n = 1; n <= 8; n++) {
    f.a.milestone = n;
    assert.ok(recordNpcWork(f.g, f.e, f.a, false) > 0);
  }
  assert.ok(
    f.e
      .npcWork!.slice(-8)
      .every((w) => !w.scopeIds.length && w.contextKey === undefined),
  );
});
test("thirty simulated minutes at an unchanged observed terminal produce bounded concrete work and then no idle model requests", async () => {
  const f = fixture(),
    g = f.g,
    e = f.e,
    a = f.a,
    ss = g.floors[0].stations.filter((s) => s.encounter === e.id);
  g.status = "playing";
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.zombies = [];
  g.surge.anchor = 10000;
  g.survivors = [g.survivors[0], a];
  g.floors[0].furniture = [];
  g.floors[0].tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
  Object.assign(g.survivors[0], { x: ss[0].x, y: ss[0].y });
  claimStation(g, g.survivors[0], ss[0].id);
  Object.assign(a, {
    x: ss[1].x,
    y: ss[1].y,
    station: ss[1].id,
    intent: e.id,
    role: "analyst",
    social: 0.3,
    seen: ss.map((s) => s.id),
    activity: "studying",
  });
  e.state = "in-progress";
  let calls = 0;
  const adapter = async (p: any) => {
    calls++;
    return {
      requestId: p.requestId,
      sourceRevision: p.sourceRevision,
      notes: p.work.map((w: any) => ({
        workId: w.id,
        author: w.actor,
        text: "Tentative fixture note; no execution or correctness claim.",
        refs: [w.seq],
      })),
    };
  };
  for (let n = 0; n < 54000; n++) {
    step(g, 1 / 30);
    if (n % 6 === 0) await materializeNpcWork(g, e, adapter);
  }
  assert.ok(calls >= 4 && calls <= 5, `unexpected model calls: ${calls}`);
  assert.ok(e.npcWork!.length >= 4 && e.npcWork!.length <= 5);
  const thought = a.thought,
    milestone = a.milestone,
    count = calls;
  for (let n = 0; n < 300; n++) {
    step(g, 1 / 30);
    if (n % 6 === 0) await materializeNpcWork(g, e, adapter);
  }
  assert.equal(a.thought, thought);
  assert.equal(a.milestone, milestone);
  assert.equal(calls, count);
  assert.equal(e.group.length, 0);
  assert.equal(e.state, "in-progress");
  assert.equal(g.study.learner!.evidence.length, 0);
  assert.equal(g.study.visits.length, 0);
});

test("an unobserved pre-generated question keeps cheap NPC completion instead of stalling at a bounded human review budget", () => {
  const f = fixture(),
    { g, e, a } = f,
    ss = g.floors[0].stations.filter((s) => s.encounter === e.id);
  delete e.humanEngaged;
  g.status = "playing";
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.zombies = [];
  g.surge.anchor = 10000;
  g.survivors = [g.survivors[0], a];
  g.survivors[0].escaped = true;
  g.floors[0].furniture = [];
  g.floors[0].tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
  Object.assign(a, {
    x: ss[1].x,
    y: ss[1].y,
    station: ss[1].id,
    intent: e.id,
    role: "analyst",
    social: 0.3,
    seen: ss.map((s) => s.id),
    activity: "studying",
  });
  e.state = "in-progress";
  assert.equal(npcWorkContext(e), undefined);
  for (let n = 0; n < 9000 && (e.state as string) !== "consumed"; n++)
    step(g, 1 / 30);
  assert.equal(e.state, "consumed");
  assert.ok(a.access.includes(0));
  assert.equal(g.study.learner!.evidence.length, 0);
});
