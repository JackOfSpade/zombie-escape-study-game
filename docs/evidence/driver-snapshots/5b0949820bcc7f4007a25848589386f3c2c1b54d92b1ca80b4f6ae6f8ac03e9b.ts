import { type Game, type WorldEvent, distance } from "./model";
import { soundGain } from "./spatial";
export interface SoundCue {
  frequency: number;
  duration: number;
  gain: number;
  end?: number;
  caption: string;
}
export function hordeSound(g: Game) {
  const a = g.survivors[0];
  // Bound acoustic path work and favor nearby sources, rather than arbitrary
  // spawn-array order. Captions describe sound only, never counts or locations.
  const sources = g.zombies
    .filter((z) => z.hp > 0 && z.floor === a.floor && distance(a, z) < 16)
    .sort((x, y) => distance(a, x) - distance(a, y))
    .slice(0, 24)
    .map((z) => ({
      transmission: soundGain(g.floors[a.floor], a, z),
      d: distance(a, z),
    }))
    .map((s) => ({ ...s, gain: (s.transmission / (1 + s.d)) * 0.3 }))
    .sort((x, y) => y.gain - x.gain)
    .slice(0, 12);
  const gain = Math.min(
    0.45,
    sources.reduce((n, s) => n + s.gain, 0),
  );
  const clear = Math.max(0, ...sources.map((s) => s.transmission));
  return {
    gain,
    cutoff: clear > 0.2 ? 1000 : 120,
    caption:
      gain < 0.002
        ? ""
        : clear > 0.2
          ? "[Nearby horde vocalizations]"
          : "[Muffled horde behind defenses]",
  };
}
function audible(g: Game, e: WorldEvent, base: number) {
  const a = g.survivors[0];
  if (e.floor !== a.floor) return 0;
  if (!e.position) return base * 0.25; // Legacy non-positional saves.
  const d = distance(a, e.position);
  return d < 16
    ? (base * soundGain(g.floors[a.floor], a, e.position)) / (1 + d * 0.2)
    : 0;
}
export function soundEvents(g: Game, after: number): SoundCue[] {
  const out: SoundCue[] = [];
  for (const e of g.events.filter(
    (e) => e.seq > after && g.time - e.at >= 0 && g.time - e.at < 0.8,
  )) {
    let cue: SoundCue | undefined;
    if (e.type === "breach")
      cue = {
        frequency: 60,
        duration: 0.9,
        gain: audible(g, e, 0.5),
        end: 450,
        caption: "[Barricade breaks · crashing debris]",
      };
    if (e.type === "barricade-hit")
      cue = {
        frequency: 90,
        duration: 0.18,
        gain: audible(g, e, 0.18),
        end: 35,
        caption: "[Impacts against a barricade]",
      };
    if (e.type === "survivor-hit")
      cue = {
        frequency: 135,
        duration: 0.2,
        gain: audible(g, e, 0.18),
        end: 55,
        caption: "[Nearby attack]",
      };
    if (e.type === "entrance-close" && e.floor === g.survivors[0].floor)
      cue = {
        frequency: 95,
        duration: 0.5,
        gain: 0.3,
        end: 35,
        caption: "[Main entrance slams shut]",
      };
    if (e.type === "helicopter" && g.survivors[0].floor === g.floors.length - 1)
      cue = {
        frequency: 130,
        duration: 2,
        gain: 0.1,
        end: 100,
        caption: "[Helicopter approaching]",
      };
    if (e.type === "board" && e.actor === "human")
      cue = {
        frequency: 400,
        duration: 1,
        gain: 0.15,
        end: 800,
        caption: "[Helicopter extraction]",
      };
    if (cue && cue.gain >= 0.004) out.push(cue);
  }
  // Bound simultaneous impacts while retaining the loudest meaningful cues.
  return out.sort((a, b) => b.gain - a.gain).slice(0, 4);
}
export function surgeCaption(g: Game) {
  return g.surge.state === "warning"
    ? "[An escalating biological pulse]"
    : g.surge.state === "active"
      ? "[The Surge · horde intensified]"
      : "";
}
