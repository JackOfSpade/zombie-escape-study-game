import assert from "node:assert/strict";
import test from "node:test";
import {
  ENVIRONMENT_FACTS,
  environmentSurfaceFingerprint,
  normalizeEnvironmentText,
  parseEnvironmentSummaries,
  summarizeEnvironment,
  type EnvironmentManifest,
  type SurfaceContent,
  type SurfaceRole,
  type SurfaceSlot,
} from "../src/environment-contract.mjs";
import { summarizeQualityEnvironment } from "../src/environment-history";
import { runDesignFingerprint } from "../src/run-design-contract.mjs";
import { environmentDesignFixture } from "./helpers/environment-design";

function slot(
  id: string,
  floor: number,
  room: number,
  role: SurfaceRole,
): SurfaceSlot {
  return {
    id,
    floor,
    scope: "interior",
    role,
    room,
    owner: null,
    binding: {
      kind: "fixed",
      x: 5,
      y: 6,
      z: 1.6,
      yaw: 0,
      pitch: 0,
      width: 0.6,
      height: 0.8,
    },
    context: "Synthetic history sample",
    maxTitle: 48,
    maxBody: 240,
    allowsArt: true,
  };
}
function entry(surfaceId: string, text: string): SurfaceContent {
  return {
    surfaceId,
    layout: "text",
    title: [{ text }],
    body: [],
    description: "",
    drawing: null,
  };
}
function manifest(
  surfaces: SurfaceSlot[],
  entries: SurfaceContent[],
): EnvironmentManifest {
  return {
    version: 1,
    surfaceFingerprint: environmentSurfaceFingerprint(surfaces),
    surfaces,
    fragments: [],
    entries,
  };
}

test("history retains short writing from later floors and different rooms despite a crowded long-prose first floor", () => {
  const surfaces: SurfaceSlot[] = [],
    entries: SurfaceContent[] = [];
  for (let i = 0; i < 48; i++) {
    const id = `f0-poster-${i}`,
      e = entry(id, `Archive placard ${i}`);
    e.body = [
      {
        text: `Recorded archive observation ${i}: the overnight clerks placed the returned notebooks beside the station ledger before leaving for the waterfront.`,
      },
    ];
    surfaces.push(slot(id, 0, 0, "wall-poster"));
    entries.push(e);
  }
  const roles: SurfaceRole[] = [
    "desk-note",
    "room-plaque",
    "wall-whiteboard",
    "furniture-label",
  ];
  for (let floor = 1; floor <= 3; floor++)
    for (let room = 0; room < 4; room++) {
      const id = `f${floor}-room${room}`;
      surfaces.push(slot(id, floor, room, roles[room]));
      entries.push(entry(id, `Tea rota ${floor}${room}`));
    }
  const source = manifest(surfaces, entries),
    summary = summarizeQualityEnvironment(source);
  assert.equal(summary.phrases.length, 32);
  for (let floor = 1; floor <= 3; floor++)
    for (let room = 0; room < 4; room++)
      assert.ok(
        summary.phrases.includes(`tea rota ${floor}${room}`),
        `short writing from floor ${floor}, room ${room} must remain visible`,
      );
  assert.ok(summary.phrases.some((phrase) => phrase.length > 80));
  assert.ok(
    summarizeEnvironment(source).phrases.every(
      (phrase) => !phrase.startsWith("tea rota"),
    ),
    "the retained legacy algorithm demonstrates why representative selection is needed",
  );
  assert.deepEqual(parseEnvironmentSummaries([summary]), [summary]);
});

