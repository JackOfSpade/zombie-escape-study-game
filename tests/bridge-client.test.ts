import assert from "node:assert/strict";
import { test } from "node:test";
import { bridgeRequest, checkBridge, status } from "../src/bridge-client";
const reply = (mode = "study-mode") =>
  Response.json({
    mode,
    label: "Synthetic bridge",
    capabilities: ["generate"],
    detail: "Local fixture only",
  });
test("overlapping bridge checks cannot let an old failure replace a newer connection", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  let fail!: (error: Error) => void,
    calls = 0;
  globalThis.fetch = async (_url, init) => {
    assert.ok(init?.signal instanceof AbortSignal);
    if (calls++ === 0)
      return new Promise<Response>((_resolve, reject) => {
        fail = reject;
      });
    return reply();
  };
  const older = checkBridge();
  await checkBridge();
  fail(Error("Old request failed"));
  await older;
  assert.equal(status().mode, "study-mode");
});
test("malformed bridge capabilities fail closed without retaining a native identity", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  for (const body of [
    null,
    {},
    { mode: "study-mode", label: "fake", detail: "bad", capabilities: [42] },
  ]) {
    globalThis.fetch = async () => Response.json(body);
    await checkBridge();
    assert.equal(status().mode, "development");
  }
});
test("queued bridge transport preserves the original provider and receipt when connection status changes", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  let mode = "chatgpt-handoff",
    requests = 0;
  globalThis.fetch = async (url, init) => {
    if (url === "/api/status") return reply(mode);
    if (url === "/api/bridge") {
      assert.deepEqual(JSON.parse(String(init?.body)), {
        operation: "tutor",
        payload: { question: "fictional" },
        provider: "chatgpt-handoff",
      });
      mode = "development";
      return Response.json(
        { handoff: { id: "id /#", hash: "hash ?/#" } },
        { status: 202 },
      );
    }
    const query = new URL(String(url), "http://fixture").searchParams;
    assert.equal(query.get("id"), "id /#");
    assert.equal(query.get("hash"), "hash ?/#");
    requests++;
    return Response.json({ answer: "fixture reply" });
  };
  await checkBridge();
  const pending = bridgeRequest("tutor", { question: "fictional" });
  await checkBridge();
  assert.deepEqual(await pending, { answer: "fixture reply" });
  assert.equal(requests, 1);
  assert.equal(status().mode, "development");
});

test("queued tutor progress distinguishes an unclaimed request from worker pickup without changing the frozen request", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  const progress: string[] = [];
  let polls = 0;
  let health = 0;
  const captured = {
    requestId: "synthetic-phase-check",
    prompt: "@study\nSynthetic",
  };
  globalThis.fetch = async (url, init) => {
    if (url === "/api/status") return reply("chatgpt-handoff");
    if (url === "/api/bridge") {
      assert.deepEqual(JSON.parse(String(init?.body)).payload, captured);
      return Response.json(
        { handoff: { id: "phase-job", hash: "phase-hash" } },
        { status: 202 },
      );
    }
    if (url === "/api/handoff/status") {
      health++;
      return Response.json({
        recent: [{ id: "phase-job", status: "working" }],
      });
    }
    const query = new URL(String(url), "http://synthetic").searchParams;
    assert.equal(query.get("id"), "phase-job");
    assert.equal(query.get("hash"), "phase-hash");
    return ++polls === 1
      ? Response.json({ status: "pending" }, { status: 202 })
      : Response.json({ text: "Synthetic follow-up", complete: false });
  };
  await checkBridge();
  assert.deepEqual(
    await bridgeRequest("tutor", captured, (p) => progress.push(p)),
    { text: "Synthetic follow-up", complete: false },
  );
  assert.deepEqual(progress, ["queued", "working"]);
  assert.equal(health, 1);
});
