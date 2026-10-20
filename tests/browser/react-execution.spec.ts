import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { enterLegacyBuilding } from "./helpers/legacy-world";
import { isolateRunnerBridge } from "./helpers/runner-bridge";
test("container workspace React: captured checks, safe preview and edits survive leaving and reload without academic credit", async ({
  page,
}) => {
  test.skip(
    process.env.RUN_CONTAINER_BROWSER !== "1",
    "Requires isolated Docker React runtime",
  );
  test.setTimeout(45000);
  await isolateRunnerBridge(page);
  await enterLegacyBuilding(page);
  await page.evaluate(async () => {
    const d = (window as any).__deadAir,
      g = d.game,
      r = d.roadmap,
      root = "/src/";
    const { initialStudy, eligible } = await import(root + "curriculum.ts"),
      { initialLearner, reconcileGates } = await import(root + "learner.ts");
    const l = initialLearner(r, "test");
    for (const o of r.tracks.PE.objectives) l.cells[o.id].states[0] = "P";
    l.reviews = {};
    l.cycleOffset = 1;
    reconcileGates(r, l);
    g.study = initialStudy(r, "live");
    g.study.learner = l;
    const contract = eligible(r, g.study);
    if (contract.track !== "PE" || contract.depth !== 2)
      throw Error("Fixture must be eligible PE D2");
    const e = g.encounters["f0-room0"];
    e.problem = {
      title: "Synthetic React task / real browser execution",
      prompt: "Runtime integration fixture only",
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
    const station = g.floors[0].stations.find((s: any) => s.encounter === e.id);
    Object.assign(g.survivors[0], { x: station.x, y: station.y, floor: 0 });
    for (const a of g.survivors.slice(1)) a.escaped = true;
    g.zombies = [];
    g.nextSpawn = Number.MAX_SAFE_INTEGER;
    g.surge.anchor = Number.MAX_SAFE_INTEGER;
    g.status = "playing";
    document.querySelector<HTMLElement>("#start-card")!.hidden = true;
    await d.interact();
  });
  const code = `import {useState} from 'react';export default function App(){const[n,setN]=useState(0);return <button onClick={()=>setN(n+1)}>Count {n}</button>}`;
  await page.locator("#workspace").fill(code);
  const before = await page.evaluate(() => (window as any).__deadAir.game.time);
  await page
    .getByRole("button", { name: "Run React checks", exact: true })
    .click();
  await expect(page.locator("#run-code")).toBeDisabled();
  await page
    .locator("#workspace")
    .fill("export default ()=> <p>later draft</p>");
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
      e = g.encounters["f0-room0"],
      j = e.executions[0];
    return {
      job: j,
      time: g.time,
      evidence: g.study.learner.evidence.length,
      state: e.state,
      history: e.history.filter((h: any) => h.kind === "execution"),
    };
  });
  expect(result.job.code).toBe(code);
  const receiptPath = test.info().outputPath("captured-react-receipt.json");
  await writeFile(receiptPath, JSON.stringify(result.job.receipt, null, 2));
  await test.info().attach("captured-react-receipt", {
    path: receiptPath,
    contentType: "application/json",
  });
  expect(result.job.receipt.executed, JSON.stringify(result.job.receipt)).toBe(
    true,
  );
  expect(result.job.receipt.exitCode, JSON.stringify(result.job.receipt)).toBe(
    0,
  );
  expect(JSON.parse(result.job.receipt.stdout).domText).toBe("Count 1");
  expect(result.time).toBeGreaterThan(before);
  expect(result.evidence).toBe(0);
  expect(result.state).toBe("available");
  expect(JSON.stringify(result.history)).not.toContain("base64");
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect(page.locator("#workspace")).toHaveValue(
    "export default ()=> <p>later draft</p>",
  );
  await page.locator("#execution-results summary").click();
  await expect(page.locator("#execution-output")).toContainText(
    "1 of 1 attempted task checks matched",
  );
  await expect(page.locator("#execution-output")).toContainText(
    "Visible text:\nCount 1",
  );
  await expect(page.locator("#execution-preview img")).toBeVisible();
  expect(
    await page
      .locator("#execution-preview img")
      .evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth === 640,
      ),
  ).toBe(true);
  await expect(page.locator("#execution-preview figcaption")).toContainText(
    "does not establish correctness",
  );
  await page.locator("#leave").click();
  await page.getByRole("button", { name: "Save run", exact: true }).click();
  await expect(page.locator("#notice")).toContainText("Run saved locally");
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__deadAir);
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await page.locator("#execution-results summary").click();
  await expect(page.locator("#execution-preview img")).toHaveAttribute(
    "src",
    result.job.preview.dataUrl,
  );
  await page.locator("#execution-preview").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "docs/evidence/react-execution-preview.png" });
  // Imported backups cannot turn a saved preview into an outbound image request.
  let leaked = false;
  await page.route("https://example.invalid/**", (route) => {
    leaked = true;
    return route.abort();
  });
  await page.evaluate(() => {
    const e = (window as any).__deadAir.game.encounters["f0-room0"];
    e.executions[0].preview.dataUrl = "https://example.invalid/forged-preview";
  });
  await expect(page.locator("#execution-preview")).toBeHidden();
  expect(leaked).toBe(false);
});
