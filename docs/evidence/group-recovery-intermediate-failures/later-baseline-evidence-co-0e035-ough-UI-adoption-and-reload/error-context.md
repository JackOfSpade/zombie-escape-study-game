# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: later-baseline-evidence.spec.ts >> correcting an older original score retains an actually recorded later pass and review interval through UI adoption and reload
- Location: tests/browser/later-baseline-evidence.spec.ts:9:1

# Error details

```
Error: page.reload: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - waiting for navigation until "load"

```

# Test source

```ts
  1  | // Actual UI with synthetic grades, not native semantic or human achievement proof.
  2  | import { test, expect } from "@playwright/test";
  3  | import {
  4  |   laterBaselineFixture,
  5  |   laterId,
  6  |   laterScope,
  7  | } from "../helpers/later-baseline-evidence";
  8  | import { encode } from "../../src/persistence";
  9  | test("correcting an older original score retains an actually recorded later pass and review interval through UI adoption and reload", async ({
  10 |   page,
  11 | }) => {
  12 |   const { g, fixture } = await laterBaselineFixture("independent");
  13 |   const before = structuredClone(g.study.learner!);
  14 |   await page.route("**/api/status", (route) =>
  15 |     route.fulfill({
  16 |       json: {
  17 |         mode: "study-mode",
  18 |         label: "Synthetic later-evidence fixture",
  19 |         detail: "Controlled transport; no real native semantic certification",
  20 |         capabilities: ["reconcile-roadmap"],
  21 |       },
  22 |     }),
  23 |   );
  24 |   await page.route("**/api/bridge", async (route) => {
  25 |     const { operation, payload } = route.request().postDataJSON();
  26 |     expect(operation).toBe("reconcile-roadmap");
  27 |     await route.fulfill({ json: fixture.proposal(payload) });
  28 |   });
  29 |   await page.goto("/");
  30 |   await page.evaluate(async (raw) => {
  31 |     const root = "/src/",
  32 |       { decode, save } = await import(root + "persistence.ts"),
  33 |       current = (window as any).__deadAir.game;
  34 |     Object.assign(current, decode(raw));
  35 |     current.status = "playing";
  36 |     current.nextSpawn = Number.MAX_SAFE_INTEGER;
  37 |     current.zombies = [];
  38 |     await save(current);
  39 |   }, encode(g));
  40 |   await page.reload();
  41 |   await page.waitForFunction(() => !!(window as any).__deadAir);
  42 |   await page.locator("#curriculum-button").click();
  43 |   await page.getByText("Review an updated roadmap", { exact: true }).click();
  44 |   await page.locator("#roadmap-review-file").setInputFiles({
  45 |     name: "synthetic-older-score-audit.md",
  46 |     mimeType: "text/markdown",
  47 |     buffer: Buffer.from(fixture.raw),
  48 |   });
  49 |   await page
  50 |     .getByRole("button", { name: "Request native reconciliation", exact: true })
  51 |     .click();
  52 |   await expect(
  53 |     page.getByRole("button", { name: "Adopt reviewed roadmap", exact: true }),
  54 |   ).toBeVisible();
  55 |   await expect(page.locator("#roadmap-adoption-controls")).toContainText(
  56 |     "Original checkpoint review: PY:T05.2/D1",
  57 |   );
  58 |   expect(
  59 |     await page.evaluate(
  60 |       () =>
  61 |         (window as any).__deadAir.game.study.learner.reviews["PY:T05.2/D1"]
  62 |           .verifiedReviews,
  63 |     ),
  64 |   ).toBe(1);
  65 |   const downloaded = page.waitForEvent("download");
  66 |   await page
  67 |     .getByRole("button", { name: "Adopt reviewed roadmap", exact: true })
  68 |     .click();
  69 |   await downloaded;
  70 |   await expect(page.locator("#roadmap-adoption-status")).toContainText(
  71 |     "adopted and saved",
  72 |   );
> 73 |   await page.reload();
     |              ^ Error: page.reload: net::ERR_ABORTED; maybe frame was detached?
  74 |   await page.waitForFunction(() => !!(window as any).__deadAir);
  75 |   const after = await page.evaluate(() => {
  76 |     const l = (window as any).__deadAir.game.study.learner;
  77 |     return {
  78 |       state: l.cells["PY:T05.2"].states[0],
  79 |       reviews: l.reviews,
  80 |       evidence: l.evidence,
  81 |       attempts: l.attempts,
  82 |       cycle: l.cycle,
  83 |     };
  84 |   });
  85 |   expect(after.state).toBe("P");
  86 |   expect(after.reviews).toEqual(JSON.parse(JSON.stringify(before.reviews)));
  87 |   expect(after.evidence).toEqual(JSON.parse(JSON.stringify(before.evidence)));
  88 |   expect(after.attempts).toEqual(JSON.parse(JSON.stringify(before.attempts)));
  89 |   expect(after.cycle).toBe(before.cycle);
  90 |   expect(after.reviews[laterScope].verifiedReviews).toBe(1);
  91 |   expect(after.reviews[laterScope].stage).toBe(1);
  92 |   expect(after.evidence.some((ev: any) => ev.objectiveId === laterId)).toBe(
  93 |     true,
  94 |   );
  95 | });
  96 | 
```