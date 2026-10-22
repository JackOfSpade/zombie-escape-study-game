import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { eligible } from "../src/curriculum";
import { rand, type Contract, type Game, type Roadmap } from "../src/model";
import { devProblem } from "../src/practice-problem";
import { aiPracticeQuestions } from "../src/product-practice-ai";
import { deliveryQuestions } from "../src/product-practice-delivery";
import { createPlayableGame } from "../src/world";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));

function productContract(objectiveId: string, depth = 2): Contract {
  const g = createPlayableGame(9, r);
  const objective = r.tracks.PE.objectives.find((o) => o.id === objectiveId)!;
  return {
    ...eligible(r, g.study),
    track: "PE",
    objectiveIds: [objectiveId],
    scopes: [objective.scope],
    depth,
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

test("every one of the 112 PE objectives gets its own concrete question at depths 1 and 2", () => {
  const g = createPlayableGame(9, r);
  const objectives = r.tracks.PE.objectives;
  assert.equal(objectives.length, 112);
  for (const depth of [1, 2]) {
    const prompts = new Set<string>();
    const titles = new Set<string>();
    for (const objective of objectives) {
      const contract = productContract(objective.id, depth);
      const p = devProblem({ ...g, rng: 3 }, r, contract);
      const label = `${objective.id} D${depth}`;
      assert.equal(p.provenance, "development", label);
      assert.equal(p.starter, "", label);
      assert.deepEqual(p.contract, contract, label);
      assert.equal(p.validation, undefined, label);
      assert.ok(p.title.length > 5, label);
      assert.ok(p.prompt.length > 200, label);
      assert.ok(p.rubric.length >= 2, label);
      for (const item of p.rubric) assert.ok(item.trim().length > 10, label);
      // No raw scope paste or obsolete family-wide boilerplate.
      assert.ok(!p.prompt.includes(objective.scope), label);
      assert.ok(!p.rubric.join(" ").includes(objective.scope), label);
      assert.doesNotMatch(
        p.prompt,
        /Your task:|What to cover:|If you need an assumption beyond these facts|A web-based creative tool is used by about/,
        label,
      );
      assert.doesNotMatch(p.title, /applied design/, label);
      prompts.add(p.prompt);
      titles.add(p.title);
    }
    assert.equal(prompts.size, objectives.length, `distinct prompts D${depth}`);
    assert.equal(titles.size, objectives.length, `distinct titles D${depth}`);
  }
});

test("AI-assisted engineering objectives each ask a distinct task with their bank rubric", () => {
  const g = createPlayableGame(9, r);
  const ids = ["PE:T20.1", "PE:T20.2", "PE:T20.3", "PE:T20.4", "PE:T20.5"];
  const prompts = ids.map((id) => {
    const p = devProblem({ ...g, rng: 3 }, r, productContract(id));
    assert.equal(p.prompt, aiPracticeQuestions[id].prompt, id);
    assert.deepEqual(p.rubric, aiPracticeQuestions[id].rubric, id);
    return p.prompt;
  });
  assert.equal(new Set(prompts).size, ids.length);
  // The old family-wide "microservice" addendum is no longer shared: only
  // T20.5, whose task is explaining that rejected alternative, mentions it.
  assert.deepEqual(
    prompts.map((p) => /microservice with its own message queue/.test(p)),
    [false, false, false, false, true],
  );
});

test("T20.2's shown generated code really has the defects its rubric expects", async () => {
  const p = devProblem(
    createPlayableGame(9, r),
    r,
    productContract("PE:T20.2"),
  );
  const code = /```ts\n([\s\S]*?)```/.exec(p.prompt)?.[1];
  assert.ok(code, "T20.2 shows its generated code");
  // Strip the TypeScript-only syntax the snippet uses, then run it on stubs.
  const js = code.replace(/^export /gm, "").replace(/: string/g, "");
  const links = new Map([
    ["l1", { id: "l1", projectId: "p1", token: "tok", revokedAt: null }],
  ]) as Map<
    string,
    { id: string; projectId: string; token: string; revokedAt: Date | null }
  >;
  const project = { ownerId: "owner", memberIds: ["owner", "collab"] };
  const helpers = {
    getLink: async (id: string) => links.get(id) ?? null,
    findLinkByToken: async (token: string) =>
      [...links.values()].find((l) => l.token === token) ?? null,
    getProject: async () => project,
    isMember: (userId: string, p: typeof project) =>
      p.memberIds.includes(userId),
    setRevokedAt: async (id: string, at: Date) => {
      links.get(id)!.revokedAt = at;
    },
  };
  const make = new Function(
    ...Object.keys(helpers),
    `${js}\nreturn { revokeLink, authorizeProjectRead };`,
  );
  const { revokeLink, authorizeProjectRead } = make(
    ...Object.values(helpers),
  ) as {
    revokeLink: (u: string, l: string) => Promise<{ status: number }>;
    authorizeProjectRead: (t: string) => Promise<boolean>;
  };
  assert.deepEqual(await revokeLink("stranger", "l1"), { status: 403 });
  assert.equal(links.get("l1")!.revokedAt, null);
  // Defect 1: a non-owner collaborator can revoke.
  assert.deepEqual(await revokeLink("collab", "l1"), { status: 200 });
  assert.ok(links.get("l1")!.revokedAt instanceof Date);
  // Defect 2: a revoked token still authorizes reads.
  assert.equal(await authorizeProjectRead("tok"), true);
  assert.match(p.rubric.join(" "), /isMember lets any collaborator revoke/);
  assert.match(p.rubric.join(" "), /authorizeProjectRead ignores revokedAt/);
});

test("depth-1 X08 questions are code reading with no required implementation", () => {
  const g = createPlayableGame(9, r);
  for (const id of ["PE:X08.2", "PE:X08.3"]) {
    const d1 = devProblem({ ...g, rng: 3 }, r, productContract(id, 1));
    assert.equal(d1.starter, "", id);
    assert.match(d1.prompt, /```(?:js|jsx)\n[\s\S]+```/, id);
    assert.match(d1.prompt, /[Nn]o implementation (?:is )?needed/, id);
    assert.match(d1.prompt, /Trace what/, id);
    assert.doesNotMatch(
      d1.prompt,
      /Implement debounce|Write the implementation|In 45 minutes|build a Tabs component twice|write three or four small tests/i,
      id,
    );
    assert.doesNotMatch(d1.rubric.join(" "), /^Implement|Write focused/m, id);
    // D2+ keeps the bank's genuine implementation intent.
    const d2 = devProblem({ ...g, rng: 3 }, r, productContract(id, 2));
    assert.equal(d2.prompt, deliveryQuestions[id].prompt, id);
    assert.notEqual(d1.prompt, d2.prompt, id);
  }
  const debounce = devProblem(
    { ...g, rng: 3 },
    r,
    productContract("PE:X08.2", 1),
  );
  assert.match(debounce.prompt, /cancel/);
  assert.match(debounce.rubric.join(" "), /400 ms with argument 2/);
  assert.match(debounce.rubric.join(" "), /TypeError/);
  const tabs = devProblem({ ...g, rng: 3 }, r, productContract("PE:X08.3", 1));
  assert.match(tabs.rubric.join(" "), /B's late response replaces it/);
  assert.match(tabs.rubric.join(" "), /aria-selected/);
  // Starting-state premise: A is initial and settled, nothing else in flight.
  assert.match(tabs.prompt, /A \(tabs\[0\]\) is the initially selected tab/);
  assert.match(tabs.prompt, /A's initial request completed before t = 0 ms/);
  assert.match(tabs.prompt, /no other requests are outstanding/);
  // Derive the trace from the stated click/load timings.
  const click = (tab: string) => {
    const m = tabs.prompt.match(
      new RegExp(`tab ${tab} at t = (\\d+) ms \\(its load takes (\\d+) ms\\)`),
    );
    assert.ok(m, tab);
    return Number(m[1]) + Number(m[2]);
  };
  const arrivals = [
    { tab: "C", at: click("C") },
    { tab: "B", at: click("B") },
  ].sort((x, y) => x.at - y.at);
  assert.deepEqual(arrivals, [
    { tab: "C", at: 300 },
    { tab: "B", at: 900 },
  ]);
  const shownAt = (t: number) =>
    arrivals.filter((a) => a.at <= t).pop()?.tab ?? "A";
  assert.equal(shownAt(300), "C");
  assert.equal(shownAt(900), "B");
  assert.match(tabs.prompt, /at t = 300 ms and at t = 900 ms/);
  const trace = devProblem({ ...g, rng: 3 }, r, productContract("PE:X08.1", 1));
  assert.doesNotMatch(trace.prompt, /write a TypeScript signature/);
  assert.doesNotMatch(trace.rubric.join(" "), /give a correctly typed once/);
});

test("unknown, prototype and missing objective ids fail clearly instead of inventing a feature", () => {
  const g = createPlayableGame(9, r);
  const base = productContract("PE:T01.1");
  for (const id of [
    "PE:T99.1",
    "PE:T07",
    "__proto__",
    "constructor",
    "toString",
    "hasOwnProperty",
  ])
    for (const depth of [1, 2])
      assert.throws(
        () =>
          devProblem({ ...g, rng: 3 }, r, {
            ...base,
            objectiveIds: [id],
            depth,
          }),
        /Unsupported development question: no product practice question exists for/,
        id,
      );
  assert.throws(
    () => devProblem({ ...g, rng: 3 }, r, { ...base, objectiveIds: [] }),
    /Unsupported development question: the contract has no objective id/,
  );
});

test("editing one question's rubric cannot change a later question or the bank", () => {
  const g = createPlayableGame(9, r);
  for (const [id, depth] of [
    ["PE:T07.1", 2],
    ["PE:T20.2", 2],
    ["PE:T01.1", 2],
    ["PE:X09.1", 2],
    ["PE:X08.2", 1],
    ["PE:X08.1", 1],
  ] as const) {
    const contract = productContract(id, depth);
    const first = devProblem({ ...g, rng: 3 }, r, contract);
    const original = [...first.rubric];
    first.rubric.splice(0, first.rubric.length, "Changed by one encounter");
    const later = devProblem({ ...g, rng: 3 }, r, contract);
    assert.deepEqual(later.rubric, original, id);
    assert.notEqual(later.rubric, first.rubric, id);
  }
  assert.notEqual(
    aiPracticeQuestions["PE:T20.2"].rubric[0],
    "Changed by one encounter",
  );
});

function withGap(game: Game, track: string, objectiveId: string): Game {
  return {
    ...game,
    rng: 3,
    study: {
      ...game.study,
      knowledgeGaps: [
        {
          track,
          objectiveIds: [objectiveId],
          resolved: false,
          facet: { id: "chore", description: "Write a full migration plan" },
        },
      ],
    } as never,
  };
}

test("declared PE gaps never append extra chores, while Python gap lines remain", () => {
  const g = createPlayableGame(9, r);
  for (const id of ["PE:T07.1", "PE:T20.2", "PE:X09.2", "PE:X08.2"]) {
    const contract = productContract(id);
    const plain = devProblem({ ...g, rng: 3 }, r, contract);
    const gapped = devProblem(withGap(g, "PE", id), r, contract);
    assert.equal(gapped.prompt, plain.prompt, id);
    assert.doesNotMatch(
      gapped.prompt,
      /flagged this as a gap|full migration plan/,
      id,
    );
  }
  const base = eligible(r, g.study);
  const python = devProblem(withGap(g, "PY", "PY:T05.2"), r, {
    ...base,
    track: "PY",
    objectiveIds: ["PY:T05.2"],
    scopes: [base.scopes[0]],
  });
  assert.match(
    python.prompt,
    /You flagged this as a gap earlier, so cover it too: Write a full migration plan\./,
  );
});

test("product question generation preserves its existing number of world RNG draws", () => {
  const g = createPlayableGame(9, r);
  for (const seed of [3, 9, 100]) {
    const expected = { rng: seed };
    const n = 3 + Math.floor(rand(expected) * 6);
    for (let i = 0; i < n + 1; i++) rand(expected);
    for (const [id, depth] of [
      ["PE:T01.1", 2],
      ["PE:T07.1", 2],
      ["PE:T07.5", 2],
      ["PE:T12.1", 2],
      ["PE:T20.2", 2],
      ["PE:X09.2", 2],
      ["PE:X08.2", 1],
      ["PE:X08.3", 1],
    ] as const) {
      const subject = { ...g, rng: seed };
      devProblem(subject, r, productContract(id, depth));
      assert.equal(subject.rng, expected.rng, `${id}, seed ${seed}`);
    }
  }
});

test("all personal-project narrative objectives require real history with a bounded ask", () => {
  const asks: Record<string, RegExp> = {
    "PE:X09.1": /one decision you made and the trade-off/,
    "PE:X09.2":
      /what did you personally implement, which alternative did you consider/,
    "PE:X09.3":
      /60-second interview answer for a team building a customer-facing product/,
  };
  for (const [id, ask] of Object.entries(asks)) {
    const p = devProblem(createPlayableGame(9, r), r, productContract(id));
    assert.match(p.prompt, /real project you worked on/, id);
    assert.match(p.prompt, /Do not invent facts, work or metrics/, id);
    assert.match(p.prompt, /qualify uncertain numbers/, id);
    assert.match(p.prompt, /Separate your own work from the team's work/, id);
    assert.match(p.prompt, ask, id);
    for (const [other, otherAsk] of Object.entries(asks))
      if (other !== id) assert.doesNotMatch(p.prompt, otherAsk, id);
    assert.doesNotMatch(p.prompt, /creative tool|open-ended|What to cover/, id);
    assert.match(
      p.rubric.join(" "),
      /real project facts and personal history/,
      id,
    );
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
  // Product prompts never paste the scheduled scope as the task.
  const product = devProblem({ ...g, rng: 3 }, r, contracts[3]);
  assert.ok(
    !product.prompt.includes("Frame the user problem and an MVP scope."),
  );
  assert.match(product.prompt, /export button/);
});

test("recipe browser-loading practice supplies network setup and DOM timing instead of testing protocol trivia", () => {
  const p = devProblem(
    createPlayableGame(9, r),
    r,
    productContract("PE:T04.1", 1),
  );
  assert.match(p.prompt, /DNS lookup and the HTTPS connection.*complete/);
  assert.match(p.prompt, /waits until the DOM is ready \(DOMContentLoaded\)/);
  assert.match(p.prompt, /heading.*first appear/);
  assert.doesNotMatch(p.rubric.join(" "), /TCP|TLS|connection setup|handshake/);
  assert.equal(p.rubric.length, 3);
});
