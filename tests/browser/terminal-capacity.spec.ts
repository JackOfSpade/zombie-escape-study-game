import { expect, test } from "@playwright/test";
import { openGameMenu } from "./helpers/game-menu";
import { enterLegacyBuilding } from "./helpers/legacy-world";
import { mockNativeStudy } from "./native-study-harness";

test("late player retains an initial native question after nineteen NPC completions, including migrated saved draft and exact reload identity", async ({
  page,
}) => {
  const relay = await mockNativeStudy(page);
  await enterLegacyBuilding(page);
  const draft =
    "Late arrival: my unsent saved reasoning stays at this exact terminal.";
  const baseline = await page.evaluate(async (draft) => {
    const root = "/src/",
      { complete } = await import(/* @vite-ignore */ root + "engine.ts"),
      g = (window as any).__deadAir.game,
      a = g.survivors[0];
    const tasks = Object.values(g.encounters).filter(
      (e: any) => e.floor === 0 && e.reward === "stairs",
    ) as any[];
    if (tasks.length !== 20)
      throw Error(
        `Expected twenty initial opportunities, found ${tasks.length}`,
      );
    for (const [i, npc] of g.survivors.slice(1).entries()) {
      complete(
        g,
        tasks[i].id,
        `capacity-fixture-${i}`,
        [npc.id],
        "Controlled NPC completion; no human evidence",
      );
      npc.escaped = true;
    }
    const remaining = tasks.filter((e) => e.state !== "consumed");
    if (remaining.length !== 1)
      throw Error("Expected one initial opportunity left");
    const e = remaining[0],
      s = g.floors[0].stations.find((s: any) => s.encounter === e.id);
    // Migration input from a former in-game composer, never submitted. It must
    // travel as unsent context, without becoming a human answer or evidence.
    e.chatDraft = draft;
    Object.assign(a, { floor: 0, x: s.x, y: s.y });
    g.nextSpawn = Number.MAX_SAFE_INTEGER;
    g.surge.anchor = Number.MAX_SAFE_INTEGER;
    g.zombies = [];
    const { topicSpawn, ...learning } = g.study;
    return {
      id: e.id,
      room: e.questionRoom ?? e.id,
      access: [...a.access],
      learning: JSON.stringify(learning),
      spawns: JSON.stringify(topicSpawn?.recent ?? []),
      count: Object.keys(g.encounters).length,
    };
  }, draft);
  expect(baseline.access).toEqual([]);
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect.poll(() => relay.calls.length).toBe(1);
  await expect(page.locator("#native-study")).toBeVisible();
  await expect(page.locator("#terminal")).toBeHidden();
  await expect(page.locator("#chat-input")).toBeHidden();
  const payload = relay.calls[0].payload;
  expect(payload.problem.prompt).toBeTruthy();
  expect(payload.profile).toBe("development");
  expect(payload.unsentDraft).toEqual({ text: draft, learnerEvidence: false });
  expect(payload.messages.some((m: any) => m.kind === "human")).toBe(false);
  const time = await page.evaluate(() => (window as any).__deadAir.game.time);
  await expect
    .poll(() => page.evaluate(() => (window as any).__deadAir.game.time))
    .toBeGreaterThan(time + 0.4);
  await openGameMenu(page);
  await page.getByRole("button", { name: "Save run", exact: true }).click();
  await expect(page.locator("#notice")).toContainText("Run saved locally");
  await page.locator("#resume-game").click();
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__deadAir);
  await expect.poll(() => relay.calls.length).toBe(2);
  expect(relay.calls[1].payload).toEqual(payload);
  const after = await page.evaluate((id) => {
    const g = (window as any).__deadAir.game,
      e = g.encounters[id],
      { topicSpawn, ...learning } = g.study;
    return {
      owner: e.owner,
      access: g.survivors[0].access,
      learning: JSON.stringify(learning),
      spawns: topicSpawn.recent,
      count: Object.keys(g.encounters).length,
      consumed: Object.values(g.encounters).filter(
        (e: any) =>
          e.floor === 0 && e.reward === "stairs" && e.state === "consumed",
      ).length,
      problem: e.problem,
      draft: e.chatDraft,
      session: e.directStudy,
      humanArtifacts: e.history.filter((h: any) => h.author === "human"),
    };
  }, baseline.id);
  expect(after.owner).toBe("human");
  expect(after.access).toEqual([]);
  expect(after.learning).toBe(baseline.learning);
  expect(after.problem).toEqual(payload.problem);
  expect(after.draft).toBe(draft);
  expect(after.session.questionFingerprint).toBe(payload.questionFingerprint);
  expect(after.humanArtifacts).toEqual([]);
  expect(JSON.stringify(after.spawns.slice(0, -1))).toBe(baseline.spawns);
  expect(after.spawns.at(-1)).toMatchObject({
    encounter: baseline.room,
    profile: "development",
  });
  expect(after.count).toBe(baseline.count);
  expect(after.consumed).toBe(19);
  await expect(page.locator("#terminal")).toBeHidden();
  await page.screenshot({
    path: "test-results/late-native-terminal-capacity.png",
  });
});
