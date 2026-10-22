import { expect, test, type Page } from "@playwright/test";

/** A solo station question beside the player, with no threats or tutor network. */
async function openSoloQuestion(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Enter the building" }).click();
  await page.evaluate(async () => {
    const { game: g, roadmap: r } = (window as any).__deadAir;
    const root = "/src/";
    const { ensureProblem } = await import(/* @vite-ignore */ root + "ai.ts");
    g.zombies = [];
    g.nextSpawn = Number.MAX_SAFE_INTEGER;
    g.surge.anchor = Number.MAX_SAFE_INTEGER;
    const st = g.floors[0].stations[0],
      e = g.encounters[st.encounter];
    e.mode = "solo";
    e.owner = "human";
    Object.assign(g.survivors[0], { x: st.x, y: st.y });
    await ensureProblem(g, e, r);
  });
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect(page.locator("#terminal")).toBeVisible();
  return page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    return g.encounters[g.floors[0].stations[0].encounter].id as string;
  });
}
async function die(page: Page) {
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    Object.assign(g.survivors[0], { alive: false, hp: 0 });
    g.status = "dead";
  });
}
const keysHeld = (page: Page) =>
  page.evaluate(() => (window as any).__deadAir.game.survivors[0].keys ?? 0);

test("A: dying with the tutor terminal open keeps the question answerable", async ({
  page,
}) => {
  const id = await openSoloQuestion(page);
  const keysBefore = await keysHeld(page);
  await die(page);
  // The end-of-run pass runs in the UI tick; wait for spectating to begin.
  await expect(page.locator("body")).toHaveClass(/spectating/);
  await expect(page.locator("#terminal")).toBeVisible();
  await expect(page.locator("#final-question-notice")).toBeVisible();
  await expect(page.locator("#start-card")).toBeHidden();
  const input = page.locator("#chat-input");
  await expect(input).toBeEnabled();
  await input.fill("My final reasoning");
  await expect(input).toHaveValue("My final reasoning");
  await page.locator("#leave").click();
  await expect(page.locator("#terminal")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Begin another run" }),
  ).toBeVisible();
  const after = await page.evaluate((encounter) => {
    const g = (window as any).__deadAir.game;
    return { status: g.status, state: g.encounters[encounter].state };
  }, id);
  expect(after.status).toBe("dead");
  expect(after.state).not.toBe("consumed");
  expect(await keysHeld(page)).toBe(keysBefore);
});

test("B: the end card reopens an unfinished last question without a station", async ({
  page,
}) => {
  await openSoloQuestion(page);
  await page.locator("#leave").click();
  await expect(page.locator("#terminal")).toBeHidden();
  await die(page);
  const finish = page.getByRole("button", {
    name: "Finish your last question",
  });
  await expect(finish).toBeVisible();
  await finish.click();
  await expect(page.locator("#start-card")).toBeHidden();
  await expect(page.locator("#terminal")).toBeVisible();
  await expect(page.locator("#final-question-notice")).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as any).__deadAir.game.survivors[0].station,
    ),
  ).toBeUndefined();
  // Escape from inside the composer leaves the terminal, not a pause menu.
  await page.locator("#chat-input").focus();
  await page.keyboard.press("Escape");
  await expect(page.locator("#terminal")).toBeHidden();
  await expect(page.locator("#pause-menu")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Begin another run" }),
  ).toBeVisible();
  await expect(finish).toBeVisible();
});

test("C: a consumed last question offers no finish button", async ({
  page,
}) => {
  const id = await openSoloQuestion(page);
  await page.locator("#leave").click();
  await page.evaluate((encounter) => {
    (window as any).__deadAir.game.encounters[encounter].state = "consumed";
  }, id);
  await die(page);
  await expect(
    page.getByRole("button", { name: "Begin another run" }),
  ).toBeVisible();
  await expect(page.locator("#finish-question")).toHaveCount(0);
  await expect(page.locator("#terminal")).toBeHidden();
});
