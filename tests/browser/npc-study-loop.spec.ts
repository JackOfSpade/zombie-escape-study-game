import { expect, test } from "@playwright/test";
test("browser engine draws a pursuer away and resumes physical solo terminal work", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Enter the building" }).click();
  const result = await page.evaluate(async () => {
    const root = "/src/";
    const [
      { TestRunner },
      { emptyScenario },
      { createPlayableGame },
      { step },
    ] = await Promise.all([
      import(/* @vite-ignore */ root + "gametest/runner.ts"),
      import(/* @vite-ignore */ root + "gametest/schema.ts"),
      import(/* @vite-ignore */ root + "world.ts"),
      import(/* @vite-ignore */ root + "engine.ts"),
    ]);
    const roadmap = await (await fetch("/curriculum.json")).json();
    const s = emptyScenario();
    Object.assign(s, {
      rules: "force-fields",
      simulation: "game",
      seed: 42,
      maxTicks: 3600,
    });
    s.entities = [
      { id: "human", kind: "player", floor: 1, x: 30, y: 25 },
      { id: "worker", kind: "npc", x: 15.5, y: 15.5 },
      { id: "chaser", kind: "zombie", x: 19, y: 15.5 },
    ];
    const r = new TestRunner(s, roadmap),
      g = r.game,
      a = g.survivors[1];
    const source = createPlayableGame(42, roadmap),
      e = structuredClone(
        Object.values(source.encounters).find(
          (e: any) => e.questionRoom === "f0-room0",
        ),
      ) as any;
    Object.assign(e, { state: "in-progress", owner: a.id, npcProgress: 0 });
    g.encounters = { [e.id]: e };
    g.floors[0].stations = [{ id: "study", encounter: e.id, x: 15.5, y: 15.5 }];
    Object.assign(a, {
      intent: e.id,
      seen: ["study"],
      role: "analyst",
      risk: 0.8,
      skill: 0.8,
      thought: 20,
      milestone: 0,
      studyLoopBlockedSince: -100,
      studyLoopCheckAt: 0,
    });
    g.nextSpawn = Number.MAX_SAFE_INTEGER;
    g.surge.anchor = 10000;
    let displaced = false,
      worked = false;
    for (let i = 0; i < 2700 && a.alive; i++) {
      step(g, 1 / 30);
      if (Math.hypot(g.zombies[0].x - 15.5, g.zombies[0].y - 15.5) > 6)
        displaced = true;
      if (
        displaced &&
        a.studyLoop?.phase === "work" &&
        a.station === "study" &&
        Math.hypot(a.x - 15.5, a.y - 15.5) < 1.3 &&
        e.npcProgress > 0
      )
        worked = true;
    }
    return {
      displaced,
      worked,
      progress: e.npcProgress,
      evidence: g.study.learner.evidence.length,
      started: g.events.some((e: any) => e.type === "npc-loop-start"),
    };
  });
  expect(result.started).toBe(true);
  expect(result.displaced).toBe(true);
  expect(result.worked).toBe(true);
  expect(result.progress).toBeGreaterThan(0);
  expect(result.evidence).toBe(0);
});
