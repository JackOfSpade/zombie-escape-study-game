import { expect, test } from "@playwright/test";
import {
  enterNativeGame,
  flushNativeSave,
  mockNativeStudy,
  openNativeQuestion,
} from "./native-study-harness";

test("native practice completion, including a declared gap, rotates game and study questions across reload", async ({
  page,
}) => {
  const relay = await mockNativeStudy(page);
  await enterNativeGame(page);
  await page.evaluate(async () => {
    const d = (window as any).__deadAir,
      g = d.game,
      root = "/src/";
    const { eligible } = await import(
      /* @vite-ignore */ root + "curriculum.ts"
    );
    const { recordSpawn, spawnContract } = await import(
      /* @vite-ignore */ root + "topic-spawn.ts"
    );
    const { devProblem } = await import(
      /* @vite-ignore */ root + "practice-problem.ts"
    );
    const e = g.encounters[g.floors[0].stations[0].encounter];
    recordSpawn(
      g.study,
      eligible(d.roadmap, g.study),
      "synthetic-cooldown",
      g.time,
    );
    const c = spawnContract(d.roadmap, g.study);
    if (!c.practice) throw Error("Expected a variety practice fixture");
    e.problem = devProblem(g, d.roadmap, c);
    e.workspace = e.problem.starter;
  });
  const id = await openNativeQuestion(page);
  await expect.poll(() => relay.calls.length).toBe(1);
  expect(relay.calls[0].payload.problem.contract.track).toBe("PY");
  expect(relay.calls[0].payload.problem.contract.practice).toBe(true);
  relay.finish(relay.calls[0].payload.requestId, "gap");
  await expect
    .poll(() =>
      page.evaluate(
        (id) => (window as any).__deadAir.game.encounters[id].state,
        id,
      ),
    )
    .toBe("consumed");
  await page.locator("#study-only-toggle").click();
  for (const [i, track] of ["PE", "PE", "PY"].entries()) {
    await page.locator("#study-next").click();
    await expect.poll(() => relay.calls.length).toBe(i + 2);
    const payload = relay.calls[i + 1].payload;
    expect(payload.problem.contract.track).toBe(track);
    relay.finish(payload.requestId);
    await expect(page.locator("#study-save-status")).toContainText(
      "Learning result received and saved",
    );
  }
  const progress = await page.evaluate(() => {
    const s = (window as any).__deadAir.game.study;
    return {
      position: s.studyTurnPosition,
      visits: s.visits.length,
      attempts: s.learner.attempts.length,
      evidence: s.learner.evidence.length,
    };
  });
  expect(progress).toEqual({
    position: 1,
    visits: 3,
    attempts: 0,
    evidence: 0,
  });
  await flushNativeSave(page);
  await page.reload();
  await expect(page.locator("#study-workspace")).toBeVisible();
  await page.locator("#study-next").click();
  await expect.poll(() => relay.calls.length).toBe(5);
  expect(relay.calls[4].payload.problem.contract.track).toBe("PE");
});

test("opening another untouched physical terminal refreshes its preloaded track after practice", async ({
  page,
}) => {
  const relay = await mockNativeStudy(page);
  await enterNativeGame(page);
  const first = await openNativeQuestion(page);
  await expect.poll(() => relay.calls.length).toBe(1);
  expect(relay.calls[0].payload.problem.contract.track).toBe("PY");
  relay.finish(relay.calls[0].payload.requestId);
  await expect
    .poll(() =>
      page.evaluate(
        (id) => (window as any).__deadAir.game.encounters[id].state,
        first,
      ),
    )
    .toBe("consumed");
  await page.evaluate(() => {
    const d = (window as any).__deadAir,
      g = d.game;
    const st = g.floors[0].stations.find(
      (s: any) =>
        g.encounters[s.encounter].state !== "consumed" &&
        !g.encounters[s.encounter].owner &&
        Math.hypot(s.x - g.survivors[0].x, s.y - g.survivors[0].y) > 3,
    );
    if (!st) throw Error("No untouched station");
    Object.assign(g.survivors[0], { floor: 0, x: st.x, y: st.y });
  });
  // Moving away releases the previous physical station on the real game frame.
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__deadAir.game.survivors[0].station),
    )
    .toBeUndefined();
  await page.keyboard.press("e");
  await expect.poll(() => relay.calls.length).toBe(2);
  expect(relay.calls[1].payload.problem.contract.track).toBe("PE");
  expect(relay.calls[1].payload.encounterId).not.toBe(first);
});
