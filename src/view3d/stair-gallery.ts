import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { type Game } from "../model";
import {
  buildStairRoute,
  cityStairBase,
  STAIR_ROUTE_WIDTH,
} from "../stair-route";

/** A closed concrete foundation fills the lowest flight down to the street.
 * Its upper slope stays inside the tread boxes; recessed sides and ends avoid
 * duplicate planes while leaving all twenty walking surfaces uncovered. */
export function buildCityStairFoundation(game: Game) {
  const base = cityStairBase(game);
  if (!base) return undefined;
  const inset = 0.005,
    length = base.h - inset * 2,
    geometry = new BoxGeometry(base.w - 0.02, 1, length),
    positions = geometry.getAttribute("position"),
    color = new Color("#61736d"),
    colors = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const z = base.start.y + inset + positions.getZ(i) + length / 2;
    positions.setXYZ(
      i,
      base.x + positions.getX(i),
      positions.getY(i) > 0 ? ((z - base.start.y) / base.h) * base.rise : -0.06,
      z,
    );
    color.toArray(colors, i * 3);
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}

/** The visible structure uses the exact route used by the walking motor. */
export class StairGallery {
  readonly group = new Group();
  private concrete = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.87,
  });
  private metal = new MeshStandardMaterial({
    color: "#8caaa6",
    roughness: 0.6,
    metalness: 0.3,
  });
  private glass = new MeshStandardMaterial({
    color: "#88b2b7",
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    roughness: 0.4,
  });
  private signs: MeshBasicMaterial[] = [];
  private tint = new Color();
  constructor() {
    this.group.name = "continuous-stair-gallery";
  }

  build(game: Game) {
    this.clear();
    if (!game.floors[0]?.boundary) return;
    const decks: BufferGeometry[] = [],
      rails: BufferGeometry[] = [],
      glazing: BufferGeometry[] = [],
      supports: BufferGeometry[] = [],
      columns = new Map<string, { x: number; z: number; top: number }>();
    const box = (
      out: BufferGeometry[],
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      color?: string,
      angle = 0,
    ) => {
      const g = new BoxGeometry(w, h, d).rotateY(angle).translate(x, y, z);
      if (color) {
        this.tint.set(color);
        const c = new Float32Array(g.getAttribute("position").count * 3);
        for (let i = 0; i < c.length; i += 3) this.tint.toArray(c, i);
        g.setAttribute("color", new Float32BufferAttribute(c, 3));
      }
      out.push(g);
    };
    for (let level = 0; level < game.floors.length - 1; level++) {
      const floor = game.floors[level],
        next = game.floors[level + 1];
      const route = buildStairRoute(game, {
        fromFloor: level,
        toFloor: level + 1,
        origin: floor.stairs,
        destination: next.entry,
        until: 0,
      });
      for (let i = 0; i < route.points.length - 1; i++) {
        const a = route.points[i],
          b = route.points[i + 1],
          dx = b.x - a.x,
          dz = b.z - a.z,
          run = Math.hypot(dx, dz),
          rise = b.y - a.y,
          groundCourt = level === 0 && !!floor.city && rise === 0,
          angle = -Math.atan2(dz, dx),
          nx = run ? -dz / run : 0,
          nz = run ? dx / run : 1,
          steps = rise ? 20 : 1;
        if (run < 0.01) continue;
        const previous = route.points[i - 1],
          following = route.points[i + 2],
          turnsAtStart =
            previous &&
            Math.abs((a.x - previous.x) * dz - (a.z - previous.z) * dx) > 0.01,
          turnsAtEnd =
            following &&
            Math.abs(dx * (following.z - b.z) - dz * (following.x - b.x)) >
              0.01;
        for (let j = 0; j < steps; j++) {
          // A corner landing owns its square. Trim adjoining level decks to
          // its edge instead of drawing two differently colored top faces in
          // exactly the same plane. Treads end at the next segment's edge too.
          const start = !rise && turnsAtStart ? 0.95 : 0,
            end = !rise && turnsAtEnd ? run - 0.95 : run,
            deckRun = end - start,
            t = (start + (deckRun * (j + 0.5)) / steps) / run,
            y = a.y + (rise * (j + 1)) / steps;
          box(
            decks,
            a.x + dx * t,
            y - 0.1,
            a.z + dz * t,
            deckRun / steps,
            0.2,
            STAIR_ROUTE_WIDTH + 0.12,
            j % 2 ? "#7c8c87" : "#8e9b91",
            angle,
          );
          if (rise)
            box(
              rails,
              a.x + (dx * (j + 1)) / steps,
              y + 0.008,
              a.z + (dz * (j + 1)) / steps,
              0.035,
              0.016,
              STAIR_ROUTE_WIDTH,
              undefined,
              angle,
            );
        }
        // Railed glass keeps the city visible. Posts and rails follow the
        // continuous slope; flat landings leave open connections at each end.
        const guardStart = turnsAtStart ? Math.min(0.49, 0.96 / run) : 0,
          guardEnd = turnsAtEnd ? Math.max(0.51, 1 - 0.96 / run) : 1,
          guardRun = run * (guardEnd - guardStart),
          sections = Math.max(1, Math.ceil(guardRun / 1.5));
        // These lowest flat walks are now ordinary public court paving. A
        // ground-level glass fence would imply a barrier the city does not own.
        for (let j = 0; !groundCourt && j <= sections; j++) {
          const t = guardStart + ((guardEnd - guardStart) * j) / sections,
            y = a.y + rise * t;
          for (const side of [-1, 1])
            box(
              rails,
              a.x + dx * t + nx * side * 0.81,
              y + 0.58,
              a.z + dz * t + nz * side * 0.81,
              0.055,
              1.16,
              0.055,
            );
        }
        for (let j = 0; !groundCourt && j < sections; j++) {
          const t =
              guardStart + ((guardEnd - guardStart) * (j + 0.5)) / sections,
            y = a.y + rise * t;
          for (const side of [-1, 1]) {
            const x = a.x + dx * t + nx * side * 0.81,
              z = a.z + dz * t + nz * side * 0.81;
            const rail = new BoxGeometry(
              guardRun / sections + 0.04,
              0.055,
              0.055,
            )
              .rotateZ(Math.atan2(rise, run))
              .rotateY(angle)
              .translate(x, y + 1.14, z);
            rails.push(rail);
            box(
              glazing,
              x,
              y + 0.52,
              z,
              Math.max(0.05, guardRun / sections - 0.08),
              0.92,
              0.018,
              undefined,
              angle,
            );
          }
        }
        // Corner landings cover the turn without a step or a loading seam.
        if (turnsAtStart) {
          box(decks, a.x, a.y - 0.1, a.z, 1.9, 0.2, 1.9, "#87988e");
          // The two sides without an incoming/outgoing passage close the
          // outside corner while leaving the actual walking turn unobstructed.
          const prevRun = Math.hypot(a.x - previous.x, a.z - previous.z),
            closed = [
              {
                x: (a.x - previous.x) / prevRun,
                z: (a.z - previous.z) / prevRun,
              },
              { x: -dx / run, z: -dz / run },
            ];
          for (const side of closed) {
            if (groundCourt) continue;
            // Ground-level city access is a real third opening on this
            // landing, rather than a walking motor passing through glass.
            if (level === 0 && floor.city && i === 2 && side.z < -0.5) continue;
            const groundFlight = level === 0 && !!floor.city && i === 2,
              cornerRun = groundFlight ? 0.9 : 1.85,
              cx = a.x + side.x * 0.9,
              cz = a.z + side.z * 0.9 + (groundFlight ? 0.45 : 0),
              cornerAngle = Math.atan2(-side.x, side.z);
            box(
              rails,
              cx,
              a.y + 1.14,
              cz,
              cornerRun,
              0.055,
              0.055,
              undefined,
              cornerAngle,
            );
            box(
              glazing,
              cx,
              a.y + 0.52,
              cz,
              cornerRun - 0.1,
              0.92,
              0.018,
              undefined,
              cornerAngle,
            );
          }
        }
      }
      const north = route.points[1],
        east = route.points[2],
        south = route.points[5];
      for (const p of [east, route.points[4]]) {
        // Columns belong at the outside edge, not through the walking line.
        // One continuous column serves stacked landings and ends under the
        // highest deck, avoiding duplicated faces and flush colored tops.
        const x = p.x + 0.98,
          top = p.y - 0.2,
          key = `${x}/${p.z}`;
        if (top > 0 && top > (columns.get(key)?.top ?? 0))
          columns.set(key, { x, z: p.z, top });
      }
      this.sign(
        north.x + 0.65,
        north.y + 1.6,
        north.z - 0.7,
        `FLOOR ${level + 2}  →`,
        "EMERGENCY STAIR / EAST GALLERY",
        0,
      );
      this.sign(
        south.x,
        south.y + 1.6,
        south.z + 0.75,
        `←  FLOOR ${level + 2}`,
        "RECEPTION / KEEP MOVING",
        Math.PI,
      );
    }
    for (const column of columns.values())
      box(
        supports,
        column.x,
        column.top / 2,
        column.z,
        0.2,
        column.top,
        0.2,
        "#4f6265",
      );
    const foundation = buildCityStairFoundation(game);
    if (foundation) {
      const mesh = new Mesh(foundation, this.concrete);
      mesh.name = "ground-stair-concrete-base";
      this.group.add(mesh);
      const base = cityStairBase(game)!;
      const signX = base.x + STAIR_ROUTE_WIDTH / 2 + 0.9;
      box(rails, signX, 0.85, base.start.y - 0.3, 0.06, 1.7, 0.06);
      this.sign(
        signX,
        1.5,
        base.start.y - 0.3,
        "PERSONAL STAIR ACCESS",
        "SOLVE A FLOOR TERMINAL BEFORE ASCENDING",
        Math.PI,
      );
    }
    this.merge(decks, this.concrete, "stair-decks-and-treads");
    this.merge(supports, this.concrete, "stair-support-columns");
    this.merge(rails, this.metal, "stair-handrails");
    this.merge(glazing, this.glass, "stair-glass-guards");
  }

  private sign(
    x: number,
    y: number,
    z: number,
    text: string,
    detail: string,
    yaw: number,
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#193f3b";
    c.fillRect(0, 0, 512, 128);
    c.strokeStyle = "#b4ccb3";
    c.lineWidth = 5;
    c.strokeRect(4, 4, 504, 120);
    c.fillStyle = "#e0e9cc";
    c.textAlign = "center";
    c.font = "bold 44px sans-serif";
    c.fillText(text, 256, 60);
    c.font = "18px sans-serif";
    c.fillText(detail, 256, 99);
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    const material = new MeshBasicMaterial({ map });
    this.signs.push(material);
    const sign = new Mesh(new PlaneGeometry(1.6, 0.4), material);
    sign.position.set(x, y, z);
    sign.rotation.y = yaw;
    this.group.add(sign);
  }

  private merge(
    parts: BufferGeometry[],
    material: MeshStandardMaterial,
    name: string,
  ) {
    if (!parts.length) return;
    const mesh = new Mesh(mergeGeometries(parts)!, material);
    for (const g of parts) g.dispose();
    mesh.name = name;
    this.group.add(mesh);
  }
  private clear() {
    for (const c of [...this.group.children]) {
      (c as Mesh).geometry.dispose();
      c.removeFromParent();
    }
    for (const m of this.signs) {
      m.map?.dispose();
      m.dispose();
    }
    this.signs.length = 0;
  }
  dispose() {
    this.clear();
    this.concrete.dispose();
    this.metal.dispose();
    this.glass.dispose();
  }
}
