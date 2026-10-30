import { expect, test } from "@playwright/test";
/** The spectator view draws a whole floor with no fog, no light mask and no
 * interaction prompts, while the player's own view is unchanged. */
test("spectator rendering shows every occupant of the chosen floor unclipped and lit", async ({
  page,
}) => {
  await page.goto("/lab.html");
  const result = await page.evaluate(async () => {
    const root = "/src/";
    const [{ render }, { TestRunner }, { camera }, { playerCanSee }] =
      await Promise.all([
        import(/* @vite-ignore */ root + "render.ts"),
        import(/* @vite-ignore */ root + "gametest/runner.ts"),
        import(/* @vite-ignore */ root + "camera.ts"),
        import(/* @vite-ignore */ root + "visibility.ts"),
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
      { id: "upstairs", kind: "npc", x: 12, y: 12, floor: 1 },
    );
    const g = new TestRunner(s, roadmap).game;
    g.settings.view = "top-down";
    g.survivors[1].name = "Sora";
    g.survivors[2].name = "Secret";
    g.survivors[3].name = "Upstairs";
    // Red for a keyless player: the one caption a field may carry.
    g.floors[0].furniture[0].field.limit = 0;
    g.survivors[0].keys = 0;
    const a = g.survivors[0];
    const draw = (view?: any) => {
      const c = document.createElement("canvas");
      c.style.width = "1600px";
      c.style.height = "1200px";
      document.body.append(c);
      const ctx = c.getContext("2d")!,
        labels: { text: string; transform: DOMMatrix }[] = [],
        fill = ctx.fillText.bind(ctx),
        clip = ctx.clip.bind(ctx);
      let clips = 0;
      ctx.fillText = (text, x, y, ...rest) => {
        labels.push({ text, transform: ctx.getTransform() });
        fill(text, x, y, ...rest);
      };
      ctx.clip = ((...args: any[]) => {
        clips++;
        return (clip as any)(...args);
      }) as any;
      const seen = a.seen.length;
      render(c, g, view);
      const rect = c.getBoundingClientRect(),
        { scale, ox, oy } = camera(
          rect.width,
          rect.height,
          view ? view.focus : a,
          view ? view.zoom : 1,
        );
      const luminance = (pt: { x: number; y: number }) => {
        const dpr = Math.min(devicePixelRatio || 1, 2),
          px = Math.round((ox + pt.x * scale) * dpr),
          py = Math.round((oy + pt.y * scale) * dpr),
          [r, gg, b] = ctx.getImageData(px, py, 1, 1).data;
        return 0.2126 * r + 0.7152 * gg + 0.0722 * b;
      };
      return {
        labels: labels.map((l) => l.text),
        sora: labels.find((l) => l.text === "Sora")?.transform.a,
        clips,
        seenGrew: a.seen.length - seen,
        luminance,
      };
    };
    // An open, lit tile 8-10 units from the player in plain sight: dimmed by
    // the player's light, fully lit for a spectator.
    let far: { x: number; y: number } | undefined;
    for (let y = 0; y < g.floors[0].tiles.length && !far; y++)
      for (let x = 0; x < g.floors[0].tiles[y].length && !far; x++) {
        const pt = { x: x + 0.5, y: y + 0.5 },
          d = Math.hypot(pt.x - a.x, pt.y - a.y);
        if (
          g.floors[0].tiles[y][x] === 0 &&
          d >= 8 &&
          d <= 10 &&
          Math.abs(pt.y - a.y) < 10 &&
          playerCanSee(g.floors[0], a, pt)
        )
          far = pt;
      }
    if (!far) throw new Error("no lit far tile in the fixture");
    const normal = draw(),
      focus = { x: a.x, y: a.y },
      spectator = draw({ floor: 0, focus, zoom: 1 }),
      zoomed = draw({ floor: 0, focus, zoom: 2 }),
      centred = draw({ floor: 0, focus: far, zoom: 1 }),
      upstairs = draw({ floor: 1, focus, zoom: 1 });
    return {
      far,
      normal: { ...normal, far: normal.luminance(far), luminance: undefined },
      spectator: {
        ...spectator,
        far: spectator.luminance(far),
        luminance: undefined,
      },
      centred: centred.luminance(far),
      zoomed: { ...zoomed, luminance: undefined },
      upstairs: { ...upstairs, luminance: undefined },
    };
  });
  // Player's own view: unchanged perception.
  expect(result.normal.labels).toContain("Sora");
  expect(result.normal.labels).toContain("KEY REQUIRED");
  expect(result.normal.labels).not.toContain("Secret");
  expect(result.normal.labels).not.toContain("Upstairs");
  expect(result.normal.clips).toBe(1);
  // Spectator: everyone on the floor, no clip, no seen-memory, no prompts.
  expect(result.spectator.labels).toContain("Sora");
  expect(result.spectator.labels).toContain("Secret");
  expect(result.spectator.labels).not.toContain("Upstairs");
  expect(result.spectator.labels).not.toContain("KEY REQUIRED");
  expect(result.spectator.clips).toBe(0);
  expect(result.spectator.seenGrew).toBe(0);
  // Another floor shows only its own occupants.
  expect(result.upstairs.labels).toContain("Upstairs");
  expect(result.upstairs.labels).not.toContain("Sora");
  expect(result.upstairs.labels).not.toContain("Secret");
  // Zoom scales the world transform.
  expect(result.zoomed.sora).toBeCloseTo(result.spectator.sora! * 2, 6);
  // The light mask is gone: a tile is as bright at the edge of the view as at
  // its centre, and brighter than under the player's light.
  expect(result.spectator.far).toBeGreaterThan(30);
  expect(result.spectator.far).toBeGreaterThan(result.centred * 0.9);
  expect(result.spectator.far).toBeLessThan(result.centred * 1.1);
  expect(result.normal.far).toBeLessThan(result.spectator.far * 0.8);
});
