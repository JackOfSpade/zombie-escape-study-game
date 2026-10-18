import { canReachStation, human } from "./engine";
import type { Encounter, Game } from "./model";
export function humanUsingWorkspace(g: Game, e: Encounter) {
  const a = human(g),
    s = g.floors[a.floor].stations.find(
      (s) => s.id === a.station && s.encounter === e.id,
    );
  return a.floor === e.floor && !!s && canReachStation(g, a, s, 2.2);
}
export function npcAtWorkstation(g: Game, e: Encounter, id: string) {
  const a = g.survivors.find((a) => a.id === id),
    s = g.floors[e.floor].stations.find(
      (s) => s.id === a?.station && s.encounter === e.id,
    );
  return (
    g.encounters[e.id] === e &&
    e.runId === g.id &&
    g.status === "playing" &&
    e.mode === "shared" &&
    e.state !== "consumed" &&
    !!e.problem &&
    !!a &&
    a.id !== "human" &&
    a.alive &&
    !a.escaped &&
    a.floor === e.floor &&
    a.intent === e.id &&
    a.activity === "studying" &&
    !!s &&
    canReachStation(g, a, s)
  );
}
