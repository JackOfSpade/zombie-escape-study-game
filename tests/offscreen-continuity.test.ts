import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ensureProblem } from "../src/ai";
import { stairs, step } from "../src/engine";
import type { Game, Roadmap } from "../src/model";
import { decode, encode, recover } from "../src/persistence";
import { createGame } from "../src/world";

const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
function advance(g: Game, seconds: number) {
  for (let i = 0; i < seconds * 30; i++) step(g, 1 / 30);
}
function physicalWorld(g: Game) {
  return JSON.parse(
    JSON.stringify({
      time: g.time,
      rng: g.rng,
      spawned: g.spawned,
      nextSpawn: g.nextSpawn,
      zombies: g.zombies,
      floors: g.floors,
      events: g.events,
      surge: g.surge,
      helicopter: g.helicopter,
      survivors: g.survivors,
    }),
  );
}
for (const seed of [11, 42, 1337])
  test(`A04 offscreen siege and outside reinforcements continue exactly across reload and a return flight (seed ${seed})`, async () => {
    const g = createGame(seed, roadmap),
      a = g.survivors[0],
      f = g.floors[0],
      gate = f.furniture.find((o) => o.id === "main-gate")!,
      e = g.encounters[f.stations[0].encounter];
    // Controlled stair credential isolates offscreen simulation, not academic success.
    g.status = "playing";
    g.survivors = [a];
    a.access = [0];
    Object.assign(a, f.stairs);
    await ensureProblem(g, e, roadmap);
    const question = JSON.stringify(e.problem),
      topology = JSON.stringify(f.tiles),
      stations = JSON.stringify(f.stations),
      learning = JSON.stringify(g.study);
    assert.equal(stairs(g, a), true);
    advance(g, 2);
    assert.equal(a.floor, 1);
    // The human is upstairs and supplies no omniscient destination. A native
    // lure outside the entrance gives the offscreen siege a real sensory cue.
    g.effects.push({
      kind: "decoy",
      floor: 0,
      x: gate.x,
      y: gate.y + gate.h / 2 + 0.25,
      radius: 10,
      until: g.time + 20,
    });
    advance(g, 18);
    assert.equal(g.status, "playing");
    assert.ok(g.zombies.length > 0);
    assert.ok(g.zombies.every((z) => z.origin === "outside"));
    assert.ok(gate.hp < gate.maxHp, "unseen entrance is actually under attack");
    const savedHp = gate.hp,
      savedBirths = g.spawned,
      savedIds = g.zombies.map((z) => z.id),
      savedPositions = g.zombies.map(({ id, x, y, floor }) => ({
        id,
        x,
        y,
        floor,
      })),
      restored = recover(decode(encode(g)));
    assert.deepEqual(physicalWorld(restored), physicalWorld(g));
    for (let i = 0; i < 20 * 30; i++) {
      step(g, 1 / 30);
      step(restored, 1 / 30);
    }
    assert.deepEqual(physicalWorld(restored), physicalWorld(g));
    const damaged = restored.floors[0].furniture.find((o) => o.id === gate.id)!;
    assert.ok(damaged.hp < savedHp, "offscreen attacks do not reset on reload");
    assert.ok(restored.spawned > savedBirths, "the outside inflow still runs");
    assert.ok(
      savedIds.every((id) => restored.zombies.some((z) => z.id === id)),
    );
    assert.notDeepEqual(
      restored.zombies
        .filter((z) => savedIds.includes(z.id))
        .map(({ id, x, y, floor }) => ({ id, x, y, floor })),
      savedPositions,
      "existing enemies physically advance instead of resetting",
    );
    const beforeReturnHp = damaged.hp;
    assert.equal(stairs(restored, restored.survivors[0], true), true);
    advance(restored, 2);
    assert.equal(restored.survivors[0].floor, 0);
    assert.ok(damaged.hp <= beforeReturnHp);
    assert.equal(JSON.stringify(restored.floors[0].tiles), topology);
    assert.equal(JSON.stringify(restored.floors[0].stations), stations);
    assert.equal(JSON.stringify(restored.encounters[e.id].problem), question);
    assert.equal(JSON.stringify(restored.study), learning);
    assert.equal(
      restored.zombies.every((z) => z.origin === "outside"),
      true,
    );
    assert.equal(
      restored.floors[0].furniture.filter((o) => o.id === gate.id).length,
      1,
    );
  });
