import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { step } from "../src/engine";
import type { Roadmap } from "../src/model";
import { createGame } from "../src/world";
import { gameFingerprint } from "./lib/game-fingerprint";
const r = JSON.parse(readFileSync("public/curriculum.json", "utf8")) as Roadmap;
const seconds = Number(process.env.SIM_SECONDS ?? 600),
  stepSeconds = Number(process.env.SIM_STEP ?? 1 / 30);
const seeds = (process.env.SIM_SEEDS ?? "11,42,1337").split(",").map(Number);
if (
  !Number.isFinite(seconds) ||
  seconds <= 0 ||
  seconds > 7200 ||
  !Number.isFinite(stepSeconds) ||
  stepSeconds <= 0 ||
  stepSeconds > 0.1 ||
  seeds.some((n) => !Number.isSafeInteger(n))
)
  throw Error("Invalid simulation configuration");
const output = process.env.SIM_REPORT ?? "docs/evidence/simulation.json";
const fingerprint = gameFingerprint(),
  physicsSha256 = fingerprint.hash;
const reports = [];
mkdirSync("docs/evidence", { recursive: true });
for (const seed of seeds) {
  if (process.env.SIM_VERBOSE)
    console.log(
      JSON.stringify({
        phase: "started",
        seed,
        seconds,
        stepSeconds,
        physicsSha256,
        fingerprintSchema: fingerprint.schema,
        fingerprintedFiles: fingerprint.files,
      }),
    );
  const g = createGame(seed, r);
  g.status = "playing";
  g.survivors[0].escaped = true;
  const start = performance.now();
  const counts: Record<string, number> = {};
  let cursor = 0,
    firstRescueAt: number | undefined;
  const timeline = [];
  const incidents: {
    at: number;
    type: string;
    actor: string;
    name: string;
    floor: number;
    x: number;
    y: number;
    activity?: string;
    intent?: string;
    taskState?: string;
    inventory: unknown;
    recent: unknown;
    nearbyEnemies: unknown;
  }[] = [];
  const recent = new Map<
    string,
    { at: number; activity?: string; intent?: string; floor: number }[]
  >();
  let capturedDeath = false;
  for (let i = 0; i < Math.ceil(seconds / stepSeconds); i++) {
    step(g, Math.min(stepSeconds, seconds - g.time));
    for (const a of g.survivors.slice(1)) {
      const changes = recent.get(a.id) ?? [];
      const last = changes.at(-1);
      if (
        !last ||
        last.activity !== a.activity ||
        last.intent !== a.intent ||
        last.floor !== a.floor
      )
        changes.push({
          at: g.time,
          activity: a.activity,
          intent: a.intent,
          floor: a.floor,
        });
      recent.set(a.id, changes.slice(-6));
    }
    if (g.seq > cursor)
      for (const e of g.events.slice(-Math.min(3000, g.seq - cursor))) {
        counts[e.type] = (counts[e.type] ?? 0) + 1;
        if (e.type === "board") firstRescueAt ??= e.at;
        if (e.actor && ["death", "board"].includes(e.type)) {
          const a = g.survivors.find((a) => a.id === e.actor)!;
          incidents.push({
            at: e.at,
            type: e.type,
            actor: a.id,
            name: a.name,
            floor: a.floor,
            x: a.x,
            y: a.y,
            activity: a.activity,
            intent: a.intent,
            taskState: a.intent ? g.encounters[a.intent]?.state : undefined,
            inventory: structuredClone(a.inventory),
            recent: structuredClone(recent.get(a.id)),
            nearbyEnemies: g.zombies
              .filter(
                (z) =>
                  z.floor === a.floor &&
                  z.hp > 0 &&
                  Math.hypot(z.x - a.x, z.y - a.y) < 5,
              )
              .map((z) => ({ x: z.x, y: z.y })),
          });
          if (
            e.type === "death" &&
            !capturedDeath &&
            process.env.SIM_FIRST_DEATH
          ) {
            writeFileSync(process.env.SIM_FIRST_DEATH, JSON.stringify(g));
            capturedDeath = true;
          }
        }
      }
    cursor = g.seq;
    if (i % Math.round(60 / stepSeconds) === 0)
      timeline.push({
        seconds: +g.time.toFixed(2),
        alive: g.survivors.slice(1).filter((a) => a.alive && !a.escaped).length,
        escaped: g.stats.rescued,
        highestFloor: Math.max(
          ...g.survivors
            .slice(1)
            .filter((a) => a.alive)
            .map((a) => a.floor),
          0,
        ),
      });
  }
  const report = {
    seed,
    configuration: {
      seconds,
      stepSeconds,
      physicsSha256,
      fingerprintSchema: fingerprint.schema,
      fingerprintedFiles: fingerprint.files,
      curriculumSourceHash: r.sourceHash,
      mode: "autonomous NPC-only diagnostic; human marked escaped; normal outside horde and Surge; no learning credit",
    },
    firstRescueAt,
    timeline,
    seconds: g.time,
    elapsedMs: Math.round(performance.now() - start),
    dead: g.stats.deaths,
    escaped: g.stats.rescued,
    consumed: Object.values(g.encounters).filter((e) => e.state === "consumed")
      .length,
    equipmentActions: (counts.loot ?? 0) + (counts.item ?? 0),
    eventCounts: counts,
    incidents,
    doorActions: counts.door ?? 0,
    defenses: counts.defense ?? 0,
    fortifiedObjects: g.floors
      .flatMap((f) => f.furniture)
      .filter((o) => o.credited.length > 0).length,
    zombieFloors: g.floors.map(
      (f) => g.zombies.filter((z) => z.floor === f.index).length,
    ),
    survivors: g.survivors.slice(1).map((a) => ({
      name: a.name,
      activity: a.activity,
      floor: a.floor,
      alive: a.alive,
      escaped: a.escaped,
      thought: Math.round(a.thought),
      milestone: a.milestone,
      intent: a.intent,
      target: a.target,
      navTarget: a.navTarget,
      access: a.access,
      firstRouteSteps: a.path.slice(0, 3),
      defensePlan: a.defensePlan,
      failedExplore: a.failedExplore,
      x: +a.x.toFixed(1),
      y: +a.y.toFixed(1),
    })),
  };
  if (process.env.SIM_SNAPSHOT)
    writeFileSync(process.env.SIM_SNAPSHOT, JSON.stringify(g));
  reports.push(report);
  writeFileSync(output, JSON.stringify(reports, null, 2));
  console.log(
    JSON.stringify({
      seed,
      seconds: report.seconds,
      elapsedMs: report.elapsedMs,
      dead: report.dead,
      escaped: report.escaped,
      consumed: report.consumed,
      defenses: report.defenses,
      doors: report.doorActions,
      zombieFloors: report.zombieFloors,
    }),
  );
}
