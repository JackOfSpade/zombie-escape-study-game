import { inspectMergedDocument } from "./roadmap-structure";
import type {
  RoadmapReconciliation,
  RoadmapReconciliationPayload,
} from "./roadmap-adoption-types";

const cells = (row: string) =>
  row
    .split("|")
    .slice(1, -1)
    .map((s) => s.trim());
const journals = (text: string) =>
  text.match(/<!-- ATTEMPT_UPDATE [^\n]* -->/g) ?? [];
function validateAudit(audit: string) {
  try {
    const value = JSON.parse(
      decodeURIComponent(
        audit.slice("<!-- ATTEMPT_UPDATE ".length, -" -->".length),
      ),
    );
    const a = cells(value.previousRow),
      b = cells(value.updatedRow);
    if (
      value.schema !== 1 ||
      !/^[a-f0-9]{64}$/.test(value.localHash) ||
      !/^[a-f0-9]{64}$/.test(value.incomingHash) ||
      typeof value.rationale !== "string" ||
      !value.rationale.trim() ||
      value.rationale.length > 1500 ||
      !/^(PY|PE)_PROGRESS\/0\.5\.1 Attempt status register\/\d+\/S\d{4}-A\d{2,}$/.test(
        value.key,
      ) ||
      a.length !== 6 ||
      b.length !== 6 ||
      a.slice(0, 3).join("|") !== b.slice(0, 3).join("|") ||
      !value.key.endsWith(`/${a[0]}`)
    )
      throw Error();
  } catch {
    throw Error("Malformed portable attempt disposition audit");
  }
}
const state = (s: string) => /^([A-Z-]+)\b/.exec(s)?.[1];
const attemptKey = (track: string, id: string, rows: Map<string, string>) =>
  [...rows.keys()].find(
    (key) =>
      key.startsWith(`${track}_PROGRESS/0.5.1 Attempt status register/`) &&
      key.endsWith(`/${id}`),
  );

/** Add deterministic, portable history before presenting a native proposal.
 * The provider selects the incoming disposition; it cannot rewrite issuance or
 * original observations. Encoding keeps arbitrary source text inert in HTML.
 * This is history retention, never a new human observation or visit. */
