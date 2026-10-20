import { restoreTerminalMode } from "./helpers/terminal-mode";
import { expect, test, type Page } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { tier4RoadmapFixture } from "../fixtures/tier4-roadmap";
import { enterLegacyBuilding, useLegacyWorld } from "./helpers/legacy-world";
async function expectHumanDrawn(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const c = document.querySelector<HTMLCanvasElement>("#world")!,
          rect = c.getBoundingClientRect();
        const dpr = Math.min(devicePixelRatio || 1, 2),
          x = (rect.width / 2) * dpr,
          y = (rect.height / 2) * dpr;
        const [r, green, b] = c
          .getContext("2d")!
          .getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
        return green > r + 20 && green > b + 20;
      }),
    )
    .toBe(true);
}
test("real browser: launch, playable movement, no typing capture, exact resume, running survival, save/reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await enterLegacyBuilding(page);
  await expectHumanDrawn(page);
  const start = await page.evaluate(
    () => (window as any).__deadAir.game.survivors[0].y,
  );
  await page.keyboard.down("w");
  await page.waitForTimeout(800);
  await page.keyboard.up("w");
  expect(
    await page.evaluate(() => (window as any).__deadAir.game.survivors[0].y),
  ).toBeLessThan(start);
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    const st = g.floors[0].stations[0];
    Object.assign(g.survivors[0], { x: st.x, y: st.y });
  });
  await page.keyboard.press("e");
  await expect(page.locator("#terminal")).toBeVisible();
  // The practice label lives in the provenance line, not in the question.
  await expect(page.locator("#terminal-provenance")).toContainText(
    "Development practice",
  );
  await expect(page.locator("#problem")).not.toBeEmpty();
  const prompt = await page.locator("#problem").textContent();
  await page
    .locator("#workspace")
    .fill("wasd · exact persisted draft / boundary reasoning");
  const pos = await page.evaluate(() => {
    const a = (window as any).__deadAir.game.survivors[0];
    return [a.x, a.y];
  });
  await page.locator("#workspace").pressSequentially("wasd");
  expect(
    await page.evaluate(() => {
      const a = (window as any).__deadAir.game.survivors[0];
      return [a.x, a.y];
    }),
  ).toEqual(pos);
  const time = await page.evaluate(() => (window as any).__deadAir.game.time);
  await page.waitForTimeout(1000);
  expect(
    await page.evaluate(() => (window as any).__deadAir.game.time),
  ).toBeGreaterThan(time + 0.5);
  const draft = await page.locator("#workspace").inputValue();
  await page.locator("#leave").click();
  await expect(page.locator("#terminal")).toBeHidden();
  await page.keyboard.press("e");
  await expect(page.locator("#terminal")).toBeVisible();
  await expect(page.locator("#workspace")).toHaveValue(draft);
  await expect(page.locator("#problem")).toHaveText(prompt!);
  await page.getByRole("button", { name: "Save run", exact: true }).click();
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__deadAir);
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    const st = g.floors[0].stations[0];
    Object.assign(g.survivors[0], { x: st.x, y: st.y });
  });
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect(page.locator("#workspace")).toHaveValue(draft);
  expect(errors).toEqual([]);
  await expectHumanDrawn(page);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await page.screenshot({
    path: "test-results/playable-terminal.png",
    fullPage: false,
  });
});
test("terminal use respects wall/door occlusion and keeps the draft when access is blocked", async ({
  page,
}) => {
  await enterLegacyBuilding(page);
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      a = g.survivors[0],
      f = g.floors[0];
    g.survivors = [a];
    g.zombies = [];
    g.nextSpawn = Number.MAX_SAFE_INTEGER;
    Object.assign(a, { x: 19.7, y: 15.5 });
    f.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
    f.stations = [{ ...f.stations[0], x: 21.3, y: 15.5 }];
    f.furniture = [];
    f.tiles[15][20] = 1;
  });
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect(page.locator("#terminal")).toBeHidden();
  await page.evaluate(() => {
    (window as any).__deadAir.game.floors[0].tiles[15][20] = 0;
  });
  await page.keyboard.press("e");
  await expect(page.locator("#terminal")).toBeVisible();
  await page.locator("#workspace").fill("draft kept behind a new obstruction");
  await page.evaluate(() => {
    (window as any).__deadAir.game.floors[0].furniture = [
      {
        id: "new-door",
        kind: "door",
        x: 20.5,
        y: 15.5,
        w: 0.15,
        h: 1,
        hp: 200,
        maxHp: 200,
        floor: 0,
        rotation: 0,
        turning: 0,
        speed: 0,
        moved: 0,
        movers: [],
        credited: [],
        destroyed: false,
        open: false,
      },
    ];
  });
  await expect(page.locator("#terminal")).toBeHidden();
  await page.locator("#world").focus();
  await page.keyboard.press("e"); // Release the latch; the leaf still blocks access.
  await expect(page.locator("#terminal")).toBeHidden();
  await page.keyboard.down("d");
  await page.waitForTimeout(600);
  await page.keyboard.up("d");
  await page.keyboard.press("e");
  await expect(page.locator("#terminal")).toBeVisible();
  await expect(page.locator("#workspace")).toHaveValue(
    "draft kept behind a new obstruction",
  );
});
test("UI settings and curriculum do not pause simulation; narrow layout remains usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 780, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Enter the building" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByText("Transmission settings")).toBeVisible();
  await page.getByLabel("Surge visual cues & sound captions").check();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Inspect" }).click();
  await expect(page.locator("#inspector")).toBeVisible();
  await expect(page.locator("#inspector-content")).toContainText(
    "Original evidence is retained",
  );
  await expect(page.locator('[data-readiness="PY"]')).toContainText(
    "Checkpoint targets 2/240 · topic transfers 0/16 · selected integrations 0/6",
  );
  await expect(page.locator('[data-readiness="PE"]')).toContainText(
    "Checkpoint targets 8/337 · topic transfers 0/20 · selected integrations 0/5",
  );
  await expect(page.locator('[data-readiness="PE"]')).toContainText(
    "Observed environment skills 0/6",
  );
  await page.locator('[data-readiness="PE"] summary').click();
  await expect(page.locator('[data-readiness="PE"]')).toContainText(
    "PE:I04 · not selected",
  );
  await expect(page.locator('[data-readiness="PE"]')).toContainText(
    "Only validated independent human evidence can complete a transfer or integration",
  );
  const beforeInspect = await page.evaluate(
    () => (window as any).__deadAir.game.time,
  );
  await page.waitForTimeout(600);
  expect(
    await page.evaluate(() => (window as any).__deadAir.game.time),
  ).toBeGreaterThan(beforeInspect + 0.3);
  await page.locator('[data-readiness="PE"] summary').click();
  const originalDownload = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Download updated merged roadmap",
      exact: true,
    })
    .click();
  const original = await originalDownload;
  expect(original.suggestedFilename()).toBe("interview_prep_roadmap.md");
  expect(await readFile((await original.path())!, "utf8")).toBe(
    await readFile("interview_prep_roadmap.md", "utf8"),
  );
  await expect(page.locator("#progress-export-status")).toContainText(
    "revision 9",
  );
  await page.screenshot({
    path: "test-results/curriculum.png",
    fullPage: true,
  });
});

test("finite 360 vision: see through closed doors in both palettes, walls and distance still hide actors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.waitForFunction(() => !!(window as any).__deadAir);
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      a = g.survivors[0],
      f = g.floors[0];
    document.querySelector<HTMLElement>("#start-card")!.hidden = true;
    g.survivors = [a];
    a.x = 20.5;
    a.y = 15.5;
    a.heading = { x: 0, y: -1 };
    f.dark = 0;
    f.stations = [];
    f.tiles = Array.from({ length: 34 }, (_, y) =>
      Array.from({ length: 44 }, (_, x) =>
        x === 0 || x === 43 || y === 0 || y === 33 || x === 23 ? 1 : 0,
      ),
    );
    for (let y = 14; y <= 16; y++) f.tiles[y][23] = 0;
    f.furniture = [
      {
        id: "visibility-door",
        kind: "door",
        floor: 0,
        x: 23.5,
        y: 15.5,
        w: 1,
        h: 3,
        hp: 240,
        maxHp: 240,
        speed: 0,
        rotation: 0,
        destroyed: false,
        movers: [],
        moved: 0,
        credited: [],
        turning: 0,
        open: false,
      },
    ];
    g.zombies = [
      {
        id: "hidden",
        x: 26.5,
        y: 15.5,
        floor: 0,
        hp: 60,
        stagger: 0,
        path: [],
      },
      {
        id: "visible-behind-player",
        x: 18.5,
        y: 15.5,
        floor: 0,
        hp: 60,
        stagger: 0,
        path: [],
      },
      {
        id: "too-far",
        x: 6.5,
        y: 15.5,
        floor: 0,
        hp: 60,
        stagger: 0,
        path: [],
      },
    ];
  });
  async function pixels() {
    return page.evaluate(async () => {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const c = document.querySelector<HTMLCanvasElement>("#world")!,
        rect = c.getBoundingClientRect(),
        dpr = c.width / rect.width,
        scale = Math.min(rect.width, rect.height) / 24,
        a = (window as any).__deadAir.game.survivors[0],
        ox = rect.width / 2 - a.x * scale,
        oy = rect.height / 2 - a.y * scale,
        ctx = c.getContext("2d")!;
      const pixel = (x: number, y: number) =>
        Array.from(
          ctx.getImageData(
            Math.floor((ox + x * scale) * dpr),
            Math.floor((oy + y * scale) * dpr),
            1,
            1,
          ).data,
        );
      return {
        hidden: pixel(26.5, 15.5),
        visible: pixel(18.5, 15.5),
        far: pixel(6.5, 15.5),
        background: Array.from(ctx.getImageData(1, 1, 1, 1).data),
      };
    });
  }
  const closed = await pixels();
  expect(closed.hidden).not.toEqual(closed.background);
  expect(closed.hidden[1]).toBeGreaterThan(closed.hidden[2] + 10);
  expect(closed.far).toEqual(closed.background);
  expect(closed.visible).not.toEqual(closed.background);
  await page.screenshot({
    path: "test-results/visibility-closed-door.png",
    fullPage: true,
  });
  await page.evaluate(() => {
    (window as any).__deadAir.game.floors[0].furniture[0].open = true;
  });
  const opened = await pixels();
  expect(opened.hidden).not.toEqual(opened.background);
  expect(opened.hidden[1]).toBeGreaterThan(opened.hidden[2] + 10);
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    g.floors[0].furniture[0].open = false;
    g.surge.state = "active";
  });
  const surge = await pixels();
  expect(surge.hidden).not.toEqual(surge.background);
  expect(surge.hidden[1]).toBeGreaterThan(surge.hidden[2] + 10);
  expect(surge.visible).not.toEqual(surge.background);
  await page.screenshot({
    path: "test-results/visibility-surge.png",
    fullPage: true,
  });
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    for (let y = 14; y <= 16; y++) g.floors[0].tiles[y][23] = 1;
  });
  const wallSurge = await pixels();
  expect(wallSurge.hidden).toEqual(wallSurge.background);
  await page.evaluate(() => {
    (window as any).__deadAir.game.surge.state = "calm";
  });
  const wallNormal = await pixels();
  expect(wallNormal.hidden).toEqual(wallNormal.background);
  expect(wallNormal.far).toEqual(wallNormal.background);
  expect(errors).toEqual([]);
});

