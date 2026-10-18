# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: react-execution.spec.ts >> container workspace React: captured checks, safe preview and edits survive leaving and reload without academic credit
- Location: tests/browser/react-execution.spec.ts:3:1

# Error details

```
Error: {"id":"2bd6c093-a113-424e-a35a-4328a3ceb767","language":"typescript","environment":"react","startedAt":"2026-10-17T04:24:02.222Z","codeHash":"2454762708ecff246970db2e743d3a8300f2cf6db55085264be5272036e3f253","specHash":"eeb90a7b154c940d74fd3538065d6a47a03f05489de15e170ee23a7091a3648a","limits":{"network":"none","hostMounts":false,"memoryMiB":512,"cpus":0.5,"processes":256,"wallTimeMs":17000,"outputBytes":262144},"imageId":"sha256:2c29524162afd4e7b77b9afdc5f0df0a872107520d6c6a956a704f62d328994f","durationMs":13092,"status":"timeout","executed":false,"exitCode":124,"stdout":"{\n  \"schema\": 1,\n  \"environment\": \"react\",\n  \"compiled\": true,\n  \"interactionProvenance\": \"Automated issued task checks; not human-authored tests or manual browser interaction.\",\n  \"browserVersion\": \"156.0.8078.4\",\n  \"reactVersion\": \"19.3.1\",\n  \"console\": [],\n  \"errors\": [\n    \"Browser execution reached its 12-second wall limit.\"\n  ],\n  \"steps\": [],\n  \"blockedRequests\": [],\n  \"domText\": \"\",\n  \"timedOut\": true,\n  \"sandboxVerified\": true,\n  \"durationMs\": 12105\n}","stderr":"","detail":"Browser execution could not begin; no execution credit."}

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
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
  2   | import { writeFile } from "node:fs/promises";
  3   | test("container workspace React: captured checks, safe preview and edits survive leaving and reload without academic credit", async ({
  4   |   page,
  5   | }) => {
  6   |   test.skip(
  7   |     process.env.RUN_CONTAINER_BROWSER !== "1",
  8   |     "Requires isolated Docker React runtime",
  9   |   );
  10  |   test.setTimeout(45000);
  11  |   await page.goto("/");
  12  |   await page.waitForFunction(() => !!(window as any).__deadAir);
  13  |   await page.evaluate(async () => {
  14  |     const d = (window as any).__deadAir,
  15  |       g = d.game,
  16  |       r = d.roadmap,
  17  |       root = "/src/";
  18  |     const { initialStudy, eligible } = await import(root + "curriculum.ts"),
  19  |       { initialLearner, reconcileGates } = await import(root + "learner.ts");
  20  |     const l = initialLearner(r, "test");
  21  |     for (const o of r.tracks.PE.objectives) l.cells[o.id].states[0] = "P";
  22  |     l.reviews = {};
  23  |     l.cycleOffset = 1;
  24  |     reconcileGates(r, l);
  25  |     g.study = initialStudy(r, "live");
  26  |     g.study.learner = l;
  27  |     const contract = eligible(r, g.study);
  28  |     if (contract.track !== "PE" || contract.depth !== 2)
  29  |       throw Error("Fixture must be eligible PE D2");
  30  |     const e = g.encounters["f0-room0"];
  31  |     e.problem = {
  32  |       title: "Synthetic React task / real browser execution",
  33  |       prompt: "Runtime integration fixture only",
  34  |       starter: "",
  35  |       rubric: [],
  36  |       provenance: "study-mode",
  37  |       contract,
  38  |       runtime: {
  39  |         language: "typescript",
  40  |         environment: "react",
  41  |         steps: [
  42  |           { kind: "click", selector: "button" },
  43  |           { kind: "expect-text", selector: "button", text: "Count 1" },
  44  |         ],
  45  |       },
  46  |     };
  47  |     const station = g.floors[0].stations.find((s: any) => s.encounter === e.id);
  48  |     Object.assign(g.survivors[0], { x: station.x, y: station.y, floor: 0 });
  49  |     for (const a of g.survivors.slice(1)) a.escaped = true;
  50  |     g.zombies = [];
  51  |     g.nextSpawn = Number.MAX_SAFE_INTEGER;
  52  |     g.surge.anchor = Number.MAX_SAFE_INTEGER;
  53  |     g.status = "playing";
  54  |     document.querySelector<HTMLElement>("#start-card")!.hidden = true;
  55  |     await d.interact();
  56  |   });
  57  |   const code = `import {useState} from 'react';export default function App(){const[n,setN]=useState(0);return <button onClick={()=>setN(n+1)}>Count {n}</button>}`;
  58  |   await page.locator("#workspace").fill(code);
  59  |   const before = await page.evaluate(() => (window as any).__deadAir.game.time);
  60  |   await page
  61  |     .getByRole("button", { name: "Run React checks", exact: true })
  62  |     .click();
  63  |   await expect(page.locator("#run-code")).toBeDisabled();
  64  |   await page
  65  |     .locator("#workspace")
  66  |     .fill("export default ()=> <p>later draft</p>");
  67  |   await page.keyboard.press("Escape");
  68  |   await expect(page.locator("#terminal")).toBeHidden();
  69  |   await expect
  70  |     .poll(
  71  |       () =>
  72  |         page.evaluate(
  73  |           () =>
  74  |             (window as any).__deadAir.game.encounters["f0-room0"]
  75  |               .executions?.[0]?.status,
  76  |         ),
  77  |       { timeout: 30000 },
  78  |     )
  79  |     .toBe("finished");
  80  |   const result = await page.evaluate(() => {
  81  |     const g = (window as any).__deadAir.game,
  82  |       e = g.encounters["f0-room0"],
  83  |       j = e.executions[0];
  84  |     return {
  85  |       job: j,
  86  |       time: g.time,
  87  |       evidence: g.study.learner.evidence.length,
  88  |       state: e.state,
  89  |       history: e.history.filter((h: any) => h.kind === "execution"),
  90  |     };
  91  |   });
  92  |   expect(result.job.code).toBe(code);
  93  |   const receiptPath = test.info().outputPath("captured-react-receipt.json");
  94  |   await writeFile(receiptPath, JSON.stringify(result.job.receipt, null, 2));
  95  |   await test.info().attach("captured-react-receipt", {
  96  |     path: receiptPath,
  97  |     contentType: "application/json",
  98  |   });
> 99  |   expect(result.job.receipt.executed, JSON.stringify(result.job.receipt)).toBe(
      |                                                                           ^ Error: {"id":"2bd6c093-a113-424e-a35a-4328a3ceb767","language":"typescript","environment":"react","startedAt":"2026-10-17T04:24:02.222Z","codeHash":"2454762708ecff246970db2e743d3a8300f2cf6db55085264be5272036e3f253","specHash":"eeb90a7b154c940d74fd3538065d6a47a03f05489de15e170ee23a7091a3648a","limits":{"network":"none","hostMounts":false,"memoryMiB":512,"cpus":0.5,"processes":256,"wallTimeMs":17000,"outputBytes":262144},"imageId":"sha256:2c29524162afd4e7b77b9afdc5f0df0a872107520d6c6a956a704f62d328994f","durationMs":13092,"status":"timeout","executed":false,"exitCode":124,"stdout":"{\n  \"schema\": 1,\n  \"environment\": \"react\",\n  \"compiled\": true,\n  \"interactionProvenance\": \"Automated issued task checks; not human-authored tests or manual browser interaction.\",\n  \"browserVersion\": \"156.0.8078.4\",\n  \"reactVersion\": \"19.3.1\",\n  \"console\": [],\n  \"errors\": [\n    \"Browser execution reached its 12-second wall limit.\"\n  ],\n  \"steps\": [],\n  \"blockedRequests\": [],\n  \"domText\": \"\",\n  \"timedOut\": true,\n  \"sandboxVerified\": true,\n  \"durationMs\": 12105\n}","stderr":"","detail":"Browser execution could not begin; no execution credit."}
  100 |     true,
  101 |   );
  102 |   expect(result.job.receipt.exitCode, JSON.stringify(result.job.receipt)).toBe(
  103 |     0,
  104 |   );
  105 |   expect(JSON.parse(result.job.receipt.stdout).domText).toBe("Count 1");
  106 |   expect(result.time).toBeGreaterThan(before);
  107 |   expect(result.evidence).toBe(0);
  108 |   expect(result.state).toBe("available");
  109 |   expect(JSON.stringify(result.history)).not.toContain("base64");
  110 |   await page.locator("#world").focus();
  111 |   await page.keyboard.press("e");
  112 |   await expect(page.locator("#workspace")).toHaveValue(
  113 |     "export default ()=> <p>later draft</p>",
  114 |   );
  115 |   await page.locator("#execution-results summary").click();
  116 |   await expect(page.locator("#execution-output")).toContainText(
  117 |     "1 of 1 attempted task checks matched",
  118 |   );
  119 |   await expect(page.locator("#execution-output")).toContainText(
  120 |     "Visible text:\nCount 1",
  121 |   );
  122 |   await expect(page.locator("#execution-preview img")).toBeVisible();
  123 |   expect(
  124 |     await page
  125 |       .locator("#execution-preview img")
  126 |       .evaluate(
  127 |         (img: HTMLImageElement) => img.complete && img.naturalWidth === 640,
  128 |       ),
  129 |   ).toBe(true);
  130 |   await expect(page.locator("#execution-preview figcaption")).toContainText(
  131 |     "does not establish correctness",
  132 |   );
  133 |   await page.keyboard.press("Escape");
  134 |   await page.getByRole("button", { name: "Save run", exact: true }).click();
  135 |   await expect(page.locator("#notice")).toContainText("Run saved locally");
  136 |   await page.reload();
  137 |   await page.waitForFunction(() => !!(window as any).__deadAir);
  138 |   await page.locator("#world").focus();
  139 |   await page.keyboard.press("e");
  140 |   await page.locator("#execution-results summary").click();
  141 |   await expect(page.locator("#execution-preview img")).toHaveAttribute(
  142 |     "src",
  143 |     result.job.preview.dataUrl,
  144 |   );
  145 |   await page.locator("#execution-preview").scrollIntoViewIfNeeded();
  146 |   await page.screenshot({ path: "docs/evidence/react-execution-preview.png" });
  147 |   // Imported backups cannot turn a saved preview into an outbound image request.
  148 |   let leaked = false;
  149 |   await page.route("https://example.invalid/**", (route) => {
  150 |     leaked = true;
  151 |     return route.abort();
  152 |   });
  153 |   await page.evaluate(() => {
  154 |     const e = (window as any).__deadAir.game.encounters["f0-room0"];
  155 |     e.executions[0].preview.dataUrl = "https://example.invalid/forged-preview";
  156 |   });
  157 |   await expect(page.locator("#execution-preview")).toBeHidden();
  158 |   expect(leaked).toBe(false);
  159 | });
  160 | 
```