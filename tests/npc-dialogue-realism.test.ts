import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  buildNpcDialogueRealismTasks,
  evaluateNpcDialogueRealism,
  loadNpcDialogueCorpus,
  readNpcDialogueRealismResults,
  type RealismCorpus,
  type RealismTask,
  type SuppliedRealismResult,
} from "../scripts/evaluate-npc-dialogue";
import {
  buildNpcDialogueReview,
  parseNpcDialogueDraft,
  parseNpcDialogueReview,
} from "../scripts/lib/npc-dialogue-policy.mjs";

function referenceExample(corpus: RealismCorpus, task: RealismTask) {
  return corpus.cases
    .find((entry) => entry.id === task.caseId)!
    .examples.find((example) => example.text === task.packet.candidate.text)!;
}
async function controlledResults(corpus: RealismCorpus) {
  const { tasks } = await buildNpcDialogueRealismTasks(corpus);
  return tasks.map((task): SuppliedRealismResult => {
    const example = referenceExample(corpus, task);
    return {
      version: 1,
      caseId: task.caseId,
      exampleId: task.exampleId,
      response: {
        requestId: task.packet.requestId,
        actorId: task.packet.actorId,
        candidateFingerprint: task.packet.candidateFingerprint,
        verdict: example.realistic ? "accept" : "revise",
        issues: [...example.issues],
        note: example.realistic
          ? "A supported, timely human reaction to this captured moment."
          : "This candidate violates the independent case rubric.",
      },
      provenance: { kind: "scripted", name: "Controlled fixture critic" },
    };
  });
}

test("the offline corpus covers specific survivor dilemmas and valid silence rather than a line-selection bank", async () => {
  const corpus = await loadNpcDialogueCorpus(),
    { tasks, silenceExamples } = await buildNpcDialogueRealismTasks(corpus);
  assert.equal(corpus.cases.length, 18);
  assert.equal(tasks.length, 37);
  assert.equal(silenceExamples, 5);
  assert.deepEqual(
    new Set(corpus.cases.map((entry) => entry.id)),
    new Set([
      "quiet-shelter",
      "weather-word-control",
      "immediate-attack",
      "witnessed-loss",
      "injured-ally",
      "heard-breach",
      "study-under-pressure",
      "power-outage",
      "last-seen-memory",
      "holding-field",
      "repetition-and-silence",
      "untrusted-workspace",
      "conversation-water-invitation",
      "conversation-water-reply",
      "conversation-coherent-warning",
      "conversation-interrupted-danger",
      "conversation-unheard-knowledge",
      "conversation-natural-ending",
    ]),
  );
  for (const task of tasks) {
    assert.equal(task.packet.context.actorId, task.packet.candidate.actorId);
    assert.equal(
      parseNpcDialogueDraft(task.packet.context, task.packet.candidate)
        .decision,
      "speak",
    );
    assert.match(task.packet.candidateFingerprint, /^[a-f0-9]{64}$/);
    assert.match(task.exampleId, /^sample-[a-f0-9]{16}$/);
    assert.ok(task.rubric.length && task.unknowns.length);
  }
  for (const entry of corpus.cases)
    for (const example of entry.examples)
      assert.equal(
        JSON.stringify(tasks).includes(JSON.stringify(example.id)),
        false,
        "descriptive reference IDs must not leak a verdict",
      );
  assert.equal(
    JSON.stringify(tasks).includes('"realistic":'),
    false,
    "the exported editor tasks withhold their curated agent-authored reference labels",
  );
  assert.equal(
    JSON.stringify(tasks).includes('"examples":'),
    false,
    "the game context does not receive an answer bank",
  );
});

