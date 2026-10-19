import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ensureProblem } from "../src/ai";
import {
  encounterEstablished,
  encounterGaps,
  knowledgeEstablishedContext,
  knowledgeGapContext,
  knowledgeProbeContext,
  parseProbeReply,
  probeContract,
  probeFacets,
  probeState,
  probeSummary,
  recordProbeTurn,
  PROBE_STANCE,
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
