import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { step } from "../src/engine";
import { FURNITURE, type Furniture, type Roadmap } from "../src/model";
import { createPlayableGame } from "../src/world";

const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);

test("a real approaching zombie attacks a player-built street barricade without needing visible prey", () => {
  const g = createPlayableGame(42, roadmap),
    z = g.zombies[0];
  g.status = "playing";
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.surge.anchor = Number.MAX_SAFE_INTEGER;
  g.survivors = [g.survivors[0]];
  Object.assign(g.survivors[0], { floor: 4, x: 22, y: 15 });
  Object.assign(z, { x: 22, y: 80 });
  delete z.physics;
  g.zombies = [z];
  const spec = FURNITURE.desk;
  const desk: Furniture = {
    id: "street-barricade",
    kind: "desk",
    x: 22,
    y: 75,
    floor: 0,
    w: 4,
    h: 1,
    hp: 1000,
    maxHp: 1000,
    speed: spec.speed,
    rotation: 0,
    destroyed: false,
    movers: [],
    moved: 0,
    credited: [],
    turning: 0,
  };
  g.floors[0].furniture.push(desk);
  for (let i = 0; i < 300; i++) step(g, 1 / 30, { x: 0, y: 0, grab: false });
  assert.ok(
    desk.hp < 1000,
    "the street front damages the actual obstacle instead of freezing",
  );
  assert.ok(
    g.events.some(
      (e) =>
        e.type === "barricade-hit" &&
        e.actor === z.id &&
        (e.position?.y ?? 0) > 70,
    ),
  );
  assert.equal(desk.destroyed, false);
  assert.ok(z.y > 75.5, "the surviving barricade remains physically solid");
  assert.equal(g.survivors[0].hp, 100, "remote prey is not attacked or moved");
});
