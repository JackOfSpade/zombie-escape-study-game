import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { checkBridge, ensureProblem } from "../src/ai";
import { eligible, initialStudy } from "../src/curriculum";
import { devProblem } from "../src/practice-problem";
import {
  encounterEstablished,
  encounterGaps,
  knowledgeEstablishedContext,
  knowledgeGapContext,
  knowledgeProbeContext,
  openGaps,
  parseProbeReply,
  PROBE_RECORDS_NOTE,
  probeRecordsForTrack,
  probeContract,
  probeFacets,
  probeState,
  probeSummary,
  recordProbeTurn,
  PROBE_STANCE,
  SUB_FACET_DEPTH,
  SUB_FACETS_PER_REPLY,
  TERMINAL_DIALOGUE_INSTRUCTION,
} from "../src/knowledge-probe";
import type { Roadmap } from "../src/model";
import { decode, encode, recover } from "../src/persistence";
import { createPlayableGame } from "../src/world";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));

const rubricProblem = {
  rubric: ["Correct predicted total", "Explain update/state and a boundary"],
};
const scopedProblem = {
  rubric: ["ignored when scope facets exist"],
  scopeDefinitions: [
    {
      id: "PY:T05.2/D1",
      objectiveId: "PY:T05.2",
      depth: 1,
      sourceScope: "synthetic",
      facets: [
        { id: "window-total", description: "Largest window total" },
        {
          id: "running-update",
          description: "Subtract outgoing, add incoming",
        },
        {
          id: "boundary",
          description: "Stop before the incoming index passes",
        },
        { id: "window-total", description: "duplicate id is dropped" },
      ],
    },
  ],
};

test("the probe contract assumes knowledge, asks the apex question first, and concedes declared gaps", () => {
  for (const text of [PROBE_STANCE, TERMINAL_DIALOGUE_INSTRUCTION]) {
    assert.match(text, /Assume the learner already has this knowledge/);
    assert.match(text, /Do not walk the rubric item by item/);
    assert.match(text, /mark Y and Z implied by X/);
    assert.match(text, /Read how the answer is given/);
    assert.match(text, /do not lecture and do not withhold the reward/);
    assert.match(text, /probe Y and Z next, one level down/);
    assert.match(text, /only the parts actually missing/);
    assert.match(text, /return to the apex and ask it again/);
    assert.match(text, /known parts never imply the apex/);
    assert.match(text, /since established clears the way to re-ask/);
  }
  assert.match(
    TERMINAL_DIALOGUE_INSTRUCTION,
    /no lower-level facet is left to probe/,
  );
  assert.match(TERMINAL_DIALOGUE_INSTRUCTION, /outcome:"gap"/);
  assert.match(TERMINAL_DIALOGUE_INSTRUCTION, /knowledge\.signal/);
  const contract = probeContract(rubricProblem);
  assert.equal(contract.stance, PROBE_STANCE);
  assert.deepEqual(contract.findingStatuses, [
    "demonstrated",
    "implied",
    "gap",
  ]);
  assert.deepEqual(contract.fluency, [
    "fluent",
    "partial",
    "guessing",
    "declared-gap",
  ]);
});

test("probe facets come from stable scope facets when present, else from the rubric with stable ids", () => {
  assert.deepEqual(probeFacets(rubricProblem), [
    {
      id: "rubric-1-correct-predicted-total",
      description: rubricProblem.rubric[0],
    },
    {
      id: "rubric-2-explain-update-state-and-a-boundary",
      description: rubricProblem.rubric[1],
    },
  ]);
  assert.deepEqual(
    probeFacets(scopedProblem).map((f) => f.id),
    ["window-total", "running-update", "boundary"],
  );
  assert.deepEqual(probeFacets({ rubric: [] }), []);
});

