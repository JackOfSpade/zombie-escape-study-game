import { readFileSync } from "node:fs";
import { expect, test, type Page } from "./helpers/offline-test";

const harbor = JSON.parse(
  readFileSync("tests/fixtures/run-designs/harbor-archive.json", "utf8"),
);
const orchard = JSON.parse(
  readFileSync("tests/fixtures/run-designs/glass-orchard.json", "utf8"),
);

async function designer(page: Page) {
  const calls: any[] = [],
    cancelled: string[] = [],
    delivered: string[] = [],
    results = new Map<string, object>(),
    pending = new Map<string, (design: object) => void>();
  let capable = true,
    queued = false,
    delayed = false,
    failedPoll = false;
  let answer = (_body: any) => harbor;
  await page.addInitScript(() => {
    const random = crypto.getRandomValues.bind(crypto);
    Object.defineProperty(crypto, "getRandomValues", {
      value(array: any) {
        if (array instanceof Uint32Array && array.length === 1) {
          array[0] = 42;
          return array;
        }
        return random(array);
      },
    });
  });
  await page.route("**/api/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (url.pathname === "/api/status")
      return json({
        mode: capable ? "chatgpt-handoff" : "development",
        label: "Synthetic run designer",
        detail: "Offline browser fixture; no external model",
        capabilities: capable ? ["design-run"] : [],
      });
    if (url.pathname === "/api/handoff/status")
      return json({
        enabled: capable,
        queued: calls.length,
        working: 0,
        done: results.size,
        public: {
          configured: false,
          workerActive: false,
          terminalRelay: { activeSessions: 0 },
        },
        recent: calls.map((c) => ({
          id: c.payload.requestId,
          status: results.has(c.payload.requestId) ? "done" : "queued",
        })),
      });
    if (url.pathname === "/api/bridge" && request.method() === "POST") {
      const body = request.postDataJSON();
      if (body.operation !== "design-run")
        return json({ error: "Unexpected synthetic operation" }, 400);
      calls.push(body);
      const id = body.payload.requestId;
      if (delayed) {
        const design = await new Promise<object>((resolve) =>
          pending.set(id, resolve),
        );
        await json({ requestId: id, design });
        delivered.push(id);
        return;
      }
      return queued
        ? json({ handoff: { id, hash: `synthetic-${id}` } }, 202)
        : json({ requestId: id, design: answer(body) });
    }
    if (url.pathname === "/api/bridge/result") {
      const id = url.searchParams.get("id")!;
      if (request.method() === "DELETE") {
        cancelled.push(id);
        return json({ cancelled: true });
      }
      if (failedPoll)
        return json({ error: "Synthetic design request interrupted" }, 409);
      return results.has(id)
        ? json(results.get(id))
        : json({ handoff: { id, status: "queued" } }, 202);
    }
    return json({ error: "No synthetic route" }, 404);
  });
  return {
    calls,
    cancelled,
    delivered,
    setCapable(value: boolean) {
      capable = value;
    },
    setQueued(value: boolean) {
      queued = value;
    },
    setDelayed(value: boolean) {
      delayed = value;
    },
    setFailedPoll(value: boolean) {
      failedPoll = value;
    },
    setAnswer(value: (body: any) => any) {
      answer = value;
    },
    finish(call: any, design = harbor) {
      const waiting = pending.get(call.payload.requestId);
      if (waiting) {
        pending.delete(call.payload.requestId);
        waiting(design);
        return;
      }
      results.set(call.payload.requestId, {
        requestId: call.payload.requestId,
        design,
      });
    },
  };
}

async function open(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => !!(window as any).__deadAir);
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    g.settings.view = "top-down";
    g.settings.volume = 0;
  });
}
async function state(page: Page) {
  return page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    return {
      id: g.id,
      seed: g.seed,
      status: g.status,
      preparing: !!g.preparingRun,
      design: g.design,
      floorNames: g.floors.map((f: any) => f.name),
      tiles: g.floors.map((f: any) => f.tiles),
      names: g.survivors.slice(1).map((a: any) => a.name),
    };
  });
}
async function flush(page: Page) {
  await page.evaluate(async () => {
    const { flushSaves } = await import("/src/persistence.ts" as string);
    await flushSaves();
  });
}
async function pause(page: Page) {
  await page.locator("#pause-toggle").click();
  await expect(page.locator("#pause-menu")).toBeVisible();
  await flush(page);
}

