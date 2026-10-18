import { expect, type Page } from "@playwright/test";
/** Restore legacy saved transcripts under each current terminal mode.
 * This changes isolated fixture data; the product has no channel-switch UI. */
export async function restoreTerminalMode(
  page: Page,
  channel: "tutor" | "group",
) {
  await page.evaluate(async (channel) => {
    const g = (window as any).__deadAir.game,
      a = g.survivors[0];
    const s = g.floors[a.floor].stations.find((s: any) => s.id === a.station);
    if (!s) throw Error("Fixture requires an active physical terminal");
    const e = g.encounters[s.encounter],
      mode = channel === "tutor" ? "solo" : "shared";
    if (e.mode === mode) return;
    e.mode = mode;
    if (mode === "solo") {
      e.owner = "human";
      const root = "/src/";
      const { closeChat } = await import(/* @vite-ignore */ root + "ai.ts");
      closeChat(g, e);
    } else {
      const root = "/src/";
      const { openChat } = await import(/* @vite-ignore */ root + "ai.ts");
      void openChat(g, e);
    }
  }, channel);
  await expect(page.locator("#conversation-title")).toHaveText(
    channel === "tutor" ? "Terminal AI" : "Group chat",
  );
}
