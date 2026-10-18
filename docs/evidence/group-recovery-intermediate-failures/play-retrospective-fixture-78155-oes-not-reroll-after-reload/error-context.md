# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: play.spec.ts >> retrospective fixture: failed catch-up retries its captured range, keeps newer code and does not reroll after reload
- Location: tests/browser/play.spec.ts:932:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('#messages')
Expected substring: "through draft v0"
Received string:    ""
Timeout: 5000ms

Call log:
  - Expect "toContainText" locator('#messages') with timeout 5000ms
  - waiting for locator('#messages')
    13 × locator resolved to <div id="messages" aria-live="polite"></div>
       - unexpected value ""

```

```yaml
- banner:
  - link "zombie-escape-study-game home":
    - /url: "#"
    - text: ◈ zombie-escape-study-game STUDY / ESCAPE
  - text: Synthetic retrospective fixture · live profile
  - button "Settings"
  - button "Save run"
- main:
  - text: FLOOR 01 / 4
  - heading "RECEPTION / INTAKE" [level=1]
  - text: RUN TIME
  - strong: 00:05
  - status
  - text: N ↑ WASD move E interact / climb G + move furniture R rotate Space vault Esc leave terminal
  - status: "Live study profile: original curriculum state retained; development visits are not academic evidence."
  - complementary:
    - text: SURVIVOR / YOU
    - strong: "100"
    - text: HEALTH ACCESS LOCKED
    - strong: "1"
    - text: STILL HERE
    - strong: "0"
    - text: EXTRACTED
    - strong: "0"
    - text: LOST NEXT MOVE
    - heading "Buy yourself some time." [level=2]
    - paragraph: Find a glowing terminal. Solo work or meaningful shared-room defense can earn your credential. Hold G + movement to place furniture; rotate it to seal a doorway.
    - text: PACK / 3 / 6 KG click to use
    - button "1Medkit 1 use · 2kg Restore 55 HP":
      - text: "1"
      - strong: Medkit
      - text: 1 use · 2kg Restore 55 HP
    - button "2Flare 2 uses · 1kg Light · 65s":
      - text: "2"
      - strong: Flare
      - text: 2 uses · 1kg Light · 65s
    - group: Equipment effects
    - text: LEARNING CONTINUITY
    - button "Inspect ↗"
    - text: PY
    - strong: Tier 1 · repair verify
    - text: 2 / 80 D1 checkpoints verified 02 PE
    - strong: Tier 1 · diagnose all
    - text: 8 / 112 D1 checkpoints verified 08
    - paragraph: "1 PY : 2 PE · Next: PY retention review · D1"
    - text: ◇ Original roadmap preserved · revision 9 BUILDING FREQUENCY
    - paragraph: The stairwell radio is quiet.