test("valid references alone cannot certify an out-of-place weather question", async () => {
  const corpus = await loadNpcDialogueCorpus(),
    { tasks } = await buildNpcDialogueRealismTasks(corpus),
    weather = tasks.find(
      (task) =>
        task.caseId === "quiet-shelter" &&
        task.packet.candidate.text === "How's the weather today?",
    )!;
  assert.equal(weather.packet.candidate.text, "How's the weather today?");
  assert.equal(
    parseNpcDialogueDraft(weather.packet.context, weather.packet.candidate)
      .decision,
    "speak",
    "syntax and genuine anchor IDs prove no semantic relevance",
  );
  const supplied = await controlledResults(corpus),
    row = supplied.find(
      (item) =>
        item.caseId === weather.caseId && item.exampleId === weather.exampleId,
    )!;
  row.response = {
    ...(row.response as Record<string, unknown>),
    verdict: "accept",
    issues: [],
  };
  assert.equal(
    parseNpcDialogueReview(weather.packet, row.response).verdict,
    "accept",
    "a critic's correlated JSON is still only a model judgment",
  );
  const report = await evaluateNpcDialogueRealism(corpus, supplied);
  assert.equal(report.status, "incomplete-or-failed");
  assert.equal(report.summary.agreement, tasks.length - 1);
  assert.equal(
    report.results.find(
      (item) =>
        item.caseId === weather.caseId && item.exampleId === weather.exampleId,
    )?.status,
    "disagrees",
  );
});

test("conversation critic packets carry the heard turn, exact reply target and valid silence without a scripted answer", async () => {
  const corpus = await loadNpcDialogueCorpus(),
    { tasks, silenceExamples } = await buildNpcDialogueRealismTasks(corpus),
    water = tasks.find(
      (task) =>
        task.caseId === "conversation-water-reply" &&
        task.packet.candidate.text === "Nothing on me. Sorry.",
    )!;
  const context = water.packet.context as typeof water.packet.context & {
    recentLines: { id: string; actorId: string; text: string }[];
  };
  assert.equal(context.conversation?.replyTo, "water-call");
  assert.equal(context.recentLines[0].text, "Anyone got some water?");
  assert.equal(
    context.conversation?.sourceActorId,
    context.recentLines[0].actorId,
  );
  assert.deepEqual(water.packet.candidate.conversation, {
    intent: "close",
    replyTo: "water-call",
  });
  assert.ok(water.packet.candidate.evidence.includes("speech:water-call"));
  assert.equal(silenceExamples, 5);
  const noSource = structuredClone(context);
  noSource.recentLines = [];
  assert.throws(() => parseNpcDialogueDraft(noSource, water.packet.candidate));
  assert.throws(() =>
    parseNpcDialogueDraft(context, {
      ...water.packet.candidate,
      conversation: { intent: "close", replyTo: "an-unheard-call" },
    }),
  );
  assert.throws(() =>
    parseNpcDialogueDraft(context, {
      ...water.packet.candidate,
      evidence: ["self.inventory"],
    }),
  );
  const changed = await buildNpcDialogueReview(
    context,
    {
      ...water.packet.candidate,
      conversation: { intent: "continue", replyTo: "water-call" },
    },
    0,
  );
  assert.notEqual(
    changed.candidateFingerprint,
    water.packet.candidateFingerprint,
    "approving a closing reply cannot approve metadata that reopens the exchange",
  );
});

test("critic context preserves the explicit respondent when the source or another survivor is named first", async () => {
  const corpus = await loadNpcDialogueCorpus(),
    { tasks } = await buildNpcDialogueRealismTasks(corpus);
  for (const task of tasks) {
    const entry = corpus.cases.find(
      (candidate) => candidate.id === task.caseId,
    )!;
    assert.ok(
      entry.speaker,
      "authored cases identify their speaking actor explicitly",
    );
    const context = task.packet.context as typeof task.packet.context & {
      self: {
        id: string;
        name: string;
        role: string;
        personality?: { risk: number; social: number; confidence: number };
      };
    };
    assert.equal(context.actorId, entry.speaker.id);
    assert.deepEqual(context.self, entry.speaker);
    if (entry.conversation) {
      assert.equal(context.self.name, "Owen");
      assert.equal(context.actorId, "npc-owen");
      assert.notEqual(context.actorId, entry.conversation.sourceActorId);
    }
  }
  const changed = structuredClone(corpus),
    entry = changed.cases.find(
      (candidate) => candidate.id === "conversation-water-reply",
    )!;
  entry.speaker!.personality!.social = 0.9;
  const altered = await buildNpcDialogueRealismTasks(changed),
    original = tasks.find((task) => task.caseId === entry.id)!,
    replacement = altered.tasks.find((task) => task.caseId === entry.id)!;
  assert.notEqual(
    original.exampleId,
    replacement.exampleId,
    "speaker identity and temperament changes invalidate the old context receipt",
  );
});