test("development partial work survives actual outside combat death and a fresh run without transferring its lock", async ({
  page,
}) => {
  await enterLegacyBuilding(page);
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      s = g.floors[0].stations[0];
    g.survivors[0].x = s.x;
    g.survivors[0].y = s.y;
  });
  await page.keyboard.press("e");
  await page
    .locator("#workspace")
    .fill("Preserved human partial reasoning: a boundary remains unresolved.");
  const originalPrompt = await page.locator("#problem").textContent();
  await page.locator("#leave").click();
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      a = g.survivors[0];
    a.x = 21.5;
    a.y = 31.5;
    g.survivors = [a];
    g.nextSpawn = 99999;
    g.zombies = [-0.6, 0, 0.6].map((dx, i) => ({
      id: `outside-combat-fixture-${i}`,
      floor: 0,
      x: a.x + dx,
      y: a.y + 0.5,
      hp: 60,
      path: [],
      repath: 0,
      cooldown: 0,
      memory: 0,
      stagger: 0,
      origin: "outside",
    }));
  });
  await expect(
    page.getByRole("button", { name: "Begin another run" }),
  ).toBeVisible({ timeout: 10000 });
  await expect(page.locator("#next-title")).toHaveText("Escape attempt ended.");
  await expect(page.locator("#start-card")).toHaveClass(/finished/);
  const archivedRun = await page.evaluate(
    () => (window as any).__deadAir.game.id,
  );
  await page.getByRole("button", { name: "Begin another run" }).click();
  const state = await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    return {
      id: g.id,
      archives: g.study.archives,
      evidence: g.study.learner.evidence,
      attempts: g.study.learner.attempts,
    };
  });
  expect(state.id).not.toBe(archivedRun);
  await expect(page.locator("#start-card")).toBeHidden();
  await expect(page.locator("#next-title")).toHaveText("Make it inside.");
  expect(
    state.archives.some(
      (e: any) =>
        e.workspace ===
          "Preserved human partial reasoning: a boundary remains unresolved." &&
        e.problem.prompt === originalPrompt,
    ),
  ).toBeTruthy();
  expect(state.evidence).toEqual([]);
  expect(state.attempts).toEqual([]);
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      s = g.floors[0].stations[0];
    g.survivors[0].x = s.x;
    g.survivors[0].y = s.y;
  });
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect(page.locator("#workspace")).not.toHaveValue(
    "Preserved human partial reasoning: a boundary remains unresolved.",
  );
});

for (const fixtureKind of ["checkpoint", "transfer", "historical"] as const) {
  const finalRequirement = fixtureKind === "transfer",
    historical = fixtureKind === "historical";
  test(`controlled bridge fixture: ${finalRequirement ? "Tier 4 transfer" : historical ? "historical partial proof" : "ordinary checkpoint"}, real request flow and independent learning transaction`, async ({
    page,
  }) => {
    // This exercises the adapter with isolated synthetic responses. It does not
    // establish that any genuine native ChatGPT Study Mode service is connected.
    if (finalRequirement) {
      const source = tier4RoadmapFixture(
        JSON.parse(await readFile("public/curriculum.json", "utf8")),
      );
      await page.route("**/curriculum.json", (route) =>
        route.fulfill({ json: source }),
      );
    }
    await page.route("**/api/status", (route) =>
      route.fulfill({
        json: {
          mode: "study-mode",
          label: "Test bridge fixture",
          detail: "Synthetic transport fixture only",
          capabilities: ["generate", "tutor", "group", "complete", "assess"],
        },
      }),
    );
    await page.route("**/api/bridge", async (route) => {
      const { operation, payload } = route.request().postDataJSON();
      if (operation === "generate") {
        const c = payload.contract;
        await route.fulfill({
          json: {
            title: "Isolated bridge workflow",
            prompt: "A synthetic task for browser integration verification.",
            starter: "",
            rubric: ["scope"],
            contract: c,
            scopeDefinitions: [
              {
                id: `${c.objectiveIds[0]}/${c.kind === "transfer" || c.kind === "integration" ? "T4" : `D${c.depth}`}`,
                objectiveId: c.objectiveIds[0],
                depth: c.depth,
                sourceScope: c.scopes[0],
                facets: historical
                  ? [
                      {
                        id: "historical",
                        description:
                          "Preserve next-node access before changing a linked reference",
                      },
                      {
                        id: "scope",
                        description:
                          "Explain the remaining end-of-chain boundary",
                      },
                    ]
                  : [
                      {
                        id: "scope",
                        description:
                          "Synthetic complete scope for this test fixture",
                      },
                    ],
              },
            ],
          },
        });
        return;
      }
      if (operation === "complete") {
        await route.fulfill({
          json: {
            complete: true,
            feedback: "Fixture completion response.",
            qualified: ["human"],
          },
        });
        return;
      }
      if (operation === "assess") {
        const packet = payload.packet,
          c = packet.problem.contract,
          artifact = packet.history.find(
            (h: any) => h.author === "human" && h.kind === "edit",
          );
        if (historical)
          expect(packet.historicalSourceContext).toContain("| S0006-EV16 |");
        await route.fulfill({
          json: {
            historicalMappings: historical
              ? [
                  {
                    scopeId: packet.problem.scopeDefinitions[0].id,
                    facet: "historical",
                    sourceHash: packet.sourceHash,
                    evidenceIds: ["S0006-EV16"],
                    outcome: "independent",
                    rationale:
                      "Synthetic explicit narrow source-to-facet equivalence review",
                  },
                ]
              : undefined,
            findings: [
              {
                objectiveId: c.objectiveIds[0],
                facet: "scope",
                depth: c.depth,
                outcome: "independent",
                evidence: [artifact.seq],
                completeCheckpointScope: true,
                execution: "not-run",
                rationale: "Explicitly synthetic browser-test finding.",
              },
            ],
            visitOutcome: "usable",
            scopeReviews: [
              {
                id: packet.problem.scopeDefinitions[0].id,
                completeCoverage: true,
                rationale: "Synthetic scope review.",
              },
            ],
            helpAttributions: (packet.assistanceSources ?? []).map(
              (m: any) => ({
                messageId: m.id,
                facets: [],
                rationale:
                  "Fixture prompt contains a question only and supplies no answer.",
              }),
            ),
          },
        });
        return;
      }
      await route.fulfill({ json: { text: "Fixture guidance" } });
    });
    await enterLegacyBuilding(page);
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page
      .getByRole("button", { name: "Start a live study run", exact: true })
      .click();
    // A new live run is a fresh force-field world; keep the legacy fixture.
    await useLegacyWorld(page);
    await page.evaluate(
      (flags) => {
        const g = (window as any).__deadAir.game,
          s = g.floors[0].stations[0];
        if (flags.finalRequirement) {
          g.study.learner.reviews = {};
          g.study.learner.tracks.PY.cleared = 3;
          g.study.learner.tracks.PE.cleared = 3;
        }
        if (flags.historical) {
          g.study.learner.reviews = {};
          g.study.learner.tracks.PY.queue = ["T07"];
        }
        g.survivors[0].x = s.x;
        g.survivors[0].y = s.y;
      },
      { finalRequirement, historical },
    );
    await page.locator("#world").focus();
    await page.keyboard.press("e");
    await expect(page.locator("#problem-title")).toHaveText(
      "Isolated bridge workflow",
    );
    await page
      .locator("#workspace")
      .fill(
        "Human-authored integration fixture reasoning, covering the defined scope without any asserted runtime execution.",
      );
    await page.getByRole("button", { name: "Submit answer" }).click();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const g = (window as any).__deadAir.game;
          return {
            evidence: g.study.learner.evidence.length,
            reviews: g.study.assessments
              .filter((a: any) => a.status === "review-required")
              .map((a: any) => a.error ?? a.rationale ?? a),
          };
        }),
      )
      .toEqual({ evidence: 1, reviews: [] });
    const result = await page.evaluate(() => {
      const g = (window as any).__deadAir.game;
      return {
        profile: g.study.profile,
        access: g.survivors[0].access,
        attempt: g.study.learner.attempts[0].id,
        outcome: g.study.assessments[0].status,
        cycle: g.study.learner.cycle,
        sourcePasses: g.study.learner.cells["PY:T05.2"].states[0],
      };
    });
    expect(result).toEqual({
      profile: "live",
      access: [0],
      attempt: "S0008-A01",
      outcome: "applied",
      cycle: 1,
      sourcePasses: "P",
    });
    if (finalRequirement) {
      expect(
        await page.evaluate(() => {
          const l = (window as any).__deadAir.game.study.learner;
          return {
            status: l.finalProgress["PY:T01"].status,
            ordinaryCells: Object.keys(l.cells).length,
            fakeCell: l.cells["PY:T01"],
          };
        }),
      ).toEqual({ status: "P", ordinaryCells: 192, fakeCell: undefined });
    }
    if (historical)
      expect(
        await page.evaluate(() => {
          const l = (window as any).__deadAir.game.study.learner;
          return {
            status: l.cells["PY:T07.1"].states[0],
            oldRefs: l.cells["PY:T07.1"].facets["D1:historical"].evidenceIds,
            newObservations: l.evidence.length,
            reconciliations: l.historicalReviews.length,
          };
        }),
      ).toEqual({
        status: "P",
        oldRefs: ["S0006-EV16"],
        newObservations: 1,
        reconciliations: 1,
      });
    await page.locator("#leave").click();
    await page.getByRole("button", { name: "Inspect" }).click();
    await expect(page.locator("#inspector-content")).toContainText(
      "Game-recorded academic visits: 1",
    );
    if (historical) {
      await page
        .getByText("Historical facet reconciliations (1)", { exact: true })
        .click();
      await expect(page.locator("#inspector-content")).toContainText(
        "S0006-EV16 observed 2026-09-18",
      );
      await expect(page.locator("#inspector-content")).toContainText(
        "Reconciliation dates record review activity, not new human demonstrations",
      );
    }
    const firstDownload = page.waitForEvent("download");
    await page
      .getByRole("button", {
        name: "Download updated merged roadmap",
        exact: true,
      })
      .click();
    const first = await firstDownload;
    const exported = await readFile((await first.path())!, "utf8");
    expect(exported).toContain("revision: 10\nprevious_revision: 9");
    expect(exported).toContain("S0008-EV01");
    if (historical) {
      expect(exported).toContain(
        "Historical facet reconciliation (no new observation IDs)",
      );
      expect([...exported.matchAll(/^\| S0006-EV16 \|/gm)]).toHaveLength(1);
    }
    if (finalRequirement) {
      expect(exported).toMatch(/\| T01 \| P \|[^\n]*S0008-EV01/);
      expect(exported).toContain("PY:T01/T4");
    }
    expect(exported).not.toContain(
      "Human-authored integration fixture reasoning",
    );
    await expect(page.locator("#progress-export-status")).toContainText(
      "revision 10",
    );
    await page.reload();
    await page.waitForFunction(() => !!(window as any).__deadAir);
    await page.getByRole("button", { name: "Inspect" }).click();
    const secondDownload = page.waitForEvent("download");
    await page
      .getByRole("button", {
        name: "Download updated merged roadmap",
        exact: true,
      })
      .click();
    const second = await secondDownload;
    expect(await readFile((await second.path())!, "utf8")).toBe(exported);
  });
}

