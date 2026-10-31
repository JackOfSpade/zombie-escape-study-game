import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { sceneSaveErrors } from "../src/authored-scene";
import { buildingLayoutErrors } from "../src/building-layout";
import { assertDesignedEnvironment } from "../src/environment-save";
import {
  buildEnvironmentSurfaces,
  surfaceWorldPose,
} from "../src/environment-surfaces";
import { parseEnvironmentSurfaces } from "../src/environment-contract.mjs";
import { TestRunner } from "../src/gametest/runner";
import { parseScenario } from "../src/gametest/schema";
import { fnv1a } from "../src/hash";
import type { Roadmap } from "../src/model";
import { decode, encode } from "../src/persistence";
import {
  parseSavedRunDesign,
  runDesignFingerprint,
} from "../src/run-design-contract.mjs";
import {
  createGame,
  createPlayableGame,
  finalizeDesignedRun,
  previewDesignedRun,
} from "../src/world";
import {
  environmentDesignFixture,
  environmentStructureFixture,
} from "./helpers/environment-design";
import { savedRunDesign } from "./helpers/run-design";

const roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
) as Roadmap;
const build = () =>
  createPlayableGame(
    42,
    roadmap,
    undefined,
    savedRunDesign(environmentDesignFixture()),
  );

test("both complete v3 fixtures rebuild their exact physical inventory through the provisional and accepted paths", () => {
  for (const name of [
    "harbor-inscriptions",
    "observatory-inscriptions",
  ] as const) {
    const design = environmentDesignFixture(name),
      structure = environmentStructureFixture(name),
      token = previewDesignedRun(42, roadmap, undefined, structure);
    assert.equal("game" in token, false);
    assert.equal("design" in token, false);
    assert.equal(token.builderVersion, "environment-v1");
    assert.deepEqual(token.surfaces, design.environment.surfaces);
    assert.equal(
      token.surfaceFingerprint,
      design.environment.surfaceFingerprint,
    );
    assert.ok(token.surfaces.length > 200);
    assert.equal(
      new Set(token.surfaces.map((s) => s.id)).size,
      token.surfaces.length,
    );
    parseEnvironmentSurfaces(
      token.surfaces,
      structure.roster.map((a) => a.name),
    );
    const game = finalizeDesignedRun(token, savedRunDesign(design)),
      fresh = createPlayableGame(
        42,
        roadmap,
        undefined,
        savedRunDesign(design),
      );
    assert.deepEqual(game.floors, fresh.floors);
    assert.equal(game.rng, fresh.rng);
    assert.equal(game.helicopter.next, design.pacing.firstHelicopter);
    assert.deepEqual(buildingLayoutErrors(game), []);
    assertDesignedEnvironment(game);
    for (const floor of game.floors)
      assert.deepEqual(sceneSaveErrors(floor), []);
    assert.throws(
      () => finalizeDesignedRun(token, savedRunDesign(design)),
      /already accepted/,
    );
  }
});

test("unrelated object array ordering does not renumber or reassign visible surfaces", () => {
  const game = build(),
    original = buildEnvironmentSurfaces(game);
  for (const floor of game.floors) floor.furniture.reverse();
  game.floors[0].city!.obstacles.reverse();
  assert.deepEqual(buildEnvironmentSurfaces(game), original);
});

test("every eligible class has its own slot and authored whiteboards have a real writing face", () => {
  const game = build(),
    slots =
      game.design!.design.version === 3
        ? game.design!.design.environment.surfaces
        : [];
  for (const role of [
    "wall-poster",
    "wall-whiteboard",
    "desk-papers",
    "desk-note",
    "desk-photo",
    "furniture-whiteboard",
    "furniture-label",
    "prop-face",
    "room-plaque",
    "building-sign",
    "quarantine-sign",
    "storefront-sign",
    "street-sign",
    "graffiti",
  ])
    assert.ok(
      slots.some((s) => s.role === role),
      role,
    );
  assert.equal(
    slots.some((s) => /stairs|rooftop-assembly/.test(s.id)),
    false,
  );
  const structure = environmentStructureFixture(),
    room = structure.floors[0].scene.rooms[0];
  room.furniture.push({
    id: "planning-board",
    kind: "whiteboard",
    at: { x: 0.6, y: 0.5 },
    angle: 0,
    color: "#d6d8cb",
    condition: "worn",
    owner: room.owner,
    props: [],
  });
  const token = previewDesignedRun(42, roadmap, undefined, structure),
    board = token.surfaces.find((s) =>
      s.id.includes("planning-board:whiteboard"),
    );
  assert.ok(board);
  assert.equal(board.role, "furniture-whiteboard");
  assert.equal(board.binding.kind, "furniture");
  assert.ok(board.binding.width > 1.5 && board.binding.height > 0.8);
});

