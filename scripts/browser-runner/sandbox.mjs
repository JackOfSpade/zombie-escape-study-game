/** Inspect Chrome's private status page before any learner origin is loaded.
 * Internal-page load events are not the attestation: wait for the actual
 * namespace and seccomp status, within the existing controller wall deadline. */
export async function verifyBrowserSandbox(page, onCommit = () => {}) {
  await page.goto("chrome://sandbox/", {
    waitUntil: "commit",
    timeout: 2500,
  });
  onCommit();
  const status = await page.waitForFunction(
    () => {
      const text = document.body?.innerText ?? "";
      return (
        /Layer 1 Sandbox\s+Namespace/i.test(text) &&
        /PID namespaces\s+Yes/i.test(text) &&
        /Network namespaces\s+Yes/i.test(text) &&
        /Seccomp-BPF sandbox\s+Yes/i.test(text) &&
        text
      );
    },
    undefined,
    { timeout: 2500, polling: 50 },
  );
  try {
    return await status.jsonValue();
  } finally {
    await status.dispose();
  }
}

/** Start one renderer at a time under the fixed CPU/memory budget. The learner
 * context does not exist until Chrome's private attestation context is closed. */
export async function createSandboxedExercise(browser, phase = () => {}) {
  phase("opening-sandbox-context");
  const checkContext = await browser.newContext();
  try {
    phase("opening-sandbox-page");
    const securityPage = await checkContext.newPage();
    phase("loading-sandbox-page");
    await verifyBrowserSandbox(securityPage, () =>
      phase("reading-sandbox-status"),
    );
    phase("sandbox-verified");
  } catch (error) {
    await checkContext.close().catch(() => {});
    throw error;
  }
  phase("closing-sandbox-context");
  await checkContext.close();
  phase("opening-exercise-context");
  const context = await browser.newContext({
    viewport: { width: 640, height: 400 },
    serviceWorkers: "block",
    acceptDownloads: false,
    permissions: [],
  });
  context.setDefaultTimeout(800);
  context.setDefaultNavigationTimeout(2500);
  phase("opening-exercise-page");
  const page = await context.newPage();
  return { context, page };
}
