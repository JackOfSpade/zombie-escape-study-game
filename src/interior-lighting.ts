import { floorSectors, inRect, type Rect } from "./floor-plan";
import { CONFIG, H, W, type Floor, type Furniture, type Point } from "./model";

export type InteriorPower = "lit" | "dim" | "outage";
export interface LightingZone {
  id: string;
  rect: Rect;
  power: InteriorPower;
  level: number;
}
export interface CeilingFixture extends Point {
  id: string;
  level: number;
  color: string;
}
export interface WallStory extends Point {
  /** Normal pointing out of the wall, into the room. */
  nx: number;
  ny: number;
  width: number;
  height: number;
  story: number;
}
export interface InteriorLighting {
  floor: Floor;
  seed: number;
  zones: LightingZone[];
  fixtures: CeilingFixture[];
  stories: WallStory[];
}

/** Cosmetic randomness is independent of the saved simulation/loot stream. */
export function interiorHash(seed: number, floor: number, id: string) {
  let value = (seed ^ Math.imul(floor + 1, 0x51ed270b)) >>> 0;
  for (let i = 0; i < id.length; i++)
    value = Math.imul(value ^ id.charCodeAt(i), 0x01000193) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  return (value ^ (value >>> 15)) >>> 0;
}

function inside(floor: Floor, p: Point) {
  const b = floor.boundary;
  if (!b) return p.x >= 0 && p.y >= 0 && p.x < W && p.y < H;
  const row = b.rows[Math.floor(p.y)];
  return (
    !!row &&
    p.y >= b.top &&
    p.y < b.bottom &&
    p.x >= row.left &&
    p.x < row.right
  );
}

const LEVEL: Record<InteriorPower, number> = {
  lit: 0.82,
  dim: 0.34,
  outage: 0.055,
};

export function lightAt(plan: InteriorLighting, p: Point) {
  if (!inside(plan.floor, p) || plan.floor.index >= CONFIG.floors) return 1;
  const x = Math.floor(p.x),
    y = Math.floor(p.y);
  // Sub-room zones follow their parent sector in the list, and override it.
  let level =
    plan.floor.dark > 0.8
      ? LEVEL.outage
      : plan.floor.dark > 0.3
        ? LEVEL.dim
        : LEVEL.lit;
  for (const zone of plan.zones)
    if (inRect(zone.rect, x, y)) level = zone.level;
  return level;
}

/** Lighting follows actual office territories, rather than screen-space or a
 * whole-floor darkness switch. Fixtures are cosmetic, never navigation props. */
