import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { nearbyDoor, step, toggleDoor } from "../src/engine";
import { decode, encode } from "../src/persistence";
import { RunLogs } from "../src/run-logs";
import { createGame } from "../src/world";
import type { Roadmap } from "../src/model";
const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
function replay() {
  const g = createGame(1137190675, roadmap),
    a = g.survivors[0];
  g.status = "playing";
  g.survivors = [a];
  g.zombies = [];
  g.nextSpawn = 1e9;
  g.surge.anchor = 1e9;
  for (let i = 0; i < 96; i++) step(g, 1 / 30);
  return {
    g,
    a,
    gate: g.floors[0].furniture.find((o) => o.id === "main-gate")!,
  };
}
test("the entrance is physical from creation: E releases, real motion swings and enters", () => {
  const { g, a, gate } = replay();
  assert.equal(gate.turning, 0);
  assert.equal(gate.kind, "door");
  Object.assign(a, { x: 22.1197889474316, y: 29.144842656013676 });
  assert.equal(nearbyDoor(g, a)?.id, gate.id);
  const hp = gate.hp;
  assert.ok(toggleDoor(g, a, gate.id));
  assert.equal(gate.kind, "door");
  assert.equal(gate.door?.latched, false);
  assert.equal(gate.angle, 0);
  assert.equal(gate.hp, hp);
  for (let i = 0; i < 45; i++) step(g, 1 / 30, { x: 0, y: -1, grab: false });
  assert.ok(
    Math.abs(gate.angle ?? 0) > 0.1,
    "contact supplies the swing, not E animation",
  );
  assert.ok(a.y < 27.8, `actually inside: ${a.y}`);
  const saved = decode(encode(g));
  const restored = saved.floors[0].furniture.find((o) => o.id === gate.id)!;
  assert.equal(restored.door?.latched, false);
  assert.equal(restored.angle, gate.angle);
});
test("the entrance is latched from creation, rejects remote E and accepts nearby NPCs", () => {
  const { g, a, gate } = replay();
  assert.equal(gate.door?.latched, true);
  Object.assign(a, { x: 5, y: 5 });
  assert.equal(toggleDoor(g, a, gate.id), false);
  const npc = createGame(1, roadmap).survivors[1];
  Object.assign(npc, { x: 22, y: 29.4 });
  g.survivors.push(npc);
  assert.equal(toggleDoor(g, npc, gate.id), true);
  assert.equal(gate.door?.latched, false);
  assert.equal(gate.angle, 0);
  assert.equal(
    g.events.some((e) => e.type === "entrance-close"),
    false,
  );
});
test("an old saved closed entrance upgrades on load without changing its damage or player learning state", () => {
  const { g, a, gate } = replay();
  gate.hp = 123;
  gate.kind = "gate";
  gate.door = undefined;
  Object.assign(gate, { x: 22, y: 28.5, w: 2, h: 1, turning: 0 });
  const restored = decode(encode(g)),
    human = restored.survivors[0];
  Object.assign(human, { x: 22, y: 29.4 });
  const learning = JSON.stringify(restored.study);
  assert.ok(toggleDoor(restored, human, gate.id));
  assert.equal(
    restored.floors[0].furniture.find((o) => o.id === gate.id)?.hp,
    123,
  );
  assert.equal(JSON.stringify(restored.study), learning);
  assert.equal(a.alive, true);
});
test("diagnostics include the intact physical entrance even before damage or movement", () => {
  const g = createGame(1137190675, roadmap);
  g.status = "playing";
  const logs = new RunLogs({ read: async () => null, write: async () => {} });
  logs.capture(g, true);
  const data = JSON.parse(logs.export()).runs[0].entries.find(
    (e: { type: string }) => e.type === "snapshot",
  ).data;
  const gate = data.furniture.find((o: { id: string }) => o.id === "main-gate");
  assert.equal(gate.kind, "door");
  assert.equal(gate.turning, 0);
  assert.equal(gate.hp, 600);
});
test("fresh runs have no spawns for ten simulation seconds, including pause, reload and overdue legacy deadlines", () => {
  let g = createGame(7, roadmap);
  g.status = "playing";
  g.survivors = g.survivors.slice(0, 1);
  const learning = JSON.stringify(g.study);
  assert.equal(g.nextSpawn, 10);
  g.nextSpawn = 1; // An older saved deadline cannot bypass the grace period.
  for (let i = 0; i < 150; i++) step(g, 1 / 30);
  assert.equal(g.zombies.length, 0);
  g.paused = true;
  const time = g.time;
  step(g, 1);
  assert.equal(g.time, time);
  g = decode(encode(g));
  g.paused = false;
  for (let i = 0; i < 149; i++) step(g, 1 / 30);
  assert.ok(g.time < 10);
  assert.equal(g.spawned, 0);
  step(g, 1 / 30);
  assert.equal(g.spawned, 0); // Floating point time is still just below ten.
  step(g, 1 / 30);
  assert.equal(g.zombies.length, 3);
  assert.equal(g.spawned, 3);
  assert.ok(g.nextSpawn > 17.9);
  assert.equal(JSON.stringify(g.study), learning);
  const saved = decode(encode(g));
  step(saved, 1 / 30);
  assert.equal(
    saved.spawned,
    3,
    "reload after grace does not restart or duplicate it",
  );
});
