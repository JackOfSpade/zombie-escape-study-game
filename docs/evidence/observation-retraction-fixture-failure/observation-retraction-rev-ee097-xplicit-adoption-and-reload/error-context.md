# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: observation-retraction.spec.ts >> reviewed assisted observation retraction preserves audit and unknown status through explicit adoption and reload
- Location: tests/browser/observation-retraction.spec.ts:8:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Request native reconciliation', exact: true })

```

# Page snapshot

```yaml
- generic [ref=f1e2]:
  - banner [ref=f1e3]:
    - link "zombie-escape-study-game home" [ref=f1e4] [cursor=pointer]:
      - /url: "#"
      - generic [ref=f1e5]: ◈
      - generic [ref=f1e6]: zombie-escape-study-game
      - generic [ref=f1e7]: STUDY / ESCAPE
    - generic [ref=f1e8]:
      - generic [ref=f1e10]: Synthetic correction fixture · development profile
      - button "Settings" [ref=f1e11] [cursor=pointer]
      - button "Save run" [ref=f1e12] [cursor=pointer]
  - main [ref=f1e13]:
    - generic [ref=f1e14]:
      - generic [ref=f1e15]:
        - generic [ref=f1e16]:
          - text: FLOOR 01 / 4
          - heading "RECEPTION / INTAKE" [level=1] [ref=f1e17]
        - generic [ref=f1e18]:
          - text: RUN TIME
          - strong [ref=f1e19]: 00:00
      - generic [ref=f1e20]:
        - generic "Top-down survival game. Use WASD or arrow keys to move." [ref=f1e21]
        - generic [ref=f1e22]:
          - generic [ref=f1e23]: A REAL-TIME STUDY ESCAPE
          - heading "The dead are on your heels." [level=2] [ref=f1e24]: The dead areon your heels.
          - paragraph [ref=f1e25]: Twenty survivors. Four floors. Four seats.Build a little safety. Learn your way out.
          - button "Enter the building ↗" [ref=f1e26] [cursor=pointer]
          - generic [ref=f1e27]: Controlled transport only; no native semantic certification
        - status
        - generic [ref=f1e28]: N ↑
      - generic [ref=f1e29]:
        - generic [ref=f1e30]: WASD move
        - generic [ref=f1e31]: E interact / climb
        - generic [ref=f1e32]: G + move furniture
        - generic [ref=f1e33]: R rotate
        - generic [ref=f1e34]: Space vault
        - generic [ref=f1e35]: Esc leave terminal
      - status [ref=f1e36]: Get inside. The main entrance will not hold forever.
    - complementary [ref=f1e37]:
      - generic [ref=f1e38]:
        - generic [ref=f1e39]: SURVIVOR / YOU
        - generic [ref=f1e40]:
          - strong [ref=f1e41]: "100"
          - generic [ref=f1e42]: HEALTH
          - generic [ref=f1e43]: ACCESS LOCKED
        - generic [ref=f1e46]:
          - generic [ref=f1e47]:
            - strong [ref=f1e48]: "20"
            - generic [ref=f1e49]: STILL HERE
          - generic [ref=f1e50]:
            - strong [ref=f1e51]: "0"
            - generic [ref=f1e52]: EXTRACTED
          - generic [ref=f1e53]:
            - strong [ref=f1e54]: "0"
            - generic [ref=f1e55]: LOST
      - generic [ref=f1e56]:
        - text: NEXT MOVE
        - heading "Make it inside." [level=2] [ref=f1e57]
        - paragraph [ref=f1e58]: Find a glowing terminal. Solo work or meaningful shared-room defense can earn your credential. Hold G + movement to place furniture; rotate it to seal a doorway.
      - generic [ref=f1e59]:
        - generic [ref=f1e60]:
          - generic [ref=f1e61]: PACK / 3 / 6 KG
          - generic [ref=f1e62]: click to use
        - generic [ref=f1e63]:
          - button [ref=f1e64] [cursor=pointer]:
            - text: "1"
            - strong [ref=f1e65]: Medkit
            - generic [ref=f1e66]: 1 use · 2kgRestore 55 HP
          - button [ref=f1e67] [cursor=pointer]:
            - text: "2"
            - strong [ref=f1e68]: Flare
            - generic [ref=f1e69]: 2 uses · 1kgLight · 65s
          - group [ref=f1e70]:
            - generic "Equipment effects" [ref=f1e71] [cursor=pointer]
      - generic [ref=f1e72]:
        - generic [ref=f1e73]:
          - generic [ref=f1e74]: LEARNING CONTINUITY
          - button "Inspect ↗" [ref=f1e75] [cursor=pointer]
        - generic [ref=f1e76]:
          - generic [ref=f1e77]: PY
          - generic [ref=f1e78]:
            - strong [ref=f1e79]: Tier 1 · repair verify
            - generic [ref=f1e80]: 2 / 80 D1 checkpoints verified
          - generic [ref=f1e81]: "02"
        - generic [ref=f1e82]:
          - generic [ref=f1e83]: PE
          - generic [ref=f1e84]:
            - strong [ref=f1e85]: Tier 1 · diagnose all
            - generic [ref=f1e86]: 8 / 112 D1 checkpoints verified
          - generic [ref=f1e87]: "08"
        - paragraph [ref=f1e88]: "1 PY : 2 PE · Next: PY retention review · D1"
        - generic [ref=f1e89]: ◇ Original roadmap preserved · revision 9
      - generic [ref=f1e90]:
        - text: BUILDING FREQUENCY
        - paragraph [ref=f1e92]: The stairwell radio is quiet.
  - generic [ref=f1e93]:
    - generic [ref=f1e94]:
      - heading "Learning continuity" [level=2] [ref=f1e95]
      - button "Close" [ref=f1e96] [cursor=pointer]
    - generic [ref=f1e97]:
      - paragraph [ref=f1e98]: "PY: Tier 1 / REPAIR_VERIFY. PE: Tier 1 / DIAGNOSE_ALL. The next formal visit is PY · oldest due review. Floors and survival do not change academic depth."
      - paragraph [ref=f1e99]: Controlled transport only; no native semantic certification
      - paragraph [ref=f1e100]: "Development practice visits: 0. Source: 645d41c58c9211a9a37e0ae749361ac4a6341aaa05336ffffe6050d6d68889ef. Original evidence is retained in full; development play adds no passes."
      - button "Download updated merged roadmap" [ref=f1e101] [cursor=pointer]
      - paragraph [ref=f1e102]: Validated live study and reviewed practical evidence can update the roadmap. Downloading a save does not award learning credit.
      - button "Download original merged roadmap" [ref=f1e103] [cursor=pointer]
      - button "Export game evidence for review" [ref=f1e104] [cursor=pointer]
      - heading "Assessment queue" [level=3] [ref=f1e105]
      - paragraph [ref=f1e106]: No assessments yet.
      - group [ref=f1e107]:
        - generic "Authoritative saved scheduler" [ref=f1e108]
      - generic [ref=f1e109]:
        - heading "PY readiness" [level=3] [ref=f1e110]
        - paragraph [ref=f1e111]: Checkpoint targets 2/240 · topic transfers 0/16 · selected integrations 0/6.
        - paragraph [ref=f1e112]: "Curriculum targets: not yet met. Interview practice: not yet verified. Delayed retention: 0/2 tracked scopes verified."
        - group [ref=f1e113]:
          - generic "Transfer, integration and environment records" [ref=f1e114]
      - generic [ref=f1e115]:
        - heading "PE readiness" [level=3] [ref=f1e116]
        - paragraph [ref=f1e117]: Checkpoint targets 8/337 · topic transfers 0/20 · selected integrations 0/5.
        - paragraph [ref=f1e118]: "Curriculum targets: not yet met. Interview practice: not yet verified. Delayed retention: 0/8 tracked scopes verified."
        - paragraph [ref=f1e119]: Observed environment skills 0/6. ENV observations are separate and never block a tier gate.
        - group [ref=f1e120]:
          - generic "Transfer, integration and environment records" [ref=f1e121]
      - group [ref=f1e122]:
        - generic "Practical environment observations" [ref=f1e123]
        - option "PE:ENV01 · Keyboard, focus, screen-reader, and rendered-layout checks in a browser; related scope T06.5, T08.1–T08.3, T08.5, X08.3" [selected]
        - option "PE:ENV02 · Browser performance profiling and field/lab metric measurement; related scope T09.1, T09.3–T09.5"
        - option "PE:ENV03 · Navigating and reproducing a bug in a real repository; related scope T14.1–T14.5, I02"
        - option "PE:ENV04 · Building and running a small full-stack feature or timed UI component; related scope T19.1, T19.3, X08.3, I01, I03"
        - option "PE:ENV05 · Steering an AI coding tool in a real repository and verifying its output; related scope T20.1, T20.2, T20.4"
        - option "PE:ENV06 · Writing and executing tests, including end-to-end tests; related scope T13.1–T13.4"
        - option "No saved runner receipt" [selected]
      - group [ref=f1e124]:
        - generic "Review an updated roadmap" [active] [ref=f1e125]
        - paragraph [ref=f1e126]: Compare a merged Markdown file with your saved progress. This preview checks ancestry and row conflicts. Request native reconciliation when connected, then review and explicitly adopt its complete proposal. Comparison alone leaves learning unchanged.
        - generic [ref=f1e127]:
          - text: Choose roadmap for review
          - button "Choose roadmap for review" [ref=f1e128]
        - status [ref=f1e129]:
          - paragraph [ref=f1e130]:
            - strong [ref=f1e131]: Review required
            - text: · revision 11 · unproven
          - paragraph [ref=f1e132]: 22 changed progress rows · 0 conflicts
          - paragraph [ref=f1e133]: Complete parent is not the current saved file or a verified direct sibling. Supply the missing parent chain; revision numbers alone do not establish ancestry.
          - paragraph [ref=f1e134]: "Preview only: scheduler, evidence semantics, reserved identifiers and gates still require reconciliation before adoption. No learning state has changed."
          - group [ref=f1e135]:
            - generic "Progress differences" [ref=f1e136]
          - group [ref=f1e137]:
            - generic "Saved resume claims" [ref=f1e138]
          - group [ref=f1e139]:
            - generic "File fingerprints" [ref=f1e140]
          - paragraph [ref=f1e141]: Comparison is a snapshot taken when review started. Recheck after further study before reconciling.
      - generic [ref=f1e142]:
        - paragraph [ref=f1e143]: "Working file: revision 9. 0 reviewed import(s). Original curriculum source is preserved."
        - paragraph [ref=f1e144]: Native reconciliation proposes a complete working roadmap for your review. Adoption preserves this run's code, transcripts and original curriculum. It starts no study session and records no new demonstration.
        - paragraph [ref=f1e145]: Native roadmap reconciliation is unavailable. File comparison remains available; current learning stays active.
        - status
