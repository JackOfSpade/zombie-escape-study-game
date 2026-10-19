import { expect, test } from "@playwright/test";
test("fresh run uses force fields, personal keys and a solo study workspace", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Enter the building" }).click();
  const state = await page.evaluate(async () => {
    const g = (window as any).__deadAir.game;
    const r = await (await fetch("/curriculum.json")).json();
    const root = "/src/";
    const { ensureProblem } = await import(/* @vite-ignore */ root + "ai.ts");
    const st = g.floors[0].stations[0],
      e = g.encounters[st.encounter];
    for (const a of g.survivors.slice(1)) a.escaped = true;
    g.zombies = [];
    g.nextSpawn = Number.MAX_SAFE_INTEGER;
    Object.assign(g.survivors[0], { x: st.x, y: st.y });
    await ensureProblem(g, e, r);
    return {
      rules: g.rules,
      solo: Object.values(g.encounters).every((x: any) => x.mode === "solo"),
      // Fields have no door leaves; everything else is movable office furniture.
      fields: g.floors.every((f: any) =>
        f.furniture.every((o: any) =>
          o.field
            ? !o.door
            : /^f\d-(room\d|entry|lobby)-[a-z]+\d+-/.test(o.id) && o.speed > 0,
        ),
      ),
      inventory: g.survivors[0].inventory.length,
      startingKeys: g.survivors.every((a: any) => a.keys === 0),
      sameRoomQuestion: g.floors[0].stations
        .filter(
          (s: any) => g.encounters[s.encounter].questionRoom === e.questionRoom,
        )
        .every(
          (s: any) =>
            JSON.stringify(g.encounters[s.encounter].problem) ===
            JSON.stringify(e.problem),
        ),
    };
  });
  expect(state).toEqual({
    rules: "force-fields",
    solo: true,
    fields: true,
    inventory: 0,
    startingKeys: true,
    sameRoomQuestion: true,
  });
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  // Solo stations use the single Terminal AI conversation, with no separate
  // answer editor; keys are shown in the in-frame HUD, not a side panel.
  await expect(page.locator("#chat-input")).toBeVisible();
  await expect(page.locator("#workspace")).toBeHidden();
  await expect(page.locator("#conversation-title")).toHaveText("Terminal AI");
  await expect(page.locator("#conversation-context")).toContainText("@study");
  await expect(page.locator("#hud-keys")).toHaveText("0 keys");
  await expect(page.locator(".dashboard")).toBeHidden();
  const answer = page.locator(".answer-panel"),
    chat = page.locator(".conversation-panel");
  const a = (await answer.boundingBox())!,
    c = (await chat.boundingBox())!;
  expect(c.x).toBeGreaterThan(a.x + a.width);
  await page.locator("#chat-input").fill("A synthetic answer draft");
  await expect(page.locator("#chat-input")).toHaveValue(
    "A synthetic answer draft",
  );
  await page.screenshot({
    path: ".artifacts/force-fields-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#chat-input")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".artifacts/force-fields-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
