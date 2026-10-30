import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  InstancedMesh,
  Light,
  Matrix4,
  PerspectiveCamera,
  Vector3,
} from "three";
import {
  buildInteriorLighting,
  lightAt,
  PhoneLightState,
} from "../src/interior-lighting";
import { type Furniture, type Roadmap } from "../src/model";
import { InteriorAtmosphere } from "../src/view3d/interior-atmosphere";
import { createGame, createPlayableGame } from "../src/world";

const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
function fixture() {
  const game = createGame(42, roadmap),
    floor = game.floors[0];
  game.status = "playing";
  game.zombies = [];
  Object.assign(floor, {
    tiles: Array.from({ length: 34 }, (_, y) =>
      Array.from({ length: 44 }, (_, x) =>
        x === 0 || y === 0 || x === 43 || y === 33 ? 1 : 0,
      ),
    ),
    dark: 0,
    furniture: [
      {
        id: "personal-desk",
        kind: "desk",
        floor: 0,
        x: 15,
        y: 15,
        w: 1.4,
        h: 0.9,
        hp: 100,
        maxHp: 100,
        destroyed: false,
        speed: 1,
        turning: 0,
        angle: 0,
      } as Furniture,
    ],
    stations: [],
  });
  delete floor.boundary;
  delete floor.generation;
  Object.assign(game.survivors[0], { x: 10, y: 15, floor: 0 });
  return { game, floor, desk: floor.furniture[0] };
}
function matrices(mesh: InstancedMesh) {
  return Array.from({ length: mesh.count }, (_, i) => {
    const matrix = new Matrix4();
    mesh.getMatrixAt(i, matrix);
    return matrix;
  });
}
function close(actual: number, expected: number) {
  assert.ok(
    Math.abs(actual - expected) < 1e-4,
    `${actual} differs from ${expected}`,
  );
}

test("office circuits follow real sectors and sub-rooms, reproduce by seed and leave world RNG untouched", () => {
  const signatures = new Set<string>();
  for (const seed of [7, 42, 1337]) {
    const game = createPlayableGame(seed, roadmap),
      before = JSON.stringify(game);
    for (const floor of game.floors.slice(0, -1)) {
      const first = buildInteriorLighting(floor, seed),
        again = buildInteriorLighting(floor, seed);
      assert.deepEqual(first, again);
      assert.ok(
        first.zones.some((z) => z.power === "outage"),
        "each occupied floor has an actually failed department circuit",
      );
      assert.ok(
        first.zones.some((z) => z.id === "entry" && z.power === "lit"),
        "reception remains readable",
      );
      assert.ok(first.fixtures.some((f) => f.level > 0.5));
      assert.ok(first.fixtures.some((f) => f.level < 0.2));
      assert.ok(first.fixtures.length <= 128);
      for (const sector of floor.generation?.sectors ?? [])
        for (const room of sector.rooms)
          assert.ok(
            first.fixtures.some(
              (f) =>
                f.x >= room.rect.x1 &&
                f.x < room.rect.x2 + 1 &&
                f.y >= room.rect.y1 &&
                f.y < room.rect.y2 + 1,
            ),
            `${room.id} has a physical working or failed ceiling fixture`,
          );
      signatures.add(JSON.stringify(first.zones.map((z) => [z.id, z.power])));
      const outage = first.zones.find((z) => z.power === "outage")!;
      const open = first.fixtures.find((f) => f.level < 0.2)!;
      assert.ok(outage.level < 0.2 && lightAt(first, open) < 0.2);
      assert.equal(
        lightAt(first, { x: 22, y: 200 }),
        1,
        "outdoor streets do not trigger the phone",
      );
    }
    assert.equal(
      JSON.stringify(game),
      before,
      "cosmetic generation cannot change geometry, learner data or the simulation stream",
    );
  }
  assert.ok(
    signatures.size > 4,
    "rooms/floors do not share one canned outage pattern",
  );
});

