import { reconcileRoadmap } from "./roadmap-adoption";
import { inspectNpcOutcome, outcomeIsVisible } from "./npc-outcome";
import { adoptedSourceText } from "./imported-proof";
import { reviewEnvironment } from "./environment-review";
import { humanUsingWorkspace, npcAtWorkstation } from "./npc-work-access";
import { runWorkspace } from "./execution";
import { hasHumanStudyContext } from "./npc-cognition";
import { applyAutonomousProposal, proposalText } from "./workspace-proposals";
import { materializeNpcWork } from "./npc-materialization";
import {
  generateCatchup,
  unseenWork,
  workKinds,
  coverCatchupsWithRecordedLog,
} from "./chat-catchup";
import { npcProfile, taskSkill, relevantFocus } from "./npc-cognition";
import { groupSnapshot, validateGroupReply } from "./group-grounding";
import {
  type Game,
  type Encounter,
  type Roadmap,
  type Problem,
  type Message,
  type Assessment,
  rand,
  event,
} from "./model";
import {
  eligible,
  beginVisit,
  finishVisit,
  evidencePacket,
  syncLearningView,
} from "./curriculum";
import { complete } from "./engine";
import {
  applyLearningAssessment,
  initialLearner,
  registerScopes,
  encounterKey,
} from "./learner";
const live = (g: Game) =>
  g.study.profile === "live" && status().mode === "study-mode";
