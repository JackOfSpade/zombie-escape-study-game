import { soundConnectivity } from "./acoustics";
import { type SoundSample } from "./sfx";
import { type Game, type WorldEvent, distance } from "./model";
import { line } from "./spatial";
function transmission(
  g: Game,
  a: { x: number; y: number },
  b: { x: number; y: number },
  connected: ReturnType<typeof soundConnectivity>,
) {
  const f = g.floors[g.survivors[0].floor];
  return connected(a, b) ? (line(f, a, b, true) ? 1 : 0.55) : 0.025;
}
export interface SoundCue {
  frequency: number;
  duration: number;
  gain: number;
  end?: number;
  caption: string;
  sample?: SoundSample;
  cutoff?: number;
}
export function hordeSound(g: Game) {
  const a = g.survivors[0];
  const connected = soundConnectivity(g.floors[a.floor]);
  // Bound acoustic path work and favor nearby sources, rather than arbitrary
  // spawn-array order. Captions describe sound only, never counts or locations.
  const sources = g.zombies
    .filter((z) => z.hp > 0 && z.floor === a.floor && distance(a, z) < 16)
    .sort((x, y) => distance(a, x) - distance(a, y))
    .slice(0, 24)
    .map((z) => ({
      transmission: transmission(g, a, z, connected),
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
    cutoff: clear > 0.2 ? 4800 : 120,
    caption:
      gain < 0.002
        ? ""
        : clear > 0.2
          ? "[Nearby horde vocalizations]"
          : "[Muffled horde behind defenses]",
  };
}
function soundPosition(g: Game, e: WorldEvent) {
  // Impacts originate on a solid prop's surface; use the attacking side for
  // propagation, so a partial barricade cannot hide all of its impact sounds.
  return (
    g.zombies.find((z) => z.id === e.actor && z.floor === e.floor) ??
    e.position!
  );
}
function audible(
  g: Game,
  e: WorldEvent,
  base: number,
  connected: ReturnType<typeof soundConnectivity>,
) {
  const a = g.survivors[0];
  if (e.floor !== a.floor) return 0;
  if (!e.position) return base * 0.25; // Legacy non-positional saves.
  const d = distance(a, e.position);
  return d < 16
    ? (base * transmission(g, a, soundPosition(g, e), connected)) /
        (1 + d * 0.2)
    : 0;
}
export function soundEvents(g: Game, after: number): SoundCue[] {
  const out: SoundCue[] = [];
  // Non-audio world events must not rebuild acoustic geometry on each frame.
  const events = g.events.filter(
    (e) =>
      e.seq > after &&
      g.time - e.at >= 0 &&
      g.time - e.at < 0.8 &&
      [
        "breach",
        "barricade-hit",
        "survivor-hit",
        "entrance-close",
        "helicopter",
        "board",
        "completion",
      ].includes(e.type),
  );
  if (!events.length) return out;
  const connected = soundConnectivity(g.floors[g.survivors[0].floor]);
  for (const source of events) {
    const e =
      source.type === "entrance-close" && !source.position
        ? { ...source, position: g.floors[source.floor]?.entry }
        : source;
    let cue: SoundCue | undefined;
    if (e.type === "breach")
      cue = {
        frequency: 60,
        duration: 0.9,
        gain: audible(g, e, 0.5, connected),
        end: 450,
        caption: "[Barricade breaks · crashing debris]",
      };
    if (e.type === "barricade-hit")
      cue = {
        frequency: 90,
        duration: 0.18,
        gain: audible(g, e, 0.18, connected),
        end: 35,
        caption: "[Impacts against a barricade]",
      };
    if (e.type === "survivor-hit")
      cue = {
        frequency: 135,
        duration: 0.2,
        gain: audible(g, e, 0.18, connected),
        end: 55,
        caption: "[Nearby attack]",
      };
    if (e.type === "entrance-close" && e.floor === g.survivors[0].floor)
      cue = {
        frequency: 95,
        duration: 0.5,
        gain: audible(g, e, 0.3, connected),
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
    // The player's own terminal unlocking: the only completion that grants
    // them a key, so NPC terminals elsewhere stay silent.
    if (
      e.type === "completion" &&
      e.floor === g.survivors[0].floor &&
      e.encounter &&
      g.encounters[e.encounter]?.submissions.some(
        (s) =>
          s.id === g.encounters[e.encounter!].accepted && s.author === "human",
      )
    )
      cue = {
        frequency: 660,
        duration: 0.25,
        gain: 0.28,
        end: 990,
        caption: "[Lock releases · key granted]",
        sample: "latch",
      };
    if (e.type === "board" && e.actor === "human")
      cue = {
        frequency: 400,
        duration: 1,
        gain: 0.15,
        end: 800,
        caption: "[Helicopter extraction]",
      };
    if (cue) {
      cue.sample ??=
        e.type === "breach"
          ? "breach"
          : e.type === "survivor-hit"
            ? "hit"
            : e.type === "entrance-close"
              ? "metal"
              : e.type === "barricade-hit"
                ? "wood"
                : undefined;
      cue.cutoff =
        !e.position ||
        transmission(g, g.survivors[0], soundPosition(g, e), connected) > 0.2
          ? 4800
          : 120;
    }
    if (cue && cue.gain >= 0.0004) out.push(cue);
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
