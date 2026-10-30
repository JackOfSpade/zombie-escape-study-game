import assert from "node:assert/strict";
import { test } from "node:test";
import { FURNITURE, type Floor, type Furniture } from "../src/model";
import {
  flashlightDistanceScale,
  flashlightSurfaceDistance,
  smoothFlashlightScale,
} from "../src/view3d/flashlight";

test("flashlight power counters close-surface brightening and stays bounded", () => {
  assert.equal(flashlightDistanceScale(0.3), 1 / 16);
  assert.equal(flashlightDistanceScale(0.6), 1 / 4);
  assert.equal(flashlightDistanceScale(1.2), 1);
  assert.equal(flashlightDistanceScale(Infinity), 1);
  assert.equal(flashlightDistanceScale(10), 1);
  assert.equal(flashlightDistanceScale(-1), 0);
  assert.equal(flashlightDistanceScale(NaN), 1);
  for (const distance of [0.15, 0.3, 0.6, 1.2])
    assert.ok(
      Math.abs(
        flashlightDistanceScale(distance) / distance ** 2 - 1 / 1.2 ** 2,
      ) < 1e-10,
    );
});

test("flashlight dimming settles in about 100 ms at 60 and 120 Hz", () => {
  for (const hz of [60, 120]) {
    let value = 1;
    for (let i = 0; i < hz / 10; i++)
      value = smoothFlashlightScale(value, 1 / 16, 1 / hz);
    assert.ok(value > 1 / 16 && value < 0.12);
    const once = smoothFlashlightScale(1, 1 / 16, 0.1);
    assert.ok(Math.abs(value - once) < 1e-10);
  }
  assert.equal(smoothFlashlightScale(0.5, 1, 0), 0.5);
  assert.equal(smoothFlashlightScale(0.5, 1, NaN), 0.5);
});

test("flashlight ray dims for walls but passes above low furniture until aimed down", () => {
  const floor = {
    tiles: Array.from({ length: 8 }, (_, y) =>
      Array.from({ length: 8 }, (_, x) =>
        x === 0 || y === 0 || x === 7 || y === 7 ? 1 : 0,
      ),
    ),
    furniture: [],
  } as unknown as Floor;
  const origin = { x: 3.7, y: 3.5 };
  floor.tiles[3][4] = 1;
  assert.ok(
    Math.abs(flashlightSurfaceDistance(floor, origin, 0) - 0.3) < 1e-10,
  );
  floor.tiles[3][4] = 0;
  assert.equal(flashlightSurfaceDistance(floor, origin, 0), 1.2);
  const desk = {
    ...FURNITURE.desk,
    kind: "desk",
    x: 4.5,
    y: 3.5,
    w: 1,
    h: 1,
    destroyed: false,
  } as unknown as Furniture;
  floor.furniture.push(desk);
  assert.equal(
    flashlightSurfaceDistance(floor, origin, 0, 0),
    1.2,
    "a level beam at eye height passes over the desk",
  );
  const pitch = -Math.atan2(1.56 - 0.8, 0.6),
    hit = Math.hypot(1.56 - 0.8, 0.6);
  assert.ok(
    Math.abs(flashlightSurfaceDistance(floor, origin, 0, pitch) - hit) < 1e-10,
    "the downward beam hits the desktop inside its horizontal footprint",
  );
  desk.kind = "shelf";
  assert.ok(
    Math.abs(flashlightSurfaceDistance(floor, origin, 0, 0) - 0.3) < 1e-10,
    "an eye-height shelf still dims the lamp",
  );
  desk.kind = "chair";
  assert.equal(
    flashlightSurfaceDistance(floor, origin, 0, 0),
    1.2,
    "nearby chair seats do not turn off a level flashlight",
  );
  desk.destroyed = true;
  assert.equal(flashlightSurfaceDistance(floor, origin, 0), 1.2);
  desk.destroyed = false;
  desk.y = 5;
  assert.equal(flashlightSurfaceDistance(floor, origin, 0), 1.2);
});

test("downward flashlight ray reaches the floor and misses low props it passes above", () => {
  const floor = {
    tiles: Array.from({ length: 8 }, () => Array(8).fill(0)),
    furniture: [
      {
        ...FURNITURE.chair,
        kind: "chair",
        x: 4.5,
        y: 3.5,
        w: 1,
        h: 1,
        destroyed: false,
      },
    ],
  } as unknown as Floor;
  const origin = { x: 3.7, y: 3.5 };
  assert.equal(
    flashlightSurfaceDistance(floor, origin, 0, -0.2),
    1.2,
    "a shallow downward ray remains above the chair throughout its footprint",
  );
  assert.ok(
    Math.abs(
      flashlightSurfaceDistance(floor, origin, 0, -Math.PI / 2, 0.6) - 0.6,
    ) < 1e-10,
  );
});
