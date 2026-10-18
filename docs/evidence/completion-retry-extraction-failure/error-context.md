# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: late-extraction.spec.ts >> earned shields and real keyboard controls extract from a crowded rooftop after the saved long-study ascent
- Location: tests/browser/late-extraction.spec.ts:4:1

# Error details

```
Error: {"status":"dead","alive":false,"hp":0,"range":2.5756221540432374,"boarding":true,"bubble":-1,"needShield":true,"dx":0,"dy":0,"vault":false}

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
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
      - generic [ref=f1e10]: Development fallback · development profile
      - button "Settings" [ref=f1e11] [cursor=pointer]
      - button "Save run" [ref=f1e12] [cursor=pointer]
  - main [ref=f1e13]:
    - generic [ref=f1e14]:
      - generic [ref=f1e15]:
        - generic [ref=f1e16]:
          - text: ROOFTOP / EXTRACTION
          - heading "ROOFTOP / EXTRACTION" [level=1] [ref=f1e17]
        - generic [ref=f1e18]:
          - text: RUN TIME
          - strong [ref=f1e19]: 33:52
      - generic [ref=f1e20]:
        - generic "Top-down survival game. Use WASD or arrow keys to move." [active] [ref=f1e21]
        - generic [ref=f1e22]:
          - generic [ref=f1e23]: SIGNAL LOST
          - heading "Your work survives." [level=2] [ref=f1e24]
          - paragraph [ref=f1e25]: The run ended. Your terminal work and learning evidence are preserved.0 extracted · 20 lost · 2032 seconds
          - button "Begin another run ↗" [ref=f1e26] [cursor=pointer]
          - button "Export work & evidence" [ref=f1e27] [cursor=pointer]
        - status
        - generic [ref=f1e28]: N ↑
      - generic [ref=f1e29]:
        - generic [ref=f1e30]: WASD move
        - generic [ref=f1e31]: E interact / climb
        - generic [ref=f1e32]: G + move furniture
        - generic [ref=f1e33]: R rotate
        - generic [ref=f1e34]: Space vault
        - generic [ref=f1e35]: Esc leave terminal
      - status [ref=f1e36]: The run ended. Your terminal work and learning evidence are preserved.
    - complementary [ref=f1e37]:
      - generic [ref=f1e38]:
        - generic [ref=f1e39]: SURVIVOR / YOU
        - generic [ref=f1e40]:
          - strong [ref=f1e41]: "0"
          - generic [ref=f1e42]: HEALTH
          - generic [ref=f1e43]: RUN ENDED
        - generic [ref=f1e45]:
          - generic [ref=f1e46]:
            - strong [ref=f1e47]: "0"
            - generic [ref=f1e48]: STILL HERE
          - generic [ref=f1e49]:
            - strong [ref=f1e50]: "0"
            - generic [ref=f1e51]: EXTRACTED
          - generic [ref=f1e52]:
            - strong [ref=f1e53]: "20"
            - generic [ref=f1e54]: LOST
      - generic [ref=f1e55]:
        - text: NEXT MOVE
        - heading "Escape attempt ended." [level=2] [ref=f1e56]
        - paragraph [ref=f1e57]: Review your saved work or begin another run.
      - generic [ref=f1e58]:
        - generic [ref=f1e59]:
          - generic [ref=f1e60]: PACK / 1 / 6 KG
          - generic [ref=f1e61]: click to use
        - generic [ref=f1e62]:
          - button [ref=f1e63] [cursor=pointer]:
            - text: "1"
            - strong [ref=f1e64]: Flare
            - generic [ref=f1e65]: 2 uses · 1kgLight · 65s
          - group [ref=f1e66]:
            - generic "Equipment effects" [ref=f1e67] [cursor=pointer]
      - generic [ref=f1e68]:
        - generic [ref=f1e69]:
          - generic [ref=f1e70]: LEARNING CONTINUITY
          - button "Inspect ↗" [ref=f1e71] [cursor=pointer]
        - generic [ref=f1e72]:
          - generic [ref=f1e73]: PY
          - generic [ref=f1e74]:
            - strong [ref=f1e75]: Tier 1 · repair verify
            - generic [ref=f1e76]: 2 / 80 D1 checkpoints verified
          - generic [ref=f1e77]: "02"
        - generic [ref=f1e78]:
          - generic [ref=f1e79]: PE
          - generic [ref=f1e80]:
            - strong [ref=f1e81]: Tier 1 · repair verify
            - generic [ref=f1e82]: 8 / 112 D1 checkpoints verified
          - generic [ref=f1e83]: "08"
        - paragraph [ref=f1e84]: "1 PY : 2 PE · Next: PE retention review · D1"
        - generic [ref=f1e85]: ◇ Original roadmap preserved · revision 9
      - generic [ref=f1e86]:
        - text: BUILDING FREQUENCY
        - generic [ref=f1e87]:
          - paragraph [ref=f1e88]: 33:52 You was lost on Floor 5.
          - paragraph [ref=f1e89]: 33:48 You reached the rooftop.
          - paragraph [ref=f1e90]: 33:45 A four-seat helicopter is boarding.
          - paragraph [ref=f1e91]: "33:37 Solo stair credential unlocked. Development check: validates the predicted value plus the presence of explanat"
          - paragraph [ref=f1e92]: 33:34 You reached Floor 4.
```

