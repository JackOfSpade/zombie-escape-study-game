import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { human } from "../src/engine";
import { TestRunner } from "../src/gametest/runner";
import { emptyScenario } from "../src/gametest/schema";
import type { Roadmap } from "../src/model";
import { rememberVisibleTiles } from "../src/render";
import { playerCanSee, sightRadius } from "../src/visibility";

const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
function fixture() {
  const scenario = emptyScenario();
  scenario.entities = [{ id: "human", kind: "player", x: 12.5, y: 12.5 }];
  return new TestRunner(scenario, roadmap).game;
}

test("tile memory samples transient sight without drawing a minimap", () => {
  const game = fixture(),
    a = human(game),
    floor = game.floors[0];
  a.seen = [];
  const expected: string[] = [];
  for (let y = 0; y < floor.tiles.length; y++)
    for (let x = 0; x < floor.tiles[y].length; x++)
      if (
        playerCanSee(floor, a, { x: x + 0.5, y: y + 0.5 }, sightRadius(floor))
      )
        expected.push(`tile-0-${x}-${y}`);
  rememberVisibleTiles(game);
  assert.deepEqual(a.seen, expected);
  assert.ok(a.seen.includes("tile-0-12-12"));
  a.x = 30.5; // A later frame can no longer see the briefly exposed tiles.
  rememberVisibleTiles(game);
  assert.ok(a.seen.includes("tile-0-12-12"));
  assert.ok(a.seen.includes("tile-0-30-12"));
  const count = a.seen.length;
  rememberVisibleTiles(game);
  assert.equal(
    a.seen.length,
    count,
    "repeated frame samples do not duplicate IDs",
  );
  assert.equal(new Set(a.seen).size, count);
});

test("tile memory follows restored arrays and floor changes but never spectators", () => {
  const game = fixture(),
    a = human(game);
  rememberVisibleTiles(game);
  a.seen = ["existing-memory"];
  rememberVisibleTiles(game);
  assert.ok(a.seen.includes("existing-memory"));
  assert.ok(a.seen.includes("tile-0-12-12"));
  game.floors[1] = { ...game.floors[0], index: 1 };
  a.floor = 1;
  rememberVisibleTiles(game);
  assert.ok(a.seen.includes("tile-1-12-12"));
  const before = [...a.seen];
  game.status = "dead";
  a.x = 30.5;
  rememberVisibleTiles(game);
  assert.deepEqual(a.seen, before);
});
