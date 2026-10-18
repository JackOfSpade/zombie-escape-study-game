import assert from "node:assert/strict";
import type { Roadmap } from "../../src/model";
import { distance } from "../../src/model";
import { actor, createGame } from "../../src/world";
import { step } from "../../src/engine";
import { canPlace, solid, path } from "../../src/spatial";

/** Controlled staged workers: serial has no transfer travel, a conservative baseline. */
export function parallelPreparation(
  r: Roadmap,
  seed: number,
  parallel: boolean,
) {
  const g = createGame(seed, r),
    f = g.floors[0];
  const jobs = [0, 1].map((floor, i) => {
    const f = g.floors[floor];
    const room = f.rooms!.find((r) => r.innerMouth)!.index;
    const encounter = `f${floor}-room${room}`;
    const station = f.stations.find(
      (s) => s.encounter === encounter && !solid(f, s),
    )!;
    const worker = actor(`worker${i}`, `Worker ${i}`, i + 1);
    Object.assign(worker, {
      floor,
      role: "builder",
      intent: encounter,
      x: station.x,
      y: station.y,
      seen: [station.id],
    });
    const object = f.furniture.find((o) => o.id === `${encounter}-shelf5`)!;
    const mouth = f.rooms!.find((r) => r.index === room)!.innerMouth!;
    const target = { x: mouth.x + (mouth.x < 22 ? -1.1 : 1.1), y: mouth.y };
    const door = f.doors[room];
    const openGeometry = () => ({
      ...f,
      furniture: f.furniture.map((o) =>
        o.kind === "door" ? { ...o, open: true } : o,
      ),
    });
    assert.ok(
      path(openGeometry(), { x: 21.5, y: door.y }, station).length,
      "initial approach is open when the door is open",
    );
    return {
      floor,
      target,
      station,
      door,
      openGeometry,
      encounter,
      worker,
      object,
      initial: structuredClone(object),
      completedAt: null as number | null,
      movingFrames: 0,
    };
  });
  g.survivors = [g.survivors[0], ...jobs.map((j) => j.worker)];
  g.survivors[0].escaped = true;
  g.status = "playing";
  // Isolate preparation timing from combat and study outcomes. No geometry changes.
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.spawned = 90;
  jobs[1].worker.escaped = !parallel;
  let overlapFrames = 0,
    frames = 0;
  const dt = 1 / 30;
  while (jobs.some((j) => j.completedAt === null) && g.time < 180) {
    const before = jobs.map((j) => ({ x: j.object.x, y: j.object.y }));
    step(g, dt);
    frames++;
    let moving = 0;
    for (const [i, j] of jobs.entries()) {
      const moved = distance(before[i], j.object);
      assert.ok(
        moved <= j.object.speed * dt + 1e-7,
        "independent jobs receive no helper speed bonus",
      );
      assert.ok(canPlace(g.floors[j.floor], j.object, j.object));
      assert.equal(
        solid(g.floors[j.floor], j.worker),
        false,
        JSON.stringify({
          seed,
          parallel,
          time: g.time,
          id: j.encounter,
          parked: j.worker.escaped,
          x: j.worker.x,
          y: j.worker.y,
          plan: j.worker.defensePlan,
        }),
      );
      assert.equal(j.object.hp, j.initial.hp, "no durability bonus");
      if (moved > 1e-7) {
        j.movingFrames++;
        moving++;
      }
      if (j.completedAt === null && distance(j.object, j.target) < 0.025) {
        assert.equal(
          path(j.openGeometry(), { x: 21.5, y: j.door.y }, j.station).length,
          0,
          "furniture itself seals the approach",
        );
        j.completedAt = g.time;
        // Completed workers stop: no puzzle solving or unrelated later activity.
        j.worker.escaped = true;
        if (!parallel && i === 0) jobs[1].worker.escaped = false;
      }
    }
    if (moving === 2) overlapFrames++;
  }
  assert.ok(
    jobs.every((j) => j.completedAt !== null),
    JSON.stringify(
      jobs.map((j) => ({
        id: j.encounter,
        plan: j.worker.defensePlan,
        x: j.worker.x,
        y: j.worker.y,
      })),
    ),
  );
  assert.equal(g.study.learner!.evidence.length, 0);
  assert.equal(g.study.visits.length, 0);
  assert.ok(g.survivors.every((a) => a.access.length === 0));
  assert.equal(
    g.stats.rescued,
    0,
    "escaped flags only park controlled fixture workers, not extraction",
  );
  return {
    seed,
    mode: parallel ? "parallel" : "serial staged workers",
    seconds: g.time,
    frames,
    stepSeconds: dt,
    overlapFrames,
    humanEvidence: 0,
    humanVisits: 0,
    defenseEvents: g.events
      .filter((e) => e.type === "defense")
      .map((e) => ({
        type: e.type,
        at: e.at,
        actor: e.actor,
        encounter: e.encounter,
      })),
    jobs: jobs.map((j) => ({
      id: j.encounter,
      target: j.target,
      completedAt: j.completedAt,
      movingFrames: j.movingFrames,
      initial: { x: j.initial.x, y: j.initial.y, hp: j.initial.hp },
      final: { x: j.object.x, y: j.object.y, hp: j.object.hp },
      credited: j.object.credited,
    })),
  };
}
