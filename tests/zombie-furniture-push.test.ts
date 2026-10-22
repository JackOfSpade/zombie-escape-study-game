import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { step } from "../src/engine";
import { EQUIPMENT } from "../src/equipment";
import { TestRunner } from "../src/gametest/runner";
import { parseScenario } from "../src/gametest/schema";
import type { Roadmap } from "../src/model";

const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
const fixture = (id: string) =>
  parseScenario(readFileSync(`tests/fixtures/gametest/${id}.json`, "utf8"));

/** Replays a checked-in fixture at a display frame rate instead of the lab's
 * fixed 30 Hz. Before the bounded zombie push and real floor friction, the
 * shove grew with frame rate: at 120 Hz four zombies slid this desk aside in
 * about 7 s and eight pushed the fridge out of its doorway. */
function replay(id: string, hz: number, seconds: number) {
  const scenario = fixture(id),
    g = new TestRunner(scenario, roadmap).game,
    o = g.floors[0].furniture[0],
    start = { x: o.x, y: o.y, angle: o.angle ?? 0 };
  let passed = 0,
    shift = 0,
    turn = 0;
  for (let t = 0; t < seconds * hz; t++) {
    // Replay the fixture's real audible lure at the corresponding display tick.
    for (const action of scenario.actions)
      if (
        action.type === "decoy" &&
        Math.round(((action.tick - 1) / 30) * hz) === t
      )
        g.effects.push({
          kind: "decoy",
          floor: action.floor,
          x: action.x,
          y: action.y,
          radius: EQUIPMENT.decoy.radius,
          until: g.time + EQUIPMENT.decoy.seconds,
        });
    step(g, 1 / hz, { x: 0, y: 0, grab: false });
    g.survivors[0].hp = 100;
    shift = Math.max(shift, Math.hypot(o.x - start.x, o.y - start.y));
    turn = Math.max(turn, Math.abs((o.angle ?? 0) - start.angle));
    passed = Math.max(
      passed,
      g.zombies.filter((z) => z.hp > 0 && z.x > 23.4).length,
    );
  }
  return { passed, shift, turn, hp: o.hp, maxHp: o.maxHp };
}

for (const hz of [30, 60, 120]) {
  test(`heavy furniture holds a pressing crowd at ${hz} Hz`, () => {
    const fridge = replay("heavy-furniture-holds-crowd", hz, 40);
    assert.equal(fridge.passed, 0, JSON.stringify(fridge));
    assert.ok(fridge.shift < 0.03, JSON.stringify(fridge));
    assert.ok(fridge.hp < fridge.maxHp, "zombies attack instead");
    const desk = replay("desk-blocks-crowd", hz, 40);
    assert.equal(desk.passed, 0, JSON.stringify(desk));
    assert.ok(desk.shift < 0.05 && desk.turn < 0.05, JSON.stringify(desk));
  });
  test(`one zombie shoves a chair out of a doorway at ${hz} Hz`, () => {
    const chair = replay("zombie-shoves-chair", hz, 15);
    assert.ok(chair.shift > 0.4, JSON.stringify(chair));
    assert.equal(chair.passed, 1, JSON.stringify(chair));
    assert.ok(chair.hp > 0, "shoved, not destroyed");
  });
}
