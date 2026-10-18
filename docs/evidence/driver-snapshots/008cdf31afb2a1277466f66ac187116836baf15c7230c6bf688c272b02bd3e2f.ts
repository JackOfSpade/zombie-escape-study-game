import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  type Game,
  type Point,
  type Encounter,
  CONFIG,
  distance,
} from "../src/model";
import {
  human,
  step,
  claimStation,
  stairs,
  board,
  toggleDoor,
  vault,
  useItem,
  takeLoot,
} from "../src/engine";
import { ensureProblem, edit, submit } from "../src/ai";
import { recover } from "../src/persistence";
import { survivorPath, type NavStep } from "../src/navigation";
import { solid } from "../src/spatial";
import { canSee, sightRadius } from "../src/visibility";
import { pushAxis, walkTo as simpleWalk } from "./lib/defense-scenario";
import { gameFingerprint } from "./lib/game-fingerprint";
const input =
    process.env.LATE_WORLD ??
    "docs/evidence/inflow-study-retreat-0-final-world.json",
  prefix = process.env.LATE_REPORT ?? "docs/evidence/late-extraction-shields-0";
const sha = (s: string | Buffer) =>
  createHash("sha256").update(s).digest("hex");
const raw = readFileSync(input),
  g = recover(JSON.parse(raw.toString()) as Game),
  a = human(g),
  r = JSON.parse(readFileSync("public/curriculum.json", "utf8"));
if (
  g.status !== "playing" ||
  !a.alive ||
  a.escaped ||
  g.study.profile !== "development"
)
  throw Error("Requires a living, playing development-only captured world");
const source = gameFingerprint(),
  start = g.time,
  actions: unknown[] = [],
  gear = process.env.LATE_GEAR ?? "shields";
if (!["none", "shields"].includes(gear))
  throw Error("Invalid late extraction gear policy");
let phase = "floor-zero-completion",
  frames = 0;
mkdirSync("docs/evidence/driver-snapshots", { recursive: true });
const driverFiles = [
  "scripts/replay-late-extraction.ts",
  "scripts/lib/defense-scenario.ts",
].map((path) => {
  const content = readFileSync(path),
    sha256 = sha(content),
    snapshot = `docs/evidence/driver-snapshots/${sha256}.ts`;
  writeFileSync(snapshot, content);
  return { path, sha256, snapshot };
});
const driverSha256 = driverFiles[0].sha256;
const checkpoint = (name: string) =>
  writeFileSync(`${prefix}-${name}-world.json`, JSON.stringify(g));
