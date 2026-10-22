import { expect, test } from "@playwright/test";
import {
  enterNativeGame,
  flushNativeSave,
  killHumanInStep,
  mockNativeStudy,
  nativeState,
  openNativeQuestion,
} from "./native-study-harness";

test("combat death preserves the pending native question without forcing a menu; final answers still count", async ({
  page,
}) => {
  const relay = await mockNativeStudy(page);
  await enterNativeGame(page);
  const id = await openNativeQuestion(page);
  await expect.poll(() => relay.calls.length).toBe(1);
  const pending = await nativeState(page, id),
    payload = relay.calls[0].payload;
  await killHumanInStep(page);
  await expect(page.locator("body")).toHaveClass(/spectating/);
  await expect(page.locator("#start-card")).toBeHidden();
  await expect(page.locator("#terminal")).toBeHidden();
  await expect(page.locator("#native-study-status")).toContainText(
    "Continue in ChatGPT",
  );
  const died = await nativeState(page, id);
  expect(died.session.questionFingerprint).toBe(
    pending.session.questionFingerprint,
  );
  expect(died.session.state).toBe("pending");
  expect(died.alive).toBe(false);
  expect(died.station).toBeUndefined();
  expect(typeof died.endedAt).toBe("number");
  await expect
    .poll(async () => (await nativeState(page, id)).time)
    .toBeGreaterThan(died.time + 0.25);
  await page.getByRole("button", { name: "Run summary" }).click();
  await expect(
    page.getByRole("button", { name: "Continue in ChatGPT" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue in ChatGPT" }).click();
  await expect(page.locator("#start-card")).toBeHidden();
  expect(relay.calls).toHaveLength(1);
  relay.finish(payload.requestId, "gap");
  await expect
    .poll(async () => (await nativeState(page, id)).session.state)
    .toBe("applied");
  const finished = await nativeState(page, id);
  expect(finished.keys).toBe(pending.keys);
  expect(finished.gaps).toHaveLength(1);
  expect(
    finished.tutor.some(
      (m: any) => m.kind === "human" && m.text.includes("do not know"),
    ),
  ).toBe(true);
  expect(finished.endedAt).toBe(died.endedAt);
  await expect(page.locator("#reward-toast")).toBeHidden();
  await flushNativeSave(page);
  await page.reload();
  const restored = await nativeState(page, id);
  expect(restored.keys).toBe(pending.keys);
  expect(restored.gaps).toHaveLength(1);
  expect(restored.session.state).toBe("applied");
});

test("a pending native question resumes after death and page reload with the same snapshot", async ({
  page,
}) => {
  const relay = await mockNativeStudy(page);
  await enterNativeGame(page);
  const id = await openNativeQuestion(page);
  await expect.poll(() => relay.calls.length).toBe(1);
  const payload = relay.calls[0].payload;
  await killHumanInStep(page);
  await expect(page.locator("#start-card")).toBeHidden();
  await flushNativeSave(page);
  await page.reload();
  await expect.poll(() => relay.calls.length).toBe(2);
  expect(relay.calls[1].payload).toEqual(payload);
  await expect(page.locator("#start-card")).toBeHidden();
  await expect(page.locator("#spectator")).toBeVisible();
  relay.finish(payload.requestId);
  await expect
    .poll(async () => (await nativeState(page, id)).session.state)
    .toBe("applied");
  expect((await nativeState(page, id)).keys).toBe(0);
});

test("delayed generation survives combat death and reload, resumes its exact request, then opens native study without a menu", async ({
  page,
}) => {
  const relay = await mockNativeStudy(page);
  const generations: any[] = [];
  let generated: any;
  await page.route("**/api/bridge", async (route) => {
    const body = route.request().postDataJSON();
    if (body.operation !== "generate") return route.fallback();
    generations.push(body);
    await route.fulfill({
      status: 202,
      json: {
        handoff: {
          id: "synthetic-delayed-generation",
          hash: "synthetic-exact-generation",
        },
      },
    });
  });
  await page.route("**/api/bridge/result**", async (route) => {
    if (
      new URL(route.request().url()).searchParams.get("id") !==
      "synthetic-delayed-generation"
    )
      return route.fallback();
    await route.fulfill({
      status: generated ? 200 : 202,
      json: generated ?? { status: "pending" },
    });
  });
  await enterNativeGame(page);
  const id = await page.evaluate(() => {
    const d = (window as any).__deadAir,
      g = d.game;
    g.study.profile = "live";
    const st = g.floors[0].stations[0],
      e = g.encounters[st.encounter];
    for (const peer of Object.values(g.encounters) as any[])
      if (
        peer === e ||
        (e.questionRoom && peer.questionRoom === e.questionRoom)
      ) {
        delete peer.problem;
        delete peer.problemPresentedSequence;
        peer.workspace = "";
        peer.revision = 0;
        peer.state = "available";
      }
    e.mode = "solo";
    e.owner = "human";
    Object.assign(g.survivors[0], { floor: 0, x: st.x, y: st.y });
    return e.id as string;
  });
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect.poll(() => generations.length).toBe(1);
  await expect(page.locator("#native-study-status")).toContainText(
    "Preparing your saved question",
  );
  await expect(page.locator("#native-study-retry")).toBeHidden();
  const original = generations[0];
  expect(original.payload.requestId).toBeTruthy();
  await killHumanInStep(page);
  await expect(page.locator("#start-card")).toBeHidden();
  await expect(page.locator("#spectator")).toBeVisible();
  await page.evaluate(async () => {
    const root = "/src/",
      { save, flushSaves } = await import(
        /* @vite-ignore */ root + "persistence.ts"
      );
    await save((window as any).__deadAir.game);
    await flushSaves();
  });
  await page.reload();
  await expect.poll(() => generations.length).toBe(2);
  expect(generations[1]).toEqual(original);
  await expect(page.locator("#start-card")).toBeHidden();
  await expect(page.locator("#native-study-status")).toContainText(
    "Preparing your saved question",
  );
  await expect(page.locator("#spectator")).toBeVisible();
  expect(relay.calls).toHaveLength(0);
  const contract = original.payload.contract;
  generated = {
    title: "Synthetic delayed question",
    prompt:
      "Explain the issued contract and its boundary. Synthetic transport fixture.",
    starter: "",
    rubric: ["Explain the captured source scope"],
    contract,
    scopeDefinitions: contract.objectiveIds.map(
      (objectiveId: string, i: number) =>
        original.payload.existingScopeDefinitions?.[
          `${objectiveId}/D${contract.depth}`
        ] ?? {
          id: `${objectiveId}/D${contract.depth}`,
          objectiveId,
          depth: contract.depth,
          sourceScope: contract.scopes[i],
          facets: [
            {
              id: `delayed-scope-${i}`,
              description: "Captured source scope and its boundary",
            },
          ],
        },
    ),
  };
  await expect.poll(() => relay.calls.length).toBe(1);
  const native = relay.calls[0].payload;
  expect(native.problem.title).toBe("Synthetic delayed question");
  expect(native.problem.contract).toEqual(contract);
  await expect(page.locator("#start-card")).toBeHidden();
  await expect(page.locator("#terminal")).toBeHidden();
  await expect(page.locator("#native-study-status")).toContainText(
    "Continue in ChatGPT",
  );
  relay.finish(native.requestId, "gap");
  await expect
    .poll(async () => (await nativeState(page, id)).session.state)
    .toBe("applied");
  const result = await nativeState(page, id);
  expect(result.status).toBe("dead");
  expect(result.keys).toBe(0);
  expect(result.gaps).toHaveLength(1);
  expect(generations).toHaveLength(2);
  expect(relay.calls.filter((call) => call.operation === "tutor")).toHaveLength(
    1,
  );
  expect(
    relay.calls.filter((call) => call.operation === "assess"),
  ).toHaveLength(1);
  await expect(page.locator("#reward-toast")).toBeHidden();
});
