import { type Encounter, type Game, type Roadmap, event } from "./model";
import { eligible } from "./curriculum";
import { humanUsingWorkspace, npcAtWorkstation } from "./npc-work-access";
import { sha256 } from "./roadmap-export";

export interface ExecutionReceipt {
  id: string;
  language: "python" | "typescript";
  status:
    "completed" | "timeout" | "output-limit" | "resource-limit" | "unavailable";
  executed: boolean;
  codeHash?: string;
  imageId?: string;
  startedAt?: string;
  durationMs?: number;
  exitCode?: number | null;
  stdout?: string;
  stderr?: string;
  detail?: string;
}
export interface WorkspaceExecution {
  id: string;
  author?: string;
  revision: number;
  language: ExecutionReceipt["language"];
  code: string;
  artifactSequences: number[];
  status: "pending" | "finished" | "interrupted" | "error";
  receipt?: ExecutionReceipt;
  error?: string;
}

export function canRunWorkspace(g: Game, e: Encounter, r: Roadmap) {
  if (
    !e.problem?.runtime ||
    e.state === "consumed" ||
    g.study.profile !== "live"
  )
    return false;
  const c = eligible(r, g.study),
    issued = e.problem.contract;
  return (
    issued.depth >= 2 &&
    issued.depth === c.depth &&
    issued.track === c.track &&
    JSON.stringify(issued.objectiveIds) === JSON.stringify(c.objectiveIds)
  );
}

export async function runWorkspace(
  g: Game,
  e: Encounter,
  r: Roadmap,
  author = "human",
) {
  if (
    author !== "human" &&
    (!npcAtWorkstation(g, e, author) || humanUsingWorkspace(g, e))
  )
    throw Error(
      "NPC execution requires an unattended workspace and its seated author",
    );
  if (!canRunWorkspace(g, e, r))
    throw Error("This task has no eligible executable workspace");
  if (e.executions?.some((a) => a.status === "pending")) return;
  const job: WorkspaceExecution = {
    author,
    id: crypto.randomUUID(),
    revision: e.revision,
    language: e.problem!.runtime!.language,
    code: e.workspace,
    status: "pending",
    artifactSequences: e.history
      .filter(
        (h) =>
          h.author === author && h.kind === "edit" && h.revision === e.revision,
      )
      .map((h) => h.seq),
  };
  e.executions ??= [];
  e.executions.push(job);
  try {
    const codeHash = await sha256(job.code);
    const response = await fetch("/api/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: job.language, code: job.code }),
      signal: AbortSignal.timeout(20000),
    });
    const receipt = (await response.json()) as ExecutionReceipt & {
      error?: string;
    };
    if (!response.ok && receipt.status !== "unavailable")
      throw Error(receipt.error ?? "Runner request failed");
    if (
      !receipt ||
      typeof receipt.id !== "string" ||
      receipt.language !== job.language ||
      typeof receipt.executed !== "boolean" ||
      ![
        "completed",
        "timeout",
        "output-limit",
        "resource-limit",
        "unavailable",
      ].includes(receipt.status) ||
      (receipt.executed &&
        (receipt.codeHash !== codeHash ||
          !/^sha256:[a-f0-9]{64}$/.test(receipt.imageId ?? "") ||
          typeof receipt.stdout !== "string" ||
          typeof receipt.stderr !== "string"))
    )
      throw Error("Runner receipt does not match the captured code");
    job.receipt = receipt;
    job.status = "finished";
    if (receipt.executed) {
      const ev = event(
        g,
        "execution",
        `Ran ${job.language} workspace v${job.revision}.`,
        e.floor,
        "runner",
        e.id,
      );
      e.history.push({
        seq: ev.seq,
        author: "runner",
        kind: "execution",
        executionId: job.id,
        text: JSON.stringify(receipt),
        at: g.time,
        wallTime: new Date().toISOString(),
        revision: job.revision,
        refs: job.artifactSequences.map((seq) => `artifact:${seq}`),
      });
    }
  } catch (error) {
    job.status = "error";
    job.error = String(error);
  }
  return job;
}
