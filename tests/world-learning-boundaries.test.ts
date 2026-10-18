// Controlled mechanic/grade fixtures. Synthetic grades are not human achievement.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { closeChat, edit, ensureProblem, openChat, submit } from "../src/ai";
import { claimStation, complete, step } from "../src/engine";
import {
  applyLearningAssessment,
  beginLearningAttempt,
  eligibleLearning,
  encounterKey,
  registerScopes,
} from "../src/learner";
import type { Roadmap } from "../src/model";
import { decode, encode, recover } from "../src/persistence";
import { retainRunLearning } from "../src/run-learning";
import { actor, createGame } from "../src/world";
import { gradeScheduled, laterAt } from "./helpers/later-baseline-evidence";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));

test("C09/C10 a real fortification contributor receives remote access; reopening the consumed terminal cannot qualify a late observer", async () => {
  const g = createGame(0, r),
    f = g.floors[0],
    e = g.encounters["f0-room0"],
    station = f.stations.find((s) => s.encounter === e.id)!,
    human = g.survivors[0],
    builder = actor("builder", "Builder", 1);
  Object.assign(builder, {
    role: "builder",
    intent: e.id,
    x: station.x,
    y: station.y,
    seen: [station.id],
  });
  g.survivors = [human, builder];
  human.escaped = true; // Park the observer during this controlled preparation.
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.status = "playing";
  for (let i = 0; i < 3000 && !e.contributors.includes(builder.id); i++)
    step(g, 1 / 30);
  assert.ok(
    e.contributors.includes(builder.id),
    "actual timed furniture placement must earn contribution",
  );
  assert.ok(
    e.history.some((h) => h.kind === "defense" && h.author === builder.id),
  );
  assert.deepEqual(builder.access, []);
  // This boundary case controls remote position; it does not certify the travel route.
  builder.floor = 1;
  builder.x = 21.5;
  builder.y = 20;
  const study = JSON.stringify(g.study);
  assert.equal(
    complete(
      g,
      e.id,
      "controlled-shared-result",
      e.contributors,
      "Synthetic teammate success",
    ),
    true,
  );
  assert.deepEqual(builder.access, [0]);
  assert.equal(
    JSON.stringify(g.study),
    study,
    "a defender earns no technical mastery or study visit",
  );
  human.escaped = false;
  human.x = station.x;
  human.y = station.y;
  assert.equal(claimStation(g, human, station.id), true);
  const contributors = [...e.contributors],
    accepted = e.accepted,
    loot = structuredClone(e.loot),
    completions = g.events.filter((ev) => ev.type === "completion").length;
  await ensureProblem(g, e, r);
  openChat(g, e);
  closeChat(g, e);
  openChat(g, e);
  assert.equal(
    edit(g, e, "Late observer cannot submit new work", e.revision),
    false,
  );
  await submit(g, e, r);
  assert.equal(complete(g, e.id, "replay", [human.id], "Reopening"), false);
  assert.deepEqual(e.contributors, contributors);
  assert.deepEqual(human.access, []);
  assert.deepEqual(e.loot, loot);
  assert.equal(e.accepted, accepted);
  assert.equal(
    g.events.filter((ev) => ev.type === "completion").length,
    completions,
  );
  assert.equal(JSON.stringify(g.study), study);
  const saved = recover(decode(encode(g)));
  assert.deepEqual(
    saved.survivors.find((a) => a.id === builder.id)!.access,
    [0],
  );
  assert.deepEqual(saved.survivors[0].access, []);
  assert.equal(saved.encounters[e.id].state, "consumed");
});

