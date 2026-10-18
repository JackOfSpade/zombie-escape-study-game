import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parallelPreparation } from "../scripts/lib/parallel-preparation";
const roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));
for (const seed of [0, 1, 2])
  test(`independent NPC barricade jobs on generated floors finish sooner in parallel without bonus durability (seed ${seed})`, () => {
    const serial = parallelPreparation(roadmap, seed, false);
    const parallel = parallelPreparation(roadmap, seed, true);
    assert.ok(parallel.seconds < serial.seconds * 0.7);
    assert.ok(
      parallel.overlapFrames > 300,
      "both objects really move in the same simulation frames",
    );
    assert.equal(serial.overlapFrames, 0);
    assert.equal(parallel.stepSeconds, 1 / 30);
    for (const [i, job] of parallel.jobs.entries()) {
      assert.equal(job.final.hp, serial.jobs[i].final.hp);
      assert.ok(
        Math.hypot(
          job.final.x - serial.jobs[i].final.x,
          job.final.y - serial.jobs[i].final.y,
        ) < 0.05,
        "serial and parallel bracing finish within physical settling tolerance",
      );
      assert.equal(job.final.hp, job.initial.hp);
      assert.ok(job.movingFrames > 100);
    }
    assert.ok(
      parallel.jobs.some((j) => j.credited.length > 0),
      "useful shared defense qualifies without any attackers",
    );
    assert.ok(parallel.defenseEvents.length > 0);
    assert.equal(parallel.humanEvidence, 0);
    assert.equal(parallel.humanVisits, 0);
  });
