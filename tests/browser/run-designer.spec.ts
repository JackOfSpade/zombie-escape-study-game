import { readFileSync } from "node:fs";
import { expect, test, type Page } from "./helpers/offline-test";

const harbor = JSON.parse(
  readFileSync("tests/fixtures/run-designs/harbor-inscriptions.json", "utf8"),
);
const orchard = JSON.parse(
  readFileSync(
    "tests/fixtures/run-designs/observatory-inscriptions.json",
    "utf8",
  ),
);

async function designer(page: Page) {
  const calls: any[] = [],
    cancelled: string[] = [],
    delivered: string[] = [],
    results = new Map<string, object>(),
    pending = new Map<string, (design: object) => void>();
  let capable = true,
    queued = false,
    queuedPhase: "structure" | "content" = "structure",
    delayed = false,
    failedPoll = false;
  let answer = (_body: any) => harbor;
  const reply = (body: any, proposed: any) => {
    const requestId = body.payload.requestId;
    if (body.payload.phase === "structure") {
      const { environment: _environment, ...structure } = proposed;
      return { requestId, structure };
    }
    const design = [proposed, harbor, orchard].find(
      (d) => d.title === body.payload.structure.title,
    );
    if (!design)
      throw Error("No captured synthetic content for this structure");
    const { surfaces: _surfaces, ...content } = design.environment;
    return { requestId, content };
  };
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
      if (delayed && body.payload.phase === "structure") {
        const design = await new Promise<object>((resolve) =>
          pending.set(id, resolve),
        );
        await json(reply(body, design));
        delivered.push(id);
        return;
      }
      return queued && body.payload.phase === queuedPhase
        ? json({ handoff: { id, hash: `synthetic-${id}` } }, 202)
        : json(reply(body, answer(body)));
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
    setQueued(value: boolean, phase: "structure" | "content" = "structure") {
      queued = value;
      queuedPhase = phase;
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
      results.set(call.payload.requestId, reply(call, design));
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
      scenes: g.floors.map((f: any) => f.scene),
      environments: g.floors.map((f: any) => f.environment),
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
  expect(relay.calls).toHaveLength(2);
  expect(relay.calls[0].provider).toBe("chatgpt-handoff");
  expect(relay.calls[0].payload.designVersion).toBe(3);
  expect(relay.calls.map((c) => c.payload.phase)).toEqual([
    "structure",
    "content",
  ]);
  expect(before.design.design.version).toBe(3);
  expect(before.environments[0].entries.length).toBeGreaterThan(50);
  expect(before.scenes[0].props.length).toBeGreaterThan(0);
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
  expect(restored.environments).toEqual(before.environments);
  expect(relay.calls).toHaveLength(2);
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
  expect(relay.calls).toHaveLength(3);
});

