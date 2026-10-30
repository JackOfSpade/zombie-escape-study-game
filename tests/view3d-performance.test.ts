import assert from "node:assert/strict";
import { test } from "node:test";
import { GeometryChangeCache } from "../src/view3d/geometry";
import { AdaptiveResolution } from "../src/view3d/resolution";

function frames(
  adaptive: AdaptiveResolution,
  count: number,
  renderMs: number,
  dt: number,
  cap = 1.5,
  options?: { gpuMs?: number; stalled?: boolean },
) {
  let ratio = cap;
  for (let i = 0; i < count; i++)
    ratio = adaptive.update(renderMs, dt, cap, options);
  return ratio;
}

test("healthy 60 Hz and 120 Hz displays retain the full resolution cap", () => {
  for (const hz of [60, 120]) {
    const adaptive = new AdaptiveResolution(1.5);
    assert.equal(frames(adaptive, hz * 12, 2, 1 / hz), 1.5);
  }
});

test("resolution responds to measured GPU time at either refresh rate", () => {
  for (const [hz, renderMs] of [
    [60, 14],
    [120, 7],
  ]) {
    const adaptive = new AdaptiveResolution(1.5);
    assert.equal(frames(adaptive, hz, 2, 1 / hz, 1.5, { gpuMs: renderMs }), 1);
    assert.equal(
      frames(adaptive, hz * 9, 2, 1 / hz, 1.5, { gpuMs: 2 }),
      1.5,
      "healthy render cost restores resolution at either refresh rate",
    );
  }
});

test("fallback detects sustained GPU-bound frame intervals after measuring 120 Hz", () => {
  const adaptive = new AdaptiveResolution(1.5);
  assert.equal(frames(adaptive, 120, 2, 1 / 120), 1.5);
  assert.equal(frames(adaptive, 60, 2, 1 / 60), 1);
  assert.equal(
    frames(adaptive, 60 * 30, 2, 1 / 60),
    1,
    "sustained overload must not inflate the measured refresh budget",
  );
});

test("GPU timing does not reduce resolution for CPU-only work or frame stalls", () => {
  const adaptive = new AdaptiveResolution(1.5);
  assert.equal(frames(adaptive, 120, 2, 1 / 120), 1.5);
  assert.equal(frames(adaptive, 120, 14, 1 / 60, 1.5, { gpuMs: 2 }), 1.5);
});

test("30 Hz simulation samples do not reset GPU adaptation on a 120 Hz display", () => {
  const adaptive = new AdaptiveResolution(1.5);
  let ratio = 1.5;
  for (let i = 0; i < 120; i++)
    ratio = adaptive.update(2, 1 / 120, 1.5, {
      gpuMs: 7,
      stalled: i % 4 === 0,
    });
  assert.equal(
    ratio,
    1,
    "eligible frames still accumulate the slow hysteresis",
  );
  for (let i = 0; i < 120 * 12; i++)
    ratio = adaptive.update(2, 1 / 120, 1.5, {
      gpuMs: 2,
      stalled: i % 4 === 0,
    });
  assert.equal(
    ratio,
    1.5,
    "eligible frames still accumulate the fast hysteresis",
  );
});

test("fallback adapts when 30 Hz simulation frames alternate with a 60 Hz slowdown", () => {
  const adaptive = new AdaptiveResolution(1.5);
  assert.equal(frames(adaptive, 120, 2, 1 / 120), 1.5);
  let ratio = 1.5;
  for (let i = 0; i < 60 * 3; i++)
    ratio = adaptive.update(2, 1 / 60, 1.5, { stalled: i % 2 === 0 });
  assert.equal(ratio, 1);
  for (let i = 0; i < 60 * 30; i++)
    ratio = adaptive.update(2, 1 / 60, 1.5, { stalled: i % 2 === 0 });
  assert.equal(ratio, 1, "missed refreshes still cannot redefine the budget");
});

test("brief slow frames and flagged simulation/UI stalls do not reduce resolution", () => {
  const adaptive = new AdaptiveResolution(1.5);
  assert.equal(frames(adaptive, 120, 2, 1 / 120), 1.5);
  assert.equal(frames(adaptive, 24, 20, 1 / 60), 1.5);
  assert.equal(frames(adaptive, 600, 2, 1 / 60, 1.5, { stalled: true }), 1.5);
  assert.equal(frames(adaptive, 60, 2, 0.12), 1.5);
  assert.equal(frames(adaptive, 1200, 2, 1 / 120), 1.5);
});

test("adaptive resolution respects device caps and reset clears floor history", () => {
  const adaptive = new AdaptiveResolution(1.5);
  assert.equal(frames(adaptive, 60, 2, 1 / 60, 1.25, { gpuMs: 14 }), 1);
  adaptive.reset(1.25);
  assert.equal(frames(adaptive, 30, 2, 1 / 60, 1.25, { gpuMs: 14 }), 1.25);
  assert.equal(frames(adaptive, 600, 2, 1 / 60, 1.25), 1.25);
  assert.equal(frames(adaptive, 60, 14, 1 / 60, 0.8), 0.8);
});

function floorGeometry() {
  return {
    tiles: [
      [1, 0, 1],
      [0, 0, 0],
    ],
    index: 1,
    stairs: { x: 3, y: 4 },
    entry: { x: 1, y: 1 },
  };
}

test("geometry cache retains unchanged floors and detects in-place occupancy edits", () => {
  const cache = new GeometryChangeCache(),
    floor = floorGeometry();
  assert.equal(cache.changed(floor), true);
  for (let i = 0; i < 1000; i++) assert.equal(cache.changed(floor), false);
  floor.tiles[0][0] = 2;
  assert.equal(
    cache.changed(floor),
    false,
    "nonzero types share wall geometry",
  );
  floor.tiles[0][1] = 1;
  assert.equal(cache.changed(floor), true);
  assert.equal(cache.changed(floor), false);
  floor.tiles[0][1] = 0;
  assert.equal(cache.changed(floor), true);
  floor.tiles = structuredClone(floor.tiles);
  assert.equal(
    cache.changed(floor),
    false,
    "equal replacement needs no rebuild",
  );
});

test("geometry cache rebuilds for dimensions, stair poses and floor changes", () => {
  const cache = new GeometryChangeCache(),
    floor = floorGeometry();
  cache.changed(floor);
  floor.tiles = [
    [1, 0],
    [1, 0, 0, 0],
  ];
  assert.equal(cache.changed(floor), true, "ragged row widths are geometry");
  floor.stairs.x++;
  assert.equal(cache.changed(floor), true);
  floor.entry.y++;
  assert.equal(cache.changed(floor), true);
  floor.index++;
  assert.equal(cache.changed(floor), true);
  assert.equal(cache.changed(structuredClone(floor)), true);
  assert.equal(
    cache.changed(floor),
    true,
    "returning to a floor rebuilds its meshes",
  );
  assert.equal(cache.changed(floor), false);
});
