// Isolated real loopback transport with synthetic credentials; never the user's relay.
import assert from "node:assert/strict";
// @ts-expect-error Actual relay module is intentionally plain JavaScript.
import { createHandoffQueue } from "../../scripts/chatgpt-handoff-queue.mjs";
// @ts-expect-error Actual relay module is intentionally plain JavaScript.
import { createHandoffRoutes } from "../../scripts/chatgpt-handoff-routes.mjs";
// @ts-expect-error Actual relay module is intentionally plain JavaScript.
import { createStudyBridgeServer } from "../../scripts/study-bridge-server.mjs";

export async function localHandoff() {
  const queue = createHandoffQueue(),
    server = createStudyBridgeServer({
      handoff: createHandoffRoutes(queue, {
        token: "synthetic-optional-token",
      }),
    });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const post = (path: string, body: unknown, worker = false) =>
    fetch(base + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(worker
          ? { Authorization: "Bearer synthetic-optional-token" }
          : { Origin: "http://127.0.0.1:5173" }),
      },
      body: JSON.stringify(body),
    });
  queue.enable(true);
  return {
    base,
    queue,
    async request(
      operation: string,
      payload: unknown,
      answer: (job: any) => { valid: unknown; invalid?: unknown[] },
    ) {
      const queued = await post("/api/bridge", { operation, payload });
      assert.equal(queued.status, 202);
      const { handoff: receipt } = await queued.json();
      const get = () =>
        post(
          "/api/handoff/worker",
          { action: "get", worker: "synthetic-optional-worker" },
          true,
        );
      const job = await (await get()).json();
      assert.equal(job.operation, operation);
      assert.deepEqual(job.payload, JSON.parse(JSON.stringify(payload)));
      const reply = answer(job);
      for (const invalid of reply.invalid ?? []) {
        assert.equal(
          (
            await post(
              "/api/handoff/worker",
              {
                action: "submit",
                worker: "synthetic-optional-worker",
                jobId: job.jobId,
                claim: job.claim,
                answer: invalid,
              },
              true,
            )
          ).status,
          409,
        );
        const same = await (await get()).json();
        assert.equal(same.claim, job.claim);
        assert.equal(same.jobId, job.jobId);
      }
      assert.equal(
        (
          await post(
            "/api/handoff/worker",
            {
              action: "submit",
              worker: "synthetic-optional-worker",
              jobId: job.jobId,
              claim: job.claim,
              answer: reply.valid,
            },
            true,
          )
        ).status,
        200,
      );
      const result = await fetch(
        `${base}/api/bridge/result?id=${receipt.id}&hash=${receipt.hash}`,
      );
      assert.equal(result.status, 200);
      return result.json();
    },
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(resolve));
    },
  };
}
