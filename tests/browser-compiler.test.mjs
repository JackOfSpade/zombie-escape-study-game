import assert from "node:assert/strict";
import test from "node:test";
import { compileAndRelease } from "../scripts/browser-runner/compile.mjs";

test("Chromium allocation waits until the owned compiler service has been released", async () => {
  let releaseStarted, finishRelease;
  const started = new Promise((resolve) => {
    releaseStarted = resolve;
  });
  const release = new Promise((resolve) => {
    finishRelease = resolve;
  });
  const events = [];
  const pending = compileAndRelease(
    async () => {
      events.push("compiled");
      return "synthetic bundle";
    },
    async () => {
      events.push("releasing");
      releaseStarted();
      await release;
      events.push("released");
    },
  ).then((bundle) => {
    events.push("launching");
    return bundle;
  });
  await started;
  assert.deepEqual(events, ["compiled", "releasing"]);
  finishRelease();
  assert.equal(await pending, "synthetic bundle");
  assert.deepEqual(events, ["compiled", "releasing", "released", "launching"]);
});

test("compilation failure releases its service without starting a browser or producing execution", async () => {
  const events = [];
  await assert.rejects(
    compileAndRelease(
      async () => {
        events.push("compilation-error");
        throw Error("Synthetic compile failure");
      },
      async () => {
        events.push("released");
      },
    ).then(() => {
      events.push("executed");
    }),
    /Synthetic compile failure/,
  );
  assert.deepEqual(events, ["compilation-error", "released"]);
});
