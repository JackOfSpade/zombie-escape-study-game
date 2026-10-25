import { studyMapHtml } from "./study-map";
import { eligible } from "./curriculum";
import { unfinishedDirectStudy } from "./direct-study";
import { escapeHtml } from "./html";
import { encounterKey } from "./learner";
import type { Encounter, Game, Roadmap } from "./model";

export const STUDY_VIEW_KEY = "learning-workspace-view-v1";

export function enterStudyWorkspace(g: Game) {
  if (!g.studyWorkspace?.enabled)
    g.studyWorkspace = {
      ...g.studyWorkspace,
      enabled: true,
      wasPaused: !!g.paused,
    };
  g.paused = true;
}

export function exitStudyWorkspace(g: Game) {
  if (!g.studyWorkspace?.enabled) return;
  g.paused = g.studyWorkspace.wasPaused;
  g.studyWorkspace.enabled = false;
}

/** Prefer the actual unfinished task over creating another visit or chat. */
export function workspaceQuestion(g: Game): Encounter | undefined {
  const current = Object.values(g.encounters);
  const direct = [...current, ...g.study.archives].find(unfinishedDirectStudy);
  if (direct) return direct;
  const pending = current.find(
    (e) =>
      (e.studyOnly || e.owner === "human" || e.id === g.lastStudyEncounter) &&
      (e.pendingGeneration || e.generation),
  );
  if (pending) return pending;
  const bound =
    g.study.pending?.encounter ??
    g.study.learner?.attempts.find((a) => a.status === "in-progress")
      ?.encounter;
  if (bound) {
    const e = current.find(
      (e) => encounterKey(e) === bound && e.state !== "consumed",
    );
    if (e) return e;
  }
  return current.find(
    (e) =>
      e.state !== "consumed" &&
      (e.studyOnly || (e.problem && e.problemPresentedSequence !== undefined)),
  );
}

/** No station, RNG consumption, actor movement or scope changes are needed. */
export function nextWorkspaceQuestion(g: Game, roadmap: Roadmap): Encounter {
  if (!g.studyWorkspace?.enabled)
    throw Error("Open the study workspace first.");
  const current = workspaceQuestion(g);
  if (current) return current;
  const assessment = workspaceAssessment(g);
  if (assessment && assessment.status !== "applied")
    throw Error(
      "Finish reviewing your previous learning result before starting another question.",
    );
  // Respect curriculum gates before allocating any new saved task.
  eligible(roadmap, g.study);
  const id = `study-${crypto.randomUUID()}`;
  const e: Encounter = {
    id,
    runId: g.id,
    studyOnly: true,
    floor: 0,
    mode: "solo",
    reward: "loot",
    state: "available",
    owner: "human",
    workspace: "",
    revision: 0,
    history: [],
    group: [],
    tutor: [],
    submissions: [],
    contributors: [],
    chatCursor: 0,
    chatOpen: false,
    recentSpeakers: [],
    npcProgress: 0,
    loot: [],
    scroll: 0,
    selection: [0, 0],
  };
  g.encounters[id] = e;
  g.studyWorkspace.encounter = encounterKey(e);
  return e;
}

export function workspaceAssessment(g: Game) {
  if (g.study.profile !== "live") return undefined;
  const e = workspaceSelectedQuestion(g);
  return e
    ? [...g.study.assessments].reverse().find((a) => a.encounter === e.id)
    : undefined;
}

export function workspaceSelectedQuestion(g: Game) {
  return [...Object.values(g.encounters), ...g.study.archives].find(
    (e) => encounterKey(e) === g.studyWorkspace?.encounter,
  );
}

/** Counts come from the same ledger as the game; observations are separate. */
export function workspaceProgressHtml(g: Game, roadmap: Roadmap): string {
  const esc = escapeHtml;
  const issued = workspaceQuestion(g)?.problem?.contract;
  const map = studyMapHtml(g, roadmap, issued);
  const gaps = (g.study.knowledgeGaps ?? []).filter((gap) => !gap.resolved);
  return `${map}<article class="study-plan study-review-notes"><span class="study-label">REVIEW NOTES</span><p>${gaps.length ? `${gaps.length} areas to practise` : "No areas to practise recorded yet"}</p>${
    gaps.length
      ? `<ul>${gaps
          .slice(-3)
          .map((gap) => `<li>${esc(gap.facet.description)}</li>`)
          .join("")}</ul>`
      : ""
  }<small>${g.study.profile === "live" ? "Progress updates after each validated assessment." : "Practice profile · question results are saved; practice does not add verified curriculum credit."}</small></article>`;
}
