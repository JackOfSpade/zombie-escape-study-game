import { isRecord } from "./records";
import type { Game } from "./model";
export const LOG_KEY = "recent-game-diagnostics-v1";
export const LOG_LIMITS = { games: 3, entries: 400, bytesPerGame: 256_000 };
interface Entry {
  at: number;
  type: string;
  data: unknown;
}
interface RunLog {
  id: string;
  seed: number;
  started: string;
  entries: Entry[];
  summary?: {
    duration: number;
    outcome: string;
    deaths: number;
    rescued: number;
    breaches: number;
    snapshots: number;
    peakZombies: number;
  };
}
interface LogStorage {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
}
/**
 * Per-run serialization cache. Each retained entry is serialized exactly once
 * when recorded (or restored), so retention and writes never re-stringify the
 * whole run. `entries` tracks the array identity the cache describes.
 */
interface RunCache {
  entries: Entry[];
  json: string[];
  bytes: number[];
  sum: number;
  id: string;
  seed: number;
  started: string;
  prefix: string;
  prefixBytes: number;
}
/** Operation counters used by regression tests and the benchmark. */
export interface RunLogStats {
  /** Individual entries serialized (record/restore), never whole runs. */
  entrySerializations: number;
  /** Full `{version, runs}` documents built; one per executed write. */
  documentSerializations: number;
}
/**
 * UTF-8 byte length of a string, identical to TextEncoder (lone surrogates
 * count as the 3-byte replacement character) without allocating a buffer.
 */
export function utf8Length(s: string) {
  let bytes = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) bytes += 1;
    else if (c < 0x800) bytes += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
      const d = s.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) {
        bytes += 4;
        i++;
      } else bytes += 3;
    } else bytes += 3;
  }
  return bytes;
}
/** Diagnostics have their own retention policy; pruning never touches learning saves. */
export class RunLogs {
  runs: RunLog[] = [];
  error = "";
  readonly stats: RunLogStats = {
    entrySerializations: 0,
    documentSerializations: 0,
  };
  private queue = Promise.resolve();
  private dirty = false;
  private caches = new WeakMap<RunLog, RunCache>();
  private observed = new Map<string, { seq: number; time: number }>();
  constructor(private storage: LogStorage) {}
  async load() {
    try {
      const raw = await this.storage.read();
      if (raw) {
        const data: unknown = JSON.parse(raw);
        if (isRecord(data) && data.version === 1 && Array.isArray(data.runs)) {
          const retained = new Map<string, RunLog>();
          for (const value of data.runs) {
            const run = restoredRun(value);
            if (!run) continue;
            retained.delete(run.id);
            retained.set(run.id, run);
          }
          this.runs = [...retained.values()].slice(-LOG_LIMITS.games);
        }
      }
      for (const run of this.runs) this.trim(run);
    } catch {
      this.error = "Could not read previous game logs.";
    }
  }
  private cache(run: RunLog): RunCache {
    let c = this.caches.get(run);
    if (
      !c ||
      c.entries !== run.entries ||
      c.json.length !== run.entries.length
    ) {
      const json = run.entries.map((e) => {
        this.stats.entrySerializations++;
        return JSON.stringify(e);
      });
      const bytes = json.map(utf8Length);
      c = {
        entries: run.entries,
        json,
        bytes,
        sum: bytes.reduce((a, b) => a + b, 0),
        id: "",
        seed: NaN,
        started: "",
        prefix: "",
        prefixBytes: -1,
      };
      this.caches.set(run, c);
    }
    if (
      c.prefixBytes < 0 ||
      c.id !== run.id ||
      !Object.is(c.seed, run.seed) ||
      c.started !== run.started
    ) {
      c.id = run.id;
      c.seed = run.seed;
      c.started = run.started;
      c.prefix = `{"id":${JSON.stringify(run.id)},"seed":${JSON.stringify(run.seed)},"started":${JSON.stringify(run.started)},"entries":[`;
      c.prefixBytes = utf8Length(c.prefix);
    }
    return c;
  }
  private suffix(run: RunLog) {
    return run.summary === undefined
      ? "]}"
      : `],"summary":${JSON.stringify(run.summary)}}`;
  }
  private drop(run: RunLog, c: RunCache, count: number) {
    if (count <= 0) return;
    run.entries.splice(0, count);
    c.json.splice(0, count);
    for (const b of c.bytes.splice(0, count)) c.sum -= b;
  }
  /**
   * Retains exactly the newest contiguous tail that the previous whole-run
   * stringify policy kept: count cap first, then UTF-8 byte cap of the run
   * document (an oversized newest entry clears the tail).
   */
  private trim(run: RunLog) {
    const c = this.cache(run);
    if (run.entries.length > LOG_LIMITS.entries)
      this.drop(run, c, run.entries.length - LOG_LIMITS.entries);
    // Header equals JSON.stringify({ ...run, entries: [] }) byte-for-byte.
    const header = c.prefixBytes + utf8Length(this.suffix(run));
    const n = run.entries.length;
    if (header + c.sum + Math.max(0, n - 1) <= LOG_LIMITS.bytesPerGame) return;
    let bytes = header;
    let keep = 0;
    for (let i = n - 1; i >= 0; i--) {
      const size = c.bytes[i] + (keep ? 1 : 0);
      if (bytes + size > LOG_LIMITS.bytesPerGame) break;
      bytes += size;
      keep++;
    }
    this.drop(run, c, n - keep);
  }
  private serializeRun(run: RunLog) {
    const c = this.cache(run);
    return c.prefix + c.json.join(",") + this.suffix(run);
  }
  /** Byte-identical to JSON.stringify({ version: 1, runs: this.runs }). */
  private serialize() {
    this.stats.documentSerializations++;
    return `{"version":1,"runs":[${this.runs.map((r) => this.serializeRun(r)).join(",")}]}`;
  }