test("posters and emergency writing mount on actual interior wall faces without covering perimeter windows", () => {
  const game = createPlayableGame(42, roadmap);
  for (const floor of game.floors.slice(0, -1)) {
    const plan = buildInteriorLighting(floor, game.seed);
    assert.ok(plan.stories.length > 0 && plan.stories.length <= 12);
    for (const story of plan.stories) {
      const wallX = story.x - story.nx * 0.52,
        wallY = story.y - story.ny * 0.52,
        frontX = story.x + story.nx * 0.03,
        frontY = story.y + story.ny * 0.03;
      assert.ok(floor.tiles[Math.floor(wallY)]?.[Math.floor(wallX)] !== 0);
      assert.equal(floor.tiles[Math.floor(frontY)]?.[Math.floor(frontX)], 0);
      const b = floor.boundary!,
        row = b.rows[Math.floor(wallY)];
      assert.ok(
        row &&
          wallY >= b.top &&
          wallY < b.bottom &&
          wallX >= row.left &&
          wallX < row.right,
        "the wall is inside the facade, away from window openings",
      );
      close(Math.abs(story.nx + story.ny), 1);
    }
  }
});

test("the phone raises in darkness, holds across a dim doorway, stows in sustained light and cancels with the run", () => {
  const state = new PhoneLightState();
  state.update(0.05, 0.1);
  assert.equal(state.raised, false);
  state.update(0.05, 0.1);
  assert.equal(state.raised, true);
  for (let i = 0; i < 10; i++) state.update(0.34, 0.1);
  assert.equal(state.raised, true, "the neutral band preserves the hand state");
  for (let i = 0; i < 4; i++) state.update(0.82, 0.1);
  assert.equal(
    state.raised,
    true,
    "a quick doorway crossing cannot stow and raise it again",
  );
  for (let i = 0; i < 3; i++) state.update(0.82, 0.1);
  assert.equal(state.raised, false);
  for (let i = 0; i < 8; i++) state.update(0.05, 0.1);
  assert.ok(state.raised && state.mix > 0.9);
  state.update(0.05, 0.1, false);
  assert.equal(state.raised, false);
  state.reset();
  assert.equal(state.mix, 0);
  state.update(0.05, 0.1);
  assert.equal(state.raised, false, "reset clears prior dark dwell time");
});

test("personal desk effects stay on the physical tabletop when it moves/rotates and disappear when destroyed", () => {
  const { game, floor, desk } = fixture(),
    atmosphere = new InteriorAtmosphere(),
    camera = new PerspectiveCamera();
  atmosphere.build(floor, game.seed);
  atmosphere.update(game, camera, 1 / 60);
  const batch = atmosphere.group.getObjectByName(
      "office-personal-effects-and-fixtures",
    ) as InstancedMesh,
    before = matrices(batch),
    old = { x: desk.x, y: desk.y };
  desk.x += 3;
  desk.y -= 2;
  desk.angle = Math.PI / 2;
  atmosphere.update(game, camera, 1 / 60);
  const after = matrices(batch),
    changed: number[] = [];
  for (let i = 0; i < before.length; i++) {
    if (before[i].equals(after[i])) continue;
    changed.push(i);
    const initial = new Vector3().setFromMatrixPosition(before[i]),
      current = new Vector3().setFromMatrixPosition(after[i]);
    close(current.x, desk.x - (initial.z - old.y));
    close(current.z, desk.y + (initial.x - old.x));
    close(current.y, initial.y);
    assert.ok(
      current.y > 0.85 && current.y < 1.2,
      "effects are above the desk's 0.85m top",
    );
  }
  assert.ok(
    changed.length >= 5,
    "a real set of personal effects follows the desk",
  );
  assert.ok(
    changed.length < before.length,
    "ceiling fixtures stay anchored to the building",
  );
  desk.destroyed = true;
  atmosphere.update(game, camera, 1 / 60);
  const hidden = matrices(batch);
  for (const slot of changed)
    assert.equal(
      hidden[slot].elements[0],
      0,
      "effects cannot float above destroyed furniture",
    );
  atmosphere.dispose();
});

