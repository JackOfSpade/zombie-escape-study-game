import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { decode, encode } from "../src/persistence";
import { step } from "../src/engine";
import { TestRunner } from "../src/gametest/runner";
import { emptyScenario } from "../src/gametest/schema";
import { pursuitLayoutErrors } from "../src/pursuit-layout";
import { redesign } from "../src/force-fields";
import { survivorPath } from "../src/navigation";
import { createGame, createPlayableGame } from "../src/world";
import { type Floor, type Point, type Roadmap, W, H } from "../src/model";
const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
function reachable(
  f: Floor,
  start: Point,
  end: Point,
  blocked: (x: number, y: number) => boolean,
) {
  const key = (x: number, y: number) => y * W + x,
    target = key(Math.floor(end.x), Math.floor(end.y)),
    queue = [key(Math.floor(start.x), Math.floor(start.y))],
    seen = new Set(queue);
  for (let i = 0; i < queue.length; i++) {
    const n = queue[i];
    if (n === target) return true;
    const x = n % W,
      y = Math.floor(n / W);
    for (const [xx, yy] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]) {
      const k = key(xx, yy);
      if (
        xx < 0 ||
        xx >= W ||
        yy < 0 ||
        yy >= H ||
        f.tiles[yy][xx] ||
        blocked(xx, yy) ||
        seen.has(k)
      )
        continue;
      seen.add(k);
      queue.push(k);
    }
  }
  return false;
}
test("no main-door-to-stairs bypass around the first occupied study hall", () => {
  for (const seed of [2219683494, 42, 3245246807]) {
    const g = createPlayableGame(seed, roadmap);
    for (const f of g.floors.slice(0, 4)) {
      const stages = (
        f.generation as
          | { stages?: { room: number; front: number; rear: number }[] }
          | undefined
      )?.stages;
      const stage = stages?.find((s) => s.room === 2);
      const left = f.boundary
          ? Math.min(
              ...f.boundary.rows
                .filter((r) => r.left < r.right)
                .map((r) => r.left),
            )
          : 2,
        right = stage
          ? f.boundary
            ? Math.max(...f.boundary.rows.map((r) => r.right)) - 1
            : 41
          : 16,
        top = stage ? stage.front + 1 : (f.generation?.lowerDivider ?? 16) + 1,
        bottom = stage ? stage.rear - 1 : 27;
      assert.equal(
        reachable(
          f,
          f.entry,
          f.stairs,
          (x, y) => x >= left && x <= right && y >= top && y <= bottom,
        ),
        false,
        `seed ${seed} floor ${f.index}: swarm has a hallway around the study hall`,
      );
    }
  }
});

test("every study boundary spans the floor with all gaps covered by distinct force fields", () => {
  const orders = new Set<string>();
  for (let seed = 0; seed < 64; seed++)
    for (const f of createPlayableGame(seed, roadmap).floors.slice(0, 4)) {
      const stages = f.generation!.stages!;
      assert.equal(f.generation!.version, 4);
      assert.equal(stages[0].room, 2, "the free study hall is first");
      assert.deepEqual(
        stages
          .slice(1)
          .map((s) => s.room)
          .sort(),
        [0, 1, 3],
      );
      orders.add(stages.map((s) => s.room).join(","));
      for (const row of [stages[0].rear, ...stages.map((s) => s.front)]) {
        const fields = f.furniture.filter(
          (o) => o.field && Math.floor(o.y) === row,
        );
        // One opening per wall: a red field has no neighbour to walk around to.
        assert.equal(
          fields.length,
          1,
          `seed ${seed} floor ${f.index}: ${fields.length} openings in wall ${row}`,
        );
        assert.equal(
          fields[0].id,
          row === stages[0].rear
            ? `f${f.index}-room2-door`
            : `f${f.index}-room${stages.find((s) => s.front === row)!.room}-forward`,
        );
        let gaps = 0;
        const boundary = f.boundary!.rows[row];
        for (let x = boundary.left; x < boundary.right; x++)
          if (!f.tiles[row][x]) gaps++;
        assert.equal(gaps, 3, `seed ${seed} floor ${f.index}: wall ${row}`);
        for (let x = boundary.left; x < boundary.right; x++)
          if (!f.tiles[row][x]) {
            const covering = fields.filter(
              (o) => x + 0.5 > o.x - o.w / 2 && x + 0.5 < o.x + o.w / 2,
            );
            assert.equal(
              covering.length,
              1,
              `seed ${seed} floor ${f.index}: uncovered or stacked field at ${x},${row}`,
            );
          }
        assert.equal(
          reachable(
            f,
            f.entry,
            f.stairs,
            (x, y) =>
              y === row &&
              fields.some(
                (o) => x + 0.5 > o.x - o.w / 2 && x + 0.5 < o.x + o.w / 2,
              ),
          ),
          false,
          `seed ${seed} floor ${f.index}: bypass at ${row}`,
        );
      }
    }
  assert.equal(
    orders.size,
    6,
    "all orders of the later rooms occur across seeds",
  );
});

