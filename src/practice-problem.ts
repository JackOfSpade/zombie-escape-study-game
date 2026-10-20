import { eligible } from "./curriculum";
import { openGaps } from "./knowledge-probe";
import {
  type Contract,
  type Game,
  type Roadmap,
  type Problem,
  rand,
} from "./model";
/** Gaps the learner declared on this question's own objective, so the extra line is never off-topic. */
function gapLine(g: Game, contract: Contract) {
  const gaps = openGaps(g)
    .filter(
      (r) =>
        r.track === contract.track &&
        r.objectiveIds.some((id) => contract.objectiveIds.includes(id)),
    )
    .slice(-5)
    .map((r) => r.facet.description);
  return gaps.length
    ? `\n\nYou flagged this as a gap earlier, so cover it too: ${gaps.join("; ")}.`
    : "";
}
export function devProblem(
  g: Game,
  r: Roadmap,
  contract: Contract = eligible(r, g.study),
): Problem {
  const n = 3 + Math.floor(rand(g) * 6),
    values = Array.from({ length: n }, () => Math.floor(rand(g) * 8)),
    threshold = 2 + Math.floor(rand(g) * 4);
  if (contract.track === "PY" && contract.objectiveIds[0] === "PY:T05.2") {
    const size = 2 + Math.floor(rand(g) * Math.min(3, n - 1)),
      sums = values
        .slice(0, n - size + 1)
        .map((_, i) => values.slice(i, i + size).reduce((a, b) => a + b, 0));
    return {
      title: "Signal window / prediction",
      // Player-facing text only: the scheduled scope stays in the contract.
      prompt: `An intake monitor reads ${JSON.stringify(values)}. A window of ${size} consecutive readings slides one position at a time.\n\nPredict the largest window total. Explain what changes and what stays the same each time the window slides, and name one edge case worth checking. No code is needed.${gapLine(g, contract)}`,
      rubric: [
        "Correct predicted total",
        "Explain update/state and a relevant boundary",
      ],
      starter: "",
      provenance: "development",
      validation: { kind: "trace", answer: Math.max(...sums) },
      contract,
    };
  }
  return {
    title:
      contract.track === "PY"
        ? "Signal contract / trace"
        : "Product decision / critique",
    prompt:
      contract.objectiveIds[0] === "PE:X09.1"
        ? `Use a real project you worked on. Briefly state the user problem, your personal role, and one actual decision. Separate your own work from the team’s work. Do not invent metrics.\n\nWhat to cover: ${contract.scopes[0]}${gapLine(g, contract)}`
        : contract.track === "PY"
          ? `Read this small Python trace:\n\nvalues = ${JSON.stringify(values)}\ncount = 0\nfor value in values:\n    if value > ${threshold}:\n        count += 1\n\nPredict the final value of count. Explain what count means partway through, after the loop has seen only the first few values, and name one edge case worth checking. No code is needed.${gapLine(g, contract)}`
          : `A creative tool lets a signed-in owner share a project with a read-only collaborator through a link the owner can revoke at any time. About ${n * 100} people use it each day. Support reports that collaborators are confused when a link suddenly stops working, and a product manager proposes: "Email the collaborator every time a link is revoked."\n\nYour task: ${contract.scopes[0]}\n\nName one assumption you are making and one failure or edge case. No code is needed, and several answers can be right.${gapLine(g, contract)}`,
    rubric: [
      "Address the supplied contract",
      "Explain assumptions and a boundary",
      "Use real personal history for narratives",
    ],
    starter: "",
    provenance: "development",
    validation:
      contract.track === "PY"
        ? { kind: "trace", answer: values.filter((v) => v > threshold).length }
        : undefined,
    contract,
  };
}