test("C11 combat death and fresh world creation retain valid partial facets and archived drafts without carrying access, loot or damaged geometry", () => {
  const g = createGame(42, r);
  g.study.profile = "live";
  const l = g.study.learner!;
  let c = eligibleLearning(r, l, laterAt);
  for (let n = 0; c.review && n < 20; n++) {
    gradeScheduled(g, "independent", laterAt, n);
    c = eligibleLearning(r, l, laterAt);
  }
  assert.equal(
    c.review,
    false,
    "use the actual scheduler's next ordinary breadth visit",
  );
  const e = g.encounters["f0-room0"];
  e.problem = {
    title: "Synthetic partial task",
    prompt: "Controlled scope, not actual study",
    starter: "",
    rubric: [],
    provenance: "study-mode",
    contract: c,
    scopeDefinitions: c.objectiveIds.map((id, i) => ({
      id: `${id}/D${c.depth}`,
      objectiveId: id,
      depth: c.depth,
      sourceScope: c.scopes[i],
      facets: [
        { id: "demonstrated", description: "Synthetic demonstrated part" },
        { id: "missing", description: "Synthetic remaining part" },
      ],
    })),
  };
  e.workspace = "PRIVATE_PARTIAL_DRAFT_WITH_UNFINISHED_BOUNDARY";
  e.history.push({
    seq: ++g.seq,
    author: "human",
    kind: "reasoning",
    text: "Synthetic independent reasoning for the demonstrated facet only",
    at: g.time,
    revision: 0,
    wallTime: laterAt,
  });
  registerScopes(r, l, e);
  beginLearningAttempt(r, l, e, laterAt);
  applyLearningAssessment(
    r,
    l,
    e,
    {
      id: "controlled-partial-before-death",
      encounter: e.id,
      provenance: "study-mode",
      sourceVersion: l.version,
      status: "pending",
      evidenceCutoffSequence: g.seq,
      visitOutcome: "usable",
      scopeReviews: e.problem.scopeDefinitions!.map((d) => ({
        id: d.id,
        completeCoverage: true,
        rationale: "Synthetic complete definition, partial observation",
      })),
      findings: e.problem.scopeDefinitions!.map((d) => ({
        objectiveId: d.objectiveId,
        depth: d.depth,
        facet: "demonstrated",
        outcome: "independent",
        evidence: [g.seq],
        completeCheckpointScope: false,
        rationale: "Controlled partial observation only",
      })),
    },
    laterAt,
    "study-mode",
  );
  const evidence = structuredClone(l.evidence),
    facets = structuredClone(l.cells[c.objectiveIds[0]].facets),
    cycle = l.cycle;
  assert.notEqual(l.cells[c.objectiveIds[0]].states[c.depth - 1], "P");
  assert.equal(facets[`D${c.depth}:demonstrated`].outcome, "independent");
  assert.equal(facets[`D${c.depth}:missing`], undefined);
  const human = g.survivors[0];
  Object.assign(human, {
    x: 21.5,
    y: 31.5,
    hp: 1,
    access: [0],
    inventory: [{ id: "old-run-loot", kind: "medkit", weight: 1, charges: 1 }],
  });
  g.floors[0].furniture[0].hp = 0;
  g.floors[0].furniture[0].destroyed = true;
  g.survivors = [human];
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.status = "playing";
  g.zombies = [
    {
      id: "outside-contact-fixture",
      floor: 0,
      x: 21.5,
      y: 32,
      hp: 60,
      path: [],
      repath: 0,
      cooldown: 0,
      memory: 0,
      stagger: 0,
      origin: "outside",
    },
  ];
  for (let n = 0; n < 60 && g.status === "playing"; n++) step(g, 1 / 30);
  assert.equal(g.status, "dead");
  assert.ok(g.events.some((ev) => ev.type === "survivor-hit"));
  retainRunLearning(g, true);
  const oldId = g.id,
    oldKey = encounterKey(e),
    restored = recover(decode(encode(g))),
    fresh = createGame(1337, r, restored.study);
  assert.notEqual(fresh.id, oldId);
  assert.deepEqual(fresh.study.learner!.evidence, evidence);
  assert.deepEqual(
    fresh.study.learner!.cells[c.objectiveIds[0]].facets,
    facets,
  );
  assert.equal(fresh.study.learner!.cycle, cycle);
  assert.ok(
    fresh.study.archives.some(
      (a) => encounterKey(a) === oldKey && a.workspace === e.workspace,
    ),
  );
  assert.deepEqual(fresh.survivors[0].access, []);
  assert.ok(!fresh.survivors[0].inventory.some((i) => i.id === "old-run-loot"));
  assert.ok(
    fresh.floors[0].furniture.every((o) => !o.destroyed && o.hp === o.maxHp),
  );
  assert.notEqual(encounterKey(fresh.encounters[e.id]), oldKey);
  assert.equal(fresh.encounters[e.id].workspace, "");
  assert.equal(fresh.encounters[e.id].state, "available");
});
