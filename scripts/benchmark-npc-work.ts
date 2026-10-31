import { readFileSync, writeFileSync } from "node:fs";
import { eligible } from "../src/curriculum";
import { claimStation, step } from "../src/engine";
import type { Roadmap } from "../src/model";
import { npcReasoningAvailable } from "../src/npc-cognition";
import {
  materializeNpcWork,
  type WorkPayload,
} from "../src/npc-materialization";
import { createGame } from "../src/world";
import { gameFingerprint } from "./lib/game-fingerprint";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8")),
  g = createGame(7, r),
  e = g.encounters["f0-room0"],
  a = g.survivors[1],
  f = g.floors[0],
  ss = f.stations.filter((s) => s.encounter === e.id),
  source = gameFingerprint();
g.status = "playing";
g.nextSpawn = Infinity;
g.zombies = [];
g.surge.anchor = 10000;
g.survivors = [g.survivors[0], a];
f.furniture = [];
f.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
Object.assign(g.survivors[0], { x: ss[0].x, y: ss[0].y });
claimStation(g, g.survivors[0], ss[0].id);
Object.assign(a, {
  x: ss[1].x,
  y: ss[1].y,
  station: ss[1].id,
  intent: e.id,
  role: "analyst",
  social: 0.3,
  seen: ss.map((s) => s.id),
  activity: "studying",
});
e.problem = {
  title: "Synthetic unchanged observed task",
  prompt: "Fixture for bounded work, not an academic question.",
  starter: "",
  rubric: ["No semantic quality claim"],
  provenance: "development",
  contract: eligible(r, g.study),
};
e.state = "in-progress";
const requests: { at: number; workIds: string[]; stages: string[] }[] = [];
const request = async (p: WorkPayload) => {
  requests.push({
    at: g.time,
    workIds: p.work.map((w) => w.id),
    stages: p.work.map((w) => w.stage),
  });
  return {
    requestId: p.requestId,
    sourceRevision: p.sourceRevision,
    notes: p.work.map((w) => ({
      workId: w.id,
      author: w.actor,
      refs: [w.seq],
      text: "Synthetic tentative note, not validated or executed.",
    })),
  };
};
for (let n = 0; n < 54000; n++) {
  step(g, 1 / 30);
  if (n % 6 === 0) await materializeNpcWork(g, e, request);
}
const before = {
  calls: requests.length,
  thought: a.thought,
  milestone: a.milestone,
};
for (let n = 0; n < 300; n++) {
  step(g, 1 / 30);
  if (n % 6 === 0) await materializeNpcWork(g, e, request);
}
const report = {
  mode: "Isolated 1800s scoped-work plus 10s idle-check at 30 Hz; no horde, empty geometry, one NPC, synthetic materialization adapter; not a survival, semantic or native-provider trial",
  source,
  seed: g.seed,
  stepSeconds: 1 / 30,
  studySeconds: 1800,
  idleSeconds: 10,
  seconds: g.time,
  syntheticAdapterRequests: requests.length,
  requests,
  records: e.npcWork?.length,
  stages: e.npcWork?.map((w) => ({
    stage: w.stage,
    focus: w.focus,
    facet: w.facet,
    contextKey: w.contextKey,
  })),
  idleChanges: {
    requests: requests.length - before.calls,
    thought: a.thought - before.thought,
    milestones: a.milestone - before.milestone,
  },
  reasoningAvailable: npcReasoningAvailable(e, a),
  state: e.state,
  groupMessages: e.group.length,
  newHumanEvidence: g.study.learner?.evidence.length,
  humanVisits: g.study.visits.length,
  curriculumSourceHash: r.sourceHash,
};
writeFileSync(
  "docs/evidence/npc-work-idle.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
if (
  report.syntheticAdapterRequests > 5 ||
  report.idleChanges.requests ||
  report.idleChanges.thought ||
  report.idleChanges.milestones ||
  report.reasoningAvailable ||
  report.state !== "in-progress" ||
  report.newHumanEvidence ||
  report.humanVisits
)
  process.exitCode = 1;