test("reply parsing keeps the key decision authoritative, drops unknown facet ids and rejects malformed structure", () => {
  const facets = probeFacets(scopedProblem);
  const parsed = parseProbeReply(
    {
      text: "Right: 5, and you explained the update, which means you know the shift.",
      complete: true,
      knowledge: {
        facets: [
          { id: "window-total", status: "demonstrated", note: "said 5" },
          {
            id: "running-update",
            status: "implied",
            impliedBy: "window-total",
          },
          { id: "boundary", status: "implied", impliedBy: "not-a-facet" },
          { id: "invented-facet", status: "gap" },
          { id: "window-total", status: "gap" },
          {
            id: "running-update",
            status: "implied",
            impliedBy: "running-update",
          },
        ],
        signal: {
          fluency: "fluent",
          note: "precise vocabulary, " + "x".repeat(600),
        },
      },
    },
    facets,
  );
  assert.equal(parsed.outcome, "solved");
  assert.deepEqual(parsed.findings, [
    { id: "window-total", status: "demonstrated", note: "said 5" },
    { id: "running-update", status: "implied", impliedBy: "window-total" },
    { id: "boundary", status: "implied" },
  ]);
  assert.equal(parsed.signal?.fluency, "fluent");
  assert.equal(parsed.signal?.note?.length, 400);
  // Without complete:true the outcome is always "continue", whatever was claimed.
  assert.equal(
    parseProbeReply(
      { text: "Go on", complete: false, outcome: "solved" },
      facets,
    ).outcome,
    "continue",
  );
  assert.equal(
    parseProbeReply({ text: "Done", complete: true }, facets).outcome,
    "solved",
  );
  assert.equal(
    parseProbeReply({ text: "Done", complete: true, outcome: "gap" }, facets)
      .outcome,
    "gap",
  );
  assert.deepEqual(parseProbeReply({ text: "Hi", complete: false }, facets), {
    complete: false,
    outcome: "continue",
    findings: [],
  });
  for (const bad of [
    { text: "x", complete: "true" },
    { text: "x", complete: true, outcome: "partial" },
    { text: "x", complete: true, knowledge: [] },
    { text: "x", complete: true, knowledge: { facets: {} } },
    {
      text: "x",
      complete: true,
      knowledge: { facets: [{ id: "window-total" }] },
    },
    {
      text: "x",
      complete: true,
      knowledge: { facets: [{ id: "window-total", status: "known" }] },
    },
    { text: "x", complete: true, knowledge: { signal: { fluency: "great" } } },
    {
      text: "x",
      complete: true,
      knowledge: {
        facets: Array.from({ length: 65 }, () => ({
          id: "window-total",
          status: "gap",
        })),
      },
    },
  ])
    assert.throws(() => parseProbeReply(bad as never, facets), /Invalid tutor/);
});

