import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { TestRunner } from "../src/gametest/runner";
import { emptyScenario } from "../src/gametest/schema";
import { type Roadmap, FURNITURE, type FurnitureKind } from "../src/model";
import { vault } from "../src/engine";
const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
for (const kind of [
  "chair",
  "desk",
  "sofa",
  "fridge",
  "shelf",
] as FurnitureKind[])
  for (const angle of [0, 45, 90])
    test(`Space crosses ${kind} at ${angle} degrees using actual body contacts`, () => {
      const s = emptyScenario(),
        spec = FURNITURE[kind],
        r = (angle * Math.PI) / 180;
      s.maxTicks = 60;
      s.entities = [
        {
          id: "human",
          kind: "player",
          x: 12 - Math.cos(r) * (spec.w / 2 + 0.5),
          y: 12 - Math.sin(r) * (spec.w / 2 + 0.5),
          heading: { x: Math.cos(r), y: Math.sin(r) },
        },
        { id: "prop", kind, x: 12, y: 12, angle },
      ];
      const runner = new TestRunner(s, roadmap),
        g = runner.game,
        a = g.survivors[0];
      assert.equal(vault(g, a), true);
      runner.run();
      assert.equal(a.vault, undefined);
      assert.ok(
        (a.x - 12) * Math.cos(r) + (a.y - 12) * Math.sin(r) > spec.w / 2 + 0.4,
      );
      assert.equal(g.floors[0].furniture[0].hp, spec.hp);
    });
test("vaults reject real walls, closed doors and occupied landings even across a furniture cluster", () => {
  for (const obstacle of ["wall", "door", "npc"]) {
    const s = emptyScenario();
    s.entities = [
      { id: "human", kind: "player", x: 9, y: 12.5, heading: { x: 1, y: 0 } },
      { id: "prop", kind: "desk", x: 10.5, y: 12.5 },
    ];
    const runner = new TestRunner(s, roadmap),
      g = runner.game;
    if (obstacle === "wall") g.floors[0].tiles[12][11] = 1;
    if (obstacle === "door")
      g.floors[0].furniture.push({
        ...g.floors[0].furniture[0],
        id: "door",
        kind: "door",
        x: 11.5,
        w: 0.12,
        h: 3,
        open: false,
      });
    if (obstacle === "npc")
      g.survivors.push({ ...g.survivors[0], id: "blocking-npc", x: 12.15 });
    assert.equal(vault(g, g.survivors[0]), false, obstacle);
  }
});
for (const count of [3, 4, 8, 32])
  test(`Space crosses ${count} successive props and lands beyond the entire group`, () => {
    const s = emptyScenario();
    s.maxTicks = 90;
    s.entities = [
      { id: "human", kind: "player", x: 4, y: 12.5, heading: { x: 1, y: 0 } },
      ...Array.from({ length: count }, (_, i) => ({
        id: `chair-${i}`,
        kind: "chair" as const,
        x: 5 + i * 0.85,
        y: 12.5,
      })),
    ];
    const runner = new TestRunner(s, roadmap),
      a = runner.game.survivors[0];
    assert.equal(vault(runner.game, a), true);
    assert.equal(a.vault!.obstacles!.length, count);
    runner.run();
    assert.equal(a.vault, undefined);
    assert.ok(a.x > 5 + (count - 1) * 0.85 + 0.9);
    assert.ok(runner.game.floors[0].furniture.every((o) => o.hp === o.maxHp));
  });
test("a safe gap ends a chain vault before unrelated furniture farther ahead", () => {
  const s = emptyScenario();
  s.entities = [
    { id: "human", kind: "player", x: 4, y: 12.5, heading: { x: 1, y: 0 } },
    { id: "first", kind: "chair", x: 5, y: 12.5 },
    { id: "distant", kind: "chair", x: 10, y: 12.5 },
  ];
  const r = new TestRunner(s, roadmap);
  assert.equal(vault(r.game, r.game.survivors[0]), true);
  assert.deepEqual(r.game.survivors[0].vault!.obstacles, ["first"]);
  assert.ok(r.game.survivors[0].vault!.to.x < 7);
});
test("long chains cannot carry a survivor through a wall or out of the floor", () => {
  for (const wallX of [10, 42]) {
    const s = emptyScenario();
    s.entities = [
      { id: "human", kind: "player", x: 4, y: 12.5, heading: { x: 1, y: 0 } },
      ...Array.from({ length: wallX === 10 ? 8 : 46 }, (_, i) => ({
        id: `chair-${i}`,
        kind: "chair" as const,
        x: 5 + i * 0.85,
        y: 12.5,
      })),
    ];
    const r = new TestRunner(s, roadmap);
    r.game.floors[0].tiles[12][wallX] = 1;
    assert.equal(vault(r.game, r.game.survivors[0]), false);
  }
});