test("reloading while individual writing is pending retains the exact object inventory and content request", async ({
  page,
}) => {
  const relay = await designer(page);
  relay.setQueued(true, "content");
  await open(page);
  const original = await state(page);
  await page.locator("#start").click();
  await expect.poll(() => relay.calls.length).toBe(2);
  const captured = structuredClone(relay.calls[1]);
  expect(captured.payload.phase).toBe("content");
  expect(captured.payload.surfaces).toEqual(harbor.environment.surfaces);
  expect((await state(page)).id).toBe(original.id);
  await flush(page);
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__deadAir);
  await page.locator("#start").click();
  await expect.poll(() => relay.calls.length).toBe(3);
  expect(relay.calls[2]).toEqual(captured);
  expect((await state(page)).id).toBe(original.id);
  relay.finish(captured);
  await expect.poll(async () => (await state(page)).status).toBe("playing");
  expect((await state(page)).design.design.environment).toEqual(
    harbor.environment,
  );
  expect(relay.calls).toHaveLength(3);
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
  expect(relay.calls).toHaveLength(5);
  const structureCalls = relay.calls.filter(
    (c) => c.payload.phase === "structure",
  );
  const repeat = structureCalls[1],
    repair = structureCalls[2];
  expect(repeat.payload.recent[0].title).toBe(harbor.title);
  expect(repair.payload.repair.candidate.title).toBe(harbor.title);
  expect(repair.payload.repair.errors.length).toBeGreaterThan(0);
  expect(repair.payload.generationId).toBe(repeat.payload.generationId);
  expect(repair.payload.requestId).not.toBe(repeat.payload.requestId);
  expect(repair.chatCode).toBe(repeat.chatCode);
  expect(Object.keys(repeat.payload).sort()).toEqual([
    "designVersion",
    "generationId",
    "phase",
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
  const content = relay.calls.find(
    (call) =>
      call.payload.phase === "content" &&
      call.payload.generationId === current.payload.generationId,
  );
  expect(content).toBeDefined();
  expect((await state(page)).design.requestId).toBe(content.payload.requestId);
  expect((await state(page)).design.generationId).toBe(
    current.payload.generationId,
  );
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
  const content = relay.calls.find(
    (call) =>
      call.payload.phase === "content" &&
      call.payload.generationId === current.payload.generationId,
  );
  expect(content).toBeDefined();
  expect((await state(page)).design.requestId).toBe(content.payload.requestId);
  expect((await state(page)).design.generationId).toBe(
    current.payload.generationId,
  );
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

test("looking at an authored object reveals its readable caption without replacing furniture controls", async ({
  page,
}) => {
  // The full first-person scene compiles on software WebGL in hosted CI.
  test.setTimeout(90_000);
  await designer(page);
  await open(page);
  await page.locator("#start").click();
  await expect.poll(async () => (await state(page)).status).toBe("playing");
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    g.settings.view = "first-person";
    g.survivors = [g.survivors[0]];
    g.zombies = [];
    g.nextSpawn = Number.MAX_SAFE_INTEGER;
  });
  await expect(page.locator("#view3d")).toBeVisible();
  const target = await page.evaluate(async () => {
    const { surfaceWorldPose } = await import(
        "/src/environment-surfaces.ts" as string
      ),
      { expandContentText } = await import(
        "/src/environment-contract.mjs" as string
      ),
      { sceneLookDescription } = await import(
        "/src/scene-observations.ts" as string
      ),
      { solid } = await import("/src/spatial.ts" as string),
      app = (window as any).__deadAir,
      g = app.game,
      f = g.floors[0],
      a = g.survivors[0];
    for (const slot of f.environment.surfaces.filter(
      (s: any) => s.role === "prop-face",
    )) {
      const pose = surfaceWorldPose(f, slot);
      if (!pose?.parent) continue;
      const entry = f.environment.entries.find(
          (e: any) => e.surfaceId === slot.id,
        ),
        title = expandContentText(entry.title, f.environment.fragments),
        text =
          expandContentText(entry.body, f.environment.fragments) ||
          entry.description;
      if (!title || !text) continue;
      for (let i = 0; i < 16; i++) {
        const angle = (i * Math.PI) / 8,
          point = {
            x: pose.parent.x + Math.cos(angle) * 1.15,
            y: pose.parent.y + Math.sin(angle) * 1.15,
          };
        if (solid(f, point, 0.3)) continue;
        Object.assign(a, point, { floor: 0 });
        const yaw = Math.atan2(pose.y - a.y, pose.x - a.x),
          pitch = Math.atan2(
            pose.z - 1.6,
            Math.hypot(pose.x - a.x, pose.y - a.y),
          );
        if (!sceneLookDescription(g, yaw, pitch).includes(text)) continue;
        app.setLook(yaw, pitch);
        return { parent: pose.parent.id, title, text };
      }
    }
    throw Error("No reachable authored object to read");
  });
  await expect(page.locator("#scene-description")).toContainText(target.title);
  await expect(page.locator("#scene-description")).toContainText(target.text);
  await expect(page.locator("#interaction-prompt")).toContainText("Grip");
  await page.evaluate((id) => {
    const g = (window as any).__deadAir.game;
    g.floors[0].furniture.find((o: any) => o.id === id).destroyed = true;
  }, target.parent);
  await expect(page.locator("#scene-description")).toBeHidden();
});
