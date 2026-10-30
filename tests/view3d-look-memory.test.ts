import assert from "node:assert/strict";
import { test } from "node:test";
import { readSavedLook, writeSavedLook } from "../src/view3d/look-memory";

test("camera memory is run-specific, finite, view-only and resilient to unavailable storage", () => {
  const original = Object.getOwnPropertyDescriptor(
    globalThis,
    "sessionStorage",
  );
  let stored: string | null = null;
  try {
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: {
        getItem: () => stored,
        setItem: (_: string, value: string) => {
          stored = value;
        },
      },
    });
    assert.equal(readSavedLook("run-a"), undefined);
    writeSavedLook({ id: "run-a", yaw: 0.4, pitch: -0.2 });
    assert.deepEqual(readSavedLook("run-a"), {
      id: "run-a",
      yaw: 0.4,
      pitch: -0.2,
    });
    assert.equal(readSavedLook("run-b"), undefined);
    for (const invalid of [
      "broken-json",
      '{"id":"run-a","yaw":null,"pitch":0}',
      '{"id":"run-a","yaw":0,"pitch":"0"}',
    ]) {
      stored = invalid;
      assert.equal(readSavedLook("run-a"), undefined);
    }
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      get() {
        throw Error("storage disabled");
      },
    });
    assert.equal(readSavedLook("run-a"), undefined);
    assert.doesNotThrow(() =>
      writeSavedLook({ id: "run-a", yaw: 1, pitch: 0 }),
    );
  } finally {
    if (original) Object.defineProperty(globalThis, "sessionStorage", original);
    else Reflect.deleteProperty(globalThis, "sessionStorage");
  }
});
