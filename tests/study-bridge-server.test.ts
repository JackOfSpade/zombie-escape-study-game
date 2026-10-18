// Actual HTTP relay, synthetic provider. This verifies transport, never native Study Mode identity.
import assert from "node:assert/strict";
import { createServer, request, type Server } from "node:http";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
// @ts-expect-error Local .mjs server is exercised directly without a declaration shim.
import { createStudyBridgeServer } from "../scripts/study-bridge-server.mjs";

async function listen(server: Server) {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  assert.ok(addr && typeof addr !== "string");
  return `http://127.0.0.1:${addr.port}/`;
}
async function close(server: Server) {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
test("actual relay forwards complete reconciliation files with configured auth and rejects cross-origin or unknown operations", async () => {
  const calls: { path: string; auth?: string; body: string }[] = [];
  let malformed = false;
  const capabilities = [
    "generate",
    "tutor",
    "complete",
    "assess",
    "group",
    "reconcile-roadmap",
  ];
  const provider = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    calls.push({ path: req.url!, auth: req.headers.authorization, body });
    if (malformed) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<html>Temporary provider error</html>");
      return;
    }
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify(
        req.url === "/capabilities"
          ? { mode: "study-mode", capabilities }
          : {
              requestId: "synthetic-transport",
              canonical: JSON.parse(body).candidate,
            },
      ),
    );
  });
  const endpoint = await listen(provider);
  const relay = createStudyBridgeServer({
    endpoint,
    key: "synthetic-test-token",
  });
  const base = await listen(relay);
  try {
    const status = await (await fetch(base + "api/status")).json();
    assert.equal(status.mode, "study-mode");
    assert.ok(status.capabilities.includes("reconcile-roadmap"));
    assert.match(status.detail, /identity must be verified/);
    // Exceeds the old 1.5 MB route cap, within the complete-document context limit.
    const candidate = "Untrusted source data only. ".repeat(65_000);
    const payload = {
      requestId: "synthetic-transport",
      local: "original",
      candidate,
    };
    const response = await fetch(base + "api/bridge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://127.0.0.1:5173",
      },
      body: JSON.stringify({ operation: "reconcile-roadmap", payload }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      requestId: payload.requestId,
      canonical: candidate,
    });
    assert.equal(calls[1].path, "/reconcile-roadmap");
    assert.equal(calls[1].auth, "Bearer synthetic-test-token");
    assert.deepEqual(JSON.parse(calls[1].body), payload);
    const count = calls.length;
    for (const [origin, operation, expected] of [
      ["https://untrusted.invalid", "reconcile-roadmap", 403],
      ["http://127.0.0.1:5173", "unrecognized-operation", 400],
    ] as const) {
      const result = await fetch(base + "api/bridge", {
        method: "POST",
        headers: { Origin: origin },
        body: JSON.stringify({ operation, payload }),
      });
      assert.equal(result.status, expected);
    }
    assert.equal(calls.length, count);
    malformed = true;
    const failed = await fetch(base + "api/bridge", {
      method: "POST",
      body: JSON.stringify({ operation: "reconcile-roadmap", payload }),
    });
    assert.equal(failed.status, 502);
    assert.match((await failed.json()).error, /SyntaxError/);
    malformed = false;
    // A malformed provider response cannot take down the local relay.
    assert.equal(
      (await (await fetch(base + "api/status")).json()).mode,
      "study-mode",
    );
  } finally {
    await close(relay);
    await close(provider);
  }
});
test("actual relay preserves UTF-8 split across network chunks and bounds incoming bytes", async () => {
  const received: unknown[] = [];
  const provider = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk);
    const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    received.push(payload);
    res.end(JSON.stringify(payload));
  });
  const relay = createStudyBridgeServer({ endpoint: await listen(provider) });
  const base = await listen(relay);
  try {
    const payload = { candidate: "中文 🧟 café — exact source" };
    const bytes = Buffer.from(
      JSON.stringify({ operation: "reconcile-roadmap", payload }),
    );
    // End actual HTTP writes inside both a three-byte and a four-byte character.
    const cuts = [
      bytes.indexOf(Buffer.from("中")) + 1,
      bytes.indexOf(Buffer.from("🧟")) + 2,
    ];
    const response = await new Promise<{ status: number; body: string }>(
      (resolve, reject) => {
        const req = request(base + "api/bridge", { method: "POST" }, (res) => {
          res.setEncoding("utf8");
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => resolve({ status: res.statusCode!, body }));
          res.on("error", reject);
        });
        req.on("error", reject);
        void (async () => {
          req.write(bytes.subarray(0, cuts[0]));
          await delay(20);
          req.write(bytes.subarray(cuts[0], cuts[1]));
          await delay(20);
          req.end(bytes.subarray(cuts[1]));
        })().catch(reject);
      },
    );
    assert.equal(response.status, 200);
    assert.deepEqual(JSON.parse(response.body), payload);
    assert.deepEqual(received, [payload]);
    // Fewer than six million JS characters, but more than six million UTF-8 bytes.
    const oversized = await fetch(base + "api/bridge", {
      method: "POST",
      body: JSON.stringify({
        operation: "reconcile-roadmap",
        payload: "中".repeat(2_000_000),
      }),
    });
    assert.equal(oversized.status, 413);
    assert.match((await oversized.json()).error, /Request too large/);
    assert.equal(received.length, 1);
  } finally {
    await close(relay);
    await close(provider);
  }
});
test("actual relay without a configured provider reports development and never accepts native reconciliation", async () => {
  const relay = createStudyBridgeServer(),
    base = await listen(relay);
  try {
    const status = await (await fetch(base + "api/status")).json();
    assert.equal(status.mode, "development");
    assert.deepEqual(status.capabilities, []);
    const result = await fetch(base + "api/bridge", {
      method: "POST",
      body: JSON.stringify({ operation: "reconcile-roadmap", payload: {} }),
    });
    assert.equal(result.status, 503);
  } finally {
    await close(relay);
  }
});

