import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { gameFingerprint } from "./lib/game-fingerprint";
import { parallelPreparation } from "./lib/parallel-preparation";
import { sha256 } from "./lib/digest.mjs";
const r = JSON.parse(readFileSync("public/curriculum.json", "utf8"));
const cases = [0, 1, 2].map((seed) => {
  const serial = parallelPreparation(r, seed, false),
    parallel = parallelPreparation(r, seed, true);
  assert.ok(parallel.seconds < serial.seconds);
  assert.ok(parallel.overlapFrames > 0);
  assert.equal(serial.overlapFrames, 0);
  for (let i = 0; i < 2; i++) {
    assert.ok(
      Math.abs(serial.jobs[i].final.x - parallel.jobs[i].final.x) < 0.025,
    );
    assert.ok(
      Math.abs(serial.jobs[i].final.y - parallel.jobs[i].final.y) < 0.025,
    );
    assert.equal(serial.jobs[i].final.hp, parallel.jobs[i].final.hp);
  }
  return {
    seed,
    serial,
    parallel,
    savedSeconds: serial.seconds - parallel.seconds,
  };
});
const report = {
  source: gameFingerprint(),
  scope:
    "Controlled autonomous NPC preparation in two generated rooms, no enemies or study assessment. Same workers staged at each job in both policies; serial activates second only after first finishes, so excludes transfer travel. Escaped flags park fixture workers, never count helicopter rescues. Not full-population balance or human strategy evidence.",
  drivers: [
    "scripts/lib/parallel-preparation.ts",
    "scripts/benchmark-parallel-preparation.ts",
  ].map((path) => ({
    path,
    sha256: sha256(readFileSync(path)),
  })),
  cases,
};
writeFileSync(
  "docs/evidence/parallel-preparation.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    cases.map((c) => ({
      seed: c.seed,
      serial: c.serial.seconds,
      parallel: c.parallel.seconds,
      saved: c.savedSeconds,
      overlapFrames: c.parallel.overlapFrames,
    })),
  ),
);
