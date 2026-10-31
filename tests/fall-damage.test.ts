import assert from "node:assert/strict";
import test from "node:test";
import { fallDamage } from "../src/engine";

test("short drops and the normal jump retain their gameplay damage allowance", () => {
  for (const height of [-1, 0, 1.1, 2.5]) assert.equal(fallDamage(height), 0);
  assert.ok(fallDamage(2.501) > 0);
});

test("storey-scale falls use the researched height scale without claiming mortality percentages are HP", () => {
  const cases = [
    [3.05, 8.5],
    [3.6, 17],
    [5.4, 33.5],
    [7.2, 50],
    [9, 62.5],
    [10.8, 75],
    [12.6, 85],
    [14.4, 95],
    [14.7, 97.5],
    [15, 100],
    [15.4, 100],
    [30, 100],
  ];
  for (const [height, damage] of cases)
    assert.ok(
      Math.abs(fallDamage(height) - damage) < 1e-9,
      `${height}m should deal ${damage} HP`,
    );
  assert.ok(
    fallDamage(14.99) < 100,
    "a full-health actor survives just below the game endpoint",
  );
  assert.equal(fallDamage(15), 100, "the game endpoint is inclusive");
});