test("new-game AI design reaches the full app and a saved reload keeps the exact authored world", async ({
  page,
}) => {
  const relay = await designer(page);
  await open(page);
  expect((await state(page)).preparing).toBe(true);
  await page.locator("#start").click();
  await expect.poll(async () => (await state(page)).status).toBe("playing");
  await pause(page);
  const before = await state(page);
  expect(relay.calls).toHaveLength(1);
  expect(relay.calls[0].provider).toBe("chatgpt-handoff");
  expect(relay.calls[0].nativeScope.encounterId).toBe("run-design");
  expect(before.design.design.title).toBe(harbor.title);
  expect(before.floorNames).toEqual([
    ...harbor.floors.map((f: any) => f.name),
    harbor.roofName,
  ]);
  expect(before.names).toEqual(harbor.roster.map((a: any) => a.name));
  expect(before.preparing).toBe(false);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("dead-air-run-design-draft-v1"),
    ),
  ).toBeNull();
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__deadAir);
  const restored = await state(page);
  expect(restored.id).toBe(before.id);
  expect(restored.design).toEqual(before.design);
  expect(restored.tiles).toEqual(before.tiles);
  expect(restored.floorNames).toEqual(before.floorNames);
  expect(restored.names).toEqual(before.names);
  expect(relay.calls).toHaveLength(1);
  await expect(page.locator("#run-design-dialog")).toHaveCount(0);
});

test("an offline designer keeps the current game intact until explicit procedural fallback", async ({
  page,
}) => {
  const relay = await designer(page);
  relay.setCapable(false);
  await open(page);
  const before = await state(page);
  await page.locator("#start").click();
  await expect(page.locator("#run-design-status")).toContainText("unavailable");
  expect((await state(page)).id).toBe(before.id);
  expect((await state(page)).status).toBe("ready");
  await page.locator("#run-design-cancel").click();
  await expect(page.locator("#run-design-dialog")).toHaveCount(0);
  expect(await state(page)).toEqual(before);
  await page.locator("#start").click();
  await expect(page.locator("#run-design-status")).toContainText("unavailable");
  await page.locator("#run-design-procedural").click();
  await expect.poll(async () => (await state(page)).status).toBe("playing");
  const after = await state(page);
  expect(after.id).not.toBe(before.id);
  expect(after.preparing).toBe(false);
  expect(after.design).toBeUndefined();
  expect(relay.calls).toHaveLength(0);
});

test("reloading a pending design retries the same captured request and chat rather than rerolling", async ({
  page,
}) => {
  const relay = await designer(page);
  relay.setQueued(true);
  await open(page);
  const originalId = (await state(page)).id;
  await page.locator("#start").click();
  await expect.poll(() => relay.calls.length).toBe(1);
  await expect(page.locator("#run-design-status")).toContainText(
    "Waiting for ChatGPT",
  );
  await page.screenshot({
    path: ".artifacts/handoff/design/ai-design-waiting.png",
  });
  await flush(page);
  const first = structuredClone(relay.calls[0]);
  expect(first.chatCode).toMatch(/^[A-Z0-9]{8}$/);
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__deadAir);
  expect((await state(page)).id).toBe(originalId);
  await page.locator("#start").click();
  await expect.poll(() => relay.calls.length).toBe(2);
  expect(relay.calls[1]).toEqual(first);
  relay.finish(first);
  await expect
    .poll(async () => (await state(page)).design?.design.title)
    .toBe(harbor.title);
  expect(relay.calls).toHaveLength(2);
});

test("restart sends recent fictional designs and repairs a repeated design before replacing the run", async ({
  page,
}) => {
  const relay = await designer(page);
  relay.setAnswer((body) => (body.payload.repair ? orchard : harbor));
  await open(page);
  await page.locator("#start").click();
  await expect.poll(async () => (await state(page)).status).toBe("playing");
  const before = await state(page);
  await pause(page);
  await page.locator("#restart-game").click();
  await expect
    .poll(async () => (await state(page)).design?.design.title)
    .toBe(orchard.title);
  const after = await state(page);
  expect(after.id).not.toBe(before.id);
  expect(after.tiles).not.toEqual(before.tiles);
  expect(relay.calls).toHaveLength(3);
  const repeat = relay.calls[1],
    repair = relay.calls[2];
  expect(repeat.payload.recent[0].title).toBe(harbor.title);
  expect(repair.payload.repair.candidate.title).toBe(harbor.title);
  expect(repair.payload.repair.errors.length).toBeGreaterThan(0);
  expect(repair.payload.generationId).toBe(repeat.payload.generationId);
  expect(repair.payload.requestId).not.toBe(repeat.payload.requestId);
  expect(repair.chatCode).toBe(repeat.chatCode);
  expect(Object.keys(repeat.payload).sort()).toEqual([
    "generationId",
    "recent",
    "requestId",
    "seed",
    "version",
  ]);
});