export function materializeObservedWork(g: Game, e: Encounter, retry = false) {
  if (!live(g) || !status().capabilities.includes("materialize-work")) return;
  return materializeNpcWork(
    g,
    e,
    (payload) => request("materialize-work", payload),
    retry,
    { allowAutonomous: status().capabilities.includes("autonomous-work") },
  );
}
export function inspectCompletedNpcWork(
  g: Game,
  e: Encounter,
  r: Roadmap,
  retry = false,
) {
  if (!live(g) || !status().capabilities.includes("materialize-outcome")) {
    e.outcomeNotice =
      "Exact survivor solutions require the connected native outcome-inspection capability. The simulated world result is preserved.";
    return;
  }
  return inspectNpcOutcome(
    g,
    e,
    r,
    {
      request,
      validate(p, c) {
        if (p.provenance !== "study-mode")
          throw Error(
            "Reconstructed native problem must retain native provenance",
          );
        validateProblem(p, e, r, g, c);
        registerScopes(r, structuredClone(g.study.learner!), {
          ...e,
          problem: p,
        });
      },
    },
    retry,
  );
}
import { canSee } from "./visibility";
export interface BridgeStatus {
  mode: "development" | "study-mode";
  label: string;
  capabilities: string[];
  detail: string;
}
let bridgeStatus: BridgeStatus = {
  mode: "development",
  label: "Development fallback",
  capabilities: [],
  detail:
    "Native ChatGPT Study Mode bridge is not connected. No real mastery awarded.",
};
export const status = () => bridgeStatus;
export async function checkBridge() {
  try {
    const r = await fetch("/api/status");
    if (!r.ok) throw Error();
    const info = await r.json();
    if (
      !["development", "study-mode"].includes(info.mode) ||
      !Array.isArray(info.capabilities) ||
      !info.capabilities.every((cap: unknown) => typeof cap === "string") ||
      typeof info.label !== "string" ||
      typeof info.detail !== "string"
    )
      throw Error("Malformed bridge capability handshake");
    bridgeStatus = info;
  } catch {
    bridgeStatus = {
      mode: "development",
      label: "Development fallback",
      capabilities: [],
      detail:
        "Bridge server unavailable. Local mechanics remain playable. No real mastery awarded.",
    };
  }
  return bridgeStatus;
}
async function request(operation: string, payload: unknown) {
  const r = await fetch("/api/bridge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation, payload }),
    signal: AbortSignal.timeout(45000),
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error ?? "Bridge request failed");
  return data;
}
function devProblem(g: Game, e: Encounter, r: Roadmap): Problem {
  const contract = eligible(r, g.study),
    n = 3 + Math.floor(rand(g) * 6),
    values = Array.from({ length: n }, () => Math.floor(rand(g) * 8)),
    threshold = 2 + Math.floor(rand(g) * 4);
  if (contract.track === "PY" && contract.objectiveIds[0] === "PY:T05.2") {
    const size = 2 + Math.floor(rand(g) * Math.min(3, n - 1)),
      sums = values
        .slice(0, n - size + 1)
        .map((_, i) => values.slice(i, i + size).reduce((a, b) => a + b, 0));
    return {
      title: "Signal window / prediction",
      prompt: `Development exercise · ${contract.review ? "scheduled review" : "D1"}\n\nAn intake monitor reads ${JSON.stringify(values)}. A window of ${size} consecutive readings moves one position at a time. Predict the largest window total. Explain what changes and what stays true when the window moves; describe a boundary worth checking. No full implementation is required.\n\nTarget scope: ${contract.scopes[0]}`,
      rubric: [
        "Correct predicted total",
        "Explain update/state and a relevant boundary",
      ],
      starter: "Prediction:\n\nReasoning:\n\nBoundary:",
      provenance: "development",
      validation: { kind: "trace", answer: Math.max(...sums) },
      contract,
    };
  }
  return {
    title:
      contract.track === "PY"
        ? "Signal contract / trace"
        : "Product decision / critique",
    prompt:
      contract.objectiveIds[0] === "PE:X09.1"
        ? `Development rehearsal · Use a REAL project you worked on. Briefly state the user problem, your personal role, and one actual decision. Separate your own work from the team’s work. Do not invent metrics.\n\n${contract.scopes[0]}`
        : contract.track === "PY"
          ? `Development rehearsal · D1\n\nRead this small Python trace:\n\nvalues = ${JSON.stringify(values)}\ncount = 0\nfor value in values:\n    if value > ${threshold}:\n        count += 1\n\nPredict count, explain the state after a processed prefix, and one boundary. This local practice is illustrative; the live generator must cover the exact scheduled scope below.\n\nScheduled scope: ${contract.scopes[0]}`
          : `Development rehearsal · D1\n\nA customer-facing creative tool lets a signed-in owner share a project with a read-only collaborator. Shared links can be revoked immediately. The service has ${n * 100} daily users. Explain the following scheduled capability using this scenario. Identify one assumption and a failure or boundary case. Multiple defensible answers are allowed. No implementation is required.\n\n${contract.scopes[0]}`,
    rubric: [
      "Address the supplied contract",
      "Explain assumptions and a boundary",
      "Use real personal history for narratives",
    ],
    starter: "My reasoning:\n\nAssumptions:\n\nBoundary / verification:",
    provenance: "development",
    validation:
      contract.track === "PY"
        ? { kind: "trace", answer: values.filter((v) => v > threshold).length }
        : undefined,
    contract,
  };
}
function validateProblem(
  p: Problem,
  e: Encounter,
  r: Roadmap,
  g: Game,
  c = eligible(r, g.study),
) {
  if (
    !p ||
    typeof p.prompt !== "string" ||
    p.prompt.length > 30000 ||
    typeof p.title !== "string" ||
    !Array.isArray(p.rubric) ||
    !p.rubric.every((x) => typeof x === "string") ||
    typeof p.starter !== "string" ||
    (p.runtime &&
      (!["python", "typescript"].includes(p.runtime.language) ||
        p.contract.depth < 2 ||
        (p.contract.track === "PY" && p.runtime.language !== "python"))) ||
    p.contract.depth !== c.depth ||
    JSON.stringify(p.contract.objectiveIds) !==
      JSON.stringify(c.objectiveIds) ||
    p.contract.track !== c.track
  )
    throw Error(`Invalid or out-of-scope generated problem for ${e.id}`);
  // The provider authors the question; scheduler metadata remains local authority.
  // This also prevents a response from stripping preserved historical scope.
  if (
    p.contract.ledgerVersion !== c.ledgerVersion ||
    p.contract.review !== c.review ||
    (p.contract.kind ?? "checkpoint") !== (c.kind ?? "checkpoint") ||
    p.contract.phase !== c.phase
  )
    throw Error(`Stale or altered learning contract for ${e.id}`);
  p.contract = structuredClone(c);
}
const generationCurrent = (g: Game, e: Encounter, id: string) =>
  g.encounters[e.id] === e &&
  e.generation === id &&
  e.state !== "consumed" &&
  !e.problem;
