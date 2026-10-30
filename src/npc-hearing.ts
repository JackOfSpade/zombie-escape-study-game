import { soundConnectivity } from "./acoustics";
import { distance, type Actor, type Game } from "./model";

export type NpcSpeechDelivery = "calm" | "urgent" | "whisper" | "relieved";

/** Audibility bounds for dialogue opportunities, in world metres. A clear
 * acoustic path is still required; seeing the speaker does not imply hearing. */
export const NPC_SPEECH_HEARING_RANGE = Object.freeze({
  whisper: 4,
  calm: 10,
  relieved: 10,
  urgent: 14,
});

export function npcSpeechHearingRange(delivery: NpcSpeechDelivery = "calm") {
  return NPC_SPEECH_HEARING_RANGE[delivery];
}

export function npcCanHearSpeech(
  g: Game,
  listener: Actor,
  source: Actor,
  delivery: NpcSpeechDelivery = "calm",
) {
  const floor = g.floors[source.floor];
  return (
    !!floor &&
    g.survivors.includes(listener) &&
    g.survivors.includes(source) &&
    listener.alive &&
    source.alive &&
    !listener.escaped &&
    !source.escaped &&
    !listener.stairTravel &&
    !source.stairTravel &&
    listener.floor === source.floor &&
    distance(listener, source) <= npcSpeechHearingRange(delivery) &&
    soundConnectivity(floor)(listener, source)
  );
}
