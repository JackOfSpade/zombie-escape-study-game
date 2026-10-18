import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { actor, createPlayableGame } from "../src/world";
import { studyLoopDecision, studyLoopMetrics } from "../src/npc-study-loop";
import { type Roadmap } from "../src/model";
const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
const g = createPlayableGame(42, roadmap),
  f = g.floors[0],
  base = structuredClone(
    Object.values(g.encounters).find((e) => e.questionRoom === "f0-room0")!,
  );
f.furniture = [];
f.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
f.stations = [];
g.survivors = [g.survivors[0]];
g.survivors[0].floor = 1;
g.encounters = {};
for (let i = 0; i < 20; i++) {
  const a = actor(`worker-${i}`, `Worker ${i}`, i + 1),
    id = `study-${i}`;
  Object.assign(a, {
    x: 10.5,
    y: 15.5,
    floor: 0,
    keys: 0,
    intent: id,
    seen: [id],
    studyLoopBlockedSince: -100,
    studyLoopCheckAt: i / 30,
  });
  g.survivors.push(a);
  g.encounters[id] = { ...structuredClone(base), id, owner: a.id };
  f.stations.push({ id, encounter: id, x: 15.5, y: 15.5 });
}
g.zombies = Array.from({ length: 600 }, (_, i) => ({
  id: `z-${i}`,
  floor: i < 8 ? 0 : 1,
  x: i < 8 ? 13 + (i % 2) * 0.5 : 30,
  y: i < 8 ? 13.5 + Math.floor(i / 2) : 25,
  hp: 60,
  path: [],
  repath: 0,
  cooldown: 0,
  memory: 0,
  stagger: 0,
  origin: "outside" as const,
}));
const observed = g.zombies.slice(0, 8),
  samples: number[] = [],
  m = studyLoopMetrics(g);
for (let i = 0; i < 600; i++) {
  g.time = i / 30;
  const start = performance.now();
  for (const a of g.survivors.slice(1)) studyLoopDecision(g, a, observed);
  if (i >= 30) samples.push(performance.now() - start);
}
samples.sort((a, b) => a - b);
console.log(
  JSON.stringify(
    {
      scope:
        "Planner only: 20 stalled NPCs, 600 zombies present, eight perceived threats per actor. Static poses stress repeated decisions; excludes engine, rendering and physics.",
      frames: samples.length,
      decisions: m.decisions,
      candidates: m.candidates,
      plannerMs: {
        mean: samples.reduce((a, b) => a + b, 0) / samples.length,
        p95: samples[Math.floor(samples.length * 0.95)],
        max: samples.at(-1),
      },
    },
    null,
    2,
  ),
);
