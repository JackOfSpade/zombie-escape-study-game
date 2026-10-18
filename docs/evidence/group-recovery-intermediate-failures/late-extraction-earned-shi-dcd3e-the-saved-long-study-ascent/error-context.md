# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: late-extraction.spec.ts >> earned shields and real keyboard controls extract from a crowded rooftop after the saved long-study ascent
- Location: tests/browser/late-extraction.spec.ts:4:1

# Error details

```
Error: page.evaluate: Execution context was destroyed, most likely because of a navigation
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
> 44  |     const s = await page.evaluate(async () => {
      |                          ^ Error: page.evaluate: Execution context was destroyed, most likely because of a navigation
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
  83  |     expect(s.alive, JSON.stringify(s)).toBe(true);
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
```