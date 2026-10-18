import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { compoundEgress } from "./lib/compound-egress";
import { gameFingerprint } from "./lib/game-fingerprint";
const r = JSON.parse(readFileSync("public/curriculum.json", "utf8"));
const cases = [0, 1, 2].map((seed) => compoundEgress(r, seed, true));
const report = {
  source: gameFingerprint(),
  scope:
    "Controlled credentialed NPC egress through actual human-built cover; manual witness and autonomous counterpart start from identical geometry. Live pursuit removed after preparation to isolate navigation. Credential assigned only to fixture NPC; no real human learning or full-population/balance claim.",
  baseline: {
    source: "a1d95e5fa7262d8b0a49aff95e6064dd0d5c3a47aa18e03188ef5b08ba67c14d",
    observed: [0, 1, 2].map((seed) => ({ seed, seconds: 120, floor: 0 })),
    description:
      "Pre-fix diagnostic observed all three remain at their original station for 120s despite manual exit witness. Diagnostic stopping conditions were actual floor transition, not defense credit.",
  },
  drivers: [
    "scripts/lib/compound-egress.ts",
    "scripts/probe-compound-egress.ts",
  ].map((path) => ({
    path,
    sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
  })),
  cases,
};
writeFileSync(
  "docs/evidence/compound-egress.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(cases));