# Test source

```ts
  1   | import { readFile, writeFile } from "node:fs/promises";
  2   | import { test, expect } from "@playwright/test";
  3   | 
  4   | test("earned shields and real keyboard controls extract from a crowded rooftop after the saved long-study ascent", async ({
  5   |   page,
  6   | }) => {
  7   |   const captured = JSON.parse(
  8   |     await readFile(
  9   |       "docs/evidence/late-extraction-range-0-floor4-world.json",
  10  |       "utf8",
  11  |     ),
  12  |   );
  13  |   expect(captured.survivors[0].alive).toBe(true);
  14  |   expect(captured.survivors[0].floor).toBe(4);
  15  |   expect(
  16  |     captured.survivors[0].inventory.filter((i: any) => i.kind === "bubble"),
  17  |   ).toHaveLength(3);
  18  |   const baseline = {
  19  |     created: captured.spawned,
  20  |     evidence: JSON.stringify(captured.study.learner.evidence),
  21  |     visits: captured.study.visits.length,
  22  |     trip: captured.helicopter.trip,
  23  |   };
  24  |   await page.goto("/");
  25  |   await page.evaluate(async (captured) => {
  26  |     const root = "/src/",
  27  |       { save } = await import(root + "persistence.ts");
  28  |     const current = (window as any).__deadAir.game;
  29  |     Object.assign(current, captured);
  30  |     await save(current);
  31  |   }, captured);
  32  |   await page.reload();
  33  |   await page.waitForFunction(
  34  |     () => (window as any).__deadAir?.game.survivors[0].floor === 4,
  35  |   );
  36  |   await expect(page.locator("#access")).toHaveText("ROOFTOP");
  37  |   await page.locator("#world").focus();
  38  |   let held = new Set<string>();
  39  |   const release = async () => {
  40  |     for (const key of held) await page.keyboard.up(key);
  41  |     held = new Set();
  42  |   };
  43  |   for (let i = 0; i < 220; i++) {
  44  |     const s = await page.evaluate(async () => {
  45  |       const g = (window as any).__deadAir.game,
  46  |         a = g.survivors[0],
  47  |         f = g.floors[4],
  48  |         root = "/src/",
  49  |         { survivorPath } = await import(root + "navigation.ts"),
  50  |         { canSee, sightRadius } = await import(root + "visibility.ts"),
  51  |         { distance } = await import(root + "model.ts");
  52  |       const route = survivorPath(f, a, { x: 21.5, y: 13.0 }),
  53  |         next = route.find((p: any) => distance(a, p) > 0.16);
  54  |       const shielded = g.effects.some(
  55  |         (e: any) =>
  56  |           e.kind === "bubble" &&
  57  |           e.floor === 4 &&
  58  |           e.until > g.time + 0.2 &&
  59  |           canSee(f, e, a, 2.65),
  60  |       );
  61  |       const threat = g.zombies.some(
  62  |         (z: any) =>
  63  |           z.hp > 0 &&
  64  |           z.floor === 4 &&
  65  |           distance(a, z) < 4.5 &&
  66  |           canSee(f, a, z, sightRadius(f)),
  67  |       );
  68  |       return {
  69  |         status: g.status,
  70  |         alive: a.alive,
  71  |         hp: a.hp,
  72  |         range: Math.hypot(a.x - 21.5, a.y - 10.5),
  73  |         boarding: g.time < g.helicopter.until,
  74  |         bubble: a.inventory.findIndex((i: any) => i.kind === "bubble"),
  75  |         needShield: threat && !shielded,
  76  |         next,
  77  |         dx: next ? next.x - a.x : 0,
  78  |         dy: next ? next.y - a.y : 0,
  79  |         vault: !!a.vault,
  80  |       };
  81  |     });
  82  |     if (s.status === "escaped") break;
> 83  |     expect(s.alive, JSON.stringify(s)).toBe(true);
      |                                        ^ Error: {"status":"dead","alive":false,"hp":0,"range":2.5756221540432374,"boarding":true,"bubble":-1,"needShield":true,"dx":0,"dy":0,"vault":false}
  84  |     if (s.boarding && s.range < 2.75) {
  85  |       await release();
  86  |       await page.keyboard.press("e");
  87  |       await page.waitForTimeout(40);
  88  |       continue;
  89  |     }
  90  |     if (s.needShield && s.bubble >= 0) {
  91  |       await release();
  92  |       await page.keyboard.press(String(s.bubble + 1));
  93  |       continue;
  94  |     }
  95  |     const desired = new Set<string>();
  96  |     if (!s.vault && s.next) {
  97  |       if (s.next.action === "vault") {
  98  |         await release();
  99  |         await page.keyboard.press("Space");
  100 |       } else {
  101 |         if (s.dx < -0.08) desired.add("a");
  102 |         if (s.dx > 0.08) desired.add("d");
  103 |         if (s.dy < -0.08) desired.add("w");
  104 |         if (s.dy > 0.08) desired.add("s");
  105 |       }
  106 |     }
  107 |     for (const key of held) if (!desired.has(key)) await page.keyboard.up(key);
  108 |     for (const key of desired)
  109 |       if (!held.has(key)) await page.keyboard.down(key);
  110 |     held = desired;
  111 |     await page.waitForTimeout(45);
  112 |   }
  113 |   await release();
  114 |   await expect(
  115 |     page.getByRole("heading", { name: "You made it." }),
  116 |   ).toBeVisible();
  117 |   await expect(page.locator("#access")).toHaveText("EXTRACTED");
  118 |   await expect(page.locator("#next-title")).toHaveText("Extraction confirmed.");
  119 |   await expect(page.locator("#pickup")).toContainText("EXTRACTED");
  120 |   await expect(page.locator("#start-card")).toHaveClass(/finished/);
  121 |   const after = await page.evaluate(() => {
  122 |     const g = (window as any).__deadAir.game;
  123 |     return {
  124 |       status: g.status,
  125 |       hp: g.survivors[0].hp,
  126 |       passengers: g.helicopter.passengers,
  127 |       trip: g.helicopter.trip,
  128 |       bubbles: g.survivors[0].inventory.filter((i: any) => i.kind === "bubble")
  129 |         .length,
  130 |       created: g.spawned,
  131 |       evidence: JSON.stringify(g.study.learner.evidence),
  132 |       visits: g.study.visits.length,
  133 |       used: g.events.filter(
  134 |         (e: any) =>
  135 |           e.type === "item" && e.actor === "human" && e.text.includes("bubble"),
  136 |       ).length,
  137 |     };
  138 |   });
  139 |   expect(after.status).toBe("escaped");
  140 |   expect(after.hp).toBeGreaterThan(0);
  141 |   expect(after.passengers).toContain("human");
  142 |   expect(after.trip).toBe(baseline.trip);
  143 |   expect(after.used).toBeGreaterThan(0);
  144 |   expect(after.used).toBeLessThanOrEqual(3);
  145 |   expect(after.bubbles).toBe(3 - after.used);
  146 |   expect(after.created).toBeGreaterThanOrEqual(baseline.created);
  147 |   expect(after.evidence).toBe(baseline.evidence);
  148 |   expect(after.visits).toBe(baseline.visits);
  149 |   await writeFile(
  150 |     "test-results/late-extraction-ui-state.json",
  151 |     JSON.stringify({ baseline, after }, null, 2),
  152 |   );
  153 |   await page.screenshot({ path: "test-results/late-extraction-ui.png" });
  154 | });
  155 | 
```