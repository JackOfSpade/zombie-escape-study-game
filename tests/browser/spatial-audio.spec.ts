import { expect, test } from "./helpers/offline-test";

test("native HRTF rendering swaps headphone sides when the player turns and respects distance, sealed rooms and storey height", async ({
  page,
}) => {
  await page.goto("/lab.html");
  const proof = await page.evaluate(async () => {
    const { updateListener, createWorldPanner, positionPanner, spatialMixer } =
      await import("/src/spatial-audio.ts" as string);
    const { TestRunner } = await import("/src/gametest/runner.ts" as string);
    const { emptyScenario } = await import("/src/gametest/schema.ts" as string);
    const roadmap = await (await fetch("/curriculum.json")).json();
    const g = new TestRunner(emptyScenario(), roadmap).game;
    Object.assign(g.survivors[0], { x: 10.5, y: 15.5, floor: 0 });
    const floor = g.floors[0];
    for (let x = 1; x < 43; x++) floor.tiles[17][x] = 1;
    floor.tiles[17][10] = 0;
    const origin = { x: 10.5, y: 18.5, floor: 0, height: 1.6 };
    async function render(yaw: number, sourceOrigin = origin) {
      const sampleRate = 48000,
        frames = sampleRate;
      // OfflineAudioContext produces an inspectable buffer only. This test
      // never creates an output device or plays sound through the speakers.
      const ctx = new OfflineAudioContext(2, frames, sampleRate);
      const api = ctx as unknown as AudioContext;
      updateListener(api, g, { yaw, pitch: 0 });
      const panner = createWorldPanner(api);
      if (!panner) throw Error("Native browser panner is unavailable");
      positionPanner(api, panner, sourceOrigin);
      const mix = spatialMixer(g)(sourceOrigin);
      const source = ctx.createBufferSource(),
        input = ctx.createBuffer(1, frames, sampleRate),
        data = input.getChannelData(0);
      let state = 0x1f123bb5;
      for (let i = 0; i < data.length; i++) {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        data[i] = ((state / 0xffffffff) * 2 - 1) * 0.12;
      }
      source.buffer = input;
      const filter = ctx.createBiquadFilter(),
        gain = ctx.createGain();
      filter.type = "lowpass";
      filter.frequency.value = mix.cutoff;
      gain.gain.value = mix.gain;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(ctx.destination);
      source.start();
      const output = await ctx.startRendering();
      // Ignore listener/panner smoothing and HRTF settling at the start.
      const energy = (channel: number) => {
        const samples = output.getChannelData(channel);
        let sum = 0;
        for (let i = sampleRate * 0.2; i < sampleRate * 0.9; i++)
          sum += samples[i] * samples[i];
        return sum / (sampleRate * 0.7);
      };
      return {
        left: energy(0),
        right: energy(1),
        gain: mix.gain,
        cutoff: mix.cutoff,
        distance: mix.distance,
        panningModel: panner.panningModel,
      };
    }
    const facingEast = await render(0),
      facingWest = await render(Math.PI);
    const far = await render(0, { ...origin, y: 27.5 });
    const above = await render(0, { ...origin, floor: 1 });
    floor.furniture.push({
      id: "synthetic-sound-seal",
      kind: "fridge",
      x: 10.5,
      y: 17.5,
      floor: 0,
      w: 1,
      h: 1,
      hp: 100,
      maxHp: 100,
      speed: 0,
      rotation: 0,
      destroyed: false,
      movers: [],
      moved: 0,
      credited: [],
      turning: 0,
    });
    const sealed = await render(0);
    floor.furniture[0].destroyed = true;
    const reopened = await render(0);
    return { facingEast, facingWest, far, above, sealed, reopened };
  });
  const total = (sample: { left: number; right: number }) =>
    sample.left + sample.right;
  expect(proof.facingEast.panningModel).toBe("HRTF");
  expect(total(proof.facingEast)).toBeGreaterThan(0);
  expect(proof.facingEast.right).toBeGreaterThan(proof.facingEast.left * 1.3);
  expect(proof.facingWest.left).toBeGreaterThan(proof.facingWest.right * 1.3);
  expect(proof.far.distance).toBeGreaterThan(proof.facingEast.distance);
  expect(proof.far.gain).toBeLessThan(proof.facingEast.gain);
  expect(total(proof.far)).toBeLessThan(total(proof.facingEast) * 0.5);
  expect(proof.sealed.cutoff).toBe(120);
  expect(proof.sealed.gain).toBeLessThan(proof.facingEast.gain / 10);
  expect(total(proof.sealed)).toBeLessThan(total(proof.facingEast) * 0.01);
  expect(proof.above.cutoff).toBe(120);
  expect(proof.above.gain).toBeLessThan(proof.facingEast.gain / 10);
  expect(total(proof.above)).toBeLessThan(total(proof.facingEast) * 0.01);
  expect(proof.reopened.cutoff).toBe(4800);
  expect(proof.reopened.gain).toBeCloseTo(proof.facingEast.gain, 8);
  expect(total(proof.reopened)).toBeCloseTo(total(proof.facingEast), 7);
});

