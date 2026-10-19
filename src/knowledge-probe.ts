import type { Encounter, Game, Problem } from "./model";

/**
 * Knowledge probing for the private Terminal AI conversation.
 *
 * The stance: assume the learner already has the knowledge. The tutor opens
 * with the highest-leverage question, treats one correct answer as evidence
 * for everything that answer necessarily depends on, reads how the answer was
 * given (precision, structure, hedging) as a signal, and when the learner says
 * they do not know something it stops probing, records the gap, and lets the
 * once-only gameplay reward proceed. Gameplay rewards never certify mastery;
 * the separate assessment path still judges independence.
 */
export interface ProbeFacet {
  id: string;
  description: string;
}
export type ProbeFindingStatus = "demonstrated" | "implied" | "gap";
export interface ProbeFinding {
  id: string;
  status: ProbeFindingStatus;
  /** For implied facets: the demonstrated facet whose answer entails this one. */
  impliedBy?: string;
  note?: string;
}
export type AnswerFluency = "fluent" | "partial" | "guessing" | "declared-gap";
export interface AnswerSignal {
  fluency: AnswerFluency;
  note?: string;
}
export type ProbeOutcome = "continue" | "solved" | "gap";
export interface ProbeReply {
  complete: boolean;
  outcome: ProbeOutcome;
  findings: ProbeFinding[];
  signal?: AnswerSignal;
}
export interface ProbeTurn extends ProbeReply {
  requestId: string;
  questionSequence: number;
  at: string;
}
/** Per-encounter probe record. Facets are frozen with the question. */
export interface KnowledgeProbe {
  facets: ProbeFacet[];
  turns: ProbeTurn[];
}
/** A learner-declared gap recorded when the terminal conceded the key. */
export interface KnowledgeGapRecord {
  id: string;
  encounter: string;
  runId: string;
  track: string;
  objectiveIds: string[];
  depth: number;
  facet: ProbeFacet;
  /** The learner's own words from the turn that declared the gap. */
  statement: string;
  requestId: string;
  provider: string;
  at: string;
}
/** A facet established at a terminal (answered, or implied by an answer); carried across runs, never mastery. */
export interface KnowledgeEstablishedRecord {
  id: string;
  encounter: string;
  runId: string;
  track: string;
  objectiveIds: string[];
  depth: number;
  facet: ProbeFacet;
  status: "demonstrated" | "implied";
  /** For implied facets: the facet whose correct answer entailed this one. */
  impliedBy?: string;
  requestId: string;
  provider: string;
  at: string;
}
export type FacetState = ProbeFindingStatus | "open";
export interface ProbeState {
  facets: (ProbeFacet & { status: FacetState; impliedBy?: string })[];
  established: number;
  gaps: number;
  total: number;
  outcome?: ProbeOutcome;
  lastSignal?: AnswerSignal;
}

export const PROBE_STANCE =
  'Assume the learner already has this knowledge; they will tell you when they do not. Do not walk the rubric item by item. Open with the single highest-leverage question: the one whose correct answer necessarily depends on the other facets, so one good answer establishes several at once. When an answer demonstrates facet X and X cannot be answered correctly without Y and Z, mark Y and Z implied by X instead of asking about them. Read how the answer is given, not only whether it is right: precise vocabulary, correct ordering of steps, unprompted boundaries and confident specifics are evidence of knowledge; vague restatement, hedging, guessed numbers or asking what the question means are signals to probe one level down rather than to assume a gap. Ask about a facet only when nothing so far establishes it. When the learner states they do not know a facet, or asks for the answer, do not lecture and do not withhold the reward. If that facet encompasses other facets (it is the apex question X whose answer depends on Y and Z), the gap is not yet fleshed out: probe Y and Z next, one level down, so the recorded gap is only the parts actually missing; mark the parts they can answer demonstrated and only the parts they cannot as gaps. Once a facet has no parts left to descend to, report it as a gap with their own words and stop probing it. Return complete:true with outcome:"gap" once every remaining facet is either established or declared a gap at its lowest level. A declared gap is recorded for later study; it is not a failure and never a reason to keep the learner at the terminal.';

export const TERMINAL_DIALOGUE_FORMAT = {
  text: "string",
  complete: "boolean",
  outcome: "solved|gap (only with complete:true; omit while continuing)",
  knowledge: {
    facets: [
      {
        id: "a probe facet id from probe.facets",
        status: "demonstrated|implied|gap",
        impliedBy: "the demonstrated facet id, for implied only",
        note: "short evidence excerpt or reason",
      },
    ],
    signal: {
      fluency: "fluent|partial|guessing|declared-gap",
      note: "how the latest answer was given",
    },
  },
} as const;