test("cumulative state re-judges per facet and conceding records only unestablished facets as gaps, once, carried into the next run", async () => {
  const g = createPlayableGame(4242, r);
  const e = g.encounters[g.floors[0].stations[0].encounter];
  await ensureProblem(g, e, r);
  e.problem!.scopeDefinitions = scopedProblem.scopeDefinitions as never;
  const facets = probeFacets(e.problem!);
  assert.equal(probeSummary(e), "");
  let created = recordProbeTurn(
    g,
    e,
    parseProbeReply(
      {
        text: "What is the largest total, and how does it change as the window moves?",
        complete: false,
        knowledge: {
          facets: [{ id: "window-total", status: "demonstrated" }],
          signal: { fluency: "partial" },
        },
      },
      facets,
    ),
    {
      requestId: "t1",
      questionSequence: 1,
      provider: "chatgpt-handoff",
      statement: "5?",
    },
  );
  assert.deepEqual(created, []);
  assert.equal(probeState(e).established, 1);
  // A correct answer records the facet in the carried study state at once.
  assert.deepEqual(
    g.study.knowledgeEstablished!.map((r) => [r.facet.id, r.status]),
    [["window-total", "demonstrated"]],
  );
  assert.equal(
    g.study.knowledgeEstablished![0].encounter,
    `${e.runId}/${e.id}`,
  );
  assert.equal(g.study.knowledgeEstablished![0].requestId, "t1");
  assert.equal(
    probeSummary(e),
    "1 of 3 facets established · last answer partial",
  );
  // A later turn can downgrade an earlier judgment of the same facet.
  recordProbeTurn(
    g,
    e,
    parseProbeReply(
      {
        text: "Hmm, you guessed 5; walk me through the shift.",
        complete: false,
        knowledge: {
          facets: [{ id: "window-total", status: "gap" }],
          signal: { fluency: "guessing" },
        },
      },
      facets,
    ),
    {
      requestId: "t2",
      questionSequence: 2,
      provider: "chatgpt-handoff",
      statement: "guess",
    },
  );
  assert.equal(probeState(e).established, 0);
  assert.equal(probeState(e).gaps, 1);
  // Re-judging the facet as a gap withdraws its established record.
  assert.equal(g.study.knowledgeEstablished, undefined);
  assert.deepEqual(
    g.study.knowledgeGaps,
    undefined,
    "gaps are recorded only when the key is conceded",
  );
  // The learner explains the update; the tutor infers the total from it and
  // the learner declares the boundary unknown: the key is conceded with one gap.
  created = recordProbeTurn(
    g,
    e,
    parseProbeReply(
      {
        text: "Your update explanation shows the total; boundary recorded as a gap.",
        complete: true,
        outcome: "gap",
        knowledge: {
          facets: [
            { id: "running-update", status: "demonstrated" },
            {
              id: "window-total",
              status: "implied",
              impliedBy: "running-update",
            },
            {
              id: "boundary",
              status: "gap",
              note: "learner said they do not know",
            },
          ],
          signal: { fluency: "declared-gap" },
        },
      },
      facets,
    ),
    {
      requestId: "t3",
      questionSequence: 3,
      provider: "chatgpt-handoff",
      statement:
        "subtract the outgoing and add the incoming; I don't know the boundary",
      at: "2026-10-18T12:00:00.000Z",
    },
  );
  assert.equal(created.length, 1);
  assert.equal(created[0].facet.id, "boundary");
  assert.equal(created[0].encounter, `${e.runId}/${e.id}`);
  assert.equal(created[0].track, e.problem!.contract.track);
  assert.deepEqual(created[0].objectiveIds, e.problem!.contract.objectiveIds);
  assert.match(created[0].statement, /I don't know the boundary/);
  assert.equal(created[0].at, "2026-10-18T12:00:00.000Z");
  const state = probeState(e);
  assert.equal(state.established, 2);
  assert.equal(state.gaps, 1);
  assert.equal(state.outcome, "gap");
  assert.equal(
    state.facets.find((f) => f.id === "window-total")?.impliedBy,
    "running-update",
  );
  assert.equal(
    probeSummary(e),
    "2 of 3 facets established · 1 recorded gap · last answer declared a gap",
  );
  assert.equal(encounterGaps(g, e).length, 1);
  // X answered records X and the Y it implied, with the implication kept.
  assert.deepEqual(
    encounterEstablished(g, e).map((r) => [r.facet.id, r.status, r.impliedBy]),
    [
      ["window-total", "implied", "running-update"],
      ["running-update", "demonstrated", undefined],
    ],
  );
  assert.ok(encounterEstablished(g, e).every((r) => r.requestId === "t3"));
  // Replaying the same request, or conceding again, never duplicates the record.
  assert.deepEqual(
    recordProbeTurn(
      g,
      e,
      parseProbeReply(
        { text: "again", complete: true, outcome: "gap" },
        facets,
      ),
      {
        requestId: "t3",
        questionSequence: 3,
        provider: "chatgpt-handoff",
        statement: "dup",
      },
    ),
    [],
  );
  assert.deepEqual(
    recordProbeTurn(
      g,
      e,
      parseProbeReply(
        { text: "again", complete: true, outcome: "gap" },
        facets,
      ),
      {
        requestId: "t4",
        questionSequence: 4,
        provider: "chatgpt-handoff",
        statement: "dup",
      },
    ),
    [],
  );
  assert.equal(g.study.knowledgeGaps!.length, 1);
  assert.equal(e.probe!.turns.length, 4);
  // After the key is awarded, a later concession naming a new facet is kept
  // as history but opens no new study target.
  e.state = "consumed";
  assert.deepEqual(
    recordProbeTurn(
      g,
      e,
      parseProbeReply(
        {
          text: "later",
          complete: true,
          outcome: "gap",
          knowledge: { facets: [{ id: "running-update", status: "gap" }] },
        },
        facets,
      ),
      {
        requestId: "t5",
        questionSequence: 5,
        provider: "chatgpt-handoff",
        statement: "later",
      },
    ),
    [],
  );
  assert.equal(g.study.knowledgeGaps!.length, 1);
  assert.equal(e.probe!.turns.length, 5);
  assert.equal(encounterEstablished(g, e).length, 2);
  e.state = "in-progress";
  const context = knowledgeGapContext(g, e.problem!.contract.track);
  assert.match(context, /Learner-declared knowledge gaps/);
  assert.match(context, /Stop before the incoming index passes/);
  assert.match(context, /I don't know the boundary/);
  assert.equal(knowledgeGapContext(g, "ZZ"), "");
  const known = knowledgeEstablishedContext(g, e.problem!.contract.track);
  assert.match(known, /already established at earlier terminals/);
  assert.match(known, /do not re-probe them/);
  assert.match(known, /Subtract outgoing, add incoming · demonstrated/);
  assert.match(
    known,
    /Largest window total · implied \(implied by running-update\)/,
  );
  assert.doesNotMatch(known, /Stop before the incoming index/);
  assert.equal(knowledgeEstablishedContext(g, "ZZ"), "");
  const both = knowledgeProbeContext(g, e.problem!.contract.track);
  assert.ok(both.startsWith(known));
  assert.ok(both.endsWith(context));
  assert.equal(knowledgeProbeContext(g, "ZZ"), "");
  // Gaps survive save/reload and ride the carried study state into a new run.
  const reloaded = recover(decode(encode(g)));
  assert.equal(reloaded.study.knowledgeGaps!.length, 1);
  assert.equal(reloaded.encounters[e.id].probe!.turns.length, 5);
  const next = createPlayableGame(99, r, reloaded.study);
  assert.equal(next.study.knowledgeGaps![0].facet.id, "boundary");
  assert.equal(next.study.knowledgeEstablished!.length, 2);
  assert.equal(next.encounters[e.id]?.probe, undefined);
});

test("conceding without naming facets records every facet not yet established", async () => {
  const g = createPlayableGame(77, r);
  const e = g.encounters[g.floors[0].stations[0].encounter];
  await ensureProblem(g, e, r);
  const facets = probeFacets(e.problem!);
  assert.ok(facets.length >= 2);
  recordProbeTurn(
    g,
    e,
    parseProbeReply(
      {
        text: "ok",
        complete: false,
        knowledge: { facets: [{ id: facets[0].id, status: "demonstrated" }] },
      },
      facets,
    ),
    {
      requestId: "a",
      questionSequence: 1,
      provider: "study-mode",
      statement: "first",
    },
  );
  const created = recordProbeTurn(
    g,
    e,
    parseProbeReply(
      { text: "Recorded; here is your key.", complete: true, outcome: "gap" },
      facets,
    ),
    {
      requestId: "b",
      questionSequence: 2,
      provider: "study-mode",
      statement: "no idea",
    },
  );
  assert.deepEqual(
    created.map((c) => c.facet.id),
    facets.slice(1).map((f) => f.id),
  );
  assert.ok(
    created.every(
      (c) => c.provider === "study-mode" && c.statement === "no idea",
    ),
  );
  // A plain solved completion records nothing.
  const g2 = createPlayableGame(78, r);
  const e2 = g2.encounters[g2.floors[0].stations[0].encounter];
  await ensureProblem(g2, e2, r);
  assert.deepEqual(
    recordProbeTurn(
      g2,
      e2,
      parseProbeReply(
        { text: "Solved", complete: true },
        probeFacets(e2.problem!),
      ),
      {
        requestId: "c",
        questionSequence: 1,
        provider: "study-mode",
        statement: "done",
      },
    ),
    [],
  );
  assert.equal(g2.study.knowledgeGaps, undefined);
  assert.equal(probeState(e2).outcome, "solved");
});

test("a recorded gap closes when the facet is later established at another terminal, by stable id or identical facet text, and the context says the blocked apex can be re-asked", async () => {
  const g = createPlayableGame(2024, r);
  const solo = Object.values(g.encounters).filter((x) => x.mode === "solo");
  const [e1, e2, e3] = solo;
  const facets = (ids: [string, string][]) => [
    {
      id: "scope",
      objectiveId: "PY:T05.2",
      depth: 1,
      sourceScope: "synthetic",
      facets: ids.map(([id, description]) => ({ id, description })),
    },
  ];
  await ensureProblem(g, e1, r);
  e1.problem!.scopeDefinitions = facets([
    ["partition-identities", "Integer partition identities"],
    ["enumerative-combinatorics", "Enumerative combinatorics"],
    ["generating-functions", "Generating functions"],
  ]) as never;
  const track = e1.problem!.contract.track;
  const universe = probeFacets(e1.problem!);
  recordProbeTurn(
    g,
    e1,
    parseProbeReply(
      {
        text: "You know generating functions; the other two are recorded as gaps.",
        complete: true,
        outcome: "gap",
        knowledge: {
          facets: [
            { id: "generating-functions", status: "demonstrated" },
            { id: "enumerative-combinatorics", status: "gap" },
            { id: "partition-identities", status: "gap" },
          ],
        },
      },
      universe,
    ),
    {
      requestId: "e1-concede",
      questionSequence: 1,
      provider: "chatgpt-handoff",
      statement: "I know GF but not EC",
      at: "2026-10-18T10:00:00.000Z",
    },
  );
  assert.deepEqual(
    openGaps(g).map((x) => x.facet.id),
    ["partition-identities", "enumerative-combinatorics"],
  );
  assert.match(knowledgeGapContext(g, track), /Ask about these directly/);
  assert.doesNotMatch(knowledgeGapContext(g, track), /since closed/);
  // Same stable facet id at a later terminal on the track closes the gap.
  await ensureProblem(g, e2, r);
  e2.problem!.scopeDefinitions = facets([
    ["enumerative-combinatorics", "Enumerative combinatorics"],
  ]) as never;
  e2.problem!.contract.track = track;
  recordProbeTurn(
    g,
    e2,
    parseProbeReply(
      {
        text: "That is enumerative combinatorics, done.",
        complete: false,
        knowledge: {
          facets: [{ id: "enumerative-combinatorics", status: "demonstrated" }],
        },
      },
      probeFacets(e2.problem!),
    ),
    {
      requestId: "e2-turn",
      questionSequence: 1,
      provider: "chatgpt-handoff",
      statement: "count by cases then sum",
      at: "2026-10-19T10:00:00.000Z",
    },
  );
  const ec = g.study.knowledgeGaps!.find(
    (x) => x.facet.id === "enumerative-combinatorics",
  )!;
  assert.deepEqual(ec.resolved, {
    at: "2026-10-19T10:00:00.000Z",
    encounter: `${e2.runId}/${e2.id}`,
    requestId: "e2-turn",
    status: "demonstrated",
  });
  assert.equal(ec.statement, "I know GF but not EC", "the original words stay");
  assert.deepEqual(
    openGaps(g).map((x) => x.facet.id),
    ["partition-identities"],
  );
  let context = knowledgeGapContext(g, track);
  assert.match(context, /Gaps since closed/);
  assert.match(context, /can be asked again \(known parts do not imply it\)/);
  assert.match(
    context,
    /Enumerative combinatorics · demonstrated on 2026-10-19/,
  );
  assert.match(context, /Integer partition identities · learner said/);
  assert.ok(
    context.indexOf("Ask about these directly") <
      context.indexOf("Gaps since closed"),
  );
  // A question with its own rubric ids closes a gap by identical facet text.
  await ensureProblem(g, e3, r);
  e3.problem!.scopeDefinitions = facets([
    ["pi-apex", "Integer Partition Identities"],
  ]) as never;
  e3.problem!.contract.track = track;
  recordProbeTurn(
    g,
    e3,
    parseProbeReply(
      {
        text: "Now the identities follow; solved.",
        complete: true,
        outcome: "solved",
        knowledge: { facets: [{ id: "pi-apex", status: "demonstrated" }] },
      },
      probeFacets(e3.problem!),
    ),
    {
      requestId: "e3-turn",
      questionSequence: 1,
      provider: "chatgpt-handoff",
      statement: "pair each partition with its conjugate",
      at: "2026-10-20T10:00:00.000Z",
    },
  );
  assert.deepEqual(openGaps(g), []);
  assert.equal(
    g.study.knowledgeGaps!.find((x) => x.facet.id === "partition-identities")!
      .resolved!.encounter,
    `${e3.runId}/${e3.id}`,
  );
  context = knowledgeGapContext(g, track);
  assert.doesNotMatch(context, /Ask about these directly/);
  assert.match(context, /Gaps since closed/);
  // A different track never closes it; resolution survives save/reload.
  const other = createPlayableGame(3, r);
  const oe = Object.values(other.encounters).find((x) => x.mode === "solo")!;
  await ensureProblem(other, oe, r);
  oe.problem!.scopeDefinitions = facets([["x", "Some facet"]]) as never;
  recordProbeTurn(
    other,
    oe,
    parseProbeReply(
      {
        text: "ok",
        complete: true,
        outcome: "gap",
        knowledge: { facets: [{ id: "x", status: "gap" }] },
      },
      probeFacets(oe.problem!),
    ),
    {
      requestId: "o1",
      questionSequence: 1,
      provider: "study-mode",
      statement: "no",
    },
  );
  other.study.knowledgeGaps![0].track = "ZZ";
  const oe2 = Object.values(other.encounters).filter(
    (x) => x.mode === "solo",
  )[1];
  await ensureProblem(other, oe2, r);
  oe2.problem!.scopeDefinitions = facets([["x", "Some facet"]]) as never;
  recordProbeTurn(
    other,
    oe2,
    parseProbeReply(
      {
        text: "ok",
        complete: false,
        knowledge: { facets: [{ id: "x", status: "demonstrated" }] },
      },
      probeFacets(oe2.problem!),
    ),
    {
      requestId: "o2",
      questionSequence: 1,
      provider: "study-mode",
      statement: "yes",
    },
  );
  assert.equal(other.study.knowledgeGaps![0].resolved, undefined);
  const reloaded = recover(decode(encode(g)));
  assert.equal(
    reloaded.study.knowledgeGaps!.filter((x) => x.resolved).length,
    2,
  );
});

test("the tutor can declare prerequisite parts the question never listed, bounded by parent, description, depth and count", () => {
  const facets = probeFacets(scopedProblem);
  const parsed = parseProbeReply(
    {
      text: "Partition identities rest on two parts; let us look at each.",
      complete: false,
      knowledge: {
        facets: [
          { id: "window-total", status: "gap" },
          {
            id: "Enumerative Combinatorics!",
            status: "gap",
            partOf: "window-total",
            description: "Count partitions by cases",
          },
          {
            id: "generating-functions",
            status: "demonstrated",
            partOf: "window-total",
            description: "Encode a sequence as a power series",
          },
          // Depth: a part of a declared part is allowed (level 2) …
          {
            id: "series-expansion",
            status: "gap",
            partOf: "generating-functions",
            description: "Expand a rational function as a series",
          },
          // … but a level below that is not.
          {
            id: "too-deep",
            status: "gap",
            partOf: "series-expansion",
            description: "Dropped",
          },
          // Missing description, unknown parent, self-parent or no parent: dropped.
          { id: "no-description", status: "gap", partOf: "window-total" },
          {
            id: "orphan",
            status: "gap",
            partOf: "nowhere",
            description: "Dropped",
          },
          { id: "stray", status: "gap" },
          // A declared id that normalises to a known facet is that facet.
          {
            id: "Running Update",
            status: "implied",
            impliedBy: "generating-functions",
            partOf: "window-total",
            description: "Ignored",
          },
          // Re-declaring an already declared part is just a finding on it.
          {
            id: "generating-functions",
            status: "gap",
            partOf: "window-total",
            description: "Ignored",
          },
        ],
      },
    },
    facets,
  );
  assert.equal(SUB_FACET_DEPTH, 2);
  assert.deepEqual(parsed.findings, [
    { id: "window-total", status: "gap" },
    {
      id: "enumerative-combinatorics",
      status: "gap",
      partOf: "window-total",
      description: "Count partitions by cases",
    },
    {
      id: "generating-functions",
      status: "demonstrated",
      partOf: "window-total",
      description: "Encode a sequence as a power series",
    },
    {
      id: "series-expansion",
      status: "gap",
      partOf: "generating-functions",
      description: "Expand a rational function as a series",
    },
    {
      id: "running-update",
      status: "implied",
      impliedBy: "generating-functions",
    },
  ]);
  // Count cap: the seventeenth declared part is dropped.
  const many = parseProbeReply(
    {
      text: "x",
      complete: false,
      knowledge: {
        facets: Array.from({ length: SUB_FACETS_PER_REPLY + 1 }, (_, i) => ({
          id: `part-${i}`,
          status: "gap",
          partOf: "window-total",
          description: `Part ${i}`,
        })),
      },
    },
    facets,
  );
  assert.equal(many.findings.length, SUB_FACETS_PER_REPLY);
  // Known sub-facets from earlier turns count toward depth too.
  const grown = [
    ...facets,
    { id: "a", description: "A", partOf: "window-total" },
    { id: "b", description: "B", partOf: "a" },
  ];
  assert.deepEqual(
    parseProbeReply(
      {
        text: "x",
        complete: false,
        knowledge: {
          facets: [
            { id: "b", status: "demonstrated" },
            { id: "c", status: "gap", partOf: "b", description: "Too deep" },
          ],
        },
      },
      grown,
    ).findings,
    [{ id: "b", status: "demonstrated" }],
  );
  // Type errors on the new fields still interrupt the reply.
  for (const bad of [
    { id: "p", status: "gap", partOf: 3, description: "x" },
    { id: "p", status: "gap", partOf: "window-total", description: 3 },
  ])
    assert.doesNotThrow(() =>
      parseProbeReply(
        { text: "x", complete: false, knowledge: { facets: [bad] } },
        facets,
      ),
    );
});

test("declared parts join the encounter's universe and are carried in records and context with their parent", async () => {
  const g = createPlayableGame(515, r);
  const e = g.encounters[g.floors[0].stations[0].encounter];
  await ensureProblem(g, e, r);
  e.problem!.scopeDefinitions = [
    {
      id: "scope",
      objectiveId: "PY:T05.2",
      depth: 1,
      sourceScope: "synthetic",
      facets: [
        {
          id: "partition-identities",
          description: "Integer partition identities",
        },
      ],
    },
  ] as never;
  const track = e.problem!.contract.track;
  let facets = probeFacets(e.problem!);
  assert.equal(facets.length, 1);
  recordProbeTurn(
    g,
    e,
    parseProbeReply(
      {
        text: "No problem. Two parts underlie it: how do you count partitions, and what does a generating function do?",
        complete: false,
        knowledge: {
          facets: [
            {
              id: "partition-identities",
              status: "gap",
              note: "declared unknown",
            },
            {
              id: "enumerative-combinatorics",
              status: "gap",
              partOf: "partition-identities",
              description: "Enumerative combinatorics",
            },
            {
              id: "generating-functions",
              status: "gap",
              partOf: "partition-identities",
              description: "Generating functions",
            },
          ],
          signal: { fluency: "declared-gap" },
        },
      },
      facets,
    ),
    {
      requestId: "t1",
      questionSequence: 1,
      provider: "chatgpt-handoff",
      statement: "I don't know partition identities",
      at: "2026-10-18T09:00:00.000Z",
    },
  );
  assert.deepEqual(
    e.probe!.facets.map((f) => [f.id, f.partOf]),
    [
      ["partition-identities", undefined],
      ["enumerative-combinatorics", "partition-identities"],
      ["generating-functions", "partition-identities"],
    ],
  );
  assert.equal(probeState(e).total, 3);
  assert.equal(
    probeSummary(e),
    "0 of 3 facets established · 3 recorded gaps · last answer declared a gap",
  );
  assert.equal(g.study.knowledgeGaps, undefined, "nothing conceded yet");
  // The next turn judges the declared parts by id, against the grown universe.
  facets = e.probe!.facets;
  const created = recordProbeTurn(
    g,
    e,
    parseProbeReply(
      {
        text: "Generating functions you clearly know. Counting by cases is recorded as the gap; here is your key.",
        complete: true,
        outcome: "gap",
        knowledge: {
          facets: [
            { id: "generating-functions", status: "demonstrated" },
            { id: "enumerative-combinatorics", status: "gap" },
            { id: "partition-identities", status: "gap" },
          ],
        },
      },
      facets,
    ),
    {
      requestId: "t2",
      questionSequence: 2,
      provider: "chatgpt-handoff",
      statement:
        "GF encode a sequence as coefficients; counting by cases I never learned",
      at: "2026-10-18T09:05:00.000Z",
    },
  );
  assert.deepEqual(
    created.map((c) => [c.facet.id, c.partOf?.id]),
    [
      ["partition-identities", undefined],
      ["enumerative-combinatorics", "partition-identities"],
    ],
  );
  assert.deepEqual(created[1].partOf, {
    id: "partition-identities",
    description: "Integer partition identities",
  });
  assert.deepEqual(
    encounterEstablished(g, e).map((k) => [k.facet.id, k.status, k.partOf?.id]),
    [["generating-functions", "demonstrated", "partition-identities"]],
  );
  const gaps = knowledgeGapContext(g, track);
  assert.match(
    gaps,
    /Enumerative combinatorics \(part of Integer partition identities\) · learner said/,
  );
  assert.match(gaps, /Integer partition identities · learner said/);
  const known = knowledgeEstablishedContext(g, track);
  assert.match(
    known,
    /Generating functions \(part of Integer partition identities\) · demonstrated/,
  );
  // Records and the grown universe survive save/reload.
  const reloaded = recover(decode(encode(g)));
  assert.equal(reloaded.encounters[e.id].probe!.facets.length, 3);
  assert.equal(
    reloaded.study.knowledgeGaps!.find(
      (x) => x.facet.id === "enumerative-combinatorics",
    )!.partOf!.description,
    "Integer partition identities",
  );
});

test("probeRecordsForTrack is bounded, track-scoped, keeps parents and splits open from closed gaps", () => {
  const g = createPlayableGame(9, r);
  const parent = { id: "apex", description: "Apex facet" };
  g.study.knowledgeEstablished = Array.from({ length: 45 }, (_, i) => ({
    id: `known-${i}`,
    encounter: `run/e${i}`,
    runId: "run",
    track: i % 9 === 0 ? "PE" : "PY",
    objectiveIds: ["PY:T01.1"],
    depth: 1,
    facet: { id: `f-${i}`, description: `Facet ${i}` },
    status: i % 2 ? ("implied" as const) : ("demonstrated" as const),
    ...(i % 2 ? { impliedBy: "f-0" } : {}),
    ...(i === 44 ? { partOf: parent } : {}),
    requestId: `q${i}`,
    provider: "chatgpt-handoff",
    at: "2026-10-18T00:00:00.000Z",
  }));
  g.study.knowledgeGaps = Array.from({ length: 25 }, (_, i) => ({
    id: `gap-${i}`,
    encounter: `run/e${i}`,
    runId: "run",
    track: "PY",
    objectiveIds: ["PY:T01.2"],
    depth: 1,
    facet: { id: `g-${i}`, description: `Gap ${i}` },
    statement: "x".repeat(300),
    ...(i === 24 ? { partOf: parent } : {}),
    requestId: `q${i}`,
    provider: "chatgpt-handoff",
    at: "2026-10-18T00:00:00.000Z",
    ...(i % 5 === 0
      ? {
          resolved: {
            at: "2026-10-19T00:00:00.000Z",
            encounter: "run/later",
            requestId: "later",
            status: "demonstrated" as const,
          },
        }
      : {}),
  }));
  const py = probeRecordsForTrack(g, "PY");
  assert.equal(py.note, PROBE_RECORDS_NOTE);
  assert.match(py.note, /never curriculum mastery/);
  assert.match(py.note, /copy the eligible contract exactly/);
  assert.equal(py.established.length, 40);
  assert.ok(
    py.established.every((k) => !k.facetId.match(/^f-(0|9|18|27|36)$/)),
  );
  assert.deepEqual(py.established.at(-1), {
    facetId: "f-44",
    description: "Facet 44",
    status: "demonstrated",
    partOf: parent,
    objectiveIds: ["PY:T01.1"],
    depth: 1,
  });
  assert.equal(py.established.at(-2)!.impliedBy, "f-0");
  assert.equal(py.openGaps.length, 20);
  assert.ok(py.openGaps.every((x) => x.statement.length === 200));
  assert.deepEqual(py.openGaps.at(-1)!.partOf, parent);
  assert.equal(py.closedGaps.length, 5);
  assert.ok(
    py.closedGaps.every((x) => x.resolvedAt === "2026-10-19T00:00:00.000Z"),
  );
  assert.ok(!("statement" in py.closedGaps[0]));
  const pe = probeRecordsForTrack(g, "PE");
  assert.equal(pe.established.length, 5);
  assert.deepEqual(pe.openGaps, []);
  assert.deepEqual(pe.closedGaps, []);
  assert.deepEqual(probeRecordsForTrack(createPlayableGame(1, r), "PY"), {
    note: PROBE_RECORDS_NOTE,
    established: [],
    openGaps: [],
    closedGaps: [],
  });
});

test("live question generation sends the track's probe records and a policy that targets open gaps", async () => {
  const original = globalThis.fetch;
  let generatePayload: any;
  globalThis.fetch = async (input, init) => {
    if (String(input) === "/api/status")
      return Response.json({
        mode: "study-mode",
        label: "Isolated transport fixture",
        capabilities: ["generate", "tutor", "group", "complete", "assess"],
        detail: "Test fixture only; not a native Study Mode verification.",
      });
    const body = JSON.parse(String(init?.body));
    assert.equal(body.operation, "generate");
    generatePayload = body.payload;
    const c = body.payload.contract;
    return Response.json({
      title: "Fixture question",
      prompt: "Isolated pipeline fixture.",
      starter: "",
      rubric: ["scope"],
      contract: c,
      scopeDefinitions: [
        {
          id: `${c.objectiveIds[0]}/D${c.depth}`,
          objectiveId: c.objectiveIds[0],
          depth: c.depth,
          sourceScope: c.scopes[0],
          facets: [{ id: "scope", description: "Complete scope fixture" }],
        },
      ],
    });
  };
  try {
    await checkBridge();
    // Created live so no development practice problem is pre-assigned.
    const g = createPlayableGame(33, r, initialStudy(r, "live"));
    g.status = "playing";
    const track = eligible(r, g.study).track;
    g.study.knowledgeGaps = [
      {
        id: "gap-1",
        encounter: "earlier/e",
        runId: "earlier",
        track,
        objectiveIds: ["X:1"],
        depth: 1,
        facet: {
          id: "enumerative-combinatorics",
          description: "Enumerative combinatorics",
        },
        statement: "never learned it",
        requestId: "q",
        provider: "study-mode",
        at: "2026-10-18T00:00:00.000Z",
      },
    ];
    const e = g.encounters[g.floors[0].stations[0].encounter];
    await ensureProblem(g, e, r);
    assert.equal(e.problem?.provenance, "study-mode");
    assert.equal(generatePayload.probeRecords.note, PROBE_RECORDS_NOTE);
    assert.deepEqual(
      generatePayload.probeRecords.openGaps.map((x: any) => x.facetId),
      ["enumerative-combinatorics"],
    );
    assert.deepEqual(generatePayload.probeRecords.established, []);
    assert.match(generatePayload.generationPolicy, /Use probeRecords/);
    assert.match(generatePayload.generationPolicy, /blocked as the apex/);
  } finally {
    globalThis.fetch = async () =>
      Response.json({
        mode: "development",
        label: "Synthetic cleanup",
        detail: "No real AI",
        capabilities: [],
      });
    await checkBridge();
    globalThis.fetch = original;
  }
});

test("development practice lists open gaps for the scheduled track in its prompt, never closed or other-track ones", () => {
  const g = createPlayableGame(12, r);
  const track = eligible(r, g.study).track;
  const gap = (id: string, t: string, resolved = false) => ({
    id,
    encounter: "run/e",
    runId: "run",
    track: t,
    objectiveIds: ["X:1"],
    depth: 1,
    facet: { id, description: `Facet ${id}` },
    statement: "no",
    requestId: "q",
    provider: "study-mode",
    at: "2026-10-18T00:00:00.000Z",
    ...(resolved
      ? {
          resolved: {
            at: "2026-10-19T00:00:00.000Z",
            encounter: "run/later",
            requestId: "later",
            status: "demonstrated" as const,
          },
        }
      : {}),
  });
  const before = devProblem({ ...g, rng: 7 }, r).prompt;
  assert.doesNotMatch(before, /Recorded gaps to work on/);
  g.study.knowledgeGaps = [
    gap("open-a", track),
    gap("closed-b", track, true),
    gap("other-c", track === "PY" ? "PE" : "PY"),
  ];
  const after = devProblem({ ...g, rng: 7 }, r).prompt;
  assert.match(after, /Recorded gaps to work on: Facet open-a\.$/);
  assert.doesNotMatch(after, /closed-b|other-c/);
  assert.equal(
    after.replace(/\n\nRecorded gaps to work on: Facet open-a\./, ""),
    before,
  );
});
