import { expect, test, type Page } from "@playwright/test";

/** Tests never reach the real ChatGPT: popups land on a local stub page. */
async function stubChatGpt(page: Page) {
  await page
    .context()
    .route("https://chatgpt.com/**", (route) =>
      route.fulfill({ contentType: "text/html", body: "<title>stub</title>" }),
    );
}
async function openSoloTerminal(page: Page, resume = false) {
  await stubChatGpt(page);
  await page.goto("/");
  // A saved run in progress resumes without the start card.
  if (!resume)
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

for (const clipboardBlocked of [false, true]) {
  test(`Reconnect ChatGPT exposes the prompt with clipboard ${clipboardBlocked ? "blocked" : "available"}, keeps Settings closed, reports done and disappears`, async ({
    page,
  }) => {
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);
    if (clipboardBlocked)
      await page.addInitScript(() => {
        Object.defineProperty(navigator.clipboard, "writeText", {
          configurable: true,
          value: async () => {
            throw new DOMException("Denied", "NotAllowedError");
          },
        });
      });
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
      } else
        await route.fulfill({ status: 409, json: { error: "unexpected" } });
    });
    await openSoloTerminal(page);
    const button = page.locator("#connect-completion"),
      notice = page.locator("#completion-connection");
    await expect(button).toBeVisible();
    await expect(notice).toContainText("ChatGPT is disconnected");
    await expect(button).toHaveText("Connect ChatGPT");
    const popup = page.waitForEvent("popup");
    await button.click();
    const chat = await popup;
    await expect(page.locator("#settings")).toBeHidden();
    await expect(button).toBeHidden();
    await expect(notice).toContainText("Connected and released", {
      timeout: 15_000,
    });
    await expect(notice).toContainText("ChatGPT opened in a new tab");
    expect(actions).toEqual(["start-public", "enable"]);
    // The reserved tab now holds a new, empty ChatGPT chat; the request is on
    // the clipboard so the player picks the thinking level before sending.
    await chat.waitForURL(/^https:\/\/chatgpt\.com\/$/);
    await expect(page.locator("#chatgpt-prompt-text")).toHaveValue(
      "Open my zombie-escape-study-game study terminal so it can serve my game's terminal turns.",
    );
    await expect(page.locator("#chatgpt-prompt-text")).toBeVisible();
    if (clipboardBlocked) {
      await expect(page.locator("#chatgpt-copy-status")).toContainText(
        "Select and copy",
      );
      // Retrying after permission is restored must copy the same visible prompt.
      await page.evaluate(() => {
        delete (navigator.clipboard as any).writeText;
      });
    } else {
      await expect(notice).toContainText("paste it, then press Enter");
    }
    await page.bringToFront();
    await page.locator("#copy-chatgpt-prompt").click();
    await expect(page.locator("#chatgpt-copy-status")).toContainText(
      "Prompt copied",
    );
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(
      /zombie-escape-study-game study terminal/,
    );
    await expect(page.locator("#settings")).toBeHidden();
    relay.sessions = 1;
    await expect(notice).toContainText("Done. ChatGPT is connected", {
      timeout: 15_000,
    });
    await expect(button).toBeHidden();
    await expect(page.locator("#chat-form button")).toBeEnabled();
    await expect(notice).toBeHidden({ timeout: 15_000 });
    await expect(page.locator("#chatgpt-prompt")).toBeHidden();
    expect(actions).toEqual(["start-public", "enable"]);
    expect(actions).toEqual(["start-public", "enable"]);
  });
}

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
  const popup = page.waitForEvent("popup");
  await page.locator("#connect-completion").click();
  const reserved = await popup;
  await expect(page.locator("#completion-connection")).toContainText(
    "not paired",
  );
  // Setup failed before ChatGPT was needed: the reserved blank tab is closed.
  await expect.poll(() => reserved.isClosed()).toBe(true);
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
  // One button sets up and opens the ChatGPT chat; no manual steps.
  const button = page.locator("#connect-completion");
  await expect(button).toBeVisible();
  await expect(page.locator("#completion-connection")).toContainText(
    "isn't listening for this terminal yet",
  );
  const popup = page.waitForEvent("popup");
  await button.click();
  const chat = await popup;
  await chat.waitForURL(/^https:\/\/chatgpt\.com\/$/);
  await expect(page.locator("#completion-connection")).toContainText(
    "ChatGPT opened in a new tab",
  );
  activeSessions = 1;
  await expect(page.locator("#tutor-request-status")).toContainText(
    "Queued for ChatGPT. Keep the study terminal app open",
    { timeout: 15_000 },
  );
  await expect(page.locator("#tutor-request-status")).not.toContainText(
    "nothing is listening",
  );
  await expect(page.locator("#completion-connection")).toContainText(
    "Done. ChatGPT is connected",
    { timeout: 15_000 },
  );
  await expect(button).toBeHidden();
  expect(chat.isClosed()).toBe(false);
  // The chat errors out and its app stops calling in while the message is
  // still queued: the button comes back, and pressing it moves the same
  // ChatGPT tab to a new chat instead of opening another tab to clean up.
  const pages = () => page.context().pages().length;
  const before = pages();
  await chat.goto("https://chatgpt.com/c/old-chat");
  activeSessions = 0;
  await expect(button).toBeVisible({ timeout: 15_000 });
  await button.click();
  await chat.waitForURL(/^https:\/\/chatgpt\.com\/$/);
  await expect(page.locator("#completion-connection")).toContainText(
    "Your ChatGPT tab moved to a new chat",
  );
  expect(pages()).toBe(before);
  expect(chat.isClosed()).toBe(false);
  activeSessions = 1;
  await expect(page.locator("#completion-connection")).toContainText(
    "Done. ChatGPT is connected",
    { timeout: 15_000 },
  );
  // After the game page itself reloads, the tab is still found by its name:
  // a new tab is created only when none exists.
  await chat.goto("https://chatgpt.com/c/older-chat");
  activeSessions = 0;
  await openSoloTerminal(page, true);
  await page.locator("#chat-input").fill("still here");
  await page.locator("#chat-form button").click();
  await expect(button).toBeVisible({ timeout: 15_000 });
  await button.click();
  await chat.waitForURL(/^https:\/\/chatgpt\.com\/$/);
  await expect(page.locator("#completion-connection")).toContainText(
    "Your ChatGPT tab moved to a new chat",
  );
  expect(pages()).toBe(before);
  expect(chat.isClosed()).toBe(false);
});
