/** Synthetic fresh world only: no saves, credentials, study bridge or learner progress. */
import { readFileSync } from "node:fs";
import { createPlayableGame } from "../src/world";
import { step } from "../src/engine";
import { SWARM } from "../src/force-fields";
import { solid } from "../src/spatial";
import type { Roadmap } from "../src/model";
const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
const g = createPlayableGame(42, roadmap);
g.status = "playing";
g.survivors = g.survivors.slice(0, 1);
Object.assign(g.survivors[0], { floor: 4, x: 21.5, y: 6.5, hp: 1e6 });
g.nextSpawn = Number.MAX_SAFE_INTEGER;
const dense = process.argv.includes("--dense");
const benchmarkFloors = dense ? g.floors.slice(0, 1) : g.floors;
for (const f of benchmarkFloors) {
  let count = 0;
  for (let y = 4; y < 27 && count < SWARM.cap / benchmarkFloors.length; y++)
    for (let x = 3; x < 41 && count < SWARM.cap / benchmarkFloors.length; x++) {
      const p = { x: x + 0.5, y: y + 0.5 };
      if (solid(f, p, 0.27)) continue;
      g.zombies.push({
        id: `bench-${g.zombies.length}`,
        floor: f.index,
        ...p,
        hp: 60,
        path: [],
        repath: 0,
        cooldown: 0,
        memory: 0,
        stagger: 0,
        origin: "outside",
      });
      count++;
    }
}
for (let i = 0; i < 30; i++) step(g, 1 / 30);
const samples: number[] = [];
for (let i = 0; i < 150; i++) {
  const start = performance.now();
  step(g, 1 / 30);
  samples.push(performance.now() - start);
}
samples.sort((a, b) => a - b);
console.log(
  JSON.stringify(
    {
      population: g.zombies.length,
      ticks: samples.length,
      engineMs: {
        mean: samples.reduce((a, b) => a + b, 0) / samples.length,
        p95: samples[Math.floor(samples.length * 0.95)],
        max: samples.at(-1),
      },
      note: dense
        ? "Headless engine only; no render/FPS guarantee. Dense crowd on one floor."
        : "Headless engine only; no render/FPS guarantee. Distributed across all five floors.",
    },
    null,
    2,
  ),
);
