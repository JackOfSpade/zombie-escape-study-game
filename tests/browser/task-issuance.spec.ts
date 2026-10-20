// Real UI lifecycle with a synthetic provider; no native identity/semantic claim.
import { expect, test } from "@playwright/test";
import { enterLegacyBuilding } from "./helpers/legacy-world";
test("unanswered native task keeps its ID through leave/reload/death and gets a fresh linked question", async ({
  page,
}) => {
  let generations = 0;
  await page.route("**/api/status", (route) =>
    route.fulfill({
      json: {
        mode: "study-mode",
        label: "Synthetic issuance fixture",
        detail: "Not native certification",
        capabilities: ["generate", "assess"],
      },
    }),
  );
  await page.route("**/api/bridge", async (route) => {
    const { operation, payload } = route.request().postDataJSON();
    if (operation === "generate") {
      generations++;
      const c = payload.contract;
      await route.fulfill({
        json: {
          title: "Synthetic unanswered task",
          prompt: `Read-only question ${generations}`,
          starter: "Supplied starter",
          rubric: [],
          contract: c,
          scopeDefinitions: c.objectiveIds.map((id: string, i: number) => ({
            id: `${id}/D${c.depth}`,
            objectiveId: id,
            depth: c.depth,
            sourceScope: c.scopes[i],
            facets: [{ id: "scope", description: "Synthetic scope" }],
          })),
        },
      });
    } else if (operation === "assess")
      await route.fulfill({
        json: { visitOutcome: "unresolved", findings: [] },
      });
    else
      await route.fulfill({
        status: 503,
        json: { error: "Unused fixture operation" },
      });
  });
  await enterLegacyBuilding(page);
  const baseline = await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      a = g.survivors[0],
      s = g.floors[0].stations.find((s: any) => s.encounter === "f0-room0");
    g.study.profile = "live";
    g.survivors = [a];
    g.zombies = [];
    g.nextSpawn = 999999;
    Object.assign(a, { x: s.x, y: s.y });
    return {
      cycle: g.study.learner.cycle,
      tracks: JSON.stringify(g.study.learner.tracks),
    };
  });
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect(page.locator("#problem")).toContainText("Read-only question 1");
  const issued = await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      l = g.study.learner;
    return {
      id: l.attempts[0]?.id,
      attempts: l.attempts.length,
      cycle: l.cycle,
      evidence: l.evidence.length,
      tracks: JSON.stringify(l.tracks),
      run: g.id,
    };
  });
  expect(issued.id).toBeTruthy();
  expect(issued.attempts).toBe(1);
  expect(issued.cycle).toBe(baseline.cycle);
  expect(issued.tracks).toBe(baseline.tracks);
  expect(issued.evidence).toBe(0);
  await page.locator("#leave").click();
  await page.reload();
  await expect(page.locator("#world")).toBeVisible();
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect(page.locator("#problem")).toContainText("Read-only question 1");
  expect(generations).toBe(1);
  expect(
    await page.evaluate(() =>
      (window as any).__deadAir.game.study.learner.attempts.map(
        (a: any) => a.id,
      ),
    ),
  ).toEqual([issued.id]);
  await page.locator("#leave").click();
  // Real contact damage from outside-origin zombies ends the run.
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      a = g.survivors[0];
    a.x = 21.5;
    a.y = 31.5;
    a.hp = 1;
    g.nextSpawn = 999999;
    g.zombies = [
      {
        id: "outside-issuance-fixture",
        floor: 0,
        x: a.x,
        y: a.y + 0.4,
        hp: 60,
        path: [],
        repath: 0,
        cooldown: 0,
        memory: 0,
        stagger: 0,
        origin: "outside",
      },
    ];
  });
  await expect(
    page.getByRole("button", { name: "Begin another run" }),
  ).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "Begin another run" }).click();
  // A new run starts once the last run's learning is saved.
  await expect(page.locator("#start-card")).toBeHidden();
  const after = await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      a = g.survivors[0],
      s = g.floors[0].stations.find((s: any) => s.encounter === "f0-room0");
    g.survivors = [a];
    g.zombies = [];
    g.nextSpawn = 999999;
    Object.assign(a, { x: s.x, y: s.y });
    return {
      run: g.id,
      archives: g.study.archives,
      attempts: g.study.learner.attempts,
      cycle: g.study.learner.cycle,
      evidence: g.study.learner.evidence,
    };
  });
  expect(after.run).not.toBe(issued.run);
  expect(after.attempts[0].status).toBe("interrupted");
  expect(
    after.archives.some(
      (e: any) =>
        e.problem?.prompt === "Read-only question 1" &&
        e.workspace === "Supplied starter",
    ),
  ).toBe(true);
  expect(after.cycle).toBe(baseline.cycle);
  expect(after.evidence).toEqual([]);
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect(page.locator("#problem")).toContainText("Read-only question 2");
  const child = await page.evaluate(
    () => (window as any).__deadAir.game.study.learner.attempts[1],
  );
  expect(child.parentAttempt).toBe(issued.id);
  expect(child.id).not.toBe(issued.id);
  await expect(page.locator("#workspace")).toHaveValue("Supplied starter");
});
