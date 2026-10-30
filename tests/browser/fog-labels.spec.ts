import { expect, test } from "@playwright/test";
test("visible field captions and names stay complete above fog without revealing hidden NPCs", async ({
  page,
}) => {
  await page.goto("/lab.html");
  const result = await page.evaluate(async () => {
    const root = "/src/";
    const [{ render }, { TestRunner }] = await Promise.all([
      import(/* @vite-ignore */ root + "render.ts"),
      import(/* @vite-ignore */ root + "gametest/runner.ts"),
    ]);
    const roadmap = await (await fetch("/curriculum.json")).json(),
      s = await (
        await fetch("/tests/fixtures/gametest/force-field-green.json")
      ).json();
    s.actions = [];
    s.checks = [];
    s.entities = s.entities.filter((e: any) => e.kind !== "zombie");
    s.entities.push(
      { id: "sora", kind: "npc", x: 12.5, y: 11.8 },
      { id: "secret", kind: "npc", x: 13, y: 9 },
    );
    const g = new TestRunner(s, roadmap).game;
    g.settings.view = "top-down";
    g.survivors[1].name = "Sora";
    g.survivors[2].name = "Secret";
    // Red for a keyless player: the one caption a field may carry.
    g.floors[0].furniture[0].field.limit = 0;
    g.survivors[0].keys = 0;
    const c = document.createElement("canvas");
    c.id = "fog-label-regression";
    c.style.width = "1600px";
    c.style.height = "1200px";
    document.body.append(c);
    const ctx = c.getContext("2d")!,
      labels: any[] = [],
      fill = ctx.fillText.bind(ctx);
    ctx.fillText = (text, x, y, ...rest) => {
      labels.push({
        text,
        x,
        y,
        font: ctx.font,
        color: ctx.fillStyle,
        transform: ctx.getTransform(),
      });
      fill(text, x, y, ...rest);
    };
    render(c, g);
    const ref = document.createElement("canvas");
    ref.width = c.width;
    ref.height = c.height;
    const rc = ref.getContext("2d")!;
    const selected = labels.filter(
      (l) => l.text === "Sora" || l.text === "KEY REQUIRED",
    );
    for (const l of selected) {
      rc.setTransform(l.transform);
      rc.font = l.font;
      rc.textAlign = "center";
      rc.fillStyle = l.color;
      rc.fillText(l.text, l.x, l.y);
    }
    const actual = ctx.getImageData(0, 0, c.width, c.height).data,
      expected = rc.getImageData(0, 0, c.width, c.height).data;
    let solid = 0,
      matching = 0;
    for (let i = 0; i < expected.length; i += 4)
      if (expected[i + 3] === 255) {
        solid++;
        if (
          Math.abs(actual[i] - expected[i]) <= 2 &&
          Math.abs(actual[i + 1] - expected[i + 1]) <= 2 &&
          Math.abs(actual[i + 2] - expected[i + 2]) <= 2
        )
          matching++;
      }
    return {
      labels: labels.map((l) => l.text),
      selected: selected.length,
      solid,
      ratio: matching / solid,
    };
  });
  await page
    .locator("#fog-label-regression")
    .screenshot({ path: ".artifacts/fog-labels.png" });
  expect(result.labels).toContain("Sora");
  expect(result.labels).not.toContain("Secret");
  expect(result.selected).toBe(2);
  expect(result.solid).toBeGreaterThan(10);
  expect(result.ratio).toBeGreaterThan(0.98);
});
