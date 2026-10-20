import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { eligible } from "../src/curriculum";
import type { Roadmap } from "../src/model";
import { devProblem } from "../src/practice-problem";
import { createPlayableGame } from "../src/world";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));

test("practice questions show the player only the question, never scheduling internals", () => {
  const g = createPlayableGame(9, r);
  const base = eligible(r, g.study);
  const contracts = [
    base,
    {
      ...base,
      track: "PY" as const,
      objectiveIds: ["PY:T05.2"],
      scopes: [base.scopes[0]],
    },
    {
      ...base,
      track: "PY" as const,
      objectiveIds: ["PY:T09.1"],
      scopes: ["Select DFS or BFS based on the needed output."],
    },
    {
      ...base,
      track: "PE" as const,
      objectiveIds: ["PE:T01.1"],
      scopes: ["Frame the user problem and an MVP scope."],
    },
    {
      ...base,
      track: "PE" as const,
      objectiveIds: ["PE:X09.1"],
      scopes: ["Explain a real project decision."],
    },
  ];
  for (const contract of contracts) {
    const p = devProblem({ ...g, rng: 3 }, r, contract);
    assert.doesNotMatch(
      p.prompt,
      /scheduled scope|Scheduled scope|Target scope|illustrative|live generator|Development (rehearsal|exercise)|\bD[1-4]\b/,
      contract.objectiveIds[0],
    );
    // The contract still carries the scope under the hood.
    assert.deepEqual(p.contract.scopes, contract.scopes);
  }
  // A Python trace never shows its unrelated scheduled scope.
  const trace = devProblem({ ...g, rng: 3 }, r, contracts[2]);
  assert.doesNotMatch(trace.prompt, /DFS or BFS/);
  assert.match(trace.prompt, /Predict the final value of count/);
  assert.match(trace.prompt, /edge case/);
  // Product prompts phrase their capability as the task itself.
  const product = devProblem({ ...g, rng: 3 }, r, contracts[3]);
  assert.match(
    product.prompt,
    /\n\nYour task: Frame the user problem and an MVP scope\.\n\n/,
  );
  // The scenario carries a concrete proposal to critique, not just a feature.
  assert.match(product.prompt, /proposes: "/);
});
