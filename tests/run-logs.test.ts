import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { setImmediate as settle } from "node:timers/promises";
import { RunLogs, LOG_LIMITS } from "../src/run-logs";
import { createGame } from "../src/world";
import type { Roadmap } from "../src/model";
const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
function scene() {
  const g = createGame(11, roadmap);
  g.status = "playing";
  g.survivors = g.survivors.slice(0, 1);
  g.zombies = [];
  return { g };
}
test("last-three-game logs survive reload, prune old games and bound each game without learning content", async () => {
  let stored: string | null = null;
  const storage = {
    read: async () => stored,
    write: async (value: string) => {
      stored = value;
    },
  };
  const logs = new RunLogs(storage),
    { g } = scene();
  const study = JSON.stringify(g.study);
  for (let i = 0; i < 5; i++) {
    g.id = `run-${i}`;
    logs.record(g, "start");
    logs.capture(g, true);
  }
  for (let i = 0; i < 700; i++)
    logs.record(g, "bounded", { payload: "x".repeat(2000) });
  await logs.flush();
  const restored = new RunLogs(storage);
  await restored.load();
  assert.deepEqual(
    restored.runs.map((r) => r.id),
    ["run-2", "run-3", "run-4"],
  );
  for (const run of restored.runs) {
    assert.ok(run.entries.length <= LOG_LIMITS.entries);
    assert.ok(JSON.stringify(run).length <= LOG_LIMITS.bytesPerGame);
  }
  assert.equal(JSON.stringify(g.study), study);
  assert.ok(!stored!.includes('"study"'));
  assert.ok(!stored!.includes('"history"'));
});
test("a run ending between periodic snapshots saves its final state without waiting for another simulation tick", async () => {
  let stored: string | null = null;
  const logs = new RunLogs({
      read: async () => stored,
      write: async (value) => {
        stored = value;
      },
    }),
    { g } = scene();
  logs.capture(g);
  g.time = 0.1;
  g.status = "dead";
  g.survivors[0].alive = false;
  logs.capture(g);
  await logs.flush();
  const saved = JSON.parse(stored!);
  assert.equal(saved.runs[0].entries.at(-1).data.status, "dead");
  assert.equal(saved.runs[0].entries.at(-1).data.actors[0].alive, false);
});
test("pruned diagnostic tails keep a compact whole-run outcome summary", () => {
  const { g } = scene(),
    logs = new RunLogs({ read: async () => null, write: async () => {} });
  for (let i = 0; i < 450; i++) {
    g.time = i;
    logs.record(g, "snapshot", { position: i });
  }
  g.time = 450;
  g.status = "dead";
  g.stats.deaths = 1;
  logs.capture(g, true);
  const run = logs.runs[0];
  assert.ok(run.entries.length <= LOG_LIMITS.entries);
  assert.equal(run.summary!.duration, 450);
  assert.equal(run.summary!.outcome, "dead");
  assert.equal(run.summary!.deaths, 1);
  assert.ok(run.summary!.snapshots >= 450);
  logs.record(g, "restart");
  assert.equal(run.summary!.outcome, "restarted");
});
test("corrupt diagnostic records are skipped individually and cannot poison the newest valid run", async () => {
  const { g } = scene(),
    original = new RunLogs({ read: async () => null, write: async () => {} });
  original.record(g, "first");
  const good = original.runs[0];
  const restored = new RunLogs({
    read: async () =>
      JSON.stringify({
        version: 1,
        runs: [
          null,
          {},
          good,
          {
            ...good,
            summary: { duration: "bad" },
            entries: [null, { at: 1, type: "valid", data: { x: 2 } }],
          },
        ],
      }),
    write: async () => {},
  });
  await restored.load();
  assert.equal(restored.runs.length, 1);
  assert.equal(restored.runs[0].entries[0].type, "valid");
  assert.equal(restored.runs[0].summary, undefined);
  restored.record(g, "after-load");
  assert.ok(Number.isFinite(restored.runs[0].summary!.duration));
});
test("diagnostic retention caps UTF-8 bytes, including multibyte data and an oversized newest entry", () => {
  const { g } = scene(),
    logs = new RunLogs({ read: async () => null, write: async () => {} });
  for (let i = 0; i < 150; i++)
    logs.record(g, "unicode", { i, text: "🧟".repeat(1000) });
  assert.ok(
    Buffer.byteLength(JSON.stringify(logs.runs[0])) <= LOG_LIMITS.bytesPerGame,
  );
  assert.ok(logs.runs[0].entries.length > 1);
  logs.record(g, "too-big", { text: "🧟".repeat(LOG_LIMITS.bytesPerGame) });
  assert.equal(logs.runs[0].entries.length, 0);
  logs.record(g, "new-tail");
  assert.equal(logs.runs[0].entries.length, 1);
});
test("slow diagnostic storage coalesces superseded snapshots while retaining ordered durable completion", async () => {
  const writes: string[] = [];
  let release!: () => void;
  const logs = new RunLogs({
      read: async () => null,
      write: async (value) => {
        writes.push(value);
        if (writes.length === 1)
          await new Promise<void>((resolve) => {
            release = resolve;
          });
      },
    }),
    { g } = scene();
  logs.record(g, "first");
  const first = logs.flush();
  await settle();
  const pending: Promise<void>[] = [];
  for (let i = 0; i < 100; i++) {
    logs.record(g, `event-${i}`);
    pending.push(logs.flush());
  }
  release();
  await first;
  await Promise.all(pending);
  assert.equal(writes.length, 2);
  assert.equal(JSON.parse(writes[1]).runs[0].entries.at(-1).type, "event-99");
});