test("a supported reply target does not certify fabricated water, unrelated monologues or a question repeated after an answer", async () => {
  const corpus = await loadNpcDialogueCorpus(),
    { tasks } = await buildNpcDialogueRealismTasks(corpus),
    controlled = await controlledResults(corpus);
  for (const wording of [
    "Here, take my bottle. I just filled it.",
    "I should really reorganize my desk drawers someday.",
    "Before I answer, how much water would you prefer?",
    "Like Theo just said behind that door, the roof is already clear.",
    "So, Nia, anyone got some water?",
  ]) {
    const task = tasks.find(
      (entry) => entry.packet.candidate.text === wording,
    )!;
    assert.equal(
      parseNpcDialogueDraft(task.packet.context, task.packet.candidate)
        .decision,
      "speak",
      "structural correlation is not semantic approval",
    );
    const changed = structuredClone(controlled),
      row = changed.find((entry) => entry.exampleId === task.exampleId)!;
    row.response = {
      ...(row.response as Record<string, unknown>),
      verdict: "accept",
      issues: [],
    };
    const report = await evaluateNpcDialogueRealism(corpus, changed);
    assert.equal(report.status, "incomplete-or-failed");
    assert.equal(report.summary.agreement, tasks.length - 1);
  }
});

test("contextually apt weather language passes the independent labels without a keyword ban", async () => {
  const corpus = await loadNpcDialogueCorpus(),
    humourId = (await buildNpcDialogueRealismTasks(corpus)).tasks.find(
      (task) =>
        task.packet.candidate.text === "I'd take bad weather over this.",
    )!.exampleId,
    report = await evaluateNpcDialogueRealism(
      corpus,
      await controlledResults(corpus),
    ),
    appropriate = report.results.find(
      (item) =>
        item.caseId === "weather-word-control" && item.exampleId === humourId,
    );
  assert.equal(appropriate?.verdict, "accept");
  assert.equal(appropriate?.status, "agrees");
  assert.equal(report.status, "passed");
  assert.equal(report.summary.criticAgreement, 1);
  assert.equal(report.summary.scriptedSamples, 37);
  assert.equal(report.referenceLabels, "Agent-authored; not human-rated.");
  assert.equal(report.liveModelEvaluated, false);
  assert.equal(
    report.semanticQualityEstablished,
    false,
    "perfect scripted fixture agreement does not establish live generation quality",
  );
  assert.equal(report.provenanceVerified, false);
});

test("the challenge report rejects mismatched, duplicate, unknown and missing reviews", async () => {
  const corpus = await loadNpcDialogueCorpus(),
    original = await controlledResults(corpus);
  const wrong = structuredClone(original);
  wrong[0].response = {
    ...(wrong[0].response as Record<string, unknown>),
    candidateFingerprint: "0".repeat(64),
  };
  assert.equal(
    (await evaluateNpcDialogueRealism(corpus, wrong)).summary.invalid,
    1,
  );
  const duplicate = await evaluateNpcDialogueRealism(corpus, [
    ...original,
    original[0],
  ]);
  assert.equal(duplicate.summary.invalid, 1);
  assert.equal(duplicate.status, "incomplete-or-failed");
  const missing = await evaluateNpcDialogueRealism(corpus, []);
  assert.equal(missing.summary.missing, 37);
  assert.equal(missing.status, "incomplete-or-failed");
  const unknown = structuredClone(original[0]);
  unknown.caseId = "unrecognised-case";
  assert.equal(
    (await evaluateNpcDialogueRealism(corpus, [unknown])).summary.invalid,
    1,
  );
  const noProvenance = { ...original[0], provenance: {} };
  assert.equal(
    (await evaluateNpcDialogueRealism(corpus, [noProvenance])).summary.invalid,
    1,
  );
});

