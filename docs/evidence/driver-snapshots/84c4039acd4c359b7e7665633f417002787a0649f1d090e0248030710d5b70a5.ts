import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createGame } from "../src/world";
import { step } from "../src/engine";
import { solid } from "../src/spatial";
import type { Roadmap } from "../src/model";
import { gameFingerprint } from "./lib/game-fingerprint";
const r = JSON.parse(readFileSync("public/curriculum.json", "utf8")) as Roadmap;
const source = gameFingerprint(),
  reports = [];
const warmupFrames = Number(process.env.CROWD_WARMUP_FRAMES ?? 600);
if (!Number.isInteger(warmupFrames) || warmupFrames < 0 || warmupFrames > 1800)
  throw Error("Invalid crowd warm-up");
for (const size of [90, 300, 900]) {
  const g = createGame(42, r);
  g.status = "playing";
  g.nextSpawn = 999999;
  g.surge.anchor = 999999;
  g.survivors.forEach((a) => {
    a.escaped = true;
  });
  const f = g.floors[4];
  for (let y = 2.6; y < 27 && g.zombies.length < size; y += 0.6)
    for (let x = 2.6; x < 41.5 && g.zombies.length < size; x += 0.6) {
      if (solid(f, { x, y })) continue;
      g.zombies.push({
        id: `z${g.zombies.length}`,
        floor: 4,
        x,
        y,
        hp: 60,
        path: [],
        repath: 0,
        cooldown: 0,
        memory: 0,
        stagger: 0,
        origin: "outside",
      });
    }
  if (g.zombies.length !== size)
    throw Error("Insufficient clear stress positions");
  let started = performance.now();
  step(g, 1 / 30);
  const coldMs = performance.now() - started;
  for (let i = 0; i < warmupFrames; i++) step(g, 1 / 30);
  const samples = [];
  for (let i = 0; i < 90; i++) {
    started = performance.now();
    step(g, 1 / 30);
    samples.push(performance.now() - started);
  }
  samples.sort((a, b) => a - b);
  const result = {
    size,
    alive: g.zombies.filter((z) => z.hp > 0).length,
    coldMs,
    p50Ms: samples[45],
    p95Ms: samples[85],
    maximumMs: samples[89],
    meanMs: samples.reduce((a, b) => a + b, 0) / samples.length,
    frames: samples.length,
  };
  reports.push(result);
  console.log(JSON.stringify(result));
}
writeFileSync(
  process.env.CROWD_REPORT ?? "docs/evidence/crowd-inflow-queued.json",
  JSON.stringify(
    {
      source,
      driverSha256: createHash("sha256")
        .update(readFileSync("scripts/benchmark-crowd.ts"))
        .digest("hex"),
      mode: "synthetic physically clear rooftop crowd transport, calm, no NPC cognition/rendering; retained actors, no game-balance or actual outdoor spawning certificate",
      stepSeconds: 1 / 30,
      warmupFrames,
      reports,
    },
    null,
    2,
  ),
);
