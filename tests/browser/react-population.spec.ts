import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import type { Server } from "node:http";
// @ts-expect-error Isolated local execution server; no model provider configured.
import { createStudyBridgeServer } from "../../scripts/study-bridge-server.mjs";
import { enterLegacyBuilding } from "./helpers/legacy-world";
import { isolateRunnerBridge } from "./helpers/runner-bridge";

test("container workspace React API: ordinary population and outside arrivals continue during real execution", async ({
  page,
}) => {
  test.skip(
    process.env.RUN_CONTAINER_BROWSER !== "1",
    "Requires the already-installed isolated Docker React runtime",
  );
  test.setTimeout(45000);
  const info = test.info(),
    server: Server = createStudyBridgeServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw Error("No isolated execute server");
  await isolateRunnerBridge(page);
  await page.route("**/api/execute", async (route) => {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/execute`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://127.0.0.1:5173",
        },
        body: route.request().postData()!,
      },
    );
    await route.fulfill({
      status: response.status,
      contentType: "application/json",
      body: await response.text(),
    });
  });
  try {
    await enterLegacyBuilding(page);
    await page.evaluate(async () => {
      const d = (window as any).__deadAir,
        g = d.game,
        r = d.roadmap,
        root = "/src/";
      const { initialStudy, eligible } = await import(
          /* @vite-ignore */ root + "curriculum.ts"
        ),
        { initialLearner, reconcileGates } = await import(
          /* @vite-ignore */ root + "learner.ts"
        ),
        { claimStation } = await import(/* @vite-ignore */ root + "engine.ts");
      // Source eligibility and the human's real physical station only. All19
      // NPCs, clocks, outside arrivals, geometry and combat remain ordinary.
      const l = initialLearner(r, "test");
      for (const o of r.tracks.PE.objectives) l.cells[o.id].states[0] = "P";
      l.reviews = {};
      l.cycleOffset = 1;
      reconcileGates(r, l);
      g.study = initialStudy(r, "live");
      g.study.learner = l;
      const contract = eligible(r, g.study);
      if (contract.track !== "PE" || contract.depth !== 2)
        throw Error("Fixture needs synthetic PE D2");
      const e = g.encounters["f0-room0"],
        s = g.floors[0].stations.find((s: any) => s.encounter === e.id);
      e.problem = {
        title: "Synthetic runtime / ordinary population",
        prompt: "Runtime API integration fixture",
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
      Object.assign(g.survivors[0], { floor: 0, x: s.x, y: s.y });
      claimStation(g, g.survivors[0], s.id);
    });
    const grace = await page.evaluate(async () => {
      const root = "/src/",
        { CONFIG } = await import(/* @vite-ignore */ root + "model.ts");
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
    await page.evaluate(async (code) => {
      const d = (window as any).__deadAir,
        e = d.game.encounters["f0-room0"],
        root = "/src/",
        { edit } = await import(/* @vite-ignore */ root + "ai.ts"),
        { runWorkspace } = await import(
          /* @vite-ignore */ root + "execution.ts"
        );
      edit(d.game, e, code, e.revision, d.roadmap);
      void runWorkspace(d.game, e, d.roadmap);
    }, code);
    await expect(page.locator("#terminal")).toBeHidden();
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              (window as any).__deadAir.game.encounters["f0-room0"]
                .executions[0].status,
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
    const worldPath = info.outputPath("population-world-observations.json");
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
    await info.attach("ordinary-world-during-runtime", {
      path: worldPath,
      contentType: "application/json",
    });
    expect(result.job.code).toBe(code);
    expect(
      result.job.receipt.executed,
      JSON.stringify(result.job.receipt),
    ).toBe(true);
    expect(
      result.job.receipt.exitCode,
      JSON.stringify(result.job.receipt),
    ).toBe(0);
    const observed = JSON.parse(result.job.receipt.stdout);
    expect(observed.sandboxVerified).toBe(true);
    const verified = observed.phases.find(
      (p: any) => p.name === "sandbox-verified",
    );
    expect(verified).toBeTruthy();
    expect(observed.executionBeganMs).toBeGreaterThanOrEqual(
      verified.elapsedMs,
    );
    expect(observed.domText).toBe("Count 1");
    expect(result.job.preview.dataUrl).toMatch(/^data:image\/jpeg;base64,/);
    expect(result.time).toBeGreaterThan(before.time + 1);
    expect(result.spawned).toBeGreaterThan(before.spawned);
    expect(result.origins.every((o: string) => o === "outside")).toBe(true);
    expect(result.actors).toHaveLength(20);
    expect(
      result.actors.slice(1).some((a: any) => {
        const prior = before.actors.find((p: any) => p.id === a.id);
        return (
          prior.x !== a.x ||
          prior.y !== a.y ||
          prior.floor !== a.floor ||
          prior.activity !== a.activity
        );
      }),
    ).toBe(true);
    expect(result.evidence).toBe(0);
    await page.screenshot({ path: info.outputPath("population-runtime.png") });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
