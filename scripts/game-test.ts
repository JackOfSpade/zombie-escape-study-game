import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import {
  discoverGameTests,
  readGameTest,
  uniqueGameTests,
} from "./lib/game-test-catalog";
import { TestRunner, type TestResult } from "../src/gametest/runner";
import type { Scenario } from "../src/gametest/schema";
import type { Roadmap } from "../src/model";

const args = process.argv.slice(2);
const errors: {
  source: string;
  error: string;
  scenario?: Scenario;
  replay?: string;
}[] = [];
const results: (TestResult & {
  source: string;
  scenario: Scenario;
  replay?: string;
})[] = [];
let output: string | undefined;
let artifacts: string | undefined;
function save(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
}
function publish(value: unknown) {
  if (output === "-") console.log(JSON.stringify(value, null, 2));
  else if (output) save(output, value);
}
function suiteReport() {
  return {
    version: 1,
    summary: {
      total: results.length + errors.length,
      passed: results.filter((r) => r.status === "passed").length,
      failed: results.filter((r) => r.status === "failed").length,
      unverified: results.filter((r) => r.status === "unverified").length,
      errors: errors.length,
    },
    results,
    errors,
  };
}

try {
  const files: string[] = [];
  let filter: string | undefined;
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (
      ![
        "--list",
        "--help",
        "--scenario",
        "--filter",
        "--json",
        "--artifacts",
      ].includes(key)
    )
      throw Error(`Unknown option: ${key}`);
    if (seen.has(key) && key !== "--scenario")
      throw Error(`Duplicate option: ${key}`);
    seen.add(key);
    if (["--list", "--help"].includes(key)) continue;
    const value = args[++i];
    if (!value || value.startsWith("--")) throw Error(`${key} needs a value`);
    if (key === "--scenario") files.push(value);
    if (key === "--filter") filter = value;
    if (key === "--json") output = value;
    if (key === "--artifacts") artifacts = resolve(value);
  }
  if (seen.has("--help")) {
    console.log(
      "Usage: npm run test:game -- [--list] [--filter ID] [--scenario setup.json ...] [--json result.json|-] [--artifacts DIRECTORY]\nExit 0: all passed; exit 1: failed, unverified, invalid input or invocation. No browser, server or AI connection required.",
    );
  } else {
    const inputs = uniqueGameTests(
      files.length ? files.map(readGameTest) : discoverGameTests(),
    ).filter(
      (input) =>
        !filter || !input.scenario || input.scenario.id.includes(filter),
    );
    if (!inputs.length) throw Error("No matching scenarios.");
    if (seen.has("--list")) {
      const scenarios = inputs.flatMap((input) => {
        if (!input.scenario) {
          errors.push({ source: input.source, error: input.error! });
          return [];
        }
        const s = input.scenario;
        return [
          {
            id: s.id,
            name: s.name,
            seed: s.seed,
            maxTicks: s.maxTicks,
            simulation: s.simulation,
            source: input.source,
          },
        ];
      });
      publish({ version: 1, scenarios, errors });
      if (output !== "-") {
        for (const s of scenarios) console.log(`${s.id}: ${s.name}`);
        for (const e of errors) console.error(`${e.source}: ${e.error}`);
      }
    } else {
      const roadmap = JSON.parse(
        readFileSync(
          new URL("../public/curriculum.json", import.meta.url),
          "utf8",
        ),
      ) as Roadmap;
      for (const input of inputs) {
        if (!input.scenario) {
          errors.push({ source: input.source, error: input.error! });
          continue;
        }
        const scenario = input.scenario;
        try {
          const result = {
            ...new TestRunner(scenario, roadmap).run(),
            source: input.source,
            scenario,
          };
          results.push(result);
        } catch (error) {
          errors.push({ source: input.source, error: String(error), scenario });
        }
      }
      if (artifacts) {
        // Overwrite named outputs for selected cases; never delete caller files.
        for (const e of errors) {
          if (!e.scenario) continue;
          e.replay = join(artifacts, `${e.scenario.id}.scenario.json`);
          save(e.replay, e.scenario);
          save(join(artifacts, `${e.scenario.id}.result.json`), e);
        }
        for (const r of results) {
          const base = join(artifacts, r.id);
          r.replay = `${base}.scenario.json`;
          save(r.replay, r.scenario);
          save(`${base}.result.json`, r);
        }
      }
      const report = suiteReport();
      if (artifacts) save(join(artifacts, "report.json"), report);
      publish(report);
      if (output !== "-") {
        for (const r of results) {
          console.log(`${r.status.toUpperCase()} ${r.id} (${r.tick} ticks)`);
          if (r.error) console.log(`  ${r.error}`);
          for (const c of r.checks.filter((c) => c.status !== "passed"))
            console.log(`  ${c.message}`);
        }
        for (const e of errors) console.error(`${e.source}: ${e.error}`);
      }
    }
    if (errors.length || results.some((r) => r.status !== "passed"))
      process.exitCode = 1;
  }
} catch (error) {
  errors.push({ source: "invocation", error: String(error) });
  const report = suiteReport();
  try {
    if (artifacts) save(join(artifacts, "report.json"), report);
  } catch (writeError) {
    console.error(String(writeError));
  }
  try {
    publish(report);
  } catch (writeError) {
    console.error(String(writeError));
  }
  if (output !== "-") console.error(String(error));
  process.exitCode = 1;
}
