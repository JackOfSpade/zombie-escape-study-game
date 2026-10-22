import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { doorPose } from "../src/doors";
import { step, useItem } from "../src/engine";
import {
  type Floor,
  type Furniture,
  type Roadmap,
  type Zombie,
} from "../src/model";
import { decode, encode, recover } from "../src/persistence";
import { canSee } from "../src/visibility";
import { createGame } from "../src/world";
const r: Roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));
function fixture() {
  const g = createGame(7, r);
  g.status = "playing";
  g.time = 100;
  g.nextSpawn = Number.MAX_SAFE_INTEGER;
  g.surge.anchor = 1000;
  g.zombies = [];
  for (const a of g.survivors.slice(1)) a.escaped = true;
  const f: Floor = {
    index: 0,
    tiles: Array.from({ length: 34 }, (_, y) =>
      Array.from({ length: 44 }, (_, x) =>
        x === 0 || x === 43 || y === 0 || y === 33 ? 1 : 0,
      ),
    ),
    furniture: [],
    stations: [],
    dark: 0,
    name: "Equipment fixture",
    doors: [],
    stairs: { x: 10.5, y: 2.5 },
    entry: { x: 20, y: 30 },
  };
  g.floors[0] = f;
  const a = g.survivors[0];
  Object.assign(a, { floor: 0, x: 10.5, y: 15.5 });
  a.inventory = [];
  return { g, a, f };
}
function z(id: string, x: number, y = 15.5): Zombie {
  return {
    id,
    x,
    y,
    floor: 0,
    hp: 60,
    path: [],
    repath: 0,
    cooldown: 0,
    memory: 0,
    stagger: 0,
    origin: "outside",
  };
}
function door(x = 12.07): Furniture {
  return {
    id: "cover",
    kind: "door",
    floor: 0,
    x,
    y: 15.5,
    w: 0.15,
    h: 2,
    hp: 100,
    maxHp: 100,
    speed: 1,
    rotation: 0,
    destroyed: false,
    open: false,
    movers: [],
    moved: 0,
    credited: [],
    turning: 0,
  };
}
test("weapons respect exact opaque cover, finite range, living targets and charge retention", () => {
  const { g, a, f } = fixture(),
    cover = door(),
    exposed = z("exposed", 11.5),
    hidden = z("hidden", 13.5),
    far = z("far", 18),
    dead = z("dead", 11.7),
    other = z("other floor", 11.8);
  dead.hp = 0;
  other.floor = 1;
  f.furniture = [cover];
  g.zombies = [hidden, dead, far, other, exposed];
  a.inventory = [{ id: "weapon", kind: "weapon", weight: 1, charges: 2 }];
  const study = JSON.stringify(g.study);
  assert.equal(canSee(f, a, hidden, 5), false);
  assert.equal(useItem(g, a, "weapon"), true);
  assert.equal(exposed.hp, 0);
  assert.equal(hidden.hp, 60);
  assert.equal(dead.hp, 0);
  assert.equal(far.hp, 60);
  assert.equal(other.hp, 60);
  assert.equal(a.inventory[0].charges, 1);
  const seq = g.seq;
  assert.equal(useItem(g, a, "weapon"), false);
  assert.equal(a.inventory[0].charges, 1);
  assert.equal(g.seq, seq);
  assert.match(g.notice, /charge kept/);
  cover.open = true;
  assert.equal(useItem(g, a, "weapon"), true);
  assert.equal(hidden.hp, 0);
  assert.equal(a.inventory.length, 0);
  assert.equal(JSON.stringify(g.study), study);
});
test("repulsors preserve health, cannot affect covered targets and stop displacement at walls", () => {
  const { g, a, f } = fixture(),
    target = z("target", 12.5);
  g.zombies = [target];
  a.inventory = [{ id: "push", kind: "repulsor", weight: 1, charges: 1 }];
  const cover = door();
  f.furniture = [cover];
  assert.equal(useItem(g, a, "push"), false);
  assert.equal(target.x, 12.5);
  assert.equal(target.stagger, 0);
  cover.open = true;
  for (let y = 1; y < 33; y++) f.tiles[y][15] = 1;
  assert.equal(useItem(g, a, "push"), true);
  assert.equal(target.hp, 60);
  assert.ok(target.stagger > 0);
  assert.equal(
    target.x,
    12.5,
    "repulsor imparts momentum rather than teleporting",
  );
  for (let i = 0; i < 60; i++) {
    step(g, 1 / 30);
    assert.ok(target.x < 15 - 0.26 + 0.015);
  }
  assert.ok(target.x > 12.5);
  assert.equal(a.inventory.length, 0);
});
test("healing and item use require an active owned survivor; no-op healing preserves finite charges", () => {
  const { g, a } = fixture();
  a.inventory = [{ id: "med", kind: "medkit", weight: 2, charges: 1 }];
  assert.equal(useItem(g, a, "med"), false);
  assert.equal(a.inventory[0].charges, 1);
  a.hp = 70;
  g.status = "ready";
  assert.equal(useItem(g, a, "med"), false);
  g.status = "playing";
  a.escaped = true;
  assert.equal(useItem(g, a, "med"), false);
  a.escaped = false;
  assert.equal(useItem(g, structuredClone(a), "med"), false);
  a.alive = false;
  assert.equal(useItem(g, a, "med"), false);
  a.alive = true;
  assert.equal(useItem(g, a, "med"), true);
  assert.equal(a.hp, 100);
  assert.equal(a.inventory.length, 0);
});
test("decoys require actual acoustic reach, prefer nearer audible noise and stop at expiry", () => {
  const { g, a, f } = fixture();
  Object.assign(a, { x: 25.5, y: 25.5 });
  for (let y = 1; y < 33; y++) f.tiles[y][15] = 1;
  f.tiles[15][15] = 0;
  const cover = door(15.5);
  cover.w = 1;
  cover.h = 1;
  f.furniture = [cover];
  const target = z("listener", 14.5);
  g.zombies = [target];
  g.effects = [
    {
      kind: "decoy",
      floor: 0,
      x: 16.5,
      y: 15.5,
      radius: 10,
      until: g.time + 20,
    },
  ];
  const withoutSound = structuredClone(g);
  withoutSound.effects = [];
  step(withoutSound, 1 / 30);
  step(g, 1 / 30);
  assert.deepEqual(
    target.path,
    withoutSound.zombies[0].path,
    "a muffled decoy does not replace the zombie's own search",
  );
  cover.open = true;
  cover.door!.latched = false;
  cover.door!.swung = true;
  cover.door!.side = 1;
  const pose = doorPose(cover, Math.PI / 2);
  Object.assign(cover, pose);
  target.repath = 0;
  step(g, 1 / 30);
  assert.deepEqual(target.path.at(-1), { x: 16.5, y: 15.5 });
  g.effects.unshift({
    kind: "decoy",
    floor: 0,
    x: 19.5,
    y: 15.5,
    radius: 10,
    until: g.time + 20,
  });
  target.repath = 0;
  step(g, 1 / 30);
  assert.deepEqual(target.path.at(-1), { x: 16.5, y: 15.5 });
  for (const effect of g.effects) effect.until = g.time;
  target.repath = 0;
  const afterExpiry = structuredClone(g);
  afterExpiry.effects = [];
  step(afterExpiry, 1 / 30);
  step(g, 1 / 30);
  assert.deepEqual(
    target.path,
    afterExpiry.zombies[0].path,
    "expired noise returns to the same personal search as having no sound",
  );
  assert.equal(g.effects.length, 0);
});
test("bubble expiry disperses before an immediate attack, respects walls and cannot kill or damage allies", () => {
  const { g, a, f } = fixture();
  a.hp = 1;
  const exposed = z("exposed", 10.9),
    hidden = z("hidden", 13.5);
  g.zombies = [exposed, hidden];
  f.furniture = [door()];
  g.effects = [
    { kind: "bubble", floor: 0, x: a.x, y: a.y, radius: 3.5, until: g.time },
  ];
  const hp = exposed.hp;
  step(g, 1 / 30);
  assert.equal(a.alive, true);
  assert.equal(a.hp, 1);
  assert.equal(exposed.hp, hp);
  assert.ok(exposed.stagger > 2);
  assert.equal(hidden.stagger, 0);
  assert.equal(g.effects.length, 0);
  const count = g.events.filter((e) => e.type === "bubble-end").length;
  step(g, 1 / 30);
  assert.equal(g.events.filter((e) => e.type === "bubble-end").length, count);
});
test("active bubble cannot steer zombies through opaque walls; temporary effects and remaining charges survive reload", () => {
  const { g, a, f } = fixture();
  f.furniture = [door()];
  const hidden = z("behind cover", 13.5);
  g.zombies = [hidden];
  a.inventory = [
    { id: "bubble", kind: "bubble", weight: 1, charges: 1 },
    { id: "light", kind: "flare", weight: 1, charges: 2 },
  ];
  assert.equal(useItem(g, a, "bubble"), true);
  assert.equal(useItem(g, a, "light"), true);
  const before = hidden.x;
  step(g, 1 / 30);
  assert.ok(hidden.x <= before);
  assert.equal(hidden.stagger, 0);
  const loaded = recover(decode(encode(g)));
  assert.deepEqual(loaded.effects, g.effects);
  assert.equal(loaded.survivors[0].inventory[0].charges, 1);
  assert.equal(loaded.effects.filter((e) => e.kind === "bubble").length, 1);
  assert.equal(loaded.effects.filter((e) => e.kind === "flare").length, 1);
});
