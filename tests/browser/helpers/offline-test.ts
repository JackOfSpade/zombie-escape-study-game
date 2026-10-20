import { test as base, expect } from "@playwright/test";
export { expect };
export type { Page } from "@playwright/test";

// The selected smoke cases use synthetic browser storage. Block every bridge,
// execution and provider request before it can reach a local or remote service.
export const test = base.extend<{ offlineNetwork: void }>({
  offlineNetwork: [
    async ({ context, baseURL }, use) => {
      const origin = new URL(baseURL ?? "http://127.0.0.1:5279").origin;
      await context.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (["data:", "blob:"].includes(url.protocol)) return route.continue();
        if (url.origin === origin && !url.pathname.startsWith("/api/"))
          return route.continue();
        return route.abort("blockedbyclient");
      });
      await use();
    },
    { auto: true },
  ],
});