  record(g: Game, type: string, data: unknown = null) {
    const at = Math.round(g.time * 100) / 100;
    // Serialize once and keep a detached copy: retained diagnostics cannot
    // drift with later mutation of live physics/path objects, so byte
    // accounting always matches what is written.
    const json = JSON.stringify({ at, type, data });
    this.stats.entrySerializations++;
    const entry = JSON.parse(json) as Entry;
    let run = this.runs.find((r) => r.id === g.id);
    if (!run) {
      run = {
        id: g.id,
        seed: g.seed,
        started: new Date().toISOString(),
        entries: [],
      };
      this.runs.push(run);
      this.runs = this.runs.slice(-LOG_LIMITS.games);
      for (const id of this.observed.keys())
        if (!this.runs.some((r) => r.id === id)) this.observed.delete(id);
    }
    run.summary = {
      duration: Math.max(
        run.summary?.duration ?? 0,
        Math.round(g.time * 100) / 100,
      ),
      outcome: type === "restart" ? "restarted" : g.status,
      deaths: g.stats.deaths,
      rescued: g.stats.rescued,
      breaches: g.stats.breaches,
      snapshots: run.summary?.snapshots ?? 0,
      peakZombies: Math.max(
        run.summary?.peakZombies ?? 0,
        g.zombies.filter((z) => z.hp > 0).length,
      ),
    };
    if (type === "snapshot") run.summary.snapshots++;
    const c = this.cache(run);
    run.entries.push(entry);
    c.json.push(json);
    const bytes = utf8Length(json);
    c.bytes.push(bytes);
    c.sum += bytes;
    this.trim(run);
  }
  capture(g: Game, force = false) {
    if (g.status === "ready") return;
    const previous = this.observed.get(g.id);
    if (
      !force &&
      g.status === "playing" &&
      previous &&
      g.time - previous.time < 2 &&
      previous.time <= g.time
    )
      return;
    for (const e of g.events.filter((e) => e.seq > (previous?.seq ?? 0)))
      this.record(g, "world", {
        seq: e.seq,
        type: e.type,
        actor: e.actor,
        floor: e.floor,
      });
    const round = (n: number) => Math.round(n * 100) / 100;
    this.record(g, "snapshot", {
      status: g.status,
      paused: !!g.paused,
      actors: g.survivors.map((a) => ({
        id: a.id,
        floor: a.floor,
        x: round(a.x),
        y: round(a.y),
        hp: round(a.hp),
        alive: a.alive,
        escaped: a.escaped,
        activity: a.activity,
        keys: a.keys,
        studyLoop: a.studyLoop && {
          phase: a.studyLoop.phase,
          station: a.studyLoop.station,
          target: a.studyLoop.waypoints[0],
          window: round(a.studyLoop.window),
        },
        handling: a.handling,
        physics: a.physics,
        blocked: a.blockedTime,
        doorway: a.doorTraffic && {
          id: a.doorTraffic.door,
          lane: a.doorTraffic.lane,
          side: a.doorTraffic.side,
        },
        traffic: a.trafficPass && {
          side: a.trafficPass.side,
          remaining: round(Math.max(0, a.trafficPass.until - g.time)),
        },
        path: a.path.slice(0, 2),
        plan: a.defensePlan && {
          object: a.defensePlan.object,
          idle: a.defensePlan.idle,
          target: a.defensePlan.target,
        },
      })),
      furniture: g.floors.flatMap((f) =>
        f.furniture
          .filter(
            (o) =>
              o.moved > 0 ||
              o.hp < o.maxHp ||
              o.door ||
              o.field ||
              o.id === "main-gate",
          )
          .map((o) => ({
            id: o.id,
            kind: o.kind,
            turning: o.turning,
            x: round(o.x),
            y: round(o.y),
            w: o.w,
            h: o.h,
            angle: round(o.angle ?? 0),
            physics: o.physics,
            door: o.door && { latched: o.door.latched, side: o.door.side },
            field: o.field && {
              used: o.field.used,
              limit: o.field.limit,
              authorized: [...o.field.authorized],
              crossing: [...o.field.crossing],
            },
            hp: round(o.hp),
            destroyed: o.destroyed,
          })),
      ),
      zombies: g.zombies
        .filter((z) => z.hp > 0)
        .slice(-80)
        .map((z) => ({
          floor: z.floor,
          x: round(z.x),
          y: round(z.y),
          hp: round(z.hp),
        })),
    });
    this.observed.set(g.id, { seq: g.seq, time: g.time });
    this.flush();
  }
  export() {
    return JSON.stringify(
      { version: 1, limits: LOG_LIMITS, runs: this.runs },
      null,
      2,
    );
  }
  flush() {
    // Serialize writes; a slower older write cannot overwrite a newer
    // checkpoint. The document is built only when a write actually executes,
    // so superseded flushes during a slow write cost nothing.
    this.dirty = true;
    this.queue = this.queue.then(async () => {
      if (!this.dirty) return;
      this.dirty = false;
      try {
        await this.storage.write(this.serialize());
        this.error = "";
      } catch {
        this.error =
          "Game logs could not be saved. Download them before closing.";
      }
    });
    return this.queue;
  }
}