test("group proposal fixture: private tutor context stays private and replies become assistance only when displayed", async ({
  page,
}) => {
  let releaseTutor!: () => void,
    tutorQueued = false,
    groupRequested = false;
  const tutorGate = new Promise<void>((resolve) => {
    releaseTutor = resolve;
  });
  await page.route("**/api/status", (route) =>
    route.fulfill({
      json: {
        mode: "study-mode",
        label: "Synthetic conversation fixture",
        detail: "Not a native-service verification",
        capabilities: ["generate", "tutor", "group", "complete", "assess"],
      },
    }),
  );
  await page.route("**/api/bridge", async (route) => {
    const { operation, payload } = route.request().postDataJSON();
    if (operation === "generate") {
      const c = payload.contract;
      await route.fulfill({
        json: {
          title: "Synthetic group workspace",
          prompt: "A fixture question with no supplied answer.",
          starter: "Original shared draft",
          rubric: ["scope"],
          contract: c,
          scopeDefinitions: [
            {
              id: `${c.objectiveIds[0]}/D${c.depth}`,
              objectiveId: c.objectiveIds[0],
              depth: c.depth,
              sourceScope: c.scopes[0],
              facets: [
                { id: "scope", description: "Complete synthetic scope" },
              ],
            },
          ],
        },
      });
    } else if (operation === "tutor") {
      tutorQueued = true;
      await tutorGate;
      await route.fulfill({
        json: { text: "PRIVATE_TUTOR_REPLY", complete: false },
      });
    } else if (operation === "group") {
      groupRequested = true;
      expect(JSON.stringify(payload)).not.toContain("PRIVATE_TUTOR_");
      expect(payload.speakers[0].profile.topics).toBeTruthy();
      await route.fulfill({
        json: {
          requestId: payload.requestId,
          sourceRevision: payload.sourceRevision,
          messages: [
            {
              author: payload.speakers[0].id,
              kind: "proposal",
              text: "Proposed boundary check: consider an empty input. This is a candidate, not an executed test.",
              refs: [payload.events.at(-1).seq],
              patch: {
                prefix: payload.workspace.length,
                removed: "",
                inserted: "\nNPC boundary candidate",
              },
            },
          ],
        },
      });
    } else
      await route.fulfill({
        status: 400,
        json: { error: "Unexpected fixture operation" },
      });
  });
  await enterLegacyBuilding(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("button", { name: "Start a live study run", exact: true })
    .click();
  // A new live run is a fresh force-field world; keep the legacy fixture.
  await useLegacyWorld(page);
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      f = g.floors[0],
      st = f.stations[0];
    g.zombies = [];
    g.nextSpawn = Number.MAX_SAFE_INTEGER;
    for (const a of g.survivors.slice(2)) a.escaped = true;
    Object.assign(g.survivors[0], { x: st.x, y: st.y });
    const other = f.stations.find(
      (s: any) => s.encounter === st.encounter && s.id !== st.id,
    )!;
    Object.assign(g.survivors[1], {
      x: other.x,
      y: other.y,
      intent: st.encounter,
      station: other.id,
      thought: 10,
      floor: 0,
    });
  });
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect(page.locator("#problem-title")).toHaveText(
    "Synthetic group workspace",
  );
  await restoreTerminalMode(page, "tutor");
  // The solo composer is labelled "Message Terminal AI".
  await page.locator("#chat-input").fill("PRIVATE_TUTOR_QUESTION");
  await page.locator("#chat-form button").click();
  await expect.poll(() => tutorQueued).toBe(true);
  // A private terminal-dialogue reply applies only while the room is still the
  // learner's solo conversation, so it lands while the terminal is closed and
  // nothing is displayed; the room then reopens as the shared group fixture.
  await page.locator("#leave").click();
  await expect(page.locator("#terminal")).toBeHidden();
  releaseTutor();
  await page.waitForFunction(() =>
    (window as any).__deadAir.game.encounters["f0-room0"].tutor.some(
      (m: any) => m.text === "PRIVATE_TUTOR_REPLY",
    ),
  );
  await page.evaluate(async () => {
    const g = (window as any).__deadAir.game,
      e = g.encounters["f0-room0"],
      a = g.survivors[1],
      root = "/src/";
    const { openChat } = await import(/* @vite-ignore */ root + "ai.ts");
    e.mode = "shared";
    delete e.owner;
    void openChat(g, e);
    // Restored solo history temporarily releases group workers; re-establish
    // the synthetic shared respondent for the shared terminal fixture.
    a.intent = e.id;
    a.thought = 10;
    a.activity = "working";
  });
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect(page.locator("#conversation-title")).toHaveText("Group chat");
  expect(
    await page.evaluate(
      () =>
        (window as any).__deadAir.game.encounters["f0-room0"].tutor.find(
          (m: any) => m.text === "PRIVATE_TUTOR_REPLY",
        ).presented === undefined,
    ),
  ).toBe(true);
  await expect(page.locator("#messages")).not.toContainText(
    "PRIVATE_TUTOR_REPLY",
  );
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Can someone propose a boundary check?");
  await page.locator("#chat-form button").click();
  await expect(page.locator("#messages")).toContainText(
    "not executed or validated",
  );
  expect(groupRequested).toBe(true);
  await expect(page.locator("#workspace")).toHaveValue("Original shared draft");
  await page.screenshot({
    path: "test-results/group-proposal.png",
    fullPage: false,
  });
  expect(
    await page.evaluate(() => {
      const g = (window as any).__deadAir.game,
        e = g.encounters["f0-room0"];
      return {
        evidence: g.study.learner.evidence.length,
        proposalAuthor: e.history.find((h: any) => h.kind === "npc-proposal")
          .author,
        privateShown:
          e.tutor.find((m: any) => m.text === "PRIVATE_TUTOR_REPLY")
            .presented !== undefined,
      };
    }),
  ).toEqual({ evidence: 0, proposalAuthor: "npc-0", privateShown: false });
  await restoreTerminalMode(page, "tutor");
  await expect(page.locator("#messages")).toContainText("PRIVATE_TUTOR_REPLY");
  expect(
    await page.evaluate(
      () =>
        (window as any).__deadAir.game.encounters["f0-room0"].tutor.find(
          (m: any) => m.text === "PRIVATE_TUTOR_REPLY",
        ).presented !== undefined,
    ),
  ).toBe(true);
  await restoreTerminalMode(page, "group");
  const candidate = page.locator("#workspace-proposals details").first();
  await candidate.locator("summary").click();
  await expect(candidate).toContainText("NPC boundary candidate");
  await expect(page.locator("#workspace")).toHaveValue("Original shared draft");
  await candidate
    .getByRole("button", { name: "Apply NPC edit", exact: true })
    .click();
  await expect(page.locator("#workspace")).toHaveValue(
    "Original shared draft\nNPC boundary candidate",
  );
  await expect(page.locator("#revision")).toContainText("v1");
  expect(
    await page.evaluate(() => {
      const g = (window as any).__deadAir.game,
        e = g.encounters["f0-room0"];
      return {
        author: e.history.find((h: any) => h.kind === "edit").author,
        evidence: g.study.learner.evidence.length,
        applied: e.proposals[0].state,
      };
    }),
  ).toEqual({ author: "npc-0", evidence: 0, applied: "applied" });
  await page.screenshot({
    path: "test-results/reviewed-npc-edit.png",
    fullPage: false,
  });
  await restoreTerminalMode(page, "group");
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      a = g.survivors[1];
    a.intent = "f0-room0";
    a.thought = 10;
    a.activity = "working";
  });
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Suggest another concrete edit for this revision.");
  await page.locator("#chat-form button").click();
  await expect(page.locator("#workspace-proposals details")).toHaveCount(2);
  await page.locator("#workspace").fill("newer human workspace");
  const stale = page.locator("#workspace-proposals details").nth(1);
  await stale.locator("summary").click();
  await expect(stale).toContainText("stale");
  await expect(
    stale.getByRole("button", { name: "Apply NPC edit", exact: true }),
  ).toBeDisabled();
  await stale
    .getByRole("button", { name: "Dismiss candidate", exact: true })
    .click();
  await expect(stale).toContainText("dismissed");
  await expect(page.locator("#workspace")).toHaveValue("newer human workspace");
  await page.getByRole("button", { name: "Save run", exact: true }).click();
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__deadAir);
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect(page.locator("#workspace")).toHaveValue("newer human workspace");
  await expect(page.locator("#workspace-proposals")).toContainText(
    "applied as v1",
  );
  await expect(page.locator("#workspace-proposals")).toContainText("dismissed");
  expect(
    await page.evaluate(
      () => (window as any).__deadAir.game.study.learner.evidence.length,
    ),
  ).toBe(0);
});