```

# Test source

```ts
  961  |       const c = payload.contract;
  962  |       await route.fulfill({
  963  |         json: {
  964  |           title: "Retained-work fixture",
  965  |           prompt: "A synthetic question with no supplied answer.",
  966  |           starter: "Saved draft",
  967  |           rubric: ["scope"],
  968  |           contract: c,
  969  |           scopeDefinitions: [
  970  |             {
  971  |               id: `${c.objectiveIds[0]}/D${c.depth}`,
  972  |               objectiveId: c.objectiveIds[0],
  973  |               depth: c.depth,
  974  |               sourceScope: c.scopes[0],
  975  |               facets: [{ id: "scope", description: "Synthetic scope" }],
  976  |             },
  977  |           ],
  978  |         },
  979  |       });
  980  |     } else if (operation === "group" && payload.mode === "catch-up") {
  981  |       requests.push(payload);
  982  |       if (requests.length === 1)
  983  |         await route.fulfill({
  984  |           status: 503,
  985  |           json: { error: "Synthetic outage" },
  986  |         });
  987  |       else {
  988  |         expect(JSON.stringify(payload)).toBe(JSON.stringify(requests[0]));
  989  |         await gate;
  990  |         await route.fulfill({
  991  |           json: {
  992  |             requestId: payload.requestId,
  993  |             sourceRevision: payload.sourceRevision,
  994  |             messages: [
  995  |               {
  996  |                 author: payload.speakers[0].id,
  997  |                 kind: "observation",
  998  |                 text: "A recorded contract note remained unvalidated. No tests were executed.",
  999  |                 refs: [payload.range.refs[0]],
  1000 |               },
  1001 |             ],
  1002 |           },
  1003 |         });
  1004 |       }
  1005 |     } else
  1006 |       await route.fulfill({
  1007 |         status: 400,
  1008 |         json: { error: "Unexpected fixture request" },
  1009 |       });
  1010 |   });
  1011 |   await page.goto("/");
  1012 |   await page.getByRole("button", { name: "Enter the building" }).click();
  1013 |   await page.getByRole("button", { name: "Settings", exact: true }).click();
  1014 |   await page
  1015 |     .getByRole("button", { name: "Start a live study run", exact: true })
  1016 |     .click();
  1017 |   await page.evaluate(() => {
  1018 |     const g = (window as any).__deadAir.game,
  1019 |       e = g.encounters["f0-room0"],
  1020 |       st = g.floors[0].stations.find((s: any) => s.encounter === e.id);
  1021 |     g.zombies = [];
  1022 |     g.nextSpawn = Number.MAX_SAFE_INTEGER;
  1023 |     for (const a of g.survivors.slice(1)) a.escaped = true;
  1024 |     e.chatCursor = g.seq;
  1025 |     e.history = e.history.filter(
  1026 |       (h: any) => !["activity", "npc-thought"].includes(h.kind),
  1027 |     );
  1028 |     Object.assign(g.survivors[0], { x: st.x, y: st.y });
  1029 |   });
  1030 |   await page.locator("#world").focus();
  1031 |   await page.keyboard.press("e");
  1032 |   await expect(page.locator("#problem-title")).toHaveText(
  1033 |     "Retained-work fixture",
  1034 |   );
  1035 |   await page.evaluate(async () => {
  1036 |     const g = (window as any).__deadAir.game,
  1037 |       e = g.encounters["f0-room0"],
  1038 |       a = g.survivors[1];
  1039 |     const path = "/src/npc-cognition.ts",
  1040 |       cognition = await import(path);
  1041 |     a.milestone = 1;
  1042 |     cognition.recordNpcWork(g, e, a, false);
  1043 |   });
  1044 |   await page.getByRole("button", { name: "Terminal AI · private" }).click();
  1045 |   await page.getByRole("button", { name: "Group frequency" }).click();
  1046 |   await expect(page.locator("#retry-catchup")).toBeVisible();
  1047 |   expect(requests).toHaveLength(1);
  1048 |   await page.locator("#work-log summary").click();
  1049 |   await expect(page.locator("#work-log-body")).toContainText(
  1050 |     "No code execution or validated correctness is claimed",
  1051 |   );
  1052 |   await page.locator("#workspace").fill("Newer draft after the outage");
  1053 |   await page.locator("#retry-catchup").click();
  1054 |   await expect.poll(() => requests.length).toBe(2);
  1055 |   const before = await page.evaluate(() => (window as any).__deadAir.game.time);
  1056 |   await page.waitForTimeout(600);
  1057 |   expect(
  1058 |     await page.evaluate(() => (window as any).__deadAir.game.time),
  1059 |   ).toBeGreaterThan(before + 0.3);
  1060 |   release();