function restoredRun(value: unknown): RunLog | undefined {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !value.id ||
    value.id.length > 128 ||
    typeof value.started !== "string" ||
    value.started.length > 64 ||
    typeof value.seed !== "number" ||
    !Number.isFinite(value.seed) ||
    !Array.isArray(value.entries)
  )
    return;
  const entries: Entry[] = [];
  for (const e of value.entries.slice(-LOG_LIMITS.entries))
    if (
      isRecord(e) &&
      typeof e.at === "number" &&
      Number.isFinite(e.at) &&
      typeof e.type === "string" &&
      e.type.length <= 128
    )
      entries.push({ at: e.at, type: e.type, data: e.data ?? null });
  const run: RunLog = {
    id: value.id,
    seed: value.seed,
    started: value.started,
    entries,
  };
  const summary = value.summary;
  if (
    isRecord(summary) &&
    typeof summary.outcome === "string" &&
    summary.outcome.length <= 32
  ) {
    const counts = [
      "duration",
      "deaths",
      "rescued",
      "breaches",
      "snapshots",
      "peakZombies",
    ] as const;
    if (
      counts.every(
        (k) =>
          typeof summary[k] === "number" &&
          Number.isFinite(summary[k]) &&
          (summary[k] as number) >= 0,
      )
    )
      run.summary = {
        duration: summary.duration as number,
        outcome: summary.outcome,
        deaths: summary.deaths as number,
        rescued: summary.rescued as number,
        breaches: summary.breaches as number,
        snapshots: summary.snapshots as number,
        peakZombies: summary.peakZombies as number,
      };
  }
  return run;
}
