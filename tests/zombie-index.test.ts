import assert from "node:assert/strict";
import { test } from "node:test";
import type { Zombie } from "../src/model";
import { ZombieIndex } from "../src/zombie-index";
function body(i: number): Zombie {
  return {
    id: `z${i}`,
    floor: i % 5,
    x: ((i * 17) % 440) / 10 - 2,
    y: ((i * 13) % 340) / 10 - 2,
    hp: i % 11 ? 60 : 0,
    path: [],
    repath: 0,
    cooldown: 0,
    memory: 0,
    stagger: 0,
    origin: "outside",
  };
}
test("local crowd queries retain every exact contact candidate in original order across boundaries and negative coordinates", () => {
  const zs = Array.from({ length: 2500 }, (_, i) => body(i)),
    index = new ZombieIndex(zs);
  for (let i = 0; i < 100; i++) {
    const p = { x: ((i * 19) % 440) / 10 - 2, y: ((i * 23) % 340) / 10 - 2 },
      floor = i % 5,
      r = i % 3 === 0 ? 0.55 : 1;
    assert.deepEqual(
      index.near(floor, p, r),
      zs.filter(
        (z) =>
          z.hp > 0 &&
          z.floor === floor &&
          (z.x - p.x) ** 2 + (z.y - p.y) ** 2 <= (r + 1e-7) ** 2,
      ),
    );
  }
});
test("same-tick movement, floor arrivals, deaths and new births update occupancy without losing stable collision order", () => {
  const zs = Array.from({ length: 20 }, (_, i) => ({
      ...body(i),
      hp: 60,
      floor: 0,
      x: 5.5 + i * 0.1,
      y: 5.5,
    })),
    index = new ZombieIndex(zs);
  zs[0].x = 20;
  index.update(zs[0]);
  zs[1].floor = 1;
  index.update(zs[1]);
  zs[2].hp = 0;
  index.update(zs[2]);
  zs[3].x = 6.05;
  index.update(zs[3]);
  const newborn = { ...body(100), hp: 60, floor: 0, x: 5.5, y: 5.5 };
  zs.push(newborn);
  index.update(newborn);
  for (const floor of [0, 1])
    assert.deepEqual(
      index.near(floor, { x: 5.5, y: 5.5 }, 1),
      zs.filter(
        (z) =>
          z.hp > 0 &&
          z.floor === floor &&
          Math.hypot(z.x - 5.5, z.y - 5.5) <= 1 + 1e-7,
      ),
    );
  assert.deepEqual(index.near(0, { x: 20, y: 5.5 }, 0.1), [zs[0]]);
});
