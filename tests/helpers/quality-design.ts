import { qualitySurfaceGroups } from "../../src/run-quality-contract.mjs";

/** Synthetic editorial decisions for deterministic transport/UI regressions.
 * These fixtures do not claim to measure a live model's creative quality. */
export function qualityFixtureReply(
  request: any,
  proposed: any,
  fixtures: any[],
) {
  const requestId = request.requestId;
  if (request.phase === "concepts")
    return {
      requestId,
      concepts: [
        {
          id: "selected-setting",
          title: proposed.title,
          premise: proposed.premise,
          spatialIdentity:
            "Connected civic workrooms surround a sheltered arrival court.",
          castTension:
            "Former colleagues disagree about preserving their unfinished records.",
          visualLanguage:
            "Handwritten coastal observations share worn brass fixtures.",
          everydayLife:
            "Lunch exchanges and small workplace collections reveal old routines.",
          escapeMood:
            "A measured retreat through places the survivors once maintained.",
          novelty:
            "Tie distinct room occupations and personal keepsakes to the chosen cast.",
        },
        {
          id: "festival-warehouse",
          title: "The Unfinished Lantern Festival",
          premise:
            "A festival workshop shelters stagehands among unfinished parade scenery.",
          spatialIdentity:
            "Long storage bands alternate with narrow preparation rooms.",
          castTension:
            "A lighting crew tries to reunite with the volunteers they left behind.",
          visualLanguage:
            "Painted paper lanterns contrast with dark steel workbenches.",
          everydayLife:
            "Repair tickets, costume measurements and snack rosters survive.",
          escapeMood:
            "Bright abandoned celebrations accompany an increasingly hurried retreat.",
          novelty:
            "Practical theatre craft and volunteer relationships drive the setting.",
        },
        {
          id: "ceramics-exchange",
          title: "The Last Kiln Ledger",
          premise:
            "A ceramics cooperative becomes a refuge during its annual inventory.",
          spatialIdentity:
            "Stepped galleries connect small offices around a shared packing hall.",
          castTension:
            "A mentor and apprentice dispute which collections should be saved.",
          visualLanguage:
            "Glaze swatches and clay-colored ledgers sit among pale shelves.",
          everydayLife:
            "Order corrections and birthday gifts show quiet years of shared work.",
          escapeMood:
            "Fragile personal mementos punctuate a tense, deliberate climb.",
          novelty:
            "Trade records and handmade gifts distinguish this ensemble and atmosphere.",
        },
      ],
    };
  if (request.phase === "selection")
    return {
      requestId,
      selectedId: request.concepts[0].id,
      rationale:
        "The selected setting connects physical workplaces, occupant relationships and varied everyday artifacts into a coherent run; the alternatives establish different spatial and visual directions.",
    };
  if (request.phase === "structure") {
    const selected = request.repair
      ? proposed
      : (fixtures.find((f) => f.title === request.concept.title) ?? proposed);
    const { environment: _environment, ...structure } = selected;
    return { requestId, structure };
  }
  if (
    request.phase === "structure-review" ||
    request.phase === "content-review"
  )
    return { requestId, findings: [] };
  const design = fixtures.find((f) => f.title === request.structure.title);
  if (!design) throw Error("No synthetic fixture for the captured structure");
  if (request.phase === "content-plan")
    return {
      requestId,
      plan: {
        rooms: qualitySurfaceGroups(request.surfaces).map((g: any) => ({
          id: g.id,
          story: `The ${g.id} area preserves evidence of its former occupants.`,
          ordinaryLife:
            "Routine schedules, small personal collections and unfinished work coexist.",
          occupantEvidence:
            "Use the supplied owners and relationships to connect nearby objects.",
          artDirection:
            "Choose recognizable subjects with varied silhouettes and compositions.",
        })),
        fragments: design.environment.fragments,
      },
    };
  if (request.phase === "content-batch")
    return {
      requestId,
      entries: request.targets.map((id: string) =>
        design.environment.entries.find((e: any) => e.surfaceId === id),
      ),
    };
  if (request.phase === "content-revision") {
    const ids = request.findings
      .filter((f: any) => f.target.startsWith("surface:"))
      .map((f: any) => f.target.slice("surface:".length));
    return {
      requestId,
      entries: request.content.entries.filter((e: any) =>
        ids.includes(e.surfaceId),
      ),
    };
  }
  throw Error(`No synthetic response for ${request.phase}`);
}
