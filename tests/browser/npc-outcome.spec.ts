import { restoreTerminalMode } from "./helpers/terminal-mode";
// Actual consumed-terminal UI, synthetic generation/validation. No native identity claim.
import { expect, test } from "@playwright/test";
import { enterLegacyBuilding } from "./helpers/legacy-world";
for (const provider of ["study-mode", "chatgpt-handoff"])
  for (const failure of [false, true])
    test(`NPC-only solution inspection ${provider}: ${failure ? "deferred validation and exact retry" : "saved validated reconstruction"}`, async ({
      page,
    }) => {
      let materializations = 0,
        validations = 0,
        tutors = 0;
      let firstValidation: any;
      await page.route("**/api/status", (route) =>
        route.fulfill({
          json: {
            mode: provider,
            label: "Synthetic outcome fixture",
            detail: "Not native verification",
            capabilities: ["materialize-outcome", "complete", "tutor"],
          },
        }),
      );
      await page.route("**/api/bridge", async (route) => {
        const { operation, payload } = route.request().postDataJSON();
        if (operation === "materialize-outcome") {
          expect(payload.provider).toBe(provider);
          materializations++;
          const c = payload.contract;
          expect(JSON.stringify(payload)).not.toContain(
            "PRIVATE_OUTCOME_SECRET",
          );
          await route.fulfill({
            json: {
              requestId: payload.requestId,
              problem: {
                title: "Synthetic completed task",
                prompt: "Explain this synthetic boundary.",
                starter: "",
                rubric: [],
                provenance: provider,
                contract: c,
                scopeDefinitions: c.objectiveIds.map(
                  (id: string, i: number) => ({
                    id: `${id}/D${c.depth}`,
                    objectiveId: id,
                    depth: c.depth,
                    sourceScope: c.scopes[i],
                    facets: [{ id: "scope", description: "Synthetic scope" }],
                  }),
                ),
              },
              solution:
                "Synthetic saved survivor reasoning <img src=x onerror=window.outcomeInjected=true>",
              authors: [payload.speakers[0].id],
              refs: [payload.commitment.work[0].seq],
              execution: "not-run",
            },
          });
        } else if (operation === "complete") {
          expect(payload.provider).toBe(provider);
          validations++;
          expect(payload.mode).toBe("retrospective-npc-outcome");
          if (validations === 1) firstValidation = payload;
          else expect(payload).toEqual(firstValidation);
          await route.fulfill({
            json: {
              requestId: payload.requestId,
              complete: !failure || validations > 1,
              feedback: "Synthetic semantic review only",
              execution: "not-run",
            },
          });
        } else if (operation === "tutor") {
          tutors++;
          expect(payload.retrospectiveOutcome).toContain(
            "Reconstruction authored now",
          );
          expect(payload.workspace).toContain("saved survivor reasoning");
          await route.fulfill({
            json: {
              text: "Synthetic tutor: Which boundary changes your reasoning?",
            },
          });
        } else
          await route.fulfill({
            status: 503,
            json: { error: "Unused fixture route" },
          });
      });
      await enterLegacyBuilding(page);
      const before = await page.evaluate(async () => {
        const d = (window as any).__deadAir,
          g = d.game,
          e = g.encounters["f0-room0"],
          a = g.survivors[0],
          npc = g.survivors[1],
          s = g.floors[0].stations.find((s: any) => s.encounter === e.id);
        const root = "/src/";
        const { recordNpcWork } = await import(root + "npc-cognition.ts"),
          { complete } = await import(root + "engine.ts");
        g.study.profile = "live";
        g.nextSpawn = 999999;
        g.zombies = [];
        g.survivors = [a, npc];
        npc.milestone = 1;
        recordNpcWork(g, e, npc, false);
        e.contributors = [npc.id];
        complete(
          g,
          e.id,
          `npc-sim-${e.id}`,
          e.contributors,
          "Simulated NPC-only fixture",
        );
        // Private text is deliberately absent from the commitment and request.
        e.tutor.push({
          id: "private-fixture",
          author: "human",
          kind: "human",
          text: "PRIVATE_OUTCOME_SECRET",
          seq: ++g.seq,
          worldTime: g.time,
          provenance: "private",
        });
        npc.escaped = true;
        Object.assign(a, { x: s.x, y: s.y });
        return {
          accepted: e.accepted,
          revision: e.revision,
          workspace: e.workspace,
          cycle: g.study.learner.cycle,
          access: [...a.access],
        };
      });
      await page.locator("#world").focus();
      await page.keyboard.press("e");
      await expect(page.locator("#npc-outcome")).toBeVisible();
      expect(materializations).toBe(0);
      await page
        .getByRole("button", { name: "Inspect survivor solution", exact: true })
        .click();
      if (failure) {
        await expect(page.locator("#npc-outcome-status")).toContainText(
          "does not have a compatible validation",
        );
        await expect(page.locator("#npc-outcome-body")).toBeEmpty();
        await page.locator("#leave").click();
        await page.reload();
        await page.locator("#world").focus();
        await page.keyboard.press("e");
        await page
          .getByRole("button", { name: "Retry saved solution inspection" })
          .click();
      }
      await expect(page.locator("#npc-outcome-body")).toContainText(
        "Synthetic saved survivor reasoning",
      );
      expect(materializations).toBe(1);
      expect(validations).toBe(failure ? 2 : 1);
      if (!failure)
        await page
          .locator("#npc-outcome")
          .screenshot({ path: "test-results/npc-outcome-inspection.png" });
      expect(
        await page.evaluate(() => (window as any).outcomeInjected),
      ).toBeUndefined();
      expect(await page.locator("#npc-outcome-body img").count()).toBe(0);
      await expect(page.locator("#workspace")).toHaveAttribute("readonly", "");
      await restoreTerminalMode(page, "tutor");
      await page.locator("#chat-input").fill("Can you explain the boundary?");
      await page.locator("#chat-form button").click();
      await expect(page.locator("#messages")).toContainText(
        "Which boundary changes your reasoning?",
      );
      expect(tutors).toBe(1);
      await page.locator("#leave").click();
      await page.reload();
      await page.locator("#world").focus();
      await page.keyboard.press("e");
      await expect(page.locator("#npc-outcome-body")).toContainText(
        "Synthetic saved survivor reasoning",
      );
      expect(materializations).toBe(1);
      expect(validations).toBe(failure ? 2 : 1);
      const after = await page.evaluate(() => {
        const g = (window as any).__deadAir.game,
          e = g.encounters["f0-room0"],
          l = g.study.learner;
        return {
          accepted: e.accepted,
          revision: e.revision,
          workspace: e.workspace,
          cycle: l.cycle,
          access: g.survivors[0].access,
          attempts: l.attempts,
          evidence: l.evidence,
          exposures: e.history.filter(
            (h: any) =>
              h.kind === "workspace-view" &&
              h.text.includes("Reconstructed now"),
          ),
        };
      });
      expect(after.accepted).toBe(before.accepted);
      expect(after.revision).toBe(before.revision);
      expect(after.workspace).toBe(before.workspace);
      expect(after.cycle).toBe(before.cycle);
      expect(after.access).toEqual(before.access);
      expect(after.attempts).toEqual([]);
      expect(after.evidence).toEqual([]);
      expect(after.exposures).toHaveLength(1);
      await expect(page.locator("#npc-outcome-status")).toContainText(
        provider === "chatgpt-handoff"
          ? "through ChatGPT handoff"
          : "through configured Study Mode bridge",
      );
    });
