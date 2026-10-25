import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BRIDGE_OUTAGE_GRACE_MS,
  bridgeRequest,
  checkBridge,
  nativeStudyScope,
  status,
} from "../src/bridge-client";
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

test("native routing scope stays outside frozen content and follows the archived run", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  const nativeScope = nativeStudyScope(
    { id: "new-run" },
    { id: "station-a", runId: "original-run", questionRoom: "room-one" },
  );
  assert.deepEqual(nativeScope, {
    runId: "original-run",
    encounterId: "station-a",
    questionRoom: "room-one",
  });
  assert.deepEqual(nativeStudyScope({ id: "new-run" }, { id: "station-b" }), {
    runId: "new-run",
    encounterId: "station-b",
  });
  const payload = { requestId: "captured", packet: { encounter: "station-a" } };
  const frozen = JSON.stringify(payload);
  for (const provider of ["chatgpt-handoff", "study-mode"]) {
    globalThis.fetch = async (url, init) => {
      if (url === "/api/status") return reply(provider);
      assert.equal(url, "/api/bridge");
      const body = JSON.parse(String(init?.body));
      assert.equal(JSON.stringify(body.payload), frozen);
      assert.deepEqual(
        body.nativeScope,
        provider === "chatgpt-handoff" ? nativeScope : undefined,
      );
      return Response.json({ accepted: true });
    };
    await checkBridge();
    assert.deepEqual(
      await bridgeRequest("assess", payload, undefined, { nativeScope }),
      { accepted: true },
    );
  }
  assert.equal(JSON.stringify(payload), frozen);
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

test("a queued request keeps waiting through a relay restart and only gives up after the grace period", async (t) => {
  const original = globalThis.fetch,
    originalNow = Date.now;
  t.after(() => {
    globalThis.fetch = original;
    Date.now = originalNow;
  });
  // Restart: a dropped connection, a proxy 502 and unparseable output, then the answer.
  const outage: (() => Promise<Response>)[] = [
    async () => Response.json({ status: "pending" }, { status: 202 }),
    async () => {
      throw TypeError("fetch failed");
    },
    async () => new Response("Bad gateway", { status: 502 }),
    async () => new Response("<html>", { status: 200 }),
    async () => Response.json({ text: "Back", complete: false }),
  ];
  let polls = 0;
  globalThis.fetch = async (url) => {
    if (url === "/api/status") return reply("chatgpt-handoff");
    if (url === "/api/bridge")
      return Response.json(
        { handoff: { id: "j", hash: "h" } },
        { status: 202 },
      );
    if (String(url).startsWith("/api/handoff/status"))
      return Response.json({
        public: { terminalRelay: { activeSessions: 1 } },
      });
    return outage[polls++]();
  };
  await checkBridge();
  assert.deepEqual(await bridgeRequest("tutor", { question: "q" }), {
    text: "Back",
    complete: false,
  });
  assert.equal(polls, outage.length);

  // A relay that never comes back fails once the grace period has passed.
  let now = 1_000_000;
  Date.now = () => now;
  globalThis.fetch = async (url) => {
    if (url === "/api/status") return reply("chatgpt-handoff");
    if (url === "/api/bridge")
      return Response.json(
        { handoff: { id: "j", hash: "h" } },
        { status: 202 },
      );
    now += BRIDGE_OUTAGE_GRACE_MS / 2 + 1;
    throw TypeError("fetch failed");
  };
  await assert.rejects(
    bridgeRequest("tutor", { question: "q" }),
    /stopped answering; your exact request is saved/,
  );
});

test("a closed study session stops renewing its queued relay job", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  let active = true;
  let polls = 0;
  globalThis.fetch = async (url) => {
    if (url === "/api/status") return reply("chatgpt-handoff");
    if (String(url).startsWith("/api/bridge/result")) {
      polls++;
      return Response.json({ status: "pending" }, { status: 202 });
    }
    active = false;
    return Response.json(
      { handoff: { id: "closed", hash: "captured" } },
      { status: 202 },
    );
  };
  await checkBridge();
  await assert.rejects(
    bridgeRequest("tutor", { requestId: "closed" }, undefined, {
      isActive: () => active,
    }),
    /session closed/,
  );
  assert.equal(polls, 0);
});

test("malformed relay metadata cannot claim an active study listener", async () => {
  const { relayServes } = await import("../src/bridge-client");
  for (const info of [
    null,
    [],
    { public: { terminalRelay: { activeSessions: "2" } } },
    { public: { terminalRelay: { activeSessions: Infinity } } },
    { public: { terminalRelay: { activeSessions: true } } },
  ])
    assert.equal(relayServes(info), false);
  assert.equal(
    relayServes({ public: { terminalRelay: { sessions: 2 } } }),
    true,
  );
  assert.equal(relayServes({ public: { workerActive: true } }), true);
});

test("invalid bridge response bodies report a protocol error instead of a property access failure", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  for (const body of [null, [], "invalid"]) {
    globalThis.fetch = async (url) =>
      url === "/api/status"
        ? reply("chatgpt-handoff")
        : Response.json(body, { status: 202 });
    await checkBridge();
    await assert.rejects(
      bridgeRequest("tutor", {}),
      /Invalid queued bridge receipt|Malformed bridge response/,
    );
  }
});

test("a session already closed before submission never releases a bridge request", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json({});
  };
  await assert.rejects(
    bridgeRequest("tutor", {}, undefined, { isActive: () => false }),
    /session closed/,
  );
  assert.equal(calls, 0);
});

test("successful non-JSON replies reject while HTTP errors preserve the bridge's message", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async () => new Response("<html>Proxy page</html>");
  await assert.rejects(bridgeRequest("tutor", {}), /Malformed bridge response/);
  globalThis.fetch = async () =>
    new Response("Synthetic service failure", { status: 503 });
  await assert.rejects(
    bridgeRequest("tutor", {}),
    /study bridge is not running/,
  );
  globalThis.fetch = async () =>
    new Response("Synthetic request refusal", { status: 400 });
  await assert.rejects(bridgeRequest("tutor", {}), /Synthetic request refusal/);
});

test("hung result polls have a short deadline and exhaust the outage grace instead of waiting for the whole conversation budget", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalTimeout = AbortSignal.timeout;
  const originalNow = Date.now;
  t.after(() => {
    globalThis.fetch = originalFetch;
    AbortSignal.timeout = originalTimeout;
    Date.now = originalNow;
  });
  let now = 1000,
    polls = 0;
  Date.now = () => now;
  AbortSignal.timeout = (ms) => originalTimeout(ms === 5000 ? 10 : ms);
  globalThis.fetch = async (url, init) => {
    if (url === "/api/status") return reply("chatgpt-handoff");
    if (url === "/api/bridge")
      return Response.json(
        { handoff: { id: "hung", hash: "saved" } },
        { status: 202 },
      );
    polls++;
    return new Promise<Response>((_resolve, reject) => {
      init!.signal!.addEventListener(
        "abort",
        () => {
          now += BRIDGE_OUTAGE_GRACE_MS + 1;
          reject(init!.signal!.reason);
        },
        { once: true },
      );
    });
  };
  await checkBridge();
  await assert.rejects(bridgeRequest("tutor", {}), /stopped answering/);
  assert.equal(polls, 2);
});
