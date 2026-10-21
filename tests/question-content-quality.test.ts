import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { deliveryQuestions } from "../src/product-practice-delivery";
import { foundationQuestions } from "../src/product-practice-foundations";

const num = (s: string) => Number(s.replace(/,/g, ""));

test("T12.4 import counts add up to the stated file size", () => {
  const { prompt } = deliveryQuestions["PE:T12.4"];
  const total = num(prompt.match(/file of exactly ([\d,]+) rows/)![1]);
  const inserted = num(prompt.match(/- ([\d,]+) rows valid and inserted/)![1]);
  const rejected = num(prompt.match(/- ([\d,]+) rows rejected/)![1]);
  const dupes = num(prompt.match(/- ([\d,]+) rows were duplicates/)![1]);
  const range = prompt.match(/rows ([\d,]+)-([\d,]+) \(([\d,]+) rows\)/)!;
  const lastDone = num(prompt.match(/after row ([\d,]+), the last row/)![1]);
  const unprocessed = num(range[3]);
  assert.equal(num(range[2]) - num(range[1]) + 1, unprocessed);
  assert.equal(num(range[1]), lastDone + 1);
  assert.equal(num(range[2]), total);
  assert.equal(inserted + rejected + dupes, lastDone);
  assert.equal(inserted + rejected + dupes + unprocessed, total);
});

test("T12.2 trace is fully determined by the supplied start state", () => {
  const { prompt, rubric } = deliveryQuestions["PE:T12.2"];
  let status = prompt.match(/stored status is "(\w+)"/)![1];
  let credits = Number(prompt.match(/stored credits are (\d+)/)![1]);
  const perInvoice = Number(
    prompt.match(/increment\(e\.data\.customer, (\d+)\)/)![1],
  );
  const log = [
    ...prompt.matchAll(/^\d\. evt_\d+ ([\w.]+)(?: status=(\w+))?/gm),
  ];
  assert.equal(log.length, 4);
  for (const [, type, next] of log) {
    if (type === "subscription.updated") status = next;
    if (type === "invoice.paid") credits += perInvoice;
  }
  assert.equal(status, "past_due");
  assert.equal(credits, 200);
  assert.match(rubric[0], /past_due/);
  assert.match(rubric[0], /200 credits/);
});

test("T14.2 evidence matches native browser URL semantics", () => {
  const { prompt, rubric } = deliveryQuestions["PE:T14.2"];
  const file = prompt.match(/user 102, avatar file "([^"]+)"/)![1];
  const observed = prompt.match(/request to (\/avatars\/\S+) and a 404/)![1];
  const url = new URL("/avatars/" + file, "https://app.example");
  // The fragment after '#' is never sent, so the request path is truncated.
  assert.equal(url.pathname, observed);
  assert.equal(url.hash, "#2.png");
  // Spaces and non-ASCII are percent-encoded, not truncated: they cannot
  // explain the observed request, so they are not presented as its cause.
  assert.equal(
    new URL("/avatars/photo 2.png", "https://app.example").pathname,
    "/avatars/photo%202.png",
  );
  assert.equal(
    new URL("/avatars/Zoë.jpg", "https://app.example").pathname,
    "/avatars/Zo%C3%AB.jpg",
  );
  assert.doesNotMatch(prompt, /"photo 2\.png"/);
  assert.match(rubric[1], /'#'/);
  assert.match(rubric[2], /unconfirmed/);
  assert.doesNotMatch(rubric.join(" "), /confirmed space case/);
});

