import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { unfinishedLastQuestion } from "../src/final-question";
import type { Problem, Roadmap } from "../src/model";
import { createGame } from "../src/world";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));
const problem = { title: "Synthetic", prompt: "Synthetic" } as Problem;
function fixture() {
  const g = createGame(7, r),
    e = Object.values(g.encounters)[0];
  Object.assign(e, {
    mode: "solo",
    owner: "human",
    state: "in-progress",
    problem,
    problemPresentedSequence: 3,
  });
  return { g, e };
}
test("a presented, unconsumed solo question is the unfinished last question", () => {
  const { g, e } = fixture();
  assert.equal(unfinishedLastQuestion(g, e.id), e);
});
test("an unpresented problem counts only once the human has replied", () => {
  const { g, e } = fixture();
  delete e.problemPresentedSequence;
  e.tutor = [];
  e.history = [];
  assert.equal(unfinishedLastQuestion(g, e.id), undefined);
  e.tutor = [
    { id: "m1", author: "human", kind: "human", text: "hi", at: 1 } as any,
  ];
  assert.equal(unfinishedLastQuestion(g, e.id), e);
});
test("a consumed question is finished", () => {
  const { g, e } = fixture();
  e.state = "consumed";
  assert.equal(unfinishedLastQuestion(g, e.id), undefined);
});
test("shared group encounters are not tutor questions", () => {
  const { g, e } = fixture();
  e.mode = "shared";
  assert.equal(unfinishedLastQuestion(g, e.id), undefined);
});
test("a missing encounter or undefined id yields nothing", () => {
  const { g } = fixture();
  assert.equal(unfinishedLastQuestion(g, "no-such-encounter"), undefined);
  assert.equal(unfinishedLastQuestion(g, undefined), undefined);
});