test("completed zero-key solvers can reach stairs from every room with all entrance quotas exhausted", () => {
  for (let seed = 0; seed < 32; seed++) {
    const g = createPlayableGame(seed, roadmap),
      a = g.survivors[0];
    for (const f of g.floors.slice(0, 4)) {
      a.floor = f.index;
      a.keys = 0;
      a.access = [f.index];
      for (const o of f.furniture)
        if (o.field?.limit !== undefined) o.field.used = o.field.limit;
      for (const stage of f.generation!.stages!) {
        const s = f.stations.find(
          (s) =>
            g.encounters[s.encounter].questionRoom ===
            `f${f.index}-room${stage.room}`,
        )!;
        Object.assign(a, { x: s.x, y: s.y });
        const path = survivorPath(f, a, f.stairs);
        assert.ok(
          path.length,
          `seed ${seed} floor ${f.index} room ${stage.room}`,
        );
        // Vaulting office furniture is free; only a field interaction costs a key.
        assert.ok(
          path.every((p) => p.action !== "door"),
          "Credentialed exits must not cost another key",
        );
      }
    }
  }
});
test("loading older forward worlds preserves their existing geometry and ongoing state", () => {
  for (const version of [2, 3]) {
    const g = createGame(42, roadmap, undefined, { layout: "forward" });
    if (version === 3) redesign(g, roadmap);
    const before = JSON.stringify(g.floors);
    assert.equal(g.floors[0].generation?.version, version);
    assert.equal(g.floors[0].boundary, undefined);
    const loaded = decode(encode(g));
    assert.equal(JSON.stringify(loaded.floors), before);
  }
  assert.equal(
    createPlayableGame(42, roadmap).floors[0].generation?.version,
    4,
  );
});

test("a pursuer can be drawn aside for actual terminal work inside the new study hall", () => {
  const scenario = emptyScenario();
  Object.assign(scenario, {
    template: "building",
    layout: "forward",
    rules: "force-fields",
    seed: 42,
    simulation: "game",
  });
  scenario.deleted = Array.from({ length: 19 }, (_, i) => `npc-${i}`);
  scenario.entities = [
    { id: "human", kind: "player", floor: 1, x: 40, y: 26 },
    { id: "worker", kind: "npc", x: 15.5, y: 22.5 },
    { id: "chaser", kind: "zombie", x: 19, y: 22.5 },
  ];
  const r = new TestRunner(scenario, roadmap),
    g = r.game,
    a = g.survivors[1],
    s = g.floors[0].stations
      .filter((s) => g.encounters[s.encounter].questionRoom === "f0-room2")
      .sort((a, b) => Math.abs(a.x - 15.5) - Math.abs(b.x - 15.5))[0],
    e = g.encounters[s.encounter];
  Object.assign(a, {
    x: s.x,
    y: s.y,
    intent: e.id,
    seen: [s.id],
    role: "analyst",
    risk: 0.8,
    thought: 20,
    studyLoopBlockedSince: -100,
    studyLoopCheckAt: 0,
  });
  Object.assign(g.zombies[0], { x: s.x + 3.5, y: s.y });
  let worked = false;
  for (let i = 0; i < 2700 && a.alive; i++) {
    step(g, 1 / 30);
    if (
      a.studyLoop?.phase === "work" &&
      a.station === s.id &&
      Math.hypot(a.x - s.x, a.y - s.y) < 1.3 &&
      e.npcProgress > 0
    )
      worked = true;
  }
  assert.ok(
    worked,
    "Physical progress under pursuit, rather than survival alone",
  );
  assert.equal(g.study.learner!.evidence.length, 0);
});

test("a blank arena remains a valid synthetic world when forward force-field rules are selected", () => {
  const s = emptyScenario();
  Object.assign(s, { layout: "forward", rules: "force-fields" });
  const r = new TestRunner(s, roadmap);
  assert.equal(r.game.floors[0].stations.length, 0);
  assert.equal(r.game.floors[0].furniture.length, 0);
});

