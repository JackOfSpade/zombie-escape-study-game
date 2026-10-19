import { expect, test, type Page } from "@playwright/test";

/** Opens a solo terminal with no bridge, so nothing but UI ticks touch the panel. */
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
    // A saved reply with an apostrophe and quotes: escaped markup that the
    // browser reads back differently must not be rewritten every tick.
    e.tutor.push({
      id: "synthetic-reply",
      author: "Terminal AI",
      kind: "tutor",
      text: `It's the "boundary" case: what's left after the loop?`,
      seq: 1,
      worldTime: 0,
      provenance: "synthetic",
    });
  });
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect(page.locator("#chat-input")).toBeVisible();
}

/** Select an element's text, let the game run several UI ticks, and read the selection back. */
async function selectionSurvives(page: Page, selector: string) {
  await page.evaluate((selector) => {
    const range = document.createRange();
    range.selectNodeContents(document.querySelector(selector)!);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  }, selector);
  const before = await page.evaluate(() => window.getSelection()!.toString());
  expect(before.length).toBeGreaterThan(10);
  await page.waitForTimeout(1500);
  return page.evaluate(() => window.getSelection()!.toString());
}

test("text in the terminal panel stays selected while the game keeps rendering, so it can be copied", async ({
  page,
}) => {
  await openSoloTerminal(page);
  const question = await page.locator("#problem").textContent();
  expect(await selectionSurvives(page, "#problem")).toBe(question);
  expect(await selectionSurvives(page, "#messages")).toContain(
    `It's the "boundary" case`,
  );
  expect(await selectionSurvives(page, "#conversation-context")).toContain(
    "@study",
  );
});

test("Ctrl/Cmd+C copies selected question text and paste reaches the composer", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "clipboard permissions are Chromium-only",
  );
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openSoloTerminal(page);
  await selectionSurvives(page, "#problem-title");
  const title = (await page.locator("#problem-title").textContent())!.trim();
  const modifier = process.platform === "darwin" ? "Meta" : "Control";
  await page.keyboard.press(`${modifier}+c`);
  expect(
    (await page.evaluate(() => navigator.clipboard.readText())).trim(),
  ).toBe(title);
  await page.locator("#chat-input").focus();
  await page.keyboard.press(`${modifier}+v`);
  await expect(page.locator("#chat-input")).toHaveValue(title);
});
