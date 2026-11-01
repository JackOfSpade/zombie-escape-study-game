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
  dialog.innerHTML = `<span class="eyebrow">A NEW ESCAPE</span><h2>Let AI shape this run.</h2><p>ChatGPT explores different ideas, develops each room, then reviews the writing and artwork. This can take a while. Your current run stays saved throughout.</p><p id="run-design-status" role="status">Connecting to the designer…</p><div class="run-design-actions"><button id="run-design-connect">Connect ChatGPT ↗</button><button id="run-design-retry" class="quiet">Retry design</button></div><details><summary>ChatGPT request</summary><textarea id="run-design-prompt" readonly rows="6" aria-label="Run design ChatGPT request"></textarea><button id="run-design-copy" class="quiet">Copy request</button></details><div class="run-design-actions"><button id="run-design-cancel" class="quiet">Cancel</button></div><small>Every new run is reviewed, checked before play and saved with its design.</small>`;
  document.body.append(dialog);
  const message = dialog.querySelector<HTMLElement>("#run-design-status")!;
  const retry = dialog.querySelector<HTMLButtonElement>("#run-design-retry")!;
  const prompt =
    dialog.querySelector<HTMLTextAreaElement>("#run-design-prompt")!;
  const previousPause = game.paused;
  if (game.status === "playing") game.paused = true;
  dialog.showModal();
  let draft: DesignDraft | undefined;
  let active: AbortController | undefined;
  let closed = false;
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
    try {
      draft ??=
        readDesignDraft(game.id) ??
        newDesignDraft(game.id, crypto.getRandomValues(new Uint32Array(1))[0]);
      saveDesignDraft(draft);
      prompt.value = designChatPrompt(draft);
      await checkBridge();
      controller.signal.throwIfAborted();
      const result = await prepareDesignedRun(draft, {
        signal: controller.signal,
        capture: saveDesignDraft,
        progress: (text) => {
          if (!closed) message.textContent = text;
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
      if (!closed)
        message.textContent =
          error instanceof Error ? error.message : String(error);
    } finally {
      if (active === controller) active = undefined;
      retry.disabled = false;
    }
  };
  const copy = async () => {
    if (!draft) return;
    prompt.value = designChatPrompt(draft);
    try {
      await navigator.clipboard.writeText(prompt.value);
      if (!closed)
        message.textContent =
          "Request copied. Paste it in a new ChatGPT chat with the game plugin connected.";
    } catch {
      dialog.querySelector("details")!.open = true;
      prompt.focus();
      prompt.select();
      message.textContent =
        "Select and copy this request into a new ChatGPT chat.";
    }
  };
  dialog.querySelector<HTMLButtonElement>("#run-design-connect")!.onclick =
    () => {
      window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer");
      void copy();
      void connect().then(() => {
        if (!active && !closed) void attempt();
      });
    };
  dialog.querySelector<HTMLButtonElement>("#run-design-copy")!.onclick = () => {
    void copy();
  };
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
