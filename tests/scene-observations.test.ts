import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { propWorldPose, type ResolvedSceneProp } from "../src/authored-scene";
import { type Roadmap } from "../src/model";
import { makeFurniture } from "../src/office-layout";
import {
  buildNpcChatterContext,
  npcDialogueFactsStillRelevant,
} from "../src/npc-chatter";
import {
  observableSceneDetails,
  sceneLookDescription,
} from "../src/scene-observations";
import { createGame } from "../src/world";

const roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
) as Roadmap;
function fixture() {
  const game = createGame(42, roadmap),
    floor = game.floors[0],
    desk = makeFurniture("synthetic-desk", 0, "desk", { x: 10.5, y: 10.5 }, 0),
    prop: ResolvedSceneProp = {
      id: "synthetic-note",
      designId: "note",
      furnitureId: desk.id,
      room: 2,
      kind: "note",
      x: -0.2,
      y: 0,
      top: 0.855,
      w: 0.22,
      d: 0.24,
      h: 0.008,
      angle: 0,
      scale: 1,
      color: "#eeeecc",
      accent: "#224433",
      condition: "worn",
      owner: game.survivors[1].name,
      label: "The seed collection",
      text: "Bring the blue envelope upstairs.",
    };
  floor.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
  floor.furniture = [desk];
  floor.stations = [];
  delete floor.generation;
  floor.scene = {
    version: 1,
    catalogVersion: 1,
    rooms: [],
    furniture: [],
    props: [prop],
  };
  game.status = "playing";
  game.zombies = [];
  game.events = [];
  for (const actor of game.survivors) {
    actor.x = 9;
    actor.y = 10.5;
    actor.floor = 0;
    actor.activity = "exploring";
    actor.heading = { x: 1, y: 0 };
  }
  return {
    game,
    floor,
    desk,
    prop,
    human: game.survivors[0],
    npc: game.survivors[1],
  };
}

test("nearby object captions use the actual gaze and follow a moved and rotated support", () => {
  const { game, floor, desk, prop, human } = fixture();
  const look = () => {
    const pose = propWorldPose(floor, prop)!;
    return sceneLookDescription(
      game,
      Math.atan2(pose.y - human.y, pose.x - human.x),
      Math.atan2(
        pose.elevation + prop.h * 0.5 - 1.6,
        Math.hypot(pose.x - human.x, pose.y - human.y),
      ),
    );
  };
  assert.match(look(), /The seed collection/);
  assert.match(look(), /blue envelope upstairs/);
  assert.equal(sceneLookDescription(game, Math.PI, 0), "");
  desk.y += 1;
  desk.angle = Math.PI / 2;
  human.y += 1;
  assert.match(look(), /The seed collection/);
  desk.destroyed = true;
  assert.equal(sceneLookDescription(game, 0, -0.5), "");
  assert.deepEqual(observableSceneDetails(game, human), []);
});

test("walls, solid furniture, distance and a high shelf prevent remote or through-object reading", () => {
  const { game, floor, desk, human } = fixture();
  assert.equal(observableSceneDetails(game, human).length, 1);
  floor.tiles[10][9] = 1;
  assert.deepEqual(observableSceneDetails(game, human), []);
  floor.tiles[10][9] = 0;
  floor.furniture.push(
    makeFurniture("opaque-cabinet", 0, "fridge", { x: 9.7, y: 10.5 }, 0),
  );
  assert.deepEqual(observableSceneDetails(game, human), []);
  floor.furniture.pop();
  human.x = 5;
  assert.deepEqual(observableSceneDetails(game, human), []);
  human.x = 9;
  desk.kind = "shelf";
  floor.scene!.props[0].top = 1.855;
  assert.deepEqual(observableSceneDetails(game, human), []);
});

test("NPC dialogue receives only current readable inscriptions and revalidates them after movement or destruction", () => {
  const { game, floor, desk, npc } = fixture();
  const request = buildNpcChatterContext(game, npc, "scene-observation-test");
  const fact = request.dialogue!.facts.find(
    (f) => f.id === "scene.prop:synthetic-note",
  );
  assert.ok(fact);
  assert.match(fact.text, /blue envelope/);
  assert.equal(npcDialogueFactsStillRelevant(game, request, [fact.id]), true);
  desk.destroyed = true;
  assert.equal(npcDialogueFactsStillRelevant(game, request, [fact.id]), false);
  desk.destroyed = false;
  desk.x = 30;
  assert.equal(npcDialogueFactsStillRelevant(game, request, [fact.id]), false);
  assert.ok(
    !buildNpcChatterContext(game, npc, "remote").dialogue!.facts.some((f) =>
      f.id.startsWith("scene."),
    ),
  );
  floor.furniture = [];
  assert.deepEqual(observableSceneDetails(game, npc), []);
});