export async function ensureProblem(g: Game, e: Encounter, r: Roadmap) {
  if (e.problem || e.state === "consumed") return;
  if (g.study.profile === "live" && status().mode !== "study-mode") {
    e.error =
      "Live Study Mode bridge unavailable; work is preserved. Reconnect to continue this live profile.";
    return;
  }
  if (e.generation) return;
  const generation = `gen-${g.id}-${e.id}-${crypto.randomUUID()}`,
    study = g.study,
    profile = study.profile,
    native = live(g);
  e.generation = generation;
  try {
    let p: Problem;
    if (native) {
      const contract = eligible(r, study);
      p = await request("generate", {
        requestId: generation,
        encounterId: e.id,
        contract,
        existingScopeDefinitions: g.study.learner?.scopes,
        progressContext:
          adoptedSourceText(study.learner!)
            ?.split(`<!-- BEGIN ${contract.track}_PROGRESS -->`)[1]
            ?.split(`<!-- END ${contract.track}_PROGRESS -->`)[0] ??
          r.tracks[contract.track].progress,
        curriculum: r.tracks[contract.track].curriculum,
      });
      p.provenance = "study-mode";
    } else p = devProblem(g, e, r);
    if (
      g.study !== study ||
      study.profile !== profile ||
      !generationCurrent(g, e, generation)
    )
      return;
    validateProblem(p, e, r, g);
    if (native) {
      g.study.learner ??= initialLearner(r);
      registerScopes(r, g.study.learner, { ...e, problem: p });
    }
    e.problem = p;
    if (e.revision === 0 && !e.workspace) e.workspace = p.starter;
    e.state = "in-progress";
  } catch (err) {
    if (
      g.study === study &&
      study.profile === profile &&
      generationCurrent(g, e, generation)
    )
      e.error = String(err);
  } finally {
    if (e.generation === generation) delete e.generation;
  }
}
export function edit(
  g: Game,
  e: Encounter,
  text: string,
  revision: number,
  r?: Roadmap,
) {
  if (e.state === "consumed") return false;
  if (revision !== e.revision)
    throw Error("Workspace changed. Refresh before editing.");
  if (text === e.workspace) return true;
  if (r && g.study.profile === "live") {
    try {
      beginVisit(r, g.study, e);
    } catch (err) {
      e.error = String(err);
    }
  }
  const old = e.workspace;
  e.workspaceBase ??= old;
  e.workspace = text;
  e.revision++;
  const ev = event(
    g,
    "edit",
    "Human workspace edit saved.",
    e.floor,
    "human",
    e.id,
  );
  let prefix = 0;
  while (
    prefix < old.length &&
    prefix < text.length &&
    old[prefix] === text[prefix]
  )
    prefix++;
  let endOld = old.length,
    endNew = text.length;
  while (
    endOld > prefix &&
    endNew > prefix &&
    old[endOld - 1] === text[endNew - 1]
  ) {
    endOld--;
    endNew--;
  }
  e.history.push({
    seq: ev.seq,
    author: "human",
    kind: "edit",
    delta: {
      prefix,
      removed: old.slice(prefix, endOld),
      inserted: text.slice(prefix, endNew),
    },
    text: text.slice(prefix, endNew) || `Removed: ${old.slice(prefix, endOld)}`,
    at: g.time,
    wallTime: new Date().toISOString(),
    revision: e.revision,
    refs: [`previous:${old.length}`],
  });
  return true;
}
export function presentProblem(g: Game, e: Encounter, r?: Roadmap) {
  // A displayed scheduled assessment is issued even before an answer exists.
  // Generation alone, development practice and completed-lock inspection are not issuance.
  if (
    r &&
    g.study.profile === "live" &&
    e.problem?.provenance === "study-mode" &&
    e.state !== "consumed" &&
    !g.study.learner?.attempts.some((a) => a.encounter === encounterKey(e))
  ) {
    try {
      beginVisit(r, g.study, e);
    } catch (err) {
      // Unscheduled shared survival work remains available without becoming a personal visit.
      e.error = String(err);
    }
  }
  if (!e.problem || e.problemPresentedSequence !== undefined) return;
  const ev = event(
    g,
    "problem-presented",
    "Task and supplied starter became available to the human.",
    e.floor,
    "generator",
    e.id,
  );
  e.problemPresentedSequence = ev.seq;
  e.history.push({
    seq: ev.seq,
    author: "generator",
    kind: "starter",
    text: JSON.stringify({
      prompt: e.problem.prompt,
      starter: e.problem.starter,
    }),
    at: g.time,
    wallTime: new Date().toISOString(),
    revision: e.revision,
    presented: ev.seq,
  });
}
function message(
  g: Game,
  e: Encounter,
  channel: "group" | "tutor",
  author: string,
  kind: Message["kind"],
  text: string,
  provenance: string,
  sourceSeq?: number | number[],
) {
  const ev = event(
    g,
    "message",
    `${author}: ${text.slice(0, 120)}`,
    e.floor,
    author,
    e.id,
  );
  const m: Message = {
    id: `message-${ev.seq}`,
    author,
    kind,
    text,
    seq: ev.seq,
    worldTime: g.time,
    presented: kind === "human" || kind === "system" ? ev.seq : undefined,
    provenance,
    sourceRefs:
      sourceSeq === undefined
        ? undefined
        : Array.isArray(sourceSeq)
          ? sourceSeq
          : [sourceSeq],
  };
  e[channel].push(m);
  e.history.push({
    seq: ev.seq,
    author,
    kind: kind === "tutor" ? "tutor" : kind === "human" ? "reasoning" : "chat",
    text,
    at: g.time,
    wallTime: new Date().toISOString(),
    revision: e.revision,
    refs:
      sourceSeq === undefined
        ? undefined
        : (Array.isArray(sourceSeq) ? sourceSeq : [sourceSeq]).map(String),
    presented: m.presented,
  });
  return m;
}
export function presentMessages(
  g: Game,
  e: Encounter,
  channel: "group" | "tutor",
) {
  for (const m of e[channel]) {
    if (m.presented !== undefined) continue;
    const ev = event(
      g,
      "message-presented",
      `${m.author} message became visible.`,
      e.floor,
      m.author,
      e.id,
    );
    m.presented = ev.seq;
    const original = e.history.find((h) => h.seq === m.seq);
    if (original) original.presented = ev.seq;
    for (const ref of m.sourceRefs ?? []) {
      const proposal = e.history.find(
        (h) =>
          h.seq === ref && h.kind === "npc-proposal" && h.author === m.author,
      );
      if (proposal) proposal.presented = ev.seq;
    }
  }
}
export function openChat(g: Game, e: Encounter) {
  if (e.chatOpen) return;
  e.chatOpen = true;
  if (live(g) && status().capabilities.includes("retrospective-group"))
    return nativeCatchup(g, e);
  e.catchupNotice = live(g)
    ? "Recorded work summary · this bridge does not support retrospective dialogue."
    : g.study.profile === "live"
      ? "Recorded work summary · native catch-up unavailable."
      : "Recorded work summary · development mode.";
  const cutoff = g.seq;
  const fresh = unseenWork(e, cutoff);
  if (fresh.length > 3) {
    const older = fresh.slice(0, -3);
    const authors = [
      ...new Set(
        older.map(
          (h) => g.survivors.find((a) => a.id === h.author)?.name ?? h.author,
        ),
      ),
    ];
    message(
      g,
      e,
      "group",
      "Room log",
      "system",
      `Catch-up summary: ${older.length} earlier work/activity events involving ${authors.join(", ")}. Their saved artifacts remain available; no unseen conversation or executed tests are implied.`,
      "grounded-event-range-summary",
      older.map((h) => h.seq),
    );
  }
  for (const h of fresh.slice(-3)) {
    const a = g.survivors.find((a) => a.id === h.author);
    const technical = ["npc-thought", "npc-proposal"].includes(h.kind);
    message(
      g,
      e,
      "group",
      technical ? h.author : "Room log",
      technical ? "npc" : "system",
      `${technical ? `Saved work summary${a && (!a.alive || a.escaped) ? ` from ${a.name}, who has since left` : ""}` : "Room update"}: ${h.text}`,
      "grounded-development-catch-up",
      h.seq,
    );
  }
  e.chatCursor = cutoff;
  coverCatchupsWithRecordedLog(e);
}
function nativeCatchup(g: Game, e: Encounter) {
  return generateCatchup(g, e, {
    request: (payload) => request("group", payload),
    append: (author, kind, text, provenance, refs) =>
      message(g, e, "group", author, kind, text, provenance, refs),
  });
}
export function retryChatCatchup(g: Game, e: Encounter) {
  if (live(g) && status().capabilities.includes("retrospective-group"))
    return nativeCatchup(g, e);
  return Promise.resolve();
}
export function presentWorkLog(g: Game, e: Encounter) {
  for (const h of e.history.filter(
    (h) => workKinds.has(h.kind) && h.author !== "human",
  )) {
    if (h.presented !== undefined) continue;
    const ev = event(
      g,
      "work-presented",
      "Recorded group work became visible.",
      e.floor,
      h.author,
      e.id,
    );
    h.presented = ev.seq;
  }
}
export function closeChat(g: Game, e: Encounter) {
  e.chatOpen = false;
  // Work while open remains work history, never invented timestamped dialogue.
}

