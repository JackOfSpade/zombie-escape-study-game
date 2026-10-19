import type { Provider } from "./model";
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
/** Whether a study terminal app or worker chat is currently serving the relay,
 * from the last metadata poll. null until a poll has answered. */
let listening: boolean | null = null;
export const relayListening = () => listening;
export const relayServes = (info: any) =>
  (info?.public?.terminalRelay?.activeSessions ??
    info?.public?.terminalRelay?.sessions ??
    0) > 0 || info?.public?.workerActive === true;
export async function bridgeRequest(
  operation: string,
  payload: unknown,
  onProgress?: (phase: HandoffProgress) => void,
) {
  const provider = status().mode,
    handoff = provider === "chatgpt-handoff";
  const signal = AbortSignal.timeout(handoff ? 30 * 60_000 : 45000);
  let r = await fetch("/api/bridge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Transport identity stays outside the frozen payload, preserving old hashes.
    body: JSON.stringify({ operation, payload, provider }),
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
    let nextProgressCheck = 0;
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
      r = await fetch(
        `/api/bridge/result?id=${encodeURIComponent(receipt.id)}&hash=${encodeURIComponent(receipt.hash)}`,
        { signal },
      );
      data = await r.json();
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