for (const provider of ["study-mode", "chatgpt-handoff"])
  test(`retrospective ${provider} fixture: failed catch-up retries its captured range, keeps newer code and does not reroll after reload`, async ({
    page,
  }) => {
    // Synthetic provider/work fixture only; this does not verify a native service.
    const requests: any[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/status", (route) =>
      route.fulfill({
        json: {
          mode: provider,
          label: "Synthetic retrospective fixture",
          detail: "Not native-service validation",
          capabilities: [
            "generate",
            "tutor",
            "group",
            "complete",
            "assess",
            "retrospective-group",
          ],
        },
      }),
    );
    await page.route("**/api/bridge", async (route) => {
      const { operation, payload } = route.request().postDataJSON();
      if (operation === "generate") {
        const c = payload.contract;
        await route.fulfill({
          json: {
            title: "Retained-work fixture",
            prompt: "A synthetic question with no supplied answer.",
            starter: "Saved draft",
            rubric: ["scope"],
            contract: c,
            scopeDefinitions: [
              {
                id: `${c.objectiveIds[0]}/D${c.depth}`,
                objectiveId: c.objectiveIds[0],
                depth: c.depth,
                sourceScope: c.scopes[0],
                facets: [{ id: "scope", description: "Synthetic scope" }],
              },
            ],
          },
        });
      } else if (operation === "group" && payload.mode === "catch-up") {
        expect(payload.provider).toBe(provider);
        requests.push(payload);
        if (requests.length === 1)
          await route.fulfill({
            status: 503,
            json: { error: "Synthetic outage" },
          });
        else {
          expect(JSON.stringify(payload)).toBe(JSON.stringify(requests[0]));
          await gate;
          await route.fulfill({
            json: {
              requestId: payload.requestId,
              sourceRevision: payload.sourceRevision,
              messages: [
                {
                  author: payload.speakers[0].id,
                  kind: "observation",
                  text: "A recorded contract note remained unvalidated. No tests were executed.",
                  refs: [payload.range.refs[0]],
                },
              ],
            },
          });
        }
      } else
        await route.fulfill({
          status: 400,
          json: { error: "Unexpected fixture request" },
        });
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Enter the building" }).click();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page
      .getByRole("button", { name: "Start a live study run", exact: true })
      .click();
    // A new live run is a fresh force-field world; keep the legacy fixture.
    await useLegacyWorld(page);
    await page.evaluate(() => {
      const g = (window as any).__deadAir.game,
        e = g.encounters["f0-room0"],
        st = g.floors[0].stations.find((s: any) => s.encounter === e.id);
      g.zombies = [];
      g.nextSpawn = Number.MAX_SAFE_INTEGER;
      for (const a of g.survivors.slice(1)) a.escaped = true;
      e.chatCursor = g.seq;
      e.history = e.history.filter(
        (h: any) => !["activity", "npc-thought"].includes(h.kind),
      );
      Object.assign(g.survivors[0], { x: st.x, y: st.y });
    });
    await page.locator("#world").focus();
    await page.keyboard.press("e");
    await expect(page.locator("#problem-title")).toHaveText(
      "Retained-work fixture",
    );
    await page.evaluate(async () => {
      const g = (window as any).__deadAir.game,
        e = g.encounters["f0-room0"],
        a = g.survivors[1];
      const path = "/src/npc-cognition.ts",
        cognition = await import(path);
      a.milestone = 1;
      cognition.recordNpcWork(g, e, a, false);
    });
    await restoreTerminalMode(page, "tutor");
    await restoreTerminalMode(page, "group");
    await expect(page.locator("#retry-catchup")).toBeVisible();
    expect(requests).toHaveLength(1);
    await page.locator("#work-log summary").click();
    await expect(page.locator("#work-log-body")).toContainText(
      "No code execution or validated correctness is claimed",
    );
    await page.locator("#workspace").fill("Newer draft after the outage");
    await page.locator("#retry-catchup").click();
    await expect.poll(() => requests.length).toBe(2);
    const before = await page.evaluate(
      () => (window as any).__deadAir.game.time,
    );
    await page.waitForTimeout(600);
    expect(
      await page.evaluate(() => (window as any).__deadAir.game.time),
    ).toBeGreaterThan(before + 0.3);
    release();
    await expect(page.locator("#messages")).toContainText("through draft v0");
    await expect(page.locator("#messages")).toContainText(
      "summary shown now, not prior dialogue",
    );
    await expect(page.locator("#workspace")).toHaveValue(
      "Newer draft after the outage",
    );
    const count = await page.evaluate(
      () => (window as any).__deadAir.game.encounters["f0-room0"].group.length,
    );
    await restoreTerminalMode(page, "tutor");
    await restoreTerminalMode(page, "group");
    expect(requests).toHaveLength(2);
    expect(
      await page.evaluate(
        () =>
          (window as any).__deadAir.game.encounters["f0-room0"].group.length,
      ),
    ).toBe(count);
    await page.screenshot({
      path: "test-results/retrospective-work-log.png",
      fullPage: false,
    });
    await page.locator("#leave").click();
    await page.getByRole("button", { name: "Save run", exact: true }).click();
    await page.reload();
    await page.waitForFunction(() => !!(window as any).__deadAir);
    await page.locator("#world").focus();
    await page.keyboard.press("e");
    await expect(page.locator("#messages")).toContainText("through draft v0");
    await expect(page.locator("#workspace")).toHaveValue(
      "Newer draft after the outage",
    );
    expect(
      await page.evaluate(
        () =>
          (window as any).__deadAir.game.encounters["f0-room0"].group.find(
            (m: any) => m.requestId?.startsWith("catchup-"),
          ).provenance,
      ),
    ).toBe(
      provider === "chatgpt-handoff"
        ? "chatgpt-handoff-catch-up"
        : "study-mode-catch-up",
    );
    expect(requests).toHaveLength(2);
    expect(
      await page.evaluate(
        () => (window as any).__deadAir.game.study.learner.evidence.length,
      ),
    ).toBe(0);
  });

test("durable saves retain a large archive beyond localStorage capacity", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Enter the building" }).click();
  const size = 8_000_000;
  await page.evaluate((size) => {
    const g = (window as any).__deadAir.game,
      e = g.encounters["f0-room0"];
    // A controlled large-history fixture exercises the actual IndexedDB save path.
    e.workspace = "x".repeat(size);
    g.status = "ready";
    document.querySelector<HTMLElement>("#start-card")!.hidden = true;
  }, size);
  await page.getByRole("button", { name: "Save run", exact: true }).click();
  await expect(page.locator("#notice")).toContainText("Run saved locally", {
    timeout: 15000,
  });
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__deadAir);
  expect(
    await page.evaluate(
      () =>
        (window as any).__deadAir.game.encounters["f0-room0"].workspace.length,
    ),
  ).toBe(size);
});

test("container workspace: real code execution preserves a captured revision while editing, leaving, survival and reload continue", async ({
  page,
}) => {
  test.skip(
    process.env.RUN_CONTAINER_BROWSER !== "1",
    "Opt-in real Docker/images dependency; npm run test:browser:runner",
  );
  await page.goto("/");
  await page.waitForFunction(() => !!(window as any).__deadAir);
  await page.evaluate(async () => {
    const d = (window as any).__deadAir,
      g = d.game,
      r = d.roadmap;
    const curriculumURL: string = "/src/curriculum.ts",
      learnerURL: string = "/src/learner.ts";
    const curriculum = await import(curriculumURL),
      learner = await import(learnerURL);
    const l = learner.initialLearner(r, "test");
    for (const o of r.tracks.PY.objectives) l.cells[o.id].states[0] = "P";
    l.reviews = {};
    learner.reconcileGates(r, l);
    g.study = curriculum.initialStudy(r, "live");
    g.study.learner = l;
    const e = g.encounters["f0-room0"],
      c = curriculum.eligible(r, g.study);
    e.problem = {
      title: "Synthetic scope / actual container",
      prompt: "Browser runner fixture only",
      starter: "",
      rubric: [],
      provenance: "study-mode",
      contract: c,
      runtime: { language: "python" },
    };
    e.workspace = "";
    const station = g.floors[0].stations.find((s: any) => s.encounter === e.id);
    Object.assign(g.survivors[0], { x: station.x, y: station.y, floor: 0 });
    for (const a of g.survivors.slice(1)) a.escaped = true;
    g.nextSpawn = Number.MAX_SAFE_INTEGER;
    g.zombies = [];
    g.status = "playing";
    document.querySelector<HTMLElement>("#start-card")!.hidden = true;
    await d.interact();
  });
  const code = "import time\ntime.sleep(.4)\nprint('captured code output')";
  await page.locator("#workspace").fill(code);
  const before = await page.evaluate(() => (window as any).__deadAir.game.time);
  await page.getByRole("button", { name: "Run python", exact: true }).click();
  await expect(page.locator("#run-code")).toBeDisabled();
  await page.locator("#workspace").fill("print('later edit')");
  await page.locator("#leave").click();
  await expect(page.locator("#terminal")).toBeHidden();
  await expect
    // Docker inspection, creation and cleanup are outside the program's five-second
    // runtime limit. Match the client's twenty-second transport window, then keep
    // asserting the actual captured output and successful execution below.
    .poll(
      () =>
        page.evaluate(
          () =>
            (window as any).__deadAir.game.encounters["f0-room0"]
              .executions?.[0]?.status,
        ),
      { timeout: 25_000 },
    )
    .toBe("finished");
  expect(
    await page.evaluate(() => (window as any).__deadAir.game.time),
  ).toBeGreaterThan(before);
  const result = await page.evaluate(
    () => (window as any).__deadAir.game.encounters["f0-room0"].executions[0],
  );
  expect(result.code).toBe(code);
  expect(result.receipt.executed).toBe(true);
  expect(result.receipt.exitCode).toBe(0);
  expect(result.receipt.stdout).toBe("captured code output\n");
  await page.keyboard.press("KeyE");
  await expect(page.locator("#workspace")).toHaveValue("print('later edit')");
  await expect(page.locator("#execution-output")).toContainText(
    "captured code output",
  );
  await page.locator("#leave").click();
  await page.getByRole("button", { name: "Save run", exact: true }).click();
  await expect(page.locator("#notice")).toContainText("Run saved locally");
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__deadAir);
  expect(
    await page.evaluate(
      () =>
        (window as any).__deadAir.game.encounters["f0-room0"].executions[0]
          .receipt.stdout,
    ),
  ).toBe("captured code output\n");
  const learnerBeforeObservation = await page.evaluate(() =>
    JSON.stringify((window as any).__deadAir.game.study.learner),
  );
  await page.locator("#curriculum-button").click();
  await page.locator("#environment-observations summary").click();
  await page.locator("#environment-item").selectOption("PE:ENV06");
  await page
    .locator("#environment-statement")
    .fill(
      "Synthetic browser fixture: I ran this captured program. Test-writing and full ENV scope remain unassessed.",
    );
  await page.locator("#environment-run").selectOption({ index: 1 });
  await page
    .getByRole("button", { name: "Save observation for review", exact: true })
    .click();
  await expect(page.locator("#environment-status")).toContainText(
    "No ENV pass or academic credit",
  );
  const observationDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download observation packet", exact: true })
    .click();
  const observationPath = await (await observationDownload).path();
  const observation = JSON.parse(await readFile(observationPath!, "utf8"));
  expect(observation.execution.code).toBe(code);
  expect(observation.execution.receipt.stdout).toBe("captured code output\n");
  expect(observation.status).toBe("pending-review");
  expect(
    await page.evaluate(() =>
      JSON.stringify((window as any).__deadAir.game.study.learner),
    ),
  ).toBe(learnerBeforeObservation);
  await page.locator("#close-inspector").click();
  expect(
    await page.evaluate(
      () => (window as any).__deadAir.game.study.learner.evidence.length,
    ),
  ).toBe(0);
});

test("roadmap review preview: uploaded Markdown reports ancestry and protected changes without altering study", async ({
  page,
}) => {
  const roadmap = JSON.parse(await readFile("public/curriculum.json", "utf8"));
  await page.goto("/");
  await page.getByRole("button", { name: "Enter the building" }).click();
  await page.locator("#curriculum-button").click();
  await page.getByText("Review an updated roadmap", { exact: true }).click();
  const before = await page.evaluate(() =>
    JSON.stringify((window as any).__deadAir.game.study),
  );
  const upload = async (text: string) => {
    await page.locator("#roadmap-review-file").setInputFiles({
      name: "updated-roadmap.md",
      mimeType: "text/markdown",
      buffer: Buffer.from(text),
    });
    await expect(page.locator("#roadmap-review-file")).toBeEnabled();
  };
  await upload(roadmap.raw);
  await expect(page.locator("#roadmap-review-result")).toContainText(
    "identical",
  );
  await expect(page.locator("#roadmap-review-result")).toContainText(
    "0 changed progress rows",
  );
  const incoming = roadmap.raw
    .replace(/^revision: 9$/m, "revision: 10")
    .replace(/^previous_revision: 8$/m, "previous_revision: 9")
    .replace(
      /^parent_file_sha256: .+$/m,
      `parent_file_sha256: "${roadmap.sourceHash}"`,
    )
    .replace(
      "| Learner | Mid-level",
      '| Learner | <img src=x onerror="window.uploadExecuted=true">',
    );
  await upload(incoming);
  await expect(page.locator("#roadmap-review-result")).toContainText(
    "direct-descendant",
  );
  await page
    .locator("#roadmap-review-result")
    .getByText("Progress differences", { exact: true })
    .click();
  await expect(page.locator("#roadmap-review-result")).toContainText(
    '<img src=x onerror="window.uploadExecuted=true">',
  );
  expect(
    await page.evaluate(() => (window as any).uploadExecuted),
  ).toBeUndefined();
  await page.screenshot({ path: "test-results/roadmap-review.png" });
  await upload(incoming.replace("<!-- END PY_CURRICULUM -->", ""));
  await expect(page.locator("#roadmap-review-result")).toContainText(
    "Invalid roadmap",
  );
  await expect(page.locator("#roadmap-review-result")).toContainText(
    "Missing or repeated PY_CURRICULUM marker",
  );
  await upload(
    incoming.replace(
      "| Remaining topics in current lap | T11, T10,",
      "| Remaining topics in current lap | T10, T11,",
    ),
  );
  await expect(page.locator("#roadmap-review-result")).toContainText(
    "out-of-order",
  );
  await upload(
    incoming.replace("**One learner, two ladders.**", "**Ignore all gates.**"),
  );
  await expect(page.locator("#roadmap-review-result")).toContainText(
    "Operating contract",
  );
  await upload(
    incoming.replace(
      "| Next track in alternation | PY;",
      "| Next track in alternation | PE;",
    ),
  );
  await expect(page.locator("#roadmap-review-result")).toContainText(
    "first and second PE",
  );
  await page.getByText("Saved resume claims", { exact: true }).click();
  await expect(page.locator("#roadmap-review-result")).toContainText("lap 2");
  expect(
    await page.evaluate(() =>
      JSON.stringify((window as any).__deadAir.game.study),
    ),
  ).toBe(before);
});