test("seeds vary room proportions, silhouettes, gates and terminal positions without breaking layout contracts", () => {
  const depths = new Set<string>(),
    silhouettes = new Set<string>(),
    terminals = new Set<string>();
  for (let seed = 0; seed < 64; seed++) {
    const g = createPlayableGame(seed, roadmap);
    for (const f of g.floors.slice(0, 4)) {
      assert.deepEqual(
        pursuitLayoutErrors(g, f),
        [],
        `seed ${seed}/${f.index}`,
      );
      const stages = f.generation!.stages!;
      depths.add(JSON.stringify(stages.map((s) => s.rear - s.front)));
      // Ignore the transverse gates so gate positions alone cannot satisfy shape variation.
      silhouettes.add(JSON.stringify(stages.map((s) => f.tiles[s.front + 1])));
      terminals.add(JSON.stringify(f.stations.map((s) => [s.x, s.y])));
      assert.equal(stages[0].rear, f.boundary!.bottom - 3);
      assert.equal(stages.at(-1)!.front, f.boundary!.top + 3);
      for (const stage of stages) {
        assert.ok(stage.rear - stage.front >= (stage.room === 2 ? 5 : 4));
        const stations = f.stations.filter(
          (s) =>
            g.encounters[s.encounter].questionRoom ===
            `f${f.index}-room${stage.room}`,
        );
        for (let i = 0; i < stations.length; i++) {
          const a = stations[i];
          assert.ok(a.y > stage.front + 1 && a.y < stage.rear);
          for (const b of stations.slice(i + 1))
            assert.ok(
              Math.hypot(a.x - b.x, a.y - b.y) >= 1.4,
              "usable spacing between solo terminals",
            );
        }
      }
    }
  }
  assert.ok(depths.size >= 10, `only ${depths.size} room proportions`);
  assert.ok(silhouettes.size >= 32, `only ${silhouettes.size} silhouettes`);
  assert.ok(
    terminals.size >= 200,
    `only ${terminals.size} terminal arrangements`,
  );
});

test("generation validation rejects bypasses, inaccessible terminals and insufficient free study capacity", () => {
  const g = createPlayableGame(42, roadmap),
    f = g.floors[0];
  const saved = structuredClone(f);
  const row = f.generation!.stages![0].front;
  f.tiles[row][21] = 0;
  assert.ok(pursuitLayoutErrors(g, f).some((s) => s.includes("opening")));
  Object.assign(f, structuredClone(saved));
  assert.deepEqual(pursuitLayoutErrors(g, f), []);
  // A second, covered opening in a front wall is a walk-around and is rejected.
  const forward = f.furniture.find((o) => o.id === "f0-room2-forward")!;
  const x = forward.x < 22 ? 35.5 : 8.5;
  for (let dx = -1; dx <= 1; dx++) f.tiles[row][Math.floor(x) + dx] = 0;
  f.furniture.push({
    ...structuredClone(forward),
    id: "f0-room2-second",
    x,
  });
  assert.deepEqual(
    pursuitLayoutErrors(g, f).filter((s) => s.startsWith("wall ")),
    [`wall ${row} has 2 openings`],
  );
  Object.assign(f, structuredClone(saved));
  const boundary = f.boundary!;
  for (let y = boundary.top; y < boundary.bottom; y++) f.tiles[y][1] = 0;
  for (const y of [boundary.bottom - 2, boundary.top + 1])
    for (let x = 1; x <= boundary.rows[y].left; x++) f.tiles[y][x] = 0;
  assert.ok(pursuitLayoutErrors(g, f).some((s) => s.includes("bypass")));
  Object.assign(f, structuredClone(saved));
  Object.assign(f.stations[1], { x: f.stations[0].x, y: f.stations[0].y });
  assert.ok(
    pursuitLayoutErrors(g, f).some((s) => s.includes("overlapping study")),
  );
  Object.assign(f, structuredClone(saved));
  f.stations[0].x = 0.5;
  assert.ok(pursuitLayoutErrors(g, f).some((s) => s.includes("egress")));
  Object.assign(f, structuredClone(saved));
  f.stations = f.stations.filter(
    (s) => g.encounters[s.encounter].questionRoom !== "f0-room2",
  );
  assert.ok(pursuitLayoutErrors(g, f).some((s) => s.includes("zero-key")));
});
