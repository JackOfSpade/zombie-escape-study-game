import assert from "node:assert/strict";
import test from "node:test";
import {
  createTerminalMcpApp,
  terminalAppTools,
  TERMINAL_APP_URI,
} from "../scripts/terminal-mcp-app.mjs";
const owner = { linkId: "synthetic-owner" },
  other = { linkId: "synthetic-other" };
const state = (r) => r.structuredContent;
test("embedded demo exposes a self-contained MCP App and keeps old worker sessions separate", () => {
  const app = createTerminalMcpApp(),
    tools = terminalAppTools();
  assert.equal(tools.length, 4);
  assert.equal(tools[0]._meta.ui.resourceUri, TERMINAL_APP_URI);
  assert.ok(tools.every((t) => !t.inputSchema.required.includes("session")));
  assert.deepEqual(
    tools.find((t) => t.name === "stage_study_terminal_turn")._meta.ui
      .visibility,
    ["app"],
  );
  const resource = app.resource(TERMINAL_APP_URI).contents[0];
  assert.equal(resource.mimeType, "text/html;profile=mcp-app");
  assert.match(resource.text, /ui\/message/);
  assert.match(resource.text, /event.source !== parent/);
  assert.deepEqual(resource._meta.ui.csp.connectDomains, []);
  assert.throws(() => app.resource("file:///private"), /Unknown UI/);
  assert.throws(
    () => app.call("open_study_terminal_demo", {}, {}),
    /Authenticated/,
  );
});
test("direct host turns preserve context, reject stale replies and award at most one synthetic key", () => {
  const app = createTerminalMcpApp();
  let s = state(app.call("open_study_terminal_demo", {}, owner));
  const id = s.demoId;
  const stage = (answer) =>
    state(
      app.call(
        "stage_study_terminal_turn",
        { demoId: id, revision: s.revision, answer },
        owner,
      ),
    );
  const reply = (turnId, text, complete) =>
    state(
      app.call(
        "reply_study_terminal_turn",
        { demoId: id, turnId, text, complete },
        owner,
      ),
    );
  s = stage("I think [2,3] is largest.");
  const first = s.pending;
  assert.match(first.prompt, /^@study\n/);
  assert.match(first.prompt, /"rubric"/);
  assert.throws(
    () =>
      app.call(
        "stage_study_terminal_turn",
        { demoId: id, revision: 0, answer: "overwrite" },
        owner,
      ),
    /stale/,
  );
  assert.throws(() => reply("foreign", "Solved", true), /does not match/);
  assert.throws(
    () => reply(first.turnId, "Solved", "true"),
    /complete:boolean/,
  );
  s = reply(first.turnId, "What is the sum and the update?", false);
  assert.equal(s.keys, 0);
  assert.equal(s.messages.length, 2);
  s = stage(
    "5; subtract outgoing and add incoming, exactly two consecutive readings; stop at the end.",
  );
  assert.ok(s.pending.prompt.includes("What is the sum and the update?"));
  const second = s.pending;
  s = reply(second.turnId, "Solved", true);
  assert.equal(s.keys, 1);
  assert.equal(s.solved, true);
  assert.equal(s.messages.length, 4);
  assert.deepEqual(reply(second.turnId, "Solved", true), s);
  assert.throws(() => reply(second.turnId, "Different", false), /Conflicting/);
  const restored = state(app.call("open_study_terminal_demo", {}, owner));
  assert.equal(restored.demoId, id);
  assert.equal(restored.keys, 1);
  s = stage("Explain again");
  s = reply(s.pending.turnId, "Still solved", true);
  assert.equal(s.keys, 1);
});
test("demo data is OAuth-owner isolated and bounded; malformed input never mutates a session", () => {
  const app = createTerminalMcpApp({ maxSessions: 1 });
  const s = state(app.call("open_study_terminal_demo", {}, owner));
  assert.throws(
    () => app.call("read_study_terminal_demo", { demoId: s.demoId }, other),
    /unavailable/,
  );
  assert.throws(
    () => app.call("open_study_terminal_demo", {}, other),
    /capacity/,
  );
  for (const answer of ["", null, "a".repeat(8001)])
    assert.throws(
      () =>
        app.call(
          "stage_study_terminal_turn",
          { demoId: s.demoId, revision: 0, answer },
          owner,
        ),
      /Invalid/,
    );
  assert.throws(
    () =>
      app.call(
        "stage_study_terminal_turn",
        { demoId: s.demoId, revision: 0, answer: "ok", shell: "bad" },
        owner,
      ),
    /Unknown/,
  );
  assert.deepEqual(
    state(app.call("read_study_terminal_demo", { demoId: s.demoId }, owner)),
    s,
  );
});

test("the demo carries the probe stance and records a conceded gap beside its single key", () => {
  const app = createTerminalMcpApp();
  let s = state(app.call("open_study_terminal_demo", {}, owner));
  assert.deepEqual(
    s.probe.facets.map((f) => f.id),
    ["largest-total", "running-update", "invariant-boundary"],
  );
  assert.match(s.probe.stance, /Assume the learner already knows/);
  const tool = terminalAppTools().find(
    (t) => t.name === "reply_study_terminal_turn",
  );
  assert.deepEqual(tool.inputSchema.properties.outcome.enum, ["solved", "gap"]);
  s = state(
    app.call(
      "stage_study_terminal_turn",
      {
        demoId: s.demoId,
        revision: s.revision,
        answer: "No idea about boundaries",
      },
      owner,
    ),
  );
  assert.match(s.pending.prompt, /outcome:gap/);
  assert.match(s.pending.prompt, /"probe"/);
  assert.throws(
    () =>
      app.call(
        "reply_study_terminal_turn",
        {
          demoId: s.demoId,
          turnId: s.pending.turnId,
          text: "x",
          complete: true,
          outcome: "partial",
        },
        owner,
      ),
    /outcome solved\|gap/,
  );
  s = state(
    app.call(
      "reply_study_terminal_turn",
      {
        demoId: s.demoId,
        turnId: s.pending.turnId,
        text: "Recorded the boundary gap; demo key granted.",
        complete: true,
        outcome: "gap",
        knowledge: {
          facets: [
            { id: "invariant-boundary", status: "gap" },
            { id: "not-a-facet", status: "gap" },
          ],
          signal: { fluency: "declared-gap" },
        },
      },
      owner,
    ),
  );
  assert.equal(s.keys, 1);
  assert.equal(s.solved, true);
  assert.equal(s.outcome, "gap");
  assert.deepEqual(s.gaps, ["invariant-boundary"]);
});
