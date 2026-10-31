import { readFileSync } from "node:fs";
import {
  parseRunDesign,
  runDesignFingerprint,
  type RunDesign,
  type SavedRunDesign,
} from "../../src/run-design-contract.mjs";

export function runDesignFixture(
  name: "harbor-archive" | "glass-orchard" = "harbor-archive",
) {
  return parseRunDesign(
    JSON.parse(readFileSync(`tests/fixtures/run-designs/${name}.json`, "utf8")),
  );
}

/** Synthetic object-by-object scenes; no live AI or real save data. */
export function sceneDesignFixture(
  name: "botanical-office" | "observatory-records" = "botanical-office",
) {
  return parseRunDesign(
    JSON.parse(readFileSync(`tests/fixtures/run-designs/${name}.json`, "utf8")),
  );
}

export function savedRunDesign(
  design: RunDesign = runDesignFixture(),
): SavedRunDesign {
  return {
    version: 1,
    source: "fixture",
    requestId: "synthetic-design-request",
    generationId: "synthetic-design-generation",
    fingerprint: runDesignFingerprint(design),
    design,
  };
}
