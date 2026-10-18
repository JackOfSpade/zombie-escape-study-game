import { expect, test } from "@playwright/test";
test("Space cannot create a vault or physical work event after the player's death", async ({
  page,
}) => {
  const downloads: string[] = [];
  page.on("download", (file) => downloads.push(file.suggestedFilename()));
  await page.goto("/");
  await page.getByRole("button", { name: "Enter the building" }).click();
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      a = g.survivors[0],
      f = g.floors[0],
      // Fresh force-field worlds keep only door/gate fields; any solid object
      // beside the dead player serves the same purpose as the old chair.
      chair =
        f.furniture.find((o: any) => o.kind === "chair") ?? f.furniture[0];
    f.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
    Object.assign(chair, { x: 12.5, y: 10.5 });
    f.furniture = [chair];
    g.survivors = [a];
    g.zombies = [];
    g.nextSpawn = 999999;
    Object.assign(a, {
      x: chair.x - chair.w / 2 - 0.55,
      y: chair.y,
      heading: { x: 1, y: 0 },
      cooldown: 0,
      alive: false,
      hp: 0,
    });
    g.status = "dead";
  });
  await expect(
    page.getByRole("button", { name: "Begin another run" }),
  ).toBeVisible();
  const baseline = await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    return { seq: g.seq, study: JSON.stringify(g.study) };
  });
  await page.locator("#world").focus();
  await page.keyboard.press("Space");
  const result = await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    return {
      seq: g.seq,
      study: JSON.stringify(g.study),
      vault: g.survivors[0].vault,
      status: g.status,
    };
  });
  expect(result.seq).toBe(baseline.seq);
  expect(result.study).toBe(baseline.study);
  expect(result.vault).toBeUndefined();
  expect(result.status).toBe("dead");
  await page.waitForTimeout(300);
  expect(downloads).toEqual([]);
});
