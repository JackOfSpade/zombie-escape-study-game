import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import type { Game, Roadmap } from "../src/model";
import { gameFingerprint } from "./lib/game-fingerprint";
import { prepareScenario } from "./lib/defense-scenario";
const roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
) as Roadmap;
const fingerprint = gameFingerprint();
const files = [
  "scripts/benchmark-full-study.ts",
  "scripts/lib/defense-scenario.ts",
];
const driver = files.map((path) => ({
  path,
  sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
}));
for (const seed of (process.env.FULL_STUDY_SEEDS ?? "0,1,2")
  .split(",")
  .map(Number)) {
  if (!Number.isSafeInteger(seed) || seed < 0)
    throw Error("Invalid full-study seed");
  let world: Game | undefined;
  const start = performance.now();
  let outcome: unknown;
  try {
    const scenario = prepareScenario(
      roadmap,
      seed,
      "layered",
      [-0.05, 0.04, 0.06][seed % 3],
      {
        population: "full",
        onCreate: (g) => {
          world = g;
        },
      },
    );
    outcome = {
      phase: "prepared",
      time: scenario.g.time,
      preparationSteps: scenario.preparationSteps,
      room: scenario.room,
    };
  } catch (error) {
    outcome = { phase: "preparation-failed", error: String(error) };
  }
  if (!world) throw Error("Full-population world was not created");
  const prefix =
    process.env.FULL_STUDY_PREFIX ?? "docs/evidence/full-study-initial";
  writeFileSync(`${prefix}-${seed}-world.json`, JSON.stringify(world));
  const report = {
    seed,
    source: fingerprint,
    driver,
    mode: "full twenty-survivor preparation diagnostic; all NPC decisions/horde/Surge active; scripted physical policy; no real human study",
    outcome,
    elapsedMs: Math.round(performance.now() - start),
    time: world.time,
    human: {
      x: world.survivors[0].x,
      y: world.survivors[0].y,
      hp: world.survivors[0].hp,
      alive: world.survivors[0].alive,
    },
    population: world.survivors.length,
    stats: world.stats,
    humanEvidence: world.study.learner?.evidence.length ?? 0,
    humanVisits: world.study.visits.length,
    recent: world.events.slice(-20),
  };
  writeFileSync(`${prefix}-${seed}.json`, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      seed,
      outcome,
      time: world.time,
      human: report.human,
      population: report.population,
      elapsedMs: report.elapsedMs,
    }),
  );
}
