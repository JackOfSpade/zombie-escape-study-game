import type { Contract, Track } from "./model";
export type CellState = "U" | "G" | "P" | "R" | "—";
export interface ScopeDefinition {
  id: string;
  objectiveId: string;
  depth: number;
  sourceScope: string;
  facets: { id: string; description: string }[];
}
export interface FacetProof {
  outcome: "independent" | "assisted" | "unknown" | "contradicted";
  evidenceIds: string[];
  updatedAt: string;
}
export interface HistoricalFacetMapping {
  scopeId: string;
  facet: string;
  sourceHash: string;
  evidenceIds: string[];
  outcome: FacetProof["outcome"];
  rationale: string;
  /** Exact source observation excerpt required for an independent part of a MIXED row. */
  sourceExcerpts?: Record<string, string>;
}
export interface HistoricalFacetReview extends HistoricalFacetMapping {
  assessmentId: string;
  reviewedAt: string;
}
export interface LearningCell {
  states: CellState[];
  proofs: Record<string, string[]>;
  facets: Record<string, FacetProof>;
  sourceRefs: string;
}
export interface FinalProgress {
  kind: "transfer" | "integration";
  status: CellState;
  proofs: Record<string, string[]>;
  facets: Record<string, FacetProof>;
  sourceRefs: string;
}
export const isFinalTarget = (id: string) =>
  /^(PY|PE):(?:[TX]\d{2}|I\d{2})$/.test(id);
export const scopeKey = (id: string, depth: number) =>
  `${id}/${isFinalTarget(id) ? "T4" : `D${depth}`}`;
export function learningProgress(
  l: LearnerLedger,
  id: string,
): LearningCell | FinalProgress {
  const p = l.cells[id] ?? l.finalProgress?.[id];
  if (!p) throw Error(`Missing learning progress ${id}`);
  return p;
}
export function progressStatus(p: LearningCell | FinalProgress, depth: number) {
  return "states" in p ? p.states[depth - 1] : p.status;
}
export function setProgressStatus(
  p: LearningCell | FinalProgress,
  depth: number,
  status: CellState,
) {
  if ("states" in p) p.states[depth - 1] = status;
  else p.status = status;
}
export interface ReviewRecord {
  objectiveId: string;
  depth: number;
  due: string;
  stage: number;
  lastIndependentAt?: string;
  lastIndependentDate?: string;
  sequence?: string;
  verifiedReviews: number;
}
export interface LearningEvidence {
  id: string;
  attemptId: string;
  encounter: string;
  objectiveId: string;
  depth: number;
  facet: string;
  outcome: string;
  artifactSequences: number[];
  helpMessageIds: string[];
  at: string;
  observedAt?: string;
  execution: "not-run" | "executed";
  rationale: string;
}
export interface LearningAttempt {
  id: string;
  session: string;
  encounter: string;
  contract: Contract;
  status:
    | "in-progress"
    | "served"
    | "interrupted"
    | "suspended"
    | "externally-resolved";
  externalResolution?: {
    adoptionId: string;
    canonicalHash: string;
    sourceRow: string;
    disposition: string;
    humanCutoff: number;
    assessedHumanSequences: number[];
    at: string;
  };
  startedAt: string;
  lap?: number;
  endedAt?: string;
  parentAttempt?: string;
}
export interface TrackState {
  tier: number;
  cleared: number;
  phase: string;
  queue: string[];
  lap: number;
  suspended: { tier: number; phase: string; queue: string[]; lap?: number }[];
}
export interface LearnerLedger {
  identifierCounters?: import("./roadmap-identifiers").IdentifierCounters;
  roadmapAdoptions?: import("./roadmap-adoption-types").RoadmapAdoptionReceipt[];
  environmentEvidence?: import("./environment-status").EnvironmentEvidence[];
  schema: 1;
  mode: "live" | "test";
  sourceHash: string;
  version: number;
  cycle: number;
  cycleOffset?: number;
  cells: Record<string, LearningCell>;
  finalProgress?: Record<string, FinalProgress>;
  historicalReviews?: HistoricalFacetReview[];
  scopes: Record<string, ScopeDefinition>;
  verifiedScopes: string[];
  tracks: Record<Track, TrackState>;
  reviews: Record<string, ReviewRecord>;
  sessions: {
    id: string;
    status: "imported" | "open" | "closed" | "INTERRUPTED_AT_LAST_SAVE";
    startedAt?: string;
  }[];
  currentSession?: string;
  attempts: LearningAttempt[];
  evidence: LearningEvidence[];
  receipts: Record<
    string,
    { signature: string; version: number; evidenceIds: string[] }
  >;
  continuations: {
    attemptId: string;
    encounter: string;
    objectiveIds: string[];
    depth: number;
    at: string;
  }[];
}

export const studyRatioPosition = (s: {
  cycle: number;
  cycleOffset?: number;
}) => (s.cycle + (s.cycleOffset ?? 0)) % 3;
