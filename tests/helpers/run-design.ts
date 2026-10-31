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
  const design = parseRunDesign(
    JSON.parse(readFileSync(`tests/fixtures/run-designs/${name}.json`, "utf8")),
  );
  if (design.version === 3)
    throw Error("Expected a historical run-design fixture");
  return design;
}

/** Synthetic object-by-object scenes; no live AI or real save data. */
export function sceneDesignFixture(
  name: "botanical-office" | "observatory-records" = "botanical-office",
) {
  const design = parseRunDesign(
    JSON.parse(readFileSync(`tests/fixtures/run-designs/${name}.json`, "utf8")),
  );
  if (design.version === 3) throw Error("Expected a historical scene fixture");
  return design;
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
