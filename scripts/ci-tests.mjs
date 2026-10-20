// Stable discovery keeps every root test in exactly one CI shard.
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
const shard = process.argv[2];
assert.match(shard ?? "", /^[1-4]\/4$/, "Use one of 1/4, 2/4, 3/4, 4/4");
const files = readdirSync("tests")
  .filter((name) => /\.test\.(ts|mjs)$/.test(name))
  .sort()
  .map((name) => `tests/${name}`);
assert.ok(files.length > 0, "The CI suite must not be empty");
const child = spawnSync(
  process.execPath,
  [
    "--import",
    "tsx",
    "--test",
    "--test-concurrency=2",
    `--test-shard=${shard}`,
    ...files,
  ],
  { stdio: "inherit" },
);
if (child.error) throw child.error;
process.exitCode = child.status ?? 1;