function aid() {
  if (a.hp < 60) {
    const med = a.inventory.find((i) => i.kind === "medkit");
    if (med) {
      const before = a.hp;
      if (useItem(g, a, med.id))
        actions.push({
          type: "medkit",
          at: g.time,
          id: med.id,
          before,
          after: a.hp,
        });
    }
  }
  if (a.floor !== 4 || gear === "none") return;
  const visible = g.zombies.filter(
    (z) =>
      z.hp > 0 &&
      z.floor === a.floor &&
      canSee(g.floors[a.floor], a, z, sightRadius(g.floors[a.floor])),
  );
  const threat = visible.some((z) => distance(z, a) < 4.5);
  const protectedHere = g.effects.some(
    (e) =>
      e.kind === "bubble" &&
      e.floor === a.floor &&
      e.until > g.time + 0.2 &&
      canSee(g.floors[a.floor], e, a, 2.9),
  );
  if (threat && !protectedHere) {
    const item = a.inventory.find((i) => i.kind === "bubble");
    if (item && useItem(g, a, item.id))
      actions.push({ type: "shield", at: g.time, x: a.x, y: a.y, id: item.id });
  }
}
function tick(input?: { x: number; y: number; grab: boolean }, dt = 1 / 30) {
  if (!a.alive) throw Error(`Human died during ${phase}`);
  aid();
  if (a.floor === 4 && board(g, a)) return;
  step(g, Math.min(dt, 1 / 30), input);
  frames++;
  if (g.time - start > 1200)
    throw Error("Late physical continuation exceeded twenty-minute budget");
}
function walk(target: Point) {
  const until = g.time + 120;
  let route: NavStep[] = [],
    stall = 0;
  while (distance(a, target) > 0.25 && !a.escaped && g.time < until) {
    if (a.vault) {
      tick();
      route = [];
      continue;
    }
    while (route[0] && distance(a, route[0]) < 0.045) route.shift();
    if (!route.length) route = survivorPath(g.floors[a.floor], a, target);
    if (!route.length) {
      const f = g.floors[a.floor],
        doors = f.furniture
          .filter((o) => o.kind === "door" && !o.open && !o.destroyed)
          .sort((x, y) => distance(x, a) - distance(y, a));
      let chose = false;
      for (const d of doors) {
        if (distance(a, d) < 1.9 && toggleDoor(g, a, d.id, true)) {
          chose = true;
          break;
        }
        const side = a.x < d.x ? -1 : 1,
          p = { x: d.x + side * 1.05, y: d.y },
          part = survivorPath(f, a, p);
        if (part.length && !solid(f, p)) {
          route = part;
          chose = true;
          break;
        }
      }
      if (!chose)
        throw Error(
          `No physical approach to ${target.x},${target.y} from ${a.x},${a.y} on ${a.floor}`,
        );
      if (!route.length) continue;
    }
    const next = route[0],
      d = distance(a, next) || 1,
      dx = (next.x - a.x) / d,
      dy = (next.y - a.y) / d;
    a.heading = { x: dx, y: dy };
    const ob = g.floors[a.floor].furniture.find(
      (o) => o.id === next.obstacle && !o.destroyed && !o.open,
    );
    if (next.action && ob) {
      if (next.action === "door") toggleDoor(g, a, ob.id, true);
      else if (a.cooldown <= 0) vault(g, a, ob.id);
      tick();
      route = [];
      continue;
    }
    const before = { x: a.x, y: a.y };
    tick({ x: dx, y: dy, grab: false }, Math.min(1 / 30, d / a.speed));
    stall = distance(a, before) < 0.001 ? stall + 1 : 0;
    if (stall > 10) {
      route = [];
      stall = 0;
    }
  }
  if (!a.escaped && distance(a, target) > 0.3)
    throw Error(
      `Walking budget exhausted on ${a.floor} toward ${target.x},${target.y}`,
    );
}
async function solve(e: Encounter) {
  const s = g.floors[a.floor].stations.find((s) => s.encounter === e.id)!;
  walk(s);
  if (!claimStation(g, a, s.id))
    throw Error(`Physical terminal claim failed: ${e.id}`);
  await ensureProblem(g, e, r);
  if (!e.problem || e.problem.provenance !== "development")
    throw Error("This physical diagnostic requires a development rehearsal");
  edit(
    g,
    e,
    `${e.problem.validation?.answer ?? "A defensible decision"} is my prediction. The contract and its preconditions must hold before and after the transition. I would verify empty and boundary cases independently. [SYNTHETIC ORACLE PHYSICAL TEST; NOT LEARNER EVIDENCE]`,
    e.revision,
  );
  await submit(g, e, r);
  if (e.state !== "consumed")
    throw Error(
      `Development snapshot rejected at ${e.id}: ${e.submissions.at(-1)?.feedback}`,
    );
  actions.push({
    type: "oracle-development-completion",
    id: e.id,
    at: g.time,
    revision: e.revision,
    reward: e.reward,
  });
}
function candidates(reward: "stairs" | "loot") {
  return Object.values(g.encounters).filter(
    (e) =>
      e.floor === a.floor &&
      e.reward === reward &&
      e.state !== "consumed" &&
      (!e.owner || e.owner === a.id || e.mode === "shared"),
  );
}
async function collectShields() {
  if (gear === "none") return;
  while (
    a.inventory
      .filter((i) => i.kind === "bubble")
      .reduce((n, i) => n + i.charges, 0) < 3
  ) {
    const weight = a.inventory.reduce((n, i) => n + i.weight, 0);
    const offers = candidates("loot").flatMap((e) =>
      e.loot
        .filter(
          (i) => i.kind === "bubble" && weight + i.weight <= CONFIG.capacity,
        )
        .map((item) => ({ e, item })),
    );
    offers.sort(
      (x, y) => x.item.weight - y.item.weight || x.e.id.localeCompare(y.e.id),
    );
    if (!offers.length) break;
    const { e, item } = offers[0];
    await solve(e);
    if (!takeLoot(g, a, e.id, item.id))
      throw Error(`Earned finite loot could not be taken: ${item.id}`);
    actions.push({
      type: "earned-shield",
      at: g.time,
      encounter: e.id,
      item: { ...item },
      weight: a.inventory.reduce((n, i) => n + i.weight, 0),
    });
  }
}
let outcome: unknown;
try {
  while (a.floor < 4) {
    const floor = a.floor;
    phase = `mandatory-${floor}`;
    if (!a.access.includes(floor)) {
      const active =
        candidates("stairs").find((e) => e.humanEngaged && e.problem) ??
        candidates("stairs").sort((x, y) => {
          const f = g.floors[floor],
            sx = f.stations.find((s) => s.encounter === x.id)!,
            sy = f.stations.find((s) => s.encounter === y.id)!;
          return distance(a, sx) - distance(a, sy);
        })[0];
      if (!active)
        throw Error(`No unconsumed mandatory opportunity on ${floor}`);
      await solve(active);
    }
    phase = `gear-${floor}`;
    await collectShields();
    if (floor === 0) {
      phase = "leave-study-cover";
      const f = g.floors[0],
        room = f.rooms!.find((r) => r.innerMouth)!,
        sign = room.side === "left" ? -1 : 1,
        id = `f0-room${room.index}`,
        inner = f.furniture.find((o) => o.id === `${id}-shelf5`)!,
        middle = f.furniture.find((o) => o.id === `${id}-shelf0`)!,
        door = f.furniture.find((o) => o.id === `${id}-door`)!;
      if (!inner.destroyed) pushAxis(g, inner, "x", inner.x + sign * 2.3);
      if (!middle.destroyed) pushAxis(g, middle, "x", middle.x + sign * 0.8);
      if (!door.destroyed && !door.open) {
        simpleWalk(g, { x: door.x + sign * 1.05, y: door.y });
        if (!toggleDoor(g, a, door.id, true))
          throw Error("Cannot open real protected exit door");
      }
    }
    if (floor === 3) {
      phase = "stage-for-helicopter";
      const f = g.floors[3],
        room = a.x < 17 ? (a.y < 15 ? 0 : 2) : a.y < 15 ? 1 : 3,
        door = f.furniture.find((o) => o.id === `f3-room${room}-door`);
      if (door && !door.destroyed && door.open) {
        const p = { x: door.x + (a.x < door.x ? -1.05 : 1.05), y: door.y };
        walk(p);
        toggleDoor(g, a, door.id, false);
      }
      while (
        g.helicopter.until < g.time + 14 &&
        g.helicopter.next - g.time > 14
      )
        tick();
    }
    phase = `stairs-${floor}`;
    walk(g.floors[floor].stairs);
    if (!stairs(g, a))
      throw Error(`Own credential/timed flight unavailable on ${floor}`);
    while (a.stairTravel && a.alive) tick();
    if (a.floor !== floor + 1)
      throw Error("Connected stair flight did not finish");
    checkpoint(`floor${a.floor}`);
    actions.push({
      type: "physical-floor-arrival",
      floor: a.floor,
      at: g.time,
      hp: a.hp,
    });
  }
  phase = "roof-approach";
  walk({ x: 21.5, y: 13.0 });
  phase = "boarding";
  while (!a.escaped && a.alive && g.time - start < 1200) tick();
  if (!a.escaped) throw Error("No actual helicopter extraction");
  outcome = {
    phase: "extracted",
    at: g.time,
    hp: a.hp,
    trip: g.helicopter.trip,
  };
} catch (error) {
  outcome = {
    phase: "failed",
    during: phase,
    error: String(error),
    at: g.time,
    hp: a.hp,
  };
  process.exitCode = 1;
}
if ((g.study.learner?.evidence.length ?? 0) !== 0)
  throw Error("Synthetic controller created real learning evidence");
checkpoint("final");
const report = {
  input,
  inputSha256: sha(raw),
  source,
  driverSha256,
  driverFiles,
  mode: "Continuation of actual long-study world; oracle development answers/full-map physical controller, observed threats only for equipment use; finite original loot/capacity, no revival, resupply or puzzle respawn; not human cognition/native acceptance",
  gear,
  start,
  time: g.time,
  controllerFrames: frames,
  configuredMaximumStepSeconds: 1 / 30,
  outcome,
  actions,
  inventory: a.inventory,
  humanEvidence: g.study.learner?.evidence.length ?? 0,
  developmentVisits: g.study.visits.length,
  spawned: g.spawned,
  liveByFloor: g.floors.map(
    (f) => g.zombies.filter((z) => z.hp > 0 && z.floor === f.index).length,
  ),
  recent: g.events.slice(-30),
};
writeFileSync(`${prefix}.json`, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify({
    input,
    outcome,
    time: g.time,
    inventory: a.inventory,
    visits: report.developmentVisits,
    spawned: g.spawned,
    elapsedGameSeconds: g.time - start,
  }),
);
