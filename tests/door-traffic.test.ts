import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { doorwayMotion } from "../src/door-traffic";
import { TestRunner } from "../src/gametest/runner";
import { emptyScenario } from "../src/gametest/schema";
import { type Point, type Roadmap, W, H } from "../src/model";
import { survivorPath, walkSegment } from "../src/navigation";
import { beginPhysics, physicsMove, finishPhysics } from "../src/physics";
const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);

for (const vertical of [false, true])
  test(`opposing streams use a ${vertical ? "vertical" : "horizontal"} opening without a doorway scrum`, () => {
    const s = emptyScenario();
    Object.assign(s, { rules: "force-fields", simulation: "physics" });
    const point = (along: number, normal: number): Point =>
      vertical ? { x: normal + 5, y: along - 5 } : { x: along, y: normal };
    s.entities = [
      { id: "human", kind: "player", x: 3.5, y: 3.5 },
      {
        id: "door",
        kind: "door",
        ...point(21.5, 16.5),
        w: vertical ? 1 : 3,
        h: vertical ? 3 : 1,
        forceField: "green",
      },
      ...[1, -1].flatMap((side) =>
        Array.from({ length: 3 }, (_, i) => ({
          id: `stream-${side}-${i}`,
          kind: "npc" as const,
          ...point(20.8 + i * 0.7, 16.5 + side * 2.5),
        })),
      ),
    ];
    const rows = Array.from({ length: H }, (_, y) =>
      Array.from({ length: W }, (_, x) => {
        const wall = vertical
          ? x === 21 && (y < 15 || y > 17)
          : y === 16 && (x < 20 || x > 22);
        return wall || x === 0 || y === 0 || x === W - 1 || y === H - 1
          ? "#"
          : ".";
      }).join(""),
    );
    s.maps = [{ floor: 0, rows }];
    const g = new TestRunner(s, roadmap).game;
    const actors = g.survivors.slice(1);
    const goals = actors.map((_, i) =>
      point(20.8 + (i % 3) * 0.7, 16.5 - (i < 3 ? 1 : -1) * 5),
    );
    for (let tick = 0; tick < 240; tick++) {
      g.time += 1 / 30;
      for (const [i, a] of actors.entries()) a.navTarget = goals[i];
      beginPhysics(g);
      for (const [i, a] of actors.entries()) {
        const goal = goals[i];
        if (Math.hypot(a.x - goal.x, a.y - goal.y) < 0.15) continue;
        a.path = survivorPath(g.floors[0], a, goal);
        const motion = doorwayMotion(g, a, goal);
        let next = motion?.point;
        if (!next)
          for (const p of a.path.slice(0, 8)) {
            if (p.action) break;
            if (walkSegment(g.floors[0], a, p)) next = p;
          }
        if (!next) continue;
        const d = Math.hypot(next.x - a.x, next.y - a.y);
        const amount = Math.min(
          a.speed / 30,
          d,
          motion?.forwardLimit ?? Infinity,
        );
        a.heading = {
          x: (next.x - a.x) / (d || 1),
          y: (next.y - a.y) / (d || 1),
        };
        physicsMove(g, a, a.heading.x * amount, a.heading.y * amount, !motion);
      }
      finishPhysics(g, 1 / 30);
      for (let i = 0; i < actors.length; i++)
        for (const b of actors.slice(i + 1))
          assert.ok(Math.hypot(actors[i].x - b.x, actors[i].y - b.y) >= 0.495);
    }
    for (const [i, a] of actors.entries())
      assert.ok(
        Math.hypot(a.x - goals[i].x, a.y - goals[i].y) < 0.5,
        JSON.stringify({
          id: a.id,
          x: a.x,
          y: a.y,
          goal: goals[i],
          portal: a.doorTraffic,
        }),
      );
  });

test("a closed personal field cancels its approach without granting entry or consuming keys", () => {
  const s = emptyScenario();
  Object.assign(s, { rules: "force-fields" });
  s.entities = [
    { id: "human", kind: "player", x: 3.5, y: 3.5 },
    { id: "worker", kind: "npc", x: 21.5, y: 19 },
    {
      id: "door",
      kind: "door",
      x: 21.5,
      y: 16.5,
      w: 3,
      h: 1,
      forceField: "green",
      freeLimit: 1,
    },
  ];
  const g = new TestRunner(s, roadmap).game,
    a = g.survivors[1],
    goal = { x: 21.5, y: 13 };
  a.path = [goal];
  assert.ok(doorwayMotion(g, a, goal));
  const field = g.floors[0].furniture.find((o) => o.id === "door")!.field!;
  field.used = 1;
  assert.equal(doorwayMotion(g, a, goal), undefined);
  assert.equal(a.doorTraffic, undefined);
  assert.equal(a.keys, 0);
  assert.deepEqual(field.authorized, []);
  const door = g.floors[0].furniture.find((o) => o.id === "door")!;
  door.destroyed = true;
  door.hp = 0;
  assert.ok(
    doorwayMotion(g, a, goal),
    "a broken field still leaves a physical doorway to negotiate",
  );
});
