import { expect, test } from "@playwright/test";
import { enterLegacyBuilding } from "./helpers/legacy-world";

test("a solo NPC physically fortifies, reloads mid-move, and resumes private study without a defense credential", async ({
  page,
}) => {
  await enterLegacyBuilding(page);
  const baseline = await page.evaluate(async () => {
    const root = "/src/",
      { actor } = await import(root + "world.ts"),
      { claimStation } = await import(root + "engine.ts"),
      g = (window as any).__deadAir.game,
      f = g.floors[0],
      id = "f0-room2-access3",
      s = f.stations.find((s: any) => s.encounter === id),
      a = actor("solo-student", "Solo", 2);
    Object.assign(a, {
      x: s.x,
      y: s.y,
      role: "analyst",
      risk: 0.2,
      social: 0.4,
      seen: [s.id],
    });
    Object.assign(g.survivors[0], { x: 6.5, y: 18.5 });
    g.survivors = [g.survivors[0], a];
    g.zombies = [];
    g.nextSpawn = 999999;
    g.spawned = 90;
    g.surge.anchor = 999999;
    if (!claimStation(g, a, s.id))
      throw Error("Controlled private task claim failed");
    const cover = f.furniture.find((o: any) => o.id === "f0-room2-shelf5");
    return {
      id,
      hp: cover.hp,
      start: cover.x,
      target: f.doors[2].x - 1.1,
      learning: JSON.stringify(g.study),
    };
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const g = (window as any).__deadAir.game,
          a = g.survivors[1],
          cover = g.floors[0].furniture.find(
            (o: any) => o.id === "f0-room2-shelf5",
          );
        return !!a.defensePlan && a.activity === "defending" && cover.x > 14.8;
      }),
    )
    .toBe(true);
  const saved = await page.evaluate(async () => {
    const root = "/src/",
      { save } = await import(root + "persistence.ts"),
      g = (window as any).__deadAir.game;
    await save(g);
    return {
      time: g.time,
      plan: g.survivors[1].defensePlan,
      x: g.floors[0].furniture.find((o: any) => o.id === "f0-room2-shelf5").x,
    };
  });
  expect(saved.plan.encounter).toBe(baseline.id);
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__deadAir);
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const g = (window as any).__deadAir.game,
            a = g.survivors[1],
            e = g.encounters["f0-room2-access3"],
            cover = g.floors[0].furniture.find(
              (o: any) => o.id === "f0-room2-shelf5",
            );
          return (
            cover.x > g.floors[0].doors[2].x - 1.15 &&
            a.activity === "studying" &&
            e.state === "in-progress"
          );
        }),
      { timeout: 20000 },
    )
    .toBe(true);
  const after = await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      a = g.survivors[1],
      cover = g.floors[0].furniture.find(
        (o: any) => o.id === "f0-room2-shelf5",
      );
    return {
      x: cover.x,
      hp: cover.hp,
      credited: cover.credited,
      access: a.access,
      time: g.time,
      learning: JSON.stringify(g.study),
      owner: g.encounters["f0-room2-access3"].owner,
    };
  });
  expect(Math.abs(after.x - baseline.target)).toBeLessThan(0.05);
  expect(after.x).toBeGreaterThan(saved.x);
  expect(after.time).toBeGreaterThan(saved.time);
  expect(after.hp).toBe(baseline.hp);
  expect(after.access).toEqual([]);
  expect(after.credited).toEqual([]);
  expect(after.owner).toBe("solo-student");
  expect(after.learning).toBe(baseline.learning);
  await page.screenshot({ path: "test-results/npc-solo-defense.png" });
});