```

# Test source

```ts
  1   | // Controlled source reviews through actual UI. No real learner results.
  2   | import { test, expect } from "@playwright/test";
  3   | import { readFile } from "node:fs/promises";
  4   | import { setup, withdraw } from "../helpers/observation-withdrawal";
  5   | import { encode, decode, recover } from "../../src/persistence";
  6   | import { inspectMergedDocument } from "../../src/roadmap-structure";
  7   | for (const outcome of ["assisted", "contradicted"] as const) {
  8   |   test(`reviewed ${outcome} observation retraction preserves audit and unknown status through explicit adoption and reload`, async ({
  9   |     page,
  10  |   }) => {
  11  |     const g = await setup(false, false, outcome);
  12  |     g.zombies = [];
  13  |     g.nextSpawn = Number.MAX_SAFE_INTEGER;
  14  |     const fixture = recover(decode(encode(g)));
  15  |     const prepared = await withdraw(fixture, "U");
  16  |     expect(prepared.state, prepared.error).toBe("ready");
  17  |     const candidate = prepared.payload.candidate;
  18  |     await page.route("**/api/status", (route) =>
  19  |       route.fulfill({
  20  |         json: {
  21  |           mode: "study-mode",
  22  |           label: "Synthetic correction fixture",
  23  |           detail: "Controlled transport only; no native semantic certification",
  24  |           capabilities: ["reconcile-roadmap"],
  25  |         },
  26  |       }),
  27  |     );
  28  |     await page.route("**/api/bridge", async (route) => {
  29  |       const { operation, payload: p } = route.request().postDataJSON();
  30  |       expect(operation).toBe("reconcile-roadmap");
  31  |       const local = inspectMergedDocument(p.local).rows;
  32  |       await route.fulfill({
  33  |         json: {
  34  |           requestId: p.requestId,
  35  |           localHash: p.localHash,
  36  |           candidateHash: p.candidateHash,
  37  |           canonical: p.candidate,
  38  |           definitions: [],
  39  |           mappings: [],
  40  |           completeScopes: [],
  41  |           decisions: [...inspectMergedDocument(p.candidate).rows]
  42  |             .filter(([key, row]) => local.has(key) && local.get(key) !== row)
  43  |             .map(([key]) => ({
  44  |               key,
  45  |               choice: "incoming",
  46  |               rationale:
  47  |                 "Explicit source-backed withdrawal; preserve immutable observations",
  48  |             })),
  49  |           attemptUpdates: [
  50  |             {
  51  |               track: "PY",
  52  |               attemptId: "S0007-A98",
  53  |               rationale:
  54  |                 "Exact source task invalidation, not a learner failure",
  55  |             },
  56  |           ],
  57  |           rationale:
  58  |             "Synthetic review withdraws sole invalidated support while preserving all historical facts.",
  59  |         },
  60  |       });
  61  |     });
  62  |     await page.goto("/");
  63  |     await page.evaluate(async (saved) => {
  64  |       const root = "/src/",
  65  |         { save, decode } = await import(root + "persistence.ts");
  66  |       await save(decode(saved));
  67  |     }, encode(g));
  68  |     await page.reload();
  69  |     await page.waitForFunction(() => !!(window as any).__deadAir);
  70  |     const before = await page.evaluate(() =>
  71  |       JSON.stringify((window as any).__deadAir.game.study.learner),
  72  |     );
  73  |     await page.locator("#curriculum-button").click();
  74  |     await page.getByText("Review an updated roadmap", { exact: true }).click();
  75  |     await page
  76  |       .locator("#roadmap-review-file")
  77  |       .setInputFiles({
  78  |         name: `synthetic-${outcome}-correction.md`,
  79  |         mimeType: "text/markdown",
  80  |         buffer: Buffer.from(candidate),
  81  |       });
  82  |     await page
  83  |       .getByRole("button", {
  84  |         name: "Request native reconciliation",
  85  |         exact: true,
  86  |       })
> 87  |       .click();
      |        ^ Error: locator.click: Test timeout of 30000ms exceeded.
  88  |     await expect(
  89  |       page.getByRole("button", { name: "Adopt reviewed roadmap", exact: true }),
  90  |     ).toBeVisible();
  91  |     await expect(page.locator("#roadmap-adoption-controls")).toContainText(
  92  |       "judgments supported only by it",
  93  |     );
  94  |     expect(
  95  |       await page.evaluate(() =>
  96  |         JSON.stringify((window as any).__deadAir.game.study.learner),
  97  |       ),
  98  |     ).toBe(before);
  99  |     const canonical = await page.evaluate(
  100 |       () =>
  101 |         (window as any).__deadAir.game.study.roadmapReconciliations.at(-1)
  102 |           .proposal.canonical,
  103 |     );
  104 |     const download = page.waitForEvent("download");
  105 |     await page
  106 |       .getByRole("button", { name: "Download proposed roadmap", exact: true })
  107 |       .first()
  108 |       .click();
  109 |     expect(await readFile((await (await download).path())!, "utf8")).toBe(
  110 |       canonical,
  111 |     );
  112 |     await page.screenshot({
  113 |       path: `docs/evidence/observation-retraction-${outcome}.png`,
  114 |     });
  115 |     const adopted = page.waitForEvent("download");
  116 |     await page
  117 |       .getByRole("button", { name: "Adopt reviewed roadmap", exact: true })
  118 |       .click();
  119 |     await adopted;
  120 |     await expect(page.locator("#roadmap-adoption-status")).toContainText(
  121 |       "adopted and saved",
  122 |     );
  123 |     await page.reload();
  124 |     await page.waitForFunction(() => !!(window as any).__deadAir);
  125 |     const result = await page.evaluate(() => {
  126 |       const g = (window as any).__deadAir.game,
  127 |         l = g.study.learner;
  128 |       return {
  129 |         status: l.finalProgress["PY:T01"].status,
  130 |         facet: l.finalProgress["PY:T01"].facets["D4:primary"],
  131 |         raw: g.study.roadmapExport.content,
  132 |         evidence: l.evidence.length,
  133 |         visits: g.study.visits.length,
  134 |       };
  135 |     });
  136 |     expect(result.status).toBe("U");
  137 |     expect(result.facet.outcome).toBe("unknown");
  138 |     expect(result.facet.evidenceIds).toEqual(["S0007-EV98"]);
  139 |     expect(result.raw).toBe(canonical);
  140 |     expect(result.raw).toContain("<!-- ATTEMPT_UPDATE ");
  141 |     expect(result.evidence).toBe(0);
  142 |     expect(result.visits).toBe(0);
  143 |   });
  144 | }
  145 | 
```