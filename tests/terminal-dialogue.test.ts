import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { checkBridge, ensureProblem, retryTutorRequest, send } from "../src/ai";
import type { Roadmap } from "../src/model";
import { createPlayableGame } from "../src/world";
import { decode, encode, recover } from "../src/persistence";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));
async function fixture(
  run: (
    g: any,
    e: any,
    calls: any[],
    reply: (fn: (p: any) => Promise<Response>) => void,
  ) => Promise<void>,
) {
  const original = globalThis.fetch;
  const calls: any[] = [];
  let connected = false;
  let respond = async (_p: any) =>
    Response.json({ text: "What changes?", complete: false });
  globalThis.fetch = async (url, init) => {
    if (String(url) === "/api/status")
      return Response.json({
        mode: connected ? "chatgpt-handoff" : "development",
        label: "Synthetic",
        detail: "No real AI",
        capabilities: connected ? ["tutor"] : [],
      });
    const p = JSON.parse(String(init?.body));
    calls.push(p);
    return respond(p);
  };
  try {
    await checkBridge();
    const g = createPlayableGame(717, r);
    const e = g.encounters[g.floors[0].stations[0].encounter];
    await ensureProblem(g, e, r);
    e.mode = "solo";
    e.owner = "human";
    connected = true;
    await checkBridge();
    await run(g, e, calls, (fn) => {
      respond = fn;
    });
  } finally {
    connected = false;
    await checkBridge();
    globalThis.fetch = original;
  }
}
test("one private @study conversation accumulates answers and awards one key only on explicit completion", async () =>
  fixture(async (g, e, calls, reply) => {
    const keys = g.survivors[0].keys ?? 0;
    await send(g, e, "tutor", "My initial prediction", r);
    assert.equal(e.submissions.length, 0);
    assert.equal(g.survivors[0].keys ?? 0, keys);
    reply(async () =>
      Response.json({
        text: "Solved: your explanation covers the rubric.",
        complete: true,
      }),
    );
    await send(g, e, "tutor", "My explanation and boundary", r);
    assert.equal(calls.length, 2);
    assert.ok(calls.every((c) => c.operation === "tutor"));
    for (const c of calls) {
      assert.ok(c.payload.prompt.startsWith("@study\n"));
      assert.equal(c.payload.studyPrompt, "@study");
      assert.equal(c.payload.mode, "terminal-dialogue");
      assert.deepEqual(c.payload.problem, e.problem);
      assert.ok(c.payload.curriculum.length > 100);
      assert.ok(c.payload.progressContext.length > 100);
    }
    assert.equal(calls[1].payload.messages.length, 3);
    assert.equal(calls[1].payload.messages[1].kind, "tutor");
    assert.equal(e.state, "consumed");
    assert.equal(g.survivors[0].keys, keys + 1);
    assert.ok(g.survivors[0].access.includes(e.floor));
    assert.equal(e.submissions.length, 1);
    assert.equal(e.submissions[0].status, "complete");
    assert.match(e.submissions[0].content, /initial prediction/);
    assert.doesNotMatch(e.submissions[0].content, /What changes/);
    const id = e.tutorRequests.at(-1).id;
    await retryTutorRequest(g, e, id, r);
    await send(g, e, "tutor", "Explain that again", r);
    assert.equal(g.survivors[0].keys, keys + 1);
    assert.equal(e.submissions.length, 1);
    assert.equal(
      g.study.visits.filter((v: any) => v.encounter === e.id).length <= 1,
      true,
    );
  }));
test("interrupted chat retries its exact captured context after reload and never awards on malformed or stale replies", async () =>
  fixture(async (g, e, calls, reply) => {
    reply(async () =>
      Response.json({ error: "Synthetic outage" }, { status: 503 }),
    );
    await send(g, e, "tutor", "Captured answer", r);
    assert.equal(e.tutorRequests[0].state, "interrupted");
    const loaded = recover(decode(encode(g))),
      resumed = loaded.encounters[e.id];
    reply(async () => Response.json({ text: "Almost", complete: "true" }));
    await retryTutorRequest(loaded, resumed, resumed.tutorRequests![0].id, r);
    assert.deepEqual(calls[0].payload, calls[1].payload);
    assert.equal(resumed.state !== "consumed", true);
    assert.match(resumed.tutorRequests![0].error!, /Invalid tutor/);
    reply(async () => {
      resumed.problem!.prompt += " CHANGED";
      return Response.json({ text: "Solved", complete: true });
    });
    await retryTutorRequest(loaded, resumed, resumed.tutorRequests![0].id, r);
    assert.equal(loaded.survivors[0].keys ?? 0, 0);
    assert.equal(resumed.submissions.length, 0);
    assert.match(resumed.tutorRequests![0].error!, /changed during review/);
  }));
test("pending turns coalesce, newer turns supersede interrupted checks, and a disconnected reply cannot award", async () =>
  fixture(async (g, e, calls, reply) => {
    let finish!: (r: Response) => void;
    reply(
      async () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
    const waiting = send(g, e, "tutor", "First answer", r);
    await send(g, e, "tutor", "Premature second answer", r);
    assert.equal(e.tutor.filter((m: any) => m.kind === "human").length, 1);
    assert.equal(calls.length, 1);
    finish(Response.json({ error: "outage" }, { status: 503 }));
    await waiting;
    const old = e.tutorRequests[0];
    reply(async () => Response.json({ text: "Keep going", complete: false }));
    await send(g, e, "tutor", "Revised answer", r);
    assert.equal(old.state, "superseded");
    await retryTutorRequest(g, e, old.id, r);
    assert.equal(calls.length, 2);
    reply(async () => {
      const current = globalThis.fetch;
      globalThis.fetch = async () =>
        Response.json({
          mode: "development",
          label: "Offline",
          detail: "Synthetic",
          capabilities: [],
        });
      await checkBridge();
      globalThis.fetch = current;
      return Response.json({ text: "Solved", complete: true });
    });
    await send(g, e, "tutor", "Final answer", r);
    assert.equal(e.state !== "consumed", true);
    assert.equal(g.survivors[0].keys ?? 0, 0);
  }));

test("dialogue clients reject missing completion decisions and changed captured work without silently applying a reply", async () =>
  fixture(async (g, e, calls, reply) => {
    reply(async () =>
      Response.json({ text: "This reply forgot its completion decision" }),
    );
    await send(g, e, "tutor", "A supported answer", r);
    assert.equal(e.tutorRequests[0].state, "interrupted");
    assert.equal(e.tutor.filter((m: any) => m.kind === "tutor").length, 0);
    assert.equal(e.submissions.length, 0);
    const request = e.tutorRequests[0];
    e.workspace = "Newer retained work";
    e.revision++;
    reply(async () => Response.json({ text: "Solved", complete: true }));
    const count = calls.length;
    await retryTutorRequest(g, e, request.id, r);
    assert.equal(
      calls.length,
      count,
      "outdated snapshots must be rejected before sending",
    );
    assert.equal(e.workspace, "Newer retained work");
    assert.equal(g.survivors[0].keys ?? 0, 0);
  }));
