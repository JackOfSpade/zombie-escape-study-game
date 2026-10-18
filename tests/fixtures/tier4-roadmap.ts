import { createHash } from "node:crypto";
import { finalRequirements } from "../../src/final-requirements";
import type { Roadmap } from "../../src/model";

// Synthetic alternate source for isolated tests only. Never persisted to user data.
export function tier4RoadmapFixture(original: Roadmap) {
  const r = structuredClone(original);
  for (const track of ["PY", "PE"] as const) {
    const t = r.tracks[track];
    for (const o of t.objectives)
      o.cells = o.cells.map((s) => (s === "—" ? s : "P"));
    t.progress = t.progress
      .split("\n")
      .map((line) => {
        if (/^\| [TX]\d{2}\.\d+ \|/.test(line)) {
          const c = line.split("|");
          for (let i = 3; i <= 6; i++) if (c[i].trim() !== "—") c[i] = " P ";
          return c.join("|");
        }
        if (/^\| G\d+ \|/.test(line)) {
          const c = line.split("|");
          c[7] = " CLOSED; synthetic imported proof ";
          return c.join("|");
        }
        return line;
      })
      .join("\n");
    const begin = `<!-- BEGIN ${track}_PROGRESS -->`,
      end = `<!-- END ${track}_PROGRESS -->`;
    const old = r.raw.split(begin)[1].split(end)[0];
    r.raw = r.raw.replace(begin + old + end, begin + t.progress + end);
    t.tier = 4;
    t.phase = "DIAGNOSE_ALL";
    t.remaining = finalRequirements(r, track)
      .filter((d) => d.kind === "transfer")
      .map((d) => d.name);
  }
  r.sourceHash = createHash("sha256").update(r.raw).digest("hex");
  return r;
}
