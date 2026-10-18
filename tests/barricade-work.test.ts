import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { actor, createGame } from "../src/world";
import { step } from "../src/engine";
import { distance, type Roadmap } from "../src/model";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));
function scene() {
  const g = createGame(0, r),
    e = g.encounters["f0-room0"],
    o = g.floors[0].furniture.find((o) => o.id === e.id + "-shelf5")!;
  g.status = "playing";
  g.nextSpawn = 1e9;
  g.surge.anchor = 1e9;
  g.survivors[0].escaped = true;
  const movers = [actor("first", "First", 1), actor("second", "Second", 2)];
  for (const [i, a] of movers.entries())
    Object.assign(a, {
      role: "builder",
      intent: e.id,
      x: o.x,
      y: o.y + (i ? 1 : -1) * (o.h / 2 + 0.55),
      defensePlan: {
        encounter: e.id,
        object: o.id,
        target: { x: o.x + (i ? -0.9 : 0.9), y: 8.5 },
        route: [
          { x: o.x, y: 8.5 },
          { x: o.x + (i ? -0.9 : 0.9), y: 8.5 },
        ],
        idle: 0,
      },
    });
  g.survivors.push(...movers);
  return { g, e, o, movers };
}
test("conflicting furniture plans restored from a save resolve to one owner instead of tugging opposite goals", () => {
  const { g, o, movers } = scene();
  step(g, 1 / 30);
  assert.equal(movers.filter((a) => a.defensePlan?.object === o.id).length, 1);
  assert.equal(movers[1].handling, undefined);
  assert.equal(o.hp, o.maxHp);
});
test("walking around an unreachable handling point cannot indefinitely reset furniture-plan progress", () => {
  const { g, o, movers } = scene();
  g.survivors = g.survivors.filter((a) => a !== movers[1]);
  const a = movers[0];
  Object.assign(a, { x: 5.5, y: 6.5 });
  a.defensePlan!.idle = 5.99;
  a.defensePlan!.bestApproach = 0;
  a.defensePlan!.bestDistance = distance(o, a.defensePlan!.route[0]);
  step(g, 1 / 30);
  assert.equal(a.defensePlan, undefined);
  assert.equal(a.handling, undefined);
  assert.ok(a.defenseRetryAt! > g.time);
});