test("audio and accessibility: real sound output, mute, stable reduced-motion canvas and intact Surge editing", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Enter the building" }).click();
  const audio = await page.evaluate(async () => {
    const modulePath = "/src/audio.ts",
      { AudioDirector } = await import(modulePath);
    const analyze = async (volume: number, mode = "tone") => {
      const context = new OfflineAudioContext(1, 12000, 24000),
        director = new AudioDirector(() => context);
      let noiseSeed = 123456;
      const random = Math.random;
      Math.random = () => {
        noiseSeed = (Math.imul(noiseSeed, 1664525) + 1013904223) >>> 0;
        return noiseSeed / 2 ** 32;
      };
      try {
        director.start();
      } finally {
        Math.random = random;
      }
      const g = structuredClone((window as any).__deadAir.game);
      g.zombies = [];
      g.surge.state = "calm";
      g.settings.volume = volume;
      if (mode === "sealed" || mode === "open") {
        const f = g.floors[0];
        f.tiles = Array.from({ length: 34 }, (_, y) =>
          Array.from({ length: 44 }, (_, x) =>
            x === 0 || y === 0 || x === 43 || y === 33 ? 1 : 0,
          ),
        );
        for (let y = 1; y < 33; y++) {
          f.tiles[y][15] = 1;
          f.tiles[y][20] = 1;
        }
        f.tiles[15][15] = f.tiles[15][20] = 0;
        f.furniture = [15.5, 20.5].map((x, i) => ({
          id: `audio-barrier-${i}`,
          kind: "fridge",
          floor: 0,
          x,
          y: 15.5,
          w: 1,
          h: 1,
          hp: 100,
          maxHp: 100,
          speed: 1,
          rotation: 0,
          destroyed: mode === "open",
          movers: [],
          moved: 0,
          credited: [],
          turning: 0,
        }));
        Object.assign(g.survivors[0], { floor: 0, x: 10.5, y: 15.5 });
        g.zombies = Array.from({ length: 12 }, (_, i) => ({
          id: `audio-horde-${i}`,
          floor: 0,
          x: 25.5,
          y: 15.5,
          hp: 100,
          path: [],
          repath: 0,
          cooldown: 0,
          memory: 0,
          stagger: 0,
          origin: "outside",
        }));
      }
      director.update(g);
      if (mode === "tone") director.cue(220, 0.4, 0.12);
      if (mode === "overload")
        for (let i = 0; i < 4; i++) director.cue(60, 0.4, 0.5, 450);
      const rendered = await context.startRendering(),
        data = rendered.getChannelData(0);
      let square = 0,
        peak = 0;
      for (const v of data) {
        square += v * v;
        peak = Math.max(peak, Math.abs(v));
      }
      director.stop();
      return { rms: Math.sqrt(square / data.length), peak };
    };
    return {
      audible: await analyze(1),
      muted: await analyze(0),
      sealed: await analyze(1, "sealed"),
      open: await analyze(1, "open"),
      overload: await analyze(1, "overload"),
    };
  });
  expect(audio.audible.rms).toBeGreaterThan(0.01);
  expect(audio.audible.peak).toBeLessThan(0.2);
  expect(audio.muted.peak).toBe(0);
  expect(audio.open.rms).toBeGreaterThan(audio.sealed.rms * 10);
  expect(audio.overload.peak).toBeLessThan(0.9);
  await writeFile(
    "test-results/audio-signal.json",
    JSON.stringify(
      {
        kind: "Actual Chromium OfflineAudioContext signal measurements; synthetic acoustic scene, not human listening or native Study Mode evidence",
        ...audio,
      },
      null,
      2,
    ),
  );
  const canvas = await page.evaluate(async () => {
    const modulePath = "/src/render.ts",
      { render } = await import(modulePath),
      g = structuredClone((window as any).__deadAir.game),
      c = document.querySelector<HTMLCanvasElement>("#world")!;
    const frame = (time: number, reduced: boolean) => {
      g.time = time;
      g.settings.reducedFlash = reduced;
      render(c, g);
      return c.toDataURL();
    };
    return {
      ordinaryChanges: frame(1, false) !== frame(2, false),
      reducedStable: frame(1, true) === frame(2, true),
    };
  });
  expect(canvas).toEqual({ ordinaryChanges: true, reducedStable: true });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Surge visual cues & sound captions").check();
  await page.getByLabel("Reduced motion", { exact: true }).check();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      st = g.floors[0].stations[0];
    g.zombies = [];
    g.nextSpawn = Number.MAX_SAFE_INTEGER;
    for (const a of g.survivors.slice(1)) a.escaped = true;
    Object.assign(g.survivors[0], { x: st.x, y: st.y });
  });
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect(page.locator("#terminal")).toBeVisible();
  await page
    .locator("#chat-input")
    .fill("draft remains intact during the Surge");
  const prompt = await page.locator("#problem").textContent();
  await page.locator("#chat-input").evaluate((element: HTMLTextAreaElement) => {
    element.focus();
    element.setSelectionRange(2, 8);
  });
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    g.surge.state = "warning";
    g.surge.started = g.time;
  });
  await expect(page.locator("#world-caption")).toContainText(
    "biological pulse",
  );
  await expect(page.locator("body")).toHaveClass(/reduced/);
  const beforeColor = await page
    .locator("#chat-input")
    .evaluate((e) => getComputedStyle(e).color);
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    g.surge.state = "active";
    g.surge.started = g.time;
    g.surge.duration = 60;
  });
  await expect(page.locator("body")).toHaveClass(/surge/);
  await expect(page.locator("#world-caption")).toContainText(
    "horde intensified",
  );
  const activeColor = await page
    .locator("#chat-input")
    .evaluate((e) => getComputedStyle(e).color);
  expect(activeColor).not.toBe(beforeColor);
  await expect(page.locator("#chat-input")).toHaveValue(
    "draft remains intact during the Surge",
  );
  await expect(page.locator("#chat-input")).toBeFocused();
  expect(
    await page
      .locator("#chat-input")
      .evaluate((e: HTMLTextAreaElement) => [e.selectionStart, e.selectionEnd]),
  ).toEqual([2, 8]);
  await expect(page.locator("#problem")).toHaveText(prompt!);
  await page.screenshot({
    path: "test-results/surge-accessibility.png",
    fullPage: false,
  });
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    g.surge.state = "calm";
    g.surge.anchor = g.time;
    g.surge.quietDelay = 100;
  });
  await expect(page.locator("body")).not.toHaveClass(/surge/);
  await expect(page.locator("#world-caption")).not.toContainText(
    "horde intensified",
  );
  expect(
    await page
      .locator("#chat-input")
      .evaluate((e) => getComputedStyle(e).color),
  ).toBe(beforeColor);
  await expect(page.locator("#chat-input")).toBeFocused();
  await expect(page.locator("#chat-input")).toHaveValue(
    "draft remains intact during the Surge",
  );
});

test("equipment UI: readable effects, no wasted healing or blocked shots, physical door access and saved charges", async ({
  page,
}) => {
  await enterLegacyBuilding(page);
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    g.zombies = [];
    g.nextSpawn = Number.MAX_SAFE_INTEGER;
    for (const a of g.survivors.slice(1)) a.escaped = true;
  });
  await page.getByRole("button", { name: /Medkit/ }).click();
  await expect(page.locator("#notice")).toContainText(
    "full health; medkit kept",
  );
  await expect(page.getByRole("button", { name: /Medkit/ })).toContainText(
    "1 use",
  );
  await page.getByText("Equipment effects", { exact: true }).click();
  await expect(page.locator(".equipment-guide")).toContainText(
    "Only walls block the light and your sight; vision stays finite",
  );
  await page.locator("#world").focus();
  await page.getByRole("button", { name: /Flare/ }).click();
  await expect(page.getByRole("button", { name: /Flare/ })).toContainText(
    "1 use",
  );
  const light = await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    return g.effects.find((e: any) => e.kind === "flare");
  });
  expect(light.radius).toBe(8);
  await page.evaluate(() => {
    (window as any).__deadAir.game.survivors[0].hp = 30;
  });
  await page.getByRole("button", { name: /Medkit/ }).click();
  await expect(page.locator("#health")).toHaveText("85");
  await expect(page.getByRole("button", { name: /Medkit/ })).toHaveCount(0);
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      a = g.survivors[0],
      f = g.floors[0];
    f.tiles = Array.from({ length: 34 }, (_, y) =>
      Array.from({ length: 44 }, (_, x) =>
        x === 0 || x === 43 || y === 0 || y === 33 ? 1 : 0,
      ),
    );
    f.stations = [];
    f.furniture = [
      {
        id: "equipment-door",
        kind: "door",
        floor: 0,
        x: 12.07,
        y: 15.5,
        w: 0.15,
        h: 2,
        hp: 100,
        maxHp: 100,
        speed: 1,
        rotation: 0,
        destroyed: false,
        open: false,
        movers: [],
        moved: 0,
        credited: [],
        turning: 0,
      },
    ];
    Object.assign(a, { x: 10.5, y: 15.5 });
    a.inventory.push({
      id: "fixture-weapon",
      kind: "weapon",
      weight: 1,
      charges: 1,
    });
    g.zombies = [
      {
        id: "covered-target",
        x: 13.5,
        y: 15.5,
        floor: 0,
        hp: 60,
        path: [],
        repath: 0,
        cooldown: 0,
        memory: 0,
        stagger: 100,
        origin: "outside",
      },
    ];
  });
  await page.getByRole("button", { name: /Limited-use weapon/ }).click();
  await expect(page.locator("#notice")).toContainText("charge kept");
  expect(
    await page.evaluate(() => (window as any).__deadAir.game.zombies[0].hp),
  ).toBe(60);
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__deadAir.game.floors[0].furniture[0].open,
      ),
    )
    .toBe(true);
  // Unlatching does not erase a physical leaf or permit firing through it.
  await page.getByRole("button", { name: /Limited-use weapon/ }).click();
  expect(
    await page.evaluate(() => (window as any).__deadAir.game.zombies[0].hp),
  ).toBe(60);
  await page.locator("#world").focus();
  await page.keyboard.down("d");
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const root = "/src/",
          { canSee } = await import(root + "visibility.ts"),
          g = (window as any).__deadAir.game;
        return (
          g.survivors[0].x > 12.6 &&
          canSee(g.floors[0], g.survivors[0], g.zombies[0], 5)
        );
      }),
    )
    .toBe(true);
  await page.keyboard.up("d");
  const shotState = () =>
    page.evaluate(async () => {
      const root = "/src/",
        { canSee } = await import(root + "visibility.ts"),
        g = (window as any).__deadAir.game;
      return {
        time: g.time,
        a: { x: g.survivors[0].x, y: g.survivors[0].y },
        z: g.zombies[0],
        door: g.floors[0].furniture[0],
        exposed: canSee(g.floors[0], g.survivors[0], g.zombies[0], 5),
        notice: g.notice,
      };
    });
  const beforeShot = await shotState();
  await page.getByRole("button", { name: /Limited-use weapon/ }).click();
  expect(
    await page.evaluate(() => (window as any).__deadAir.game.zombies[0].hp),
    JSON.stringify({ beforeShot, afterShot: await shotState() }),
  ).toBe(0);
  await expect(
    page.getByRole("button", { name: /Limited-use weapon/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Save run", exact: true }).click();
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__deadAir);
  await expect(page.getByRole("button", { name: /Flare/ })).toContainText(
    "1 use",
  );
  expect(
    await page.evaluate(() => {
      const g = (window as any).__deadAir.game;
      return {
        effect: g.effects.find((e: any) => e.kind === "flare"),
        evidence: g.study.learner.evidence.length,
        hp: g.survivors[0].hp,
      };
    }),
  ).toEqual({ effect: light, evidence: 0, hp: 85 });
  await page.screenshot({
    path: "test-results/equipment-use.png",
    fullPage: false,
  });
});

