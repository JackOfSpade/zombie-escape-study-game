import type { LearnerLedger, ScopeDefinition } from "./learning-model";
export type Track = "PY" | "PE";
export interface Objective {
  id: string;
  target: number;
  cells: string[];
  route: string;
  refs: string;
  reviewDue: string | null;
  scope: string;
}
export interface Roadmap {
  resume?: {
    ratioPosition?: number;
    issues: string[];
    reviews?: Record<string, import("./learning-model").ReviewRecord>;
    identifierCounters?: import("./roadmap-identifiers").IdentifierCounters;
  };
  documentId: string;
  revision: number;
  sourceHash: string;
  raw: string;
  sharedProgress: string;
  tracks: Record<
    Track,
    {
      tier: number;
      lap?: number;
      cleared?: number;
      suspended?: {
        tier: number;
        phase: string;
        lap?: number;
        queue: string[];
      }[];
      phase: string;
      remaining: string[];
      rotation: string[];
      objectives: Objective[];
      topics: Record<string, string>;
      progress: string;
      curriculum: string;
    }
  >;
}
export interface Contract {
  /** Legacy objectiveIds also carries track-qualified topic/integration IDs for final work. */
  kind?: "checkpoint" | "transfer" | "integration";
  id: string;
  track: Track;
  objectiveIds: string[];
  scopes: string[];
  depth: number;
  phase: string;
  review: boolean;
  ledgerVersion: number;
  priorEvidence: string[];
  scheduleNote?: string;
  missingFacets?: string[];
  preservedFacets?: string[];
  historicalScope?: {
    sourceHash: string;
    gaps: {
      id: string;
      objectiveId: string;
      depth: number;
      kind: string;
      preserved: string;
      missing: string;
      evidenceRefs: string;
      status: string;
      nextCheck: string;
      revisit: string;
    }[];
    evidenceRows: string[];
  };
}
export interface StudyState {
  roadmapReconciliations?: import("./roadmap-adoption-types").RoadmapReconciliationJob[];
  roadmapAdoptionBackups?: import("./roadmap-adoption-types").RoadmapAdoptionBackup[];
  environmentReviews?: import("./environment-review").EnvironmentReviewJob[];
  environmentObservations?: import("./environment-observations").EnvironmentObservation[];
  roadmapExport?: import("./roadmap-export").RoadmapExport;
  profile?: "development" | "live";
  learner?: LearnerLedger;
  version: number;
  cycle: number;
  cycleOffset?: number;
  queues: Record<Track, string[]>;
  phases: Record<Track, string>;
  reviewsServed: string[];
  visits: { id: string; contract: Contract; encounter: string; at: string }[];
  pending?: { contract: Contract; encounter: string };
  session?: string;
  assessments: Assessment[];
  archives: Encounter[];
}
export interface Finding {
  objectiveId: string;
  facet: string;
  outcome: "independent" | "assisted" | "unknown" | "contradicted";
  depth?: number;
  execution?: "not-run" | "executed";
  evidence: number[];
  completeCheckpointScope: boolean;
  rationale: string;
}
export interface Assessment {
  historicalMappings?: import("./learning-model").HistoricalFacetMapping[];
  id: string;
  encounter: string;
  sourceVersion: number;
  findings: Finding[];
  status: "pending" | "review-required" | "applied";
  provenance: string;
  evidenceCutoffSequence?: number;
  visitOutcome?: "usable" | "unresolved" | "invalid";
  scopeReviews?: { id: string; completeCoverage: boolean; rationale: string }[];
  helpAttributions?: {
    messageId: string;
    facets: string[];
    rationale: string;
  }[];
}
export interface Point {
  x: number;
  y: number;
}
export interface Actor extends Point {
  technical?: import("./npc-cognition").NpcProfile;
  id: string;
  name: string;
  floor: number;
  hp: number;
  alive: boolean;
  escaped: boolean;
  heading: Point;
  speed: number;
  access: number[];
  inventory: Item[];
  target?: Point;
  navTarget?: Point;
  station?: string;
  noiseUntil?: number;
  noiseLevel?: number;
  blockedTime?: number;
  threatMemory?: import("./npc-threat-memory").ThreatMemory;
  fleeTarget?: Point;
  fleeUntil?: number;
  fleeFloor?: number;
  fleeRouteThreats?: string[];
  pickupTrip?: number;
  activity?:
    "exploring" | "defending" | "studying" | "fleeing" | "climbing" | "waiting";
  path: import("./navigation").NavStep[];
  repath: number;
  cooldown: number;
  intent?: string;
  taskSearch?: { floor: number; seen: number; after: number; station?: string };
  furnitureYield?: { floor: number; target: Point; until: number };
  thought: number;
  milestone: number;
  skill: number;
  risk: number;
  social: number;
  role: string;
  handling?: string;
  defensePlan?: {
    encounter: string;
    object: string;
    target: Point;
    route: Point[];
    idle: number;
    exit?: Point;
  };
  defenseRetryAt?: number;
  exploringDoor?: { id: string; floor: number; goal: Point };
  exploreStall?: number;
  failedExplore?: { point: Point; floor: number; until: number }[];
  stairTravel?: import("./stair-travel").StairTravel;
  vault?: {
    from: Point;
    to: Point;
    left: number;
    duration: number;
    obstacle?: string;
  };
  seen: string[];
}
export interface Zombie extends Point {
  id: string;
  floor: number;
  hp: number;
  path: Point[];
  repath: number;
  cooldown: number;
  target?: Point;
  memory: number;
  stagger: number;
  origin: "outside";
  stairUntil?: number;
}
export type FurnitureKind =
  "chair" | "desk" | "sofa" | "fridge" | "shelf" | "gate" | "door";