export const TERMINAL_DIALOGUE_INSTRUCTION =
  "@study: Continue this private puzzle conversation. Judge the learner's accumulated answers against every part of the question and rubric. Return {text,complete,outcome?,knowledge?}. " +
  PROBE_STANCE +
  ' Ask a focused follow-up with complete:false while a facet is still open. Set complete:true with outcome:"solved" when the learner\'s messages and saved work supply a correct, sufficiently supported solution; set complete:true with outcome:"gap" when the learner has declared they do not know what remains and no lower-level facet is left to probe, and name those facets as gaps in knowledge.facets. In knowledge.facets use only ids from probe.facets, with status demonstrated, implied (with impliedBy) or gap; add knowledge.signal describing how the latest answer was given. Your own explanations are assistance, not learner evidence. Do not demand a separate submission or repeat already demonstrated reasoning. Do not claim execution without matching receipts. Gameplay completion is separate from independent mastery.';

const facetId = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

/** The facets a terminal probes: stable scope facets when the problem has them, else its rubric. */
export function probeFacets(
  problem: Pick<Problem, "rubric" | "scopeDefinitions">,
): ProbeFacet[] {
  const facets: ProbeFacet[] = [];
  const seen = new Set<string>();
  for (const scope of problem.scopeDefinitions ?? [])
    for (const f of scope.facets ?? [])
      if (
        f &&
        typeof f.id === "string" &&
        f.id &&
        typeof f.description === "string" &&
        !seen.has(f.id)
      ) {
        seen.add(f.id);
        facets.push({ id: f.id, description: f.description });
      }
  if (facets.length) return facets;
  problem.rubric.forEach((criterion, i) => {
    const id = `rubric-${i + 1}-${facetId(criterion) || "criterion"}`;
    if (seen.has(id)) return;
    seen.add(id);
    facets.push({ id, description: criterion });
  });
  return facets;
}

/** The request-side probe contract sent with every terminal-dialogue turn. */
export function probeContract(
  problem: Pick<Problem, "rubric" | "scopeDefinitions">,
) {
  return {
    stance: PROBE_STANCE,
    facets: probeFacets(problem),
    findingStatuses: ["demonstrated", "implied", "gap"],
    fluency: ["fluent", "partial", "guessing", "declared-gap"],
  };
}

const FINDING_STATUSES = new Set<string>(["demonstrated", "implied", "gap"]);
const FLUENCY = new Set<string>([
  "fluent",
  "partial",
  "guessing",
  "declared-gap",
]);
const object = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const shortText = (v: unknown, limit: number) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, limit) : undefined;

/**
 * Validate the optional knowledge fields of a terminal-dialogue reply.
 * Structural errors throw (the reply is interrupted, never silently applied);
 * ids outside the probe universe are dropped so a stray label cannot create
 * or erase a facet the question never had.
 */
export function parseProbeReply(
  answer: Record<string, unknown>,
  facets: ProbeFacet[],
): ProbeReply {
  if (typeof answer.complete !== "boolean")
    throw Error("Invalid tutor reply: complete must be boolean");
  const complete = answer.complete;
  if (
    answer.outcome !== undefined &&
    answer.outcome !== "solved" &&
    answer.outcome !== "gap"
  )
    throw Error(
      'Invalid tutor knowledge report: outcome must be "solved" or "gap"',
    );
  let outcome: ProbeOutcome = "continue";
  if (complete) outcome = answer.outcome === "gap" ? "gap" : "solved";
  const known = new Set(facets.map((f) => f.id));
  const findings: ProbeFinding[] = [];
  let signal: AnswerSignal | undefined;
  if (answer.knowledge !== undefined) {
    if (!object(answer.knowledge))
      throw Error(
        "Invalid tutor knowledge report: knowledge must be an object",
      );
    const k = answer.knowledge;
    if (k.facets !== undefined) {
      if (!Array.isArray(k.facets) || k.facets.length > 64)
        throw Error(
          "Invalid tutor knowledge report: knowledge.facets must be a bounded array",
        );
      const seen = new Set<string>();
      for (const raw of k.facets) {
        if (
          !object(raw) ||
          typeof raw.id !== "string" ||
          typeof raw.status !== "string" ||
          !FINDING_STATUSES.has(raw.status)
        )
          throw Error(
            "Invalid tutor knowledge report: each facet needs id and status demonstrated|implied|gap",
          );
        if (!known.has(raw.id) || seen.has(raw.id)) continue;
        seen.add(raw.id);
        const finding: ProbeFinding = {
          id: raw.id,
          status: raw.status as ProbeFindingStatus,
        };
        if (
          finding.status === "implied" &&
          typeof raw.impliedBy === "string" &&
          known.has(raw.impliedBy) &&
          raw.impliedBy !== raw.id
        )
          finding.impliedBy = raw.impliedBy;
        const note = shortText(raw.note, 400);
        if (note) finding.note = note;
        findings.push(finding);
      }
    }
    if (k.signal !== undefined) {
      if (
        !object(k.signal) ||
        typeof k.signal.fluency !== "string" ||
        !FLUENCY.has(k.signal.fluency)
      )
        throw Error(
          "Invalid tutor knowledge report: signal.fluency must be fluent|partial|guessing|declared-gap",
        );
      signal = { fluency: k.signal.fluency as AnswerFluency };
      const note = shortText(k.signal.note, 400);
      if (note) signal.note = note;
    }
  }
  // An implied facet needs a demonstrated anchor in this reply or an earlier one;
  // without one it still counts as the tutor's judgment, just unanchored.
  return { complete, outcome, findings, ...(signal ? { signal } : {}) };
}