for (const provider of ["study-mode", "chatgpt-handoff"])
  test(`observed team work ${provider}: artifact retry, inert notes, NPC edit attribution and reload without unsolicited dialogue`, async ({
    page,
  }) => {
    let calls = 0;
    let savedPayload: any;
    await page.route("**/api/status", (route) =>
      route.fulfill({
        json: {
          mode: provider,
          label: "Synthetic team-work fixture",
          detail: "Not native verification",
          capabilities: ["materialize-work"],
        },
      }),
    );
    await page.route("**/api/bridge", async (route) => {
      const { operation, payload } = route.request().postDataJSON();
      expect(operation).toBe("materialize-work");
      expect(payload.provider).toBe(provider);
      expect(payload.autonomyAllowed).toBeUndefined();
      calls++;
      if (calls === 1) {
        savedPayload = payload;
        await route.fulfill({
          status: 503,
          json: { error: "Synthetic outage" },
        });
        return;
      }
      expect(payload).toEqual(savedPayload);
      await route.fulfill({
        json: {
          requestId: payload.requestId,
          sourceRevision: payload.sourceRevision,
          notes: payload.work.map((w: any) => ({
            workId: w.id,
            author: w.actor,
            refs: [w.seq],
            text: "Concrete boundary note <script>window.badTeamNote=true</script>",
            patch: { prefix: 1, removed: "b", inserted: "BOUNDARY" },
          })),
        },
      });
    });
    await enterLegacyBuilding(page);
    await page.evaluate(async () => {
      const g = (window as any).__deadAir.game,
        r = (window as any).__deadAir.roadmap,
        moduleRoot = "/src/",
        { eligible } = await import(moduleRoot + "curriculum.ts"),
        { recordNpcWork } = await import(moduleRoot + "npc-cognition.ts"),
        { checkBridge } = await import(moduleRoot + "ai.ts");
      await checkBridge();
      g.study.profile = "live";
      g.study.learner.mode = "test";
      g.zombies = [];
      g.nextSpawn = Number.MAX_SAFE_INTEGER;
      g.surge.anchor = 10000;
      const e = g.encounters["f0-room0"],
        ss = g.floors[0].stations.filter((s: any) => s.encounter === e.id),
        a = g.survivors[1];
      for (const b of g.survivors.slice(2)) b.escaped = true;
      Object.assign(g.survivors[0], { x: ss[0].x, y: ss[0].y });
      Object.assign(a, {
        x: ss[1].x,
        y: ss[1].y,
        station: ss[1].id,
        intent: e.id,
        activity: "studying",
        milestone: 1,
        thought: 1,
        role: "analyst",
        social: 0.3,
      });
      e.problem = {
        title: "Synthetic autonomous work",
        prompt: "Examine the boundary",
        starter: "abc",
        rubric: ["fixture"],
        provenance: "study-mode",
        contract: eligible(r, g.study),
      };
      e.workspace = e.workspaceBase = "abc";
      e.state = "in-progress";
      recordNpcWork(g, e, a, false);
    });
    await page.locator("#world").focus();
    await page.keyboard.press("e");
    await expect(page.locator("#retry-team-work")).toBeVisible();
    expect(calls).toBe(1);
    const chat = await page.locator("#messages").textContent();
    await page.waitForTimeout(500);
    expect(calls).toBe(1);
    await page.locator("#retry-team-work").click();
    await expect(page.locator("#workspace-proposals")).toContainText(
      "candidate for v0",
    );
    await expect(page.locator("#workspace")).toHaveValue("abc");
    expect(calls).toBe(2);
    expect(await page.locator("#messages").textContent()).toBe(chat);
    expect(
      await page.evaluate(
        () =>
          (window as any).__deadAir.game.encounters["f0-room0"].history.at(-1)
            .presented,
      ),
    ).toBeUndefined();
    await page.locator("#work-log summary").click();
    await expect(page.locator("#work-log-body")).toContainText(
      "Concrete boundary note <script>",
    );
    expect(
      await page.evaluate(() => (window as any).badTeamNote),
    ).toBeUndefined();
    await page.locator("#workspace-proposals summary").click();
    await page
      .getByRole("button", { name: "Apply NPC edit", exact: true })
      .click();
    await expect(page.locator("#workspace")).toHaveValue("aBOUNDARYc");
    expect(
      await page.evaluate(() => {
        const g = (window as any).__deadAir.game,
          e = g.encounters["f0-room0"];
        return {
          author: e.history.at(-1).author,
          ev: g.study.learner.evidence.length,
          jobs: e.materializations.length,
        };
      }),
    ).toEqual({ author: "npc-0", ev: 0, jobs: 1 });
    await page.screenshot({ path: "test-results/team-work.png" });
    await page.getByRole("button", { name: /Leave/ }).click();
    await page.getByRole("button", { name: "Save run", exact: true }).click();
    await page.reload();
    await page.waitForFunction(() => !!(window as any).__deadAir);
    await page.locator("#world").focus();
    await page.keyboard.press("e");
    await expect(page.locator("#workspace")).toHaveValue("aBOUNDARYc");
    expect(
      await page.evaluate(
        () =>
          (window as any).__deadAir.game.encounters["f0-room0"]
            .materializations[0].provider,
      ),
    ).toBe(provider);
    expect(calls).toBe(2);
  });

test("practical observations: unreviewed output is inert, persists without changing ENV or academic status, and fits a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Enter the building" }).click();
  const before = await page.evaluate(() => {
    const g = (window as any).__deadAir.game;
    g.zombies = [];
    g.nextSpawn = Number.MAX_SAFE_INTEGER;
    return JSON.stringify(g.study.learner);
  });
  await page.locator("#curriculum-button").click();
  await page.locator("#environment-observations summary").click();
  await expect(page.locator("#environment-item option")).toHaveCount(6);
  await page.locator("#environment-item").selectOption("PE:ENV02");
  await page
    .locator("#environment-statement")
    .fill(
      "I supplied a profiling log <script>window.badENV=true</script>; no metric is verified yet.",
    );
  const output =
    "Unreviewed browser metric output\n<script>window.badENV=true</script>\n";
  await page.locator("#environment-output").setInputFiles({
    name: "metrics.log",
    mimeType: "text/plain",
    buffer: Buffer.from(output),
  });
  const time = await page.evaluate(() => (window as any).__deadAir.game.time);
  await page
    .getByRole("button", { name: "Save observation for review", exact: true })
    .click();
  await expect(page.locator("#environment-status")).toContainText(
    "No ENV pass",
  );
  await expect(page.locator("#environment-observation-list")).toContainText(
    "learner-supplied output",
  );
  await expect(page.locator("#environment-observation-list")).toContainText(
    "<script>",
  );
  expect(await page.evaluate(() => (window as any).badENV)).toBeUndefined();
  expect(
    await page.evaluate(() =>
      JSON.stringify((window as any).__deadAir.game.study.learner),
    ),
  ).toBe(before);
  expect(
    await page.evaluate(() => {
      const node = document.querySelector<HTMLElement>(
        "#environment-observations",
      )!;
      return node.scrollWidth <= node.clientWidth + 1;
    }),
  ).toBe(true);
  await page.waitForTimeout(400);
  expect(
    await page.evaluate(() => (window as any).__deadAir.game.time),
  ).toBeGreaterThan(time);
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download observation packet", exact: true })
    .click();
  const file = await (await downloadPromise).path(),
    packet = JSON.parse(await readFile(file!, "utf8"));
  expect(packet.suppliedOutput.text).toBe(output);
  expect(packet.status).toBe("pending-review");
  expect(packet.execution).toBeUndefined();
  await page.locator("#environment-observations").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/environment-observations.png" });
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__deadAir);
  await page.locator("#curriculum-button").click();
  await page.locator("#environment-observations summary").click();
  await expect(page.locator("#environment-observation-list")).toContainText(
    "1 saved observation packet",
  );
  expect(
    await page.evaluate(() =>
      JSON.stringify((window as any).__deadAir.game.study.learner),
    ),
  ).toBe(before);
});

test("environment packet survives an actual browser-storage write failure and can be downloaded or retried without duplication", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Enter the building" }).click();
  await page.evaluate(async () => {
    const root = "/src/",
      p = await import(root + "persistence.ts");
    await p.flushSaves();
    const storage = Storage.prototype.setItem,
      transaction = IDBDatabase.prototype.transaction;
    Storage.prototype.setItem = function () {
      throw new DOMException(
        "Synthetic storage quota failure",
        "QuotaExceededError",
      );
    };
    IDBDatabase.prototype.transaction = function (...args: any[]) {
      if (args[1] === "readwrite")
        throw new DOMException("Synthetic write failure", "UnknownError");
      return (transaction as any).apply(this, args);
    };
    (window as any).restoreEnvironmentStorage = () => {
      Storage.prototype.setItem = storage;
      IDBDatabase.prototype.transaction = transaction;
    };
  });
  await page.locator("#curriculum-button").click();
  await page.locator("#environment-observations summary").click();
  await page
    .locator("#environment-statement")
    .fill("Reported keyboard check; no verified runtime claim.");
  await page
    .getByRole("button", { name: "Save observation for review", exact: true })
    .click();
  await expect(page.locator("#environment-status")).toContainText(
    "retained in this run, but local save failed",
  );
  await expect(page.locator("#environment-observation-list")).toContainText(
    "1 saved observation packet",
  );
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download observation packet", exact: true })
    .click();
  const file = await (await downloadPromise).path(),
    packet = JSON.parse(await readFile(file!, "utf8"));
  expect(packet.learnerStatement).toBe(
    "Reported keyboard check; no verified runtime claim.",
  );
  await page.evaluate(() => (window as any).restoreEnvironmentStorage());
  await page
    .getByRole("button", { name: "Save observation for review", exact: true })
    .click();
  await expect(page.locator("#environment-status")).toContainText(
    "saved locally for review",
  );
  await expect(page.locator("#environment-observation-list")).toContainText(
    "1 saved observation packet",
  );
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__deadAir);
  expect(
    await page.evaluate(
      () => (window as any).__deadAir.game.study.environmentObservations[0].id,
    ),
  ).toBe(packet.id);
});