export interface Furniture extends Point {
  lastMoveTick?: number;
  initial?: { x: number; y: number; w: number; h: number };
  id: string;
  floor: number;
  kind: FurnitureKind;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  speed: number;
  rotation: number;
  destroyed: boolean;
  movers: string[];
  moved: number;
  credited: string[];
  lastBy?: string;
  turning: number;
  open?: boolean;
}
export interface Station extends Point {
  id: string;
  encounter: string;
}
export interface Floor {
  layout?: "gallery" | "archive" | "switchback";
  rooms?: { index: number; side: "left" | "right"; innerMouth?: Point }[];
  index: number;
  tiles: number[][];
  stations: Station[];
  furniture: Furniture[];
  dark: number;
  name: string;
  doors: Point[];
  stairs: Point;
  entry: Point;
}
export interface Artifact {
  executionId?: string;
  wallTime?: string;
  delta?: { prefix: number; removed: string; inserted: string };
  seq: number;
  author: string;
  kind:
    | "edit"
    | "reasoning"
    | "test"
    | "defense"
    | "npc-thought"
    | "npc-proposal"
    | "workspace-view"
    | "source-view"
    | "validation"
    | "activity"
    | "tutor"
    | "completion"
    | "starter"
    | "execution"
    | "chat";
  text: string;
  at: number;
  revision: number;
  refs?: string[];
  presented?: number;
}
export interface Message {
  sourceRefs?: number[];
  requestId?: string;
  id: string;
  author: string;
  kind: "human" | "npc" | "tutor" | "system";
  text: string;
  seq: number;
  worldTime: number;
  presented?: number;
  provenance: string;
}
export interface Submission {
  id: string;
  revision: number;
  author: string;
  content: string;
  status: "pending" | "complete" | "needs-work" | "error";
  feedback: string;
  seq: number;
}
export interface Problem {
  runtime?: { language: "python" | "typescript" };
  title: string;
  prompt: string;
  rubric: string[];
  starter: string;
  provenance: "development" | "study-mode";
  validation?: { kind: "trace"; answer: number };
  contract: Contract;
  scopeDefinitions?: ScopeDefinition[];
}
export interface Encounter {
  simulatedOutcome?: import("./npc-outcome").SimulatedOutcome;
  outcomeInspection?: import("./npc-outcome").OutcomeInspection;
  outcomeNotice?: string;
  humanEngaged?: boolean;
  materializations?: import("./npc-materialization").Materialization[];
  materializationNotice?: string;
  proposals?: import("./workspace-proposals").WorkspaceProposal[];
  catchups?: import("./chat-catchup").CatchupBatch[];
  catchupNotice?: string;
  npcWork?: import("./npc-cognition").NpcWork[];
  groupRequest?: string;
  executions?: import("./execution").WorkspaceExecution[];
  runId?: string;
  problemPresentedSequence?: number;
  id: string;
  floor: number;
  mode: "solo" | "shared";
  reward: "stairs" | "loot";
  state: "available" | "in-progress" | "submitted" | "consumed";
  owner?: string;
  problem?: Problem;
  workspace: string;
  workspaceBase?: string;
  revision: number;
  history: Artifact[];
  group: Message[];
  tutor: Message[];
  submissions: Submission[];
  contributors: string[];
  accepted?: string;
  chatCursor: number;
  chatOpen: boolean;
  recentSpeakers: string[];
  npcProgress: number;
  loot: Item[];
  scroll: number;
  selection: [number, number];
  generation?: string;
  error?: string;
}
export interface Item {
  id: string;
  kind:
    "medkit" | "bubble" | "flare" | "repulsor" | "weapon" | "decoy" | "battery";
  weight: number;
  charges: number;
}
export interface WorldEvent {
  stairContact?: boolean;
  position?: Point;
  seq: number;
  at: number;
  type: string;
  actor?: string;
  floor: number;
  text: string;
  encounter?: string;
}
export interface Surge {
  state: "calm" | "warning" | "active";
  anchor: number;
  quietDelay: number;
  started: number;
  duration: number;
  lastDeath: number;
  lastEnd: number;
}
export interface Settings {
  volume: number;
  captions: boolean;
  reducedFlash: boolean;
}
export interface Game {
  tick?: number;
  schema: 1;
  id: string;
  seed: number;
  rng: number;
  time: number;
  seq: number;
  status: "ready" | "playing" | "dead" | "escaped";
  floors: Floor[];
  survivors: Actor[];
  zombies: Zombie[];
  encounters: Record<string, Encounter>;
  events: WorldEvent[];
  surge: Surge;
  nextSpawn: number;
  spawned: number;
  helicopter: {
    trip: number;
    next: number;
    until: number;
    passengers: string[];
  };
  effects: {
    kind: string;
    floor: number;
    x: number;
    y: number;
    until: number;
    radius: number;
  }[];
  study: StudyState;
  settings: Settings;
  stats: { breaches: number; rescued: number; deaths: number };
  notice: string;
}
export const W = 44,
  H = 34;
