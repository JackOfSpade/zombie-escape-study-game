import type { Floor, Point } from "../model";
import { wallRayDistance } from "../visibility";
import { rayFootprintInterval } from "./targeting";
import { furnitureHeight } from "./furniture-height";

export const FLASHLIGHT_NEAR_RANGE = 1.2;

/** Counter inverse-square brightening near surfaces. At 30 cm the lamp uses
 * 1/16 power; the warm spot retains surface detail instead of clipping white. */
export function flashlightDistanceScale(distance: number) {
  if (Number.isNaN(distance)) return 1;
  const fraction = Math.max(0, Math.min(1, distance / FLASHLIGHT_NEAR_RANGE));
  return fraction * fraction;
}

/** A 100 ms settling time, independent of refresh rate. */
export function smoothFlashlightScale(
  current: number,
  target: number,
  dt: number,
) {
  if (!Number.isFinite(dt) || dt <= 0) return current;
  return target + (current - target) * Math.exp(-dt / 0.035);
}

const surfaceInterval = { near: 0, far: 0 };

/** Presentation-only 3D ray through the rendered furniture slabs. Low furniture
 * only dims the lamp when the crosshair ray really reaches its top or side. */
export function flashlightSurfaceDistance(
  floor: Floor,
  origin: Point,
  yaw: number,
  pitch = 0,
  eye = 1.56,
) {
  const horizontal = Math.cos(pitch),
    vertical = Math.sin(pitch),
    dx = Math.cos(yaw),
    dy = Math.sin(yaw);
  let nearest = FLASHLIGHT_NEAR_RANGE;
  if (horizontal > 1e-6) {
    const wall =
        wallRayDistance(
          floor,
          origin,
          yaw,
          FLASHLIGHT_NEAR_RANGE * horizontal,
        ) / horizontal,
      height = eye + wall * vertical;
    if (height >= 0 && height <= 2.8) nearest = Math.min(nearest, wall);
  }
  if (vertical < 0) nearest = Math.min(nearest, eye / -vertical);
  for (const object of floor.furniture) {
    if (
      object.destroyed ||
      object.field ||
      (object.kind === "gate" && object.turning < 0) ||
      !rayFootprintInterval(origin, dx, dy, object, surfaceInterval)
    )
      continue;
    const top = furnitureHeight(object.kind);
    let near = surfaceInterval.near / horizontal,
      far = surfaceInterval.far / horizontal;
    if (Math.abs(vertical) < 1e-6) {
      if (eye > top) continue;
    } else {
      const bottomHit = -eye / vertical,
        topHit = (top - eye) / vertical;
      near = Math.max(near, Math.min(bottomHit, topHit));
      far = Math.min(far, Math.max(bottomHit, topHit));
    }
    if (near <= far) nearest = Math.min(nearest, near);
  }
  return nearest;
}
