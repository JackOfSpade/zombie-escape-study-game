import { ensureDoor } from "./doors";
import { type Game } from "./model";
import { checkpointPhysics } from "./physics";
import { readDurable, writeDurable } from "./storage";
const KEY = "dead-air-save-v1";
interface Envelope {
  schema: 1;
  payload: string;
  checksum: number;
}
function checksum(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
export function encode(g: Game) {
  checkpointPhysics(g);
  const payload = JSON.stringify(g);
  return JSON.stringify({
    schema: 1,
    payload,
    checksum: checksum(payload),
  } satisfies Envelope);
}
export function decode(text: string): Game {
  const e = JSON.parse(text) as Envelope;
  if (
    e.schema !== 1 ||
    typeof e.payload !== "string" ||
    checksum(e.payload) !== e.checksum
  )
    throw Error("Save integrity check failed");
  const g = JSON.parse(e.payload) as Game;
  if (
    g.schema !== 1 ||
    !Array.isArray(g.floors) ||
    !Array.isArray(g.survivors) ||
    g.survivors[0]?.id !== "human" ||
    !g.study ||
    !g.surge
  )
    throw Error("Unsupported save");
  // Discard retired door-hacking state without changing earned keys or field access.
  for (const a of g.survivors) {
    const legacy = a as unknown as Record<string, unknown>;
    if (legacy.hack || legacy.activity === "hacking") {
      a.activity = "exploring";
      a.path = [];
      a.repath = 0;
    }
    delete legacy.hack;
    delete legacy.hackAttempts;
    delete legacy.hackResult;
  }
  if (/hack/i.test(g.notice ?? ""))
    g.notice =
      "Red force fields require a key. Solve a solo terminal or find a green entrance.";

  for (const floor of g.floors)
    for (const o of floor.furniture)
      if (o.id === "main-gate" && o.kind === "gate") ensureDoor(o, floor);
  return g;
}
let writes = Promise.resolve(),
  serial = 0;
interface StoredSave {
  format: 2;
  serial: number;
  data: string;
}
function unpack(raw: string) {
  const parsed = JSON.parse(raw);
  const stored =
    parsed.format === 2
      ? (parsed as StoredSave)
      : { format: 2, serial: 0, data: raw };
  if (
    !Number.isSafeInteger(stored.serial) ||
    stored.serial < 0 ||
    typeof stored.data !== "string"
  )
    throw Error("Invalid saved checkpoint");
  return { serial: stored.serial, game: decode(stored.data) };
}
export function save(g: Game) {
  const payload = JSON.stringify({
    format: 2,
    serial: (serial = Math.max(serial + 1, Date.now() * 1000)),
    data: encode(g),
  } satisfies StoredSave);
  let checkpoint = false;
  if (payload.length < 1_000_000)
    try {
      localStorage.setItem(KEY, payload);
      checkpoint = true;
    } catch {}
  const operation = writes
    .catch(() => {})
    .then(async () => {
      try {
        await writeDurable(KEY, payload);
      } catch (error) {
        if (checkpoint) return;
        try {
          localStorage.setItem(KEY, payload);
        } catch {
          throw error;
        }
      }
    });
  writes = operation;
  return operation;
}
export async function load() {
  let durable: string | null = null;
  try {
    durable = await readDurable(KEY);
  } catch {}
  let legacy: string | null = null;
  try {
    legacy = localStorage.getItem(KEY);
  } catch {}
  const valid: { serial: number; game: Game }[] = [];
  for (const raw of [durable, legacy])
    if (raw)
      try {
        valid.push(unpack(raw));
      } catch {}
  if (!valid.length) {
    if (durable || legacy)
      throw Error(
        "Saved checkpoints failed integrity checks. Export a recovery backup before starting another run.",
      );
    return null;
  }
  valid.sort((a, b) => b.serial - a.serial);
  serial = valid[0].serial;
  return valid[0].game;
}
export function flushSaves() {
  return writes;
}
export function download(
  name: string,
  text: string,
  type = "application/json",
) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export function recover(g: Game) {
  for (const job of g.study.roadmapReconciliations ?? [])
    if (job.state === "pending") {
      job.state = "interrupted";
      job.error =
        "Roadmap review interrupted; explicit retry retains its exact snapshot.";
    }
  for (const job of g.study.environmentReviews ?? [])
    if (job.state === "pending") {
      job.state = "interrupted";
      job.error = "Review interrupted; retry the captured packet explicitly.";
    }
  g.study.profile ??= "development";
  if (g.study.profile === "live" && !g.study.learner)
    throw Error(
      "Live save is missing its learner ledger; refusing to reset learning state.",
    );
  if (g.study.pending && !g.study.pending.encounter.includes("/"))
    g.study.pending.encounter = `${g.id}/${g.study.pending.encounter}`;
  for (const e of Object.values(g.encounters)) e.runId ??= g.id;
  delete g.survivors[0].station;
  for (const e of Object.values(g.encounters)) {
    e.chatOpen = false;
    delete e.groupRequest;
    for (const job of e.groupRequests ?? [])
      if (job.state === "pending") {
        job.state = "interrupted";
        job.error =
          "Application restarted; retry the exact saved group question.";
      }
    for (const job of e.tutorRequests ?? [])
      if (job.state === "pending") {
        job.state = "interrupted";
        job.error =
          "Application restarted; retry the exact saved private question.";
      }
    for (const job of e.materializations ?? [])
      if (job.state === "pending") {
        job.state = "interrupted";
        job.error = "Team-work request interrupted; retry the saved context.";
      }
    for (const job of e.catchups ?? [])
      if (job.state === "pending") {
        job.state = "interrupted";
        job.error =
          "Application restarted; the captured interval is retained for explicit retry.";
      }
    delete e.generation;
    for (const s of e.submissions)
      if (s.status === "pending") {
        s.status = "error";
        s.feedback = s.completionRequest
          ? "Application restarted during evaluation. Retry the exact saved evaluation; its captured revision is retained."
          : "Application restarted during evaluation. Captured revision retained; resubmit to retry.";
        if (e.state !== "consumed") e.state = "in-progress";
      }
  }
  for (const e of [...Object.values(g.encounters), ...g.study.archives]) {
    for (const job of e.groupRequests ?? [])
      if (job.state === "pending") {
        job.state = "interrupted";
        job.error =
          "Application restarted; the exact saved group question is retained.";
      }
    if (e.outcomeInspection?.state === "pending") {
      e.outcomeInspection.state = "interrupted";
      e.outcomeInspection.error =
        "Outcome inspection interrupted; retry its saved request and candidate.";
    }
    for (const job of e.executions ?? [])
      if (job.status === "pending") {
        job.status = "interrupted";
        job.error =
          "Application restarted during execution. Captured code retained; run again to retry.";
      }
  }
  for (const a of g.study.assessments)
    if (a.status === "pending") {
      a.status = "review-required";
      a.provenance =
        "Application restarted during assessment. Evidence cutoff and request identity retained for retry.";
    }
  return g;
}