test("T08.3 CSS facts produce the reported screenshots", () => {
  const { prompt, rubric } = foundationQuestions["PE:T08.3"];
  const [, basis] = prompt.match(/\.plan \{ flex: 0 0 (\d+)px;/)!;
  const margin = Number(prompt.match(/margin-right: (\d+)px/)![1]);
  const breakpoint = Number(prompt.match(/@media \(max-width: (\d+)px\)/)![1]);
  const row = 3 * (Number(basis) + margin);
  assert.ok(row <= 1280, "fits at 1280");
  assert.ok(row > 800, "overflows at 800");
  assert.ok(390 > breakpoint, "390 px is outside the narrow query");
  assert.ok(320 <= breakpoint, "320 px is inside the narrow query");
  // Stacking needs an explicit column direction inside the query.
  const media = prompt.slice(prompt.indexOf("@media"));
  assert.match(media.slice(0, media.indexOf("\n}")), /flex-direction: column/);
  assert.match(prompt, /white-space: nowrap/);
  assert.match(rubric[0], /390 px/);
  assert.match(rubric[0], /nowrap/);
});

test("visible asks cover what the rubric grades", () => {
  const t023 = foundationQuestions["PE:T02.3"];
  assert.match(t023.prompt, /whether and how it affects the completion rate/);
  assert.match(t023.prompt, /does not bias the rate/);
  assert.match(t023.rubric[1], /privacy problem need not bias/);

  const t085 = foundationQuestions["PE:T08.5"];
  assert.match(
    t085.prompt,
    /propose a concrete repair for each of those three/,
  );
  assert.match(t085.rubric[2], /fix for each prioritized defect/);

  const t181 = deliveryQuestions["PE:T18.1"];
  const list = t181.prompt.match(/checklist: ([^.]+)\./)![1].split(", ");
  assert.ok(list.length >= 6);
  assert.ok(list.includes("loading more (pagination)"));
  assert.match(t181.prompt, /candidate state from the checklist/);
  assert.match(t181.rubric[2], /'loading more' pagination/);
});

test("judgement facts are supplied rather than assumed", () => {
  const t152 = deliveryQuestions["PE:T15.2"];
  assert.match(
    t152.prompt,
    /fictional store.*tax is computed on the discounted subtotal/,
  );
  assert.match(
    t152.prompt,
    /Business rule for this fictional store: tax is computed on the discounted subtotal\./,
  );
  assert.doesNotMatch(t152.prompt, /legal claim/i);

  const t144 = deliveryQuestions["PE:T14.4"];
  assert.doesNotMatch(t144.prompt, /Write the minimal fix/);
  assert.match(
    t144.prompt,
    /Describe in words the minimal fix \(or optionally show the minimal code change\); no implementation is required\./,
  );
  assert.match(t144.prompt, /give 1300; expected 1000/);
  assert.doesNotMatch(t144.rubric[0], /^Fix\b/);
  assert.match(t144.rubric[0], /quantity 0 contributes zero/);

  const t172 = deliveryQuestions["PE:T17.2"].prompt;
  const supported = t172.match(
    /supported in Safari (\d+\.\d+); not supported in Safari (\d+\.\d+)/,
  )!;
  const failing = [
    ...t172.matchAll(/POST \/login 500 ua="Safari\/([\d.]+)"/g),
  ].map((m) => m[1]);
  // Exactly one failing line conflicts with the supplied capability facts.
  const conflicts = failing.filter((v) => v === supported[1]);
  assert.deepEqual(conflicts, ["17.4"]);
  assert.ok(failing.includes(supported[2]));
  assert.match(t172, /reported evidence/);
  assert.match(deliveryQuestions["PE:T17.2"].rubric[2], /capability test/);
});

test("static code-change asks allow a description instead of code", () => {
  const ids = [
    "PE:T05.2",
    "PE:T05.3",
    "PE:T05.4",
    "PE:T05.5",
    "PE:T06.4",
    "PE:T08.3",
    "PE:T08.4",
  ];
  for (const id of ids) {
    const { prompt, rubric } = foundationQuestions[id];
    assert.match(prompt, /describe in words \(or (?:show|sketch)/, id);
    assert.doesNotMatch(
      prompt,
      /(?:^|[.!?]\s+)(?:Then )?(?:rewrite|implement|fix|make) /im,
      id,
    );
    for (const item of rubric)
      assert.doesNotMatch(item, /^(?:Rewrites|Fixes|Makes|Implements)\b/, id);
  }
  assert.match(
    foundationQuestions["PE:T05.2"].prompt,
    /neither mutates its inputs/,
  );
});

test("modules no longer describe themselves as unintegrated", () => {
  for (const path of [
    "src/product-practice-foundations.ts",
    "src/product-practice-delivery.ts",
  ]) {
    const head = readFileSync(path, "utf8").slice(0, 800);
    assert.doesNotMatch(head, /not (?:yet )?wired|later integration/i, path);
  }
});
