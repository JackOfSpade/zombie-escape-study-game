import type { Game, Furniture, Point, Roadmap } from "../../src/model";
import { distance } from "../../src/model";
import { createGame } from "../../src/world";
import {
  human,
  step,
  toggleDoor,
  vault,
  nearestFurniture,
  claimStation,
  canReachStation,
  type Input,
} from "../../src/engine";
import { survivorPath } from "../../src/navigation";
import { canGrip } from "../../src/handling";
import { solid, canPlace } from "../../src/spatial";
export const DEFENSE_STEP_SECONDS = 1 / 30;
const preparationSteps = new WeakMap<
  Game,
  { count: number; maximum: number }
>();
function prepareStep(g: Game, seconds: number, input?: Input) {
  const dt = Math.min(seconds, DEFENSE_STEP_SECONDS);
  const stats = preparationSteps.get(g) ?? { count: 0, maximum: 0 };
  stats.count++;
  stats.maximum = Math.max(stats.maximum, dt);
  preparationSteps.set(g, stats);
  step(g, dt, input);
  return dt;
}
const idle = { x: 0, y: 0, grab: false };
export function walkTo(g: Game, target: Point) {
  const a = human(g),
    f = g.floors[a.floor],
    limit = g.time + 90;
  let route = survivorPath(f, a, target);
  while (
    distance(a, target) > 0.045 &&
    g.time < limit &&
    g.status === "playing"
  ) {
    if (a.vault) {
      prepareStep(g, 0.05);
      route = [];
      continue;
    }
    if (!route.length) route = survivorPath(f, a, target);
    while (route.length && distance(a, route[0]) < 0.035) route.shift();
    const next = route[0];
    if (!next)
      throw Error(
        `No human route to ${JSON.stringify(target)} from ${JSON.stringify({ x: a.x, y: a.y })}`,
      );
    if (next.action) {
      if (next.action === "door") {
        if (!toggleDoor(g, a, next.obstacle!, true))
          throw Error("Door interaction unavailable");
        next.action = undefined;
      } else {
        if (a.cooldown > 0) {
          prepareStep(g, Math.min(a.cooldown, DEFENSE_STEP_SECONDS));
          route = [];
          continue;
        }
        const d = distance(a, next);
        a.heading = { x: (next.x - a.x) / d, y: (next.y - a.y) / d };
        if (!vault(g, a, next.obstacle))
          throw Error("Planned vault unavailable");
        prepareStep(g, 0.05);
        continue;
      }
    }
    const d = distance(a, next),
      dt = Math.min(0.1, d / a.speed);
    prepareStep(g, dt, { x: next.x - a.x, y: next.y - a.y, grab: false });
  }
  if (g.status !== "playing")
    throw Error(`Human lost during preparation at ${g.time.toFixed(1)}s`);
  if (distance(a, target) > 0.06) throw Error("Walking budget exceeded");
}
export function pushAxis(
  g: Game,
  o: Furniture,
  axis: "x" | "y",
  coordinate: number,
) {
  const a = human(g),
    f = g.floors[a.floor],
    sign = Math.sign(coordinate - o[axis]);
  const offset = (axis === "x" ? o.w : o.h) / 2 + 0.55;
  const sides = [-sign, sign];
  let positioned = false;
  for (const side of sides) {
    const p = { x: o.x, y: o.y };
    p[axis] += side * offset;
    if (solid(f, p)) continue;
    // G really selects this object from this physical handling position.
    const closest = f.furniture
      .filter((x) => canGrip(f, { ...a, ...p }, x))
      .sort((b, c) => distance(p, b) - distance(p, c))[0];
    if (closest?.id !== o.id) continue;
    walkTo(g, p);
    positioned = true;
    break;
  }
  if (!positioned) throw Error(`No handling position for ${o.id} ${axis}`);
  if (nearestFurniture(g, a, true)?.id !== o.id)
    throw Error("Wrong physical grab target");
  const limit = g.time + Math.abs(coordinate - o[axis]) / o.speed + 20;
  let blocked = 0;
  while (
    Math.abs(coordinate - o[axis]) > 0.008 &&
    g.time < limit &&
    g.status === "playing"
  ) {
    const before = { x: o.x, y: o.y },
      dt = Math.min(0.1, Math.abs(coordinate - o[axis]) / o.speed);
    const actualStep = prepareStep(g, dt, {
      x: axis === "x" ? Math.sign(coordinate - o.x) : 0,
      y: axis === "y" ? Math.sign(coordinate - o.y) : 0,
      grab: true,
    });
    if (solid(f, a)) throw Error("Handling embedded the human");
    if (!canPlace(f, o, o)) throw Error(`Illegal furniture footprint ${o.id}`);
    blocked = distance(before, o) < 1e-6 ? blocked + actualStep : 0;
    if (blocked > 1.5)
      throw Error(
        `Blocked ${o.id} at ${JSON.stringify({ x: o.x, y: o.y })}, requested ${axis}=${coordinate}`,
      );
  }
  prepareStep(g, 0.01, idle);
  if (g.status !== "playing")
    throw Error("Human lost while handling furniture");
  if (Math.abs(coordinate - o[axis]) > 0.02)
    throw Error("Handling budget exceeded");
}
export type DefensePolicy =
  "none" | "door" | "outer" | "layered" | "inner-only";
