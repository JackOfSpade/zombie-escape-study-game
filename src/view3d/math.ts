import type { Point } from "../model";

export const MAX_PITCH = (85 * Math.PI) / 180;

export function clampPitch(pitch: number) {
  return Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch));
}

/** Y-up view direction; yaw uses the simulation's east/south heading. */
export function lookDirection(yaw: number, pitch: number) {
  const elevation = clampPitch(pitch),
    horizontal = Math.cos(elevation);
  return {
    x: horizontal * Math.cos(yaw),
    y: Math.sin(elevation),
    z: horizontal * Math.sin(yaw),
  };
}

/** Camera-relative movement stays on the floor, with unit-length diagonals. */
export function movementInput(
  yaw: number,
  right: number,
  forward: number,
): Point {
  const length = Math.max(1, Math.hypot(right, forward)),
    x = right / length,
    y = forward / length;
  return {
    x: Math.cos(yaw) * y - Math.sin(yaw) * x,
    y: Math.sin(yaw) * y + Math.cos(yaw) * x,
  };
}

export const ARROW_TURN_SPEED = 2.6;

/** Arrow turning is separate from translation; positive yaw turns right. */
export function arrowTurn(
  yaw: number,
  left: boolean,
  right: boolean,
  dt: number,
) {
  if (!Number.isFinite(dt) || dt <= 0) return yaw;
  return (
    (yaw + (Number(right) - Number(left)) * ARROW_TURN_SPEED * dt) %
    (Math.PI * 2)
  );
}

/** First-person arrows turn or move longitudinally; A/D always strafe. */
export function firstPersonInput(
  yaw: number,
  keys: ReadonlySet<string>,
): Point {
  return movementInput(
    yaw,
    Number(keys.has("KeyD")) - Number(keys.has("KeyA")),
    Number(keys.has("KeyW") || keys.has("ArrowUp")) -
      Number(keys.has("KeyS") || keys.has("ArrowDown")),
  );
}
