import assert from "node:assert/strict";
import { test } from "node:test";
import { GpuTimer } from "../src/view3d/gpu-timer";

function context(supported = true, allocationLimit = 4) {
  const queries: { available: boolean; nanoseconds: number }[] = [],
    deleted = new Set<unknown>();
  let active: unknown,
    starts = 0,
    results = 0,
    disjoint = false;
  const gl = {
    QUERY_RESULT_AVAILABLE: 1,
    QUERY_RESULT: 2,
    getExtension(name: string) {
      assert.equal(name, "EXT_disjoint_timer_query_webgl2");
      return supported ? { TIME_ELAPSED_EXT: 3, GPU_DISJOINT_EXT: 4 } : null;
    },
    createQuery() {
      if (queries.length === allocationLimit) return null;
      const query = { available: false, nanoseconds: 0 };
      queries.push(query);
      return query;
    },
    deleteQuery(query: unknown) {
      assert.equal(active, undefined, "active queries must be ended first");
      assert.equal(deleted.has(query), false, "each handle is deleted once");
      deleted.add(query);
    },
    getParameter(parameter: number) {
      assert.equal(parameter, 4);
      return disjoint;
    },
    getQueryParameter(query: (typeof queries)[number], parameter: number) {
      if (parameter === 1) return query.available;
      assert.equal(parameter, 2);
      assert.equal(query.available, true, "result reads must never block");
      results++;
      return query.nanoseconds;
    },
    beginQuery(target: number, query: (typeof queries)[number]) {
      assert.equal(target, 3);
      assert.equal(active, undefined);
      active = query;
      query.available = false;
      starts++;
    },
    endQuery(target: number) {
      assert.equal(target, 3);
      assert.ok(active);
      active = undefined;
    },
  };
  return {
    gl: gl as unknown as WebGL2RenderingContext,
    queries,
    deleted,
    get starts() {
      return starts;
    },
    get results() {
      return results;
    },
    set disjoint(value: boolean) {
      disjoint = value;
    },
  };
}

test("GPU timer is inert when the extension is unavailable", () => {
  const mock = context(false),
    timer = new GpuTimer(mock.gl);
  for (let i = 0; i < 10; i++) {
    timer.begin();
    timer.end();
  }
  assert.equal(timer.milliseconds, undefined);
  assert.equal(mock.queries.length, 0);
  assert.equal(mock.starts, 0);
  timer.dispose();
});

test("GPU timer bounds outstanding work and reads only available later results", () => {
  const mock = context(),
    timer = new GpuTimer(mock.gl);
  for (let i = 0; i < 10; i++) {
    timer.begin();
    timer.end();
  }
  assert.equal(
    mock.queries.length,
    4,
    "handles are allocated only at creation",
  );
  assert.equal(mock.starts, 4, "a full ring skips new samples");
  assert.equal(mock.results, 0);
  assert.equal(timer.milliseconds, undefined);
  mock.queries[0].nanoseconds = 7_250_000;
  mock.queries[0].available = true;
  timer.begin();
  assert.equal(timer.milliseconds, 7.25);
  assert.equal(mock.results, 1);
  assert.equal(mock.starts, 5, "completed query handles are reused");
  timer.end();
  timer.begin();
  timer.end();
  assert.equal(timer.milliseconds, 7.25, "reuse the last valid timing sample");
  timer.dispose();
  timer.dispose();
  assert.equal(mock.deleted.size, 4);
});

test("disjoint timings are discarded and disposal closes an active query", () => {
  const mock = context(),
    timer = new GpuTimer(mock.gl);
  timer.begin();
  timer.end();
  mock.queries[0].available = true;
  mock.queries[0].nanoseconds = 5_000_000;
  timer.begin();
  timer.end();
  assert.equal(timer.milliseconds, 5);
  mock.disjoint = true;
  timer.begin();
  assert.equal(timer.milliseconds, undefined);
  timer.dispose();
  assert.equal(mock.deleted.size, 4);
  const starts = mock.starts;
  timer.begin();
  timer.end();
  assert.equal(mock.starts, starts, "disposed timers remain inert");
});

test("partial GPU query allocation is cleaned up and falls back safely", () => {
  const mock = context(true, 2),
    timer = new GpuTimer(mock.gl);
  assert.equal(mock.deleted.size, 2);
  timer.begin();
  timer.end();
  assert.equal(mock.starts, 0);
  assert.equal(timer.milliseconds, undefined);
  timer.dispose();
  assert.equal(mock.deleted.size, 2);
});
