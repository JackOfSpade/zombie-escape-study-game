import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { eligible } from "../src/curriculum";
import { rand, type Contract, type Roadmap } from "../src/model";
import { devProblem } from "../src/practice-problem";
import { createPlayableGame } from "../src/world";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));

function productContract(objectiveId: string): Contract {
  const g = createPlayableGame(9, r);
  const objective = r.tracks.PE.objectives.find((o) => o.id === objectiveId)!;
  return {
    ...eligible(r, g.study),
    track: "PE",
    objectiveIds: [objectiveId],
    scopes: [objective.scope],
  };
}

test("state classification supplies the actual items and their behavior without needing chat", () => {
  const contract = productContract("PE:T07.1");
  const p = devProblem(createPlayableGame(9, r), r, contract);
  assert.match(p.prompt, /shareDialogOpen/);
  assert.match(p.prompt, /resets on (?:a )?page reload/);
  assert.match(p.prompt, /sharing record.*persists/s);
  assert.match(p.prompt, /server checks.*record.*request/s);
  assert.match(p.prompt, /projectSnapshot.*last successful fetch/s);
  assert.match(p.prompt, /unchanged until.*fetch/s);
  assert.match(p.prompt, /Classify only (?:the )?three listed items/);
  assert.match(
    p.prompt,
    /ephemeral UI state, durable server state, or client-side cached/,
  );
  assert.match(p.prompt, /(?:old|stale).*snapshot.*(?:read|request)/is);
  assert.doesNotMatch(p.prompt, /Email|assumption|edge case|real project/i);
  assert.doesNotMatch(
    p.rubric.join(" "),
    /personal history|assumption|boundary|email/i,
  );
  assert.equal(p.rubric.length, 2);
  // The setup describes evidence; it does not pre-label each item with its answer.
  assert.doesNotMatch(
    p.prompt,
    /^[ABC]\. .*\b(?:ephemeral|durable|cached)\b/gm,
  );
  assert.deepEqual(p.contract, contract);
});

test("other product practice asks for an explicit learner-chosen example before applying its scope", () => {
  const contract = productContract("PE:T12.1");
  const p = devProblem(createPlayableGame(9, r), r, contract);
  assert.match(p.prompt, /open-ended (?:example|design) exercise/i);
  assert.match(p.prompt, /First, (?:choose|state)/);
  assert.match(p.prompt, /concrete facts/);
  assert.match(
    p.prompt,
    new RegExp(contract.scopes[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
  assert.doesNotMatch(p.prompt, /creative tool|collaborator|revok|Email/);
  assert.doesNotMatch(
    p.rubric.join(" "),
    /personal history|edge case|boundary/,
  );
});

test("state-management practice gives facts and a bounded task for each other objective", () => {
  const cases = [
    {
      id: "PE:T07.2",
      facts: [/30 seconds/, /50 KB/, /no push updates/i],
      task: /while it stays visible, when it regains focus, and after its own successful revocation/,
    },
    {
      id: "PE:T07.3",
      facts: [
        /two seconds/,
        /validation error/,
        /Only one rename can be in flight/,
      ],
      task: /pending indicator.*undo.*rejection.*reconcile/s,
    },
    {
      id: "PE:T07.4",
      facts: [
        /signed-in account/,
        /workspaceId/,
        /status filter/,
        /sort order/,
        /page cursor/,
      ],
      task: /example keys.*active first page.*archived first page.*later page/s,
    },
    {
      id: "PE:T07.5",
      facts: [
        /B returns first/,
        /A then returns/,
        /network may ignore cancellation/,
      ],
      task: /when B succeeds and A then succeeds, and when B fails while A succeeds/,
    },
  ];
  const g = createPlayableGame(9, r);
  for (const { id, facts, task } of cases) {
    const p = devProblem({ ...g, rng: 3 }, r, productContract(id));
    for (const fact of facts) assert.match(p.prompt, fact, id);
    assert.match(p.prompt, task, id);
    assert.doesNotMatch(
      p.prompt,
      /Email|Name one assumption|real project/i,
      id,
    );
    assert.doesNotMatch(p.rubric.join(" "), /personal history|assumption/i, id);
  }
});

test("only product-framing practice reuses the proposed revocation email story", () => {
  const g = createPlayableGame(9, r);
  const base = eligible(r, g.study);
  for (const objective of r.tracks.PE.objectives) {
    const p = devProblem({ ...g, rng: 3 }, r, {
      ...base,
      track: "PE",
      objectiveIds: [objective.id],
      scopes: [objective.scope],
    });
    if (objective.id.startsWith("PE:T01.")) {
      assert.match(p.prompt, /proposes: "Email/, objective.id);
    } else {
      assert.doesNotMatch(p.prompt, /proposes: "Email/, objective.id);
    }
    if (!/^PE:(?:T01|T07|X09)\./.test(objective.id)) {
      assert.match(p.prompt, /open-ended design exercise/, objective.id);
      assert.match(p.prompt, /concrete facts/, objective.id);
      assert.ok(p.prompt.includes(objective.scope), objective.id);
    }
  }
});

test("product question generation preserves its existing number of world RNG draws", () => {
  const g = createPlayableGame(9, r);
  for (const seed of [3, 9, 100]) {
    const expected = { rng: seed };
    const n = 3 + Math.floor(rand(expected) * 6);
    for (let i = 0; i < n + 1; i++) rand(expected);
    for (const id of [
      "PE:T01.1",
      "PE:T07.1",
      "PE:T07.5",
      "PE:T12.1",
      "PE:X09.2",
    ]) {
      const subject = { ...g, rng: seed };
      devProblem(subject, r, productContract(id));
      assert.equal(subject.rng, expected.rng, `${id}, seed ${seed}`);
    }
  }
});

test("editing one question's rubric cannot change a later question", () => {
  const g = createPlayableGame(9, r);
  const contract = productContract("PE:T07.1");
  const first = devProblem({ ...g, rng: 3 }, r, contract);
  const original = [...first.rubric];
  first.rubric.splice(0, first.rubric.length, "Changed by one encounter");
  const later = devProblem({ ...g, rng: 3 }, r, contract);
  assert.deepEqual(later.rubric, original);
});

test("all personal-project narrative objectives require real history", () => {
  for (const id of ["PE:X09.1", "PE:X09.2", "PE:X09.3"]) {
    const p = devProblem(createPlayableGame(9, r), r, productContract(id));
    assert.match(p.prompt, /real project you worked on/);
    assert.match(p.prompt, /Do not invent/);
    assert.doesNotMatch(p.prompt, /creative tool|open-ended/);
    assert.match(p.rubric.join(" "), /real.*(?:facts|history)/);
  }
});

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
  assert.doesNotMatch(
    trace.rubric.join(" "),
    /product|history|assumption|narrative/i,
  );
  assert.match(trace.rubric.join(" "), /final count.*partway.*edge case/);
  // Product prompts phrase their capability as the task itself.
  const product = devProblem({ ...g, rng: 3 }, r, contracts[3]);
  assert.match(
    product.prompt,
    /\n\nYour task: Frame the user problem and an MVP scope\.\n\n/,
  );
  // The scenario carries a concrete proposal to critique, not just a feature.
  assert.match(product.prompt, /proposes: "/);
});
