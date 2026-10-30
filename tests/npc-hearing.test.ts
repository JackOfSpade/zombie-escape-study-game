import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { TestRunner } from "../src/gametest/runner";
import { emptyScenario } from "../src/gametest/schema";
import type { Roadmap } from "../src/model";
import {
  NPC_SPEECH_HEARING_RANGE,
  npcCanHearSpeech,
  npcSpeechHearingRange,
} from "../src/npc-hearing";

const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
function fixture() {
  const scenario = emptyScenario();
  scenario.entities = [
    { id: "human", kind: "player", x: 9, y: 15 },
    { id: "speaker", kind: "npc", x: 10, y: 15 },
    { id: "listener", kind: "npc", x: 14, y: 15 },
  ];
  const g = new TestRunner(scenario, roadmap).game;
  return {
    g,
    source: g.survivors.find((a) => a.id === "speaker")!,
    listener: g.survivors.find((a) => a.id === "listener")!,
  };
}

test("speech audibility has bounded delivery-specific distance using a real synthetic world", () => {
  const { g, source, listener } = fixture();
  assert.deepEqual(NPC_SPEECH_HEARING_RANGE, {
    whisper: 4,
    calm: 10,
    relieved: 10,
    urgent: 14,
  });
  assert.equal(npcSpeechHearingRange(), 10);
  for (const delivery of ["whisper", "calm", "relieved", "urgent"] as const) {
    const radius = npcSpeechHearingRange(delivery);
    listener.x = source.x + radius;
    assert.equal(
      npcCanHearSpeech(g, listener, source, delivery),
      true,
      `${delivery} at its radius`,
    );
    listener.x += 0.01;
    assert.equal(
      npcCanHearSpeech(g, listener, source, delivery),
      false,
      `${delivery} past its radius`,
    );
  }
  listener.x = source.x + 8;
  assert.equal(npcCanHearSpeech(g, listener, source, "whisper"), false);
  assert.equal(npcCanHearSpeech(g, listener, source), true);
  listener.x = source.x + 12;
  assert.equal(npcCanHearSpeech(g, listener, source), false);
  assert.equal(npcCanHearSpeech(g, listener, source, "urgent"), true);
});

test("a sealed acoustic boundary blocks even nearby urgent speech and an actual opening restores it", () => {
  const { g, source, listener } = fixture(),
    f = g.floors[0];
  assert.equal(npcCanHearSpeech(g, listener, source, "whisper"), true);
  for (let y = 0; y < f.tiles.length; y++) f.tiles[y][12] = 1;
  assert.equal(npcCanHearSpeech(g, listener, source, "urgent"), false);
  f.tiles[15][12] = 0;
  assert.equal(npcCanHearSpeech(g, listener, source, "whisper"), true);
});

test("hearing requires current living world members on the same floor and outside stairs", () => {
  for (const change of [
    "dead-listener",
    "dead-source",
    "escaped-listener",
    "escaped-source",
    "different-floor",
    "invalid-floor",
    "listener-stairs",
    "source-stairs",
    "foreign-source",
    "foreign-listener",
  ] as const) {
    const { g, source, listener } = fixture();
    assert.equal(npcCanHearSpeech(g, listener, source), true, change);
    if (change === "dead-listener") listener.alive = false;
    else if (change === "dead-source") source.alive = false;
    else if (change === "escaped-listener") listener.escaped = true;
    else if (change === "escaped-source") source.escaped = true;
    else if (change === "different-floor") listener.floor = 1;
    else if (change === "invalid-floor") source.floor = listener.floor = 99;
    else if (change === "listener-stairs" || change === "source-stairs") {
      const a = change === "listener-stairs" ? listener : source;
      a.stairTravel = {
        fromFloor: 0,
        toFloor: 1,
        origin: { x: a.x, y: a.y },
        destination: { x: a.x, y: a.y },
        until: 100,
      };
    } else if (change === "foreign-source")
      g.survivors = g.survivors.filter((a) => a !== source);
    else g.survivors = g.survivors.filter((a) => a !== listener);
    assert.equal(npcCanHearSpeech(g, listener, source), false, change);
  }
});
