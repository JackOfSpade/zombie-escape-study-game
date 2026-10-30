import type { Floor, Point } from "../model";

export interface StreetProp extends Point {
  kind: "car" | "streetlight" | "cone" | "debris";
  w: number;
  h: number;
}
export interface StreetLayout {
  front: number;
  left: number;
  right: number;
  entrance: number;
  props: StreetProp[];
}

/** The footprint is authoritative; an arena or an upstairs stairwell is not a
 * street. The extra tile is the solid shell immediately outside the mask. */
export function outsideBuilding(floor: Floor, x: number, y: number) {
  const b = floor.boundary;
  if (!b) return false;
  const row = b.rows[Math.floor(y)];
  return !row || y < b.top || y >= b.bottom || x < row.left || x >= row.right;
}

/** All central outside cells are reserved, including the full survivor arrival
 * queue. Decoration may occupy only blocked cells immediately beyond the lane. This
 * deliberately reserves more space than a single shortest entrance path. */
export function clearStreetEdge(
  floor: Floor,
  prop: Pick<StreetProp, "x" | "y" | "w" | "h">,
) {
  const b = floor.boundary;
  if (
    !b ||
    floor.index !== 0 ||
    prop.w <= 0 ||
    prop.h <= 0 ||
    !Number.isFinite(prop.x) ||
    !Number.isFinite(prop.y) ||
    !Number.isFinite(prop.w) ||
    !Number.isFinite(prop.h)
  )
    return false;
  const x0 = Math.floor(prop.x - prop.w / 2 + 1e-7),
    x1 = Math.floor(prop.x + prop.w / 2 - 1e-7),
    y0 = Math.floor(prop.y - prop.h / 2 + 1e-7),
    y1 = Math.floor(prop.y + prop.h / 2 - 1e-7);
  for (let y = y0; y <= y1; y++) {
    if (y <= b.bottom) return false;
    const row = floor.tiles[y];
    if (!row) return false;
    let left = -1,
      right = -1;
    for (let x = 0; x < row.length; x++)
      if (row[x] === 0 && outsideBuilding(floor, x + 0.5, y + 0.5)) {
        if (left < 0) left = x;
        right = x;
      }
    // Do not decorate a narrow portal or a disconnected open cell.
    if (right - left < 5) return false;
    for (let x = x0; x <= x1; x++)
      if (
        row[x] === undefined ||
        row[x] === 0 ||
        !outsideBuilding(floor, x + 0.5, y + 0.5) ||
        (x !== left - 1 && x !== right + 1)
      )
        return false;
  }
  return true;
}

export function streetLayout(floor: Floor): StreetLayout | undefined {
  const b = floor.boundary;
  if (!b || floor.index !== 0) return undefined;
  const front = b.bottom,
    shell = floor.tiles[front],
    row = floor.tiles[front + 1],
    outline = b.rows[front - 1];
  if (!shell || !row || !outline) return undefined;
  const entrance = floor.furniture.find((o) => o.id === "main-gate")?.x ?? 22;
  // Require a real continuous opening from the building into the outside lane.
  const ix = Math.floor(entrance);
  if (shell[ix] !== 0 || row[ix] !== 0) return undefined;
  const open = row.flatMap((tile, x) => (tile === 0 ? [x] : []));
  if (open.length < 6) return undefined;
  const left = open[0] + 0.5,
    right = open[open.length - 1] + 0.5,
    props: StreetProp[] = [];
  const add = (
    kind: StreetProp["kind"],
    x: number,
    y: number,
    w: number,
    h: number,
  ) => {
    const prop = { kind, x, y, w, h };
    if (clearStreetEdge(floor, prop)) props.push(prop);
  };
  for (const x of [left - 1, right + 1]) {
    add("streetlight", x, front + 1.55, 0.22, 0.22);
    add("car", x, front + 3.5, 0.88, 2.7);
    add("cone", x, front + 5.55, 0.26, 0.26);
    add("debris", x, front + 1.9, 0.45, 0.18);
  }
  return {
    front,
    left: outline.left - 1,
    right: outline.right + 1,
    entrance,
    props,
  };
}

/** Nonwalkable cells beyond the building used to become huge 2.8 m masses.
 * Keep the actual one-cell shell and internal walls. The street edge receives
 * visible guardrails in the dressing, where those solid cells still block play. */
export function exteriorWallTiles(floor: Floor) {
  if (!streetLayout(floor)) return floor.tiles;
  const b = floor.boundary!;
  return floor.tiles.map((row, y) =>
    row.map((tile, x) => {
      if (!tile || !outsideBuilding(floor, x + 0.5, y + 0.5)) return tile;
      // Preserve the collision surround of the carved ascending stairwell too.
      // Its two open rows extend farther north than the ordinary shell.
      if (y < b.top && y >= b.top - 3 && x >= 20 && x <= 23) return tile;
      for (let yy = y - 1; yy <= y + 1; yy++) {
        const edge = b.rows[yy];
        if (
          edge &&
          yy >= b.top &&
          yy < b.bottom &&
          x >= edge.left - 1 &&
          x <= edge.right
        )
          return tile;
      }
      return 0;
    }),
  );
}