> 1061 |   await expect(page.locator("#messages")).toContainText("through draft v0");
       |                                           ^ Error: expect(locator).toContainText(expected) failed
  1062 |   await expect(page.locator("#messages")).toContainText(
  1063 |     "summary shown now, not prior dialogue",
  1064 |   );
  1065 |   await expect(page.locator("#workspace")).toHaveValue(
  1066 |     "Newer draft after the outage",
  1067 |   );
  1068 |   const count = await page.evaluate(
  1069 |     () => (window as any).__deadAir.game.encounters["f0-room0"].group.length,
  1070 |   );
  1071 |   await page.getByRole("button", { name: "Terminal AI · private" }).click();
  1072 |   await page.getByRole("button", { name: "Group frequency" }).click();
  1073 |   expect(requests).toHaveLength(2);
  1074 |   expect(
  1075 |     await page.evaluate(
  1076 |       () => (window as any).__deadAir.game.encounters["f0-room0"].group.length,
  1077 |     ),
  1078 |   ).toBe(count);
  1079 |   await page.screenshot({
  1080 |     path: "test-results/retrospective-work-log.png",
  1081 |     fullPage: false,
  1082 |   });
  1083 |   await page.keyboard.press("Escape");
  1084 |   await page.getByRole("button", { name: "Save run", exact: true }).click();
  1085 |   await page.reload();
  1086 |   await page.waitForFunction(() => !!(window as any).__deadAir);
  1087 |   await page.locator("#world").focus();
  1088 |   await page.keyboard.press("e");
  1089 |   await expect(page.locator("#messages")).toContainText("through draft v0");
  1090 |   await expect(page.locator("#workspace")).toHaveValue(
  1091 |     "Newer draft after the outage",
  1092 |   );
  1093 |   expect(requests).toHaveLength(2);
  1094 |   expect(
  1095 |     await page.evaluate(
  1096 |       () => (window as any).__deadAir.game.study.learner.evidence.length,
  1097 |     ),
  1098 |   ).toBe(0);
  1099 | });
  1100 | 
  1101 | test("durable saves retain a large archive beyond localStorage capacity", async ({
  1102 |   page,
  1103 | }) => {
  1104 |   await page.goto("/");
  1105 |   await page.getByRole("button", { name: "Enter the building" }).click();
  1106 |   const size = 8_000_000;
  1107 |   await page.evaluate((size) => {
  1108 |     const g = (window as any).__deadAir.game,
  1109 |       e = g.encounters["f0-room0"];
  1110 |     // A controlled large-history fixture exercises the actual IndexedDB save path.
  1111 |     e.workspace = "x".repeat(size);
  1112 |     g.status = "ready";
  1113 |     document.querySelector<HTMLElement>("#start-card")!.hidden = true;
  1114 |   }, size);
  1115 |   await page.getByRole("button", { name: "Save run", exact: true }).click();
  1116 |   await expect(page.locator("#notice")).toContainText("Run saved locally", {
  1117 |     timeout: 15000,
  1118 |   });
  1119 |   await page.reload();
  1120 |   await page.waitForFunction(() => !!(window as any).__deadAir);
  1121 |   expect(
  1122 |     await page.evaluate(
  1123 |       () =>
  1124 |         (window as any).__deadAir.game.encounters["f0-room0"].workspace.length,
  1125 |     ),
  1126 |   ).toBe(size);
  1127 | });
  1128 | 
  1129 | test("container workspace: real code execution preserves a captured revision while editing, leaving, survival and reload continue", async ({
  1130 |   page,
  1131 | }) => {
  1132 |   test.skip(
  1133 |     process.env.RUN_CONTAINER_BROWSER !== "1",
  1134 |     "Opt-in real Docker/images dependency; npm run test:browser:runner",
  1135 |   );
  1136 |   await page.goto("/");
  1137 |   await page.waitForFunction(() => !!(window as any).__deadAir);
  1138 |   await page.evaluate(async () => {
  1139 |     const d = (window as any).__deadAir,
  1140 |       g = d.game,
  1141 |       r = d.roadmap;
  1142 |     const curriculumURL: string = "/src/curriculum.ts",
  1143 |       learnerURL: string = "/src/learner.ts";
  1144 |     const curriculum = await import(curriculumURL),
  1145 |       learner = await import(learnerURL);
  1146 |     const l = learner.initialLearner(r, "test");
  1147 |     for (const o of r.tracks.PY.objectives) l.cells[o.id].states[0] = "P";
  1148 |     l.reviews = {};
  1149 |     learner.reconcileGates(r, l);
  1150 |     g.study = curriculum.initialStudy(r, "live");
  1151 |     g.study.learner = l;
  1152 |     const e = g.encounters["f0-room0"],
  1153 |       c = curriculum.eligible(r, g.study);
  1154 |     e.problem = {
  1155 |       title: "Synthetic scope / actual container",
  1156 |       prompt: "Browser runner fixture only",
  1157 |       starter: "",
  1158 |       rubric: [],
  1159 |       provenance: "study-mode",
  1160 |       contract: c,
  1161 |       runtime: { language: "python" },
```