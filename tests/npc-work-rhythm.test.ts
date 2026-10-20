import assert from "node:assert/strict";
import test from "node:test";
import { step } from "../src/engine";
import { npcThinkingRate, npcProfile } from "../src/npc-cognition";
import { decode, encode } from "../src/persistence";
import { loopFixture } from "./helpers/study-loop";

function quietWorker() {
  const f = loopFixture(42, false);
  f.g.zombies = [];
  f.a.thought = 0;
  return f;
}

test("uninterrupted terminal work changes pace within a reasoning step", () => {
  const { g, a, e } = quietWorker();
  const gains: number[] = [];
  for (let block = 0; block < 4; block++) {
    const before = a.thought;
    for (let i = 0; i < 90; i++) step(g, 1 / 30);
    assert.equal(a.activity, "studying");
    assert.equal(
      a.milestone,
      0,
      "Compare pacing before mistakes or milestone rewards",
    );
    gains.push(a.thought - before);
  }
  assert.ok(
    Math.max(...gains) / Math.min(...gains) > 1.1,
    `Work should have noticeable reading/thinking variation: ${gains}`,
  );
  assert.equal(e.npcProgress, 0);
  assert.equal(g.study.learner!.evidence.length, 0);
});

test("a testing specialist handles boundary review faster at equal topic expertise", () => {
  const { a, e } = quietWorker();
  a.technical = structuredClone(npcProfile(a));
  a.milestone = 2;
  a.thought = 60;
  a.technical.strengths.testing = 0.2;
  const novice = npcThinkingRate(a, e);
  a.technical.strengths.testing = 0.95;
  assert.ok(npcThinkingRate(a, e) > novice * 1.15);
});

test("work rhythm resumes identically after a checkpoint without extra random draws", () => {
  const { g, a, e } = quietWorker();
  for (let i = 0; i < 180; i++) step(g, 1 / 30);
  const rng = g.rng;
  for (let i = 0; i < 100; i++) npcThinkingRate(a, e);
  assert.equal(g.rng, rng);
  const restored = decode(encode(g));
  for (let i = 0; i < 900; i++) {
    step(g, 1 / 30);
    step(restored, 1 / 30);
  }
  const b = restored.survivors.find((b) => b.id === a.id)!;
  assert.equal(b.thought, a.thought);
  assert.equal(b.milestone, a.milestone);
  assert.equal(restored.encounters[e.id].npcProgress, e.npcProgress);
  assert.ok(
    e.npcProgress > 0,
    "Variable pacing must still produce actual terminal work",
  );
});
