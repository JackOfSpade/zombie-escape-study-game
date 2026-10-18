import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { step } from "../src/engine";
import { type Game, distance } from "../src/model";
import { gameFingerprint } from "./lib/game-fingerprint";
const fixture =
    process.env.TAIL_FIXTURE ??
    "docs/evidence/threat-memory-1800-42-world.json",
  output =
    process.env.TAIL_REPORT ?? "docs/evidence/threat-memory-tail-42.json",
  seconds = Number(process.env.TAIL_SECONDS ?? 60);
if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 300)
  throw Error("Tail duration must be within300 simulation seconds");
const raw = readFileSync(fixture, "utf8"),
  g = JSON.parse(raw) as Game;
if (g.status !== "playing" || !g.survivors[0].escaped)
  throw Error(
    "Expected a captured active NPC-only diagnostic world with the human already marked escaped",
  );
const targets = g.survivors.slice(1).filter((a) => a.alive && !a.escaped),
  start = g.time,
  initialStats = { ...g.stats };
const origin = targets.map((a) => ({
  id: a.id,
  name: a.name,
  x: a.x,
  y: a.y,
  floor: a.floor,
  hp: a.hp,
  activity: a.activity,
}));
const tracks = new Map(
  targets.map((a) => [
    a.id,
    { walked: 0, transfers: 0, cells: new Set<string>() },
  ]),
);
const timeline: { at: number; survivors: unknown }[] = [];
const capture = () =>
  timeline.push({
    at: g.time,
    survivors: targets.map((a) => ({
      id: a.id,
      x: a.x,
      y: a.y,
      floor: a.floor,
      hp: a.hp,
      alive: a.alive,
      escaped: a.escaped,
      activity: a.activity,
      intent: a.intent,
    })),
  });
capture();
let cursor = g.seq;
const events: Game["events"] = [];
for (let i = 0; i < Math.ceil(seconds * 30); i++) {
  const before = targets.map((a) => ({ x: a.x, y: a.y, floor: a.floor }));
  step(g, 1 / 30);
  targets.forEach((a, j) => {
    const track = tracks.get(a.id)!;
    if (before[j].floor === a.floor) track.walked += distance(before[j], a);
    else track.transfers++;
    track.cells.add(`${a.floor}/${Math.floor(a.x * 2)}/${Math.floor(a.y * 2)}`);
  });
  if (g.seq > cursor)
    for (const e of g.events.slice(-Math.min(3000, g.seq - cursor)))
      if (
        e.seq > cursor &&
        targets.some((a) => a.id === e.actor) &&
        ["board", "death", "climb", "vault", "door"].includes(e.type)
      )
        events.push(e);
  cursor = g.seq;
  if ((i + 1) % 30 === 0) capture();
}
const report = {
  mode: "Continuation of a captured NPC-only world under current source, not a fresh run or human learning/balance acceptance",
  fixture,
  inputSha256: createHash("sha256").update(raw).digest("hex"),
  currentSource: gameFingerprint(),
  runnerSha256: createHash("sha256")
    .update(readFileSync(new URL(import.meta.url)))
    .digest("hex"),
  start,
  seconds: g.time - start,
  stepSeconds: 1 / 30,
  newDeaths: g.stats.deaths - initialStats.deaths,
  newRescues: g.stats.rescued - initialStats.rescued,
  humanEvidence: g.study.learner?.evidence.length,
  humanVisits: g.study.visits.length,
  survivors: targets.map((a, i) => ({
    before: origin[i],
    after: {
      x: a.x,
      y: a.y,
      floor: a.floor,
      hp: a.hp,
      activity: a.activity,
      alive: a.alive,
      escaped: a.escaped,
      intent: a.intent,
      access: a.access,
    },
    walkedDistance: tracks.get(a.id)!.walked,
    stairTransfers: tracks.get(a.id)!.transfers,
    distinctHalfCells: tracks.get(a.id)!.cells.size,
  })),
  events,
  timeline,
};
writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify({
    fixture,
    seconds: report.seconds,
    newRescues: report.newRescues,
    newDeaths: report.newDeaths,
    survivors: report.survivors.map((a) => ({
      name: a.before.name,
      walked: a.walkedDistance,
      cells: a.distinctHalfCells,
      from: a.before.floor,
      to: a.after.floor,
      activity: a.after.activity,
      escaped: a.after.escaped,
    })),
  }),
);
