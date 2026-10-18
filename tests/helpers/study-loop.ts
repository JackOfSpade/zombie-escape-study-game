import { readFileSync } from "node:fs";
import { TestRunner } from "../../src/gametest/runner";
import { emptyScenario } from "../../src/gametest/schema";
import { createPlayableGame } from "../../src/world";
import type { Roadmap } from "../../src/model";
const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
export function loopFixture(seed = 42, desperate = true) {
  const s = emptyScenario();
  Object.assign(s, {
    rules: "force-fields",
    simulation: "game",
    seed,
    maxTicks: 3600,
  });
  s.entities = [
    { id: "human", kind: "player", floor: 1, x: 30, y: 25 },
    { id: "worker", kind: "npc", x: 15.5, y: 15.5 },
    { id: "chaser", kind: "zombie", x: 19, y: 15.5 },
  ];
  const r = new TestRunner(s, roadmap),
    g = r.game,
    a = g.survivors[1],
    f = g.floors[0];
  const original = createPlayableGame(seed, roadmap);
  const e = structuredClone(
    Object.values(original.encounters).find(
      (e) => e.questionRoom === "f0-room0",
    )!,
  );
  e.state = "in-progress";
  e.owner = a.id;
  e.npcProgress = 0;
  g.encounters = { [e.id]: e };
  f.stations = [{ id: "study", encounter: e.id, x: 15.5, y: 15.5 }];
  Object.assign(a, {
    intent: e.id,
    seen: ["study"],
    role: "analyst",
    risk: 0.8,
    skill: 0.8,
    thought: 20,
    milestone: 0,
  });
  if (desperate)
    Object.assign(a, { studyLoopBlockedSince: -100, studyLoopCheckAt: 0 });
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.surge.anchor = 10000;
  return { r, g, a, f, e };
}
