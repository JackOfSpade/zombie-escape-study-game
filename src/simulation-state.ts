import type { Game } from "./model";

/** Whether the shared world (NPCs, zombies, physics, spawning, surges,
 * helicopters) advances. The human's outcome (`dead`/`escaped`) does not stop
 * the world; an unstarted run or the study workspace does. Pause is handled
 * separately by callers (`g.paused`), so this returns the status gate only. */
export function simulationActive(
  g: Pick<Game, "status" | "studyWorkspace">,
): boolean {
  return (
    !g.studyWorkspace?.enabled &&
    (g.status === "playing" || g.status === "dead" || g.status === "escaped")
  );
}

/** Whether the human may still act (move, interact, receive rewards). */
export function humanActive(g: Pick<Game, "status">): boolean {
  return g.status === "playing";
}

/** Record the moment the human's run ended, once. */
export function markEnded(g: Game) {
  if (g.endedAt === undefined) g.endedAt = g.time;
}
