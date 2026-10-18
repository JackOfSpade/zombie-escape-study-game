import { presentRoadmapReview } from "./roadmap-exposure";
import { renderRoadmapAdoption } from "./roadmap-adoption-ui";
import { itemInfo } from "./equipment";
import { presentSharedWorkspace } from "./workspace-exposure";
import {
  reviewWorkspaceProposal,
  presentWorkspaceProposal,
} from "./workspace-proposals";
import { reviewRoadmap } from "./roadmap-review";
import { renderEnvironmentObservations } from "./environment-ui";
import { canRunWorkspace, runWorkspace } from "./execution";
import { prepareRoadmapExport } from "./roadmap-export";
import { curriculumReadiness } from "./final-requirements";
import { historicalRecords } from "./historical-proof";
import "./style.css";
import {
  type Game,
  type Roadmap,
  type Encounter,
  CONFIG,
  distance,
} from "./model";
import { createGame } from "./world";
import {
  human,
  step,
  stairs,
  board,
  vault,
  rotate,
  nearestStation,
  canReachStation,
  nearbyDoor,
  toggleDoor,
  claimStation,
  releaseStation,
  useItem,
  takeLoot,
} from "./engine";
import { render } from "./render";
import { AudioDirector } from "./audio";
import {
  checkBridge,
  status,
  ensureProblem,
  materializeObservedWork,
  inspectCompletedNpcWork,
  reconcileUploadedRoadmap,
  reviewEnvironmentObservation,
  autonomousNpcWork,
  presentProblem,
  presentMessages,
  edit,
  send,
  submit,
  openChat,
  closeChat,
  retryChatCatchup,
  presentWorkLog,
  assess,
} from "./ai";
import { encode, decode, save, load, recover, download } from "./persistence";
import { eligible, initialStudy, syncLearningView } from "./curriculum";
import { encounterKey } from "./learner";
import { retainRunLearning } from "./run-learning";
import { presentNpcOutcome, outcomeIsVisible } from "./npc-outcome";
const $ = <T extends HTMLElement = HTMLElement>(s: string) =>
  document.querySelector<T>(s)!;
const app = $("#app");
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const roadmap: Roadmap = await fetch("/curriculum.json").then((r) => r.json());
let game: Game,
  saveError = "",
  active: string | undefined,
  tab: "tutor" | "group" = "tutor",
  keys = new Set<string>(),
  running = false,
  last = 0,
  acc = 0,
  lastUI = 0,
  lastSave = 0,
  editorRevision = 0;
const audio = new AudioDirector();
try {
  game = recover(
    (await load()) ??
      createGame(crypto.getRandomValues(new Uint32Array(1))[0], roadmap),
  );
} catch (err) {
  game = createGame(123456, roadmap);
  saveError = String(err);
}
await checkBridge();
app.innerHTML = `<header><a class="brand" href="#" aria-label="Dead Air home"><span class="brand-mark">◈</span> DEAD AIR <small>STUDY / ESCAPE</small></a><div class="header-right"><span class="live-dot"></span><span id="bridge-label"></span><button id="settings-toggle" class="quiet">Settings</button><button id="save-button" class="quiet">Save run</button></div></header>
<main><section class="world"><div class="world-top"><div><span class="eyebrow" id="floor-label"></span><h1 id="floor-name"></h1></div><div class="timer"><span class="eyebrow">RUN TIME</span><strong id="run-time">00:00</strong></div></div><div class="viewport"><canvas id="world" aria-label="Top-down survival game. Use WASD or arrow keys to move." tabindex="0"></canvas><div id="start-card" class="overlay"></div><div id="world-caption" role="status" aria-live="polite" aria-atomic="true"></div><div class="north">N ↑</div></div><div class="controls"><span><kbd>WASD</kbd> move</span><span><kbd>E</kbd> interact / climb</span><span><kbd>G</kbd> + move furniture</span><span><kbd>R</kbd> rotate</span><span><kbd>Space</kbd> vault</span><span><kbd>Esc</kbd> leave terminal</span></div><p id="notice" role="status"></p></section>
<aside class="dashboard"><section class="vitals"><div class="eyebrow">SURVIVOR / YOU</div><div class="vital-row"><strong id="health">100</strong><span>HEALTH</span><span id="access" class="chip"></span></div><div class="health-track"><div id="health-fill"></div></div><div class="population"><div><strong id="alive"></strong><span>STILL HERE</span></div><div><strong id="rescued">0</strong><span>EXTRACTED</span></div><div><strong id="lost">0</strong><span>LOST</span></div></div></section>
<section class="objective"><span class="eyebrow">NEXT MOVE</span><h2 id="next-title">Make it inside.</h2><p id="next-description">Stay ahead of the horde. Prepare a room, earn your stair credential, and keep climbing.</p><div id="pickup"></div></section>
<section><div class="section-row"><span class="eyebrow">PACK / <span id="weight"></span></span><span class="muted">click to use</span></div><div id="inventory"></div></section>
<section class="curriculum"><div class="section-row"><span class="eyebrow">LEARNING CONTINUITY</span><button id="curriculum-button" class="quiet">Inspect ↗</button></div><div class="track"><span>PY</span><div><strong id="py-phase">Tier 1 · repair & verify</strong><small id="py-count">2 / 80 D1 checkpoints verified</small></div><span class="track-count" id="py-total">02</span></div><div class="track"><span>PE</span><div><strong id="pe-phase">Tier 1 · diagnose all</strong><small id="pe-count">8 / 112 D1 checkpoints verified</small></div><span class="track-count" id="pe-total">08</span></div><p class="muted" id="schedule"></p><div class="integrity">◇ Original roadmap preserved · revision 9</div></section>
<section class="feed"><span class="eyebrow">BUILDING FREQUENCY</span><div id="event-feed"></div></section>
</aside>
<section id="terminal" hidden><div class="terminal-heading"><div><span class="eyebrow" id="terminal-type"></span><h2 id="problem-title">Connecting…</h2></div><button id="leave" class="quiet">Leave <kbd>Esc</kbd></button></div><div id="terminal-provenance" class="provenance"></div><div id="terminal-body"><article id="problem"></article><section id="npc-outcome" hidden><p id="npc-outcome-status" class="muted"></p><button id="inspect-npc-outcome" class="quiet">Inspect survivor solution</button><div id="npc-outcome-body"></div></section><label class="editor-label" for="workspace">Shared workspace <span id="revision"></span></label><textarea id="workspace" spellcheck="false" aria-label="Puzzle workspace"></textarea><div id="workspace-proposals" hidden></div><div class="submit-row"><button id="submit">Submit captured revision ↗</button><button id="run-code" class="quiet" hidden>Run code</button><span id="submission-status"></span></div><details id="execution-results" hidden><summary>Saved code runs</summary><pre id="execution-output"></pre></details><div id="loot"></div><div class="tabs"><button data-tab="tutor" class="selected">Terminal AI · private</button><button data-tab="group">Group frequency</button></div><div id="messages" aria-live="polite"></div><p id="catchup-status" class="muted" hidden></p><button id="retry-catchup" class="quiet" hidden>Retry group catch-up</button><p id="team-work-status" class="muted" hidden></p><button id="retry-team-work" class="quiet" hidden>Retry saved team work</button><details id="work-log" hidden><summary>Recorded group work</summary><div id="work-log-body"></div></details><form id="chat-form"><input id="chat-input" autocomplete="off" aria-label="Message" placeholder="Ask, reason, or share an observation…"><button type="submit">Send ↑</button></form></div></section></main>
<div id="inspector" hidden><div class="inspector-head"><h2>Learning continuity</h2><button id="close-inspector" class="quiet">Close</button></div><div id="inspector-content"></div></div>
<div id="settings" hidden><h2>Transmission settings</h2><p id="audio-status" class="muted"></p><label>Sound level <input id="volume" type="range" min="0" max="1" step="0.05"></label><label><input id="captions" type="checkbox"> Surge visual cues & sound captions</label><label><input id="reduced" type="checkbox"> Reduced motion</label><button id="reconnect" class="quiet">Recheck Study Mode bridge</button><button id="live-profile" class="quiet">Start a live study run</button><button id="export" class="quiet">Export full run & evidence</button><label class="file-label">Import run save <input id="import" type="file" accept="application/json"></label><button id="settings-close">Done</button><p id="bridge-detail"></p></div>`;
const canvas = $<HTMLCanvasElement>("#world"),
  editor = $<HTMLTextAreaElement>("#workspace");
