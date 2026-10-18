import { readFileSync, writeFileSync } from "node:fs";
import { step } from "../src/engine";
import type { Roadmap } from "../src/model";
import { distance } from "../src/model";
import { gameFingerprint } from "./lib/game-fingerprint";
import {
  restoreSurvivalScenario,
  type SurvivalScenario,
} from "./lib/survival-scenario";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8")),
  snapshot: SurvivalScenario = JSON.parse(
    readFileSync("tests/fixtures/furniture-crowding.json", "utf8"),
  ),
  g = restoreSurvivalScenario(r, snapshot),
  source = gameFingerprint(),
  start = g.time,
  f = g.floors[0],
  o = f.furniture.find((o) => o.id === "f0-room3-shelf5")!,
  a = g.survivors.find((a) => a.name === "Bo")!,
  initial = {
    x: o.x,
    y: o.y,
    hp: o.hp,
    moved: o.moved,
    credited: [...o.credited],
  },
  initialActor = { x: a.x, y: a.y },
  deaths = g.stats.deaths;
let maxActorStep = 0,
  maxObjectStep = 0,
  firstSealAt: number | undefined;
for (let i = 0; i < 1050; i++) {
  const actorBefore = { x: a.x, y: a.y },
    objectBefore = { x: o.x, y: o.y };
  step(g, 1 / 30);
  maxActorStep = Math.max(maxActorStep, distance(a, actorBefore));
  maxObjectStep = Math.max(maxObjectStep, distance(o, objectBefore));
  if (o.credited.length && firstSealAt === undefined) firstSealAt = g.time;
}
const report = {
  mode: "Counterfactual 35s replay of captured crowded room, not a fresh full run or human learning",
  fixture: "tests/fixtures/furniture-crowding.json",
  sourceConfiguration: snapshot.sourceConfiguration,
  currentSource: source,
  stepSeconds: 1 / 30,
  start,
  seconds: g.time - start,
  initial,
  final: { x: o.x, y: o.y, hp: o.hp, moved: o.moved, credited: o.credited },
  firstSealAt,
  yieldActor: {
    id: a.id,
    name: a.name,
    initial: initialActor,
    final: { x: a.x, y: a.y },
    defenseCredit: o.credited.includes(a.id),
  },
  maxActorStep,
  maxObjectStep,
  actorStepLimit: a.speed / 30,
  objectStepLimit: (o.speed * 1.9) / 30,
  newDeaths: g.stats.deaths - deaths,
  escaped: g.stats.rescued,
  humanEvidence: g.study.learner?.evidence.length,
  humanVisits: g.study.visits.length,
};
writeFileSync(
  "docs/evidence/cooperation-replay.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
