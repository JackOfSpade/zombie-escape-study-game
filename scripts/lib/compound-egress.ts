import assert from "node:assert/strict";
import { step, toggleDoor } from "../../src/engine";
import type { Roadmap } from "../../src/model";
import { distance } from "../../src/model";
import { decode, encode } from "../../src/persistence";
import { canPlace, solid } from "../../src/spatial";
import { actor } from "../../src/world";
import { prepareScenario, pushAxis, walkTo } from "./defense-scenario";

export function compoundEgress(r: Roadmap, seed: number, reload: boolean) {
  const { g: manual, room } = prepareScenario(
    r,
    seed,
    "layered",
    [-0.05, 0.04, 0.06][seed],
  );
  // Preserve the actual human-built geometry; isolate egress from pursuit.
  manual.zombies = [];
  manual.nextSpawn = Number.MAX_SAFE_INTEGER;
  let g = structuredClone(manual);
  const initial = structuredClone(g),
    start = g.time;
  const f = manual.floors[0],
    prefix = `f0-room${room.index}`;
  const sign = room.side === "left" ? -1 : 1;
  const inner = f.furniture.find((o) => o.id === prefix + "-shelf5")!;
  const middle = f.furniture.find((o) => o.id === prefix + "-shelf0")!;
  const door = f.furniture.find((o) => o.id === prefix + "-door")!;
  pushAxis(manual, inner, "x", inner.x + sign * 2.3);
  pushAxis(manual, middle, "x", middle.x + sign * 0.8);
  walkTo(manual, { x: door.x + sign * 1.05, y: door.y });
  assert.equal(toggleDoor(manual, manual.survivors[0], door.id, true), true);
  walkTo(manual, { x: 21.5, y: door.y + 2 });
  assert.ok(manual.events.some((e) => e.at > start && e.type === "vault"));
  let npc = g.survivors[0];
  npc.id = "egress";
  // Credentialed-egress fixture, not a simulated or genuine puzzle completion.
  npc.access = [0];
  delete npc.station;
  delete npc.intent;
  const parked = actor("human", "Parked fixture human", 0);
  parked.escaped = true;
  g.survivors = [parked, npc];
  let didReload = false,
    frames = 0;
  const poses: { time: number; object: string; x: number; y: number }[] = [];
  while (npc.floor === 0 && g.time < start + 60) {
    const before = g.floors[0].furniture.map((o) => ({ x: o.x, y: o.y }));
    step(g, 1 / 30);
    frames++;
    for (const [i, o] of g.floors[0].furniture.entries()) {
      assert.ok(
        distance(before[i], o) <=
          (o.door ? Math.hypot(o.w, o.h) * 2 : Math.max(3, o.speed * 1.9)) /
            30 +
            0.02,
        "bounded native contact/hinge movement",
      );
      assert.equal(o.hp, initial.floors[0].furniture[i].hp);
      assert.ok(
        canPlace(
          g.floors[0],
          o,
          o,
          Math.max(0.01, o.w - 0.04),
          Math.max(0.01, o.h - 0.04),
          o.angle ?? 0,
          0,
        ),
        `native object footprint (2 cm contact tolerance): ${o.id}`,
      );
    }
    if (!npc.vault && !npc.stairTravel)
      assert.equal(solid(g.floors[npc.floor], npc), false);
    if (
      reload &&
      !didReload &&
      npc.defensePlan?.encounter === "egress" &&
      g.time > start + 2
    ) {
      const saved = encode(g),
        plan = structuredClone(npc.defensePlan);
      g = decode(saved);
      npc = g.survivors[1];
      assert.deepEqual(npc.defensePlan, plan);
      assert.equal(encode(g), saved);
      didReload = true;
    }
    if (
      npc.defensePlan &&
      !poses.some((p) => p.object === npc.defensePlan!.object)
    ) {
      const o = g.floors[0].furniture.find(
        (o) => o.id === npc.defensePlan!.object,
      )!;
      poses.push({ time: g.time, object: o.id, x: o.x, y: o.y });
    }
  }
  assert.equal(
    npc.floor,
    1,
    `NPC trapped: ${JSON.stringify({ x: npc.x, y: npc.y, plan: npc.defensePlan })}`,
  );
  assert.ok(npc.alive);
  assert.equal(g.study.learner!.evidence.length, 0);
  assert.equal(g.study.visits.length, 0);
  assert.deepEqual(npc.access, [0]);
  assert.ok(g.events.some((e) => e.at > start && e.type === "door"));
  assert.ok(g.events.some((e) => e.at > start && e.type === "vault"));
  const outer = g.floors[0].furniture.find(
      (o) => o.id === "f0-corridor-fridge",
    )!,
    oldOuter = initial.floors[0].furniture.find((o) => o.id === outer.id)!;
  assert.ok(
    distance(outer, oldOuter) < 0.04,
    "outer cover receives no artificial relocation",
  );
  assert.equal(outer.hp, oldOuter.hp);
  if (reload) assert.ok(didReload);
  return {
    seed,
    reload: didReload,
    manualSeconds: manual.time - start,
    npcSeconds: g.time - start,
    frames,
    stepSeconds: 1 / 30,
    poses,
    humanEvidence: 0,
    humanVisits: 0,
    finalFloor: npc.floor,
    hp: npc.hp,
    finalCover: g.floors[0].furniture
      .filter((o) => o.moved > 0)
      .map((o) => ({ id: o.id, x: o.x, y: o.y, hp: o.hp })),
  };
}
