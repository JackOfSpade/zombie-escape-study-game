import { CONFIG, type Game, H, type Point, W } from "./model";
import { human } from "./engine";
/** A free-look over the live building after the human's run ends: which floor is
 * shown, where the camera is centred, and how far it is zoomed. The view is
 * page state only; it is never saved with the game. */
export interface SpectatorView {
  floor: number;
  focus: Point;
  zoom: number;
}
export const SPECTATOR_ZOOM = { min: 0.5, max: 2.5, step: 1.15 };
/** Spectating starts when the run ends, by death or extraction. */
export function spectating(g: Game) {
  return g.status === "dead" || g.status === "escaped";
}
export function clampView(view: SpectatorView): SpectatorView {
  // NaN falls back to a sensible value; infinities clamp like any overshoot.
  const num = (v: number, fallback: number) => (Number.isNaN(v) ? fallback : v);
  const bound = (v: number, lo: number, hi: number) =>
    Math.min(hi, Math.max(lo, v));
  return {
    floor: bound(Math.round(num(view.floor, 0)), 0, CONFIG.floors),
    zoom: bound(num(view.zoom, 1), SPECTATOR_ZOOM.min, SPECTATOR_ZOOM.max),
    focus: {
      x: bound(num(view.focus.x, W / 2), 0, W),
      y: bound(num(view.focus.y, H / 2), 0, H),
    },
  };
}
/** The view opens on the player's last position. */
export function initialView(g: Game): SpectatorView {
  const a = human(g);
  return clampView({ floor: a.floor, focus: { x: a.x, y: a.y }, zoom: 1 });
}
export function floorTitle(floor: number) {
  return floor === CONFIG.floors
    ? "ROOFTOP / EXTRACTION"
    : `FLOOR ${String(floor + 1).padStart(2, "0")} / ${CONFIG.floors}`;
}
/** Buttons for every level, ground floor first, rooftop last. */
export function spectatorFloors() {
  return Array.from({ length: CONFIG.floors + 1 }, (_, floor) => ({
    floor,
    label: floor === CONFIG.floors ? "ROOF" : String(floor + 1),
    title: floorTitle(floor),
  }));
}