export function buildInteriorLighting(
  floor: Floor,
  seed: number,
): InteriorLighting {
  const plan: InteriorLighting = {
    floor,
    seed,
    zones: [],
    fixtures: [],
    stories: [],
  };
  if (floor.index >= CONFIG.floors) return plan;
  const sectors = floorSectors(floor);
  const darkSector = sectors.filter(
    (s) => s.id !== "entry" && s.id !== "lobby" && s.id !== "room2",
  );
  const forcedOutage =
    darkSector[
      interiorHash(seed, floor.index, "broken-circuit") %
        Math.max(1, darkSector.length)
    ]?.id;
  for (const sector of sectors) {
    const roll = interiorHash(seed, floor.index, sector.id),
      power: InteriorPower =
        sector.id === forcedOutage
          ? "outage"
          : sector.id === "entry" || sector.id === "room2"
            ? "lit"
            : roll % 4 === 0
              ? "dim"
              : "lit";
    for (const rect of sector.blocks)
      plan.zones.push({
        id: sector.id,
        rect: { ...rect },
        power,
        level: LEVEL[power],
      });
  }
  // Dedicated offices and storage can have their own failed circuit. Keep the
  // free study hall and entrance readable, with a guaranteed darker department.
  for (const sector of sectors)
    for (const room of sector.rooms) {
      const roll = interiorHash(seed, floor.index, room.id),
        power: InteriorPower =
          sector.id === forcedOutage
            ? "outage"
            : room.kind === "storage" || roll % 6 === 0
              ? "outage"
              : roll % 3 === 0
                ? "dim"
                : "lit";
      plan.zones.push({
        id: room.id,
        rect: { ...room.rect },
        power,
        level: LEVEL[power],
      });
    }
  const addFixture = (p: Point, id: string) => {
    if (
      plan.fixtures.length >= 128 ||
      floor.tiles[Math.floor(p.y)]?.[Math.floor(p.x)] !== 0 ||
      !inside(floor, p)
    )
      return;
    if (plan.fixtures.some((f) => Math.hypot(f.x - p.x, f.y - p.y) < 2.1))
      return;
    const level = lightAt(plan, p);
    plan.fixtures.push({
      ...p,
      id,
      level,
      color: level > 0.5 ? "#f2d7a3" : "#9dbfc7",
    });
  };
  for (const sector of sectors)
    for (const room of sector.rooms)
      addFixture(
        {
          x: (room.rect.x1 + room.rect.x2 + 1) / 2,
          y: (room.rect.y1 + room.rect.y2 + 1) / 2,
        },
        `ceiling-${room.id}`,
      );
  for (let y = 2; y < floor.tiles.length - 1; y += 3)
    for (let x = 2; x < floor.tiles[y].length - 1; x += 4)
      addFixture({ x: x + 0.5, y: y + 0.5 }, `ceiling-${x}-${y}`);
  // Only real interior wall faces receive posters: perimeter windows, field
  // mouths and arbitrary floating rectangles are excluded.
  const candidates: WallStory[] = [];
  for (let y = 1; y < floor.tiles.length - 1; y++)
    for (let x = 1; x < floor.tiles[y].length - 1; x++) {
      if (!floor.tiles[y][x] || !inside(floor, { x: x + 0.5, y: y + 0.5 }))
        continue;
      for (const [nx, ny] of [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
      ]) {
        const open = { x: x + nx + 0.5, y: y + ny + 0.5 };
        if (floor.tiles[y + ny]?.[x + nx] !== 0 || !inside(floor, open))
          continue;
        if (
          floor.furniture.some(
            (o) =>
              (o.field || o.door) &&
              Math.hypot(o.x - open.x, o.y - open.y) < 2.4,
          )
        )
          continue;
        const wide =
          floor.tiles[y + (nx ? 1 : 0)]?.[x + (ny ? 1 : 0)] &&
          floor.tiles[y - (nx ? 1 : 0)]?.[x - (ny ? 1 : 0)];
        const roll = interiorHash(
            seed,
            floor.index,
            `wall-${x}-${y}-${nx}-${ny}`,
          ),
          whiteboard = !!wide && roll % 4 === 0;
        candidates.push({
          x: x + 0.5 + nx * 0.514,
          y: y + 0.5 + ny * 0.514,
          nx,
          ny,
          width: whiteboard ? 1.7 : 0.62,
          height: whiteboard ? 0.93 : 0.86,
          story: whiteboard ? 3 : roll % 3,
        });
      }
    }
  candidates.sort(
    (a, b) =>
      interiorHash(seed, floor.index, `${a.x}/${a.y}`) -
      interiorHash(seed, floor.index, `${b.x}/${b.y}`),
  );
  for (const candidate of candidates) {
    if (
      plan.stories.some(
        (s) => Math.hypot(s.x - candidate.x, s.y - candidate.y) < 3.5,
      )
    )
      continue;
    plan.stories.push(candidate);
    if (plan.stories.length >= 12) break;
  }
  return plan;
}

export function hasDeskStory(o: Furniture) {
  return (
    !o.destroyed &&
    ["desk", "table", "cafeTable", "coffeeTable", "reception"].includes(
      o.kind,
    ) &&
    o.w >= 0.58 &&
    o.h >= 0.48
  );
}

/** Small dwell times and separate thresholds stop the phone fluttering at a
 * doorway. The visual raise/stow is independent of simulation and world RNG. */
export class PhoneLightState {
  raised = false;
  mix = 0;
  private darkTime = 0;
  private brightTime = 0;
  reset() {
    this.raised = false;
    this.mix = this.darkTime = this.brightTime = 0;
  }
  update(level: number, elapsed: number, enabled = true) {
    const dt = Math.max(0, Math.min(0.2, elapsed));
    if (!enabled) {
      this.raised = false;
      this.darkTime = this.brightTime = 0;
    } else if (level < 0.2) {
      this.darkTime += dt;
      this.brightTime = 0;
      if (this.darkTime >= 0.18) this.raised = true;
    } else if (level > 0.43) {
      this.brightTime += dt;
      this.darkTime = 0;
      if (this.brightTime >= 0.55) this.raised = false;
    } else {
      this.darkTime = this.brightTime = 0;
    }
    this.mix += ((this.raised ? 1 : 0) - this.mix) * (1 - Math.exp(-dt * 9));
    if (this.mix < 0.001) this.mix = 0;
    if (this.mix > 0.999) this.mix = 1;
    return this.mix;
  }
}
