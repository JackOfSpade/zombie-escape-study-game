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
  dialog.setAttribute("aria-labelledby", "run-design-title");
  dialog.innerHTML = `<span class="eyebrow">SETTING UP YOUR SESSION</span><h2 id="run-design-title">Preparing your escape.</h2><p>ChatGPT explores different ideas, develops each room, then reviews the writing and artwork. This can take a while. Your current run stays saved throughout.</p><div id="run-design-loading" role="progressbar" aria-label="Preparing game session"><span class="run-design-spinner" aria-hidden="true"></span><span>Building your session</span></div><p id="run-design-status" role="status">Connecting to the designer…</p><p class="run-design-wait">You can step away. When everything is ready, the game will wait for you to press Start.</p><div class="run-design-actions"><button id="run-design-connect">Connect ChatGPT ↗</button><button id="run-design-retry" class="quiet">Retry design</button></div><p id="run-design-handoff" hidden>Your request is filled in when ChatGPT opens. Choose your model and thinking level, then press Send. <a id="run-design-open" target="_blank" rel="noopener noreferrer">Open ChatGPT ↗</a></p><div class="run-design-actions"><button id="run-design-cancel" class="quiet">Cancel</button></div><small>Every new run is reviewed, checked before play and saved with its design.</small>`;
  document.body.append(dialog);
  const message = dialog.querySelector<HTMLElement>("#run-design-status")!;
  const loading = dialog.querySelector<HTMLElement>("#run-design-loading")!;
  const retry = dialog.querySelector<HTMLButtonElement>("#run-design-retry")!;
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
    loading.hidden = false;
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
      if (!closed) {
        loading.hidden = true;
        message.textContent =
          error instanceof Error ? error.message : String(error);
      }
    } finally {
      if (active === controller) active = undefined;
      retry.disabled = false;
    }
  };
  dialog.querySelector<HTMLButtonElement>("#run-design-connect")!.onclick =
    () => {
      if (!draft) return;
      const url = new URL("https://chatgpt.com/");
      url.searchParams.set("q", designChatPrompt(draft));
      // Fill the composer without sending, leaving model/thinking selection
      // to the player. Keep the same URL available if a popup is blocked.
      url.searchParams.set("submit", "false");
      dialog.querySelector<HTMLAnchorElement>("#run-design-open")!.href =
        url.href;
      dialog.querySelector<HTMLElement>("#run-design-handoff")!.hidden = false;
      // Open during the click; awaiting bridge setup loses popup permission.
      window.open(url.href, "_blank", "noopener,noreferrer");
      void connect().then(() => {
        if (!active && !closed) void attempt();
      });
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