export function npcCanRespond(
  g: Game,
  e: Encounter,
  a: import("./model").Actor,
) {
  return (
    a.id !== "human" &&
    a.alive &&
    !a.escaped &&
    a.floor === e.floor &&
    a.intent === e.id &&
    a.thought > 5 &&
    g.zombies.every(
      (z) =>
        z.hp <= 0 ||
        z.floor !== a.floor ||
        Math.hypot(z.x - a.x, z.y - a.y) > 4 ||
        !canSee(g.floors[a.floor], a, z, 4),
    )
  );
}
export function responders(g: Game, e: Encounter, text: string) {
  const available = g.survivors.filter((a) => npcCanRespond(g, e, a));
  const ranked = available
    .map((a) => ({
      a,
      score:
        (text.toLowerCase().includes(a.name.toLowerCase()) ? 4 : 0) +
        taskSkill(a, e) * 0.8 +
        npcProfile(a).strengths[relevantFocus(text)] * 0.6 +
        ((e.npcWork ?? []).some(
          (w) => w.actor === a.id && w.focus === relevantFocus(text),
        )
          ? 0.2
          : 0) +
        a.social * 0.25 +
        (e.recentSpeakers.includes(a.id) ? -0.5 : 0) +
        rand(g) * 1.5,
    }))
    .sort((a, b) => b.score - a.score);
  const count = ranked.length > 2 && rand(g) < 0.2 ? 2 : 1;
  return ranked
    .slice(0, Math.min(count, Math.max(1, ranked.length - 1)))
    .map((x) => x.a);
}
export async function send(
  g: Game,
  e: Encounter,
  channel: "group" | "tutor",
  text: string,
  r: Roadmap,
) {
  const reconstruction = outcomeIsVisible(g, e, r)
    ? e.outcomeInspection?.candidate
    : undefined;
  const problem = e.problem ?? reconstruction?.problem;
  const workspace = reconstruction?.solution ?? e.workspace;
  if (!text.trim() || !problem) return;
  message(g, e, channel, "human", "human", text, "live-human");
  try {
    if (e.state !== "consumed") beginVisit(r, g.study, e);
  } catch {
    /* Non-eligible participation stays world-only. */
  }
  if (g.study.profile === "live" && !live(g)) {
    e.error =
      "Live tutor connection unavailable. Your question and work remain saved.";
    return;
  }
  if (channel === "tutor") {
    const tutorLive = live(g);
    try {
      const answer = tutorLive
        ? await request("tutor", {
            requestId: `tutor-${g.id}-${e.id}-${g.seq}`,
            sessionId: `${g.id}/${e.id}/private`,
            problem,
            workspace,
            ...(reconstruction
              ? {
                  retrospectiveOutcome:
                    "Reconstruction authored now from a simulated NPC-only completion; no historical execution or human assessment.",
                }
              : {}),
            messages: e.tutor,
            learning: problem.contract,
          })
        : {
            text: `Development coach (not native Study Mode): What does the contract say must be true before and after the step you are considering? Try a small case in your own words, then identify which assumption your reasoning depends on. I can help you examine that next.`,
          };
      if (typeof answer.text !== "string") throw Error("Invalid tutor reply");
      message(
        g,
        e,
        "tutor",
        "Terminal AI",
        "tutor",
        answer.text,
        tutorLive ? "study-mode" : "development",
      );
    } catch (err) {
      message(
        g,
        e,
        "tutor",
        "Connection",
        "system",
        `Reply unavailable; work retained. ${String(err)}`,
        "error",
      );
    }
    return;
  }
  const selected = responders(g, e, text);
  e.recentSpeakers = selected.map((a) => a.id);
  if (!selected.length) return;
  if (live(g)) {
    const requestId = `group-${g.id}-${e.id}-${g.seq}`;
    e.groupRequest = requestId;
    const snapshot = groupSnapshot(e, requestId, g.seq);
    try {
      const reply = await request("group", {
        ...snapshot,
        mode: "reply",
        proposalFormat: {
          kind: "single-range",
          fields: ["prefix", "removed", "inserted"],
          offsetUnit: "utf16-code-units",
          maxChangedCharacters: 32000,
          instruction:
            "Optional patch on proposal messages only. Capture exact source text; no claim of application or test success. The human reviews before applying.",
        },
        sessionId: `${g.id}/${e.id}/public`,
        speakers: selected.map((a) => ({
          id: a.id,
          name: a.name,
          skill: taskSkill(a, e),
          role: a.role,
          profile: npcProfile(a),
          activity: a.activity,
        })),
        problem,
        workspace,
        ...(reconstruction
          ? {
              retrospectiveOutcome:
                "Read-only reconstructed NPC solution; no new edits or historical execution claims.",
            }
          : {}),
        messages: e.group,
        workRecords: (e.npcWork ?? []).slice(-16),
      });
      if (e.groupRequest !== requestId) return;
      if (e.revision !== snapshot.sourceRevision)
        throw Error(
          "Workspace changed during group reply; your question remains saved. Ask again for the current revision.",
        );
      const messages = validateGroupReply(
        reply,
        snapshot,
        selected.map((a) => a.id),
        workspace,
      );
      if (e.state === "consumed" && messages.some((m) => m.patch))
        throw Error(
          "Completed survivor solutions are read-only; preserve the validated reconstruction",
        );
      if (messages.some((m) => m.patch) && e.mode !== "shared")
        throw Error("Workspace candidates require a shared encounter");
      for (const m of messages) {
        const a = selected.find((a) => a.id === m.author)!;
        if (!npcCanRespond(g, e, a)) continue;
        let proposalSequence: number | undefined;
        if (m.kind === "proposal") {
          const ev = event(
            g,
            "npc-proposal",
            `${a.name} supplied an unvalidated candidate for revision ${snapshot.sourceRevision}.`,
            e.floor,
            a.id,
            e.id,
          );
          proposalSequence = ev.seq;
          e.history.push({
            seq: ev.seq,
            author: a.id,
            kind: "npc-proposal",
            text: m.patch ? proposalText(m.text, m.patch) : m.text,
            delta: m.patch ? structuredClone(m.patch) : undefined,
            at: g.time,
            revision: snapshot.sourceRevision,
            refs: m.refs.map(String),
          });
          if (m.patch) {
            e.proposals ??= [];
            e.proposals.push({
              id: `${requestId}/${a.id}`,
              author: a.id,
              sourceRevision: snapshot.sourceRevision,
              sourceSequence: snapshot.cutoff,
              artifactSequence: ev.seq,
              patch: structuredClone(m.patch),
              state: "pending",
            });
          }
        }
        const delivered = message(
          g,
          e,
          "group",
          a.id,
          "npc",
          m.kind === "proposal"
            ? `Candidate for workspace revision ${snapshot.sourceRevision} (not executed or validated):\n${m.patch ? proposalText(m.text, m.patch) : m.text}`
            : m.text,
          "study-mode",
          proposalSequence === undefined
            ? m.refs
            : [...m.refs, proposalSequence],
        );
        delivered.requestId = requestId;
      }
      delete e.groupRequest;
    } catch (err) {
      if (e.groupRequest === requestId) {
        e.error = String(err);
        delete e.groupRequest;
      }
    }
  } else
    for (const a of selected) {
      const last = e.history
        .filter((h) => h.author === a.id && h.kind === "npc-thought")
        .at(-1);
      message(
        g,
        e,
        "group",
        a.id,
        "npc",
        taskSkill(a, e) < 0.6
          ? "I am still working through the contract. Which assumption makes your example hold?"
          : last
            ? `My last work note: ${last.text} I have not executed any code. Can you show the boundary you are worried about?`
            : "I have a candidate idea, but have not validated it. Let’s trace your example against the stated constraints.",
        "development-grounded-reply",
        taskSkill(a, e) >= 0.6 ? last?.seq : undefined,
      );
    }
}
export async function submit(
  g: Game,
  e: Encounter,
  r: Roadmap,
  author = "human",
  proposalId?: string,
) {
  const candidate = e.proposals?.find((p) => p.id === proposalId);
  if (
    author !== "human" &&
    (!live(g) ||
      !status().capabilities.includes("autonomous-work") ||
      !npcAtWorkstation(g, e, author) ||
      humanUsingWorkspace(g, e) ||
      !candidate?.autonomous ||
      !candidate.appliedAutomatically ||
      candidate.sourceProblem !== JSON.stringify(e.problem) ||
      candidate.author !== author ||
      candidate.appliedRevision !== e.revision ||
      candidate.submissionId)
  )
    return;
  if (
    !e.problem ||
    e.state === "consumed" ||
    e.submissions.some((s) => s.status === "pending")
  )
    return;
  try {
    if (author === "human") beginVisit(r, g.study, e);
  } catch (err) {
    e.error = String(err);
  }
  const ev = event(
      g,
      "submission",
      "Submission captured; movement remains available.",
      e.floor,
      author,
      e.id,
    ),
    s = {
      id: `submit-${g.id}-${ev.seq}`,
      revision: e.revision,
      author,
      content: e.workspace,
      status: "pending" as "pending" | "complete" | "needs-work" | "error",
      feedback: "Checking captured revision…",
      seq: ev.seq,
    };
  e.submissions.push(s);
  if (candidate && author !== "human") candidate.submissionId = s.id;
  e.state = "submitted";
  try {
    if (g.study.profile === "live" && !live(g))
      throw Error(
        "Live completion unavailable; captured work retained. Development evaluation cannot replace it.",
      );
    if (author !== "human" && e.problem.runtime) {
      const job = await runWorkspace(g, e, r, author);
      if (!job?.receipt?.executed)
        throw Error(
          "NPC runtime validation unavailable; captured submission retained without automatic retry",
        );
    }
    let result: { complete: boolean; feedback: string; qualified: string[] };
    if (live(g))
      result = await request("complete", {
        requestId: s.id,
        encounterId: e.id,
        problem: e.problem,
        submission: s,
        submitter: author,
        history:
          author === "human" ? e.history : groupSnapshot(e, s.id, s.seq).events,
        executions: (e.executions ?? []).filter(
          (j) =>
            j.revision === s.revision &&
            j.code === s.content &&
            j.status === "finished",
        ),
      });
    else {
      await new Promise((resolve) => setTimeout(resolve, 350));
      const answer = e.problem.validation?.answer,
        hasPrediction =
          answer === undefined ||
          new RegExp(`(?:^|[^\\d])${answer}(?:[^\\d]|$)`).test(s.content),
        changed = s.content !== e.problem.starter;
      result = {
        complete: changed && hasPrediction && s.content.trim().length > 70,
        feedback:
          answer !== undefined
            ? "Development check: validates the predicted value plus the presence of explanation only; no semantic or mastery claim."
            : "Development completion simulation: reasoning has not been AI assessed. No curriculum credit.",
        qualified: ["human"],
      };
    }
    if (
      typeof result.complete !== "boolean" ||
      typeof result.feedback !== "string" ||
      !Array.isArray(result.qualified)
    )
      throw Error("Malformed completion response");
    if ((e.state as string) === "consumed" || g.encounters[e.id] !== e) {
      if (e.accepted === s.id) return;
      s.status = "error";
      s.feedback =
        "This evaluation was superseded; the accepted terminal record remains unchanged.";
      return;
    }
    s.status = result.complete ? "complete" : "needs-work";
    s.feedback = result.feedback;
    if (result.complete) {
      const allowed = new Set(
        e.history
          .filter(
            (h) =>
              [
                "defense",
                "edit",
                "reasoning",
                "test",
                "npc-thought",
                "npc-proposal",
              ].includes(h.kind) && h.seq <= s.seq,
          )
          .map((h) => h.author),
      );
      const qualified = [
        ...new Set([
          ...e.contributors.filter((a) =>
            e.history.some((h) => h.author === a && h.seq <= s.seq),
          ),
          ...result.qualified.filter((id) => allowed.has(id)),
        ]),
      ];
      e.contributors = qualified;
      complete(g, e.id, s.id, qualified, result.feedback);
      e.workspace = s.content;
      e.revision = s.revision;
      finishVisit(r, g.study, e);
      if (
        author === "human" ||
        e.history.some(
          (h) =>
            h.author === "human" &&
            ["edit", "reasoning", "test", "defense"].includes(h.kind) &&
            h.seq <= s.seq,
        )
      )
        void assess(g, e, r, s.seq);
    } else {
      e.state = "in-progress";
      if (author !== "human") {
        const feedback = event(
          g,
          "validation",
          "NPC submission needs more work.",
          e.floor,
          "validator",
          e.id,
        );
        e.history.push({
          seq: feedback.seq,
          author: "validator",
          kind: "validation",
          text: `Semantic feedback for ${s.id}: ${result.feedback}. This is not a runtime receipt.`,
          at: g.time,
          revision: s.revision,
          refs: [s.id],
        });
      }
    }
  } catch (err) {
    if ((e.state as string) === "consumed" && e.accepted === s.id) return;
    s.status = "error";
    s.feedback = `Evaluation unavailable; snapshot retained. ${String(err)}`;
    if ((e.state as string) !== "consumed" && g.encounters[e.id] === e)
      e.state = "in-progress";
  }
}
export async function assess(
  g: Game,
  e: Encounter,
  r: Roadmap,
  cutoff = Math.max(
    0,
    e.submissions.find((s) => s.id === e.accepted)?.seq ?? 0,
    ...e.history
      .filter(
        (h) =>
          h.author === "human" &&
          ["edit", "reasoning", "test", "defense", "execution"].includes(
            h.kind,
          ),
      )
      .map((h) => h.seq),
  ),
  retry = false,
) {
  cutoff = Math.max(
    0,
    ...e.history.filter((h) => h.seq <= cutoff).map((h) => h.seq),
  );
  const id = `assessment-${encounterKey(e)}-${cutoff}`;
  const prior = g.study.assessments.find((a) => a.id === id);
  if (
    prior &&
    (prior.status === "applied" || !retry || prior.status === "pending")
  )
    return;
  const a: Assessment = prior ?? {
    id,
    encounter: e.id,
    sourceVersion:
      g.study.profile === "live"
        ? (g.study.learner?.version ?? 0)
        : g.study.version,
    evidenceCutoffSequence: cutoff,
    findings: [],
    status: "pending",
    provenance: status().mode,
  };
  if (!prior) g.study.assessments.push(a);
  else a.status = "pending";
  const external = g.study.learner?.attempts.find(
    (v) =>
      v.encounter === encounterKey(e) && v.status === "externally-resolved",
  );
  if (
    external &&
    !e.history.some(
      (h) =>
        h.author === "human" &&
        ["edit", "reasoning", "test", "execution"].includes(h.kind) &&
        !external.externalResolution!.assessedHumanSequences.includes(h.seq) &&
        h.seq <= cutoff,
    ) &&
    !e.executions?.some(
      (j) =>
        j.author === "human" && j.status === "finished" && j.receipt?.executed,
    )
  ) {
    a.status = "review-required";
    a.provenance =
      "Attempt resolved in the imported roadmap. Local work is retained; world completion adds no duplicate academic assessment or visit.";
    return;
  }
  if (!e.problem) {
    a.status = "review-required";
    a.provenance =
      "Physical contribution retained; no persisted human learning task was issued. No academic credit.";
    return;
  }
  if (e.problem.provenance !== "study-mode" || g.study.profile !== "live") {
    a.status = "review-required";
    a.provenance = "Development simulation cannot award academic credit.";
    return;
  }
  if (!live(g)) {
    a.status = "review-required";
    a.provenance =
      "Live assessment connection unavailable; work and request identity retained for retry.";
    return;
  }
  try {
    const response = await request("assess", {
      requestId: id,
      packet: evidencePacket(e, r, cutoff, g.study.learner),
    });
    a.findings = response.findings;
    a.historicalMappings = response.historicalMappings;
    a.visitOutcome = response.visitOutcome;
    a.scopeReviews = response.scopeReviews;
    a.helpAttributions = response.helpAttributions;
    a.provenance = "study-mode";
    g.study.learner ??= initialLearner(r);
    applyLearningAssessment(r, g.study.learner, e, a);
    syncLearningView(g.study);
  } catch (err) {
    a.status = "review-required";
    a.provenance = `Assessment unresolved: ${String(err)}`;
  }
}