// @ts-expect-error Actual handoff module is intentionally plain JavaScript.
import { createHandoffQueue } from "../scripts/chatgpt-handoff-queue.mjs";
// @ts-expect-error Actual handoff module is intentionally plain JavaScript.
import { createHandoffRoutes } from "../scripts/chatgpt-handoff-routes.mjs";
test("relay rejects stale or unknown captured providers before enqueueing or forwarding private packets, including legacy optional native jobs", async () => {
  let calls = 0;
  const upstream = createServer(async (req, res) => {
    for await (const _ of req) {
    }
    calls++;
    res.end(JSON.stringify({ text: "synthetic" }));
  });
  const endpoint = await listen(upstream),
    queue = createHandoffQueue();
  const relay = createStudyBridgeServer({
      endpoint,
      handoff: createHandoffRoutes(queue, { token: "synthetic-routing-token" }),
    }),
    base = await listen(relay);
  const post = (operation: string, payload: unknown) =>
    fetch(base + "api/bridge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://127.0.0.1:5173",
      },
      body: JSON.stringify({ operation, payload }),
    });
  const operations = [
    "materialize-work",
    "materialize-outcome",
    "review-environment",
    "group",
    "complete",
  ];
  const body = (operation: string, provider?: string) => ({
    requestId: `synthetic-${operation}`,
    ...(provider ? { provider } : {}),
    mode:
      operation === "group"
        ? "catch-up"
        : operation === "complete"
          ? "retrospective-npc-outcome"
          : undefined,
  });
  try {
    for (const operation of operations) {
      assert.equal(
        (await post(operation, body(operation, "chatgpt-handoff"))).status,
        409,
      );
      assert.equal(
        (await post(operation, body(operation, "untrusted"))).status,
        409,
      );
    }
    assert.equal(calls, 0);
    const envelope = (provider: string) =>
      fetch(base + "api/bridge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://127.0.0.1:5173",
        },
        body: JSON.stringify({
          operation: "tutor",
          provider,
          payload: {
            requestId: "synthetic-legacy-private",
            text: "PRIVATE_ENVELOPE_FIXTURE",
          },
        }),
      });
    assert.equal((await envelope("chatgpt-handoff")).status, 409);
    assert.equal(calls, 0);
    queue.enable(true);
    assert.equal((await envelope("study-mode")).status, 409);
    assert.equal((await envelope("development")).status, 409);
    assert.equal(queue.snapshot().queued, 0);
    for (const operation of operations) {
      assert.equal((await post(operation, body(operation))).status, 409);
      assert.equal(
        (await post(operation, body(operation, "study-mode"))).status,
        409,
      );
      assert.equal(
        (await post(operation, body(operation, "untrusted"))).status,
        409,
      );
    }
    assert.equal(queue.snapshot().queued, 0);
    assert.equal(calls, 0);
    assert.equal(
      (
        await post(
          "review-environment",
          body("review-environment", "chatgpt-handoff"),
        )
      ).status,
      202,
    );
    assert.equal(queue.snapshot().queued, 1);
    queue.enable(false);
    assert.equal(
      (
        await post(
          "review-environment",
          body("review-environment", "study-mode"),
        )
      ).status,
      200,
    );
    assert.equal(calls, 1);
    assert.equal(
      (await post("review-environment", body("review-environment"))).status,
      200,
    );
    assert.equal(
      calls,
      2,
      "Legacy native body still reaches only its original route",
    );
  } finally {
    await close(relay);
    await close(upstream);
  }
});
