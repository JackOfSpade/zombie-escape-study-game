import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { emptyScenario } from "../src/gametest/schema";
import { preset } from "../src/gametest/presets";
import { uniqueGameTests } from "../scripts/lib/game-test-catalog";
function cli(...args: string[]) {
  return spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/game-test.ts", "--json", "-", ...args],
    { encoding: "utf8", timeout: 60000 },
  );
}
function temporary(run: (root: string) => void) {
  const root = mkdtempSync(join(tmpdir(), "agent-game-tests-"));
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
test("agents discover and run an existing case with JSON only and no running browser/server", () => {
  const list = cli("--list", "--filter", "room-with-gap");
  assert.equal(list.status, 0, list.stderr);
  const catalog = JSON.parse(list.stdout);
  assert.equal(catalog.scenarios.length, 1);
  assert.equal(catalog.scenarios[0].id, "room-with-gap");
  assert.equal(catalog.scenarios[0].source, "builtin:room-with-gap");
  const run = cli("--filter", catalog.scenarios[0].id);
  assert.equal(run.status, 0, run.stderr);
  const report = JSON.parse(run.stdout);
  assert.equal(report.summary.passed, 1);
  assert.equal(report.results[0].scenario.id, "room-with-gap");
});
test("agent-authored failure exports exact replay; a subsequent corrected run refreshes artifacts", () =>
  temporary((root) => {
    const s = emptyScenario();
    s.maxTicks = 2;
    s.checks = [
      {
        name: "Deliberate failure",
        mode: "always",
        query: { type: "property", id: "human", field: "hp" },
        op: "eq",
        expected: 99,
      },
    ];
    const input = join(root, "new-test.json"),
      artifacts = join(root, "artifacts");
    writeFileSync(input, JSON.stringify(s));
    const run = cli("--scenario", input, "--artifacts", artifacts);
    assert.equal(run.status, 1, run.stderr);
    const report = JSON.parse(run.stdout),
      result = report.results[0];
    assert.deepEqual(report.summary, {
      total: 1,
      passed: 0,
      failed: 1,
      unverified: 0,
      errors: 0,
    });
    assert.equal(result.tick, 1);
    assert.equal(result.checks[0].actual, 100);
    assert.equal(result.checks[0].expected, 99);
    assert.deepEqual(JSON.parse(readFileSync(result.replay, "utf8")), s);
    assert.deepEqual(
      JSON.parse(readFileSync(join(artifacts, "report.json"), "utf8")),
      report,
    );
    const replay = cli("--scenario", result.replay);
    assert.equal(replay.status, 1);
    const repeated = JSON.parse(replay.stdout).results[0];
    for (const key of ["seed", "tick", "checks", "actions", "positions"])
      assert.deepEqual(repeated[key], result[key]);
    s.checks[0].expected = 100;
    writeFileSync(input, JSON.stringify(s));
    const fixed = cli("--scenario", input, "--artifacts", artifacts);
    assert.equal(fixed.status, 0, fixed.stderr);
    assert.equal(
      JSON.parse(readFileSync(join(artifacts, s.id + ".result.json"), "utf8"))
        .status,
      "passed",
    );
  }));
test("malformed and construction-failing cases are reported while independent cases still run", () =>
  temporary((root) => {
    const invalid = join(root, "bad.json"),
      crowded = join(root, "crowded.json"),
      good = join(root, "good.json");
    writeFileSync(invalid, '{"version":');
    const s = emptyScenario();
    s.id = "too-many-characters";
    for (let i = 0; i < 129; i++)
      s.entities.push({ id: `npc-${i}`, kind: "npc", x: 5, y: 5 });
    writeFileSync(crowded, JSON.stringify(s));
    writeFileSync(good, JSON.stringify(preset("room-with-gap")));
    const run = cli(
      "--scenario",
      invalid,
      "--scenario",
      crowded,
      "--scenario",
      good,
      "--artifacts",
      join(root, "artifacts"),
    );
    assert.equal(run.status, 1, run.stderr);
    const report = JSON.parse(run.stdout);
    assert.equal(report.summary.errors, 2);
    assert.equal(report.summary.passed, 1);
    assert.equal(report.summary.total, 3);
    assert.equal(report.errors[0].source, invalid);
    assert.equal(report.errors[1].source, crowded);
    assert.equal(report.errors[1].scenario.id, "too-many-characters");
    assert.ok(existsSync(report.errors[1].replay));
    assert.ok(existsSync(join(root, "artifacts", "report.json")));
  }));
test("unverified cases and empty selections never produce successful agent exit codes", () =>
  temporary((root) => {
    const s = emptyScenario();
    s.maxTicks = 1;
    const input = join(root, "sandbox.json");
    writeFileSync(input, JSON.stringify(s));
    const run = cli("--scenario", input);
    assert.equal(run.status, 1);
    assert.equal(JSON.parse(run.stdout).summary.unverified, 1);
    const empty = cli("--filter", "does-not-exist");
    assert.equal(empty.status, 1);
    assert.match(JSON.parse(empty.stdout).errors[0].error, /No matching/);
  }));
test("invalid flags and duplicate scenario IDs produce structured errors", () =>
  temporary((root) => {
    const bad = cli("--unknown");
    assert.equal(bad.status, 1);
    assert.match(JSON.parse(bad.stdout).errors[0].error, /Unknown option/);
    const input = join(root, "same.json");
    writeFileSync(input, JSON.stringify(preset("room-with-gap")));
    const duplicate = cli("--scenario", input, "--scenario", input);
    assert.equal(duplicate.status, 1);
    const report = JSON.parse(duplicate.stdout);
    assert.equal(report.summary.passed, 1);
    assert.match(report.errors[0].error, /Duplicate GameTest ID/);
    assert.equal(
      uniqueGameTests([{ source: "bad", error: "invalid" }])[0].error,
      "invalid",
    );
  }));

test("artifact write failure preserves machine-readable results and returns nonzero", () =>
  temporary((root) => {
    const blocked = join(root, "not-a-directory");
    writeFileSync(blocked, "keep");
    const run = cli("--filter", "room-with-gap", "--artifacts", blocked);
    assert.equal(run.status, 1);
    const report = JSON.parse(run.stdout);
    assert.equal(report.summary.passed, 1);
    assert.equal(report.summary.errors, 1);
    assert.equal(report.summary.total, 2);
    assert.match(report.errors[0].error, /EEXIST|ENOTDIR/);
    assert.equal(readFileSync(blocked, "utf8"), "keep");
  }));