/** Cumulative facet state: later turns re-judge earlier ones, per facet. */
export function probeState(e: Pick<Encounter, "probe">): ProbeState {
  const probe = e.probe;
  if (!probe) return { facets: [], established: 0, gaps: 0, total: 0 };
  const latest = new Map<string, ProbeFinding>();
  for (const turn of probe.turns)
    for (const f of turn.findings) latest.set(f.id, f);
  const facets = probe.facets.map((f) => {
    const finding = latest.get(f.id);
    return {
      ...f,
      status: (finding?.status ?? "open") as FacetState,
      ...(finding?.impliedBy ? { impliedBy: finding.impliedBy } : {}),
    };
  });
  const last = probe.turns.at(-1);
  return {
    facets,
    established: facets.filter((f) =>
      ["demonstrated", "implied"].includes(f.status),
    ).length,
    gaps: facets.filter((f) => f.status === "gap").length,
    total: facets.length,
    ...(last?.outcome && last.outcome !== "continue"
      ? { outcome: last.outcome }
      : {}),
    ...(last?.signal ? { lastSignal: last.signal } : {}),
  };
}

/** One line for the terminal HUD. */
export function probeSummary(e: Pick<Encounter, "probe">): string {
  const s = probeState(e);
  if (!s.total) return "";
  const parts = [`${s.established} of ${s.total} facets established`];
  if (s.gaps) parts.push(`${s.gaps} recorded gap${s.gaps === 1 ? "" : "s"}`);
  if (s.lastSignal)
    parts.push(
      `last answer ${s.lastSignal.fluency === "declared-gap" ? "declared a gap" : s.lastSignal.fluency}`,
    );
  return parts.join(" · ");
}

const gapKey = (encounter: string, facet: string) => `${encounter}#${facet}`;

/**
 * Record one validated terminal reply. When the terminal concedes the key on
 * a declared gap, every facet not established by then is recorded as a gap
 * in the carried study state, once per encounter facet.
 */
export function recordProbeTurn(
  g: Game,
  e: Encounter,
  reply: ProbeReply,
  context: {
    requestId: string;
    questionSequence: number;
    provider: string;
    statement: string;
    at?: string;
  },
): KnowledgeGapRecord[] {
  const problem = e.problem;
  if (!problem) return [];
  const at = context.at ?? new Date().toISOString();
  e.probe ??= { facets: probeFacets(problem), turns: [] };
  if (e.probe.turns.some((t) => t.requestId === context.requestId)) return [];
  e.probe.turns.push({
    ...reply,
    requestId: context.requestId,
    questionSequence: context.questionSequence,
    at,
  });
  // Chat after the key was awarded is kept as probe history, but it neither
  // rewrites what the terminal established nor opens new study targets.
  if (e.state === "consumed") return [];
  syncEstablished(g, e, context, at);
  if (reply.outcome !== "gap") return [];
  const state = probeState(e);
  const declared = new Set(
    reply.findings.filter((f) => f.status === "gap").map((f) => f.id),
  );
  const gapFacets = state.facets.filter((f) =>
    declared.size
      ? declared.has(f.id)
      : f.status !== "demonstrated" && f.status !== "implied",
  );
  const encounterRef = `${e.runId ?? g.id}/${e.id}`;
  const existing = new Set(
    (g.study.knowledgeGaps ?? []).map((r) => gapKey(r.encounter, r.facet.id)),
  );
  const created: KnowledgeGapRecord[] = [];
  for (const facet of gapFacets) {
    if (existing.has(gapKey(encounterRef, facet.id))) continue;
    const record: KnowledgeGapRecord = {
      id: `gap-${encounterRef}-${facet.id}`,
      encounter: encounterRef,
      runId: e.runId ?? g.id,
      track: problem.contract.track,
      objectiveIds: [...problem.contract.objectiveIds],
      depth: problem.contract.depth,
      facet: { id: facet.id, description: facet.description },
      statement: context.statement.slice(0, 1000),
      requestId: context.requestId,
      provider: context.provider,
      at,
    };
    (g.study.knowledgeGaps ??= []).push(record);
    created.push(record);
  }
  return created;
}

