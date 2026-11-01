import { detachAuthoredScene } from "./helpers/synthetic-world";
import { startDesignedRun } from "./helpers/designed-run";
import { expect, test } from "@playwright/test";
test("downloaded SFX decode and play through real low-pass filters; permanent blood reloads", async ({
  page,
}) => {
  await page.goto("/");
  await startDesignedRun(page);
  await detachAuthoredScene(page);
  const proof = await page.evaluate(async () => {
    const { AudioDirector } = await import("/src/audio.ts" as string),
      { SFX } = await import("/src/sfx.ts" as string);
    const d = new AudioDirector();
    d.start();
    await d.ready;
    const ctx = d.ctx as AudioContext;
    const files = Object.values(SFX).flat() as string[];
    const decoded = [];
    for (const name of files) {
      const r = await fetch(`/sfx/${name}.wav`);
      const b = await ctx.decodeAudioData(await r.arrayBuffer());
      decoded.push({
        name,
        duration: b.duration,
        channels: b.numberOfChannels,
      });
    }
    const filters: BiquadFilterNode[] = [],
      sources: AudioBufferSourceNode[] = [];
    const originalFilter = ctx.createBiquadFilter.bind(ctx),
      originalSource = ctx.createBufferSource.bind(ctx);
    ctx.createBiquadFilter = () => {
      const n = originalFilter();
      filters.push(n);
      return n;
    };
    ctx.createBufferSource = () => {
      const n = originalSource();
      sources.push(n);
      return n;
    };
    const g = (window as any).__deadAir.game,
      a = g.survivors[0],
      f = g.floors[0];
    g.settings.view = "top-down";
    g.survivors = [a];
    g.zombies = [];
    g.nextSpawn = 1e9;
    g.surge.anchor = 1e9;
    f.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
    f.furniture = [];
    f.stations = [];
    Object.assign(a, { x: 10.5, y: 16.5 });
    for (let y = 0; y < 34; y++) if (y < 15 || y >= 18) f.tiles[y][15] = 1;
    f.furniture = [
      {
        id: "seal",
        kind: "shelf",
        floor: 0,
        x: 15.5,
        y: 16.5,
        w: 1,
        h: 3,
        hp: 100,
        maxHp: 100,
        speed: 1,
        rotation: 0,
        destroyed: false,
        movers: [],
        moved: 0,
        credited: [],
        turning: 0,
      },
    ];
    g.zombies = [
      {
        id: "audio-source",
        x: 20.5,
        y: 16.5,
        floor: 0,
        hp: 100,
        path: [],
        repath: 0,
        memory: 0,
        cooldown: 0,
        stagger: 100,
        origin: "outside",
      },
    ];
    d.update(g);
    const ambientFilter = filters.at(-1)!,
      activeTargets: number[] = [],
      setTarget = ambientFilter.frequency.setTargetAtTime.bind(
        ambientFilter.frequency,
      );
    ambientFilter.frequency.setTargetAtTime = (value, start, constant) => {
      activeTargets.push(value);
      return setTarget(value, start, constant);
    };
    g.events.push({
      seq: ++g.seq,
      at: g.time,
      type: "barricade-hit",
      text: "synthetic test impact",
      floor: 0,
      position: { x: 20.5, y: 16.5 },
    });
    g.time += 0.3;
    d.update(g);
    const sealed = filters.at(-1)?.frequency.value;
    f.furniture[0].h = 2.98;
    g.events.push({
      seq: ++g.seq,
      at: g.time,
      type: "barricade-hit",
      text: "synthetic test impact",
      floor: 0,
      position: { x: 20.5, y: 16.5 },
    });
    g.time += 0.3;
    d.update(g);
    const gap = filters.at(-1)?.frequency.value;
    d.stop();
    await ctx.close();
    // A moving actual zombie lays floor stains in the real RAF/physics loop.
    f.furniture = [];
    f.tiles = Array.from({ length: 34 }, () => Array(44).fill(0));
    g.zombies = [
      {
        id: "blood-test",
        x: 12,
        y: 16.5,
        floor: 0,
        hp: 100,
        path: [{ x: 18, y: 16.5 }],
        target: { x: 18, y: 16.5 },
        repath: 1e9,
        memory: 1e9,
        cooldown: 0,
        stagger: 0,
        origin: "outside",
      },
    ];
    return { decoded, sealed, gap, activeTargets, voices: sources.length };
  });
  expect(proof.decoded).toHaveLength(16);
  expect(proof.decoded.every((s) => s.duration > 0 && s.channels === 1)).toBe(
    true,
  );
  expect(proof.activeTargets).toContain(120);
  expect(proof.activeTargets).toContain(4800);
  expect(proof.sealed).toBe(120);
  expect(proof.gap).toBe(4800);
  expect(proof.voices).toBeGreaterThanOrEqual(2);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as any).__deadAir.game.floors[0].blood?.filter(
            (row: string) => row?.match(/[123a-p]/),
          ).length ?? 0,
      ),
    )
    .toBeGreaterThan(0);
  await page.keyboard.press("Escape");
  const before = await page.evaluate(() =>
    JSON.stringify((window as any).__deadAir.game.floors[0].blood),
  );
  await page.reload();
  await expect(page.locator("#pause-menu")).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.stringify((window as any).__deadAir.game.floors[0].blood),
    ),
  ).toBe(before);
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    (window as any).__deadAir.game.zombies = [];
  });
  await page.screenshot({ path: "test-results/permanent-blood.png" });
});
