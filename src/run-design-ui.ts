import { checkBridge } from "./bridge-client";
import type { Game, Roadmap } from "./model";
import {
  createPlayableGame,
  previewDesignedRun,
  finalizeDesignedRun,
} from "./world";
import {
  clearDesignDraft,
  cancelDesignDraft,
  designChatPrompt,
  newDesignDraft,
  prepareDesignedRun,
  readDesignDraft,
  saveDesignDraft,
  retryDesignDraft,
  type DesignDraft,
} from "./run-designer";
import type { SavedRunDesign } from "./run-design-contract.mjs";
import type { RunDesignActivity } from "./run-design-progress";

export type RunChoice = { seed: number; saved: SavedRunDesign };
let choosing = false;
/** Only a completed design can replace the active run; cancellation leaves it intact. */
export async function chooseRunDesign(
  game: Game,
  roadmap: Roadmap,
  connect: () => Promise<void>,
): Promise<RunChoice | undefined> {
  if (choosing) return;
  choosing = true;
  const dialog = document.createElement("dialog");
  dialog.id = "run-design-dialog";
  dialog.className = "run-design-dialog";
  dialog.setAttribute("aria-labelledby", "run-design-title");
  dialog.setAttribute("aria-describedby", "run-design-status");
  dialog.dataset.state = "waiting";
  dialog.innerHTML = `
    <span class="eyebrow">NEW ESCAPE</span>
    <h2 id="run-design-title">Connect ChatGPT</h2>
    <div class="run-design-state">
      <span id="run-design-loading" role="progressbar" aria-label="Preparing your escape" hidden><span class="run-design-spinner" aria-hidden="true"></span></span>
      <p id="run-design-status" role="status" aria-atomic="true">Open ChatGPT and press Send to begin.</p>
    </div>
    <ol id="run-design-steps" aria-label="Setup steps">
      <li data-step="connect" data-state="active" aria-current="step"><span class="run-design-step-marker" aria-hidden="true">1</span><span>Connect</span></li>
      <li data-step="design" data-state="pending"><span class="run-design-step-marker" aria-hidden="true">2</span><span>Design</span></li>
      <li data-step="details" data-state="pending"><span class="run-design-step-marker" aria-hidden="true">3</span><span>Details</span></li>
      <li data-step="review" data-state="pending"><span class="run-design-step-marker" aria-hidden="true">4</span><span>Review</span></li>
    </ol>
    <div class="run-design-actions">
      <button id="run-design-connect">Connect ChatGPT ↗</button>
      <span id="run-design-handoff" hidden><a id="run-design-open" target="_blank" rel="noopener noreferrer">Open ChatGPT ↗</a></span>
      <button id="run-design-retry" hidden>Retry design</button>
      <button id="run-design-cancel" class="quiet">Cancel</button>
    </div>`;
  document.body.append(dialog);
  const title = dialog.querySelector<HTMLElement>("#run-design-title")!;
  const message = dialog.querySelector<HTMLElement>("#run-design-status")!;
  const loading = dialog.querySelector<HTMLElement>("#run-design-loading")!;
  const retry = dialog.querySelector<HTMLButtonElement>("#run-design-retry")!;
  const connectButton = dialog.querySelector<HTMLButtonElement>(
    "#run-design-connect",
  )!;
  const handoff = dialog.querySelector<HTMLElement>("#run-design-handoff")!;
  const openChat = dialog.querySelector<HTMLAnchorElement>("#run-design-open")!;
  const steps = [
    ...dialog.querySelectorAll<HTMLElement>("#run-design-steps li"),
  ];
  const previousPause = game.paused;
  if (game.status === "playing") game.paused = true;
  dialog.showModal();
  let draft: DesignDraft | undefined;
  let active: AbortController | undefined;
  let closed = false;
  let connected = false;
  let activity: RunDesignActivity | undefined;
  const showActivity = () => {
    if (closed) return;
    const busy =
      activity?.state === "working" || activity?.state === "checking";
    const reconnecting = activity?.state === "unknown";
    // A later saved phase proves that an earlier reply was accepted. A click,
    // bridge handshake or unrelated chat does not prove this chat connected.
    const accepted =
      draft &&
      (draft.version === 3
        ? draft.request.phase !== "concepts"
        : draft.version === 2
          ? draft.request.phase === "content" || !!draft.request.repair
          : !!draft.request.repair);
    connected ||= busy || !!accepted;
    dialog.dataset.state = reconnecting
      ? "reconnecting"
      : busy
        ? activity!.state
        : "waiting";
    title.textContent = reconnecting
      ? "Connection interrupted"
      : busy
        ? "Preparing your escape"
        : connected
          ? "Waiting for ChatGPT"
          : "Connect ChatGPT";
    message.textContent = reconnecting
      ? "Waiting for the bridge to reconnect."
      : busy
        ? activity!.detail
        : connected
          ? "Waiting for ChatGPT. Continue in the connected chat."
          : openChat.hasAttribute("href")
            ? "Waiting for ChatGPT. Press Send in the opened chat."
            : activity?.state === "queued"
              ? "Waiting for ChatGPT. Open the chat and press Send."
              : "Open ChatGPT and press Send to begin.";
    loading.hidden = !busy;
    if (busy) loading.setAttribute("aria-valuetext", activity!.detail);
    else loading.removeAttribute("aria-valuetext");
    retry.hidden = true;
    connectButton.textContent =
      reconnecting || connected ? "Reconnect ChatGPT ↗" : "Connect ChatGPT ↗";
    connectButton.hidden =
      busy || (openChat.hasAttribute("href") && !reconnecting);
    handoff.hidden = busy || reconnecting || !openChat.hasAttribute("href");
    const current = connected
      ? Math.max(
          1,
          steps.findIndex((step) => step.dataset.step === activity?.stage),
        )
      : 0;
    steps.forEach((step, index) => {
      step.dataset.state =
        index < current ? "complete" : index === current ? "active" : "pending";
      if (index === current) step.setAttribute("aria-current", "step");
      else step.removeAttribute("aria-current");
    });
  };
  let settle: (choice: RunChoice | undefined) => void = () => {};
  const done = new Promise<RunChoice | undefined>((resolve) => {
    settle = resolve;
  });
  const finish = (choice: RunChoice | undefined) => {
    if (closed) return;
    closed = true;
    active?.abort();
    if (!choice) {
      void cancelDesignDraft(draft).catch(() => {});
      try {
        clearDesignDraft(game.id);
      } catch {
        /* A blocked store is reported when next used. */
      }
    }
    dialog.close();
    dialog.remove();
    game.paused = previousPause;
    choosing = false;
    settle(choice);
  };
  const attempt = async () => {
    if (active || closed) return;
    active = new AbortController();
    const controller = active;
    retry.disabled = true;
    if (activity) activity = { ...activity, state: "queued" };
    showActivity();
    try {
      draft ??=
        readDesignDraft(game.id) ??
        newDesignDraft(game.id, crypto.getRandomValues(new Uint32Array(1))[0]);
      saveDesignDraft(draft);
      await checkBridge();
      controller.signal.throwIfAborted();
      const result = await prepareDesignedRun(draft, {
        signal: controller.signal,
        capture: saveDesignDraft,
        activity: (next) => {
          activity = next;
          showActivity();
        },
        build: (seed, saved) =>
          createPlayableGame(seed, roadmap, structuredClone(game.study), saved),
        preview: (seed, structure) =>
          previewDesignedRun(
            seed,
            roadmap,
            structuredClone(game.study),
            structure,
          ),
        finalize: finalizeDesignedRun,
      });
      finish({ seed: result.seed, saved: result.saved });
    } catch (error) {
      if (!closed) {
        dialog.dataset.state = "error";
        title.textContent = "Setup paused";
        loading.hidden = true;
        loading.removeAttribute("aria-valuetext");
        retry.hidden = false;
        connectButton.hidden = openChat.hasAttribute("href");
        handoff.hidden = !openChat.hasAttribute("href");
        message.textContent =
          error instanceof Error ? error.message : String(error);
      }
    } finally {
      if (active === controller) active = undefined;
      retry.disabled = false;
    }
  };
  const reconnect = () => {
    void connect()
      .catch(() => {
        // The exact request's transport reports recovery; opening a chat or
        // completing bridge setup alone must never start a loading animation.
      })
      .then(() => {
        if (!active && !closed) void attempt();
      });
  };
  connectButton.onclick = () => {
    if (!draft) return;
    const url = new URL("https://chatgpt.com/");
    url.searchParams.set("q", designChatPrompt(draft));
    // Fill the composer without sending, leaving model/thinking selection
    // to the player. Keep the same URL available if a popup is blocked.
    url.searchParams.set("submit", "false");
    openChat.href = url.href;
    if (dialog.dataset.state === "error") {
      // Keep the failure and Retry available until setup actually recovers.
      connectButton.hidden = true;
      handoff.hidden = false;
    } else showActivity();
    // Open during the click; awaiting bridge setup loses popup permission.
    window.open(url.href, "_blank", "noopener,noreferrer");
    reconnect();
  };
  // Reopening the draft also retries connector setup after a failed tunnel or
  // pairing attempt. Keep normal link navigation for blocked-popup recovery.
  openChat.onclick = reconnect;
  retry.onclick = () => {
    if (draft) retryDesignDraft(draft);
    void attempt();
  };
  dialog.querySelector<HTMLButtonElement>("#run-design-cancel")!.onclick = () =>
    finish(undefined);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    finish(undefined);
  });
  void attempt();
  return done;
}
