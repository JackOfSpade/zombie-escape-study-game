import { expect, test } from "@playwright/test";
for (const color of ["green", "red"])
  test(`${color} force-field health bars and fractures track actual damage`, async ({
    page,
  }) => {
    await page.goto("/lab.html");
    const result = await page.evaluate(async (color) => {
      const root = "/src/";
      const [{ render }, { TestRunner }, { step }] = await Promise.all([
        import(/* @vite-ignore */ root + "render.ts"),
        import(/* @vite-ignore */ root + "gametest/runner.ts"),
        import(/* @vite-ignore */ root + "engine.ts"),
      ]);
      const roadmap = await (await fetch("/curriculum.json")).json(),
        s = await (
          await fetch("/tests/fixtures/gametest/force-field-green.json")
        ).json();
      s.actions = [];
      s.checks = [];
      s.simulation = "game";
      s.entities[0].x = 15;
      s.entities[0].y = 12.5;
      s.entities[1].x = 11.6;
      s.entities[1].y = 12.5;
      s.entities[2].forceField = color;
      const g = new TestRunner(s, roadmap).game,
        o = g.floors[0].furniture[0];
      const c = document.createElement("canvas");
      c.id = "field-damage";
      c.style.width = "1200px";
      c.style.height = "900px";
      document.body.append(c);
      const ctx = c.getContext("2d")!,
        fill = ctx.fillRect.bind(ctx),
        text = ctx.fillText.bind(ctx),
        stroke = ctx.stroke.bind(ctx);
      let bars: any[] = [],
        labels: string[] = [],
        cracks = 0;
      ctx.fillRect = (x, y, w, h) => {
        if (
          Math.abs(h - 0.14) < 1e-6 &&
          ["#55ef9b", "#ff6274", "#ffd166"].includes(String(ctx.fillStyle))
        )
          bars.push({ width: w, color: ctx.fillStyle });
        fill(x, y, w, h);
      };
      ctx.fillText = (t, x, y, ...rest) => {
        labels.push(String(t));
        text(t, x, y, ...rest);
      };
      ctx.stroke = () => {
        if (ctx.strokeStyle === "#e3f7ee") cracks++;
        stroke();
      };
      const frame = () => {
        bars = [];
        labels = [];
        cracks = 0;
        render(c, g);
        return {
          bars: [...bars],
          labels: [...labels],
          cracks,
          image: c.toDataURL(),
        };
      };
      const full = frame();
      o.hp = o.maxHp * 0.5;
      const half = frame();
      o.hp = o.maxHp * 0.1;
      const critical = frame();
      o.hp = o.maxHp;
      for (let i = 0; i < 120; i++) step(g, 1 / 30);
      const damaged = frame(),
        health = o.hp / o.maxHp;
      const stable = frame().image === damaged.image;
      o.hp = 0;
      o.destroyed = true;
      const broken = frame();
      o.destroyed = false;
      o.hp = o.maxHp * 0.1;
      frame();
      return { full, half, critical, damaged, broken, health, stable };
    }, color);
    expect(result.full.bars).toHaveLength(1);
    expect(result.half.bars[0].width / result.full.bars[0].width).toBeCloseTo(
      0.5,
      5,
    );
    expect(
      result.critical.bars[0].width / result.full.bars[0].width,
    ).toBeCloseTo(0.1, 5);
    expect(result.critical.bars[0].color).toBe("#ffd166");
    expect(result.half.cracks).toBeGreaterThan(result.full.cracks);
    expect(result.critical.cracks).toBeGreaterThan(result.half.cracks);
    expect(result.half.labels).toContain("FIELD 50%");
    expect(result.critical.labels).toContain("FIELD 10%");
    expect(result.health).toBeGreaterThan(0);
    expect(result.health).toBeLessThan(1);
    expect(
      result.damaged.bars[0].width / result.full.bars[0].width,
    ).toBeCloseTo(result.health, 5);
    expect(result.stable).toBe(true);
    expect(result.broken.bars).toEqual([]);
    expect(result.broken.labels).toContain("FIELD BROKEN");
    await page
      .locator("#field-damage")
      .screenshot({ path: `.artifacts/force-field-${color}-damage.png` });
  });
