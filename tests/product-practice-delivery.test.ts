import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { deliveryQuestions } from "../src/product-practice-delivery";

const expectedIds = [
  ...["T11", "T12", "T13", "T14", "T15", "T16", "T17", "T18", "T19"].flatMap(
    (family) => [1, 2, 3, 4, 5].map((n) => `PE:${family}.${n}`),
  ),
  ...["X03", "X07", "X08"].flatMap((family) =>
    [1, 2, 3].map((n) => `PE:${family}.${n}`),
  ),
];

const words = (text: string) => text.trim().split(/\s+/).length;

test("delivery questions cover exactly the 54 requested objectives", () => {
  assert.equal(expectedIds.length, 54);
  assert.deepEqual(Object.keys(deliveryQuestions).sort(), expectedIds.sort());
});

test("each delivery question is bounded and has a matching rubric", () => {
  const titles = new Set<string>();
  for (const [id, q] of Object.entries(deliveryQuestions)) {
    const limit = id.startsWith("PE:X07.") ? 260 : 220;
    const count = words(q.prompt);
    assert.ok(count >= 60 && count <= limit, `${id}: ${count} words`);
    assert.ok(q.title.length > 0 && q.title.length <= 80, id);
    assert.ok(!titles.has(q.title), `${id}: duplicate title`);
    titles.add(q.title);
    assert.ok(q.rubric.length >= 2 && q.rubric.length <= 4, id);
    for (const item of q.rubric) assert.ok(item.length >= 20, id);
    assert.doesNotMatch(
      q.prompt,
      /Your task:|scheduled scope|certif|whole curriculum|\bD[1-4]\b/,
      id,
    );
  }
});

test("delivery questions do not copy curriculum scope text", () => {
  const roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));
  const objectives: { id: string; scope: string }[] =
    roadmap.tracks.PE.objectives;
  const scopes = objectives.filter((o) => expectedIds.includes(o.id));
  assert.equal(scopes.length, 54);
  for (const { id, scope } of scopes) {
    const q = deliveryQuestions[id];
    assert.ok(!q.prompt.includes(scope), id);
    for (const item of q.rubric) assert.ok(!item.includes(scope), id);
    // No long verbatim run of the scope wording either.
    const scopeWords = scope.split(/\s+/);
    for (let i = 0; i + 8 <= scopeWords.length; i++) {
      const run = scopeWords.slice(i, i + 8).join(" ");
      assert.ok(!q.prompt.includes(run), `${id}: copied "${run}"`);
    }
  }
});

test("code review, tracing and fix questions include the actual code", () => {
  const codeIds = [
    "PE:T11.2",
    "PE:T11.3",
    "PE:T12.2",
    "PE:T13.4",
    "PE:T14.4",
    "PE:T15.1",
    "PE:T15.3",
    "PE:X03.3",
    "PE:X08.1",
  ];
  for (const id of codeIds)
    assert.match(
      deliveryQuestions[id].prompt,
      /```(?:ts|tsx|js)?\n[^]+\n```/,
      id,
    );
  assert.match(
    deliveryQuestions["PE:T11.3"].prompt,
    /SELECT \* FROM invoices WHERE id = \$1/,
  );
  assert.match(
    deliveryQuestions["PE:T14.4"].prompt,
    /line\.qty \? line\.qty \* line\.unitCents : line\.unitCents/,
  );
  assert.match(
    deliveryQuestions["PE:X08.1"].prompt,
    /Promise\.resolve\(\)\.then/,
  );
  assert.match(
    deliveryQuestions["PE:X08.1"].prompt,
    /const inc = counter\.inc;/,
  );
});

test("debugging and triage questions include concrete evidence", () => {
  const evidence: [string, RegExp][] = [
    ["PE:T12.2", /evt_7 invoice\.paid, created 10:00 \(redelivery\)/],
    ["PE:T14.2", /request to \/avatars\/photo and a 404/],
    ["PE:T14.3", /timeout is 1\.2 s/],
    ["PE:T17.2", /crypto\.randomUUID is not a function/],
    ["PE:T17.4", /Turning off checkout_v2 takes 30 seconds/],
    ["PE:X03.3", /get_shipment\(order_id="5512"\)/],
  ];
  for (const [id, fact] of evidence)
    assert.match(deliveryQuestions[id].prompt, fact, id);
  // Evidence is described, not pre-labelled with its answer.
  for (const id of expectedIds.filter((x) => /^PE:T1[457]\./.test(x)))
    assert.doesNotMatch(
      deliveryQuestions[id].prompt,
      /root cause is|security (?:bug|issue|hole)|race condition|caching bug/i,
      id,
    );
});

test("each objective has its own artifact rather than a shared generic case", () => {
  const prompts = Object.values(deliveryQuestions).map((q) => q.prompt);
  assert.equal(new Set(prompts).size, prompts.length);
  for (const [id, q] of Object.entries(deliveryQuestions))
    assert.doesNotMatch(q.prompt, /share_links table|proposes: "Email/, id);
});

test("returned rubric arrays are independent per entry", () => {
  const rubrics = Object.values(deliveryQuestions).map((q) => q.rubric);
  assert.equal(new Set(rubrics).size, rubrics.length);
});
