import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { FURNITURE, type Game, type Roadmap } from "../src/model";
import {
  ROOM_CATALOG,
  fieldClearance,
  furnishOffice,
  pursuitOfficeZones,
} from "../src/office-layout";
import { decode, encode } from "../src/persistence";
import { pursuitLayoutErrors } from "../src/pursuit-layout";
import { createPlayableGame } from "../src/world";

const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);
const SEEDS = Array.from({ length: 32 }, (_, i) => i * 7919 + 3);
const worlds = new Map<number, Game>();
const world = (seed: number) => {
  if (!worlds.has(seed)) worlds.set(seed, createPlayableGame(seed, roadmap));
  return worlds.get(seed)!;
};
/** `f1-room3-break2-cafeTable0` → zone room3, type break. Version 5 zones are
 * sector blocks (room3, room3b, room3c, entry, lobby...) and sub-rooms
 * (room3r1, room3r2...). */
const parse = (id: string) =>
  /^f\d-(room\d(?:[bc]|r\d+)?|(?:entry|lobby)[bc]?)-([a-z]+)\d+-/
    .exec(id)
    ?.slice(1) as [string, string] | undefined;

test("every furnished room holds only objects from its own category", () => {
  const where = new Map<string, Set<string>>();
  for (const seed of SEEDS)
    for (const f of world(seed).floors.slice(0, 4)) {
      const sectors = f.generation!.sectors!;
      assert.deepEqual(
        f.office?.map((z) => z.zone).sort(),
        sectors
          .flatMap((s) => [
            ...s.blocks.map(
              (_, i) => `${s.id}${i ? String.fromCharCode(97 + i) : ""}`,
            ),
            ...s.rooms.map((r) => r.id),
          ])
          .sort(),
        `seed ${seed} floor ${f.index}`,
      );
      // Sub-rooms are furnished by their kind.
      for (const s of sectors)
        for (const r of s.rooms)
          assert.equal(
            f.office!.find((z) => z.zone === r.id)?.type,
            {
              office: "manager",
              meeting: "meeting",
              storage: "storage",
              break: "break",
            }[r.kind],
          );
      const types = new Map(f.office!.map((z) => [z.zone, z.type]));
      for (const o of f.furniture.filter((o) => !o.field)) {
        const parsed = parse(o.id);
        assert.ok(parsed, o.id);
        const [zone, type] = parsed;
        assert.equal(type, types.get(zone), o.id);
        assert.ok(
          ROOM_CATALOG[types.get(zone)!].includes(o.kind),
          `${o.kind} does not belong in a ${type} room (${o.id})`,
        );
        if (!where.has(o.kind)) where.set(o.kind, new Set());
        where.get(o.kind)!.add(type);
      }
    }
  // The user's example: coffee makers are break-room objects only.
  assert.deepEqual([...where.get("coffeeMaker")!], ["break"]);
  for (const kind of ["vending", "microwave", "cafeTable"])
    assert.deepEqual([...where.get(kind)!], ["break"], kind);
  assert.deepEqual([...where.get("partition")!], ["cubicles"]);
  assert.deepEqual([...where.get("reception")!], ["reception"]);
});

test("rooms are furnished densely with physical objects, as functional groups", () => {
  for (const seed of SEEDS)
    for (const f of world(seed).floors.slice(0, 4)) {
      assert.deepEqual(pursuitLayoutErrors(world(seed), f), []);
      const pieces = f.furniture.filter((o) => !o.field);
      assert.ok(pieces.length >= 30, `seed ${seed} floor ${f.index}`);
      for (const o of pieces) {
        const spec = FURNITURE[o.kind];
        assert.ok(o.speed > 0 && spec.resist > 0, o.id);
        assert.equal(o.hp, spec.hp);
        assert.equal(o.maxHp, spec.hp);
      }
      // Every typed study department (not the terminal-dense rear hall) and
      // every sub-room gets something, and groups share an id: chairs come
      // with their table.
      for (const s of f.generation!.sectors!) {
        if (s.room === undefined || s.room === 2) continue;
        assert.ok(
          pieces.some((o) => parse(o.id)?.[0].startsWith(s.id)),
          `seed ${seed} floor ${f.index} ${s.id} is empty`,
        );
        for (const r of s.rooms)
          assert.ok(
            pieces.some((o) => o.id.startsWith(`f${f.index}-${r.id}-`)),
            `seed ${seed} floor ${f.index} ${r.id} (${r.kind}) is empty`,
          );
      }
      for (const table of pieces.filter((o) => o.kind === "cafeTable")) {
        const group = table.id.replace(/-cafeTable\d+$/, "-");
        assert.ok(
          pieces.some((o) => o.kind === "chair" && o.id.startsWith(group)),
          table.id,
        );
      }
    }
});

test("room functions and arrangements vary with the run seed and repeat exactly for one seed", () => {
  const typesSeen = new Map<string, Set<string>>(),
    arrangements = new Set<string>();
  for (const seed of SEEDS) {
    const g = world(seed);
    for (const f of g.floors.slice(0, 4)) {
      for (const z of f.office!) {
        if (!typesSeen.has(z.zone)) typesSeen.set(z.zone, new Set());
        typesSeen.get(z.zone)!.add(z.type);
      }
      arrangements.add(
        JSON.stringify(
          f.furniture
            .filter((o) => !o.field)
            .map((o) => [o.kind, o.x.toFixed(2), o.y.toFixed(2)]),
        ),
      );
    }
  }
  for (const zone of ["room0", "room1", "room3"])
    assert.ok(
      typesSeen.get(zone)!.size >= 4,
      `${zone}: ${[...typesSeen.get(zone)!]}`,
    );
  assert.deepEqual([...typesSeen.get("room2")!], ["cubicles"]);
  assert.equal(arrangements.size, SEEDS.length * 4);
  const again = createPlayableGame(SEEDS[3], roadmap);
  assert.deepEqual(again.floors, world(SEEDS[3]).floors);
});

test("furnishing depends only on the seed and floor, never the world stream, and saves restore it exactly", () => {
  const g = createPlayableGame(4242, roadmap),
    restored = decode(encode(g));
  assert.deepEqual(restored.floors, g.floors);
  assert.equal(restored.rng, g.rng);
  // Strip one floor's office pieces and furnish it again from the seed alone:
  // the same pieces come back and the world stream does not move.
  const f = g.floors[2],
    rng = g.rng,
    bare = {
      ...structuredClone(f),
      furniture: structuredClone(f.furniture.filter((o) => o.field)),
    };
  furnishOffice(
    bare,
    pursuitOfficeZones(bare),
    fieldClearance(bare),
    bare.entry,
    g.seed,
    bare.furniture.filter((o) => /-room\d-door$/.test(o.id)),
  );
  assert.deepEqual(bare.furniture, f.furniture);
  assert.deepEqual(bare.office, f.office);
  assert.equal(g.rng, rng);
});
