import { readFileSync, writeFileSync } from "node:fs";
import { step } from "../src/engine";
import { type Roadmap } from "../src/model";
import { gameFingerprint } from "./lib/game-fingerprint";
import { restoreRoofScenario, type RoofScenario } from "./lib/roof-scenario";
const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
const fixture = process.env.ROOF_FIXTURE ?? "tests/fixtures/roof-pressure.json",
  output = process.env.ROOF_REPORT ?? "docs/evidence/roof-retreat-replay.json";
const snapshot: RoofScenario = JSON.parse(readFileSync(fixture, "utf8"));
const { g, survivor } = restoreRoofScenario(roadmap, snapshot),
  start = g.time,
  cursor = g.seq,
  initialHP = survivor.hp;
const fingerprint = gameFingerprint();
for (let i = 0; i < 900 && survivor.alive && !survivor.escaped; i++)
  step(g, 1 / 30);
const report = {
  mode: "counterfactual policy replay of a captured normal outside-horde world; not a new opening-to-roof run or human learning evidence",
  fixture,
  sourceConfiguration: snapshot.sourceConfiguration,
  currentPhysicsSha256: fingerprint.hash,
  fingerprintSchema: fingerprint.schema,
  fingerprintedFiles: fingerprint.files,
  stepSeconds: 1 / 30,
  start,
  seconds: +(g.time - start).toFixed(2),
  alive: survivor.alive,
  escaped: survivor.escaped,
  initialHP,
  hp: survivor.hp,
  inventory: survivor.inventory,
  x: survivor.x,
  y: survivor.y,
  humanEvidence: g.study.learner?.evidence.length,
  humanVisits: g.study.visits.length,
  events: g.events.filter(
    (e) =>
      e.seq > cursor &&
      ["board", "death", "vault", "helicopter"].includes(e.type),
  ),
};
writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
if (!survivor.escaped) process.exitCode = 1;
