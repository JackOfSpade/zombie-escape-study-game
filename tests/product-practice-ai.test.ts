import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { aiPracticeQuestions } from "../src/product-practice-ai";

const ids = ["PE:T20.1", "PE:T20.2", "PE:T20.3", "PE:T20.4", "PE:T20.5"];
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

test("exactly five distinct T20 questions with bounded prompts", () => {
  assert.deepEqual(Object.keys(aiPracticeQuestions).sort(), ids);
  const titles = new Set(ids.map((id) => aiPracticeQuestions[id].title));
  const prompts = new Set(ids.map((id) => aiPracticeQuestions[id].prompt));
  assert.equal(titles.size, 5);
  assert.equal(prompts.size, 5);
  for (const id of ids) {
    const q = aiPracticeQuestions[id];
    const n = words(q.prompt);
    assert.ok(n >= 60 && n <= 230, `${id} prompt has ${n} words`);
    assert.ok(q.rubric.length >= 2 && q.rubric.length <= 4, id);
    assert.doesNotMatch(q.prompt, /checklist|project brief|curriculum/i);
  }
});

test("prompts do not copy raw curriculum scopes", () => {
  const r = JSON.parse(readFileSync("public/curriculum.json", "utf8"));
  const scopes: string[] = r.tracks.PE.objectives
    .filter((o: { id: string }) => ids.includes(o.id))
    .map((o: { scope: string }) => o.scope);
  assert.equal(scopes.length, 5);
  for (const id of ids) {
    const text = aiPracticeQuestions[id].prompt;
    for (const scope of scopes) {
      assert.ok(!text.includes(scope), `${id} contains a raw scope`);
      assert.ok(!text.includes(scope.slice(0, 40)), `${id} copies a scope`);
    }
  }
});

test("T20.2 supplies actual code, helper semantics and requirements without the answer", () => {
  const p = aiPracticeQuestions["PE:T20.2"].prompt;
  assert.match(p, /```ts\n[\s\S]*export async function revokeLink\(/);
  assert.match(
    p,
    /if \(!isMember\(userId, project\)\) return \{ status: 403 \};/,
  );
  assert.match(
    p,
    /export async function authorizeProjectRead\(token: string\) \{\n\s+return \(await findLinkByToken\(token\)\) !== null;/,
  );
  assert.match(
    p,
    /isMember\(userId, project\) is true for the owner and every collaborator/,
  );
  assert.match(p, /getLink\(id\) returns \{id, projectId, token, revokedAt\}/);
  assert.match(p, /only the project owner may revoke/);
  assert.match(p, /revoked link must stop authorizing project reads/);
  assert.match(p, /only after the server confirms/);
  assert.match(p, /Tests pass\./);
  assert.match(p, /1 passed/);
  // No leakage of the flaws in the visible ask.
  assert.doesNotMatch(p, /ownerId ===|ignores revokedAt|any collaborator can/i);
  const rubric = aiPracticeQuestions["PE:T20.2"].rubric.join(" ");
  assert.match(rubric, /isMember lets any collaborator revoke/);
  assert.match(rubric, /authorizeProjectRead ignores revokedAt/);
  assert.match(rubric, /claim is unsupported/);
});

test("T20.3 lists distinct artifacts, requires redaction and contains no secret values", () => {
  const q = aiPracticeQuestions["PE:T20.3"];
  const labels = q.prompt.match(/^[A-F]\. /gm) ?? [];
  assert.deepEqual(labels, ["A. ", "B. ", "C. ", "D. ", "E. ", "F. "]);
  const lines = q.prompt.split("\n").filter((l) => /^[A-F]\. /.test(l));
  assert.equal(new Set(lines).size, 6);
  assert.doesNotMatch(
    q.prompt,
    /=\S|postgres:\/\/|sk_(?:live|test)|password\s*[:=]/i,
  );
  assert.match(q.prompt, /SHARE_TOKEN_SECRET/);
  const rubric = q.rubric.join(" ");
  assert.match(rubric, /Does not paste secret values/);
  assert.match(rubric, /placeholders/);
  assert.match(rubric, /customer names and emails/);
});

test("T20.4 supplies actual code and test output to check claims against", () => {
  const q = aiPracticeQuestions["PE:T20.4"];
  assert.match(q.prompt, /if \(link\.revokedAt\) return \{ status: 410 \};/);
  assert.match(
    q.prompt,
    /✓ revokeLink sets revokedAt \(12 ms\)\n1 passed, 0 failed/,
  );
  assert.match(q.prompt, /Cached project pages are invalidated/);
  assert.doesNotMatch(q.prompt, /cache\.|invalidate\(/);
  assert.match(q.rubric.join(" "), /claim 3 as unsupported/);
});

test("T20.5 frames a team design without claiming the learner wrote past code", () => {
  const q = aiPracticeQuestions["PE:T20.5"];
  assert.match(q.prompt, /Your team has settled on/);
  assert.match(q.prompt, /microservice with its own message queue/);
  assert.doesNotMatch(q.prompt, /code you wrote|your past/i);
  assert.match(q.rubric.join(" "), /hiding links in the UI does not stop/);
});

test("T20.1 gives repository evidence to compare against the AI reply", () => {
  const q = aiPracticeQuestions["PE:T20.1"];
  assert.match(q.prompt, /src\/middleware\/shareAuth\.ts/);
  assert.match(q.prompt, /there is no src\/middleware directory/);
  assert.match(
    q.prompt,
    /share_links\(id, project_id, token, created_by, created_at\)/,
  );
  assert.match(q.rubric.join(" "), /hypothesis/);
});