export function prepareScenario(
  r: Roadmap,
  seed: number,
  policy: DefensePolicy,
  jitter = 0,
  options: { population?: "solo" | "full"; onCreate?: (g: Game) => void } = {},
) {
  const g = createGame(seed, r);
  g.status = "playing";
  const population = options.population ?? "solo";
  if (population === "solo") g.survivors = g.survivors.slice(0, 1);
  options.onCreate?.(g);
  const f = g.floors[0],
    room = f.rooms!.find((room) => room.innerMouth)!,
    left = room.side === "left",
    door = f.furniture.find((o) => o.id === `f0-room${room.index}-door`)!,
    prefix = `f0-room${room.index}`;
  const destination = f.stations.find((s) => s.encounter === prefix)!;
  if (policy !== "none") {
    walkTo(g, { x: door.x + (left ? 1.05 : -1.05), y: door.y });
    if (!toggleDoor(g, human(g), door.id, true))
      throw Error("Could not open staging door");
    if (policy !== "door" && policy !== "inner-only") {
      const fridge = f.furniture.find((o) => o.id === "f0-corridor-fridge")!;
      pushAxis(g, fridge, "x", left ? 18.68 + jitter : 25.32 - jitter);
    }
    walkTo(g, { x: door.x + (left ? -1.05 : 1.05), y: door.y });
    if (!toggleDoor(g, human(g), door.id, false))
      throw Error("Could not close protected door");
  } else walkTo(g, destination);
  if (policy === "layered" || policy === "inner-only") {
    const long = f.furniture.find((o) => o.id === `${prefix}-shelf0`)!,
      inner = f.furniture.find((o) => o.id === `${prefix}-shelf5`)!;
    pushAxis(g, long, "y", 7.5);
    pushAxis(g, long, "x", left ? 7.1 : 36.9);
    pushAxis(g, long, "y", door.y + 0.1); // Ordinary imperfect alignment, corrected by physical handling.
    pushAxis(g, long, "x", left ? 10 : 34);
    pushAxis(g, long, "x", left ? 15.25 + jitter : 29 - jitter);
    pushAxis(g, inner, "y", door.y);
    pushAxis(g, inner, "x", room.innerMouth!.x + (left ? -1.1 : 1.1) + jitter);
  }
  walkTo(g, destination);
  if (!claimStation(g, human(g), destination.id))
    throw Error("Prepared terminal not physically usable");
  return {
    g,
    room,
    population,
    preparationSeconds: g.time,
    preparationSteps: { ...preparationSteps.get(g)! },
    policy,
    jitter,
  };
}
export function siegeScenario(
  scenario: ReturnType<typeof prepareScenario>,
  seconds = 1800,
  stepSeconds = DEFENSE_STEP_SECONDS,
  options: { pursuit?: "known" | "natural" } = {},
) {
  if (
    !Number.isFinite(seconds) ||
    seconds <= 0 ||
    !Number.isFinite(stepSeconds) ||
    stepSeconds <= 0 ||
    stepSeconds > DEFENSE_STEP_SECONDS
  )
    throw Error("Invalid fine-step defense configuration");
  const { g } = scenario,
    a = human(g),
    start = g.time,
    events: { time: number; type: string; text: string }[] = [];
  let cursor = 0,
    stationarySeconds = 0,
    lastDamage = start,
    maxAttackGapSeconds = 0,
    lastDefenseDamage = start,
    maxDefenseAttackGapSeconds = 0,
    usableStationarySeconds = 0,
    siegeSteps = 0,
    maximumSimulationStepSeconds = scenario.preparationSteps.maximum;
  const station = g.floors[a.floor].stations.find((s) => s.id === a.station);
  const defenseIds = new Set(
    g.floors[0].furniture
      .filter(
        (o) =>
          o.id === "main-gate" ||
          o.id === "f0-corridor-fridge" ||
          o.id === `f0-room${scenario.room.index}-door` ||
          (o.moved > 0 && o.id.startsWith(`f0-room${scenario.room.index}-`)),
      )
      .map((o) => o.id),
  );
  const defenseHP = () =>
    a.hp +
    g.floors[0].furniture
      .filter((o) => defenseIds.has(o.id))
      .reduce((n, o) => n + o.hp, 0);
  let priorDefenseHP = defenseHP();
  const totalHP = () =>
    a.hp + g.floors[0].furniture.reduce((n, o) => n + o.hp, 0);
  let priorHP = totalHP();
  while (g.time < start + seconds && g.status === "playing") {
    // Deliberately stronger pressure than an ordinary hidden survivor: the
    // controlled siege assumes the horde retains the study position. Every
    // enemy still originates outside, walks the building and hits real faces.
    if (options.pursuit !== "natural")
      for (const z of g.zombies) {
        z.target = { x: a.x, y: a.y };
        z.memory = Infinity;
      }
    const before = { x: a.x, y: a.y };
    const dt = Math.min(stepSeconds, start + seconds - g.time);
    step(g, dt);
    siegeSteps++;
    maximumSimulationStepSeconds = Math.max(maximumSimulationStepSeconds, dt);
    const currentDefenseHP = defenseHP();
    if (currentDefenseHP < priorDefenseHP) lastDefenseDamage = g.time;
    maxDefenseAttackGapSeconds = Math.max(
      maxDefenseAttackGapSeconds,
      g.time - lastDefenseDamage,
    );
    priorDefenseHP = currentDefenseHP;
    if (
      distance(a, before) < 1e-8 &&
      a.alive &&
      station &&
      a.station === station.id &&
      canReachStation(g, a, station) &&
      g.encounters[station.encounter].state !== "consumed"
    )
      usableStationarySeconds += dt;
    const currentHP = totalHP();
    if (currentHP < priorHP) lastDamage = g.time;
    maxAttackGapSeconds = Math.max(maxAttackGapSeconds, g.time - lastDamage);
    priorHP = currentHP;
    if (distance(a, before) < 1e-8) stationarySeconds += dt;
    for (const e of g.events.filter((e) => e.seq > cursor))
      if (
        [
          "breach",
          "surge-active",
          "surge-warning",
          "surge-end",
          "death",
        ].includes(e.type)
      )
        events.push({ time: e.at, type: e.type, text: e.text });
    cursor = g.seq;
  }
  return {
    seed: g.seed,
    stepSeconds,
    preparationSteps: scenario.preparationSteps,
    siegeSteps,
    maximumSimulationStepSeconds,
    defensePressureIds: [...defenseIds],
    maxDefenseAttackGapSeconds: +maxDefenseAttackGapSeconds.toFixed(2),
    defensePressureContinuous: maxDefenseAttackGapSeconds <= 45,
    usableStationarySeconds: +usableStationarySeconds.toFixed(2),
    humanEvidence: g.study.learner?.evidence.length ?? 0,
    humanVisits: g.study.visits.length,
    layout: g.floors[0].layout,
    annex: scenario.room.index,
    policy: scenario.policy,
    jitter: scenario.jitter,
    preparationSeconds: +start.toFixed(2),
    studySeconds: +(g.time - start).toFixed(2),
    stationarySeconds: +stationarySeconds.toFixed(2),
    alive: a.alive,
    hp: a.hp,
    spawned: g.spawned,
    maxAttackGapSeconds: +maxAttackGapSeconds.toFixed(2),
    pressureContinuous: maxAttackGapSeconds <= 45,
    finalHorde: g.floors.map((f) => ({
      floor: f.index,
      count: g.zombies.filter((z) => z.hp > 0 && z.floor === f.index).length,
    })),
    breaches: g.stats.breaches,
    events,
    remaining: g.floors[0].furniture
      .filter((o) => o.moved > 0)
      .map((o) => ({ id: o.id, hp: o.hp, destroyed: o.destroyed })),
    mode: `${options.pursuit === "natural" ? "natural pursuit" : "controlled known-location siege"}; ${g.survivors.length} survivors; outside-only spawns; no learning credit`,
  };
}
