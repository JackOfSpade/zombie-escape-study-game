import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { activateCareerFocus } from "../src/career-profile";
import { initialStudy } from "../src/curriculum";
import type { Contract, Roadmap } from "../src/model";
import { studyMapHtml } from "../src/study-map";
import { createPlayableGame } from "../src/world";

const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
function setup() {
  const r = structuredClone(roadmap);
  const s = initialStudy(r, "live");
  activateCareerFocus(r, s);
  return { r, g: createPlayableGame(125, r, s) };
}
const issued: Contract = {
  id: "issued-synthetic",
  track: "PE",
  objectiveIds: ["PE:T10.2"],
  scopes: ["Synthetic scope"],
  depth: 1,
  phase: "DIAGNOSE_ALL",
  review: false,
  ledgerVersion: 0,
  priorEvidence: [],
};

test("issued topic is the highlighted node, with real topic and tier counts", () => {
  const { r, g } = setup();
  const html = studyMapHtml(g, r, issued);
  assert.match(html, /7<small> of 131/);
  assert.match(
    html,
    /study-map-topic is-current" data-topic-key="PE:T10"[^>]*aria-current="step"/,
  );
  assert.doesNotMatch(html, /study-checkpoint|<details/);
  assert.match(html, /Probing now/);
  assert.match(html, /1<small> of 2/);
});

test("carried question outside active requirements never highlights a different required checkpoint", () => {
  const { r, g } = setup();
  // T01 remains required, but this particular objective is reference material.
  const html = studyMapHtml(g, r, { ...issued, objectiveIds: ["PE:T01.2"] });
  assert.match(html, /Outside active profile requirements/);
  assert.doesNotMatch(html, /class="study-map-topic is-current"/);
  assert.doesNotMatch(html, /data-study-locate/);
});

test("lower-tier review keeps map totals at the current tier and labels the topic review", () => {
  const { r, g } = setup();
  g.study.learner!.tracks.PE.tier = 2;
  const html = studyMapHtml(g, r, { ...issued, review: true });
  assert.match(html, /Tier 2/);
  assert.match(html, /0<small> of 51/);
  assert.match(html, /1<small> of 2/);
  assert.match(html, /RETENTION REVIEW/);
  assert.match(html, /Reviewing Tier 1/);
  assert.match(html, /study-map-topic is-current" data-topic-key="PE:T10"/);
});

test("final transfer requirements are separate from ordinary checkpoint totals", () => {
  const { r, g } = setup();
  g.study.learner!.tracks.PE.tier = 4;
  const html = studyMapHtml(g, r, {
    ...issued,
    kind: "transfer",
    depth: 4,
    objectiveIds: ["PE:T01"],
  });
  assert.match(html, /Final requirement · separate from checkpoint totals/);
  assert.doesNotMatch(html, /class="study-map-topic is-current"/);
});

test("topic names are escaped and the diagram contains no deeper checkpoint expansion", () => {
  const { r, g } = setup();
  r.tracks.PE.topics.T10 = '<img src=x onerror="unsafe">';
  r.tracks.PE.objectives.find((o) => o.id === "PE:T10.2")!.scope =
    "<script>unsafe</script>";
  g.study.knowledgeGaps = [
    {
      id: "synthetic-gap",
      encounter: "synthetic",
      runId: "synthetic",
      track: "PE",
      objectiveIds: ["PE:T10.2"],
      depth: 1,
      facet: { id: "request", description: "<b>Observed gap</b>" },
      statement: "Synthetic gap declaration",
      requestId: "synthetic",
      provider: "synthetic",
      at: "2026-10-25T12:00:00Z",
    },
  ];
  const html = studyMapHtml(g, r, issued);
  assert.doesNotMatch(html, /<script>|<img|<b>/);
  assert.match(html, /&lt;img src=x onerror=&quot;unsafe&quot;&gt;/);
  assert.doesNotMatch(
    html,
    /<details|study-checkpoint|Observed gap|Saved learning notes/,
  );
  assert.doesNotMatch(html, /Assessment evidence/);
});
