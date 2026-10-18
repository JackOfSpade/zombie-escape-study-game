import { expect, test } from "@playwright/test";

// Deliberately opt-in: uses the already authorized live connector, never creates
// a session, changes sharing, supplies worker answers or reads another save.
// A separately active ChatGPT worker must serve the two synthetic turns.
test("live connector serves two real terminal turns and the UI awards exactly one key", async ({
  page,
  request,
}) => {
  test.skip(
    process.env.LIVE_STUDY_BRIDGE !== "1",
    "Requires an explicitly requested live connector check",
  );
  test.setTimeout(180_000);
  const status = await (await request.get("/api/handoff/status")).json();
  expect(status.enabled).toBe(true);
  expect(status.public?.linked).toBe(true);
  // Either the legacy worker chat or the embedded live terminal app may serve.
  const servedBy =
    status.public?.terminalRelay?.sessions > 0
      ? "embedded-terminal-app"
      : status.public?.workerActive
        ? "legacy-worker-session"
        : null;
  expect(servedBy, "Open the study terminal app in ChatGPT first").not.toBe(
    null,
  );
  console.log("LIVE_DIALOGUE_SERVED_BY", servedBy);
  expect(status.tunnel?.verified).toBe(true);
  expect(
    status.queued + status.working,
    "Serve existing player work before this smoke test",
  ).toBe(0);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Enter the building" }).click();
  await page.evaluate(async () => {
    const { game: g, roadmap: r } = (window as any).__deadAir;
    const root = "/src/";
    const { ensureProblem } = await import(/* @vite-ignore */ root + "ai.ts");
    g.id = `live-dialogue-smoke-${crypto.randomUUID()}`;
    for (const e of Object.values(g.encounters) as any[]) e.runId = g.id;
    for (const a of g.survivors.slice(1)) a.escaped = true;
    g.zombies = [];
    g.nextSpawn = Number.MAX_SAFE_INTEGER;
    g.surge.anchor = Number.MAX_SAFE_INTEGER;
    const st = g.floors[0].stations[0],
      e = g.encounters[st.encounter];
    Object.assign(g.survivors[0], { x: st.x, y: st.y, keys: 0 });
    await ensureProblem(g, e, r);
    e.mode = "solo";
    e.owner = "human";
    e.problem.title = "LIVE CONNECTOR SMOKE · synthetic fixed window";
    e.problem.prompt =
      "Synthetic smoke exercise. Readings are [1,2,3], window size 2. State the largest window total, explain the enter/leave update, and state the fixed-size invariant and the final-window boundary. No implementation or execution required.";
    e.problem.rubric = [
      "Largest total 5 from [2,3]",
      "Subtract outgoing reading and add incoming reading",
      "Window contains exactly two consecutive readings; stop before incoming index reaches list length",
    ];
    e.problem.validation = { kind: "trace", answer: 5 };
    e.workspace = "";
    e.submissions = [];
    e.tutor = [];
    e.tutorRequests = [];
    // Replace only this isolated browser's request context with synthetic text.
    r.tracks.PY.curriculum =
      "Synthetic D1 fixed-size-window scope: explain a running sum, enter/leave update, fixed cardinality and last valid index. No execution or mastery claims.";
    r.tracks.PY.progress =
      "Synthetic smoke learner: no personal progress or independent mastery is requested. Gameplay validation only.";
    if (g.study.learner) g.study.learner.roadmapAdoptions = [];
  });
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect(page.locator("#chat-input")).toBeVisible();
  await expect(page.locator("#workspace")).toBeHidden();
  await page
    .locator("#chat-input")
    .fill("I think [2,3] is the largest window.");
  await page.locator("#chat-input").press("Enter");
  await expect(page.locator("#tutor-request-status")).toContainText(
    "Queued for ChatGPT",
  );
  console.log("LIVE_DIALOGUE_FIRST_TURN_QUEUED");
  await expect(page.locator("#messages .tutor")).toHaveCount(1, {
    timeout: 75_000,
  });
  await expect(page.locator("#chat-form button")).toBeEnabled();
  let proof = await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      e = g.encounters[g.floors[0].stations[0].encounter];
    return {
      keys: g.survivors[0].keys,
      state: e.state,
      requests: e.tutorRequests.map((j: any) => j.state),
    };
  });
  expect(proof.keys).toBe(0);
  expect(proof.state).not.toBe("consumed");
  expect(proof.requests).toEqual(["applied"]);
  await page
    .locator("#chat-input")
    .fill(
      "The largest total is 5 from [2,3]. Starting with [1,2], the total is 3; subtract outgoing 1 and add incoming 3, getting 5. Each window always contains exactly two consecutive readings, and the running total equals their sum. [2,3] is the final full window: stop before an incoming index reaches the list length (3), or a window would run past the end.",
    );
  await page.locator("#chat-input").press("Enter");
  console.log("LIVE_DIALOGUE_SECOND_TURN_QUEUED");
  await expect(page.locator("#dialogue-status")).toContainText("Solved", {
    timeout: 75_000,
  });
  proof = await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      e = g.encounters[g.floors[0].stations[0].encounter];
    return {
      keys: g.survivors[0].keys,
      state: e.state,
      requests: e.tutorRequests.map((j: any) => j.state),
    };
  });
  expect(proof).toEqual({
    keys: 1,
    state: "consumed",
    requests: ["applied", "applied"],
  });
  await expect(page.locator("#messages .human")).toHaveCount(2);
  await expect(page.locator("#messages .tutor")).toHaveCount(2);
  await page.screenshot({
    path: ".artifacts/live-dialogue-smoke.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  console.log("LIVE_DIALOGUE_VERIFIED_ONE_KEY", JSON.stringify(proof));
});