test("a late result from a cancelled design cannot replace the current run or the next design", async ({
  page,
}) => {
  const relay = await designer(page);
  relay.setQueued(true);
  await open(page);
  const before = await state(page);
  await page.locator("#start").click();
  await expect.poll(() => relay.calls.length).toBe(1);
  const cancelled = relay.calls[0];
  await page.locator("#run-design-cancel").click();
  await expect(page.locator("#run-design-dialog")).toHaveCount(0);
  await expect
    .poll(() => relay.cancelled)
    .toContain(cancelled.payload.requestId);
  relay.finish(cancelled, harbor);
  expect(await state(page)).toEqual(before);
  await page.locator("#start").click();
  await expect.poll(() => relay.calls.length).toBe(2);
  const current = relay.calls[1];
  expect(current.payload.requestId).not.toBe(cancelled.payload.requestId);
  expect(current.chatCode).not.toBe(cancelled.chatCode);
  relay.finish(current, orchard);
  await expect
    .poll(async () => (await state(page)).design?.design.title)
    .toBe(orchard.title);
  expect((await state(page)).design.requestId).toBe(current.payload.requestId);
});

test("cancelling before the bridge replies ignores that delayed reply while another design is pending", async ({
  page,
}) => {
  const relay = await designer(page);
  relay.setDelayed(true);
  await open(page);
  const before = await state(page);
  await page.locator("#start").click();
  await expect.poll(() => relay.calls.length).toBe(1);
  const cancelled = relay.calls[0];
  await page.locator("#run-design-cancel").click();
  await expect(page.locator("#run-design-dialog")).toHaveCount(0);
  expect(await state(page)).toEqual(before);
  await page.locator("#start").click();
  await expect.poll(() => relay.calls.length).toBe(2);
  const current = relay.calls[1];
  relay.finish(cancelled, harbor);
  await expect
    .poll(() => relay.delivered)
    .toContain(cancelled.payload.requestId);
  await expect(page.locator("#run-design-dialog")).toBeVisible();
  expect(await state(page)).toEqual(before);
  relay.finish(current, orchard);
  await expect
    .poll(async () => (await state(page)).design?.design.title)
    .toBe(orchard.title);
  expect((await state(page)).design.requestId).toBe(current.payload.requestId);
});

test("settled design failures retain receipts until Cancel, Escape or explicit procedural fallback", async ({
  page,
}) => {
  const relay = await designer(page);
  relay.setQueued(true);
  relay.setFailedPoll(true);
  await open(page);
  const before = await state(page);
  for (const dismissal of ["cancel", "escape", "procedural"]) {
    await page.locator("#start").click();
    await expect(page.locator("#run-design-status")).toContainText(
      "Synthetic design request interrupted",
    );
    await expect(page.locator("#run-design-retry")).toBeEnabled();
    const call = relay.calls.at(-1)!;
    expect(relay.cancelled).not.toContain(call.payload.requestId);
    const receipt = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("dead-air-run-design-draft-v1")!)
          .receipt,
    );
    expect(receipt.requestId).toBe(call.payload.requestId);
    if (dismissal === "escape") await page.keyboard.press("Escape");
    else await page.locator(`#run-design-${dismissal}`).click();
    await expect(page.locator("#run-design-dialog")).toHaveCount(0);
    await expect.poll(() => relay.cancelled).toContain(call.payload.requestId);
    expect(
      await page.evaluate(() =>
        localStorage.getItem("dead-air-run-design-draft-v1"),
      ),
    ).toBeNull();
    if (dismissal !== "procedural") expect(await state(page)).toEqual(before);
  }
  await expect.poll(async () => (await state(page)).status).toBe("playing");
  const after = await state(page);
  expect(after.id).not.toBe(before.id);
  expect(after.design).toBeUndefined();
});