export const CONFIG = {
  floors: 4,
  npcs: 19,
  zombieSpeed: 2.05,
  playerSpeed: 3.3,
  npcSpeed: 2.9,
  quietMin: 420,
  quietMax: 720,
  warning: 12,
  surgeMin: 60,
  surgeMax: 120,
  stairSeconds: 2,
  helicopterInterval: 105,
  boardingWindow: 24,
  capacity: 6,
  spawnInterval: 8,
  openingHorde: 90,
  openingBatch: 3,
  reinforcementBatch: 1,
};
export const FURNITURE: Record<
  FurnitureKind,
  { w: number; h: number; hp: number; speed: number }
> = {
  chair: { w: 0.8, h: 0.8, hp: 95, speed: 1.7 },
  desk: { w: 2.2, h: 1, hp: 850, speed: 0.8 },
  sofa: { w: 2.7, h: 1, hp: 1400, speed: 0.55 },
  fridge: { w: 1.1, h: 1.1, hp: 2100, speed: 0.38 },
  shelf: { w: 2.8, h: 1, hp: 3200, speed: 0.32 },
  gate: { w: 2, h: 0.7, hp: 600, speed: 0 },
  door: { w: 1, h: 3, hp: 240, speed: 0 },
};
export function rand(g: { rng: number }) {
  let t = (g.rng += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  g.rng >>>= 0;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);
export function event(
  g: Game,
  type: string,
  text: string,
  floor = 0,
  actor?: string,
  encounter?: string,
): WorldEvent {
  const e = { seq: ++g.seq, at: g.time, type, text, floor, actor, encounter };
  g.events.push(e);
  if (g.events.length > 3000) g.events.splice(0, g.events.length - 3000);
  return e;
}
