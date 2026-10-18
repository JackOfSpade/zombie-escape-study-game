import assert from "node:assert/strict";
import { test } from "node:test";
import { FramePerformance } from "../src/frame-performance";
const work = { simulationMs: 2, renderMs: 3, totalMs: 7, steps: 1 };
test("frame diagnostics report bounded aggregate costs and actual wall-clock pacing", () => {
  const meter = new FramePerformance();
  for (let i = 0; i < 100; i++)
    assert.equal(meter.sample("run", i * 20, work), undefined);
  const report = meter.sample("run", 2000, {
    ...work,
    simulationMs: 40,
    totalMs: 50,
  });
  assert.ok(report);
  assert.equal(report.fps, 50);
  assert.equal(report.frames, 101);
  assert.equal(report.steps, 101);
  assert.equal(report.maxSimulationMs, 40);
  assert.equal(report.maxWorkMs, 50);
  assert.equal(report.avgRenderMs, 3);
  assert.equal(report.slowFrames, 0);
  assert.equal(meter.sample("run", 2020, work), undefined);
});
test("pauses, restarts and clock resets cannot pollute subsequent frame timing windows", () => {
  const meter = new FramePerformance();
  meter.sample("a", 100, work);
  meter.sample("a", 1100, work);
  meter.reset();
  assert.equal(meter.sample("a", 100000, work), undefined);
  assert.equal(meter.sample("b", 101000, work), undefined);
  assert.equal(meter.sample("b", 0, work), undefined);
  const r = meter.sample("b", 2000, work)!;
  assert.equal(r.frames, 2);
  assert.equal(r.slowFrames, 1);
  assert.equal(r.maxFrameMs, 2000);
});
test("invalid measurements never enter performance logs", () => {
  const meter = new FramePerformance();
  assert.equal(meter.sample("a", NaN, work), undefined);
  assert.equal(meter.sample("a", 0, { ...work, renderMs: -1 }), undefined);
  assert.equal(meter.sample("a", 0, { ...work, totalMs: Infinity }), undefined);
  meter.sample("a", 0, work);
  assert.equal(meter.sample("a", 2000, work)!.frames, 2);
});
