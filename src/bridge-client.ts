import type { Encounter, Game, Provider } from "./model";
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
      !["development", "study-mode", "chatgpt-handoff"].includes(info.mode) ||
      !Array.isArray(info.capabilities) ||
      !info.capabilities.every((cap: unknown) => typeof cap === "string") ||
      typeof info.label !== "string" ||
      typeof info.detail !== "string"
    )
      throw Error("Malformed bridge capability handshake");
    if (version === checkVersion) bridgeStatus = info;
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
export const relayServes = (info: any) =>
  (info?.public?.terminalRelay?.activeSessions ??
    info?.public?.terminalRelay?.sessions ??
    0) > 0 || info?.public?.workerActive === true;
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
export interface BridgeRequestOptions {
  /** Handoff wait budget; bounded to DIRECT_STUDY_TIMEOUT_MS. */
  timeoutMs?: number;
  nativeScope?: NativeStudyScope;
}
export async function bridgeRequest(
  operation: string,
  payload: unknown,
  onProgress?: (phase: HandoffProgress) => void,
  options?: BridgeRequestOptions,
) {
  const provider = status().mode,
    handoff = provider === "chatgpt-handoff";
  const requested = options?.timeoutMs;
  const budget =
    typeof requested === "number" && Number.isFinite(requested) && requested > 0
      ? Math.min(requested, DIRECT_STUDY_TIMEOUT_MS)
      : HANDOFF_TIMEOUT_MS;
  const signal = AbortSignal.timeout(handoff ? budget : 45000);
  let r = await fetch("/api/bridge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Transport identity stays outside the frozen payload, preserving old hashes.
    body: JSON.stringify({
      operation,
      payload,
      provider,
      ...(handoff && options?.nativeScope
        ? { nativeScope: options.nativeScope }
        : {}),
    }),
    signal,
  });
  let data = await r.json();
  if (r.status === 202) {
    if (
      !handoff ||
      typeof data.handoff?.id !== "string" ||
      typeof data.handoff?.hash !== "string"
    )
      throw Error("Invalid queued bridge receipt");
    const receipt = data.handoff;
    onProgress?.("queued");
    let nextProgressCheck = 0,
      unreachableSince = 0;
    while (r.status === 202) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(done, 500);
        function done() {
          signal.removeEventListener("abort", abort);
          resolve();
        }
        function abort() {
          clearTimeout(timer);
          reject(
            Error("ChatGPT handoff wait interrupted; exact work is retained"),
          );
        }
        if (signal.aborted) abort();
        else signal.addEventListener("abort", abort, { once: true });
      });
      try {
        const next = await fetch(
          `/api/bridge/result?id=${encodeURIComponent(receipt.id)}&hash=${encodeURIComponent(receipt.hash)}`,
          { signal },
        );
        // A restarting relay or a dropped dev-server proxy answers 502-504.
        if (next.status >= 502 && next.status <= 504)
          throw Error("unavailable");
        const nextData = await next.json();
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
  if (!r.ok) throw Error(data.error ?? "Bridge request failed");
  return data;
}
