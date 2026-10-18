import { readFileSync, writeFileSync } from "node:fs";
import { step } from "../src/engine";
import type { Roadmap } from "../src/model";
import {
  restoreExplorationScenario,
  type ExplorationScenario,
} from "./lib/exploration-scenario";
import { gameFingerprint } from "./lib/game-fingerprint";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8")),
  fixture: ExplorationScenario = JSON.parse(
    readFileSync("tests/fixtures/missed-annex.json", "utf8"),
  );
const { g, survivors } = restoreExplorationScenario(r, fixture),
  start = g.time,
  baseline = { deaths: g.stats.deaths, rescued: g.stats.rescued },
  fingerprint = gameFingerprint();
const discoveries: Record<string, number> = {};
for (let i = 0; i < 9000; i++) {
  step(g, 1 / 30);
  for (const a of survivors)
    if (
      !discoveries[a.id] &&
      a.seen.some((id) => id.startsWith("f1-room0-station"))
    )
      discoveries[a.id] = g.time - start;
}
const report = {
  mode: "Counterfactual replay of captured missed-annex physical world, not a fresh opening-to-roof run or human learning evidence",
  fixture: "tests/fixtures/missed-annex.json",
  sourceConfiguration: fixture.sourceConfiguration,
  currentSource: fingerprint,
  stepSeconds: 1 / 30,
  seconds: g.time - start,
  baseline,
  newDeaths: g.stats.deaths - baseline.deaths,
  newRescues: g.stats.rescued - baseline.rescued,
  discoveries,
  survivors: survivors.map((a) => ({
    id: a.id,
    name: a.name,
    alive: a.alive,
    escaped: a.escaped,
    hp: a.hp,
    floor: a.floor,
    access: a.access,
    activity: a.activity,
    knownAnnexStations: a.seen.filter((id) =>
      id.startsWith("f1-room0-station"),
    ),
    entered: a.seen.includes("entered-door-f1-room0-door"),
  })),
  humanEvidence: g.study.learner?.evidence.length,
  humanVisits: g.study.visits.length,
};
writeFileSync(
  "docs/evidence/exploration-replay.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
