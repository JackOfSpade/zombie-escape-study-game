import { readFileSync } from "node:fs";
import {
  parseRunDesign,
  parseRunStructure,
} from "../../src/run-design-contract.mjs";

export type EnvironmentFixtureName =
  "harbor-inscriptions" | "observatory-inscriptions";
/** Complete synthetic physical inventory and individual writing/art; no bridge. */
export function environmentDesignFixture(
  name: EnvironmentFixtureName = "harbor-inscriptions",
) {
  const design = parseRunDesign(
    JSON.parse(readFileSync(`tests/fixtures/run-designs/${name}.json`, "utf8")),
  );
  if (design.version !== 3)
    throw Error("Expected a complete version 3 fixture");
  return design;
}
export function environmentStructureFixture(name?: EnvironmentFixtureName) {
  const { environment: _environment, ...structure } =
    environmentDesignFixture(name);
  return parseRunStructure(structure);
}
