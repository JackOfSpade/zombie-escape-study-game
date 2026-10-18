import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { trafficVelocity } from "../src/local-traffic";
import { TestRunner } from "../src/gametest/runner";
import { emptyScenario } from "../src/gametest/schema";
import { actor } from "../src/world";
import type { Roadmap } from "../src/model";
const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
const g = new TestRunner(emptyScenario(), roadmap).game;
g.survivors = Array.from({ length: 20 }, (_, i) =>
  Object.assign(actor(`bot-${i}`, "Synthetic", i), {
    x: 8 + (i % 5) * 0.65,
    y: 8 + Math.floor(i / 5) * 0.65,
  }),
);
const bodies = g.survivors.map((a) => ({
  id: a.id,
  x: a.x,
  y: a.y,
  velocity: { x: 0, y: 0 },
}));
const times: number[] = [];
for (let frame = 0; frame < 330; frame++) {
  const start = performance.now();
  for (const a of g.survivors) trafficVelocity(g, a, { x: 3.3, y: 0 }, bodies);
  if (frame >= 30) times.push(performance.now() - start);
}
times.sort((a, b) => a - b);
const report = {
  scope:
    "Static congested synthetic poses; 20 local decisions per sample. Excludes engine, physics and rendering.",
  samples: times.length,
  actors: 20,
  maxNeighbors: 8,
  candidateVelocities: 22,
  meanMs: times.reduce((a, b) => a + b, 0) / times.length,
  p95Ms: times[Math.floor(times.length * 0.95)],
};
mkdirSync(".artifacts", { recursive: true });
writeFileSync(
  ".artifacts/traffic-performance.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
