import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import type { Game, Roadmap } from "../src/model";
import { human, claimStation, releaseStation, toggleDoor } from "../src/engine";
import { ensureProblem, edit } from "../src/ai";
import { encode, decode } from "../src/persistence";
import { gameFingerprint } from "./lib/game-fingerprint";
import {
  prepareScenario,
  siegeScenario,
  pushAxis,
  walkTo,
} from "./lib/defense-scenario";
const roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
) as Roadmap;
const fingerprint = gameFingerprint();
const files = [
  "scripts/benchmark-full-study.ts",
  "scripts/lib/defense-scenario.ts",
];
const digest = (s: string | Buffer) =>
  createHash("sha256").update(s).digest("hex");
mkdirSync("docs/evidence/driver-snapshots", { recursive: true });
const driver = files.map((path) => {
  const content = readFileSync(path),
    sha256 = digest(content),
    snapshot = `docs/evidence/driver-snapshots/${sha256}.ts`;
  writeFileSync(snapshot, content);
  return { path, sha256, snapshot };
});
const seconds = Number(process.env.FULL_STUDY_SECONDS ?? 1800);
if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 3600)
  throw Error("Invalid full-study duration");
for (const seed of (process.env.FULL_STUDY_SEEDS ?? "0,1,2")
  .split(",")
  .map(Number)) {
  if (!Number.isSafeInteger(seed) || seed < 0)
    throw Error("Invalid full-study seed");
  let world: Game | undefined,
    phase = "preparation";
  const start = performance.now(),
    phases: unknown[] = [];
  let outcome: unknown;
  const prefix =
    process.env.FULL_STUDY_PREFIX ?? "docs/evidence/full-study-natural";
  const checkpoint = (label: string) => {
    if (world)
      writeFileSync(
        `${prefix}-${seed}-${label}-world.json`,
        JSON.stringify(world),
      );
  };
  try {
    const scenario = prepareScenario(
      roadmap,
      seed,
      "layered",
      [-0.05, 0.04, 0.06][seed % 3],
      {
        population: "full",
        onCreate: (g) => {
          world = g;
        },
      },
    );
    const g = scenario.g,
      a = human(g),
      f = g.floors[0],
      station = f.stations.find((s) => s.id === a.station)!;
    phases.push({
      phase: "prepared",
      at: g.time,
      population: g.survivors.length,
      room: scenario.room,
      steps: scenario.preparationSteps,
    });
    checkpoint("prepared");
    const e = g.encounters[station.encounter];
    phase = "development-draft";
    await ensureProblem(g, e, roadmap);
    if (!e.problem || e.problem.provenance === "study-mode")
      throw Error(
        "This diagnostic requires an explicitly development-only question",
      );
    const draft =
      "SYNTHETIC PHYSICAL BENCHMARK DRAFT. This is not learner reasoning, an answer or academic evidence.";
    edit(g, e, draft, e.revision);
    const identity = digest(JSON.stringify(e.problem)),
      revision = e.revision;
    phase = "early-focus";
    phases.push({
      phase,
      report: siegeScenario(scenario, 30, 1 / 30, { pursuit: "natural" }),
    });
    phase = "retreat-return";
    releaseStation(a);
    const sign = scenario.room.side === "left" ? -1 : 1,
      id = `f0-room${scenario.room.index}`,
      inner = f.furniture.find((o) => o.id === `${id}-shelf5`)!,
      middle = f.furniture.find((o) => o.id === `${id}-shelf0`)!;
    const original = { inner: inner.x, middle: middle.x },
      leaveAt = g.time;
    pushAxis(g, inner, "x", inner.x + sign * 2.3);
    pushAxis(g, middle, "x", middle.x + sign * 0.8);
    const door = f.furniture.find((o) => o.id === `${id}-door`)!;
    walkTo(g, { x: door.x + sign * 1.05, y: door.y });
    if (!toggleDoor(g, a, door.id, true))
      throw Error(
        "Protected door could not be opened from its real inside approach",
      );
    walkTo(g, { x: 21.5, y: f.doors[scenario.room.index].y + 2 });
    const outsideAt = g.time;
    walkTo(g, station);
    pushAxis(g, middle, "x", original.middle);
    pushAxis(g, inner, "x", original.inner);
    walkTo(g, station);
    if (!claimStation(g, a, station.id))
      throw Error("Original terminal unavailable on return");
    if (
      e.workspace !== draft ||
      e.revision !== revision ||
      digest(JSON.stringify(e.problem)) !== identity
    )
      throw Error("Exact work changed during physical round trip");
    phases.push({
      phase,
      leaveAt,
      outsideAt,
      returnedAt: g.time,
      exactDraft: true,
      problemHash: identity,
      revision,
    });
    checkpoint("returned");
    phase = "first-focus-half";
    const first = siegeScenario(scenario, seconds / 2, 1 / 30, {
      pursuit: "natural",
    });
    phases.push({ phase, report: first });
    if (!a.alive || first.usableStationarySeconds < seconds / 2 - 0.01)
      throw Error("First focus interval did not remain usable");
    phase = "reload";
    const saved = encode(g),
      copy = decode(saved);
    if (encode(copy) !== saved) throw Error("Reload was not exact");
    scenario.g = copy;
    world = copy;
    phases.push({
      phase,
      at: copy.time,
      exact: true,
      saveSha256: digest(saved),
    });
    phase = "second-focus-half";
    const second = siegeScenario(scenario, seconds / 2, 1 / 30, {
      pursuit: "natural",
    });
    phases.push({ phase, report: second });
    const final = copy.encounters[station.encounter];
    if (
      !human(copy).alive ||
      second.usableStationarySeconds < seconds / 2 - 0.01
    )
      throw Error("Second focus interval did not remain usable");
    if (
      final.workspace !== draft ||
      final.revision !== revision ||
      digest(JSON.stringify(final.problem)) !== identity
    )
      throw Error("Exact work changed during extended study");
    if ((copy.study.learner?.evidence.length ?? 0) !== 0)
      throw Error("Synthetic controller created human academic evidence");
    outcome = {
      phase: "completed",
      usableFocusSeconds:
        first.usableStationarySeconds + second.usableStationarySeconds,
      exactDraft: true,
      problemHash: identity,
      revision,
    };
  } catch (error) {
    outcome = { phase: "failed", during: phase, error: String(error) };
    process.exitCode = 1;
  }
  if (!world) throw Error("Full-population world was not created");
  checkpoint("final");
  const report = {
    seed,
    source: fingerprint,
    driver,
    mode: "full twenty-survivor physical diagnostic; natural pursuit and all NPC decisions active; synthetic development draft, no human cognition/native assessment",
    outcome,
    phases,
    elapsedMs: Math.round(performance.now() - start),
    time: world.time,
    human: {
      x: human(world).x,
      y: human(world).y,
      hp: human(world).hp,
      alive: human(world).alive,
    },
    population: world.survivors.length,
    stats: world.stats,
    npcs: world.survivors.slice(1).map((a) => ({
      id: a.id,
      alive: a.alive,
      escaped: a.escaped,
      floor: a.floor,
      activity: a.activity,
    })),
    outsideOrigins: world.zombies.every((z) => z.origin === "outside"),
    humanEvidence: world.study.learner?.evidence.length ?? 0,
    humanVisits: world.study.visits.length,
    recent: world.events.slice(-20),
  };
  writeFileSync(`${prefix}-${seed}.json`, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      seed,
      outcome,
      time: world.time,
      human: report.human,
      population: report.population,
      elapsedMs: report.elapsedMs,
    }),
  );
}