for (const kind of ["effect", "speech"] as const)
  test(`one ongoing ${kind} follows camera turns and movement away from and back to its source`, async ({
    page,
  }) => {
    await page.goto("/lab.html");
    const proof = await page.evaluate(async (kind) => {
      const [{ AudioDirector }, { TestRunner }, { emptyScenario }, { actor }] =
        await Promise.all([
          import("/src/audio.ts" as string),
          import("/src/gametest/runner.ts" as string),
          import("/src/gametest/schema.ts" as string),
          import("/src/world.ts" as string),
        ]);
      const roadmap = await (await fetch("/curriculum.json")).json();
      async function render(moving: boolean) {
        const g = new TestRunner(emptyScenario(), roadmap).game,
          human = g.survivors[0],
          sourceActor = Object.assign(
            actor("synthetic-speaker", "Test NPC", 1),
            {
              x: 10.5,
              y: 18.5,
              floor: 0,
            },
          ),
          sampleRate = 48000,
          seconds = 4.5,
          ctx = new OfflineAudioContext(2, sampleRate * seconds, sampleRate),
          // Offline suspension is a deterministic test clock, rather than a
          // suspended output device. Keep the director in its normal running
          // state while retaining native listener, nodes, scheduling and PCM.
          api = new Proxy(ctx, {
            get(target, key) {
              if (key === "state") return "running";
              const value = Reflect.get(target, key, target);
              return typeof value === "function" ? value.bind(target) : value;
            },
          }) as unknown as AudioContext,
          audio = new AudioDirector(
            () => api,
            async () => new Map(),
          );
        // This runs the real director and native browser graph entirely in an
        // offline render. There is no speaker output, API call or real save.
        Object.assign(human, { x: 10.5, y: 15.5, floor: 0 });
        g.survivors = [human, sourceActor];
        g.zombies = [];
        g.status = "playing";
        g.paused = false;
        g.time = 100;
        g.settings.volume = 1;
        audio.start();
        await audio.ready;
        audio.update(g, { yaw: 0 });
        if (kind === "effect")
          audio.cue(440, 5, 0.035, undefined, "effect", 4800, {
            x: sourceActor.x,
            y: sourceActor.y,
            floor: 0,
            height: 1.45,
          });
        const pauses = [1, 2, 3].map((time) => ctx.suspend(time));
        let accepted = true;
        if (kind === "speech") {
          // Speech uses one native mono buffer for the whole trajectory.
          const input = ctx.createBuffer(1, sampleRate * 5, sampleRate),
            samples = input.getChannelData(0);
          let state = 0x1f123bb5;
          for (let i = 0; i < samples.length; i++) {
            state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
            samples[i] = ((state / 0xffffffff) * 2 - 1) * 0.035;
          }
          accepted = audio.speak(g, {
            id: "synthetic-spatial-utterance",
            actorId: sourceActor.id,
            buffer: input,
          });
        }
        const rendered = ctx.startRendering();
        for (let i = 0; i < pauses.length; i++) {
          await pauses[i];
          g.time = 100 + ctx.currentTime;
          if (moving) {
            // Turn in place, walk away, then approach the same still-playing
            // source. No cue or speech request is restarted between stages.
            human.y = i === 1 ? 6.5 : 15.5;
          }
          audio.update(g, { yaw: moving ? Math.PI : 0 });
          await ctx.resume();
        }
        const output = await rendered;
        const windows = [0.5, 1.5, 2.5, 3.5].map((start) => {
          const energy = (channel: number) => {
            const samples = output.getChannelData(channel);
            let sum = 0;
            for (
              let i = Math.floor(start * sampleRate);
              i < Math.floor((start + 0.35) * sampleRate);
              i++
            )
              sum += samples[i] * samples[i];
            return sum / (sampleRate * 0.35);
          };
          return { left: energy(0), right: energy(1) };
        });
        audio.stop();
        return { accepted, windows };
      }
      return { reference: await render(false), moving: await render(true) };
    }, kind);
    expect(proof.reference.accepted).toBe(true);
    expect(proof.moving.accepted).toBe(true);
    const [initial, turned, far, returned] = proof.moving.windows,
      total = (window: { left: number; right: number }) =>
        window.left + window.right,
      normalized = (index: number) =>
        total(proof.moving.windows[index]) /
        total(proof.reference.windows[index]);
    expect(initial.right).toBeGreaterThan(initial.left * 1.3);
    expect(turned.left).toBeGreaterThan(turned.right * 1.3);
    expect(total(far)).toBeGreaterThan(0);
    // Compare against the same elapsed-time envelope, rather than mistaking
    // the effect's natural fade for distance attenuation.
    expect(normalized(2)).toBeLessThan(normalized(1) * 0.5);
    expect(normalized(3)).toBeGreaterThan(normalized(2) * 2.5);
    expect(normalized(3)).toBeGreaterThan(0.8);
    expect(returned.left).toBeGreaterThan(returned.right * 1.3);
  });
