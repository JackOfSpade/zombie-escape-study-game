import {
  BoxGeometry,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { CONFIG, type Floor } from "../model";
import { FLOOR_HEIGHT } from "../stair-route";
import { outsideBuilding } from "./exterior-layout";

export interface PerimeterWindow {
  x: number;
  z: number;
  /** Direction along the window opening. */
  axis: "x" | "z";
  /** Outward direction along the other horizontal axis. */
  normal: -1 | 1;
}

function inside(floor: Floor, x: number, z: number) {
  return !outsideBuilding(floor, x + 0.5, z + 0.5);
}

/** Only the one-cell outer shell belongs to the facade. Interior partitions
 * and the collision grid remain authoritative and are never edited here. */
export function isPerimeterWall(floor: Floor, x: number, z: number) {
  return (
    !!floor.boundary &&
    !!floor.tiles[z]?.[x] &&
    !inside(floor, x, z) &&
    [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ].some(([dx, dz]) => inside(floor, x + dx, z + dz))
  );
}

export function perimeterWindows(floor: Floor): PerimeterWindow[] {
  if (!floor.boundary || floor.index === CONFIG.floors) return [];
  const windows: PerimeterWindow[] = [];
  for (let z = 0; z < floor.tiles.length; z++)
    for (let x = 0; x < floor.tiles[z].length; x++) {
      if (!isPerimeterWall(floor, x, z)) continue;
      const neighbors = [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
      ].filter(([dx, dz]) => inside(floor, x + dx, z + dz));
      if (neighbors.length !== 1) continue;
      const [dx, dz] = neighbors[0];
      // A window opens onto a usable room, never onto the back of a partition.
      if (floor.tiles[z + dz]?.[x + dx] !== 0) continue;
      // Corner piers remain solid and give the building a structural rhythm.
      if (
        dx
          ? !isPerimeterWall(floor, x, z - 1) ||
            !isPerimeterWall(floor, x, z + 1)
          : !isPerimeterWall(floor, x - 1, z) ||
            !isPerimeterWall(floor, x + 1, z)
      )
        continue;
      windows.push({
        x: x + 0.5,
        z: z + 0.5,
        axis: dx ? "z" : "x",
        normal: -(dx || dz) as -1 | 1,
      });
    }
  return windows;
}

/** A persistent whole-building facade. Every storey is present from the street
 * and every real window is an opening through the entire shell thickness. */
export class BuildingShell {
  readonly group = new Group();
  private structure = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
  });
  private frames = new MeshStandardMaterial({
    color: "#263e48",
    roughness: 0.55,
    metalness: 0.4,
  });
  private glass = new MeshStandardMaterial({
    color: "#9ab5bd",
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    roughness: 0.3,
    metalness: 0.05,
  });
  private tint = new Color();

  constructor() {
    this.group.name = "building-shell";
  }

  build(floors: Floor[]) {
    this.clear();
    this.group.visible = !!floors[0]?.boundary;
    if (!this.group.visible) return;
    const walls: BufferGeometry[] = [],
      frames: BufferGeometry[] = [],
      glass: BufferGeometry[] = [];
    const box = (
      out: BufferGeometry[],
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      color?: string,
    ) => {
      const geometry = new BoxGeometry(w, h, d).translate(x, y, z);
      if (color) {
        this.tint.set(color);
        const values = new Float32Array(
          geometry.getAttribute("position").count * 3,
        );
        for (let i = 0; i < values.length; i += 3) this.tint.toArray(values, i);
        geometry.setAttribute("color", new Float32BufferAttribute(values, 3));
      }
      out.push(geometry);
    };
    for (const floor of floors) {
      if (!floor.boundary) continue;
      const base = floor.index * FLOOR_HEIGHT,
        roof = floor.index === CONFIG.floors;
      const windows = new Map(
        perimeterWindows(floor).map((w) => [`${w.x}/${w.z}`, w]),
      );
      for (let z = 0; z < floor.tiles.length; z++)
        for (let x = 0; x < floor.tiles[z].length; x++) {
          if (!isPerimeterWall(floor, x, z)) continue;
          const cx = x + 0.5,
            cz = z + 0.5,
            window = windows.get(`${cx}/${cz}`);
          const color = roof
            ? "#8d9694"
            : (x + z) % 7 === 0
              ? "#657779"
              : "#7e8987";
          if (roof) {
            box(walls, cx, base + 0.46, cz, 1, 0.92, 1, color);
            box(walls, cx, base + 0.96, cz, 1.06, 0.08, 1.06, "#b0b5a7");
            continue;
          }
          if (!window) box(walls, cx, base + 1.4, cz, 1, 2.8, 1, color);
          else {
            const alongX = window.axis === "x";
            box(walls, cx, base + 0.425, cz, 1, 0.85, 1, color);
            box(walls, cx, base + 2.575, cz, 1, 0.45, 1, color);
            for (const side of [-1, 1]) {
              box(
                walls,
                cx + (alongX ? side * 0.46 : 0),
                base + 1.6,
                cz + (alongX ? 0 : side * 0.46),
                alongX ? 0.08 : 1,
                1.5,
                alongX ? 1 : 0.08,
                color,
              );
              box(
                frames,
                cx + (alongX ? side * 0.4 : 0),
                base + 1.6,
                cz + (alongX ? 0 : side * 0.4),
                alongX ? 0.035 : 0.08,
                1.5,
                alongX ? 0.08 : 0.035,
              );
            }
            for (const height of [0.89, 2.31])
              box(
                frames,
                cx,
                base + height,
                cz,
                alongX ? 0.84 : 0.12,
                0.055,
                alongX ? 0.12 : 0.84,
              );
            box(
              glass,
              cx,
              base + 1.6,
              cz,
              alongX ? 0.79 : 0.025,
              1.35,
              alongX ? 0.025 : 0.79,
            );
            // Projecting sill catches the cold sky light from inside.
            box(
              frames,
              cx,
              base + 0.855,
              cz,
              alongX ? 0.92 : 1.12,
              0.055,
              alongX ? 1.12 : 0.92,
            );
          }
          box(walls, cx, base + 3.2, cz, 1.04, 0.8, 1.04, "#465e68");
        }
      if (!roof) {
        // Open stair/entrance portals still have continuous floor beams above
        // them, rather than a black vertical slot through every storey.
        const southWidth = floor.index === 0 ? 4 : 2;
        box(
          walls,
          22,
          base + 3.2,
          floor.boundary.bottom + 0.5,
          southWidth,
          0.8,
          1.04,
          "#465e68",
        );
        box(
          walls,
          22,
          base + 3.2,
          floor.boundary.top - 0.5,
          2,
          0.8,
          1.04,
          "#465e68",
        );
      }
      // Thin floor plates reveal the true storey spacing without populating
      // undiscovered interiors or creating another active simulation.
      for (let z = floor.boundary.top; z < floor.boundary.bottom; z++) {
        const row = floor.boundary.rows[z];
        box(
          walls,
          (row.left + row.right) / 2,
          // Structure sits below the finished floor (-0.025), rather than
          // hiding it or competing with its texture in the depth buffer.
          base - 0.2,
          z + 0.5,
          row.right - row.left,
          0.2,
          1,
          "#4c5c60",
        );
      }
    }
    this.merge(walls, this.structure, "facade-structure");
    this.merge(frames, this.frames, "facade-window-frames");
    this.merge(glass, this.glass, "facade-glazing");
  }

  private merge(
    parts: BufferGeometry[],
    material: MeshStandardMaterial,
    name: string,
  ) {
    if (!parts.length) return;
    const mesh = new Mesh(mergeGeometries(parts)!, material);
    for (const part of parts) part.dispose();
    mesh.name = name;
    this.group.add(mesh);
  }

  private clear() {
    for (const child of [...this.group.children]) {
      (child as Mesh).geometry.dispose();
      child.removeFromParent();
    }
  }

  dispose() {
    this.clear();
    this.structure.dispose();
    this.frames.dispose();
    this.glass.dispose();
  }
}