let saveToken = 0;
async function persist() {
  const token = ++saveToken;
  const at = game.time;
  lastSave = at;
  try {
    await save(game);
    if (token === saveToken) saveError = "";
    return true;
  } catch (err) {
    if (token === saveToken)
      saveError = `Save failed: ${String(err)}. Export a run backup.`;
    return false;
  }
}
function begin() {
  game.status = "playing";
  running = true;
  audio.start();
  audio.update(game);
  canvas.focus();
  $("#start-card").hidden = true;
  persist();
}
function preserveRunLearning(g: Game, archive = false) {
  for (const e of retainRunLearning(g, archive))
    void assess(g, e, roadmap).then(persist);
}
function fresh() {
  const previous = game;
  preserveRunLearning(previous, true);
  // Encounter drafts are archived; a new run never inherits a nearly completed lock.
  delete previous.study.pending;
  game = createGame(
    crypto.getRandomValues(new Uint32Array(1))[0],
    roadmap,
    previous.study,
  );
  game.settings = previous.settings;
  active = undefined;
  completionCursor = 0;
  keys.clear();
  closeTerminal();
  begin();
}
function startCard() {
  const card = $("#start-card");
  card.classList.toggle(
    "finished",
    game.status === "escaped" || game.status === "dead",
  );
  if (game.status === "playing") {
    card.hidden = true;
    running = true;
    return;
  }
  card.hidden = false;
  if (game.status === "ready")
    card.innerHTML = `<span class="eyebrow">A REAL-TIME STUDY ESCAPE</span><h2>The dead are<br>on your heels.</h2><p>Twenty survivors. Four floors. Four seats.<br>Build a little safety. Learn your way out.</p><button id="start">Enter the building ↗</button><small>${escape(status().detail)}</small>`;
  else
    card.innerHTML = `<span class="eyebrow">${game.status === "escaped" ? "TRANSMISSION RECEIVED" : "SIGNAL LOST"}</span><h2>${game.status === "escaped" ? "You made it." : "Your work survives."}</h2><p>${escape(game.notice)}<br>${game.stats.rescued} extracted · ${game.stats.deaths} lost · ${Math.floor(game.time)} seconds</p><button id="again">Begin another run ↗</button><button id="backup" class="quiet">Export work & evidence</button>`;
  document.getElementById("start")?.addEventListener("click", begin);
  document.getElementById("again")?.addEventListener("click", fresh);
  document
    .getElementById("backup")
    ?.addEventListener("click", () =>
      download("dead-air-run.json", encode(game)),
    );
}
function closeTerminal() {
  if (active) {
    const e = game.encounters[active];
    if (e) {
      e.scroll = editor.scrollTop;
      e.selection = [editor.selectionStart, editor.selectionEnd];
      closeChat(game, e);
    }
  }
  active = undefined;
  releaseStation(human(game));
  $("#terminal").hidden = true;
  document.body.classList.remove("terminal-open");
  editor.blur();
  keys.clear();
  canvas.focus();
  persist();
}
async function interact() {
  if (game.status !== "playing") return;
  const a = human(game);
  if (a.floor === CONFIG.floors && board(game, a)) return;
  if (distance(a, game.floors[a.floor].stairs) < 1.8) {
    if (stairs(game, a)) closeTerminal();
    return;
  }
  if (a.floor > 0 && distance(a, game.floors[a.floor].entry) < 1.8) {
    stairs(game, a, true);
    closeTerminal();
    return;
  }
  const st = nearestStation(game, a);
  if (!st) {
    const door = nearbyDoor(game, a);
    if (door && !toggleDoor(game, a, door.id))
      game.notice = "Doorway obstructed. Clear it before closing.";
    return;
  }
  const e = game.encounters[st.encounter];
  if (e.mode === "solo" && e.owner && e.owner !== "human") {
    game.notice =
      "This solo terminal belongs to another survivor. Try a shared cluster or an unused station.";
    return;
  }
  closeTerminal();
  if (!claimStation(game, a, st.id)) {
    game.notice =
      "This physical station is occupied. Use another linked terminal.";
    return;
  }
  active = e.id;
  if (e.mode === "solo") e.owner = "human";
  $("#terminal").hidden = false;
  document.body.classList.add("terminal-open");
  tab = e.mode === "shared" ? "group" : "tutor";
  if (tab === "group") showGroup(e);
  renderTerminal();
  await ensureProblem(game, e, roadmap);
  if (active === e.id) {
    renderTerminal(true);
    persist();
  }
}
function showGroup(e: Encounter) {
  const pending = openChat(game, e);
  if (pending)
    void pending.then(() => {
      if (active === e.id && tab === "group") renderTerminal();
      persist();
    });
}
let workLogSignature = "";
let proposalSignature = "";
let outcomeSignature = "";
function eligibleForUI() {
  try {
    return eligible(roadmap, game.study);
  } catch (err) {
    game.notice = `Curriculum gate: ${String(err)}`;
    return undefined;
  }
}
function renderTerminal(force = false) {
  if (!active) return;
  const e = game.encounters[active];
  presentProblem(game, e, roadmap);
  $("#terminal-type").textContent =
    `${e.mode === "shared" ? "LINKED ROOM · ONE WORKSPACE" : "INDIVIDUAL STATION"} / ${e.reward === "loot" ? "EQUIPMENT CACHE" : "PERSONAL STAIR ACCESS"}`;
  $("#problem-title").textContent =
    e.problem?.title ??
    (e.state === "consumed"
      ? "Survivor-completed lock"
      : e.error
        ? "Connection unavailable"
        : "Connecting…");
  $("#terminal-provenance").textContent =
    e.problem?.provenance === "study-mode"
      ? status().label
      : "DEVELOPMENT MODE · Simulated completion · No academic credit";
  if (
    game.study.learner?.attempts.some(
      (a) =>
        a.encounter === encounterKey(e) && a.status === "externally-resolved",
    )
  )
    $("#terminal-provenance").textContent +=
      " · Resolved in your imported roadmap. Your original puzzle and draft remain playable; finishing grants gameplay rewards without another academic visit.";
  $("#problem").textContent =
    e.problem?.prompt ??
    (e.state === "consumed"
      ? "Other survivors have already used this one-time terminal. No saved question is available for this simulated NPC-only outcome. It grants no human learning credit. Find an unused terminal to work toward your personal access."
      : (e.error ??
        "Generating a stable curriculum-scoped problem. You can leave immediately."));
  if (force || document.activeElement !== editor || e.state === "consumed") {
    if (editor.value !== e.workspace) editor.value = e.workspace;
    editorRevision = e.revision;
    presentSharedWorkspace(game, e);
    if (force) {
      editor.scrollTop = e.scroll;
      editor.setSelectionRange(...e.selection);
    }
  }
  editor.readOnly = e.state === "consumed";
  const outcomeBox = $("#npc-outcome"),
    inspection = e.outcomeInspection;
  outcomeBox.hidden = !e.simulatedOutcome;
  if (e.simulatedOutcome) {
    const visible = outcomeIsVisible(game, e, roadmap);
    const ready =
      status().mode === "study-mode" &&
      game.study.profile === "live" &&
      status().capabilities.includes("materialize-outcome");
    const signature = `${encounterKey(e)}/${inspection?.state}/${inspection?.error}/${e.outcomeNotice}/${ready}/${visible}`;
    if (signature !== outcomeSignature) {
      $("#npc-outcome-status").textContent =
        inspection?.state === "applied" && !visible
          ? "Saved reconstruction deferred because its original outcome or current learning ceiling changed."
          : inspection?.state === "applied"
            ? "Reconstructed now from saved simulated NPC work and checked against the question. No historical execution or human learning credit."
            : inspection?.state === "pending"
              ? "Preparing and checking the saved survivor solution. Survival continues."
              : (inspection?.error ??
                e.outcomeNotice ??
                (ready
                  ? "This lock was completed by simulated survivors. Inspect a consistent solution without changing its outcome."
                  : "Exact survivor solutions require a connected native outcome-inspection capability. The simulated world result is preserved."));
      const button = $<HTMLButtonElement>("#inspect-npc-outcome");
      button.hidden = inspection?.state === "applied";
      button.disabled = !ready || inspection?.state === "pending";
      button.textContent =
        inspection && inspection.state !== "pending"
          ? "Retry saved solution inspection"
          : "Inspect survivor solution";
      const body = $("#npc-outcome-body");
      body.innerHTML =
        visible && inspection?.candidate
          ? `<details open><summary>Saved survivor solution · reconstruction</summary><p>${escape(inspection.candidate.problem.title)}</p><pre>${escape(inspection.candidate.problem.prompt)}</pre><pre>${escape(inspection.candidate.solution)}</pre><p>${escape(inspection.validation!.feedback)}</p></details>`
          : "";
      outcomeSignature = signature;
    }
    if (inspection?.state === "applied") presentNpcOutcome(game, e, roadmap);
  }

  const proposals = e.proposals ?? [],
    candidateBox = $("#workspace-proposals");
  candidateBox.hidden = !proposals.length;
  const candidateSignature = `${encounterKey(e)}/${e.revision}/${e.state}/${proposals.map((p) => `${p.id}:${p.state}`).join(";")}`;
  if (candidateSignature !== proposalSignature) {
    const opened = new Set(
      [
        ...candidateBox.querySelectorAll<HTMLDetailsElement>("details[open]"),
      ].map((d) => d.dataset.proposal),
    );
    candidateBox.innerHTML = `<p>NPC edits are unvalidated. Applying records the NPC as author and does not award personal mastery. Prepared candidates may be applied and submitted by the NPC after you leave. Run or submit other candidates to check them.</p>${proposals
      .map((p) => {
        const name =
          game.survivors.find((a) => a.id === p.author)?.name ?? p.author;
        const stale = p.sourceRevision !== e.revision;
        return `<details data-proposal="${escape(p.id)}" ${opened.has(p.id) ? "open" : ""}><summary>${escape(name)} · candidate for v${p.sourceRevision} · ${p.state === "pending" && stale ? "stale" : p.state === "applied" ? `applied as v${p.appliedRevision}` : p.state}</summary><pre>${escape(`Remove at character ${p.patch.prefix}:\n${p.patch.removed || "(nothing)"}\n\nInsert:\n${p.patch.inserted || "(nothing)"}`)}</pre>${p.state === "pending" ? `<button data-apply-proposal="${escape(p.id)}" ${stale || e.state === "consumed" ? "disabled" : ""}>Apply NPC edit</button><button class="quiet" data-dismiss-proposal="${escape(p.id)}" ${e.state === "consumed" ? "disabled" : ""}>Dismiss candidate</button>${stale ? "<p>Workspace changed. Ask for a new proposal on the current revision.</p>" : ""}` : ""}</details>`;
      })
      .join("")}`;
    for (const detail of candidateBox.querySelectorAll<HTMLDetailsElement>(
      "details",
    )) {
      detail.ontoggle = () => {
        if (detail.open) {
          presentWorkspaceProposal(game, e, detail.dataset.proposal!);
          persist();
        }
      };
    }
    for (const button of candidateBox.querySelectorAll<HTMLButtonElement>(
      "button",
    )) {
      button.onclick = () => {
        try {
          reviewWorkspaceProposal(
            game,
            e,
            button.dataset.applyProposal ?? button.dataset.dismissProposal!,
            button.dataset.applyProposal ? "apply" : "dismiss",
          );
          persist();
          renderTerminal(true);
        } catch (err) {
          e.error = String(err);
          renderTerminal();
        }
      };
    }
    proposalSignature = candidateSignature;
  }
  $("#revision").textContent =
    `v${e.revision}${e.state === "consumed" ? " · consumed / read-only" : ""}`;
  $<HTMLButtonElement>("#submit").disabled =
    !e.problem ||
    e.state === "consumed" ||
    e.submissions.some((s) => s.status === "pending");
  const runnable = canRunWorkspace(game, e, roadmap);
  const runButton = $<HTMLButtonElement>("#run-code");
  runButton.hidden = !runnable;
  runButton.disabled =
    e.executions?.some((job) => job.status === "pending") ?? false;
  runButton.textContent = runButton.disabled
    ? "Running captured code…"
    : `Run ${e.problem?.runtime?.language ?? "code"}`;
  $("#execution-results").hidden = !e.executions?.length;
  $("#execution-output").textContent = (e.executions ?? [])
    .slice(-5)
    .map((job) => {
      const receipt = job.receipt;
      return `${job.author ?? "human"} · v${job.revision} · ${job.language} · ${job.status}${receipt ? ` / ${receipt.status} / exit ${receipt.exitCode ?? "—"}` : ""}\n${job.error ?? receipt?.detail ?? ""}\n${receipt?.stdout ?? ""}${receipt?.stderr ?? ""}`;
    })
    .join("\n\n");
  $("#submission-status").textContent =
    e.submissions.at(-1)?.feedback ??
    e.error ??
    "Edits save immediately. Survival continues.";
  $("#loot").innerHTML =
    e.reward === "loot" && e.state === "consumed"
      ? `<p>Finite cache · choose within pack capacity</p>${e.loot.map((i) => `<button data-take="${escape(i.id)}">${escape(itemInfo(i.kind).label)} · ${i.weight} kg</button>`).join("")}`
      : "";
  for (const el of document.querySelectorAll<HTMLButtonElement>("[data-take]"))
    el.onclick = () => {
      if (takeLoot(game, human(game), e.id, el.dataset.take!)) {
        persist();
        renderTerminal();
      } else game.notice = "Pack full or cache access not earned.";
    };
  for (const btn of document.querySelectorAll<HTMLButtonElement>("[data-tab]"))
    btn.classList.toggle("selected", btn.dataset.tab === tab);
  presentMessages(game, e, tab);
  const latestCatchup = e.catchups?.at(-1);
  $("#catchup-status").hidden = tab !== "group" || !e.catchupNotice;
  $("#catchup-status").textContent = e.catchupNotice ?? "";
  $("#retry-catchup").hidden =
    tab !== "group" ||
    !latestCatchup ||
    !["unavailable", "interrupted"].includes(latestCatchup.state);
  const work = e.history.filter((h) =>
    [
      "npc-thought",
      "npc-proposal",
      "workspace-view",
      "validation",
      "activity",
      "defense",
      "completion",
    ].includes(h.kind),
  );
  const log = $<HTMLDetailsElement>("#work-log");
  $("#team-work-status").textContent = e.materializationNotice ?? "";
  $("#team-work-status").hidden = !e.materializationNotice;
  $("#retry-team-work").hidden = !(e.materializations ?? []).some((j) =>
    ["failed", "interrupted"].includes(j.state),
  );
  log.hidden = tab !== "group" || !work.length;
  log.querySelector("summary")!.textContent =
    `Recorded group work (${work.length})`;
  if (tab === "group" && log.open) {
    presentWorkLog(game, e);
    const signature = `${encounterKey(e)}/${work.length}/${work.at(-1)?.seq}`;
    if (signature !== workLogSignature) {
      const body = $("#work-log-body"),
        bottom = body.scrollHeight - body.scrollTop - body.clientHeight < 30;
      body.innerHTML = `<p>Recorded ideas can be tentative. A work note is not an executed test or a validated answer.</p>${work.map((h) => `<p><strong>${escape(game.survivors.find((a) => a.id === h.author)?.name ?? h.author)} · ${Math.floor(h.at / 60)}:${String(Math.floor(h.at % 60)).padStart(2, "0")}</strong><br>${escape(h.text)}</p>`).join("")}`;
      if (bottom || !workLogSignature.startsWith(`${encounterKey(e)}/`))
        body.scrollTop = body.scrollHeight;
      workLogSignature = signature;
    }
  }
  const messages = e[tab];
  const html = messages
    .map(
      (m) =>
        `<div class="message ${m.kind}"><strong>${escape(game.survivors.find((a) => a.id === m.author)?.name ?? m.author)}</strong><p>${escape(m.text)}</p></div>`,
    )
    .join("");
  if ($("#messages").innerHTML !== html) {
    $("#messages").innerHTML = html;
    $("#messages").scrollTop = $("#messages").scrollHeight;
  }
}
editor.addEventListener("input", () => {
  if (!active) return;
  try {
    if (
      edit(game, game.encounters[active], editor.value, editorRevision, roadmap)
    )
      editorRevision = game.encounters[active].revision;
    persist();
  } catch (err) {
    game.notice = String(err);
    renderTerminal(true);
  }
});
$("#run-code").onclick = () => {
  if (!active) return;
  const e = game.encounters[active];
  void runWorkspace(game, e, roadmap)
    .then(() => {
      persist();
      if (active === e.id) renderTerminal();
    })
    .catch((error) => {
      game.notice = String(error);
    });
  persist();
  renderTerminal();
};
$("#submit").onclick = () => {
  if (!active) return;
  const e = game.encounters[active];
  void submit(game, e, roadmap).then(() => {
    persist();
    renderTerminal();
  });
  renderTerminal();
  persist();
};
$("#chat-form").onsubmit = (ev) => {
  ev.preventDefault();
  if (!active) return;
  const e = game.encounters[active],
    input = $<HTMLInputElement>("#chat-input"),
    text = input.value;
  input.value = "";
  void send(game, e, tab, text, roadmap).then(() => {
    persist();
    renderTerminal();
  });
  renderTerminal();
  persist();
};
for (const btn of document.querySelectorAll<HTMLButtonElement>("[data-tab]"))
  btn.onclick = () => {
    if (!active) return;
    const e = game.encounters[active];
    if (tab === "group") closeChat(game, e);
    tab = btn.dataset.tab as typeof tab;
    if (tab === "group") showGroup(e);
    renderTerminal();
    persist();
  };
