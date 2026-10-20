import { openGameMenu } from "./helpers/game-menu";
import { restoreTerminalMode } from "./helpers/terminal-mode";
// End-to-end local transport with controlled worker replies; no actual ChatGPT claim.
import { expect, test } from "@playwright/test";
import type { Server } from "node:http";
// @ts-expect-error Local .mjs relay integration.
import { createHandoffQueue } from "../../scripts/chatgpt-handoff-queue.mjs";
// @ts-expect-error Local .mjs relay integration.
import { createHandoffRoutes } from "../../scripts/chatgpt-handoff-routes.mjs";
// @ts-expect-error Local .mjs relay integration.
import { createStudyBridgeServer } from "../../scripts/study-bridge-server.mjs";

test("ChatGPT handoff UI: exact generation survives reload, tutoring stays private, world completion precedes separate assisted assessment", async ({
  page,
}) => {
  const q = createHandoffQueue(),
    server: Server = createStudyBridgeServer({
      handoff: createHandoffRoutes(q, { token: "synthetic-browser-worker" }),
    });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("Missing relay");
  const base = `http://127.0.0.1:${address.port}`,
    worker = "controlled-browser-worker";
  const workerCall = async (body: unknown) => {
    const response = await fetch(base + "/api/handoff/worker", {
      method: "POST",
      headers: {
        Authorization: "Bearer synthetic-browser-worker",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    expect(response.ok, JSON.stringify(data)).toBe(true);
    return data;
  };
  const sideWorker = "controlled-public-side-worker";
  const isRecordedJob = (job: any) =>
    job.operation === "materialize-work" ||
    (job.operation === "group" && job.payload.mode === "catch-up");
  const answerRecordedJob = async (job: any, workerId: string) => {
    // The real capability handshake also enables bounded public NPC notes and
    // retrospective summaries. Service them explicitly rather than mistaking a
    // historical Room log speaker for the live human-question respondent.
    expect(isRecordedJob(job)).toBe(true);
    expect(JSON.stringify(job.payload)).not.toContain("PRIVATE_HANDOFF_");
    const value =
      job.operation === "materialize-work"
        ? {
            requestId: job.payload.requestId,
            sourceRevision: job.payload.sourceRevision,
            notes: [],
          }
        : {
            requestId: job.payload.requestId,
            sourceRevision: job.payload.sourceRevision,
            messages: [
              {
                author: job.payload.speakers[0].id,
                kind: "observation",
                text: "Controlled summary of recorded room activity, shown now. No execution or validated reasoning is claimed.",
                refs: [job.payload.range.refs[0]],
              },
            ],
          };
    await workerCall({
      action: "submit",
      worker: workerId,
      jobId: job.jobId,
      claim: job.claim,
      answer: value,
    });
  };
  const drainRecordedJobs = async () => {
    for (let n = 0; n < 12 && q.snapshot().queued; n++) {
      const job = await workerCall({ action: "get", worker: sideWorker });
      await answerRecordedJob(job, sideWorker);
    }
    expect(q.snapshot().queued).toBe(0);
  };
  const next = async (operation: string) => {
    for (let n = 0; n < 12; n++) {
      await expect.poll(() => q.snapshot().queued).toBeGreaterThan(0);
      const job = await workerCall({ action: "get", worker });
      if (isRecordedJob(job)) {
        await answerRecordedJob(job, worker);
        continue;
      }
      expect(job.operation).toBe(operation);
      if (operation === "group") expect(job.payload.mode).toBe("reply");
      return job;
    }
    throw Error(
      "Controlled worker did not reach the requested interactive operation",
    );
  };
  const answer = (job: any, value: unknown) =>
    workerCall({
      action: "submit",
      worker,
      jobId: job.jobId,
      claim: job.claim,
      answer: value,
    });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    const response = await fetch(base + url.pathname + url.search, {
      method: request.method(),
      headers: {
        "Content-Type": "application/json",
        Origin: "http://127.0.0.1:5173",
      },
      ...(request.method() === "POST" ? { body: request.postData()! } : {}),
    });
    await route.fulfill({
      status: response.status,
      contentType: "application/json",
      body: await response.text(),
    });
  });
  try {
    await page.goto("/");
    await page.getByRole("button", { name: "Enter the building" }).click();
    await openGameMenu(page);
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByText("ChatGPT handoff connection", { exact: true }).click();
    await page.locator("#handoff-enable").check();
    await expect(page.locator("#bridge-label")).toContainText(
      "ChatGPT handoff",
    );
    await expect(page.locator("#bridge-detail")).toContainText("not verified");
    await expect(page.locator("#handoff-autonomous")).not.toBeChecked();
    await page.locator("#handoff-autonomous").check();
    await expect.poll(() => q.snapshot().autonomousWork).toBe(true);
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as any).__deadAir.game.settings.handoffAutonomous,
        ),
      )
      .toBe(true);
    await page.locator("#handoff-autonomous").uncheck();
    await expect.poll(() => q.snapshot().autonomousWork).toBe(false);
    expect(
      await page.evaluate(
        () => (window as any).__deadAir.game.settings.handoffAutonomous,
      ),
    ).toBe(false);
    expect(q.snapshot().queued).toBe(0);

    await page
      .getByRole("button", { name: "Start a live study run", exact: true })
      .click();
    const position = async () => {
      await page.waitForFunction(() => !!(window as any).__deadAir);
      return page.evaluate(() => {
        const g = (window as any).__deadAir.game,
          s = g.floors[0].stations[0],
          e = g.encounters[s.encounter];
        // Legacy shared-save fixture: this flow covers the public group chat,
        // shared editor and frozen complete operation. Fresh worlds give each
        // station a solo puzzle, so re-link the second seat to the same room.
        e.mode = "shared";
        delete e.owner;
        g.floors[0].stations[1].encounter = e.id;
        Object.assign(g.survivors[0], { x: s.x, y: s.y });
        for (const a of g.survivors.slice(1)) a.escaped = true; // Isolate transport; no NPC/balance claim.
      });
    };
    await position();
    await page.locator("#world").focus();
    await page.keyboard.press("e");
    const generated = await next("generate"),
      before = await page.evaluate(() => (window as any).__deadAir.game.time);
    await openGameMenu(page);
    await page.getByRole("button", { name: "Save run", exact: true }).click();
    await expect(page.locator("#notice")).toContainText("Run saved locally");
    await page.locator("#resume-game").click();
    await page.reload();
    await expect(page.locator("#bridge-label")).toContainText(
      "ChatGPT handoff",
    );
    await position();
    await page.locator("#world").focus();
    await page.keyboard.press("e");
    await expect.poll(() => q.snapshot().working).toBe(1);
    await drainRecordedJobs();
    expect(q.snapshot().queued).toBe(0);
    expect((await workerCall({ action: "get", worker })).jobId).toBe(
      generated.jobId,
    );
    await expect(page.locator("#terminal-provenance")).toContainText(
      "Live study request",
    );
    const c = generated.payload.contract,
      definitions = c.objectiveIds.map((id: string, i: number) => ({
        id: `${id}/D${c.depth}`,
        objectiveId: id,
        depth: c.depth,
        sourceScope: c.scopes[i],
        facets: [
          {
            id: "scope",
            description: "Controlled full-scope transport fixture",
          },
        ],
      }));
    await answer(generated, {
      title: "Rejected controlled reply",
      prompt: "Malformed scope fixture",
      starter: "",
      rubric: [],
      contract: c,
      scopeDefinitions: [{ id: "unsupported" }],
    });
    await expect(page.locator("#problem-title")).toHaveText(
      "Connection unavailable",
    );
    await openGameMenu(page);
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByText("ChatGPT handoff connection", { exact: true }).click();
    await page
      .getByRole("button", {
        name: "Request corrected generate reply",
        exact: true,
      })
      .click();
    const corrected = await next("generate");
    expect(corrected.jobId).toBe(generated.jobId);
    expect(corrected.requestHash).toBe(generated.requestHash);
    expect(corrected.claim).not.toBe(generated.claim);
    await page.screenshot({
      path: "test-results/chatgpt-handoff-settings.png",
    });
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await page.locator("#resume-game").click();
    await page.locator("#leave").click();
    await page.locator("#world").focus();
    await page.keyboard.press("e");
    await answer(corrected, {
      title: "Controlled handoff question",
      prompt:
        "Explain the contract and its boundaries. Synthetic transport fixture.",
      starter: "",
      rubric: ["Controlled scope"],
      contract: c,
      scopeDefinitions: definitions,
    });
    await expect(page.locator("#problem-title")).toHaveText(
      "Controlled handoff question",
    );
    await expect(page.locator("#submission-status")).not.toContainText(
      "Invalid curriculum",
    );
    expect(
      await page.evaluate(() => (window as any).__deadAir.game.time),
    ).toBeGreaterThan(before);
    await restoreTerminalMode(page, "tutor");
    await page
      .locator("#chat-input")
      .fill("PRIVATE_HANDOFF_QUESTION: help me identify a boundary.");
    await page.locator("#chat-form button").click();
    const tutor = await next("tutor");
    expect(JSON.stringify(tutor.payload)).toContain("PRIVATE_HANDOFF_QUESTION");
    await openGameMenu(page);
    await page.getByRole("button", { name: "Save run", exact: true }).click();
    await expect(page.locator("#notice")).toContainText("Run saved locally");
    await page.locator("#resume-game").click();
    await page.reload();
    await expect(page.locator("#bridge-label")).toContainText(
      "ChatGPT handoff",
    );
    await position();
    await page.locator("#world").focus();
    await page.keyboard.press("e");
    await restoreTerminalMode(page, "tutor");
    await page
      .getByRole("button", {
        name: "Retry saved private question",
        exact: true,
      })
      .click();
    expect((await workerCall({ action: "get", worker })).jobId).toBe(
      tutor.jobId,
    );
    await drainRecordedJobs();
    expect(q.snapshot().queued).toBe(0);
    await answer(tutor, {
      text: "PRIVATE_HANDOFF_HINT: consider the assumptions for an empty input.",
      // Solo terminals use the terminal-dialogue contract: an explicit decision is required.
      ...(tutor.payload.mode === "terminal-dialogue"
        ? { complete: false }
        : {}),
    });
    await expect(page.locator("#messages")).toContainText(
      "PRIVATE_HANDOFF_HINT",
    );
    // The solo conversation has no separate editor; the shared room does.
    await restoreTerminalMode(page, "group");
    await page
      .locator("#workspace")
      .fill(
        "Human-authored synthetic reasoning after a supplied boundary hint; this does not demonstrate independent mastery.",
      );
    await page.evaluate(() => {
      const g = (window as any).__deadAir.game,
        f = g.floors[0],
        s = f.stations[0],
        other = f.stations.find(
          (p: any) => p.encounter === s.encounter && p.id !== s.id,
        );
      Object.assign(g.survivors[1], {
        escaped: false,
        x: other.x,
        y: other.y,
        floor: 0,
        intent: s.encounter,
        station: other.id,
        thought: 10,
      });
    });
    await page
      .locator("#chat-input")
      .fill("Which boundary remains unresolved?");
    await page.locator("#chat-form button").click();
    const group = await next("group");
    expect(JSON.stringify(group.payload)).not.toContain("PRIVATE_HANDOFF_");
    await openGameMenu(page);
    await page.getByRole("button", { name: "Save run", exact: true }).click();
    await expect(page.locator("#notice")).toContainText("Run saved locally");
    await page.locator("#resume-game").click();
    await page.reload();
    await position();
    await page.locator("#world").focus();
    await page.keyboard.press("e");
    await restoreTerminalMode(page, "group");
    // Keep the captured speaker available while isolating transport from NPC AI.
    await page.evaluate((speakerId) => {
      const g = (window as any).__deadAir.game,
        s = g.floors[0].stations[0];
      const a = g.survivors.find((actor: any) => actor.id === speakerId);
      Object.assign(a, {
        escaped: false,
        alive: true,
        floor: 0,
        intent: s.encounter,
        thought: 12,
        x: s.x,
        y: s.y,
      });
    }, group.payload.speakers[0].id);
    await page
      .getByRole("button", { name: "Retry saved group question", exact: true })
      .click();
    const sameGroup = await workerCall({ action: "get", worker });
    expect(sameGroup.jobId).toBe(group.jobId);
    expect(sameGroup.requestHash).toBe(group.requestHash);
    expect(sameGroup.claim).toBe(group.claim);
    expect(sameGroup.payload).toEqual(group.payload);
    await drainRecordedJobs();
    expect(q.snapshot().queued).toBe(0);
    // A committed retreat remains unavailable after sight of danger is lost.
    // Hold only this controlled actor in that state to isolate reply delivery.
    const speakerSpeed = await page.evaluate((speakerId) => {
      const g = (window as any).__deadAir.game,
        a = g.survivors.find((actor: any) => actor.id === speakerId),
        speed = a.speed;
      Object.assign(a, {
        activity: "fleeing",
        fleeFloor: a.floor,
        fleeUntil: g.time + 60,
        fleeTarget: { x: a.x + 10, y: a.y },
        path: [],
        speed: 0,
      });
      return speed;
    }, group.payload.speakers[0].id);
    await answer(group, {
      requestId: group.payload.requestId,
      sourceRevision: group.payload.sourceRevision,
      messages: [
        {
          author: group.payload.speakers[0].id,
          kind: "question",
          text: "Which assumption needs a clearer contract?",
          refs: [group.payload.events.at(-1).seq],
        },
      ],
    });
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as any).__deadAir.game.encounters[
              "f0-room0"
            ].groupRequests.at(-1).state,
        ),
      )
      .toBe("interrupted");
    await expect(page.locator("#messages")).not.toContainText(
      "Which assumption needs a clearer contract?",
    );
    const doneWhileRetreating = q.snapshot().done;
    await openGameMenu(page);
    await page.getByRole("button", { name: "Save run", exact: true }).click();
    await expect(page.locator("#notice")).toContainText("Run saved locally");
    await page.locator("#resume-game").click();
    await page.reload();
    await position();
    // position() parks all NPCs; restore this saved speaker's participation
    // without changing its still-committed retreat state.
    await page.evaluate((id) => {
      (window as any).__deadAir.game.survivors.find(
        (a: any) => a.id === id,
      ).escaped = false;
    }, group.payload.speakers[0].id);
    await page.locator("#world").focus();
    await page.keyboard.press("e");
    await restoreTerminalMode(page, "group");
    await page
      .getByRole("button", { name: "Retry saved group question", exact: true })
      .click();
    expect(q.snapshot().done).toBe(doneWhileRetreating);
    await drainRecordedJobs();
    expect(q.snapshot().queued).toBe(0);
    await expect(page.locator("#messages")).not.toContainText(
      "Which assumption needs a clearer contract?",
    );
    await page.evaluate(
      ({ speakerId, speed }) => {
        const g = (window as any).__deadAir.game,
          a = g.survivors.find((actor: any) => actor.id === speakerId);
        a.activity = "waiting";
        a.speed = speed;
        a.fleeUntil = 0;
        delete a.fleeTarget;
      },
      { speakerId: group.payload.speakers[0].id, speed: speakerSpeed },
    );
    await page
      .getByRole("button", { name: "Retry saved group question", exact: true })
      .click();
    await expect(page.locator("#messages")).toContainText(
      "Which assumption needs a clearer contract?",
    );
    await expect(
      page.getByRole("button", {
        name: "Retry saved group question",
        exact: true,
      }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Submit answer" }).click();
    const completion = await next("complete");
    const captured = completion.payload.submission.content;
    await page
      .locator("#workspace")
      .fill("Later unsent draft must not replace the captured revision");
    await openGameMenu(page);
    await page.getByRole("button", { name: "Save run", exact: true }).click();
    await expect(page.locator("#notice")).toContainText("Run saved locally");
    await page.locator("#resume-game").click();
    await page.reload();
    await page.waitForFunction(() => !!(window as any).__deadAir);
    await position();
    await page.locator("#world").focus();
    await page.keyboard.press("e");
    await expect(page.locator("#workspace")).toHaveValue(
      "Later unsent draft must not replace the captured revision",
    );
    await page
      .getByRole("button", { name: "Retry answer check", exact: true })
      .click();
    await expect.poll(() => q.snapshot().working).toBe(1);
    await drainRecordedJobs();
    expect(q.snapshot().queued).toBe(0);
    const sameCompletion = await workerCall({ action: "get", worker });
    expect(sameCompletion.jobId).toBe(completion.jobId);
    expect(sameCompletion.hash).toBe(completion.hash);
    expect(sameCompletion.claim).toBe(completion.claim);
    expect(sameCompletion.payload.submission.content).toBe(captured);
    expect(
      await page.evaluate(
        () =>
          (window as any).__deadAir.game.encounters["f0-room0"].submissions
            .length,
      ),
    ).toBe(1);
    await answer(completion, {
      complete: true,
      feedback: "Synthetic shared completion only",
      qualified: ["human"],
    });
    await expect
      .poll(() =>
        page.evaluate(() =>
          (window as any).__deadAir.game.survivors[0].access.includes(0),
        ),
      )
      .toBe(true);
    await expect(page.locator("#workspace")).toHaveValue(captured);
    const assessment = await next("assess"),
      packet = assessment.payload.packet;
    expect(JSON.stringify(packet)).toContain("PRIVATE_HANDOFF_HINT");
    const artifact = packet.history
      .filter((h: any) => h.author === "human" && h.kind === "edit")
      .at(-1);
    const prior = await page.evaluate(() =>
      JSON.stringify((window as any).__deadAir.game.study.learner.evidence),
    );
    expect(prior).toBe("[]");
    await answer(assessment, {
      findings: definitions.map((d: any) => ({
        objectiveId: d.objectiveId,
        depth: d.depth,
        facet: "scope",
        outcome: "assisted",
        evidence: [artifact.seq],
        completeCheckpointScope: false,
        execution: "not-run",
        rationale:
          "Controlled assisted finding; never real learner achievement",
      })),
      visitOutcome: "usable",
      scopeReviews: definitions.map((d: any) => ({
        id: d.id,
        completeCoverage: true,
        rationale: "Controlled full definition",
      })),
      helpAttributions: packet.assistanceSources.map((m: any) => ({
        messageId: m.id,
        facets: ["*"],
        rationale: "Controlled assistance attribution",
      })),
    });
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as any).__deadAir.game.study.assessments.at(-1).status,
        ),
      )
      .toBe("applied");
    await drainRecordedJobs();
    expect(q.snapshot().queued).toBe(0);
    expect(
      await page.evaluate(
        () => (window as any).__deadAir.game.study.assessments.length,
      ),
    ).toBe(1);
    expect(JSON.stringify(packet)).not.toContain(
      "Later unsent draft must not replace the captured revision",
    );
    const state = await page.evaluate(() => {
      const g = (window as any).__deadAir.game,
        e = g.encounters["f0-room0"];
      return {
        problem: e.problem.provenance,
        evidence: g.study.learner.evidence,
        assessment: g.study.assessments.at(-1).provenance,
        access: g.survivors[0].access,
      };
    });
    expect(state.problem).toBe("chatgpt-handoff");
    expect(state.assessment).toBe("chatgpt-handoff");
    expect(
      state.evidence.every(
        (ev: any) =>
          ev.outcome === "assisted" && ev.provider === "chatgpt-handoff",
      ),
    ).toBe(true);
    expect(state.access).toContain(0);
    expect(errors).toEqual([]);
    await openGameMenu(page);
    await page.getByRole("button", { name: "Save run", exact: true }).click();
    await expect(page.locator("#notice")).toContainText("Run saved locally");
    await page.locator("#resume-game").click();
    await page.reload();
    await page.waitForFunction(() => !!(window as any).__deadAir);
    expect(
      await page.evaluate(
        () => (window as any).__deadAir.game.study.learner.evidence,
      ),
    ).toEqual(state.evidence);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
