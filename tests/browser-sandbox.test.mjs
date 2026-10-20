import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import {
  createSandboxedExercise,
  verifyBrowserSandbox,
} from "../scripts/browser-runner/sandbox.mjs";

const attested =
  "Layer 1 Sandbox\tNamespace\nPID namespaces\tYes\nNetwork namespaces\tYes\nSeccomp-BPF sandbox\tYes";
function privatePage(text) {
  const calls = [];
  let disposed = false;
  return {
    calls,
    get disposed() {
      return disposed;
    },
    async goto(url, options) {
      calls.push({ type: "navigation", url, ...options });
      if (options?.waitUntil !== "commit")
        throw Error("This internal page never dispatches its load event");
    },
    async waitForFunction(predicate, _arg, options) {
      calls.push({ type: "attestation", ...options });
      const value = runInNewContext(`(${predicate.toString()})()`, {
        document: { body: { innerText: text } },
      });
      if (!value) throw Error("Required Chromium sandbox is unavailable");
      return {
        jsonValue: async () => value,
        dispose: async () => {
          disposed = true;
        },
      };
    },
  };
}

test("private sandbox attestation completes without an internal-page load event or navigation retry", async () => {
  const page = privatePage(attested);
  let committed = false;
  assert.equal(
    await verifyBrowserSandbox(page, () => {
      committed = true;
    }),
    attested,
  );
  assert.equal(committed, true);
  assert.equal(page.disposed, true);
  assert.deepEqual(page.calls, [
    {
      type: "navigation",
      url: "chrome://sandbox/",
      waitUntil: "commit",
      timeout: 2500,
    },
    { type: "attestation", timeout: 2500, polling: 50 },
  ]);
});

test("the actual namespace and seccomp claims are all required before sandbox verification", async () => {
  for (const missing of [
    "Layer 1 Sandbox\tNamespace",
    "PID namespaces\tYes",
    "Network namespaces\tYes",
    "Seccomp-BPF sandbox\tYes",
  ]) {
    const page = privatePage(attested.replace(missing, "Unavailable"));
    await assert.rejects(
      verifyBrowserSandbox(page),
      /Required Chromium sandbox/,
    );
    assert.equal(page.calls.length, 2, "failed attestation is not retried");
  }
});

test("learner renderer allocation waits for private attestation and full private-context closure", async () => {
  const securityPage = privatePage(attested);
  let attestStarted, releaseAttestation, closeStarted, releaseClose;
  const waitingAttestation = new Promise((resolve) => {
    attestStarted = resolve;
  });
  const attestationGate = new Promise((resolve) => {
    releaseAttestation = resolve;
  });
  const waitingClose = new Promise((resolve) => {
    closeStarted = resolve;
  });
  const closeGate = new Promise((resolve) => {
    releaseClose = resolve;
  });
  const verify = securityPage.waitForFunction;
  securityPage.waitForFunction = async (...args) => {
    attestStarted();
    await attestationGate;
    return verify(...args);
  };
  const phases = [],
    contexts = [];
  const learnerPage = {},
    learnerContext = {
      setDefaultTimeout: (timeout) => assert.equal(timeout, 800),
      setDefaultNavigationTimeout: (timeout) => assert.equal(timeout, 2500),
      newPage: async () => learnerPage,
    };
  const pending = createSandboxedExercise(
    {
      async newContext(options) {
        contexts.push(options);
        return contexts.length === 1
          ? {
              newPage: async () => securityPage,
              close: async () => {
                closeStarted();
                await closeGate;
              },
            }
          : learnerContext;
      },
    },
    (name) => phases.push(name),
  );
  await waitingAttestation;
  assert.equal(contexts.length, 1, "attestation has the only renderer startup");
  releaseAttestation();
  await waitingClose;
  assert.equal(contexts.length, 1, "closing the private context is awaited");
  releaseClose();
  assert.deepEqual(await pending, {
    context: learnerContext,
    page: learnerPage,
  });
  assert.deepEqual(contexts, [
    undefined,
    {
      viewport: { width: 640, height: 400 },
      serviceWorkers: "block",
      acceptDownloads: false,
      permissions: [],
    },
  ]);
  assert.ok(
    phases.indexOf("sandbox-verified") <
      phases.indexOf("opening-exercise-context"),
  );
});

test("failed private attestation closes its context without allocating a learner renderer", async () => {
  let contexts = 0,
    closed = false;
  const phases = [];
  await assert.rejects(
    createSandboxedExercise(
      {
        async newContext() {
          contexts++;
          return {
            newPage: async () =>
              privatePage("No namespace or seccomp attestation"),
            close: async () => {
              closed = true;
            },
          };
        },
      },
      (name) => phases.push(name),
    ),
    /Required Chromium sandbox/,
  );
  assert.equal(contexts, 1);
  assert.equal(closed, true);
  assert.equal(
    phases.at(-1),
    "reading-sandbox-status",
    "cleanup must not hide the failure stage",
  );
});
