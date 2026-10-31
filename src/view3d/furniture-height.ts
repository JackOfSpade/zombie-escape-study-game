import type { FurnitureKind } from "../model";

const HEIGHT: Partial<Record<FurnitureKind, number>> = {
  chair: 0.48,
  officeChair: 0.48,
  armchair: 0.46,
  sofa: 0.46,
  desk: 0.8,
  table: 0.8,
  cafeTable: 0.76,
  coffeeTable: 0.42,
  reception: 1.05,
  fridge: 1.9,
  vending: 1.95,
  shelf: 1.8,
  cabinet: 1.15,
  drawers: 0.7,
  door: 2.35,
  gate: 2.4,
  whiteboard: 1.65,
  partition: 1.4,
  screen: 1.7,
  printer: 0.85,
  cooler: 0.9,
  coffeeMaker: 0.8,
  microwave: 0.8,
  plant: 0.42,
  box: 0.45,
};

/** Visible furniture height shared by meshes and target placement. */
export function furnitureHeight(kind: FurnitureKind) {
  return HEIGHT[kind] ?? 0.8;
}

/** Actual rendered top face for surface dressing, including tabletop thickness. */
export function furnitureSurfaceHeight(kind: FurnitureKind) {
  const height = furnitureHeight(kind);
  if (kind === "shelf") return height + 0.115;
  if (["desk", "table", "cafeTable", "coffeeTable", "reception"].includes(kind))
    return height + 0.05;
  return height;
}

/** Shelves fit between side panels; their upper board does not span the full body. */
export function furnitureSurfaceBounds(
  kind: FurnitureKind,
  w: number,
  d: number,
) {
  return { w: kind === "shelf" ? w * 0.84 : w, d };
}
