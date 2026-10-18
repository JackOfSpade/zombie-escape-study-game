import { canReachStation, human } from "./engine";
import { event, type Game } from "./model";
/** Record provided source material for retained human questions, never a visit.
 * This private review material is excluded from NPC/public snapshots. */
export function presentRoadmapReview(g: Game, id: string, text: string) {
  const h = human(g),
    s = g.floors[h.floor].stations.find((s) => s.id === h.station),
    attached =
      s && canReachStation(g, h, s, 2.2)
        ? g.encounters[s.encounter]
        : undefined;
  const retained = new Set(
    [attached, ...Object.values(g.encounters)].filter(
      (e) =>
        e?.problem &&
        e.state !== "consumed" &&
        (e === attached || e.problemPresentedSequence !== undefined),
    ),
  );
  for (const e of retained) {
    if (
      !e ||
      e.history.some((a) => a.kind === "source-view" && a.refs?.includes(id))
    )
      continue;
    const ev = event(
      g,
      "source-presented",
      "Roadmap review material was provided while this question was retained.",
      e.floor,
      "roadmap",
      e.id,
    );
    e.history.push({
      seq: ev.seq,
      author: "roadmap",
      kind: "source-view",
      text,
      at: g.time,
      wallTime: new Date().toISOString(),
      revision: e.revision,
      refs: [id],
      presented: ev.seq,
    });
  }
}
