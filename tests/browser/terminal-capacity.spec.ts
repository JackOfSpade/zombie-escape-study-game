import { expect, test } from "@playwright/test";
import { enterLegacyBuilding } from "./helpers/legacy-world";

test("a late player can use an initially generated opportunity after nineteen NPC completions and retain the exact draft on reload", async ({
  page,
}) => {
  await enterLegacyBuilding(page);
  const baseline = await page.evaluate(async () => {
    const root = "/src/",
      { complete } = await import(root + "engine.ts"),
      g = (window as any).__deadAir.game,
      a = g.survivors[0];
    const tasks = Object.values(g.encounters).filter(
      (e: any) => e.floor === 0 && e.reward === "stairs",
    ) as any[];
    if (tasks.length !== 20)
      throw Error(
        `Expected initial twenty opportunities, found ${tasks.length}`,
      );
    for (const [i, npc] of g.survivors.slice(1).entries()) {
      complete(
        g,
        tasks[i].id,
        `capacity-fixture-${i}`,
        [npc.id],
        "Controlled lone NPC completion; no human learning evidence",
      );
      npc.escaped = true;
    }
    const remaining = tasks.filter((e) => e.state !== "consumed");
    if (remaining.length !== 1)
      throw Error("Expected one initial opportunity left");
    const s = g.floors[0].stations.find(
      (s: any) => s.encounter === remaining[0].id,
    );
    Object.assign(a, { x: s.x, y: s.y });
    // Isolate the actual terminal interaction from combat. This is a controlled
    // capacity/persistence fixture, not a thirty-minute survival claim.
    g.nextSpawn = 999999;
    g.surge.anchor = 999999;
    g.zombies = [];
    const { topicSpawn, ...learning } = g.study;
    return {
      id: remaining[0].id,
      room: remaining[0].questionRoom ?? remaining[0].id,
      access: [...a.access],
      learning: JSON.stringify(learning),
      spawns: JSON.stringify(topicSpawn?.recent ?? []),
      count: Object.keys(g.encounters).length,
    };
  });
  expect(baseline.access).toEqual([]);
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect(page.locator("#terminal")).toBeVisible();
  await expect(page.locator("#problem")).toContainText("Development");
  const problem = await page.locator("#problem").textContent();
  const draft =
    "Late arrival: my independent reasoning stays at this exact terminal.";
  // Solo terminals keep the learner's unsent text in the conversation composer.
  await page.locator("#chat-input").fill(draft);
  const time = await page.evaluate(() => (window as any).__deadAir.game.time);
  await expect
    .poll(() => page.evaluate(() => (window as any).__deadAir.game.time))
    .toBeGreaterThan(time + 0.4);
  await page.getByRole("button", { name: "Save run", exact: true }).click();
  // The click resolves before the async save; reloading earlier loses it.
  await expect(page.locator("#notice")).toContainText("Run saved locally");
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__deadAir);
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect(page.locator("#terminal")).toBeVisible();
  await expect(page.locator("#chat-input")).toHaveValue(draft);
  await expect(page.locator("#problem")).toHaveText(problem!);
  const after = await page.evaluate((id) => {
    const g = (window as any).__deadAir.game,
      { topicSpawn, ...learning } = g.study;
    return {
      owner: g.encounters[id].owner,
      access: g.survivors[0].access,
      learning: JSON.stringify(learning),
      spawns: topicSpawn.recent,
      count: Object.keys(g.encounters).length,
      consumed: Object.values(g.encounters).filter(
        (e: any) =>
          e.floor === 0 && e.reward === "stairs" && e.state === "consumed",
      ).length,
    };
  }, baseline.id);
  expect(after.owner).toBe("human");
  expect(after.access).toEqual([]);
  expect(after.learning).toBe(baseline.learning);
  // Opening the terminal generated its question, which the topic-variety
  // policy records exactly once (not learning evidence); reload adds none.
  expect(JSON.stringify(after.spawns.slice(0, -1))).toBe(baseline.spawns);
  expect(after.spawns.at(-1)).toMatchObject({
    encounter: baseline.room,
    profile: "development",
  });
  expect(after.count).toBe(baseline.count);
  expect(after.consumed).toBe(19);
  await page.locator("#leave").click();
  await page.screenshot({ path: "test-results/late-terminal-capacity.png" });
});
