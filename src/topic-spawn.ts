import { eligible } from "./curriculum";
import { practiceContract } from "./learner";
import type { Contract, Roadmap, StudyState, Track } from "./model";

/**
 * Which topic a terminal spawns.
 *
 * The curriculum scheduler still names exactly one formal visit (the head of
 * the track's topic queue, or a due review). Left alone, every terminal in a
 * run spawns that same topic, so the player walks one branch for a whole run
 * and never gets to test recall of the others. This policy keeps the formal
 * visit reachable but gives the other terminals variety inside the same tier:
 * a topic is not spawned again while it is within the cooldown window when an
 * alternative exists, topics with open recorded gaps come back first once they
 * have cooled (spaced recall), and the player can disable topics. Variety
 * terminals carry a practice contract: they probe and record knowledge like
 * any terminal but never become the formal academic visit.
 */
export interface TopicSpawn {
  /** `${track}:${topic}` entries the player switched off for variety spawns. */
  disabled: string[];
  /** Newest last; bounded. `at` is simulation time of the run that spawned it. */
  recent: { track: Track; topic: string; encounter: string; at: number }[];
}
/** A topic is not spawned again while it is among the last N spawns on its track. */
export const SPAWN_COOLDOWN = 2;
const RECENT_LIMIT = 60;

export const topicOf = (objectiveId: string) =>
  objectiveId.split(":")[1]?.split(".")[0] ?? "";
export const topicKey = (track: Track, topic: string) => `${track}:${topic}`;

export function spawnState(s: StudyState): TopicSpawn {
  return (s.topicSpawn ??= { disabled: [], recent: [] });
}
export function setTopicEnabled(
  s: StudyState,
  track: Track,
  topic: string,
  enabled: boolean,
) {
  const state = spawnState(s);
  const key = topicKey(track, topic);
  state.disabled = state.disabled.filter((k) => k !== key);
  if (!enabled) state.disabled.push(key);
}
export const topicEnabled = (s: StudyState, track: Track, topic: string) =>
  !spawnState(s).disabled.includes(topicKey(track, topic));

/** Topics on the track with unfinished objectives at the current tier, in curriculum order. */
export function spawnCandidates(
  r: Roadmap,
  s: StudyState,
  track: Track,
): string[] {
  const t = r.tracks[track];
  const live = s.profile === "live" && s.learner;
  const tier = live ? s.learner!.tracks[track].tier : 1;
  const order = [
    ...(live ? s.learner!.tracks[track].queue : s.queues[track]),
    ...t.rotation,
    ...Object.keys(t.topics),
  ];
  const unfinished = (topic: string) =>
    t.objectives.some(
      (o) =>
        topicOf(o.id) === topic &&
        (live
          ? o.target >= tier && s.learner!.cells[o.id]?.states[tier - 1] !== "P"
          : o.cells[0] !== "P"),
    );
  const seen = new Set<string>();
  const out: string[] = [];
  for (const topic of order) {
    if (!topic || seen.has(topic)) continue;
    seen.add(topic);
    if (unfinished(topic)) out.push(topic);
  }
  return out;
}

function recentOnTrack(s: StudyState, track: Track) {
  return spawnState(s)
    .recent.filter((x) => x.track === track)
    .map((x) => x.topic);
}
const onCooldown = (recent: string[], topic: string) =>
  recent.slice(-SPAWN_COOLDOWN).includes(topic);

/** The topic the next terminal on this track should spawn, and whether it is practice. */
export function pickSpawnTopic(
  r: Roadmap,
  s: StudyState,
  formal: Contract,
): { topic: string; practice: boolean } {
  const track = formal.track;
  const formalTopic = topicOf(formal.objectiveIds[0] ?? "");
  const recent = recentOnTrack(s, track);
  // The formal visit (a due review included) spawns whenever it has cooled;
  // a visit bound elsewhere is unaffected, since binding is per terminal.
  if (!onCooldown(recent, formalTopic))
    return { topic: formalTopic, practice: false };
  const gapTopics = new Set(
    (s.knowledgeGaps ?? [])
      .filter((g) => g.track === track && !g.resolved)
      .flatMap((g) => g.objectiveIds.map(topicOf)),
  );
  const lastIndex = (topic: string) => recent.lastIndexOf(topic);
  const candidates = spawnCandidates(r, s, track).filter(
    (topic) =>
      topic !== formalTopic &&
      topicEnabled(s, track, topic) &&
      !onCooldown(recent, topic),
  );
  if (!candidates.length) return { topic: formalTopic, practice: false };
  // Recall first: a cooled topic with an open gap, least recently spawned.
  // Then breadth: the least recently spawned topic in curriculum order.
  const ranked = [...candidates].sort((a, b) => {
    const gap = Number(gapTopics.has(b)) - Number(gapTopics.has(a));
    if (gap) return gap;
    return lastIndex(a) - lastIndex(b);
  });
  return { topic: ranked[0], practice: true };
}

/** The contract a terminal spawns: the formal visit, or a practice contract for a variety topic. */
export function spawnContract(
  r: Roadmap,
  s: StudyState,
  formal = eligible(r, s),
): Contract {
  const pick = pickSpawnTopic(r, s, formal);
  if (!pick.practice) return formal;
  const practice =
    s.profile === "live" && s.learner
      ? practiceContract(r, s.learner, formal.track, pick.topic)
      : devPracticeContract(
          r,
          s,
          formal.track,
          pick.topic,
          formalTopicOf(formal),
        );
  return practice ?? formal;
}

const formalTopicOf = (formal: Contract) =>
  topicOf(formal.objectiveIds[0] ?? "");
function devPracticeContract(
  r: Roadmap,
  s: StudyState,
  track: Track,
  topic: string,
  formalTopic: string,
): Contract | undefined {
  const objective = r.tracks[track].objectives.find(
    (o) => topicOf(o.id) === topic && o.cells[0] !== "P",
  );
  if (!objective) return undefined;
  return {
    id: `practice-${s.version}-${track}-${objective.id}`,
    track,
    objectiveIds: [objective.id],
    scopes: [objective.scope],
    depth: 1,
    phase: s.phases[track],
    review: false,
    ledgerVersion: s.version,
    priorEvidence: [objective.refs],
    practice: true,
    scheduleNote: `Variety practice on ${topic}; the formal visit remains ${formalTopic}.`,
  };
}

export function recordSpawn(
  s: StudyState,
  contract: Contract,
  encounter: string,
  at: number,
) {
  const state = spawnState(s);
  const topic = topicOf(contract.objectiveIds[0] ?? "");
  if (!topic) return;
  state.recent.push({ track: contract.track, topic, encounter, at });
  if (state.recent.length > RECENT_LIMIT)
    state.recent.splice(0, state.recent.length - RECENT_LIMIT);
}