/** Opt-in public NPC work. Never retries a captured submission or failed batch. */
const autonomousRuns = new WeakMap<Game, Promise<void>>();
export function autonomousNpcWork(
  g: Game,
  r: Roadmap,
): Promise<void> | undefined {
  if (
    !live(g) ||
    !status().capabilities.includes("autonomous-work") ||
    !status().capabilities.includes("materialize-work") ||
    g.status !== "playing"
  )
    return;
  const running = autonomousRuns.get(g);
  if (running) return running;
  for (const e of Object.values(g.encounters)) {
    if (
      !hasHumanStudyContext(e) ||
      e.problem?.provenance !== "study-mode" ||
      e.mode !== "shared" ||
      e.state === "consumed" ||
      humanUsingWorkspace(g, e) ||
      e.submissions.some((s) => s.status === "pending")
    )
      continue;
    const p = e.proposals?.find(
      (p) =>
        p.autonomous &&
        !p.submissionId &&
        p.state !== "dismissed" &&
        npcAtWorkstation(g, e, p.author) &&
        (p.state === "pending"
          ? p.sourceRevision === e.revision
          : p.appliedAutomatically && p.appliedRevision === e.revision),
    );
    let task: Promise<void> | undefined;
    if (p)
      task = (async () => {
        try {
          if (p.state === "pending") applyAutonomousProposal(g, e, p.id);
          await submit(g, e, r, p.author, p.id);
        } catch (error) {
          e.materializationNotice = String(error);
          p.state = "dismissed";
        }
      })();
    else
      task = materializeNpcWork(
        g,
        e,
        (payload) => request("materialize-work", payload),
        false,
        { background: true, allowAutonomous: true },
      );
    if (task) {
      autonomousRuns.set(g, task);
      void task.finally(() => autonomousRuns.delete(g));
      return task;
    }
  }
}

export function reviewEnvironmentObservation(
  g: Game,
  r: Roadmap,
  id: string,
  retry = false,
) {
  if (!live(g) || !status().capabilities.includes("review-environment"))
    throw Error(
      "Native environment review is unavailable. The saved packet remains downloadable for external review.",
    );
  return reviewEnvironment(
    g,
    r,
    id,
    (payload) => request("review-environment", payload),
    retry,
  );
}

export function reconcileUploadedRoadmap(
  g: Game,
  r: Roadmap,
  candidate: string,
  retryId?: string,
  captured?: () => Promise<void>,
) {
  if (!live(g) || !status().capabilities.includes("reconcile-roadmap"))
    throw Error(
      "Native roadmap reconciliation is unavailable; comparison and files remain available without changing learning state",
    );
  return reconcileRoadmap(
    g,
    r,
    candidate,
    async (payload) => {
      await captured?.();
      return request("reconcile-roadmap", payload);
    },
    retryId,
  );
}
