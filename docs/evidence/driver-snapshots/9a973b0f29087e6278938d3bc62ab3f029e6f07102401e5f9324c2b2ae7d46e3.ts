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
  private game?: Game;
  private lastTime = 0;
  private pulse = -1;
  private eventCaption = "";
  private eventCaptionUntil = 0;
  private voices = new Set<{
    osc: OscillatorNode;
    vol: GainNode;
    channel: string;
  }>();
  constructor(
    private createContext: () => AudioContext = () => new AudioContext(),
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
  ) {
    const c = this.ctx;
    if (!c || !this.master || duration <= 0) return;
    const osc = c.createOscillator(),
      vol = c.createGain();
    const voice = { osc, vol, channel };
    this.voices.add(voice);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(frequency, c.currentTime);
    if (end)
      osc.frequency.exponentialRampToValueAtTime(end, c.currentTime + duration);
    vol.gain.setValueAtTime(0.001, c.currentTime);
    vol.gain.linearRampToValueAtTime(
      gain,
      c.currentTime + Math.min(0.06, duration / 3),
    );
    vol.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(vol);
    vol.connect(this.master);
    osc.onended = () => {
      this.voices.delete(voice);
      osc.disconnect();
      vol.disconnect();
    };
    osc.start();
    osc.stop(c.currentTime + duration);
  }
  private cancel(channel?: string) {
    for (const voice of [...this.voices]) {
      if (channel && voice.channel !== channel) continue;
      try {
        voice.osc.stop();
      } catch {}
      voice.osc.disconnect();
      voice.vol.disconnect();
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
      this.eventCaption = "";
      this.eventCaptionUntil = 0;
    }
    this.lastTime = g.time;
    const c = this.ctx;
    if (c && this.master)
      this.master.gain.setTargetAtTime(
        Math.min(1, Math.max(0, g.settings.volume)),
        c.currentTime,
        0.03,
      );
    if (g.time < this.next) return;
    this.next = g.time + 0.25;
    const mix = hordeSound(g),
      cues = soundEvents(g, this.cursor);
    if (c && this.horde && this.filter) {
      this.horde.gain.setTargetAtTime(mix.gain, c.currentTime, 0.15);
      this.filter.frequency.setTargetAtTime(mix.cutoff, c.currentTime, 0.12);
    }
    for (const cue of cues)
      this.cue(cue.frequency, cue.duration, cue.gain, cue.end);
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
