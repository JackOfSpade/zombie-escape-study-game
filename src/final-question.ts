import type { Encounter, Game } from "./model";
import { terminalChannel } from "./terminal-view";

/** The human's last opened tutor question, when it was presented but not yet
 * completed; it stays answerable after the run ends (no world reward). */
export function unfinishedLastQuestion(
  g: Game,
  id: string | undefined,
): Encounter | undefined {
  const e = id === undefined ? undefined : g.encounters[id];
  if (!e || terminalChannel(e) !== "tutor" || e.state === "consumed") return;
  const presented =
    e.problemPresentedSequence !== undefined ||
    (!!e.problem &&
      (e.tutor.some((m) => m.author === "human") ||
        e.history.some((h) => h.author === "human")));
  return presented ? e : undefined;
}
