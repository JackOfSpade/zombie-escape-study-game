import { expect, test } from "@playwright/test";
import { mockNativeStudy, nativeState } from "./native-study-harness";
test("fresh run uses force fields, personal keys and native ChatGPT study", async ({
  page,
}) => {
  const errors: string[] = [];
  const relay = await mockNativeStudy(page);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Enter the building" }).click();
  const state = await page.evaluate(async () => {
    const g = (window as any).__deadAir.game;
    const r = await (await fetch("/curriculum.json")).json();
    const root = "/src/";
    const { ensureProblem } = await import(/* @vite-ignore */ root + "ai.ts");
    const { ROOM_CATALOG } = await import(
      /* @vite-ignore */ root + "office-layout.ts"
    );
    const officeKinds = new Set(Object.values(ROOM_CATALOG).flat());
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
            : !o.door &&
              officeKinds.has(o.kind) &&
              o.floor === f.index &&
              o.speed > 0,
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
  // The generated question leaves the gameplay canvas for native ChatGPT.
  await expect.poll(() => relay.calls.length).toBe(1);
  const payload = relay.calls[0].payload;
  expect(payload.problem.title).toBeTruthy();
  expect(payload.mode).toBe("terminal-direct");
  expect(
    (await nativeState(page, payload.encounterId)).session.questionFingerprint,
  ).toBe(payload.questionFingerprint);
  await expect(page.locator("#terminal")).toBeHidden();
  await expect(page.locator("#chat-input")).toBeHidden();
  await expect(page.locator("#workspace")).toBeHidden();
  await expect(page.locator("#native-study-status")).toContainText("ChatGPT");
  await expect(page.locator("#hud-keys")).toHaveText("0 keys");
  await expect(page.locator(".dashboard")).toBeHidden();
  const world = (await page.locator(".world").boundingBox())!;
  expect(world.width).toBeGreaterThan(1000);
  await page.screenshot({
    path: ".artifacts/force-fields-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#native-study-copy")).toBeVisible();
  await expect(page.locator("#terminal")).toBeHidden();
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