$("#retry-catchup").onclick = () => {
  if (!active) return;
  const e = game.encounters[active];
  void retryChatCatchup(game, e).then(() => {
    if (active === e.id && tab === "group") renderTerminal();
    persist();
  });
  renderTerminal();
  persist();
};
$("#inspect-npc-outcome").onclick = () => {
  if (!active) return;
  const e = game.encounters[active],
    pending = inspectCompletedNpcWork(game, e, roadmap, !!e.outcomeInspection);
  renderTerminal();
  persist();
  if (pending)
    void pending.then(() => {
      if (active === e.id) renderTerminal();
      persist();
    });
};
$("#retry-team-work").onclick = () => {
  if (!active) return;
  const e = game.encounters[active];
  void materializeObservedWork(game, e, true)?.then(() => {
    if (active === e.id) renderTerminal();
    persist();
  });
  renderTerminal();
};
$("#work-log").ontoggle = () => {
  if (active) {
    renderTerminal();
    persist();
  }
};
$("#leave").onclick = closeTerminal;
$("#save-button").onclick = async () => {
  await persist();
  game.notice =
    saveError ||
    "Run saved locally. Export a backup from Settings to move between browsers.";
};
function readinessHtml(track: "PY" | "PE") {
  if (!game.study.learner) return "";
  const report = curriculumReadiness(roadmap, game.study.learner!, track);
  const summary = (v: { passed: number; total: number }) =>
    `${v.passed}/${v.total}`;
  return `<section data-readiness="${track}"><h3>${track} readiness</h3><p>Checkpoint targets ${summary(report.checkpoints)} · topic transfers ${summary(report.transfers)} · selected integrations ${summary(report.integrations)}.</p><p>Curriculum targets: ${report.curriculumTargetsMet ? "met" : "not yet met"}. Interview practice: ${report.interviewPracticeVerified ? "verified" : "not yet verified"}. Delayed retention: ${report.retention.verified}/${report.retention.tracked} tracked scopes verified.</p>${report.environment.total ? `<p>Observed environment skills ${summary(report.environment)}. ENV observations are separate and never block a tier gate.</p>` : ""}<details><summary>Transfer, integration and environment records</summary><p>These records preserve the roadmap's selected scope. Only validated independent human evidence can complete a transfer or integration. Development play, shared success and code execution alone add no credit.</p>${report.requirements.map((d) => `<p><strong>${escape(d.id)}</strong> · ${d.selected ? escape(d.status) : "not selected"}<br>${escape(d.remaining)}<br><small>${escape(d.sourceRefs)}</small></p>`).join("")}</details></section>`;
}
$("#curriculum-button").onclick = () => {
  $("#inspector").hidden = false;
  const c = eligibleForUI();
  const readiness = (["PY", "PE"] as const).map(readinessHtml).join("");
  $("#inspector-content").innerHTML =
    `<p>PY: Tier ${game.study.profile === "live" ? game.study.learner?.tracks.PY.tier : 1} / ${escape(game.study.phases.PY)}. PE: Tier ${game.study.profile === "live" ? game.study.learner?.tracks.PE.tier : 1} / ${escape(game.study.phases.PE)}. The next formal visit is ${c?.track ?? "waiting at a curriculum gate"}${c?.review ? " · oldest due review" : ""}. Floors and survival do not change academic depth.</p><p>${escape(status().detail)}</p><p>${game.study.profile === "live" ? "Game-recorded academic visits" : "Development practice visits"}: ${game.study.visits.length}. Source: ${roadmap.sourceHash}. Original evidence is retained in full; development play adds no passes.</p><button id="progress-export">Download updated merged roadmap</button><p id="progress-export-status" class="muted">Validated live study and reviewed practical evidence can update the roadmap. Downloading a save does not award learning credit.</p><button id="source-export" class="quiet">Download original merged roadmap</button><button id="evidence-export" class="quiet">Export game evidence for review</button><h3>Assessment queue</h3>${game.study.assessments.map((a) => `<p>${escape(a.id)} · ${escape(a.status)}<br>${escape(a.provenance)} ${a.status === "review-required" ? `<button data-assessment="${escape(a.id)}" class="quiet">Retry assessment</button>` : ""}</p>`).join("") || "<p>No assessments yet.</p>"}<details><summary>Authoritative saved scheduler</summary><pre>${escape(roadmap.sharedProgress)}</pre></details>`;
  $("#inspector-content").insertAdjacentHTML("beforeend", readiness);
  renderEnvironmentObservations(
    $("#inspector-content"),
    game,
    roadmap,
    async () => {
      if (!(await persist())) throw Error(saveError || "Local save failed");
    },
    game.study.profile === "live" &&
      status().capabilities.includes("review-environment")
      ? (id, retry) => reviewEnvironmentObservation(game, roadmap, id, retry)
      : undefined,
    () => {
      for (const track of ["PY", "PE"] as const) {
        const node = document.querySelector(`[data-readiness="${track}"]`);
        if (node) node.outerHTML = readinessHtml(track);
      }
    },
  );
  $("#inspector-content").insertAdjacentHTML(
    "beforeend",
    `<details><summary>Review an updated roadmap</summary><p>Compare a merged Markdown file with your saved progress. This preview checks ancestry and row conflicts. Request native reconciliation when connected, then review and explicitly adopt its complete proposal. Comparison alone leaves learning unchanged.</p><label class="file-label">Choose roadmap for review <input id="roadmap-review-file" type="file" accept=".md,text/markdown,text/plain"></label><div id="roadmap-review-result" role="status"></div></details>`,
  );
  $("#inspector-content").insertAdjacentHTML(
    "beforeend",
    '<div id="roadmap-adoption-controls"></div>',
  );
  const renderAdoption = (candidate?: string) =>
    renderRoadmapAdoption($("#roadmap-adoption-controls"), {
      getGame: () => game,
      r: roadmap,
      candidate,
      persist: async () => {
        if (!(await persist())) throw Error(saveError || "Local save failed");
      },
      reconcile:
        game.study.profile === "live" &&
        status().capabilities.includes("reconcile-roadmap")
          ? (text, id, captured) =>
              reconcileUploadedRoadmap(game, roadmap, text, id, async () => {
                if (!(await persist()))
                  throw Error(
                    saveError ||
                      "Local save failed before native reconciliation",
                  );
                captured?.();
              })
          : undefined,
      onAdopted: () => $("#curriculum-button").click(),
    });
  renderAdoption();
  $<HTMLInputElement>("#roadmap-review-file").onchange = async () => {
    const input = $<HTMLInputElement>("#roadmap-review-file");
    const file = input.files?.[0];
    if (!file) return;
    const output = $("#roadmap-review-result");
    input.disabled = true;
    output.textContent = "Reviewing a snapshot of current saved progress…";
    try {
      if (file.size > 2_000_000)
        throw Error("Roadmap exceeds the 2 MB review limit");
      // Export preparation runs on a copy: review never allocates live IDs,
      // advances the export cache or changes an ongoing study session.
      const study = structuredClone(game.study);
      const local =
        study.profile === "live" && study.learner
          ? (
              await prepareRoadmapExport(
                roadmap,
                study.learner,
                study.roadmapExport,
              )
            ).content
          : roadmap.raw;
      const candidate = await file.text();
      const report = await reviewRoadmap(roadmap, local, candidate);
      renderAdoption(
        report.ancestry === "identical" ||
          report.issues.some((i) => i.severity === "invalid")
          ? undefined
          : candidate,
      );
      output.innerHTML = `<p><strong>${report.issues.some((i) => i.severity === "invalid") ? "Invalid roadmap" : "Review required"}</strong> · revision ${report.candidateRevision} · ${escape(report.ancestry)}</p><p>${report.changes.length} changed progress rows · ${report.changes.filter((c) => c.conflict).length} conflicts</p>${report.issues.map((i) => `<p>${escape(i.detail)}</p>`).join("")}<details><summary>Progress differences</summary>${report.changes.map((c) => `<p><strong>${escape(c.key)}${c.conflict ? " · CONFLICT" : ""}</strong></p><pre>${escape(`Source: ${c.before ?? "(absent)"}\nLocal: ${c.local ?? "(absent)"}\nIncoming: ${c.incoming ?? "(absent)"}`)}</pre>`).join("") || "<p>No progress row changes.</p>"}</details>${
        report.resume
          ? `<details><summary>Saved resume claims</summary><p>Ratio position: ${report.resume.ratioPosition === undefined ? "needs reconciliation" : `${report.resume.ratioPosition + 1} of PY → PE → PE`}. ${report.resume.retentionRecords} exact retention records; ${report.resume.suspendedQueues} suspended queues.</p>${(
              ["PY", "PE"] as const
            )
              .map((t) => {
                const s = report.resume!.tracks[t];
                return `<p>${t}: Tier ${s.tier} / ${escape(s.phase)} / lap ${s.lap}; cleared through ${s.cleared}. Remaining: ${escape(s.remaining.join(", ") || "none")}.</p>`;
              })
              .join(
                "",
              )}<p>Parsed claims only. Semantic evidence reconciliation and adoption are still required before changing live study.</p></details>`
          : ""
      }<details><summary>File fingerprints</summary><pre>${escape(`Source: ${report.sourceHash}\nLocal snapshot: ${report.localHash}\nIncoming: ${report.candidateHash}`)}</pre></details><p>Comparison is a snapshot taken when review started. Recheck after further study before reconciling.</p>`;
      const differences = output.querySelector<HTMLDetailsElement>("details");
      if (differences)
        differences.ontoggle = () => {
          if (differences.open)
            presentRoadmapReview(
              game,
              `${report.localHash}/${report.candidateHash}/upload-diff`,
              report.changes
                .map(
                  (c) =>
                    `${c.key}\n${c.local ?? "(absent)"}\n${c.incoming ?? "(absent)"}`,
                )
                .join("\n"),
            );
        };
    } catch (err) {
      output.textContent = `Review rejected: ${err instanceof Error ? err.message : String(err)}`;
    } finally {
      input.disabled = false;
      input.value = "";
    }
  };

  const historical = game.study.learner?.historicalReviews ?? [];
  if (historical.length)
    $("#inspector-content").insertAdjacentHTML(
      "beforeend",
      `<details><summary>Historical facet reconciliations (${historical.length})</summary><p>Original observations retain their original IDs and dates. Reconciliation dates record review activity, not new human demonstrations. Earlier reviews remain in this audit.</p>${historical
        .map((m) => {
          const def = game.study.learner!.scopes[m.scopeId];
          const observed = def
            ? historicalRecords(roadmap, def.objectiveId, def.depth)
                .filter((r) => m.evidenceIds.includes(r.id))
                .map((r) => `${r.id} observed ${r.date}`)
                .join("; ")
            : "Source scope unavailable";
          return `<p><strong>${escape(m.scopeId)} · ${escape(m.facet)}</strong> · ${escape(m.outcome)}<br>${escape(observed)}<br><small>Reviewed ${escape(m.reviewedAt)} · ${escape(m.assessmentId)}</small></p>`;
        })
        .join("")}</details>`,
    );
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-assessment]",
  ))
    button.onclick = () => {
      const a = game.study.assessments.find(
        (a) => a.id === button.dataset.assessment,
      );
      if (!a) return;
      const e = [
        ...Object.values(game.encounters),
        ...game.study.archives,
      ].find((e) => a.id.startsWith(`assessment-${encounterKey(e)}-`));
      if (e)
        void assess(game, e, roadmap, a.evidenceCutoffSequence, true).then(
          () => {
            persist();
            button.textContent =
              game.study.assessments.find((item) => item.id === a.id)?.status ??
              "Saved";
          },
        );
    };
  $("#progress-export").onclick = async () => {
    const button = $<HTMLButtonElement>("#progress-export");
    button.disabled = true;
    try {
      const prepared = await prepareRoadmapExport(
        roadmap,
        game.study.learner!,
        game.study.roadmapExport,
      );
      game.study.roadmapExport = prepared;
      await persist();
      download("interview_prep_roadmap.md", prepared.content, "text/markdown");
      $("#progress-export-status").textContent =
        `Saved complete revision ${prepared.revision}. Original curriculum and historical evidence preserved. ${saveError || ""}`;
    } catch (err) {
      $("#progress-export-status").textContent =
        `Export needs review: ${err instanceof Error ? err.message : String(err)}`;
    } finally {
      button.disabled = false;
    }
  };
  $("#source-export").onclick = () =>
    download("interview_prep_roadmap.md", roadmap.raw, "text/markdown");
  $("#evidence-export").onclick = () =>
    download(
      "dead-air-evidence.json",
      JSON.stringify(
        { study: game.study, encounters: game.encounters },
        null,
        2,
      ),
    );
};
$("#close-inspector").onclick = () => {
  $("#inspector").hidden = true;
};
$("#settings-toggle").onclick = () => {
  $("#settings").hidden = !$("#settings").hidden;
  $<HTMLInputElement>("#volume").value = String(game.settings.volume);
  $<HTMLInputElement>("#captions").checked = game.settings.captions;
  $<HTMLInputElement>("#reduced").checked = game.settings.reducedFlash;
  $("#bridge-detail").textContent = status().detail;
  $("#audio-status").textContent = audio.error;
};
$("#settings-close").onclick = () => {
  $("#settings").hidden = true;
  persist();
};
$("#volume").oninput = () => {
  game.settings.volume = +$<HTMLInputElement>("#volume").value;
};
$("#captions").onchange = () => {
  game.settings.captions = $<HTMLInputElement>("#captions").checked;
};
$("#reduced").onchange = () => {
  game.settings.reducedFlash = $<HTMLInputElement>("#reduced").checked;
};
$("#reconnect").onclick = () => {
  void checkBridge().then(() => {
    $("#bridge-detail").textContent = status().detail;
  });
};
$("#live-profile").onclick = () => {
  if (status().mode !== "study-mode") {
    game.notice =
      "Connect the direct Study Mode bridge before starting a live profile.";
    return;
  }
  const learner = game.study.learner;
  fresh();
  const next = initialStudy(roadmap, "live");
  if (learner) next.learner = learner;
  next.archives = game.study.archives;
  next.environmentObservations = game.study.environmentObservations ??= [];
  next.environmentReviews = game.study.environmentReviews ??= [];
  next.roadmapReconciliations = game.study.roadmapReconciliations ??= [];
  next.roadmapAdoptionBackups = game.study.roadmapAdoptionBackups ??= [];
  next.assessments = game.study.assessments;
  next.roadmapExport = game.study.roadmapExport;
  game.study = next;
  game.notice =
    "Live study profile: original curriculum state retained; development visits are not academic evidence.";
  persist();
  $("#settings").hidden = true;
};
$("#export").onclick = () => download("dead-air-run.json", encode(game));
$("#import").onchange = async () => {
  const file = $<HTMLInputElement>("#import").files?.[0];
  if (!file) return;
  try {
    const next = recover(decode(await file.text()));
    closeTerminal();
    game = next;
    persist();
    startCard();
    $("#settings").hidden = true;
  } catch (err) {
    game.notice = `Import rejected: ${String(err)}`;
  }
};
window.addEventListener("keydown", (ev) => {
  if (ev.code === "Escape") {
    ev.preventDefault();
    if (active) closeTerminal();
    else {
      $("#settings").hidden = true;
      $("#inspector").hidden = true;
      canvas.focus();
    }
    return;
  }
  if ((ev.target as HTMLElement).matches("input,textarea,button,summary"))
    return;
  if (
    [
      "Space",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "KeyE",
      "KeyR",
    ].includes(ev.code)
  )
    ev.preventDefault();
  keys.add(ev.code);
  if (ev.repeat) return;
  if (ev.code === "KeyE") void interact();
  if (ev.code === "Space") vault(game, human(game));
  if (ev.code === "KeyR") rotate(game, human(game));
  if (/^Digit[1-6]$/.test(ev.code)) {
    const it = human(game).inventory[Number(ev.code.slice(-1)) - 1];
    if (it) useItem(game, human(game), it.id);
  }
});
window.addEventListener("keyup", (ev) => keys.delete(ev.code));
window.addEventListener("blur", () => {
  keys.clear();
  persist();
});
window.addEventListener("pagehide", persist);
let completionCursor = 0;
function completionAssessments() {
  for (const ev of game.events.filter(
    (ev) => ev.seq > completionCursor && ev.type === "completion",
  )) {
    const e = ev.encounter ? game.encounters[ev.encounter] : undefined;
    if (e?.contributors.includes("human"))
      void assess(game, e, roadmap).then(persist);
  }
  completionCursor = game.seq;
}
let inventorySignature = "";
let materializing: Promise<void> | undefined;
function ui() {
  syncLearningView(game.study);
  completionAssessments();
  const a = human(game),
    f = game.floors[a.floor];
  document.body.classList.toggle("surge", game.surge.state === "active");
  document.body.classList.toggle("reduced", game.settings.reducedFlash);
  $("#bridge-label").textContent =
    `${status().label} · ${game.study.profile ?? "development"} profile`;
  $("#floor-label").textContent =
    a.floor === CONFIG.floors
      ? "ROOFTOP / EXTRACTION"
      : `FLOOR ${String(a.floor + 1).padStart(2, "0")} / ${CONFIG.floors}`;
  $("#floor-name").textContent = f.name;
  $("#run-time").textContent =
    `${String(Math.floor(game.time / 60)).padStart(2, "0")}:${String(Math.floor(game.time % 60)).padStart(2, "0")}`;
  $("#health").textContent = String(Math.ceil(a.hp));
  $("#health-fill").style.width = `${a.hp}%`;
  $("#access").textContent =
    game.status === "escaped"
      ? "EXTRACTED"
      : game.status === "dead"
        ? "RUN ENDED"
        : a.floor === CONFIG.floors
          ? "ROOFTOP"
          : a.access.includes(a.floor)
            ? "STAIRS OPEN"
            : "ACCESS LOCKED";
  $("#alive").textContent = String(
    game.survivors.filter((a) => a.alive && !a.escaped).length,
  );
  $("#rescued").textContent = String(game.stats.rescued);
  $("#lost").textContent = String(game.stats.deaths);
  $("#notice").textContent = saveError || game.notice;
  $("#next-title").textContent =
    game.status === "escaped"
      ? "Extraction confirmed."
      : game.status === "dead"
        ? "Escape attempt ended."
        : a.floor === CONFIG.floors
          ? "Hold for extraction."
          : a.y > 28
            ? "Make it inside."
            : a.access.includes(a.floor)
              ? "Find the upward stairs."
              : "Buy yourself some time.";
  $("#next-description").textContent =
    game.status === "escaped" || game.status === "dead"
      ? "Review your saved work or begin another run."
      : a.floor === CONFIG.floors
        ? "Reach the helipad and press E while a helicopter is boarding. Four seats per trip."
        : a.access.includes(a.floor)
          ? "Your credential is personal. The stairs are at the north end of the central corridor."
          : "Find a glowing terminal. Solo work or meaningful shared-room defense can earn your credential. Hold G + movement to place furniture; rotate it to seal a doorway.";
  $("#pickup").textContent =
    game.status === "escaped"
      ? `PICKUP ${game.helicopter.trip} · EXTRACTED`
      : game.status === "dead"
        ? ""
        : a.floor === CONFIG.floors
          ? game.time < game.helicopter.until
            ? `BOARDING · ${4 - game.helicopter.passengers.length} seats · ${Math.ceil(game.helicopter.until - game.time)}s`
            : `NEXT PICKUP · ${Math.ceil(game.helicopter.next - game.time)}s`
          : "";
  $("#weight").textContent =
    `${a.inventory.reduce((n, i) => n + i.weight, 0)} / ${CONFIG.capacity} KG`;
  const sig = JSON.stringify(a.inventory);
  if (sig !== inventorySignature) {
    inventorySignature = sig;
    $("#inventory").innerHTML =
      a.inventory
        .map(
          (it, i) =>
            `<button class="item" data-use="${escape(it.id)}" title="${escape(itemInfo(it.kind).detail)}"><kbd>${i + 1}</kbd><strong>${escape(itemInfo(it.kind).label)}</strong><small>${it.charges} use${it.charges > 1 ? "s" : ""} · ${it.weight}kg<br>${escape(itemInfo(it.kind).short)}</small></button>`,
        )
        .join("") ||
      '<p class="muted">Pack empty. Optional caches hold equipment.</p>';
    if (a.inventory.length)
      $("#inventory").insertAdjacentHTML(
        "beforeend",
        `<details class="equipment-guide"><summary>Equipment effects</summary>${[...new Set(a.inventory.map((it) => it.kind))].map((kind) => `<p><strong>${escape(itemInfo(kind).label)}</strong> — ${escape(itemInfo(kind).detail)}</p>`).join("")}</details>`,
      );
    for (const b of document.querySelectorAll<HTMLButtonElement>("[data-use]"))
      b.onclick = () => {
        useItem(game, a, b.dataset.use!);
        persist();
      };
  }
  for (const track of ["PY", "PE"] as const) {
    const live = game.study.profile === "live",
      state = game.study.learner?.tracks[track];
    const count = roadmap.tracks[track].objectives.filter(
      (o) =>
        (live ? game.study.learner?.cells[o.id].states[0] : o.cells[0]) === "P",
    ).length;
    $(`#${track.toLowerCase()}-phase`).textContent =
      `Tier ${live ? (state?.tier ?? 1) : 1} · ${game.study.phases[track].toLowerCase().replaceAll("_", " ")}`;
    $(`#${track.toLowerCase()}-total`).textContent = String(count).padStart(
      2,
      "0",
    );
    $(`#${track.toLowerCase()}-count`).textContent =
      `${count} / ${roadmap.tracks[track].objectives.length} D1 checkpoints verified`;
  }
  const c = eligibleForUI();
  $("#schedule").textContent = c
    ? `1 PY : 2 PE · Next: ${c.track}${c.review ? " retention review" : ""} · D${c.depth}`
    : "Curriculum gate awaiting verified evidence";
  $("#event-feed").innerHTML =
    game.events
      .filter((e) =>
        [
          "death",
          "completion",
          "climb",
          "breach",
          "helicopter",
          "board",
        ].includes(e.type),
      )
      .slice(-5)
      .reverse()
      .map(
        (e) =>
          `<p><span>${Math.floor(e.at / 60)}:${String(Math.floor(e.at % 60)).padStart(2, "0")}</span> ${escape(e.text.slice(0, 110))}</p>`,
      )
      .join("") || '<p class="muted">The stairwell radio is quiet.</p>';
  const caption = game.settings.captions ? audio.caption : "";
  if ($("#world-caption").textContent !== caption)
    $("#world-caption").textContent = caption;
  if (!materializing) {
    const pending = autonomousNpcWork(game, roadmap);
    if (pending) {
      materializing = pending;
      void pending.finally(() => {
        materializing = undefined;
        if (active) renderTerminal();
        persist();
      });
    }
  }
  if (active) {
    const e = game.encounters[active];
    if (!materializing) {
      const pending = materializeObservedWork(game, e);
      if (pending) {
        materializing = pending;
        void pending.finally(() => {
          materializing = undefined;
          if (active === e.id) renderTerminal();
          persist();
        });
      }
    }
    renderTerminal();
  }
  if (game.status !== "playing" && running) {
    running = false;
    audio.stop();
    preserveRunLearning(game);
    closeTerminal();
    persist();
    startCard();
  }
}
function frame(time: number) {
  const elapsed = Math.min((time - last) / 1000, 0.2);
  last = time;
  if (game.status === "playing") {
    acc += elapsed;
    let count = 0;
    while (acc >= 1 / 30 && count++ < 6) {
      const focused = document.activeElement?.matches("input,textarea");
      const x = focused
          ? 0
          : Number(keys.has("KeyD") || keys.has("ArrowRight")) -
            Number(keys.has("KeyA") || keys.has("ArrowLeft")),
        y = focused
          ? 0
          : Number(keys.has("KeyS") || keys.has("ArrowDown")) -
            Number(keys.has("KeyW") || keys.has("ArrowUp"));
      step(game, 1 / 30, { x, y, grab: keys.has("KeyG") });
      acc -= 1 / 30;
    }
    if (active) {
      const e = game.encounters[active];
      if (
        !game.floors[human(game).floor].stations.some(
          (s) =>
            s.encounter === e.id && canReachStation(game, human(game), s, 2.2),
        )
      )
        closeTerminal();
    }
    audio.update(game);
    if (game.time - lastSave > 3) persist();
  }
  render(canvas, game, keys.has("KeyG"));
  if (time - lastUI > 200) {
    ui();
    lastUI = time;
  }
  requestAnimationFrame(frame);
}
// Development diagnostics are read-only from the UI; browser acceptance fixtures use module-level engine APIs.
Object.assign(window, {
  __deadAir: {
    get game() {
      return game;
    },
    roadmap,
    interact,
  },
});
startCard();
ui();
requestAnimationFrame(frame);
