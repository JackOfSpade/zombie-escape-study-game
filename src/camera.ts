import type { Point } from "./model";
// A stable scale gives the complete maximum sight circle room on every side.
// Camera framing does not change sight distance, opacity or world coordinates.
// Zoom combines the display-size preference and any spectator magnification.
export function camera(width: number, height: number, focus: Point, zoom = 1) {
  const scale = (Math.min(width, height) / 24) * zoom;
  return {
    scale,
    ox: width / 2 - focus.x * scale,
    oy: height / 2 - focus.y * scale,
  };
}