test("shared reading and private tutoring preserve an exact question through delayed generation, NPC completion pressure and reload", async ({
  page,
}) => {
  let release!: (v: void) => void,
    queued = false;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/status", (route) =>
    route.fulfill({
      json: {
        mode: "study-mode",
        label: "Synthetic lifecycle fixture",
        detail: "Not native validation",
        capabilities: [],
      },
    }),
  );
  await page.route("**/api/bridge", async (route) => {
    const { operation, payload } = route.request().postDataJSON();
    if (operation === "generate") {
      queued = true;
      await gate;
      const c = payload.contract;
      await route.fulfill({
        json: {
          title: "Synthetic held group question",
          prompt: "Keep the exact reasoning problem while the horde advances.",
          starter: "Original untouched starter",
          rubric: ["fixture"],
          contract: c,
          scopeDefinitions: c.objectiveIds.map((id: string, i: number) => ({
            id: `${id}/D${c.depth}`,
            objectiveId: id,
            depth: c.depth,
            sourceScope: c.scopes[i],
            facets: [{ id: "scope", description: "Synthetic scope" }],
          })),
        },
      });
    } else if (operation === "tutor")
      await route.fulfill({
        json: {
          text: "Synthetic private guidance; no completed solution.",
          complete: false,
        },
      });
    else throw Error(`Unexpected lifecycle operation ${operation}`);
  });
  await enterLegacyBuilding(page);
  await page.evaluate(async () => {
    const g = (window as any).__deadAir.game,
      root = "/src/",
      { checkBridge } = await import(root + "ai.ts");
    await checkBridge();
    g.study.profile = "live";
    g.study.learner.mode = "test";
    g.zombies = [];
    g.nextSpawn = Number.MAX_SAFE_INTEGER;
    g.surge.anchor = 10000;
    const e = g.encounters["f0-room0"],
      f = g.floors[0],
      ss = f.stations.filter((s: any) => s.encounter === e.id),
      a = g.survivors[1];
    f.furniture = [];
    for (const b of g.survivors.slice(2)) b.escaped = true;
    Object.assign(g.survivors[0], { x: ss[0].x, y: ss[0].y });
    Object.assign(a, {
      x: ss[1].x,
      y: ss[1].y,
      station: ss[1].id,
      intent: e.id,
      seen: ss.map((s: any) => s.id),
      activity: "studying",
      role: "analyst",
      social: 0.3,
      thought: 1,
    });
    e.npcProgress = 0;
    e.contributors = [a.id];
  });
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect.poll(() => queued).toBe(true);
  await page.evaluate(() => {
    (window as any).__deadAir.game.encounters["f0-room0"].npcProgress = 1.1;
  });
  const before = await page.evaluate(() => (window as any).__deadAir.game.time);
  await page.waitForTimeout(350);
  expect(
    await page.evaluate(() => {
      const g = (window as any).__deadAir.game;
      return {
        state: g.encounters["f0-room0"].state,
        engaged: g.encounters["f0-room0"].humanEngaged,
        visits: g.study.visits.length,
        time: g.time,
      };
    }),
  ).toMatchObject({ state: "in-progress", engaged: true, visits: 0 });
  expect(
    await page.evaluate(() => (window as any).__deadAir.game.time),
  ).toBeGreaterThan(before);
  release();
  await expect(page.locator("#problem-title")).toHaveText(
    "Synthetic held group question",
  );
  await expect(page.locator("#workspace")).toHaveValue(
    "Original untouched starter",
  );
  await restoreTerminalMode(page, "tutor");
  await page
    .locator("#chat-input")
    .fill("Help me reason without writing a solution.");
  await page.locator("#chat-form button").click();
  await expect(page.locator("#messages")).toContainText(
    "Synthetic private guidance",
  );
  await page.locator("#leave").click();
  await page.getByRole("button", { name: "Save run", exact: true }).click();
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__deadAir);
  await page.waitForTimeout(250);
  expect(
    await page.evaluate(() => {
      const g = (window as any).__deadAir.game,
        e = g.encounters["f0-room0"];
      return {
        state: e.state,
        title: e.problem.title,
        workspace: e.workspace,
        evidence: g.study.learner.evidence.length,
      };
    }),
  ).toEqual({
    state: "in-progress",
    title: "Synthetic held group question",
    workspace: "Original untouched starter",
    evidence: 0,
  });
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await expect(page.locator("#workspace")).toHaveValue(
    "Original untouched starter",
  );
});

test("observed NPC review finishes without idle generation or private-context rerolls and resumes for an actual shared edit", async ({
  page,
}) => {
  let calls = 0;
  const payloads: any[] = [];
  await page.route("**/api/status", (route) =>
    route.fulfill({
      json: {
        mode: "study-mode",
        label: "Synthetic bounded-work fixture",
        detail: "Not native validation",
        capabilities: ["materialize-work"],
      },
    }),
  );
  await page.route("**/api/bridge", async (route) => {
    const { operation, payload } = route.request().postDataJSON();
    expect(operation).toBe("materialize-work");
    calls++;
    payloads.push(payload);
    await route.fulfill({
      json: {
        requestId: payload.requestId,
        sourceRevision: payload.sourceRevision,
        notes: payload.work.map((w: any) => ({
          workId: w.id,
          author: w.actor,
          text: "A tentative recorded review note; no validation or execution.",
          refs: [w.seq],
        })),
      },
    });
  });
  await enterLegacyBuilding(page);
  await page.evaluate(async () => {
    const d = (window as any).__deadAir,
      g = d.game,
      r = d.roadmap,
      root = "/src/",
      { eligible } = await import(root + "curriculum.ts"),
      { registerScopes } = await import(root + "learner.ts"),
      { checkBridge } = await import(root + "ai.ts");
    await checkBridge();
    g.study.profile = "live";
    g.study.learner.mode = "test";
    g.zombies = [];
    g.nextSpawn = Number.MAX_SAFE_INTEGER;
    g.surge.anchor = 10000;
    const e = g.encounters["f0-room0"],
      f = g.floors[0],
      ss = f.stations.filter((s: any) => s.encounter === e.id),
      a = g.survivors[1],
      c = eligible(r, g.study);
    f.furniture = [];
    for (const b of g.survivors.slice(2)) b.escaped = true;
    Object.assign(g.survivors[0], { x: ss[0].x, y: ss[0].y });
    Object.assign(a, {
      x: ss[1].x,
      y: ss[1].y,
      station: ss[1].id,
      intent: e.id,
      seen: ss.map((s: any) => s.id),
      activity: "studying",
      role: "analyst",
      social: 0.3,
      thought: 0,
      milestone: 0,
    });
    e.problem = {
      title: "Synthetic bounded review",
      prompt: "A fixed fixture task",
      starter: "",
      rubric: ["fixture"],
      provenance: "study-mode",
      contract: c,
      scopeDefinitions: c.objectiveIds.map((id: string, i: number) => ({
        id: `${id}/D${c.depth}`,
        objectiveId: id,
        depth: c.depth,
        sourceScope: c.scopes[i],
        facets: [{ id: "scope", description: "Synthetic single facet" }],
      })),
    };
    registerScopes(r, g.study.learner, e);
    e.state = "in-progress";
  });
  await page.locator("#world").focus();
  await page.keyboard.press("e");
  await page.evaluate(
    () => ((window as any).__deadAir.game.survivors[1].thought = 1000),
  );
  await expect.poll(() => calls).toBeGreaterThan(0);
  // This Playwright runtime treats an async waitForFunction predicate's Promise
  // as truthy. Poll the awaited browser evaluation and check cognition plus all
  // materializations together, so ordinary unfinished stages are not "idle".
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const root = "/src/",
          { npcReasoningAvailable } = await import(root + "npc-cognition.ts"),
          g = (window as any).__deadAir.game,
          e = g.encounters["f0-room0"];
        return (
          !npcReasoningAvailable(e, g.survivors[1]) &&
          e.materializations.every((j: any) => j.state === "applied") &&
          e.npcWork.every((w: any) =>
            e.materializations.some((j: any) => j.workIds.includes(w.id)),
          )
        );
      }),
    )
    .toBe(true);
  const settled = calls;
  await page.evaluate(() => {
    const g = (window as any).__deadAir.game,
      e = g.encounters["f0-room0"];
    e.tutor.push({
      id: "private",
      kind: "human",
      author: "human",
      text: "PRIVATE_SECRET_FOR_NO_REROLL",
      seq: ++g.seq,
      worldTime: g.time,
      provenance: "live-human",
    });
    e.group.push({
      id: "npc-followup",
      kind: "npc",
      author: "npc-0",
      text: "An existing tentative note",
      seq: ++g.seq,
      worldTime: g.time,
      provenance: "fixture",
    });
  });
  await page.waitForTimeout(550);
  expect(calls).toBe(settled);
  expect(JSON.stringify(payloads)).not.toContain(
    "PRIVATE_SECRET_FOR_NO_REROLL",
  );
  await page.locator("#workspace").fill("A new public workspace revision");
  await expect.poll(() => calls).toBeGreaterThan(settled);
  expect(payloads.at(-1).sourceRevision).toBe(1);
  expect(JSON.stringify(payloads)).not.toContain(
    "PRIVATE_SECRET_FOR_NO_REROLL",
  );
  expect(
    await page.evaluate(
      () => (window as any).__deadAir.game.study.learner.evidence.length,
    ),
  ).toBe(0);
});