export function normalizeAttemptUpdates(
  payload: RoadmapReconciliationPayload,
  proposal: RoadmapReconciliation,
) {
  if (!proposal || !Array.isArray(proposal.attemptUpdates ?? []))
    throw Error("Invalid reviewed attempt updates");
  proposal = structuredClone(proposal);
  if ((proposal.attemptUpdates?.length ?? 0) > 500)
    throw Error("Too many reviewed attempt updates");
  const local = inspectMergedDocument(payload.local),
    incoming = inspectMergedDocument(payload.candidate),
    merged = inspectMergedDocument(proposal.canonical);
  const updated = new Set<string>(),
    expected: string[] = [];
  let canonical = proposal.canonical;
  for (const update of proposal.attemptUpdates ?? []) {
    if (
      !update ||
      !["PY", "PE"].includes(update.track) ||
      !/^S\d{4}-A\d{2,}$/.test(update.attemptId) ||
      typeof update.rationale !== "string" ||
      !update.rationale.trim() ||
      update.rationale.length > 1500
    )
      throw Error("Invalid reviewed attempt update identity or rationale");
    const key = attemptKey(update.track, update.attemptId, local.rows);
    const incomingKey = attemptKey(
      update.track,
      update.attemptId,
      incoming.rows,
    );
    if (!key || key !== incomingKey || updated.has(key))
      throw Error(
        "Attempt update needs a unique same-track issued source task",
      );
    const before = local.rows.get(key)!,
      after = incoming.rows.get(key)!;
    if (before === after || merged.rows.get(key) !== after)
      throw Error(
        "Attempt update must select the exact changed incoming disposition",
      );
    const a = cells(before),
      b = cells(after);
    if (
      a.length !== 6 ||
      b.length !== 6 ||
      a.slice(0, 3).join("|") !== b.slice(0, 3).join("|")
    )
      throw Error(
        "Attempt update cannot rewrite the issued task identity, date or scope",
      );
    if (
      ![
        "PENDING",
        "PARTIAL",
        "IN-PROGRESS",
        "INTERRUPTED",
        "SUSPENDED",
      ].includes(state(a[3]) ?? "") ||
      ![
        "PARTIAL",
        "COMPLETED",
        "SERVED",
        "DECLINED",
        "SUPERSEDED",
        "INVALIDATED",
      ].includes(state(b[3]) ?? "")
    )
      throw Error(
        "Unsupported attempt disposition transition; terminal history requires an explicit correction workflow",
      );
    const newObservations = [...incoming.rows].filter(
      ([key, row]) =>
        key.startsWith(
          `${update.track}_PROGRESS/0.5 Assessment evidence register/`,
        ) &&
        cells(row)[1] === update.attemptId &&
        local.rows.get(key) !== row,
    );
    if (
      ["PARTIAL", "COMPLETED", "SERVED"].includes(state(b[3])!) &&
      !newObservations.length
    )
      throw Error(
        "A continued assessment disposition needs a new source observation, not reviewer prose alone",
      );
    if (update.resolveCurrent) {
      const captured = payload.context.activeAttempts?.find(
        (a) => a.attemptId === update.attemptId,
      );
      if (
        !captured ||
        ![
          "COMPLETED",
          "SERVED",
          "DECLINED",
          "SUPERSEDED",
          "INVALIDATED",
        ].includes(state(b[3])!) ||
        captured.encounter !== update.resolveCurrent.encounter ||
        captured.workHash !== update.resolveCurrent.workHash ||
        !/^[a-f0-9]{64}$/.test(update.resolveCurrent.workHash)
      )
        throw Error(
          "Current attempt resolution needs the exact captured work and a terminal source disposition",
        );
      if (
        update.resolveCurrent.humanCutoff !== undefined &&
        update.resolveCurrent.humanCutoff !== captured.humanCutoff
      )
        throw Error(
          "Current attempt resolution changed the captured human work cutoff",
        );
      update.resolveCurrent.humanCutoff = captured.humanCutoff;
      const assessed = [
        ...new Set(
          [...merged.rows]
            .filter(
              ([key, row]) =>
                key.startsWith(
                  `${update.track}_PROGRESS/0.5 Assessment evidence register/`,
                ) &&
                cells(row)[1] === update.attemptId &&
                (a[2].match(/\b[TXI]\d{2}(?:\.\d+)?\b/g) ?? []).some((id) =>
                  (
                    (cells(row)[3].match(/\b[TXI]\d{2}(?:\.\d+)?\b/g) ??
                      []) as string[]
                  ).includes(id),
                ) &&
                cells(row)[5].startsWith("GAME_AI_ASSESSED_"),
            )
            .flatMap(([, row]) =>
              (
                /artifact references ([\d, ]+);/
                  .exec(cells(row)[8])?.[1]
                  .split(",")
                  .map((s) => Number(s.trim())) ?? []
              ).filter((seq) => captured.humanSequences.includes(seq)),
            ),
        ),
      ].sort((a, b) => a - b);
      if (
        update.resolveCurrent.assessedHumanSequences !== undefined &&
        JSON.stringify(update.resolveCurrent.assessedHumanSequences) !==
          JSON.stringify(assessed)
      )
        throw Error(
          "Current attempt resolution changed the source-backed assessed artifact references",
        );
      update.resolveCurrent.assessedHumanSequences = assessed;
    }
    if (state(b[3]) === "SUPERSEDED") {
      const replacement = (b[5].match(/S\d{4}-A\d{2,}/g) ?? []).find((id) => {
        const nextKey = attemptKey(update.track, id, incoming.rows);
        return id !== update.attemptId && nextKey && !local.rows.has(nextKey);
      });
      if (!replacement)
        throw Error(
          "Supersession needs an actually issued replacement in the incoming source",
        );
    }
    const audit = `<!-- ATTEMPT_UPDATE ${encodeURIComponent(JSON.stringify({ schema: 1, key, localHash: payload.localHash, incomingHash: payload.candidateHash, previousRow: before, updatedRow: after, rationale: update.rationale, resolveCurrent: update.resolveCurrent }))} -->`;
    expected.push(audit);
    if (!canonical.includes(audit)) {
      const marker = `<!-- END ${update.track}_PROGRESS -->`;
      canonical = canonical.replace(marker, `${audit}\n${marker}`);
    }
    updated.add(key);
  }
  // Audit comments survive subsequent exports and cannot be silently rewritten.
  const previous = new Set([
    ...journals(payload.local),
    ...journals(payload.candidate),
  ]);
  for (const audit of previous) validateAudit(audit);
  for (const audit of previous)
    if (!canonical.includes(audit))
      throw Error("Reconciliation lost an earlier attempt disposition audit");
  const current = journals(canonical);
  if (new Set(current).size !== current.length)
    throw Error("Duplicate portable attempt disposition audit");
  for (const audit of current)
    if (!previous.has(audit) && !expected.includes(audit))
      throw Error(
        "Reconciliation contains an unsupported attempt disposition audit",
      );
  return { proposal: { ...proposal, canonical }, updated };
}
