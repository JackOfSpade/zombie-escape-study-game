import { H, W } from "../model";
import { emptyScenario, type Check, type Scenario } from "./schema";
function property(
  name: string,
  id: string,
  field: Extract<Check["query"], { type: "property" }>["field"],
  op: Check["op"],
  expected: number | boolean,
  tick: number,
): Check {
  return {
    name,
    mode: "at",
    tick,
    query: { type: "property", id, field },
    op,
    expected,
  };
}
const base = emptyScenario();
const door = {
  id: "test-door",
  kind: "door" as const,
  x: 12,
  y: 12.5,
  w: 1,
  h: 3,
};
const player = { id: "human", kind: "player" as const, x: 10.5, y: 12.5 };
const queueIds = ["queue-a", "queue-b", "queue-c"];
const room = Array.from({ length: H }, (_, y) =>
  Array.from({ length: W }, (_, x) =>
    x === 0 ||
    y === 0 ||
    x === W - 1 ||
    y === H - 1 ||
    ((x === 8 || x === 16) && y >= 8 && y <= 16) ||
    ((y === 8 || y === 16) && x >= 8 && x <= 16)
      ? "#"
      : ".",
  ),
);
room[16][12] = ".";
const seal: Scenario = {
  ...base,
  id: "sealed-room",
  name: "A fully sealed room has no open sound path",
  maxTicks: 1,
  entities: [
    { ...player, x: 12.5, y: 12.5 },
    { ...door, x: 12.5, y: 16.5, w: 1, h: 0.7 },
  ],
  maps: [{ floor: 0, rows: room.map((r) => r.join("")) }],
  checks: [
    {
      name: "Exterior sound has no open path",
      mode: "at",
      tick: 1,
      query: {
        type: "soundConnected",
        floor: 0,
        a: { x: 12.5, y: 12.5 },
        b: { x: 12.5, y: 18.5 },
      },
      op: "eq",
      expected: false,
    },
  ],
};
const gap = structuredClone(seal);
gap.id = "room-with-gap";
gap.name = "A gap prevents a false fully-barricaded result";
gap.maps[0].rows[16] =
  gap.maps[0].rows[16].slice(0, 13) + "." + gap.maps[0].rows[16].slice(14);
