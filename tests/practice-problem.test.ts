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

const caseFacts: Record<string, { fact: RegExp; title: string }> = {
  share: { fact: /share_links table/, title: "Share link revocation" },
  list: { fact: /cursor pagination/, title: "Project list" },
  invite: { fact: /10 invites per hour/, title: "Invite collaborator form" },
  pro: { fact: /webhook events/, title: "Pro plan and integrations" },
};
const familyCase: Record<string, keyof typeof caseFacts> = {
  T04: "list",
  T05: "list",
  T09: "list",
  T10: "list",
  T06: "invite",
  T08: "invite",
  T18: "invite",
  T12: "pro",
};

test("other product practice supplies a fixed feature case instead of a learner-chosen example", () => {
  const g = createPlayableGame(9, r);
  const fallback = r.tracks.PE.objectives.filter(
    (o) => !/^PE:(?:T01|T07|X09)\./.test(o.id),
  );
  assert.ok(fallback.length > 80);
  for (const objective of fallback) {
    const p = devProblem({ ...g, rng: 3 }, r, productContract(objective.id));
    const family = objective.id.slice(3, 6);
    const expected = caseFacts[familyCase[family] ?? "share"];
    assert.ok(p.prompt.includes(objective.scope), objective.id);
    assert.ok(
      p.prompt.includes(`\n\nYour task: ${objective.scope}\n\n`),
      objective.id,
    );
    assert.doesNotMatch(
      p.prompt,
      /choose a small|choose .*example|open-ended/i,
      objective.id,
    );
    assert.match(p.prompt, expected.fact, objective.id);
    for (const other of Object.values(caseFacts))
      if (other !== expected)
        assert.doesNotMatch(p.prompt, other.fact, objective.id);
    assert.equal(p.title, `${expected.title} / applied design`, objective.id);
    assert.ok(p.title.endsWith("/ applied design"), objective.id);
    assert.equal(p.rubric.length, 2, objective.id);
    for (const item of p.rubric)
      assert.doesNotMatch(
        item,
        /State a concrete product example/,
        objective.id,
      );
    assert.ok(p.rubric[0].includes(objective.scope), objective.id);
  }
});

test("evidence-based scopes include their supplied artifact and others do not", () => {
  const g = createPlayableGame(9, r);
  const addenda: { ids: RegExp; fact: RegExp }[] = [
    { ids: /^PE:T15\./, fact: /POST \/links\/:id\/revoke/ },
    { ids: /^PE:T17\./, fact: /from 0 to about 4%/ },
    { ids: /^PE:T14\./, fact: /returning 410 within a second/ },
    { ids: /^PE:T20\./, fact: /microservice with its own message queue/ },
    { ids: /^PE:T02\.3$/, fact: /collaborator_email/ },
    { ids: /^PE:T02\.5$/, fact: /95% confidence interval/ },
    { ids: /^PE:T08\.5$/, fact: /hard-coded pattern "MM\/DD\/YYYY"/ },
    { ids: /^PE:T09\.1$/, fact: /main thread is busy for 2\.3 seconds/ },
    { ids: /^PE:T13\.4$/, fact: /waits a fixed 500 ms/ },
  ];
  const ids = r.tracks.PE.objectives.map((o) => o.id);
  for (const { ids: pattern, fact } of addenda) {
    const matching = ids.filter((id) => pattern.test(id));
    assert.ok(matching.length > 0, String(pattern));
    for (const id of matching) {
      const p = devProblem({ ...g, rng: 3 }, r, productContract(id));
      assert.match(p.prompt, fact, id);
      for (const other of addenda)
        if (other.fact !== fact) assert.doesNotMatch(p.prompt, other.fact, id);
    }
  }
  for (const id of ["PE:T19.1", "PE:T06.1", "PE:T02.1", "PE:T12.1"]) {
    const p = devProblem({ ...g, rng: 3 }, r, productContract(id));
    for (const { fact } of addenda) assert.doesNotMatch(p.prompt, fact, id);
  }
  // Evidence is described, not pre-labelled with its answer.
  for (const id of ids.filter((x) => /^PE:T1[457]\./.test(x))) {
    const p = devProblem({ ...g, rng: 3 }, r, productContract(id));
    assert.doesNotMatch(
      p.prompt,
      /root cause is|security (?:bug|issue|hole)|race condition|caching bug/i,
      id,
    );
  }
  const scope = devProblem({ ...g, rng: 3 }, r, productContract("PE:T19.1"));
  assert.match(
    scope.prompt,
    /no email, push or real-time channel, and no separate permissions service/,
  );
  assert.match(
    scope.prompt,
    /id, project_id, token, created_by and created_at/,
  );
  assert.match(scope.prompt, /no revocation field/);
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
      assert.ok(p.title.endsWith("/ applied design"), objective.id);
      assert.doesNotMatch(p.prompt, /open-ended|choose a small/i, objective.id);
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
