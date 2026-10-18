# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: react-execution.spec.ts >> container workspace React: captured checks, safe preview and edits survive leaving and reload without academic credit
- Location: tests/browser/react-execution.spec.ts:2:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 0
Received: 1
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - banner [ref=e3]:
    - link "zombie-escape-study-game home" [ref=e4] [cursor=pointer]:
      - /url: "#"
      - generic [ref=e5]: ◈
      - generic [ref=e6]: zombie-escape-study-game
      - generic [ref=e7]: STUDY / ESCAPE
    - generic [ref=e8]:
      - generic [ref=e10]: Development fallback · live profile
      - button "Settings" [ref=e11] [cursor=pointer]
      - button "Save run" [ref=e12] [cursor=pointer]
  - main [ref=e13]:
    - generic [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]:
          - text: FLOOR 01 / 4
          - heading "RECEPTION / INTAKE" [level=1] [ref=e17]
        - generic [ref=e18]:
          - text: RUN TIME
          - strong [ref=e19]: 00:14
      - generic [ref=e20]:
        - generic "Top-down survival game. Use WASD or arrow keys to move." [active] [ref=e21]
        - status
        - generic [ref=e22]: N ↑
      - generic [ref=e23]:
        - generic [ref=e24]: WASD move
        - generic [ref=e25]: E interact / climb
        - generic [ref=e26]: G + move furniture
        - generic [ref=e27]: R rotate
        - generic [ref=e28]: Space vault
        - generic [ref=e29]: Esc leave terminal
      - status [ref=e30]: Get inside. The main entrance will not hold forever.
    - complementary [ref=e31]:
      - generic [ref=e32]:
        - generic [ref=e33]: SURVIVOR / YOU
        - generic [ref=e34]:
          - strong [ref=e35]: "100"
          - generic [ref=e36]: HEALTH
          - generic [ref=e37]: ACCESS LOCKED
        - generic [ref=e40]:
          - generic [ref=e41]:
            - strong [ref=e42]: "1"
            - generic [ref=e43]: STILL HERE
          - generic [ref=e44]:
            - strong [ref=e45]: "0"
            - generic [ref=e46]: EXTRACTED
          - generic [ref=e47]:
            - strong [ref=e48]: "0"
            - generic [ref=e49]: LOST
      - generic [ref=e50]:
        - text: NEXT MOVE
        - heading "Buy yourself some time." [level=2] [ref=e51]
        - paragraph [ref=e52]: Find a glowing terminal. Solo work or meaningful shared-room defense can earn your credential. Hold G + movement to place furniture; rotate it to seal a doorway.
      - generic [ref=e53]:
        - generic [ref=e54]:
          - generic [ref=e55]: PACK / 3 / 6 KG
          - generic [ref=e56]: click to use
        - generic [ref=e57]:
          - button [ref=e58] [cursor=pointer]:
            - text: "1"
            - strong [ref=e59]: Medkit
            - generic [ref=e60]: 1 use · 2kgRestore 55 HP
          - button [ref=e61] [cursor=pointer]:
            - text: "2"
            - strong [ref=e62]: Flare
            - generic [ref=e63]: 2 uses · 1kgLight · 65s
          - group [ref=e64]:
            - generic "Equipment effects" [ref=e65] [cursor=pointer]
      - generic [ref=e66]:
        - generic [ref=e67]:
          - generic [ref=e68]: LEARNING CONTINUITY
          - button "Inspect ↗" [ref=e69] [cursor=pointer]
        - generic [ref=e70]:
          - generic [ref=e71]: PY
          - generic [ref=e72]:
            - strong [ref=e73]: Tier 1 · repair verify
            - generic [ref=e74]: 2 / 80 D1 checkpoints verified
          - generic [ref=e75]: "02"
        - generic [ref=e76]:
          - generic [ref=e77]: PE
          - generic [ref=e78]:
            - strong [ref=e79]: Tier 2 · diagnose all
            - generic [ref=e80]: 112 / 112 D1 checkpoints verified
          - generic [ref=e81]: "112"
        - paragraph [ref=e82]: "1 PY : 2 PE · Next: PE · D2"
        - generic [ref=e83]: ◇ Original roadmap preserved · revision 9
      - generic [ref=e84]:
        - text: BUILDING FREQUENCY
        - paragraph [ref=e86]: The stairwell radio is quiet.
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | test("container workspace React: captured checks, safe preview and edits survive leaving and reload without academic credit", async ({
  3   |   page,
  4   | }) => {
  5   |   test.skip(
  6   |     process.env.RUN_CONTAINER_BROWSER !== "1",
  7   |     "Requires isolated Docker React runtime",
  8   |   );
  9   |   test.setTimeout(45000);
  10  |   await page.goto("/");
  11  |   await page.waitForFunction(() => !!(window as any).__deadAir);
  12  |   await page.evaluate(async () => {
  13  |     const d = (window as any).__deadAir,
  14  |       g = d.game,
  15  |       r = d.roadmap,
  16  |       root = "/src/";
  17  |     const { initialStudy, eligible } = await import(root + "curriculum.ts"),
  18  |       { initialLearner, reconcileGates } = await import(root + "learner.ts");
  19  |     const l = initialLearner(r, "test");
  20  |     for (const o of r.tracks.PE.objectives) l.cells[o.id].states[0] = "P";
  21  |     l.reviews = {};
  22  |     l.cycleOffset = 1;
  23  |     reconcileGates(r, l);
  24  |     g.study = initialStudy(r, "live");
  25  |     g.study.learner = l;
  26  |     const contract = eligible(r, g.study);
  27  |     if (contract.track !== "PE" || contract.depth !== 2)
  28  |       throw Error("Fixture must be eligible PE D2");
  29  |     const e = g.encounters["f0-room0"];
  30  |     e.problem = {
  31  |       title: "Synthetic React task / real browser execution",
  32  |       prompt: "Runtime integration fixture only",
  33  |       starter: "",
  34  |       rubric: [],
  35  |       provenance: "study-mode",
  36  |       contract,
  37  |       runtime: {
  38  |         language: "typescript",
  39  |         environment: "react",
  40  |         steps: [
  41  |           { kind: "click", selector: "button" },
  42  |           { kind: "expect-text", selector: "button", text: "Count 1" },
  43  |         ],
  44  |       },
  45  |     };
  46  |     const station = g.floors[0].stations.find((s: any) => s.encounter === e.id);
  47  |     Object.assign(g.survivors[0], { x: station.x, y: station.y, floor: 0 });
  48  |     for (const a of g.survivors.slice(1)) a.escaped = true;
  49  |     g.zombies = [];
  50  |     g.nextSpawn = Number.MAX_SAFE_INTEGER;
  51  |     g.surge.anchor = Number.MAX_SAFE_INTEGER;
  52  |     g.status = "playing";
  53  |     document.querySelector<HTMLElement>("#start-card")!.hidden = true;
  54  |     await d.interact();
  55  |   });
  56  |   const code = `import {useState} from 'react';export default function App(){const[n,setN]=useState(0);return <button onClick={()=>setN(n+1)}>Count {n}</button>}`;
  57  |   await page.locator("#workspace").fill(code);
  58  |   const before = await page.evaluate(() => (window as any).__deadAir.game.time);
  59  |   await page
  60  |     .getByRole("button", { name: "Run React checks", exact: true })
  61  |     .click();
  62  |   await expect(page.locator("#run-code")).toBeDisabled();
  63  |   await page
  64  |     .locator("#workspace")
  65  |     .fill("export default ()=> <p>later draft</p>");
  66  |   await page.keyboard.press("Escape");
  67  |   await expect(page.locator("#terminal")).toBeHidden();
  68  |   await expect
  69  |     .poll(
  70  |       () =>
  71  |         page.evaluate(
  72  |           () =>
  73  |             (window as any).__deadAir.game.encounters["f0-room0"]
  74  |               .executions?.[0]?.status,
  75  |         ),
  76  |       { timeout: 30000 },
  77  |     )
  78  |     .toBe("finished");
  79  |   const result = await page.evaluate(() => {
  80  |     const g = (window as any).__deadAir.game,
  81  |       e = g.encounters["f0-room0"],
  82  |       j = e.executions[0];
  83  |     return {
  84  |       job: j,
  85  |       time: g.time,
  86  |       evidence: g.study.learner.evidence.length,
  87  |       state: e.state,
  88  |       history: e.history.filter((h: any) => h.kind === "execution"),
  89  |     };
  90  |   });
  91  |   expect(result.job.code).toBe(code);
  92  |   await test.info().attach("captured-react-receipt", {
  93  |     body: JSON.stringify(result.job.receipt, null, 2),
  94  |     contentType: "application/json",
  95  |   });
  96  |   expect(result.job.receipt.executed, JSON.stringify(result.job.receipt)).toBe(
  97  |     true,
  98  |   );
> 99  |   expect(result.job.receipt.exitCode).toBe(0);
      |                                       ^ Error: expect(received).toBe(expected) // Object.is equality
  100 |   expect(JSON.parse(result.job.receipt.stdout).domText).toBe("Count 1");
  101 |   expect(result.time).toBeGreaterThan(before);
  102 |   expect(result.evidence).toBe(0);
  103 |   expect(result.state).toBe("available");
  104 |   expect(JSON.stringify(result.history)).not.toContain("base64");
  105 |   await page.locator("#world").focus();
  106 |   await page.keyboard.press("e");
  107 |   await expect(page.locator("#workspace")).toHaveValue(
  108 |     "export default ()=> <p>later draft</p>",
  109 |   );
  110 |   await page.locator("#execution-results summary").click();
  111 |   await expect(page.locator("#execution-output")).toContainText(
  112 |     "1 of 1 attempted task checks matched",
  113 |   );
  114 |   await expect(page.locator("#execution-output")).toContainText(
  115 |     "Visible text:\nCount 1",
  116 |   );
  117 |   await expect(page.locator("#execution-preview img")).toBeVisible();
  118 |   expect(
  119 |     await page
  120 |       .locator("#execution-preview img")
  121 |       .evaluate(
  122 |         (img: HTMLImageElement) => img.complete && img.naturalWidth === 640,
  123 |       ),
  124 |   ).toBe(true);
  125 |   await expect(page.locator("#execution-preview figcaption")).toContainText(
  126 |     "does not establish correctness",
  127 |   );
  128 |   await page.keyboard.press("Escape");
  129 |   await page.getByRole("button", { name: "Save run", exact: true }).click();
  130 |   await expect(page.locator("#notice")).toContainText("Run saved locally");
  131 |   await page.reload();
  132 |   await page.waitForFunction(() => !!(window as any).__deadAir);
  133 |   await page.locator("#world").focus();
  134 |   await page.keyboard.press("e");
  135 |   await page.locator("#execution-results summary").click();
  136 |   await expect(page.locator("#execution-preview img")).toHaveAttribute(
  137 |     "src",
  138 |     result.job.preview.dataUrl,
  139 |   );
  140 |   await page.locator("#execution-preview").scrollIntoViewIfNeeded();
  141 |   await page.screenshot({ path: "docs/evidence/react-execution-preview.png" });
  142 |   // Imported backups cannot turn a saved preview into an outbound image request.
  143 |   let leaked = false;
  144 |   await page.route("https://example.invalid/**", (route) => {
  145 |     leaked = true;
  146 |     return route.abort();
  147 |   });
  148 |   await page.evaluate(() => {
  149 |     const e = (window as any).__deadAir.game.encounters["f0-room0"];
  150 |     e.executions[0].preview.dataUrl = "https://example.invalid/forged-preview";
  151 |   });
  152 |   await expect(page.locator("#execution-preview")).toBeHidden();
  153 |   expect(leaked).toBe(false);
  154 | });
  155 | 
```