test("phone lighting follows the actual camera through turns and floor elevation; light and resource counts stay bounded", () => {
  const { game, floor } = fixture(),
    atmosphere = new InteriorAtmosphere(),
    camera = new PerspectiveCamera();
  floor.dark = 1;
  atmosphere.build(floor, game.seed);
  camera.position.set(10, 8.4, 15);
  camera.lookAt(11, 8.4, 15);
  for (let i = 0; i < 15; i++) atmosphere.update(game, camera, 0.1);
  camera.updateMatrixWorld(true);
  assert.equal(atmosphere.phone.parent, camera);
  assert.ok(atmosphere.phone.visible && atmosphere.phoneState.mix > 0.9);
  const initial = atmosphere.phone.getWorldPosition(new Vector3());
  assert.ok(
    initial.y > 8 && initial.y < 8.5,
    "the phone inherits eye/stair elevation without a guessed floor offset",
  );
  camera.lookAt(9, 8.4, 15);
  camera.updateMatrixWorld(true);
  const turned = atmosphere.phone.getWorldPosition(new Vector3());
  close(initial.x + turned.x, camera.position.x * 2);
  close(initial.z + turned.z, camera.position.z * 2);
  const lights: Light[] = [];
  atmosphere.group.traverse((o) => {
    if (o instanceof Light) lights.push(o);
  });
  camera.traverse((o) => {
    if (o instanceof Light) lights.push(o);
  });
  assert.equal(
    lights.length,
    5,
    "three practicals, a phone LED and its bounded local bounce, independent of the number of lamps/desks",
  );
  const phoneLed = lights.find(
      (light) => light.type === "SpotLight",
    ) as unknown as { decay: number; distance: number; intensity: number },
    phoneBounce = lights.find(
      (light) => light.name === "phone-screen-bounce",
    ) as unknown as { decay: number; distance: number; intensity: number };
  assert.equal(
    phoneLed.decay,
    2,
    "the actual phone LED uses inverse-square falloff",
  );
  assert.equal(phoneLed.distance, 8, "the LED has a finite eight-metre range");
  assert.equal(phoneBounce.decay, 2);
  assert.equal(
    phoneBounce.distance,
    3,
    "local screen/reflection light cannot fill distant rooms",
  );
  assert.ok(phoneLed.intensity > 0 && phoneBounce.intensity > 0);
  const oldGroup = atmosphere.group.getObjectByName("office-atmosphere-0")!,
    oldBatch = oldGroup.getObjectByName(
      "office-personal-effects-and-fixtures",
    ) as InstancedMesh;
  let geometryReleased = 0;
  oldBatch.geometry.addEventListener("dispose", () => geometryReleased++);
  atmosphere.build(floor, game.seed);
  assert.equal(geometryReleased, 1);
  assert.equal(oldGroup.parent, null);
  assert.equal(
    atmosphere.group.children.filter((o) => o.name === "office-atmosphere-0")
      .length,
    1,
  );
  atmosphere.reset();
  assert.equal(atmosphere.phone.visible, false);
  assert.equal(atmosphere.phoneState.mix, 0);
  assert.equal(phoneLed.intensity, 0);
  assert.equal(phoneBounce.intensity, 0);
  assert.equal(
    atmosphere.group.children.filter((o) =>
      o.name.startsWith("office-atmosphere-"),
    ).length,
    0,
  );
  let materialsReleased = 0;
  assert.ok(!Array.isArray(oldBatch.material));
  oldBatch.material.addEventListener("dispose", () => materialsReleased++);
  atmosphere.dispose();
  atmosphere.dispose();
  assert.equal(
    materialsReleased,
    1,
    "shared materials dispose once, after all floors",
  );
  assert.equal(atmosphere.phone.parent, null);
});
