import { distance, type Actor, type Game } from "./model";
import type { NpcChatterDelivery } from "./npc-chatter";
import { npcCanHearSpeech, npcSpeechHearingRange } from "./npc-hearing";

export type NpcSpeechAct = "question" | "request" | "warning" | "statement";
type Addressed = "self" | "other" | "none";
interface ReplyLine {
  text: string;
  delivery?: NpcChatterDelivery;
  turn?: number;
}
interface ReplyOptions {
  intent?: "invite" | "continue" | "close";
  participants: ReadonlySet<string>;
}

export function classifyNpcSpeechAct(
  text: string,
  delivery?: NpcChatterDelivery,
): NpcSpeechAct {
  if (text.includes("?")) return "question";
  if (delivery === "urgent") return "warning";
  if (
    /\b(?:can you|could you|anyone|someone|help|give me|need\s+(?:a|an|some|help|you|someone|me|to)|let's|watch|cover)\b|^\s*need\b/i.test(
      text,
    )
  )
    return "request";
  if (text.trimEnd().endsWith("!")) return "warning";
  return "statement";
}

export function npcAddressedListener(
  text: string,
  listener: Actor,
  others: Actor[],
): Addressed {
  const named = (actor: Actor) => {
    const first = actor.name.trim().split(/\s+/)[0];
    return (
      !!first &&
      new RegExp(
        `(?<![\\p{L}\\p{N}_])${first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}_])`,
        "iu",
      ).test(text)
    );
  };
  if (named(listener)) return "self";
  return others.some((other) => other.id !== listener.id && named(other))
    ? "other"
    : "none";
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const bases: Record<NpcSpeechAct, number> = {
  question: 0.55,
  request: 0.5,
  warning: 0.35,
  statement: 0.22,
};

export function npcReplyChance(
  g: Game,
  listener: Actor,
  speaker: Actor,
  line: ReplyLine,
  opts: ReplyOptions & { addressed: Addressed },
): number {
  if (!npcCanHearSpeech(g, listener, speaker, line.delivery)) return 0;
  const act = classifyNpcSpeechAct(line.text, line.delivery);
  let chance = bases[act];
  if (opts.intent === "invite") chance = Math.max(chance, 0.7);
  if (opts.addressed === "self") chance = Math.max(chance, 0.85);
  if (opts.addressed === "other") chance *= 0.35;
  chance *=
    1 -
    (0.5 * distance(listener, speaker)) / npcSpeechHearingRange(line.delivery);
  chance *= 0.6 + 0.8 * clamp01(listener.social);
  if (opts.participants.has(listener.id)) chance *= 1.3;
  if (listener.activity === "fleeing" || listener.activity === "defending")
    chance *= act === "warning" ? 0.7 : 0.25;
  else if (listener.activity === "studying") chance *= 0.6;
  else if (listener.activity === "climbing") chance *= 0.4;
  if (listener.hp <= 30) chance *= 0.6;
  chance *= 0.75 ** Math.max(0, (line.turn ?? 1) - 2);
  return Math.max(0, Math.min(opts.intent === "close" ? 0.08 : 0.95, chance));
}

/** One draw determines both whether the group answers and its first speaker.
 * The remaining weighted order is retained for bounded silent-listener fallback. */
export function pickNpcResponders(
  g: Game,
  speaker: Actor,
  line: ReplyLine,
  listeners: Actor[],
  opts: ReplyOptions & { nameCandidates?: Actor[] },
  draw: number,
): Actor[] {
  const weighted = listeners
    .map((listener) => ({
      listener,
      p: npcReplyChance(g, listener, speaker, line, {
        ...opts,
        addressed: npcAddressedListener(
          line.text,
          listener,
          opts.nameCandidates ?? listeners,
        ),
      }),
    }))
    .filter(({ p }) => p > 0)
    .sort(
      (a, b) =>
        b.p - a.p ||
        distance(a.listener, speaker) - distance(b.listener, speaker) ||
        a.listener.id.localeCompare(b.listener.id),
    );
  const groupChance = Math.min(
    0.9,
    1 - weighted.reduce((product, { p }) => product * (1 - p), 1),
  );
  if (draw >= groupChance || !weighted.length) return [];
  const target = draw / groupChance,
    total = weighted.reduce((sum, { p }) => sum + p, 0);
  let cumulative = 0;
  const chosen = weighted.findIndex(({ p }) => {
    cumulative += p / total;
    return target < cumulative;
  });
  const index = chosen < 0 ? weighted.length - 1 : chosen;
  return [
    weighted[index].listener,
    ...weighted.filter((_, i) => i !== index).map(({ listener }) => listener),
  ];
}