test("saved local bindings follow moved and rotated hosts without reselection and hide destroyed or removed hosts", () => {
  const game = build(),
    floor = game.floors[0],
    slot = floor.environment!.surfaces.find((s) => s.binding.kind === "prop")!,
    binding = slot.binding;
  assert.equal(binding.kind, "prop");
  if (binding.kind !== "prop") return;
  const host = floor.furniture.find((f) => f.id === binding.furnitureId)!,
    before = surfaceWorldPose(floor, slot)!,
    inventory = JSON.stringify(game.design!.design);
  host.x += 1.7;
  host.y -= 0.8;
  host.angle = Math.PI / 2;
  host.hp -= 20;
  const moved = surfaceWorldPose(floor, slot)!;
  assert.ok(Math.hypot(before.x - moved.x, before.y - moved.y) > 1);
  const restored = decode(encode(game)),
    savedFloor = restored.floors[0];
  assert.deepEqual(surfaceWorldPose(savedFloor, slot), moved);
  assert.equal(JSON.stringify(restored.design!.design), inventory);
  assertDesignedEnvironment(restored);
  const savedHost = savedFloor.furniture.find((f) => f.id === host.id)!;
  savedHost.destroyed = true;
  assert.equal(surfaceWorldPose(savedFloor, slot), undefined);
  assertDesignedEnvironment(decode(encode(restored)));
  savedFloor.furniture = savedFloor.furniture.filter((f) => f.id !== host.id);
  assert.equal(surfaceWorldPose(savedFloor, slot), undefined);
  assertDesignedEnvironment(decode(encode(restored)));
});

test("provisional tokens and complete saved designs cannot be substituted or forged into partial active games", () => {
  const structure = environmentStructureFixture(),
    token = previewDesignedRun(42, roadmap, undefined, structure),
    saved = savedRunDesign(environmentDesignFixture());
  assert.throws(
    () => createGame(42, roadmap, undefined, { design: saved }),
    /createPlayableGame/,
  );
  assert.throws(
    () =>
      parseSavedRunDesign({
        ...saved,
        design: structure,
        fingerprint: runDesignFingerprint(structure),
      }),
    /missing a field/,
  );
  assert.throws(
    () =>
      finalizeDesignedRun(
        token,
        savedRunDesign(environmentDesignFixture("observatory-inscriptions")),
      ),
    /does not match/,
  );
  // Exposed inventory copies are not an authority that can mutate the private candidate.
  token.surfaces[0].binding.x += 100;
  const game = finalizeDesignedRun(token, saved);
  assertDesignedEnvironment(game);
});

test("save guards reject altered manifests and unsupported bindings before encoding or restoring", () => {
  const game = build(),
    before = encode(game),
    corrupted = JSON.parse(JSON.stringify(game));
  corrupted.floors[0].environment.entries[0].description =
    "Tampered visible material";
  assert.throws(() => encode(corrupted));
  const envelope = JSON.parse(before),
    payload = JSON.parse(envelope.payload);
  payload.floors[1].environment.surfaces[0].binding.x += 10;
  envelope.payload = JSON.stringify(payload);
  envelope.checksum = fnv1a(envelope.payload);
  assert.throws(() => decode(JSON.stringify(envelope)), /manifest differs/);
  // Canonical key ordering may change through another JSON writer without changing data.
  const ordinary = JSON.parse(before),
    reordered = JSON.parse(ordinary.payload);
  reordered.floors[0].environment = Object.fromEntries(
    Object.entries(reordered.floors[0].environment).reverse(),
  );
  ordinary.payload = JSON.stringify(reordered);
  ordinary.checksum = fnv1a(ordinary.payload);
  assertDesignedEnvironment(decode(JSON.stringify(ordinary)));
});

test("the offline v3 GameTest preserves every written/art object through an actual AI navigation checkpoint", () => {
  const scenario = parseScenario(
      readFileSync(
        "tests/fixtures/gametest/ai-environment-study-arrival.json",
        "utf8",
      ),
    ),
    runner = new TestRunner(scenario, roadmap),
    before = JSON.stringify(runner.game.design!.design);
  runner.run();
  assert.equal(runner.status, "passed");
  assert.equal(JSON.stringify(runner.game.design!.design), before);
  assert.equal(
    runner.actionResults.find((a) => a.type === "checkpoint")?.ok,
    true,
  );
  assertDesignedEnvironment(runner.game);
  assert.ok(
    runner.game.survivors.slice(1).every((a) => a.alive && a.thought > 0),
  );
});

test("v3 lab setup disables the generated invasion while preserving explicitly authored test entities", () => {
  const scenario = parseScenario(
    readFileSync(
      "tests/fixtures/gametest/ai-environment-study-arrival.json",
      "utf8",
    ),
  );
  scenario.entities.push({
    id: "fixture-zombie",
    kind: "zombie",
    x: 22,
    y: 31,
    floor: 0,
  });
  const runner = new TestRunner(scenario, roadmap);
  assert.deepEqual(
    runner.game.zombies.map((z) => z.id),
    ["fixture-zombie"],
  );
  assert.equal(runner.game.spawned, 0);
});