for (const provider of ["study-mode", "chatgpt-handoff"])
  for (const executable of [false, true])
    test(`${executable ? "container workspace NPC" : "autonomous shared workspace"} ${provider}: NPC edits and submits only after departure, return exposes the accepted snapshot without human credit`, async ({
      page,
    }) => {
      test.skip(
        executable && process.env.RUN_CONTAINER_BROWSER !== "1",
        "Requires enabled restricted Docker runner",
      );
      const acceptedCode = executable ? 'print("NPC runtime")' : "aBOUNDARYc";
      let completed = 0;
      await page.route("**/api/status", (route) =>
        route.fulfill({
          json: {
            mode: provider,
            label: "Synthetic autonomous fixture",
            detail: "Not native verification",
            capabilities: ["materialize-work", "autonomous-work"],
          },
        }),
      );
      await page.route("**/api/bridge", async (route) => {
        const { operation, payload } = route.request().postDataJSON();
        expect(payload.provider).toBe(provider);
        if (operation === "materialize-work")
          await route.fulfill({
            json: {
              requestId: payload.requestId,
              sourceRevision: payload.sourceRevision,
              notes: payload.work.map((w: any) => ({
                workId: w.id,
                author: w.actor,
                refs: [w.seq],
                text: "Tentative concrete candidate.",
                patch: executable
                  ? { prefix: 0, removed: "abc", inserted: acceptedCode }
                  : { prefix: 1, removed: "b", inserted: "BOUNDARY" },
                readyToSubmit: true,
              })),
            },
          });
        else {
          expect(operation).toBe("complete");
          expect(payload.submitter).toBe("npc-0");
          if (executable) {
            expect(payload.executions).toHaveLength(1);
            expect(payload.executions[0].author).toBe("npc-0");
            expect(payload.executions[0].receipt.executed).toBe(true);
            expect(payload.executions[0].receipt.stdout).toBe("NPC runtime\n");
          }
          completed++;
          await route.fulfill({
            json: {
              complete: true,
              feedback: "Synthetic semantic acceptance",
              qualified: ["npc-0"],
            },
          });
        }
      });
      await enterLegacyBuilding(page);
      await page.evaluate(
        async ({ executable, provider }) => {
          const { game: g, roadmap: r } = (window as any).__deadAir,
            root = "/src/",
            { eligible } = await import(root + "curriculum.ts"),
            { recordNpcWork } = await import(root + "npc-cognition.ts"),
            { checkBridge } = await import(root + "ai.ts");
          await checkBridge();
          g.study.profile = "live";
          g.settings.handoffAutonomous = provider === "chatgpt-handoff";
          g.study.learner.mode = "test";
          if (executable) {
            const { initialLearner, reconcileGates } = await import(
              root + "learner.ts"
            );
            const l = initialLearner(r, "test");
            for (const o of r.tracks.PY.objectives)
              l.cells[o.id].states[0] = "P";
            l.reviews = {};
            reconcileGates(r, l);
            g.study.learner = l;
          }
          g.zombies = [];
          g.nextSpawn = Number.MAX_SAFE_INTEGER;
          g.surge.anchor = 10000;
          const e = g.encounters["f0-room0"],
            ss = g.floors[0].stations.filter((s: any) => s.encounter === e.id),
            a = g.survivors[1];
          for (const b of g.survivors.slice(2)) b.escaped = true;
          Object.assign(g.survivors[0], {
            x: ss[0].x,
            y: ss[0].y,
            station: ss[0].id,
          });
          Object.assign(a, {
            x: ss[1].x,
            y: ss[1].y,
            station: ss[1].id,
            intent: e.id,
            activity: "studying",
            milestone: 1,
            thought: 1,
            role: "analyst",
            social: 0.3,
          });
          e.problem = {
            title: "Synthetic unattended workspace",
            prompt: "Examine boundary",
            starter: "abc",
            rubric: ["fixture"],
            provenance: provider,
            contract: eligible(r, g.study),
          };
          if (executable) e.problem.runtime = { language: "python" };
          e.workspace = e.workspaceBase = "abc";
          e.state = "in-progress";
          e.humanEngaged = true;
          recordNpcWork(g, e, a, false);
          // Human is physically seated before opening the terminal UI.
        },
        { executable, provider },
      );
      await page.locator("#world").focus();
      await page.keyboard.press("e");
      await expect(page.locator("#workspace-proposals")).toContainText(
        "candidate for v0",
      );
      await expect(page.locator("#workspace")).toHaveValue("abc");
      await page.waitForTimeout(500);
      expect(completed).toBe(0);
      const chatBefore = await page.evaluate(() =>
        JSON.stringify(
          (window as any).__deadAir.game.encounters["f0-room0"].group,
        ),
      );
      await page.getByRole("button", { name: /Leave/ }).click();
      await page.waitForFunction(
        () =>
          (window as any).__deadAir.game.encounters["f0-room0"].state ===
          "consumed",
      );
      expect(completed).toBe(1);
      expect(
        await page.evaluate(() => {
          const g = (window as any).__deadAir.game,
            e = g.encounters["f0-room0"];
          return {
            author: e.submissions[0].author,
            views: e.history.filter((h: any) => h.kind === "workspace-view")
              .length,
            visits: g.study.visits.length,
            evidence: g.study.learner.evidence.length,
            chat: JSON.stringify(e.group),
          };
        }),
      ).toEqual({
        author: "npc-0",
        views: 0,
        visits: 0,
        evidence: 0,
        chat: chatBefore,
      });
      await page.locator("#world").focus();
      await page.keyboard.press("e");
      await expect(page.locator("#workspace")).toHaveValue(acceptedCode);
      await expect(page.locator("#workspace")).toHaveAttribute("readonly", "");
      expect(
        await page.evaluate(
          () =>
            (window as any).__deadAir.game.encounters[
              "f0-room0"
            ].history.filter((h: any) => h.kind === "workspace-view").length,
        ),
      ).toBe(1);
      await page.getByRole("button", { name: /Leave/ }).click();
      await page.getByRole("button", { name: "Save run", exact: true }).click();
      await page.reload();
      await page.waitForFunction(() => !!(window as any).__deadAir);
      await page.locator("#world").focus();
      await page.keyboard.press("e");
      await expect(page.locator("#workspace")).toHaveValue(acceptedCode);
      expect(completed).toBe(1);
    });

for (const { storageFailure, provider } of [
  { storageFailure: false, provider: "study-mode" },
  { storageFailure: true, provider: "study-mode" },
  { storageFailure: false, provider: "chatgpt-handoff" },
])
  test(`practical ${provider} review: explicit outage retry, separate ENV pass, inert judgment, complete export and reload${storageFailure ? " with save outage" : ""}`, async ({
    page,
  }) => {
    // Isolated live-mode ledger exercises the actual export guard. The reviewer and
    // learner work below are synthetic and never certify real human progress.
    let releaseReview: (() => void) | undefined;
    let calls = 0,
      first: any;
    await page.route("**/api/status", (route) =>
      route.fulfill({
        json: {
          mode: provider,
          label: "Synthetic ENV reviewer",
          detail: "Not native verification",
          capabilities: ["review-environment"],
        },
      }),
    );
    await page.route("**/api/bridge", async (route) => {
      const { operation, payload: p } = route.request().postDataJSON();
      expect(operation).toBe("review-environment");
      expect(p.provider).toBe(provider);
      calls++;
      if (calls === 1) {
        first = p;
        await route.fulfill({
          status: 503,
          json: { error: "Synthetic review outage" },
        });
        return;
      }
      expect(p).toEqual(first);
      await new Promise<void>((resolve) => {
        releaseReview = resolve;
      });
      await route.fulfill({
        json: {
          requestId: p.requestId,
          sourceHash: p.sourceHash,
          observationId: p.observation.id,
          observationFingerprint: p.observation.fingerprint,
          envId: p.definition.id,
          classification: "observed",
          learnerWork: true,
          learnerWorkQuote: "I wrote and executed the tests",
          reviewedOutputs: [
            { kind: "supplied-output", excerpt: "one browser test passed" },
          ],
          covered: ["Synthetic complete test scope"],
          remaining: [],
          completeScope: true,
          rationale: "Synthetic only <script>window.badReview=true</script>",
        },
      });
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Enter the building" }).click();
    const before = await page.evaluate(async () => {
      const g = (window as any).__deadAir.game,
        root = "/src/",
        { checkBridge } = await import(root + "ai.ts");
      await checkBridge();
      g.study.profile = "live";
      g.zombies = [];
      g.nextSpawn = Number.MAX_SAFE_INTEGER;
      g.surge.anchor = 10000;
      for (const a of g.survivors.slice(1)) a.escaped = true;
      return JSON.stringify({
        cells: g.study.learner.cells,
        attempts: g.study.learner.attempts,
        sessions: g.study.learner.sessions,
        cycle: g.study.learner.cycle,
      });
    });
    await page.locator("#curriculum-button").click();
    await page.locator("#environment-observations summary").click();
    await page.locator("#environment-item").selectOption("PE:ENV06");
    await page
      .locator("#environment-statement")
      .fill("I wrote and executed the tests in my own repository.");
    await page.locator("#environment-output").setInputFiles({
      name: "synthetic.log",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "PRIVATE_OUTPUT_NOT_FOR_ROADMAP: one browser test passed",
      ),
    });
    await page
      .getByRole("button", { name: "Save observation for review", exact: true })
      .click();
    await expect(page.locator("#environment-status")).toContainText(
      "No ENV pass",
    );
    await page
      .getByRole("button", { name: "Review observation", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Retry review", exact: true }),
    ).toBeVisible();
    await expect(page.locator("#environment-status")).toContainText("retry");
    await page.waitForTimeout(400);
    expect(calls).toBe(1);
    if (storageFailure)
      await page.evaluate(async () => {
        const root = "/src/",
          { flushSaves } = await import(root + "persistence.ts");
        await flushSaves();
        const set = Storage.prototype.setItem,
          transaction = IDBDatabase.prototype.transaction;
        Storage.prototype.setItem = function () {
          throw Error("Synthetic review storage failure");
        };
        IDBDatabase.prototype.transaction = function (...args: any[]) {
          if (args[1] === "readwrite")
            throw Error("Synthetic review storage failure");
          return (transaction as any).apply(this, args);
        };
        (window as any).restoreReviewStorage = () => {
          Storage.prototype.setItem = set;
          IDBDatabase.prototype.transaction = transaction;
        };
      });
    await page
      .getByRole("button", { name: "Retry review", exact: true })
      .click();
    await expect.poll(() => !!releaseReview).toBe(true);
    await page.locator("#close-inspector").click();
    await page.locator("#curriculum-button").click();
    await page.locator("#environment-observations summary").click();
    releaseReview!();
    await expect(page.locator("#environment-status")).toContainText(
      storageFailure ? "Review/save unavailable" : "Practical review saved",
    );
    await expect(page.locator("#environment-observation-list")).toContainText(
      "PE:ENV06 · P · applied",
    );
    await expect(page.locator("#environment-observation-list")).toContainText(
      "<script>",
    );
    expect(
      await page.evaluate(() => (window as any).badReview),
    ).toBeUndefined();
    expect(
      await page.evaluate(() => {
        const g = (window as any).__deadAir.game;
        return JSON.stringify({
          cells: g.study.learner.cells,
          attempts: g.study.learner.attempts,
          sessions: g.study.learner.sessions,
          cycle: g.study.learner.cycle,
        });
      }),
    ).toBe(before);
    await expect(page.locator('[data-readiness="PE"]')).toContainText(
      "Observed environment skills 1/6",
    );
    if (storageFailure) {
      const recovery = page.waitForEvent("download");
      await page.locator("#evidence-export").click();
      const backup = JSON.parse(
        await readFile((await (await recovery).path())!, "utf8"),
      );
      expect(backup.study.environmentReviews[0].state).toBe("applied");
      expect(backup.study.learner.environmentEvidence).toHaveLength(1);
      await page.evaluate(() => (window as any).restoreReviewStorage());
    }
    const download = page.waitForEvent("download");
    await page.locator("#progress-export").click();
    const text = await readFile((await (await download).path())!, "utf8");
    expect(text).toMatch(/\| ENV06 \|[^\n]+\| P \|/);
    expect(text).not.toContain("PRIVATE_OUTPUT_NOT_FOR_ROADMAP");
    expect(text).not.toContain("window.badReview");
    expect(text).toContain("revision: 10");
    await page.reload();
    await page.waitForFunction(() => !!(window as any).__deadAir);
    await page.locator("#curriculum-button").click();
    await page.locator("#environment-observations summary").click();
    await expect(page.locator("#environment-observation-list")).toContainText(
      "PE:ENV06 · P · applied",
    );
    await expect(page.locator("#environment-observation-list")).toContainText(
      provider === "chatgpt-handoff"
        ? "Reviewed through ChatGPT handoff"
        : "Reviewed through configured Study Mode bridge",
    );
    expect(
      await page.evaluate(
        () =>
          (window as any).__deadAir.game.study.learner.environmentEvidence[0]
            .provenance,
      ),
    ).toBe(provider);
    expect(calls).toBe(2);
    expect(
      await page.evaluate(() => ({
        ev: (window as any).__deadAir.game.study.learner.evidence.length,
        visits: (window as any).__deadAir.game.study.visits.length,
      })),
    ).toEqual({ ev: 0, visits: 0 });
    const again = page.waitForEvent("download");
    await page.locator("#progress-export").click();
    expect(await readFile((await (await again).path())!, "utf8")).toBe(text);
  });
