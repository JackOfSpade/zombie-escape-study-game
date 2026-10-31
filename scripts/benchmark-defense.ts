import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { FURNITURE, type Roadmap } from "../src/model";
import {
  DEFENSE_STEP_SECONDS,
  prepareScenario,
  siegeScenario,
  type DefensePolicy,
} from "./lib/defense-scenario";
import { gameFingerprint } from "./lib/game-fingerprint";
import { sha256 } from "./lib/digest.mjs";
const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
const seeds = process.argv.slice(2).length
  ? process.argv.slice(2).map(Number)
  : [0, 1, 2];
const policies = (
  process.env.DEFENSE_POLICIES ?? "door,outer,inner-only,layered"
).split(",") as DefensePolicy[];
if (
  policies.some((p) => !["door", "outer", "inner-only", "layered"].includes(p))
)
  throw Error("Unknown defense policy");
const reports = [];
const driverFiles = [
  "scripts/benchmark-defense.ts",
  "scripts/lib/defense-scenario.ts",
].map((path) => ({
  path,
  sha256: sha256(readFileSync(path)),
}));
const output =
  process.env.DEFENSE_REPORT ?? "docs/evidence/defense-benchmark.json";
const fingerprint = gameFingerprint(),
  physicsSha256 = fingerprint.hash;
mkdirSync("docs/evidence", { recursive: true });
for (const seed of seeds)
  for (const policy of policies) {
    const cpuStart = performance.now();
    try {
      const scenario = prepareScenario(
        roadmap,
        seed,
        policy,
        [-0.05, 0.04, 0.06][seed % 3],
      );
      const result = {
        ...siegeScenario(scenario),
        elapsedMs: Math.round(performance.now() - cpuStart),
      };
      reports.push(result);
      console.log(
        JSON.stringify({
          seed,
          policy,
          layout: result.layout,
          prep: result.preparationSeconds,
          study: result.studySeconds,
          alive: result.alive,
          hp: result.hp,
          breaches: result.breaches,
          usableStationarySeconds: result.usableStationarySeconds,
          maxDefenseAttackGapSeconds: result.maxDefenseAttackGapSeconds,
          defensePressureContinuous: result.defensePressureContinuous,
          elapsedMs: result.elapsedMs,
        }),
      );
    } catch (error) {
      const failure = {
        seed,
        policy,
        error: String(error),
        elapsedMs: Math.round(performance.now() - cpuStart),
      };
      reports.push(failure);
      console.log(JSON.stringify(failure));
    }
    writeFileSync(
      output,
      JSON.stringify(
        {
          configuration: {
            seeds,
            policies,
            stepSeconds: DEFENSE_STEP_SECONDS,
            preparationMaximumStepSeconds: DEFENSE_STEP_SECONDS,
            driverFiles,
            shelfHP: FURNITURE.shelf.hp,
            curriculumSourceHash: roadmap.sourceHash,
            physicsSha256,
            fingerprintSchema: fingerprint.schema,
            fingerprintedFiles: fingerprint.files,
            pressureCriterion:
              "No gap longer than 45 seconds without damage to the human, entrance gate or prepared room assembly; unrelated floor-zero furniture damage is measured separately",
          },
          assumptions: [
            "one human; no NPC interference or assistance",
            "normal speeds/damage and seeded recurring Surge",
            "legal outside-only spawns and physical traversal",
            "continuous known-location pursuit is deliberately enforced after preparation",
            "preparation uses normal movement, grab/push/pull, door and vault APIs; no geometry/HP teleport or answer completion",
            "stationary physically usable terminal time, not actual human cognition, native tutoring, question completion or learning evidence",
            "fixed ordinary layer choices with position offsets and initial misalignment; not proof of arbitrary novice placement or full-population balance",
          ],
          reports,
        },
        null,
        2,
      ),
    );
  }

if (
  reports.some(
    (report) =>
      "error" in report ||
      (report.policy === "layered" &&
        (!report.alive ||
          report.studySeconds < 1800 ||
          !report.defensePressureContinuous ||
          report.usableStationarySeconds < 1800 ||
          report.maximumSimulationStepSeconds > DEFENSE_STEP_SECONDS ||
          report.humanEvidence !== 0 ||
          report.humanVisits !== 0)),
  )
)
  process.exitCode = 1;