test("rejecting the right candidate for an unrelated reason is not critic agreement", async () => {
  const corpus = await loadNpcDialogueCorpus(),
    results = await controlledResults(corpus),
    weatherId = (await buildNpcDialogueRealismTasks(corpus)).tasks.find(
      (task) => task.packet.candidate.text === "How's the weather today?",
    )!.exampleId,
    row = results.find(
      (item) => item.caseId === "quiet-shelter" && item.exampleId === weatherId,
    )!;
  row.response = {
    ...(row.response as Record<string, unknown>),
    issues: ["study-answer"],
  };
  const report = await evaluateNpcDialogueRealism(corpus, results);
  assert.equal(report.summary.agreement, 36);
  assert.equal(report.status, "incomplete-or-failed");
});

test("changing the captured challenge context invalidates an old critic receipt", async () => {
  const corpus = await loadNpcDialogueCorpus(),
    results = await controlledResults(corpus),
    changed = structuredClone(corpus);
  changed.cases[0].facts[0].text =
    "The surrounding city has been evacuated and the outbreak is over.";
  const report = await evaluateNpcDialogueRealism(changed, results);
  assert.equal(report.status, "incomplete-or-failed");
  assert.equal(
    report.summary.invalid,
    2,
    "both spoken candidates in that changed moment need a fresh review",
  );
});

test("the CLI exports unlabelled packets and cannot score an empty supplied run as success", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "npc-realism-harness-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const entry = fileURLToPath(
      new URL("../scripts/evaluate-npc-dialogue.ts", import.meta.url),
    ),
    packets = join(directory, "tasks.jsonl"),
    exportReport = join(directory, "export-report.json"),
    invoke = (args: string[]) =>
      spawnSync(process.execPath, ["--import", "tsx", entry, ...args], {
        encoding: "utf8",
        timeout: 10000,
        maxBuffer: 1_000_000,
      });
  const exported = invoke(["--export", packets, "--json", exportReport]);
  assert.equal(exported.status, 0, exported.stderr);
  const lines = (await readFile(packets, "utf8")).trim().split("\n");
  assert.equal(lines.length, 37);
  assert.ok(
    lines.every((line) => !Object.hasOwn(JSON.parse(line), "realistic")),
  );
  const metadata = JSON.parse(await readFile(exportReport, "utf8"));
  assert.equal(metadata.liveModelEvaluated, false);
  const empty = join(directory, "empty.jsonl"),
    reportPath = join(directory, "missing.json");
  await writeFile(empty, "");
  const missing = invoke(["--responses", empty, "--json", reportPath]);
  assert.equal(missing.status, 1, missing.stderr);
  assert.equal(
    JSON.parse(await readFile(reportPath, "utf8")).summary.missing,
    37,
  );
  const corpus = await loadNpcDialogueCorpus(),
    replies = join(directory, "scripted.jsonl");
  await writeFile(
    replies,
    (await controlledResults(corpus))
      .map((row) => JSON.stringify(row))
      .join("\n") + "\n",
  );
  const scored = invoke(["--responses", replies, "--json", reportPath]);
  assert.equal(scored.status, 0, scored.stderr);
  const result = JSON.parse(await readFile(reportPath, "utf8"));
  assert.equal(result.status, "passed");
  assert.equal(result.semanticQualityEstablished, false);
  assert.equal(result.summary.scriptedSamples, 37);
  const rejected = invoke(["--export", packets, "--responses", replies]);
  assert.equal(rejected.status, 1);
});

test("malformed corpus references and oversized result files fail before evaluation", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "npc-realism-limits-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const corpus = await loadNpcDialogueCorpus(),
    broken = structuredClone(corpus),
    path = join(directory, "broken.json");
  broken.cases[0].examples[0].refs = ["unknown-fact"];
  await writeFile(path, JSON.stringify(broken));
  await assert.rejects(loadNpcDialogueCorpus(path), /ungrounded/);
  const oversized = join(directory, "oversized.jsonl");
  await writeFile(oversized, " ".repeat(2_000_001));
  await assert.rejects(readNpcDialogueRealismResults(oversized), /bounded/);
});