gap.checks[0].name = "Exterior sound still has an open path";
gap.checks[0].expected = true;
export const PRESETS: Scenario[] = [
  {
    ...base,
    id: "latched-door",
    name: "A latched door blocks the player",
    maxTicks: 60,
    entities: [player, door],
    actions: [{ tick: 1, type: "move", id: "human", x: 1, y: 0 }],
    checks: [
      property("Player remains outside", "human", "x", "lte", 11.8, 60),
      {
        ...property(
          "Latch remains engaged",
          "test-door",
          "latched",
          "eq",
          true,
          60,
        ),
        mode: "always",
      },
    ],
  },
  {
    ...base,
    id: "push-door",
    name: "E releases a door; contact swings it open",
    maxTicks: 90,
    entities: [player, door],
    actions: [
      { tick: 1, type: "door", id: "human", target: door.id },
      { tick: 2, type: "move", id: "human", x: 1, y: 0 },
      { tick: 45, type: "checkpoint" },
    ],
    checks: [
      property("Player crosses the frame", "human", "x", "gte", 13, 90),
      property("Physical leaf swung", "test-door", "absAngle", "gte", 0.5, 90),
      property(
        "Latch stays released after checkpoint",
        "test-door",
        "latched",
        "eq",
        false,
        90,
      ),
    ],
  },
  {
    ...base,
    id: "following-traffic",
    name: "Followers stay in their lane",
    simulation: "physics",
    maxTicks: 90,
    entities: [
      { ...player, x: 3.5, y: 3.5 },
      ...queueIds.map((id, i) => ({
        id,
        kind: "npc" as const,
        x: 10 + i * 0.75,
        y: 12.5,
        heading: { x: 1, y: 0 },
      })),
    ],
    actions: queueIds.map((id) => ({
      tick: 1,
      type: "move" as const,
      id,
      x: 1,
      y: 0,
    })),
    checks: [
      {
        name: "Bodies remain separate",
        mode: "always",
        query: { type: "separation", ids: queueIds },
        op: "gte",
        expected: 0.495,
      },
      ...queueIds.flatMap((id) => [
        property(`${id} makes forward progress`, id, "x", "gte", 16, 90),
        {
          ...property(
            `${id} keeps its lane upper bound`,
            id,
            "y",
            "lte",
            12.6,
            90,
          ),
          mode: "always" as const,
        },
        {
          ...property(
            `${id} keeps its lane lower bound`,
            id,
            "y",
            "gte",
            12.4,
            90,
          ),
          mode: "always" as const,
        },
      ]),
    ],
  },
  {
    ...base,
    id: "head-on-traffic",
    name: "Opposing NPCs pass without overlapping",
    simulation: "physics",
    maxTicks: 90,
    entities: [
      { ...player, x: 3.5, y: 3.5 },
      { id: "east", kind: "npc", x: 10, y: 12.5 },
      { id: "west", kind: "npc", x: 12, y: 12.5 },
    ],
    actions: [
      { tick: 1, type: "move", id: "east", x: 1, y: 0 },
      { tick: 1, type: "move", id: "west", x: -1, y: 0 },
    ],
    checks: [
      {
        name: "Contact remains solid",
        mode: "always",
        query: { type: "separation", ids: ["east", "west"] },
        op: "gte",
        expected: 0.495,
      },
      property("Eastbound NPC passes", "east", "x", "gte", 12.5, 90),
      property("Westbound NPC passes", "west", "x", "lte", 9.5, 90),
    ],
  },
  {
    ...base,
    id: "opening-crowd",
    name: "Reported opening crowd clears the entrance",
    template: "building",
    seed: 4089087021,
    entities: [],
    maxTicks: 126,
    checks: [
      {
        name: "At least sixteen NPCs get inside",
        mode: "at",
        tick: 126,
        query: {
          type: "region",
          kind: "npc",
          floor: 0,
          x1: 0,
          y1: 0,
          x2: W,
          y2: 27.999,
        },
        op: "gte",
        expected: 16,
      },
      {
        name: "No early zombie spawn",
        mode: "always",
        query: { type: "count", kind: "zombie" },
        op: "eq",
        expected: 0,
      },
    ],
  },
  {
    ...base,
    id: "spawn-delay",
    name: "Zombies spawn only after ten seconds",
    template: "building",
    naturalSpawns: true,
    entities: [],
    maxTicks: 303,
    checks: [
      {
        name: "No spawn before ten seconds",
        mode: "at",
        tick: 299,
        query: { type: "count", kind: "zombie" },
        op: "eq",
        expected: 0,
      },
      {
        name: "First batch appears after ten seconds",
        mode: "at",
        tick: 303,
        query: { type: "count", kind: "zombie" },
        op: "gte",
        expected: 3,
      },
    ],
  },
  {
    ...base,
    id: "vault-desk",
    name: "Space vaults a faced barricade",
    maxTicks: 60,
    entities: [
      { ...player, x: 10.35 },
      { id: "desk", kind: "desk", x: 12, y: 12.5 },
    ],
    actions: [{ tick: 1, type: "vault", id: "human", target: "desk" }],
    checks: [
      property("Player lands beyond desk", "human", "x", "gte", 13.3, 60),
    ],
  },
  {
    ...base,
    id: "drag-sofa",
    name: "Dragging a sofa keeps full walking speed",
    maxTicks: 60,
    entities: [
      { ...player, x: 10 },
      { id: "sofa", kind: "sofa", x: 12, y: 12.5 },
    ],
    actions: [
      { tick: 1, type: "grip", id: "human", target: "sofa" },
      { tick: 2, type: "move", id: "human", x: 1, y: 0 },
    ],
    checks: [
      property(
        "Player keeps moving at walking speed",
        "human",
        "x",
        "gte",
        15.5,
        60,
      ),
      property("Sofa moves with the player", "sofa", "x", "gte", 17, 60),
    ],
  },
  {
    ...base,
    id: "pivot-sofa",
    name: "An end grip rotates a long object",
    maxTicks: 60,
    entities: [
      { ...player, x: 10 },
      { id: "sofa", kind: "sofa", x: 12, y: 12.5 },
    ],
    actions: [
      { tick: 1, type: "grip", id: "human", target: "sofa" },
      { tick: 2, type: "move", id: "human", x: 0, y: -1 },
    ],
    checks: [
      property("End force pivots the sofa", "sofa", "absAngle", "gte", 0.3, 60),
      property("Player can pull past the object", "human", "y", "lte", 9, 60),
    ],
  },
  {
    ...base,
    id: "zombie-contact",
    name: "A zombie attacks with solid body contact",
    startTime: 20,
    maxTicks: 30,
    entities: [
      { ...player, x: 10 },
      { id: "attacker", kind: "zombie", x: 10.65, y: 12.5 },
    ],
    checks: [
      property("Zombie does real damage", "human", "hp", "lte", 86, 30),
      {
        name: "Bodies do not pass through each other",
        mode: "always",
        query: { type: "separation", ids: ["human", "attacker"] },
        op: "gte",
        expected: 0.495,
      },
      {
        name: "Attack event is recorded",
        mode: "at",
        tick: 30,
        query: { type: "event", event: "survivor-hit" },
        op: "gte",
        expected: 1,
      },
    ],
  },
  seal,
  gap,
];
export function preset(id: string) {
  const s = PRESETS.find((s) => s.id === id);
  if (!s) throw Error(`Unknown test: ${id}`);
  return structuredClone(s);
}
