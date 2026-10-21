import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { foundationQuestions } from "../src/product-practice-foundations";

type Objective = { id: string; scope: string };
const objectives: Objective[] = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
).tracks.PE.objectives;

const families = [
  "T01",
  "T02",
  "T03",
  "T04",
  "T05",
  "T06",
  "T08",
  "T09",
  "T10",
];
const expectedIds = families.flatMap((f) =>
  [1, 2, 3, 4, 5].map((n) => `PE:${f}.${n}`),
);

const words = (text: string) => text.split(/\s+/).filter(Boolean);
const normalize = (text: string) =>
  words(text.toLowerCase().replace(/[^a-z0-9 ]+/g, " "));

/** Contiguous n-word runs from text, used to detect copied scope wording. */
function shingles(text: string, n: number): Set<string> {
  const w = normalize(text);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" "));
  return out;
}

test("covers exactly the 45 requested foundation objectives", () => {
  const keys = Object.keys(foundationQuestions).sort();
  assert.equal(keys.length, 45);
  assert.deepEqual(keys, [...expectedIds].sort());
  const known = new Set(objectives.map((o) => o.id));
  for (const id of expectedIds) assert.ok(known.has(id), id);
  // T07 already has dedicated state questions and is deliberately excluded.
  assert.ok(!keys.some((k) => k.startsWith("PE:T07.")));
});

test("each question is a bounded diagnostic with a matching rubric", () => {
  const titles = new Set<string>();
  const openings = new Set<string>();
  for (const id of expectedIds) {
    const q = foundationQuestions[id];
    const count = words(q.prompt).length;
    assert.ok(count >= 60 && count <= 220, `${id}: ${count} words`);
    assert.ok(q.title.includes(" / "), id);
    assert.ok(q.rubric.length >= 2 && q.rubric.length <= 3, id);
    for (const item of q.rubric) assert.ok(words(item).length >= 5, id);
    assert.ok(!titles.has(q.title), `duplicate title ${id}`);
    titles.add(q.title);
    const opening = q.prompt.slice(0, 80);
    assert.ok(!openings.has(opening), `duplicate opening ${id}`);
    openings.add(opening);
  }
});

test("no prompt or rubric copies curriculum scope wording", () => {
  const scopes = objectives.filter((o) => /^PE:/.test(o.id));
  for (const id of expectedIds) {
    const q = foundationQuestions[id];
    const own = scopes.find((o) => o.id === id)!;
    for (const o of scopes) {
      assert.ok(!q.prompt.includes(o.scope), `${id} contains ${o.id} scope`);
      for (const item of q.rubric) assert.ok(!item.includes(o.scope), id);
    }
    // No long verbatim run of the objective's own scope appears in its prompt.
    const promptRuns = shingles(q.prompt, 8);
    for (const run of shingles(own.scope, 8))
      assert.ok(!promptRuns.has(run), `${id} copies "${run}"`);
  }
});

test("prompts carry no generic scaffolding or shared product story", () => {
  for (const id of expectedIds) {
    const { prompt, rubric } = foundationQuestions[id];
    assert.doesNotMatch(
      prompt,
      /Your task:|Name one assumption|real project|share_links|proposes: "Email|If you need an assumption/i,
      id,
    );
    assert.doesNotMatch(
      rubric.join(" "),
      /personal history|assumption beyond/i,
      id,
    );
  }
});

test("tracing and review questions supply concrete artifacts and semantics", () => {
  const artifacts: Record<string, RegExp[]> = {
    "PE:T04.2": [
      /addEventListener\("click"/,
      /preventDefault\(\)/,
      /stopPropagation\(\)/,
      /type "submit" by default/,
    ],
    "PE:T04.3": [
      /await fetch\(/,
      /rejects only on network failure or abort/,
      /404 with body/,
    ],
    "PE:T04.4": [/~900 ms synchronous/, /only paints between tasks/],
    "PE:T05.4": [/chat\.connect\(roomId\)/, /returned function runs before/],
    "PE:T05.5": [/useState\(user\.name\)/, /changing its key/],
    "PE:T06.4": [/Rome response arrives first/, /useEffect\(/],
    "PE:T02.5": [/95% CI -0\.13 to \+0\.29/, /clicked the widget/],
    "PE:T09.1": [/GET \/teams starting after \/me/, /140 ms task/],
    "PE:T08.2": [/outline: none/, /removed from the DOM/],
    "PE:T10.5": [/"assignee": "u42"/, /cannot be force-updated/],
  };
  for (const [id, facts] of Object.entries(artifacts)) {
    const { prompt } = foundationQuestions[id];
    for (const fact of facts) assert.match(prompt, fact, id);
    // Each artifact belongs to its own question only.
    for (const other of expectedIds)
      if (other !== id)
        assert.doesNotMatch(foundationQuestions[other].prompt, facts[0], other);
  }
  // Code-tracing topics show code; planning topics do not.
  for (const id of ["PE:T04.2", "PE:T04.3", "PE:T05.2", "PE:T06.4", "PE:T09.4"])
    assert.match(foundationQuestions[id].prompt, /\)\s*=>|function /, id);
  for (const id of ["PE:T01.1", "PE:T03.5", "PE:T02.1"])
    assert.doesNotMatch(foundationQuestions[id].prompt, /=>|useState|</, id);
});

test("rubrics describe asks without stating the expected trace answer", () => {
  const leaks: Record<string, RegExp> = {
    "PE:T04.2": /logs save only|then card|still submits/i,
    "PE:T04.3": /parse failure|showProfile being called/i,
    "PE:T05.4": /leaked connections/i,
    "PE:T05.5": /typed name persists/i,
  };
  for (const [id, leak] of Object.entries(leaks))
    assert.doesNotMatch(foundationQuestions[id].rubric.join(" "), leak, id);
});
