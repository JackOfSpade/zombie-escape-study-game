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

/** Texels per tile in the baked interior lightmap. */
export const LIGHTMAP_RES = 2;
/** Practical point lights hang just below the 2.785 m fixture housing. */
export const FIXTURE_HEIGHT = 2.59;
export const FIXTURE_RANGE = 7;
export const fixtureIntensity = (f: CeilingFixture) => (f.level > 0.5 ? 22 : 7);

/** Irradiance on an upward-facing floor at horizontal distance `d` from a
 * fixture, matching three.js PointLight(decay 2, distance FIXTURE_RANGE). */
export function poolIrradiance(intensity: number, d: number) {
  const r2 = d * d + FIXTURE_HEIGHT * FIXTURE_HEIGHT,
    r = Math.sqrt(r2),
    cutoff = Math.max(0, 1 - (r / FIXTURE_RANGE) ** 4);
  return ((intensity * FIXTURE_HEIGHT) / r / Math.max(r2, 0.01)) * cutoff ** 2;
}

/** One fixture's light on the floor grid, occluded by real walls. Values are
 * a dense window of lightmap texels starting at (x0, y0). */
export interface FixturePool {
  fixture: CeilingFixture;
  warm: boolean;
  x0: number;
  y0: number;
  w: number;
  h: number;
  values: Float32Array;
}

const solidTile = (floor: Floor, x: number, y: number) =>
  floor.tiles[y]?.[x] !== 0;

/** Wall tiles block light; the target's own tile never occludes itself. */
function litFrom(floor: Floor, from: Point, to: Point) {
  const tx = Math.floor(to.x),
    ty = Math.floor(to.y),
    d = Math.hypot(to.x - from.x, to.y - from.y),
    steps = Math.ceil(d / 0.2);
  for (let i = 1; i < steps; i++) {
    const x = Math.floor(from.x + ((to.x - from.x) * i) / steps),
      y = Math.floor(from.y + ((to.y - from.y) * i) / steps);
    if ((x !== tx || y !== ty) && solidTile(floor, x, y)) return false;
  }
  return true;
}

/** Texels inside wall tiles take the mean of their open 4-neighbours, so a
 * thin wall's two faces each see only their own room. */
function fillSolidTexels(
  floor: Floor,
  values: Float32Array,
  w: number,
  h: number,
  x0 = 0,
  y0 = 0,
) {
  const R = LIGHTMAP_RES,
    source = values.slice();
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const gx = x0 + x,
        gy = y0 + y;
      if (!solidTile(floor, Math.floor(gx / R), Math.floor(gy / R))) continue;
      let sum = 0,
        n = 0;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx,
          ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (
          solidTile(floor, Math.floor((gx + dx) / R), Math.floor((gy + dy) / R))
        )
          continue;
        sum += source[ny * w + nx];
        n++;
      }
      values[y * w + x] = n ? sum / n : 0;
    }
}

export function fixturePools(plan: InteriorLighting): FixturePool[] {
  const { floor } = plan,
    R = LIGHTMAP_RES,
    reach = Math.ceil(FIXTURE_RANGE * R);
  return plan.fixtures
    .filter((f) => f.level > 0.2)
    .map((fixture) => {
      const x0 = Math.max(0, Math.floor(fixture.x * R) - reach),
        y0 = Math.max(0, Math.floor(fixture.y * R) - reach),
        x1 = Math.min(W * R, Math.floor(fixture.x * R) + reach + 1),
        y1 = Math.min(H * R, Math.floor(fixture.y * R) + reach + 1),
        w = x1 - x0,
        h = y1 - y0,
        values = new Float32Array(w * h),
        intensity = fixtureIntensity(fixture);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const p = { x: (x0 + x + 0.5) / R, y: (y0 + y + 0.5) / R };
          if (solidTile(floor, Math.floor(p.x), Math.floor(p.y))) continue;
          if (!inside(floor, p)) continue;
          const d = Math.hypot(p.x - fixture.x, p.y - fixture.y);
          if (d >= FIXTURE_RANGE || !litFrom(floor, fixture, p)) continue;
          values[y * w + x] = poolIrradiance(intensity, d);
        }
      fillSolidTexels(floor, values, w, h, x0, y0);
      return { fixture, warm: fixture.level > 0.5, x0, y0, w, h, values };
    });
}

/** Zone power level per lightmap texel; 0 outside the occupied footprint. */
export function ambientTexels(plan: InteriorLighting) {
  const R = LIGHTMAP_RES,
    w = W * R,
    h = H * R,
    values = new Float32Array(w * h),
    covered = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = { x: (x + 0.5) / R, y: (y + 0.5) / R };
      if (!inside(plan.floor, p)) continue;
      covered[y * w + x] = 1;
      values[y * w + x] = lightAt(plan, p);
    }
  fillSolidTexels(plan.floor, values, w, h);
  return { values, covered };
}
