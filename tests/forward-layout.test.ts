import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createGame, createPlayableGame } from "../src/world";
import { H, W, type Floor, type Point, type Roadmap } from "../src/model";
import { canPlace } from "../src/spatial";
const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
function forwardPath(f: Floor, start: Point, blocked: Set<number>) {
  const key = (x: number, y: number) => y * W + x,
    goal = key(Math.floor(f.stairs.x), Math.floor(f.stairs.y));
  const queue = [key(Math.floor(start.x), Math.floor(start.y))],
    seen = new Set(queue);
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    if (id === goal) return true;
    const x = id % W,
      y = Math.floor(id / W);
    for (const [nx, ny] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
    ])
      if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
        const next = key(nx, ny);
        if (!f.tiles[ny][nx] && !blocked.has(next) && !seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
  }
  return false;
}
test("randomized fresh floors give every terminal a forward route with its original entry sealed", () => {
  const shapes = new Set<string>();
  for (let seed = 0; seed < 64; seed++) {
    const g = createPlayableGame(seed, roadmap);
    for (const f of g.floors.slice(0, 4)) {
      assert.equal(f.generation?.version, 3);
      const blocked = new Set<number>();
      for (const [room, d] of f.doors.entries()) {
        const o = f.furniture.find(
          (o) => o.id === `f${f.index}-room${room}-door`,
        )!;
        for (
          let y = Math.floor(d.y - o.h / 2);
          y < Math.ceil(d.y + o.h / 2);
          y++
        )
          for (
            let x = Math.floor(d.x - o.w / 2);
            x < Math.ceil(d.x + o.w / 2);
            x++
          )
            blocked.add(y * W + x);
      }
      for (const room of f.rooms ?? [])
        if (room.innerMouth)
          blocked.add(
            Math.floor(room.innerMouth.y) * W + Math.floor(room.innerMouth.x),
          );
      for (const station of f.stations)
        assert.ok(
          forwardPath(f, station, blocked),
          `seed${seed} floor${f.index} ${station.id}`,
        );
      for (const o of f.furniture)
        if (o.kind !== "door")
          assert.ok(canPlace(f, o, o), `initial footprint ${seed}/${o.id}`);
      shapes.add(JSON.stringify(f.tiles));
    }
  }
  assert.ok(shapes.size > 48, `only ${shapes.size} different layouts`);
});
test("new generation is deterministic and uses its own RNG without altering legacy saved-layout construction", () => {
  const a = createPlayableGame(2682889803, roadmap),
    b = createPlayableGame(2682889803, roadmap),
    legacy = createGame(2682889803, roadmap);
  assert.deepEqual(a.floors, b.floors);
  assert.equal(a.rng, legacy.rng);
  assert.equal(legacy.floors[0].generation, undefined);
  assert.notDeepEqual(a.floors[0].tiles, legacy.floors[0].tiles);
});
