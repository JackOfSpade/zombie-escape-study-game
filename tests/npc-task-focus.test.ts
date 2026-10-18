import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { eligible } from "../src/curriculum";
import { claimStation, releaseStation, step } from "../src/engine";
import type { Roadmap } from "../src/model";
import { decode, encode, recover } from "../src/persistence";
import { createGame } from "../src/world";
const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
test("E03 a displaced NPC works on only its current task; abandoned work stays exact across another task, return and reload", () => {
  const g = createGame(7, roadmap),
    f = g.floors[0],
    a = g.survivors[1],
    h = g.survivors[0];
  const ids = ["f0-room0", "f0-room1"];
  f.furniture = [];
  f.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
  f.stations = ids.map((id, i) => ({
    ...f.stations.find((s) => s.encounter === id)!,
    x: 10 + i * 4,
    y: 10,
  }));
  g.survivors = [h, a];
  g.status = "playing";
  g.zombies = [];
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.surge.anchor = Number.MAX_SAFE_INTEGER;
  for (const id of ids) {
    const e = g.encounters[id];
    e.mode = "shared";
    e.reward = "stairs";
    e.humanEngaged = true;
    e.problem = {
      title: "Controlled task focus",
      prompt: `Distinct task ${id}`,
      starter: "",
      rubric: [],
      provenance: "study-mode",
      contract: eligible(roadmap, g.study),
    };
  }
  Object.assign(a, {
    x: 10,
    y: 10,
    intent: ids[0],
    station: f.stations[0].id,
    activity: "studying",
    role: "analyst",
    social: 0.2,
    risk: 0.9,
    seen: f.stations.map((s) => s.id),
  });
  Object.assign(h, { x: 30, y: 20 });
  const tick = (seconds: number) => {
    for (let i = 0; i < seconds * 30; i++) step(g, 1 / 30);
  };
  const evidence = (id: string) => {
    const e = g.encounters[id];
    return JSON.stringify({
      progress: e.npcProgress,
      work: e.npcWork,
      history: e.history.filter((h) => h.kind !== "activity"),
    });
  };
  tick(35);
  assert.ok(g.encounters[ids[0]].npcWork?.length);
  // Controlled seat relinquishment and human arrivals use actual station APIs;
  // the NPC chooses its next task/path. Human arrival routes are not certified.
  releaseStation(a);
  Object.assign(h, { x: 10.9, y: 10 });
  assert.ok(claimStation(g, h, f.stations[0].id));
  const abandonedA = evidence(ids[0]);
  tick(45);
  assert.equal(a.intent, ids[1]);
  assert.ok(g.encounters[ids[1]].npcWork?.length);
  assert.equal(evidence(ids[0]), abandonedA);
  assert.ok(
    g.encounters[ids[0]].history.some(
      (h) =>
        h.kind === "activity" && h.text.includes("left the previous puzzle"),
    ),
  );
  releaseStation(a);
  Object.assign(h, { x: 14.9, y: 10 });
  assert.ok(claimStation(g, h, f.stations[1].id));
  const abandonedB = evidence(ids[1]);
  tick(8);
  assert.equal(a.intent, ids[0]);
  assert.equal(evidence(ids[1]), abandonedB);
  const restored = recover(decode(encode(g))),
    savedB = JSON.stringify(restored.encounters[ids[1]]);
  for (let i = 0; i < 1200; i++) step(restored, 1 / 30);
  assert.equal(restored.survivors[1].intent, ids[0]);
  assert.equal(JSON.stringify(restored.encounters[ids[1]]), savedB);
  assert.deepEqual(restored.survivors[1].access, []);
  assert.equal(restored.study.learner!.evidence.length, 0);
});
