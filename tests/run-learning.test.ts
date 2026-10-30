import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Roadmap } from "../src/model";
import { decode, encode, recover } from "../src/persistence";
import { retainRunLearning } from "../src/run-learning";
import { createGame } from "../src/world";

const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);

for (const artifact of [
  "chat draft",
  "workspace",
  "message",
  "submission",
] as const)
  test(`restart retains a legacy incomplete ${artifact} without awarding learning credit`, () => {
    const g = createGame(731, roadmap),
      e = g.encounters["f0-room0"];
    // Legacy/imported work may have no issuance marker or matching history rows.
    assert.equal(e.problemPresentedSequence, undefined);
    assert.deepEqual(e.history, []);
    if (artifact === "chat draft")
      e.chatDraft = "Synthetic unfinished answer: I think";
    else if (artifact === "workspace")
      e.workspace = "Synthetic unfinished function(";
    else if (artifact === "message")
      e.tutor.push({
        id: "synthetic-partial-answer",
        author: "human",
        kind: "human",
        text: "Synthetic partial explanation",
        seq: 1,
        worldTime: 0,
        provenance: "synthetic legacy import",
      });
    else
      e.submissions.push({
        id: "synthetic-pending-answer",
        author: "human",
        content: "Synthetic partial answer submitted before an outage",
        revision: 0,
        seq: 1,
        status: "error",
        feedback: "Synthetic outage",
      });
    const expected = structuredClone(e),
      ledger = structuredClone(g.study.learner),
      views = structuredClone({ visits: g.study.visits, cycle: g.study.cycle });
    assert.deepEqual(
      retainRunLearning(g, true).map((e) => e.id),
      [e.id],
    );
    // Repeated saves/restarts must not duplicate the retained encounter.
    retainRunLearning(g, true);
    const restored = recover(decode(encode(g))),
      next = createGame(732, roadmap, restored.study);
    assert.equal(next.study.archives.length, 1);
    assert.deepEqual(next.study.archives[0], expected);
    assert.deepEqual(next.study.learner, ledger);
    assert.deepEqual(
      { visits: next.study.visits, cycle: next.study.cycle },
      views,
    );
    assert.equal(next.encounters[e.id].workspace, "");
    assert.equal(next.encounters[e.id].chatDraft, undefined);
    assert.deepEqual(next.survivors[0].access, []);
  });

test("untouched generated starters do not become retained human work", () => {
  const g = createGame(733, roadmap),
    e = g.encounters["f0-room0"];
  e.problem = {
    title: "Synthetic unused task",
    prompt: "Synthetic prompt",
    starter: "Synthetic supplied starter",
    rubric: [],
    provenance: "development",
    contract: {
      id: "synthetic-unused-contract",
      track: "PY",
      objectiveIds: [],
      scopes: [],
      depth: 1,
      phase: "DIAGNOSE_ALL",
      review: false,
      ledgerVersion: 0,
      priorEvidence: [],
    },
  };
  e.workspace = e.problem.starter;
  e.chatDraft = "";
  assert.deepEqual(retainRunLearning(g, true), []);
  assert.deepEqual(g.study.archives, []);
});
