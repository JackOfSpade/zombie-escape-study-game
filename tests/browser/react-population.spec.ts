import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { enterLegacyBuilding } from "./helpers/legacy-world";
import { isolateRunnerBridge } from "./helpers/runner-bridge";

test("container workspace React: ordinary cohort and outside arrivals keep advancing during real execution", async ({
  page,
}) => {
  test.skip(
    process.env.RUN_CONTAINER_BROWSER !== "1",
    "Requires isolated Docker React runtime",
  );
  test.setTimeout(45000);
  const info = test.info();
  await isolateRunnerBridge(page);
  await enterLegacyBuilding(page);
  await page.evaluate(async () => {
    const d = (window as any).__deadAir,
      g = d.game,
      r = d.roadmap,
      root = "/src/";
    const { initialStudy, eligible } = await import(root + "curriculum.ts"),
      { initialLearner, reconcileGates } = await import(root + "learner.ts");
    // Controlled source eligibility and human terminal placement only. All 19
    // NPCs, outside arrivals, doors, furniture and physical rules stay ordinary.
    const l = initialLearner(r, "test");
    for (const o of r.tracks.PE.objectives) l.cells[o.id].states[0] = "P";
    l.reviews = {};
    l.cycleOffset = 1;
    reconcileGates(r, l);
    g.study = initialStudy(r, "live");
    g.study.learner = l;
    const contract = eligible(r, g.study);
    if (contract.track !== "PE" || contract.depth !== 2)
      throw Error("Fixture requires eligible PE D2");
    const e = g.encounters["f0-room0"],
      station = g.floors[0].stations.find((s: any) => s.encounter === e.id);
    e.problem = {
      title: "Synthetic runtime / ordinary population",
      prompt: "Controlled integration fixture",
      starter: "",
      rubric: [],
      provenance: "study-mode",
      contract,
      runtime: {
        language: "typescript",
        environment: "react",
        steps: [
          { kind: "click", selector: "button" },
          { kind: "expect-text", selector: "button", text: "Count 1" },
        ],
      },
    };
    Object.assign(g.survivors[0], { x: station.x, y: station.y, floor: 0 });
    await d.interact();
  });
  // Let the real engine reach a naturally scheduled arrival. A fast execution
  // can otherwise finish inside the opening grace or between legacy waves.
  const grace = await page.evaluate(async () => {
    const root = "/src/",
      { CONFIG } = await import(root + "model.ts");
    return CONFIG.spawnGraceSeconds;
  });
  await page.waitForFunction((grace) => {
    const g = (window as any).__deadAir.game;
    return g.time >= grace && g.nextSpawn - g.time <= 1;
  }, grace);
  const before = await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    return {
      seed: g.seed,
      time: g.time,
      spawned: g.spawned,
      actors: g.survivors.map((a: any) => ({
        id: a.id,
        x: a.x,
        y: a.y,
        floor: a.floor,
        activity: a.activity,
      })),
    };
  });
  const code =
    "import {useState} from 'react';export default function App(){const[n,setN]=useState(0);return <button onClick={()=>setN(n+1)}>Count {n}</button>}";
  await page.locator("#workspace").fill(code);
  await page
    .getByRole("button", { name: "Run React checks", exact: true })
    .click();
  await expect(page.locator("#run-code")).toBeDisabled();
  await page.locator("#leave").click();
  await expect(page.locator("#terminal")).toBeHidden();
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (window as any).__deadAir.game.encounters["f0-room0"]
              .executions?.[0]?.status,
        ),
      { timeout: 30000 },
    )
    .toBe("finished");
  const result = await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      e = g.encounters["f0-room0"];
    return {
      job: e.executions[0],
      time: g.time,
      spawned: g.spawned,
      origins: g.zombies.map((z: any) => z.origin),
      actors: g.survivors.map((a: any) => ({
        id: a.id,
        x: a.x,
        y: a.y,
        floor: a.floor,
        activity: a.activity,
      })),
      evidence: g.study.learner.evidence.length,
    };
  });
  const receiptPath = info.outputPath("react-population-receipt.json");
  await writeFile(receiptPath, JSON.stringify(result.job.receipt, null, 2));
  await info.attach("actual-population-react-receipt", {
    path: receiptPath,
    contentType: "application/json",
  });
  const worldPath = test
    .info()
    .outputPath("population-world-observations.json");
  await writeFile(
    worldPath,
    JSON.stringify(
      {
        before,
        after: {
          time: result.time,
          spawned: result.spawned,
          actors: result.actors,
          evidence: result.evidence,
        },
      },
      null,
      2,
    ),
  );
  await test.info().attach("ordinary-world-during-runtime", {
    path: worldPath,
    contentType: "application/json",
  });
  expect(result.job.code).toBe(code);
  expect(result.job.receipt.executed, JSON.stringify(result.job.receipt)).toBe(
    true,
  );
  expect(result.job.receipt.exitCode, JSON.stringify(result.job.receipt)).toBe(
    0,
  );
  const observed = JSON.parse(result.job.receipt.stdout);
  expect(observed.sandboxVerified).toBe(true);
  const verified = observed.phases.find(
    (p: any) => p.name === "sandbox-verified",
  );
  expect(verified).toBeTruthy();
  expect(observed.executionBeganMs).toBeGreaterThanOrEqual(verified.elapsedMs);
  expect(observed.domText).toBe("Count 1");
  expect(result.job.preview.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
  expect(result.time).toBeGreaterThan(before.time + 1);
  expect(result.spawned).toBeGreaterThan(before.spawned);
  expect(result.origins.every((o: string) => o === "outside")).toBe(true);
  expect(result.actors).toHaveLength(20);
  expect(
    result.actors.slice(1).some((a: any) => {
      const prior = before.actors.find((b: any) => b.id === a.id);
      return (
        prior.x !== a.x ||
        prior.y !== a.y ||
        prior.floor !== a.floor ||
        prior.activity !== a.activity
      );
    }),
  ).toBe(true);
  expect(result.evidence).toBe(0);
  await page.screenshot({
    path: info.outputPath("population-runtime.png"),
  });
});
