import { loadSfx, SFX, type SoundSample } from "./sfx";
import { type Game, CONFIG } from "./model";
import { hordeSound, soundEvents, surgeCaption } from "./soundscape";
export class AudioDirector {
  ctx?: AudioContext;
  master?: GainNode;
  horde?: GainNode;
  filter?: BiquadFilterNode;
  cursor = 0;
  next = 0;
  phase = "";
  caption = "";
  error = "";
  ready: Promise<void> = Promise.resolve();
  private samples = new Map<string, AudioBuffer>();
  private sampleCursor = 0;
  private nextGroan = 0;
  private footsteps = 0;
  private position?: { x: number; y: number; floor: number };
  private game?: Game;
  private lastTime = 0;
  private pulse = -1;
  private eventCaption = "";
  private mixCaption = "";
  private volume = -1;
  private eventCaptionUntil = 0;
  private voices = new Set<{
    osc: AudioScheduledSourceNode;
    vol: GainNode;
    channel: string;
    filter?: BiquadFilterNode;
  }>();
  constructor(
    private createContext: () => AudioContext = () =>
      new AudioContext({ latencyHint: "interactive" }),
    private loadSamples: (
      ctx: AudioContext,
    ) => Promise<Map<string, AudioBuffer>> = loadSfx,
  ) {}
  start() {
    if (this.ctx) {
      void this.ctx.resume().catch(() => {
        this.error = "Audio could not resume. Sound captions remain available.";
      });
      return true;
    }
    try {
      const c = this.createContext();
      const master = c.createGain();
      master.gain.value = 0;
      const limiter = c.createDynamicsCompressor();
      limiter.threshold.value = -12;
      limiter.knee.value = 6;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.15;
      master.connect(limiter);
      limiter.connect(c.destination);
      const buffer = c.createBuffer(1, c.sampleRate * 3, c.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        last = (last + Math.random() * 0.04 - 0.02) / 1.02;
        data[i] = last * 4;
      }
      const source = c.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      const horde = c.createGain();
      horde.gain.value = 0;
      source.connect(filter);
      filter.connect(horde);
      horde.connect(master);
      source.start();
      this.ready = this.loadSamples(c)
        .then((bank) => {
          this.samples = bank;
        })
        .catch(() => {});
      this.ctx = c;
      this.master = master;
      this.filter = filter;
      this.horde = horde;
      this.error = "";
      this.game = undefined;
      return true;
    } catch {
      this.error = "Audio is unavailable. Enable sound captions in Settings.";
      return false;
    }
  }
  cue(
    frequency: number,
    duration: number,
    gain = 0.12,
    end?: number,
    channel = "effect",
    cutoff = 12000,
  ) {
    const c = this.ctx;
    if (
      !c ||
      !this.master ||
      duration <= 0 ||
      gain <= 0 ||
      this.voices.size >= 20
    )
      return;
    const osc = c.createOscillator(),
      vol = c.createGain();
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const voice = { osc, vol, channel, filter };
    this.voices.add(voice);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(frequency, c.currentTime);
    if (end)
      osc.frequency.exponentialRampToValueAtTime(end, c.currentTime + duration);
    const floorGain = Math.min(0.001, gain * 0.01);
    vol.gain.setValueAtTime(floorGain, c.currentTime);
    vol.gain.linearRampToValueAtTime(
      gain,
      c.currentTime + Math.min(0.06, duration / 3),
    );
    vol.gain.exponentialRampToValueAtTime(floorGain, c.currentTime + duration);
    osc.connect(filter);
    filter.connect(vol);
    vol.connect(this.master);
    osc.onended = () => {
      this.voices.delete(voice);
      osc.disconnect();
      vol.disconnect();
      filter.disconnect();
    };
    osc.start();
    osc.stop(c.currentTime + duration);
  }
  private sample(
    kind: SoundSample,
    gain: number,
    cutoff = 4800,
    channel = "effect",
  ) {
    const c = this.ctx;
    if (!c || !this.master || this.voices.size >= 20) return false;
    const options = SFX[kind],
      name = options[this.sampleCursor++ % options.length],
      buffer = this.samples.get(name);
    if (!buffer) return false;
    const osc = c.createBufferSource(),
      vol = c.createGain(),
      filter = c.createBiquadFilter();
    osc.buffer = buffer;
    osc.playbackRate.value = 0.96 + (this.sampleCursor % 5) * 0.02;
    vol.gain.value = gain;
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const voice = { osc, vol, filter, channel };
    this.voices.add(voice);
    osc.connect(filter);
    filter.connect(vol);
    vol.connect(this.master);
    osc.onended = () => {
      this.voices.delete(voice);
      osc.disconnect();
      filter.disconnect();
      vol.disconnect();
    };
    osc.start();
    return true;
  }
  private cancel(channel?: string) {
    for (const voice of [...this.voices]) {
      if (channel && voice.channel !== channel) continue;
      try {
        voice.osc.stop();
      } catch {}
      voice.osc.disconnect();
      voice.vol.disconnect();
      voice.filter?.disconnect();
      this.voices.delete(voice);
    }
  }
  stop() {
    this.cancel();
    if (this.ctx && this.horde)
      this.horde.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
    this.game = undefined;
    this.phase = "";
    this.caption = "";
  }
  update(g: Game) {
    if (g !== this.game || g.time < this.lastTime) {
      this.cancel();
      this.game = g;
      this.cursor = g.seq;
      this.next = 0;
      this.phase = "";
      this.pulse = -1;
      this.nextGroan = 0;
      this.position = undefined;
      this.footsteps = 0;
      this.eventCaption = "";
      this.mixCaption = "";
      this.eventCaptionUntil = 0;
    }
    this.lastTime = g.time;
    const c = this.ctx;
    if (c && this.master && this.volume !== g.settings.volume) {
      this.volume = g.settings.volume;
      this.master.gain.setTargetAtTime(
        Math.min(1, Math.max(0, g.settings.volume)),
        c.currentTime,
        0.03,
      );
    }
    // Impacts follow simulation events immediately, independently of the slower
    // ambient spatial mix. Never replay a backlog after pause/restore.
    const cues = g.seq !== this.cursor ? soundEvents(g, this.cursor) : [];
    this.cursor = g.seq;
    for (const cue of cues)
      if (!cue.sample || !this.sample(cue.sample, cue.gain, cue.cutoff))
        this.cue(
          cue.frequency,
          cue.duration,
          cue.gain,
          cue.end,
          "effect",
          cue.cutoff,
        );
    if (cues.length) {
      this.eventCaption = cues[0].caption;
      this.eventCaptionUntil = g.time + 1.5;
    }
    this.caption = [
      surgeCaption(g),
      g.time < this.eventCaptionUntil ? this.eventCaption : "",
      this.mixCaption,
    ]
      .filter(Boolean)
      .join(" · ");
    if (g.time < this.next) return;
    this.next = g.time + 0.25;
    const mix = hordeSound(g);
    this.mixCaption = mix.caption;
    if (c && this.horde && this.filter) {
      this.horde.gain.setTargetAtTime(
        this.samples.size ? mix.gain * 0.12 : mix.gain,
        c.currentTime,
        0.15,
      );
      this.filter.frequency.setTargetAtTime(mix.cutoff, c.currentTime, 0.12);
      // A voice may outlast a furniture move. Sealing/reopening the room must
      // also crossfade currently playing ambience, not only the next groan.
      for (const voice of this.voices)
        if (voice.channel === "ambience") {
          voice.vol.gain.setTargetAtTime(
            Math.min(0.35, mix.gain),
            c.currentTime,
            0.08,
          );
          voice.filter?.frequency.setTargetAtTime(
            mix.cutoff,
            c.currentTime,
            0.06,
          );
        }
    }
    if (mix.gain > 0.0004 && g.time >= this.nextGroan) {
      this.sample("groan", Math.min(0.35, mix.gain), mix.cutoff, "ambience");
      this.nextGroan = g.time + 0.9 + (this.sampleCursor % 5) * 0.17;
    }
    const a = g.survivors[0];
    if (
      this.position &&
      this.position.floor === a.floor &&
      a.alive &&
      !a.escaped &&
      !a.vault &&
      !a.stairTravel
    ) {
      const d = Math.hypot(a.x - this.position.x, a.y - this.position.y);
      if (d < 2) this.footsteps += d;
      if (this.footsteps >= 0.7) {
        this.sample("footstep", 0.035);
        if (a.grip) this.sample("drag", 0.025);
        this.footsteps %= 0.7;
      }
    }
    this.position = { x: a.x, y: a.y, floor: a.floor };
    if (cues.length) {
      this.eventCaption = cues[0].caption;
      this.eventCaptionUntil = g.time + 1.5;
    }
    this.cursor = g.seq;
    if (this.phase !== g.surge.state) {
      this.cancel("warning");
      const previous = this.phase;
      this.phase = g.surge.state;
      this.pulse = -1;
      if (this.phase === "active") this.cue(250, 2, 0.3, 45);
      if (this.phase === "calm" && previous === "active")
        this.cue(160, 2, 0.1, 45);
    }
    if (this.phase === "warning") {
      const elapsed = Math.max(0, g.time - g.surge.started),
        pulse = Math.floor(elapsed / 1.6);
      if (elapsed < CONFIG.warning) {
        const duration = Math.min(0.35, CONFIG.warning - elapsed);
        this.cue(
          35 * Math.pow(900 / 35, elapsed / CONFIG.warning),
          duration,
          0.06,
          35 * Math.pow(900 / 35, (elapsed + duration) / CONFIG.warning),
          "warning",
        );
      }
      if (pulse !== this.pulse && elapsed < CONFIG.warning) {
        this.pulse = pulse;
        this.cue(70 + pulse * 35, 0.7, 0.15, undefined, "warning");
      }
    }
    this.caption = [
      surgeCaption(g),
      g.time < this.eventCaptionUntil ? this.eventCaption : "",
      mix.caption,
    ]
      .filter(Boolean)
      .join(" · ");
  }
}
