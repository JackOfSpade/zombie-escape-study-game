import { expect, test, type Page } from "@playwright/test";

async function openSoloTerminal(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Enter the building" }).click();
  await page.evaluate(async () => {
    const root = "/src/";
    const { ensureProblem } = await import(/* @vite-ignore */ root + "ai.ts");
    const r = await (await fetch("/curriculum.json")).json();
    const g = (window as any).__deadAir.game,
      st = g.floors[0].stations[0],
      e = g.encounters[st.encounter];
    for (const a of g.survivors.slice(1)) a.escaped = true;
    g.zombies = [];
    g.nextSpawn = Number.MAX_SAFE_INTEGER;
    Object.assign(g.survivors[0], { x: st.x, y: st.y });
    await ensureProblem(g, e, r);
    e.mode = "solo";
    e.owner = "human";
  });
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect(page.locator("#chat-input")).toBeVisible();
}

test("Reconnect ChatGPT runs the whole sequence itself, keeps Settings closed, reports done and disappears", async ({
  page,
}) => {
  const relay = {
    enabled: false,
    verified: false,
    linked: true,
    sessions: 0,
  };
  const actions: string[] = [];
  await page.route("**/api/status", (route) =>
    route.fulfill({
      json: relay.enabled
        ? {
            mode: "chatgpt-handoff",
            label: "ChatGPT handoff",
            capabilities: ["tutor"],
            detail: "Synthetic handoff",
          }
        : {
            mode: "development",
            label: "Development fallback",
            capabilities: [],
            detail: "Synthetic disconnected",
          },
    }),
  );
  await page.route("**/api/handoff/status", (route) =>
    route.fulfill({
      json: {
        enabled: relay.enabled,
        autonomousWork: false,
        heldAutonomous: 0,
        queued: 0,
        working: 0,
        done: 0,
        recent: [],
        public: {
          configured: true,
          linked: relay.linked,
          workerActive: false,
          terminalRelay: {
            sessions: relay.sessions,
            activeSessions: relay.sessions,
            pendingTurns: 0,
          },
          mcpUrl: "https://synthetic.lullascape.com/mcp",
          pairingOpen: false,
          diagnostics: [],
        },
        tunnel: {
          state: relay.verified ? "connected" : "off",
          verified: relay.verified,
          error: null,
        },
      },
    }),
  );
  await page.route("**/api/handoff/control", async (route) => {
    const body = route.request().postDataJSON();
    actions.push(body.action);
    if (body.action === "start-public") {
      setTimeout(() => {
        relay.verified = true;
      }, 500);
      await route.fulfill({ json: { state: "starting", verified: false } });
    } else if (body.action === "enable") {
      relay.enabled = body.enabled;
      await route.fulfill({ json: { enabled: relay.enabled } });
    } else await route.fulfill({ status: 409, json: { error: "unexpected" } });
  });
  await openSoloTerminal(page);
  const button = page.locator("#connect-completion"),
    notice = page.locator("#completion-connection");
  await expect(button).toBeVisible();
  await expect(notice).toContainText("ChatGPT is disconnected");
  await button.click();
  await expect(page.locator("#settings")).toBeHidden();
  await expect(button).toBeHidden();
  await expect(notice).toContainText("Connected and released", {
    timeout: 15_000,
  });
  expect(actions).toEqual(["start-public", "enable"]);
  await expect(page.locator("#settings")).toBeHidden();
  relay.sessions = 1;
  await expect(notice).toContainText("Done. ChatGPT is connected", {
    timeout: 15_000,
  });
  await expect(button).toBeHidden();
  await expect(page.locator("#chat-form button")).toBeEnabled();
  await expect(notice).toBeHidden({ timeout: 15_000 });
  expect(actions).toEqual(["start-public", "enable"]);
});

test("Reconnect ChatGPT reports what it cannot do on its own when the connector is not paired", async ({
  page,
}) => {
  const actions: string[] = [];
  await page.route("**/api/status", (route) =>
    route.fulfill({
      json: {
        mode: "development",
        label: "Development fallback",
        capabilities: [],
        detail: "Synthetic disconnected",
      },
    }),
  );
  await page.route("**/api/handoff/status", (route) =>
    route.fulfill({
      json: {
        enabled: false,
        queued: 0,
        working: 0,
        done: 0,
        recent: [],
        public: {
          configured: true,
          linked: false,
          workerActive: false,
          terminalRelay: { sessions: 0, activeSessions: 0, pendingTurns: 0 },
        },
        tunnel: { state: "off", verified: false, error: null },
      },
    }),
  );
  await page.route("**/api/handoff/control", async (route) => {
    actions.push(route.request().postDataJSON().action);
    await route.fulfill({ status: 409, json: { error: "unexpected" } });
  });
  await openSoloTerminal(page);
  await page.locator("#connect-completion").click();
  await expect(page.locator("#completion-connection")).toContainText(
    "not paired",
  );
  await expect(page.locator("#settings")).toBeHidden();
  expect(actions).toEqual([]);
  await expect(page.locator("#connect-completion")).toBeVisible({
    timeout: 15_000,
  });
});

test("a queued terminal message says when nothing in ChatGPT is listening", async ({
  page,
}) => {
  let activeSessions = 0;
  await page.route("**/api/status", (route) =>
    route.fulfill({
      json: {
        mode: "chatgpt-handoff",
        label: "ChatGPT handoff",
        capabilities: ["tutor"],
        detail: "Synthetic handoff",
      },
    }),
  );
  await page.route("**/api/bridge", (route) =>
    route.fulfill({
      status: 202,
      json: { status: "pending", handoff: { id: "synthetic-job", hash: "h" } },
    }),
  );
  await page.route("**/api/bridge/result**", (route) =>
    route.fulfill({ status: 202, json: { status: "pending" } }),
  );
  await page.route("**/api/handoff/status", (route) =>
    route.fulfill({
      json: {
        enabled: true,
        queued: 1,
        working: 0,
        done: 0,
        recent: [{ id: "synthetic-job", operation: "tutor", status: "queued" }],
        public: {
          configured: true,
          linked: true,
          workerActive: false,
          terminalRelay: { sessions: 1, activeSessions, pendingTurns: 0 },
        },
        tunnel: { state: "connected", verified: true, error: null },
      },
    }),
  );
  await openSoloTerminal(page);
  await page.locator("#chat-input").fill("hi");
  await page.locator("#chat-form button").click();
  await expect(page.locator("#tutor-request-status")).toContainText(
    "nothing is listening in ChatGPT",
    { timeout: 15_000 },
  );
  activeSessions = 1;
  await expect(page.locator("#tutor-request-status")).toContainText(
    "Queued for ChatGPT. Keep the study terminal app open",
    { timeout: 15_000 },
  );
  await expect(page.locator("#tutor-request-status")).not.toContainText(
    "nothing is listening",
  );
});
