import { expect, test, type Page } from "@playwright/test";
async function openFixture(page: Page, mode: "solo" | "shared") {
  await page.goto("/");
  await page.getByRole("button", { name: "Enter the building" }).click();
  await page.evaluate(async (mode) => {
    const root = "/src/";
    const { ensureProblem } = await import(/* @vite-ignore */ root + "ai.ts");
    const r = await (await fetch("/curriculum.json")).json();
    const g = (window as any).__deadAir.game,
      st = g.floors[0].stations[0],
      e = g.encounters[st.encounter];
    for (const a of g.survivors.slice(1)) a.escaped = true;
    g.zombies = [];
    Object.assign(g.survivors[0], { x: st.x, y: st.y });
    await ensureProblem(g, e, r);
    e.mode = mode;
    // Legacy shared-save fixture: fresh worlds now give each station a solo puzzle.
    if (mode === "shared") g.floors[0].stations[1].encounter = e.id;
    if (mode === "solo") e.owner = "human";
    e.problem.title = "Synthetic answer review";
    e.problem.prompt =
      "Explain a fictional sensor's behavior and one boundary worth checking.";
  }, mode);
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect(
    page.locator(mode === "solo" ? "#chat-input" : "#workspace"),
  ).toBeVisible();
}
test("solo terminal uses one @study conversation, exact retry and one key reward without a submission box", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let connected = false,
    calls = 0,
    release!: () => Promise<void>;
  const requests: any[] = [];
  await page.route("**/api/status", (route) =>
    route.fulfill({
      json: {
        mode: connected ? "chatgpt-handoff" : "development",
        label: "Synthetic",
        detail: "No external AI",
        capabilities: connected ? ["tutor"] : [],
      },
    }),
  );
  await page.route("**/api/bridge", async (route) => {
    const request = route.request().postDataJSON();
    requests.push(request);
    expect(request.operation).toBe("tutor");
    calls++;
    if (calls === 1)
      await new Promise<void>((resolve) => {
        release = async () => {
          await route.fulfill({
            json: {
              text: "Which reading leaves when the window shifts?",
              complete: false,
            },
          });
          resolve();
        };
      });
    else
      await route.fulfill({
        json: {
          text: "Solved: your reasoning covers the question.",
          complete: true,
        },
      });
  });
  await openFixture(page, "solo");
  await expect(page.locator("#workspace")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Submit answer", exact: true }),
  ).toBeHidden();
  await expect(page.locator("#conversation-title")).toHaveText("Terminal AI");
  await expect(page.locator("#problem")).toContainText("fictional sensor");
  await page.locator("#chat-input").fill("My first prediction");
  await page.locator("#chat-input").press("Enter");
  await expect(page.locator("#messages")).toContainText("My first prediction");
  await expect(page.locator("#tutor-request-status")).toContainText(
    "Reconnect",
  );
  expect(calls).toBe(0);
  connected = true;
  await page.evaluate(async () => {
    const root = "/src/";
    const { checkBridge } = await import(/* @vite-ignore */ root + "ai.ts");
    await checkBridge();
  });
  await page
    .getByRole("button", { name: "Retry saved private question" })
    .click();
  await expect(page.locator("#tutor-request-status")).toContainText(
    "Waiting for a reply",
  );
  await expect(page.locator("#chat-form button")).toBeDisabled();
  await release();
  await expect(page.locator("#messages")).toContainText("Which reading leaves");
  await expect(page.locator("#chat-form button")).toBeEnabled();
  await page.locator("#chat-input").fill("The outgoing reading is removed");
  await page.locator("#chat-input").press("Shift+Enter");
  await page
    .locator("#chat-input")
    .pressSequentially("and the incoming reading is added.");
  await page.screenshot({ path: "test-results/terminal-chat-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/terminal-chat-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator("#reward-toast")).toBeHidden();
  await expect(page.locator("#dialogue-reward")).toBeHidden();
  await page.locator("#chat-input").press("Enter");
  await expect(page.locator("#dialogue-status")).toContainText("Solved");
  await expect(page.locator("#messages")).toContainText(
    "Solved: your reasoning",
  );
  // The granted key is announced where the player is looking, not only as a
  // changed HUD number: a "Key granted" pill over the world, a pulse on the
  // count and a line in the conversation panel. Totals and stairs are not
  // repeated; the HUD and the map already show them.
  await expect(page.locator("#reward-toast")).toBeVisible();
  await expect(page.locator("#reward-toast")).toHaveText("Key granted");
  await expect(page.locator("#hud-keys")).toHaveText("1 key");
  await expect(page.locator("#hud-keys")).toHaveClass(/gained/);
  await expect(page.locator("#dialogue-reward")).toHaveText("Key granted");
  await page.screenshot({ path: "test-results/key-granted.png" });
  expect(calls).toBe(2);
  for (const request of requests) {
    expect(request.payload.mode).toBe("terminal-dialogue");
    expect(request.payload.prompt).toMatch(/^@study\n/);
    expect(request.payload.studyPrompt).toBe("@study");
    expect(request.payload.curriculum.length).toBeGreaterThan(100);
    expect(request.payload.progressContext.length).toBeGreaterThan(100);
  }
  expect(requests[1].payload.messages.length).toBe(3);
  const result = await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    const e = g.encounters[g.floors[0].stations[0].encounter];
    return { keys: g.survivors[0].keys, submissions: e.submissions.length };
  });
  expect(result).toEqual({ keys: 1, submissions: 1 });
  // Leaving the terminal clears its line; the toast times out on its own and
  // a reload never re-announces a key the player already has.
  await page.locator("#leave").click();
  await expect(page.locator("#dialogue-reward")).toBeHidden();
  await expect(page.locator("#reward-toast")).toBeHidden({ timeout: 10_000 });
  await page.reload();
  await expect(page.locator("#hud-keys")).toHaveText("1 key");
  await page.waitForTimeout(600);
  await expect(page.locator("#reward-toast")).toBeHidden();
  expect(errors).toEqual([]);
});
test("shared terminal presents only group chat and supplies its current draft without private tutor history", async ({
  page,
}) => {
  let group: any;
  await page.route("**/api/status", (route) =>
    route.fulfill({
      json: {
        mode: "chatgpt-handoff",
        label: "Synthetic browser transport",
        detail: "No external AI",
        capabilities: ["group"],
      },
    }),
  );
  await page.route("**/api/bridge", async (route) => {
    const r = route.request().postDataJSON();
    expect(r.operation).toBe("group");
    group = r.payload;
    await route.fulfill({
      json: {
        requestId: group.requestId,
        sourceRevision: group.sourceRevision,
        messages: [
          {
            author: group.speakers[0].id,
            kind: "question",
            text: "What changes in the current draft?",
            refs: [],
          },
        ],
      },
    });
  });
  await openFixture(page, "shared");
  await expect(page.locator("#conversation-title")).toHaveText("Group chat");
  await expect(page.locator("[data-tab]")).toHaveCount(0);
  await page.locator("#workspace").fill("Shared synthetic draft");
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      e = g.encounters["f0-room0"],
      a = g.survivors[1];
    e.tutor.push({
      id: "private",
      author: "Terminal AI",
      kind: "tutor",
      text: "PRIVATE_SENTINEL",
      seq: ++g.seq,
      worldTime: g.time,
      provenance: "chatgpt-handoff",
    });
    Object.assign(a, {
      escaped: false,
      floor: 0,
      intent: e.id,
      thought: 100,
      x: g.survivors[0].x + 1,
      y: g.survivors[0].y,
      activity: "working",
      station: g.floors[0].stations[1].id,
    });
  });
  await page.locator("#chat-input").fill("What assumption should we check?");
  await page.locator("#chat-form button").click();
  await expect(page.locator("#messages")).toContainText(
    "What changes in the current draft?",
  );
  await expect(page.locator("#messages")).not.toContainText("PRIVATE_SENTINEL");
  expect(group.workspace).toBe("Shared synthetic draft");
  expect(JSON.stringify(group)).not.toContain("PRIVATE_SENTINEL");
  await expect(page.locator("#submission-status")).toHaveText("Not submitted");
});
