import { bridgeRequest, status, type HandoffProgress } from "./bridge-client";
import {
  parseRunDesignRequest,
  parseRunDesignReply,
  runDesignFingerprint,
  runDesignNoveltyErrors,
  summarizeRunDesign,
  type RunDesignRequest,
  type RunDesignSummary,
  type SavedRunDesign,
} from "./run-design-contract.mjs";

export interface DesignDraft {
  version: 1;
  targetRunId: string;
  chatCode: string;
  request: RunDesignRequest;
}
const DRAFT_KEY = "dead-air-run-design-draft-v1";
const HISTORY_KEY = "dead-air-run-design-history-v1";
export const DESIGN_ATTEMPTS = 3;

export function parseDesignDraft(value: unknown): DesignDraft {
  const d = value as DesignDraft;
  if (
    !d ||
    d.version !== 1 ||
    typeof d.targetRunId !== "string" ||
    d.targetRunId.length > 128 ||
    !/^[A-Z0-9]{6,16}$/.test(d.chatCode)
  )
    throw Error("Invalid saved run-design request");
  return {
    version: 1,
    targetRunId: d.targetRunId,
    chatCode: d.chatCode,
    request: parseRunDesignRequest(d.request),
  };
}
export function recentDesigns(): RunDesignSummary[] {
  try {
    const recent = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    return parseRunDesignRequest({
      version: 1,
      requestId: "design-history",
      generationId: "design-history",
      seed: 0,
      recent,
    }).recent;
  } catch {
    return [];
  }
}
export function readDesignDraft(targetRunId: string): DesignDraft | undefined {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return;
  const draft = parseDesignDraft(JSON.parse(raw));
  return draft.targetRunId === targetRunId ? draft : undefined;
}
export function saveDesignDraft(draft: DesignDraft) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(parseDesignDraft(draft)));
}
export function clearDesignDraft(targetRunId: string) {
  try {
    const draft = readDesignDraft(targetRunId);
    if (draft) localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Explicit cancellation/fallback can discard an unreadable design draft.
    // This key contains fictional generation requests, never a game or learner save.
    localStorage.removeItem(DRAFT_KEY);
  }
}
export function rememberDesign(saved: SavedRunDesign) {
  const next = summarizeRunDesign(saved.design);
  const recent = recentDesigns().filter((d) => d.title !== next.title);
  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify([next, ...recent].slice(0, 5)),
  );
}
export function newDesignDraft(
  targetRunId: string,
  seed: number,
  recent = recentDesigns(),
): DesignDraft {
  const generationId = `design-${crypto.randomUUID()}`;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const chatCode = Array.from(
    crypto.getRandomValues(new Uint8Array(8)),
    (n) => alphabet[n % alphabet.length],
  ).join("");
  return {
    version: 1,
    targetRunId,
    chatCode,
    request: parseRunDesignRequest({
      version: 1,
      requestId: `${generationId}-1`,
      generationId,
      seed,
      recent,
    }),
  };
}
export interface DesignOptions<T> {
  build: (seed: number, design: SavedRunDesign) => T;
  capture: (draft: DesignDraft) => void | Promise<void>;
  signal: AbortSignal;
  progress?: (text: string) => void;
  send?: (
    request: RunDesignRequest,
    draft: DesignDraft,
    signal: AbortSignal,
    progress: (phase: HandoffProgress) => void,
  ) => Promise<unknown>;
}
/** Builds an isolated candidate. The caller alone commits it to the active run. */
export async function prepareDesignedRun<T>(
  draft: DesignDraft,
  options: DesignOptions<T>,
) {
  const send =
    options.send ??
    ((request, current, signal, progress) => {
      if (
        status().mode !== "chatgpt-handoff" ||
        !status().capabilities.includes("design-run")
      )
        throw Error(
          "AI run design is unavailable. Connect or update the ChatGPT bridge, then retry; you can also choose a procedural run.",
        );
      return bridgeRequest("design-run", request, progress, {
        signal,
        chatCode: current.chatCode,
        nativeScope: { runId: request.generationId, encounterId: "run-design" },
        isActive: () => !signal.aborted,
      });
    });
  for (let attempt = 0; attempt < DESIGN_ATTEMPTS; attempt++) {
    options.signal.throwIfAborted();
    await options.capture(draft);
    options.signal.throwIfAborted();
    const reply = await send(draft.request, draft, options.signal, (phase) =>
      options.progress?.(
        phase === "working"
          ? "ChatGPT is designing your escape…"
          : phase === "queued"
            ? "Waiting for ChatGPT. Connect a chat with the request below to continue."
            : "Waiting for the bridge to reconnect. Your exact request is saved.",
      ),
    );
    options.signal.throwIfAborted();
    const { design } = parseRunDesignReply(reply, draft.request);
    const saved: SavedRunDesign = {
      version: 1,
      source: "chatgpt-handoff",
      requestId: draft.request.requestId,
      generationId: draft.request.generationId,
      fingerprint: runDesignFingerprint(design),
      design,
    };
    let errors = runDesignNoveltyErrors(design, draft.request.recent);
    if (!errors.length) {
      options.progress?.(
        "Checking routes, terminal space, stair access and saved design…",
      );
      try {
        const game = options.build(draft.request.seed, saved);
        options.signal.throwIfAborted();
        return { seed: draft.request.seed, saved, game };
      } catch (error) {
        options.signal.throwIfAborted();
        errors = [error instanceof Error ? error.message : String(error)];
      }
    }
    // The previous reply stays immutable. A repair is a new, correlated job.
    draft.request = parseRunDesignRequest({
      ...draft.request,
      requestId: `design-${crypto.randomUUID()}`,
      repair: {
        candidate: design,
        errors: errors
          .slice(0, 20)
          .map((e) => e.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 400)),
      },
    });
    await options.capture(draft);
    if (attempt + 1 === DESIGN_ATTEMPTS)
      throw Error(
        "This design still needs repair after three attempts. Your request is saved; retry with ChatGPT, cancel, or choose a procedural run.",
      );
    options.progress?.(
      "The design needs changes. Asking ChatGPT to repair it while keeping this run’s theme…",
    );
  }
  throw Error("Run design did not complete");
}

export function designChatPrompt(draft: DesignDraft) {
  return `Design my new zombie-escape-study-game run. Call get_current_study_question with chat: "${draft.chatCode}" and use this chat code on every fetch in this chat. Follow the game's captured design contract, then return the design with finish_study_preparation. Follow any bound design-repair continuation; stop when the game has no further design request. This is fictional world design, not a study conversation. Do not fetch another chat's work. If the tools lack the chat argument, ask me to refresh the zombie-escape-study-game plugin tools.`;
}