/**
 * Mirror this encounter's established facets into the carried study state:
 * a correct answer to X records X, and every Y and Z it implied, so a later
 * terminal on the same scope does not probe them again. A later re-judgment
 * within the encounter replaces or withdraws the record.
 */
function syncEstablished(
  g: Game,
  e: Encounter,
  context: { requestId: string; provider: string },
  at: string,
) {
  const problem = e.problem;
  if (!problem) return;
  const encounterRef = `${e.runId ?? g.id}/${e.id}`;
  const records = (g.study.knowledgeEstablished ??= []);
  const established = probeState(e).facets.filter(
    (f) => f.status === "demonstrated" || f.status === "implied",
  );
  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i];
    if (r.encounter !== encounterRef) continue;
    const current = established.find((f) => f.id === r.facet.id);
    if (!current) {
      records.splice(i, 1);
      continue;
    }
    if (current.status !== r.status || current.impliedBy !== r.impliedBy) {
      const { impliedBy: _dropped, ...rest } = r;
      records[i] = {
        ...rest,
        status: current.status as "demonstrated" | "implied",
        ...(current.impliedBy ? { impliedBy: current.impliedBy } : {}),
        requestId: context.requestId,
        at,
      };
    }
  }
  for (const f of established) {
    if (
      records.some((r) => r.encounter === encounterRef && r.facet.id === f.id)
    )
      continue;
    records.push({
      id: `known-${encounterRef}-${f.id}`,
      encounter: encounterRef,
      runId: e.runId ?? g.id,
      track: problem.contract.track,
      objectiveIds: [...problem.contract.objectiveIds],
      depth: problem.contract.depth,
      facet: { id: f.id, description: f.description },
      status: f.status as "demonstrated" | "implied",
      ...(f.impliedBy ? { impliedBy: f.impliedBy } : {}),
      requestId: context.requestId,
      provider: context.provider,
      at,
    });
  }
  if (!records.length) delete g.study.knowledgeEstablished;
}

/** Established records for an encounter. */
export function encounterEstablished(
  g: Game,
  e: Encounter,
): KnowledgeEstablishedRecord[] {
  const ref = `${e.runId ?? g.id}/${e.id}`;
  return (g.study.knowledgeEstablished ?? []).filter(
    (r) => r.encounter === ref,
  );
}

/** Gap records for an encounter, for the terminal and inspector views. */
export function encounterGaps(g: Game, e: Encounter): KnowledgeGapRecord[] {
  const ref = `${e.runId ?? g.id}/${e.id}`;
  return (g.study.knowledgeGaps ?? []).filter((r) => r.encounter === ref);
}

/** Short progress-context note so the next question can target recorded gaps. */
export function knowledgeGapContext(g: Game, track: string): string {
  const gaps = (g.study.knowledgeGaps ?? []).filter((r) => r.track === track);
  if (!gaps.length) return "";
  return (
    "Learner-declared knowledge gaps recorded at earlier terminals (study targets, not failures):\n" +
    gaps
      .slice(-20)
      .map(
        (r) =>
          `- ${r.objectiveIds.join(", ")} D${r.depth} · ${r.facet.description} · learner said: ${JSON.stringify(r.statement.slice(0, 200))}`,
      )
      .join("\n")
  );
}

/** Progress-context note listing facets already established, so they are not probed again. */
export function knowledgeEstablishedContext(g: Game, track: string): string {
  const known = (g.study.knowledgeEstablished ?? []).filter(
    (r) => r.track === track,
  );
  if (!known.length) return "";
  return (
    "Facets already established at earlier terminals (answered, or implied by a correct answer). Treat them as known: do not re-probe them unless the current answer contradicts one. Terminal observations, not curriculum mastery:\n" +
    known
      .slice(-40)
      .map(
        (r) =>
          `- ${r.objectiveIds.join(", ")} D${r.depth} · ${r.facet.description} · ${r.status}${r.impliedBy ? ` (implied by ${r.impliedBy})` : ""}`,
      )
      .join("\n")
  );
}

/** Both notes for the next tutor request on a track. */
export function knowledgeProbeContext(g: Game, track: string): string {
  return [knowledgeEstablishedContext(g, track), knowledgeGapContext(g, track)]
    .filter(Boolean)
    .join("\n\n");
}
