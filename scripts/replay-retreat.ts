import { readFileSync, writeFileSync } from "node:fs";
import { step } from "../src/engine";
import type { Roadmap } from "../src/model";
import { gameFingerprint } from "./lib/game-fingerprint";
import {
  restoreSurvivalScenario,
  type SurvivalScenario,
} from "./lib/survival-scenario";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8")),
  snapshot: SurvivalScenario = JSON.parse(
    readFileSync("tests/fixtures/retreat-oscillation.json", "utf8"),
  );
const g = restoreSurvivalScenario(r, snapshot),
  start = g.time,
  baseline = g.stats.deaths,
  source = gameFingerprint();
const changes: Record<string, number> = {},
  previous = new Map(g.survivors.map((a) => [a.id, a.activity]));
for (let i = 0; i < 9000; i++) {
  step(g, 1 / 30);
  for (const a of g.survivors.slice(1))
    if (previous.get(a.id) !== a.activity) {
      changes[a.id] = (changes[a.id] ?? 0) + 1;
      previous.set(a.id, a.activity);
    }
}
const control = JSON.parse(
  readFileSync("docs/evidence/risk-baseline-600.json", "utf8"),
)[0];
if (
  control.seed !== g.seed ||
  control.configuration.physicsSha256 !==
    snapshot.sourceConfiguration.physicsSha256 ||
  control.configuration.stepSeconds !== 1 / 30 ||
  control.configuration.seconds < start + 300
)
  throw Error(
    "Recorded control does not match the captured world or replay interval",
  );
const oldDeaths = control.incidents.filter(
  (e: { type: string; at: number }) =>
    e.type === "death" && e.at >= start && e.at <= g.time,
).length;
const report = {
  mode: "Counterfactual 300s replay of actual pre-death world, not a fresh full run, human learning or a guarantee of survival",
  fixture: "tests/fixtures/retreat-oscillation.json",
  sourceConfiguration: snapshot.sourceConfiguration,
  currentSource: source,
  stepSeconds: 1 / 30,
  start,
  seconds: g.time - start,
  oldPolicyDeathsInSameInterval: oldDeaths,
  newDeaths: g.stats.deaths - baseline,
  escaped: g.stats.rescued,
  survivors: g.survivors.slice(1).map((a) => ({
    id: a.id,
    name: a.name,
    hp: a.hp,
    alive: a.alive,
    escaped: a.escaped,
    floor: a.floor,
    activity: a.activity,
    access: a.access,
    activityChanges: changes[a.id] ?? 0,
  })),
  humanEvidence: g.study.learner?.evidence.length,
  humanVisits: g.study.visits.length,
};
writeFileSync(
  "docs/evidence/retreat-replay.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
