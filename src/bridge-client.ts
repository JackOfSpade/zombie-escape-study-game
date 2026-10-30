import type { Encounter, Game, Provider } from "./model";
import { isRecord } from "./records";
/** Provider transport only; gameplay and learning remain in their owning modules. */
export interface BridgeStatus {
  mode: "development" | Provider;
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
let checkVersion = 0;
export async function checkBridge() {
  const version = ++checkVersion;
  try {
    const r = await fetch("/api/status", { signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw Error();
    const info = await r.json();
    if (
      !isRecord(info) ||
      (info.mode !== "development" &&
        info.mode !== "study-mode" &&
        info.mode !== "chatgpt-handoff") ||
      !Array.isArray(info.capabilities) ||
      !info.capabilities.every((cap: unknown) => typeof cap === "string") ||
      typeof info.label !== "string" ||
      typeof info.detail !== "string"
    )
      throw Error("Malformed bridge capability handshake");
    if (version === checkVersion)
      bridgeStatus = {
        mode: info.mode,
        label: info.label,
        capabilities: info.capabilities,
        detail: info.detail,
      };
  } catch {
    if (version === checkVersion)
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
export type HandoffProgress = "queued" | "working" | "unknown";
/** How long a queued request keeps waiting through a relay restart or proxy drop. */
export const BRIDGE_OUTAGE_GRACE_MS = 60_000;
/** Whether a study terminal app or worker chat is currently serving the relay,
 * from the last metadata poll. null until a poll has answered. */
let listening: boolean | null = null;
export const relayListening = () => listening;
export function relayServes(info: unknown) {
  if (!isRecord(info) || !isRecord(info.public)) return false;
  const relay = info.public.terminalRelay;
  const sessions = isRecord(relay)
    ? (relay.activeSessions ?? relay.sessions)
    : undefined;
  return (
    (typeof sessions === "number" &&
      Number.isFinite(sessions) &&
      sessions > 0) ||
    info.public.workerActive === true
  );
}
/** Legacy handoff turns wait at most 30 minutes. */
export const HANDOFF_TIMEOUT_MS = 30 * 60_000;
/** A direct native ChatGPT study session may run a whole conversation. */
export const DIRECT_STUDY_TIMEOUT_MS = 8 * 60 * 60_000;
/** Routing metadata for one released native-chat study task. It stays outside
 * the frozen payload so retries retain their original content and hash. */
export interface NativeStudyScope {
  runId: string;
  encounterId: string;
  questionRoom?: string;
}
export const nativeStudyScope = (
  g: Pick<Game, "id">,
  e: Pick<Encounter, "id" | "runId" | "questionRoom">,
): NativeStudyScope => ({
  runId: e.runId ?? g.id,
  encounterId: e.id,
  ...(e.questionRoom ? { questionRoom: e.questionRoom } : {}),
});
/** One ChatGPT chat per terminal opening: the game mints a code when a study
 * terminal opens and the pasted request carries it. The relay serves that
 * opening's work only to the chat that supplies the current code. */
const STUDY_CHAT_STORAGE_KEY = "zombie-study-chat-v1";
function savedStudyChat() {
  try {
    const code = sessionStorage.getItem(STUDY_CHAT_STORAGE_KEY);
    return code && /^[A-Z0-9]{6,16}$/.test(code) ? code : "";
  } catch {
    return "";
  }
}
// Reloading resumes the same terminal opening. Rotating here would rebind its
// queued job and disconnect the chat holding the learner's conversation.
let studyChat = savedStudyChat();
export function newStudyChat() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  studyChat = Array.from(
    crypto.getRandomValues(new Uint8Array(8)),
    (n) => alphabet[n % alphabet.length],
  ).join("");
  try {
    sessionStorage.setItem(STUDY_CHAT_STORAGE_KEY, studyChat);
  } catch {
    // Storage-restricted contexts can still use the current page's chat.
  }
  return studyChat;
}
export const studyChatCode = () => studyChat || newStudyChat();
/** Bridge errors may come from a proxy as plain text; never surface a JSON
 * parse failure in place of the real reason. */
async function readJson(r: Response) {
  const text = await r.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    if (r.ok) throw Error("Malformed bridge response");
    if (r.status >= 502 && r.status <= 504)
      return {
        error:
          "The study bridge is not running. It is restarting; press Retry connection in a moment. Your work is saved.",
      };
    return { error: text.trim().slice(0, 200) || `Bridge HTTP ${r.status}` };
  }
  if (!isRecord(data)) throw Error("Malformed bridge response");
  return data;
}
/** An HTML/empty gateway page leaves delivery ambiguous. A structured JSON
 * reply is the bridge's actual response, including a definitive refusal. */
async function gatewayOutage(r: Response) {
  if (r.status < 502 || r.status > 504) return false;
  try {
    JSON.parse(await r.clone().text());
    return false;
  } catch {
    return true;
  }
}
export interface BridgeRequestOptions {
  /** Cancel optional presentation work when its owner is no longer active. */
  signal?: AbortSignal;
  /** Handoff wait budget; bounded to DIRECT_STUDY_TIMEOUT_MS. */
  timeoutMs?: number;
  nativeScope?: NativeStudyScope;
  /** Stop renewing a released job after its owning session closes. */
  isActive?: () => boolean;
}
function waitForHandoff(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(done, 500);
    function done() {
      signal.removeEventListener("abort", abort);
      resolve();
    }
    function abort() {
      clearTimeout(timer);
      reject(Error("ChatGPT handoff wait interrupted; exact work is retained"));
    }
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}
/** T describes the operation reply; domain callers still validate its contents. */
export async function bridgeRequest<T extends object = Record<string, unknown>>(
  operation: string,
  payload: unknown,
  onProgress?: (phase: HandoffProgress) => void,
  options?: BridgeRequestOptions,
) {
  if (options?.isActive?.() === false)
    throw Error("Study session closed; saved work retained");
  const provider = status().mode,
    handoff = provider === "chatgpt-handoff";
  const requested = options?.timeoutMs;
  const budget =
    typeof requested === "number" && Number.isFinite(requested) && requested > 0
      ? Math.min(requested, DIRECT_STUDY_TIMEOUT_MS)
      : HANDOFF_TIMEOUT_MS;
  const timeout = AbortSignal.timeout(
    handoff ? budget : Math.min(budget, 45000),
  );
  const signal = options?.signal
    ? AbortSignal.any([timeout, options.signal])
    : timeout;
  // Capture transport identity once too: a retry after a lost acknowledgement
  // must address the same released job and chat, even if another chat opens.
  const body = JSON.stringify({
    operation,
    payload,
    provider,
    ...(handoff && options?.nativeScope
      ? { nativeScope: options.nativeScope, chatCode: studyChatCode() }
      : {}),
  });
  // Handoff enqueue is idempotent for the exact requestId and payload. Other
  // providers may already have executed a request and cannot safely be retried.
  const retrySubmission =
    handoff &&
    isRecord(payload) &&
    typeof payload.requestId === "string" &&
    !!payload.requestId.trim();
  let chatterReceipt: { id: string; hash: string } | undefined;
  try {
    let r: Response, submissionOutageAt: number | undefined;
    for (;;) {
      if (options?.isActive?.() === false)
        throw Error("Study session closed; saved work retained");
      try {
        const response = await fetch("/api/bridge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: handoff
            ? AbortSignal.any([signal, AbortSignal.timeout(5000)])
            : signal,
        });
        if (retrySubmission && (await gatewayOutage(response)))
          throw Error("unavailable");
        r = response;
        break;
      } catch (error) {
        if (!retrySubmission || signal.aborted) throw error;
        submissionOutageAt ??= Date.now();
        if (Date.now() - submissionOutageAt > BRIDGE_OUTAGE_GRACE_MS)
          throw Error(
            "The study bridge stopped answering; your exact request is saved. Retry it when the bridge is back.",
          );
        listening = null;
        onProgress?.("unknown");
        await waitForHandoff(signal);
      }
    }
    let data = await readJson(r);
    if (r.status === 202) {
      if (
        !handoff ||
        !isRecord(data.handoff) ||
        typeof data.handoff.id !== "string" ||
        !data.handoff.id.trim() ||
        typeof data.handoff.hash !== "string" ||
        !data.handoff.hash.trim()
      )
        throw Error("Invalid queued bridge receipt");
      const receipt = { id: data.handoff.id, hash: data.handoff.hash };
      if (operation === "npc-chatter" || operation === "npc-chatter-review")
        chatterReceipt = receipt;
      onProgress?.("queued");
      let nextProgressCheck = 0,
        unreachableSince = 0;
      while (r.status === 202) {
        if (options?.isActive?.() === false)
          throw Error("Study session closed; saved work retained");
        await waitForHandoff(signal);
        if (options?.isActive?.() === false)
          throw Error("Study session closed; saved work retained");
        try {
          const next = await fetch(
            `/api/bridge/result?id=${encodeURIComponent(receipt.id)}&hash=${encodeURIComponent(receipt.hash)}`,
            { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]) },
          );
          // A restarting relay or a dropped dev-server proxy answers 502-504.
          if (await gatewayOutage(next)) throw Error("unavailable");
          const nextData = await readJson(next);
          r = next;
          data = nextData;
          unreachableSince = 0;
        } catch (error) {
          if (signal.aborted) throw error;
          // The relay keeps queued jobs on disk across restarts, so a short
          // outage must not interrupt the turn: keep waiting on the same job.
          unreachableSince ||= Date.now();
          if (Date.now() - unreachableSince > BRIDGE_OUTAGE_GRACE_MS)
            throw Error(
              "The study bridge stopped answering; your exact request is saved. Retry it when the bridge is back.",
            );
          listening = null;
          onProgress?.("unknown");
          continue;
        }
        if (r.status === 202 && onProgress && Date.now() >= nextProgressCheck) {
          nextProgressCheck = Date.now() + 2000;
          try {
            // Metadata only: this also works with a persistent older relay that
            // does not include a phase in its result receipt. No payload is read.
            const health = await fetch("/api/handoff/status", {
              signal: AbortSignal.timeout(1500),
            });
            if (!health.ok) throw Error("Status unavailable");
            const info = await health.json();
            listening = relayServes(info);
            const phase = info.recent?.find(
              (job: { id: string }) => job.id === receipt.id,
            )?.status;
            onProgress(
              phase === "queued" || phase === "working" ? phase : "unknown",
            );
          } catch {
            listening = null;
            onProgress("unknown");
          }
        }
      }
    }
    if (!r.ok)
      throw Error(
        typeof data.error === "string" ? data.error : "Bridge request failed",
      );
    return data as T;
  } finally {
    if (chatterReceipt) {
      // Consumed/cancelled ambient lines have no durable role. This endpoint
      // cannot discard a study request, even if its receipt is supplied.
      await fetch(
        `/api/bridge/result?id=${encodeURIComponent(chatterReceipt.id)}&hash=${encodeURIComponent(chatterReceipt.hash)}`,
        {
          method: "DELETE",
          signal: AbortSignal.timeout(1500),
        },
      ).catch(() => {});
    }
  }
}
