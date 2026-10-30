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
  // Callers without the optional attribution fields still get zeroed values.
  assert.equal(report.avgPersistMs, 0);
  assert.equal(report.maxPersistMs, 0);
  assert.equal(report.avgUiMs, 0);
  assert.equal(report.maxUiMs, 0);
  assert.equal(meter.sample("run", 2020, work), undefined);
});
test("persist and UI costs aggregate avg/max over the window and reset afterwards", () => {
  const meter = new FramePerformance();
  // 4 frames: persist 0, 30, 0, 10 (avg 10, max 30); ui 1, 1, 5, 1 (avg 2, max 5)
  meter.sample("run", 0, { ...work, persistMs: 0, uiMs: 1 });
  meter.sample("run", 500, { ...work, totalMs: 40, persistMs: 30, uiMs: 1 });
  meter.sample("run", 1000, { ...work, persistMs: 0, uiMs: 5 });
  const r = meter.sample("run", 2000, { ...work, persistMs: 10, uiMs: 1 })!;
  assert.equal(r.frames, 4);
  assert.equal(r.avgPersistMs, 10);
  assert.equal(r.maxPersistMs, 30);
  assert.equal(r.avgUiMs, 2);
  assert.equal(r.maxUiMs, 5);
  // totalMs keeps its whole-frame meaning; it is not replaced by components.
  assert.equal(r.maxWorkMs, 40);
  assert.equal(r.avgWorkMs, (7 + 40 + 7 + 7) / 4);
  for (const v of Object.values(r)) assert.ok(Number.isFinite(v));
  // The next window starts fresh: previous persist/UI maxima do not leak.
  meter.sample("run", 2010, { ...work, persistMs: 1, uiMs: 0.5 });
  const next = meter.sample("run", 4010, { ...work, persistMs: 3 })!;
  assert.equal(next.frames, 2);
  assert.equal(next.maxPersistMs, 3);
  assert.equal(next.avgPersistMs, 2);
  assert.equal(next.maxUiMs, 0.5);
  assert.equal(next.avgUiMs, 0.25);
});
test("explicit reset discards accumulated persist and UI attribution", () => {
  const meter = new FramePerformance();
  meter.sample("run", 0, { ...work, persistMs: 100, uiMs: 100 });
  meter.sample("run", 1000, { ...work, persistMs: 100, uiMs: 100 });
  meter.reset();
  meter.sample("run", 5000, work);
  const r = meter.sample("run", 7000, work)!;
  assert.equal(r.frames, 2);
  assert.equal(r.maxPersistMs, 0);
  assert.equal(r.maxUiMs, 0);
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
test("invalid optional persist/UI inputs are rejected without polluting the window", () => {
  const meter = new FramePerformance();
  meter.sample("a", 0, { ...work, persistMs: 1, uiMs: 1 });
  for (const bad of [NaN, -1, Infinity, -Infinity])
    assert.equal(
      meter.sample("a", 2000, { ...work, persistMs: bad }),
      undefined,
    );
  for (const bad of [NaN, -0.5, Infinity])
    assert.equal(meter.sample("a", 2000, { ...work, uiMs: bad }), undefined);
  assert.equal(
    meter.sample("a", 2000, {
      ...work,
      uiMs: "3" as unknown as number,
    }),
    undefined,
  );
  const r = meter.sample("a", 2000, { ...work, persistMs: 3, uiMs: 1 })!;
  assert.equal(r.frames, 2);
  assert.equal(r.maxPersistMs, 3);
  assert.equal(r.avgPersistMs, 2);
  assert.equal(r.avgUiMs, 1);
});

test("render p95 uses a bounded conservative histogram and resets between windows", () => {
  const meter = new FramePerformance();
  for (let i = 0; i < 99; i++)
    meter.sample("run", i * 20, {
      ...work,
      renderMs: i < 94 ? 2.011 : 9.021,
    });
  const report = meter.sample("run", 2000, { ...work, renderMs: 90 })!;
  assert.equal(report.frames, 100);
  assert.equal(report.p95RenderMs, 9.05);
  assert.equal(report.maxRenderMs, 90);
  meter.sample("run", 2010, { ...work, renderMs: 0 });
  const next = meter.sample("run", 4010, { ...work, renderMs: 0 })!;
  assert.equal(next.p95RenderMs, 0);
  meter.sample("run", 4020, { ...work, renderMs: 100 });
  assert.equal(
    meter.sample("run", 6020, { ...work, renderMs: 80 })!.p95RenderMs,
    100,
    "overflow uses the real maximum, never an artificially low bin limit",
  );
});