test("drawing history represents later floors and roles, with descriptions paired to exact composition hashes", () => {
  const surfaces: SurfaceSlot[] = [],
    entries: SurfaceContent[] = [];
  for (let i = 0; i < 44; i++) {
    const floor = i < 40 ? 0 : i - 39,
      role = i < 40 ? "wall-poster" : "graffiti",
      id = `art-${i}`,
      e = entry(id, `Illustration ${i}`);
    e.layout = "mixed";
    e.description = `A ${floor ? "stairwell" : "reception"} sketch of subject ${i}.`;
    e.drawing = {
      version: 1,
      background: "#abcdef",
      primitives: [
        {
          kind: "ellipse",
          x: i / 100,
          y: 0.1,
          w: 0.3,
          h: 0.4,
          rotation: 0,
          fill: "#aabbcc",
          stroke: null,
          width: 0.01,
          opacity: 1,
        },
      ],
    };
    surfaces.push(slot(id, floor, 0, role));
    entries.push(e);
  }
  const source = manifest(surfaces, entries),
    summary = summarizeQualityEnvironment(source),
    legacy = summarizeEnvironment(source);
  assert.equal(summary.art.length, 32);
  assert.equal(summary.artDescriptions!.length, summary.art.length);
  for (const e of entries.slice(40)) {
    const hash = runDesignFingerprint(e.drawing),
      index = summary.art.indexOf(hash);
    assert.ok(index >= 0, `later drawing ${e.surfaceId} is represented`);
    assert.equal(
      summary.artDescriptions![index],
      `${e.description} [1 ellipse]`,
    );
    assert.ok(!legacy.art.includes(hash));
  }
  assert.deepEqual(parseEnvironmentSummaries([summary]), [summary]);
});

test("shared branding, connected clues and engine facts never become ordinary prose to avoid across runs", () => {
  const surfaces = [
      slot("notice-a", 0, 0, "wall-poster"),
      slot("notice-b", 1, 1, "wall-poster"),
    ],
    entries = [entry("notice-a", "unused"), entry("notice-b", "unused")],
    source = manifest(surfaces, entries);
  source.fragments = [
    {
      id: "brand",
      kind: "branding",
      text: "Willow Cooperative",
      reason: "The same employer identifies its correspondence.",
      surfaces: ["notice-a", "notice-b"],
    },
    {
      id: "clue",
      kind: "clue",
      text: "The violet thread",
      reason: "Two deliberate parts of one fictional correspondence.",
      surfaces: ["notice-a", "notice-b"],
    },
    {
      id: "route",
      kind: "direction",
      fact: "rooftop-extraction",
      reason: "Fixed extraction directions.",
      surfaces: ["notice-a", "notice-b"],
    },
  ];
  entries[0].title = [{ fragmentId: "brand" }];
  entries[0].body = [
    { text: "Brass umbrella " },
    { fragmentId: "clue" },
    { text: " left with reception" },
  ];
  entries[1].title = [{ fragmentId: "route" }];
  entries[1].body = [{ text: ENVIRONMENT_FACTS["no-street-extraction"] }];
  const summary = summarizeQualityEnvironment(source);
  assert.deepEqual(
    new Set(summary.phrases),
    new Set(["brass umbrella", "left with reception"]),
  );
  for (const fact of Object.values(ENVIRONMENT_FACTS))
    assert.ok(!summary.phrases.includes(normalizeEnvironmentText(fact)));
  assert.ok(!summary.phrases.some((phrase) => phrase.includes("violet")));
  assert.ok(!summary.phrases.some((phrase) => phrase.includes("willow")));
});

test("representative history is bounded, deterministic, order-independent in selection and leaves accepted manifests unchanged", () => {
  const source = environmentDesignFixture().environment,
    before = JSON.stringify(source),
    summary = summarizeQualityEnvironment(source),
    reordered = structuredClone(source);
  reordered.surfaces.reverse();
  reordered.entries.reverse();
  const other = summarizeQualityEnvironment(reordered);
  assert.equal(JSON.stringify(source), before);
  assert.deepEqual(summarizeQualityEnvironment(source), summary);
  assert.deepEqual(other.phrases, summary.phrases);
  assert.deepEqual(other.art, summary.art);
  assert.deepEqual(other.artDescriptions, summary.artDescriptions);
  assert.equal(summary.fingerprint, summarizeEnvironment(source).fingerprint);
  assert.ok(summary.phrases.length <= 32);
  assert.ok(summary.art.length <= 32);
  assert.equal(new Set(summary.phrases).size, summary.phrases.length);
  assert.equal(new Set(summary.art).size, summary.art.length);
  assert.ok(summary.phrases.every((phrase) => phrase.length <= 120));
  assert.ok(
    summary.artDescriptions!.every((description) => description.length <= 160),
  );
  assert.deepEqual(parseEnvironmentSummaries([summary]), [summary]);
});
