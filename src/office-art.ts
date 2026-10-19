import type { Floor, Furniture, FurnitureKind } from "./model";
import { H, W } from "./model";

/** Procedural top-down office art. Floors, walls and every furniture kind are
 * painted once into cached canvases and reused each frame, so the per-frame
 * cost is a few drawImage calls. Sources and techniques: docs/OFFICE_ART.md. */
export type Theme = "normal" | "mutation";
interface Materials {
  carpet: [string, string];
  carpetAlt: [string, string];
  fibre: string;
  lino: [string, string];
  seam: string;
  concrete: string;
  roof: string;
  wallTop: string;
  wallEdge: string;
  wallShadow: string;
  wood: string;
  woodDark: string;
  laminate: string;
  metal: string;
  metalDark: string;
  white: string;
  fabric: string;
  fabricDark: string;
  screen: string;
  leaf: string;
  leafDark: string;
  pot: string;
  water: string;
  outline: string;
}
const MATERIALS: Record<Theme, Materials> = {
  normal: {
    carpet: ["#2f3b48", "#35424f"],
    carpetAlt: ["#3a3644", "#403b4b"],
    fibre: "rgba(210,225,240,0.07)",
    lino: ["#55574f", "#5b5d55"],
    seam: "rgba(20,24,22,0.35)",
    concrete: "#3b3e3d",
    roof: "#45484a",
    wallTop: "#5c6466",
    wallEdge: "#8b9493",
    wallShadow: "rgba(8,12,14,0.45)",
    wood: "#8a6a4a",
    woodDark: "#5e4631",
    laminate: "#b9ae98",
    metal: "#8e989c",
    metalDark: "#5d666a",
    white: "#dfe4e2",
    fabric: "#55667a",
    fabricDark: "#3d4a59",
    screen: "#1b2a33",
    leaf: "#4f9a53",
    leafDark: "#2f6a3a",
    pot: "#a2583a",
    water: "#6fb4e0",
    outline: "#22201e",
  },
  mutation: {
    carpet: ["#3a2a48", "#42304f"],
    carpetAlt: ["#4a2d43", "#52334a"],
    fibre: "rgba(250,220,200,0.08)",
    lino: ["#5a4c5c", "#625363"],
    seam: "rgba(20,10,24,0.4)",
    concrete: "#3e3344",
    roof: "#4a3e4e",
    wallTop: "#6b5068",
    wallEdge: "#a48a80",
    wallShadow: "rgba(16,6,20,0.5)",
    wood: "#9a6a5c",
    woodDark: "#6a4440",
    laminate: "#c4a49a",
    metal: "#a08e9e",
    metalDark: "#6a5868",
    white: "#ecdccc",
    fabric: "#7a5670",
    fabricDark: "#583c52",
    screen: "#2a1830",
    leaf: "#a6a84a",
    leafDark: "#6e6a30",
    pot: "#b0604a",
    water: "#d08ad8",
    outline: "#24161e",
  },
};
const PX = 40; // terrain pixels per world unit
const SPRITE_PX = 64;

// Deterministic per-cell noise so textures are stable across frames and reloads.
function hash(x: number, y: number, seed: number) {
  let h = Math.imul(x * 374761393 + y * 668265263 + seed * 1442695041, 1);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

type Zone = "carpet" | "carpetAlt" | "lino" | "concrete" | "roof";
/** Which floor finish a cell has: carpeted rooms, vinyl circulation, outside paving. */
export function floorZone(f: Floor, x: number, y: number): Zone {
  if (f.index === 4) return "roof";
  if (x < 2 || x >= 42 || y < 2 || y >= 28) return "concrete";
  const stages = f.generation?.version === 3 ? f.generation.stages : undefined;
  if (stages) {
    const i = stages.findIndex((s) => y > s.front && y < s.rear);
    if (i < 0) return "lino";
    return i % 2 ? "carpetAlt" : "carpet";
  }
  if (x >= 17 && x <= 26) return "lino";
  return y < 15 ? "carpet" : "carpetAlt";
}

function paintFloorCell(
  c: CanvasRenderingContext2D,
  m: Materials,
  zone: Zone,
  x: number,
  y: number,
  seed: number,
) {
  const px = x * PX,
    py = y * PX;
  if (zone === "carpet" || zone === "carpetAlt") {
    // 50 cm carpet tiles laid quarter-turned, the common commercial pattern.
    const [a, b] = m[zone];
    for (let j = 0; j < 2; j++)
      for (let i = 0; i < 2; i++) {
        const turned = (x * 2 + i + y * 2 + j) % 2 === 0;
        c.fillStyle = turned ? a : b;
        c.fillRect(px + (i * PX) / 2, py + (j * PX) / 2, PX / 2, PX / 2);
        c.strokeStyle = m.fibre;
        c.lineWidth = 1;
        c.beginPath();
        for (let k = 1; k < 5; k++) {
          const o = (k * PX) / 10;
          if (turned) {
            c.moveTo(px + (i * PX) / 2 + o, py + (j * PX) / 2 + 2);
            c.lineTo(px + (i * PX) / 2 + o, py + (j * PX) / 2 + PX / 2 - 2);
          } else {
            c.moveTo(px + (i * PX) / 2 + 2, py + (j * PX) / 2 + o);
            c.lineTo(px + (i * PX) / 2 + PX / 2 - 2, py + (j * PX) / 2 + o);
          }
        }
        c.stroke();
      }
    c.fillStyle = m.seam;
    c.fillRect(px, py, PX, 1);
    c.fillRect(px, py, 1, PX);
    return;
  }
  if (zone === "lino") {
    // Vinyl composition tile: 1 m squares, slightly varied, with chip speckle.
    c.fillStyle = m.lino[(x + y) % 2];
    c.fillRect(px, py, PX, PX);
    for (let k = 0; k < 14; k++) {
      const r = hash(x * 31 + k, y * 17 + k, seed);
      c.fillStyle = r > 0.5 ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.12)";
      c.fillRect(
        px + hash(x, y * 7 + k, seed + 3) * PX,
        py + hash(x * 5 + k, y, seed + 9) * PX,
        2,
        2,
      );
    }
    c.fillStyle = m.seam;
    c.fillRect(px, py, PX, 1);
    c.fillRect(px, py, 1, PX);
    return;
  }
  c.fillStyle = zone === "roof" ? m.roof : m.concrete;
  c.fillRect(px, py, PX, PX);
  for (let k = 0; k < 22; k++) {
    c.fillStyle =
      hash(x + k, y * 3, seed) > 0.5
        ? "rgba(255,255,255,0.05)"
        : "rgba(0,0,0,0.1)";
    c.fillRect(
      px + hash(x * 3, y + k, seed) * PX,
      py + hash(x, y * 11 + k, seed + 1) * PX,
      zone === "roof" ? 2 : 3,
      zone === "roof" ? 2 : 1,
    );
  }
  if (zone === "concrete" && x % 4 === 0) {
    c.fillStyle = m.seam;
    c.fillRect(px, py, 1, PX);
  }
}

let terrain:
  { key: string; canvas: HTMLCanvasElement; floor: Floor } | undefined;
/** Whole-floor floor/wall texture, rebuilt only when walls or the theme change. */
export function terrainCanvas(f: Floor, theme: Theme, seed: number) {
  const key = `${f.index}/${theme}/${seed}/${f.generation?.version ?? 0}/${f.tiles.map((r) => r.join("")).join("")}`;
  if (terrain?.key === key) return terrain.canvas;
  const canvas = terrain?.canvas ?? document.createElement("canvas");
  canvas.width = W * PX;
  canvas.height = H * PX;
  const c = canvas.getContext("2d")!,
    m = MATERIALS[theme];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (!f.tiles[y][x]) paintFloorCell(c, m, floorZone(f, x, y), x, y, seed);
  const solidAt = (x: number, y: number) =>
    x < 0 || y < 0 || x >= W || y >= H || !!f.tiles[y][x];
  // Wall caps with a lit rim on faces that border a room, and a soft contact
  // shadow cast onto the floor along the wall's south and east faces.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!f.tiles[y][x]) continue;
      const px = x * PX,
        py = y * PX;
      c.fillStyle = m.wallTop;
      c.fillRect(px, py, PX, PX);
      c.fillStyle = "rgba(255,255,255,0.04)";
      if ((x + y) % 2) c.fillRect(px, py, PX, PX);
      c.fillStyle = m.wallEdge;
      const rim = 3;
      if (!solidAt(x, y - 1)) c.fillRect(px, py, PX, rim);
      if (!solidAt(x, y + 1)) c.fillRect(px, py + PX - rim, PX, rim);
      if (!solidAt(x - 1, y)) c.fillRect(px, py, rim, PX);
      if (!solidAt(x + 1, y)) c.fillRect(px + PX - rim, py, rim, PX);
      c.fillStyle = m.wallShadow;
      if (!solidAt(x, y + 1)) c.fillRect(px, py + PX, PX, PX * 0.12);
      if (!solidAt(x + 1, y)) c.fillRect(px + PX, py, PX * 0.12, PX);
    }
  terrain = { key, canvas, floor: f };
  return canvas;
}

// ---------------------------------------------------------------------------
// Furniture sprites, drawn in local units centred on the object (w along x).

type Painter = (
  c: CanvasRenderingContext2D,
  m: Materials,
  w: number,
  h: number,
) => void;
const rect = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  stroke?: string,
  line = 0.03,
) => {
  c.fillStyle = fill;
  c.fillRect(x, y, w, h);
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = line;
    c.strokeRect(x, y, w, h);
  }
};
const round = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke?: string,
) => {
  c.beginPath();
  c.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = 0.03;
    c.stroke();
  }
};
const disc = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill: string,
) => {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
};
const BOOKS = [
  "#a8423a",
  "#3c6e9e",
  "#d0a443",
  "#4d8a5a",
  "#7a4f8f",
  "#c9c2b0",
];
const PAINTERS: Record<FurnitureKind, Painter> = {
  chair(c, m, w, h) {
    // Four-legged stacking chair: seat pad and backrest along its north edge.
    for (const [x, y] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ])
      disc(c, x * (w / 2 - 0.08), y * (h / 2 - 0.08), 0.05, m.metalDark);
    round(
      c,
      -w / 2 + 0.08,
      -h / 2 + 0.14,
      w - 0.16,
      h - 0.2,
      0.08,
      m.fabric,
      m.outline,
    );
    round(
      c,
      -w / 2 + 0.06,
      -h / 2 + 0.02,
      w - 0.12,
      0.16,
      0.05,
      m.woodDark,
      m.outline,
    );
  },
  officeChair(c, m, w, h) {
    // Five-star caster base under a round seat and curved back.
    c.strokeStyle = m.metalDark;
    c.lineWidth = 0.06;
    c.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      c.moveTo(0, 0);
      c.lineTo(Math.cos(a) * w * 0.47, Math.sin(a) * h * 0.47);
    }
    c.stroke();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      disc(c, Math.cos(a) * w * 0.47, Math.sin(a) * h * 0.47, 0.045, m.outline);
    }
    disc(c, 0, 0.03, Math.min(w, h) * 0.33, m.fabricDark);
    disc(c, 0, 0.03, Math.min(w, h) * 0.26, m.fabric);
    c.beginPath();
    c.arc(0, 0.05, Math.min(w, h) * 0.4, Math.PI * 1.15, Math.PI * 1.85);
    c.strokeStyle = m.outline;
    c.lineWidth = 0.13;
    c.stroke();
  },
  desk(c, m, w, h) {
    // Laminate desktop with a monitor, keyboard, mouse, papers and a mug.
    round(c, -w / 2, -h / 2, w, h, 0.05, m.laminate, m.outline);
    rect(c, -w / 2, -h / 2, w, 0.06, m.woodDark);
    const s = Math.min(1, w / 2.2);
    rect(c, -0.45 * s, -h / 2 + 0.1, 0.9 * s, 0.12, m.outline);
    rect(c, -0.42 * s, -h / 2 + 0.12, 0.84 * s, 0.06, m.screen);
    rect(c, -0.08, -h / 2 + 0.22, 0.16, 0.1, m.metalDark);
    round(c, -0.32 * s, -h / 2 + 0.42, 0.64 * s, 0.18, 0.03, m.metalDark);
    disc(c, 0.42 * s, -h / 2 + 0.5, 0.05, m.metalDark);
    if (w > 1.4) {
      c.save();
      c.translate(-w / 2 + 0.38, h / 2 - 0.3);
      c.rotate(-0.2);
      rect(c, -0.15, -0.2, 0.3, 0.38, m.white, m.metal, 0.015);
      c.restore();
      disc(c, w / 2 - 0.3, h / 2 - 0.28, 0.08, m.white);
      disc(c, w / 2 - 0.3, h / 2 - 0.28, 0.05, m.woodDark);
    }
  },
  table(c, m, w, h) {
    // Meeting table: rounded veneer top, grain, cable port and notepads.
    round(c, -w / 2, -h / 2, w, h, 0.35, m.wood, m.outline);
    c.strokeStyle = m.woodDark;
    c.lineWidth = 0.015;
    c.beginPath();
    for (let i = 1; i < 6; i++) {
      const y = -h / 2 + (i * h) / 6;
      c.moveTo(-w / 2 + 0.3, y);
      c.bezierCurveTo(-w / 6, y + 0.04, w / 6, y - 0.04, w / 2 - 0.3, y);
    }
    c.stroke();
    round(c, -0.25, -0.08, 0.5, 0.16, 0.08, m.metalDark);
    for (const x of [-w / 3, 0, w / 3])
      for (const y of [-h / 2 + 0.22, h / 2 - 0.42])
        rect(c, x - 0.12, y, 0.24, 0.2, m.white, m.metal, 0.012);
  },
  sofa(c, m, w, h) {
    // Lobby sofa: back along north edge, arms at both ends, seat cushions.
    round(c, -w / 2, -h / 2, w, h, 0.12, m.fabricDark, m.outline);
    const arm = Math.min(0.25, w * 0.1);
    const seats = Math.max(1, Math.round((w - arm * 2) / 0.85));
    const sw = (w - arm * 2) / seats;
    for (let i = 0; i < seats; i++)
      round(
        c,
        -w / 2 + arm + i * sw + 0.03,
        -h / 2 + 0.3,
        sw - 0.06,
        h - 0.36,
        0.08,
        m.fabric,
        m.outline,
      );
    round(c, -w / 2 + arm, -h / 2 + 0.04, w - arm * 2, 0.24, 0.08, m.fabric);
  },
  fridge(c, m, w, h) {
    // Break-room fridge from above: enamel top, hinge side and rear vent grille.
    round(c, -w / 2, -h / 2, w, h, 0.06, m.white, m.outline);
    rect(c, -w / 2 + 0.06, -h / 2 + 0.06, w - 0.12, 0.16, m.metal);
    c.strokeStyle = m.metalDark;
    c.lineWidth = 0.02;
    c.beginPath();
    for (let x = -w / 2 + 0.12; x < w / 2 - 0.1; x += 0.08) {
      c.moveTo(x, -h / 2 + 0.08);
      c.lineTo(x, -h / 2 + 0.2);
    }
    c.stroke();
    rect(c, -w / 2, h / 2 - 0.08, w, 0.08, m.metal);
    rect(c, w / 2 - 0.16, h / 2 - 0.14, 0.08, 0.06, m.metalDark);
  },
  shelf(c, m, w, h) {
    // Tall bookcase: wooden carcass with rows of coloured spines and binders.
    rect(c, -w / 2, -h / 2, w, h, m.woodDark, m.outline);
    let x = -w / 2 + 0.08,
      i = 0;
    while (x < w / 2 - 0.1) {
      const bw = 0.06 + ((i * 7) % 5) * 0.02;
      rect(
        c,
        x,
        -h / 2 + 0.1,
        Math.min(bw, w / 2 - 0.08 - x),
        h * 0.55,
        BOOKS[(i * 5) % BOOKS.length],
      );
      x += bw + 0.01;
      i++;
    }
    rect(c, -w / 2 + 0.05, -h / 2 + 0.1 + h * 0.58, w - 0.1, 0.05, m.wood);
    for (let k = 0; k < Math.floor(w / 0.7); k++)
      rect(
        c,
        -w / 2 + 0.15 + k * 0.7,
        h / 2 - 0.28,
        0.5,
        0.18,
        m.white,
        m.metal,
        0.012,
      );
  },
  cabinet(c, m, w, h) {
    // Steel filing cabinet: drawer lips and handles on the front (south) face.
    rect(c, -w / 2, -h / 2, w, h, m.metal, m.outline);
    rect(
      c,
      -w / 2 + 0.05,
      -h / 2 + 0.05,
      w - 0.1,
      h - 0.18,
      "rgba(255,255,255,0.12)",
    );
    rect(c, -w / 2, h / 2 - 0.1, w, 0.1, m.metalDark);
    rect(c, -0.12, h / 2 - 0.08, 0.24, 0.05, m.white);
    rect(c, -w / 2 + 0.1, -h / 2 + 0.12, 0.3, 0.2, m.white, m.metal, 0.01);
  },
  cooler(c, m, w, h) {
    // Water cooler: square cabinet topped by a big blue bottle.
    rect(c, -w / 2, -h / 2, w, h, m.white, m.outline);
    const r = Math.min(w, h) * 0.38;
    disc(c, 0, 0, r, m.water);
    disc(c, -r * 0.3, -r * 0.3, r * 0.35, "rgba(255,255,255,0.35)");
    disc(c, 0, 0, r * 0.32, m.metal);
    rect(c, -w / 2 + 0.06, h / 2 - 0.1, 0.1, 0.06, "#c64a3a");
    rect(c, w / 2 - 0.16, h / 2 - 0.1, 0.1, 0.06, "#3a6ac6");
  },
  plant(c, m, w, h) {
    // Potted office plant: terracotta rim with radiating leaves.
    const r = Math.min(w, h) / 2;
    disc(c, 0, 0, r * 0.62, m.pot);
    disc(c, 0, 0, r * 0.5, m.woodDark);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + (i % 2) * 0.3;
      c.save();
      c.rotate(a);
      c.beginPath();
      c.ellipse(r * 0.45, 0, r * 0.5, r * 0.16, 0, 0, Math.PI * 2);
      c.fillStyle = i % 2 ? m.leaf : m.leafDark;
      c.fill();
      c.restore();
    }
    disc(c, 0, 0, r * 0.18, m.leaf);
  },
  printer(c, m, w, h) {
    // Multifunction printer: grey body, scanner lid, output paper and panel.
    round(c, -w / 2, -h / 2, w, h, 0.06, m.metal, m.outline);
    round(
      c,
      -w / 2 + 0.06,
      -h / 2 + 0.06,
      w * 0.7,
      h - 0.12,
      0.04,
      m.metalDark,
    );
    rect(c, -w / 2 + 0.14, -h / 2 + 0.14, w * 0.55, h - 0.32, m.white);
    rect(c, w / 2 - 0.26, -h / 2 + 0.1, 0.18, h - 0.2, m.screen);
    disc(c, w / 2 - 0.17, h / 2 - 0.2, 0.03, "#5ee07a");
    disc(c, w / 2 - 0.17, -h / 2 + 0.2, 0.03, "#e0b45e");
  },
  whiteboard(c, m, w, h) {
    // Mobile whiteboard from above: aluminium frame, marker tray and caster feet.
    for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) {
      rect(c, x - 0.04, -h / 2, 0.08, h, m.metalDark);
      disc(c, x, -h / 2 + 0.04, 0.04, m.outline);
      disc(c, x, h / 2 - 0.04, 0.04, m.outline);
    }
    rect(c, -w / 2 + 0.04, -0.07, w - 0.08, 0.14, m.white, m.metal, 0.03);
    rect(c, -w / 2 + 0.3, 0.07, w - 0.6, 0.05, m.metal);
    for (const [x, color] of [
      [-0.2, "#2f6fd0"],
      [0, "#d03a2f"],
      [0.2, "#222"],
    ] as const)
      rect(c, x - 0.06, 0.075, 0.12, 0.035, color);
  },
  partition(c, m, w, h) {
    // Cubicle panel: fabric core with aluminium end caps and top rail.
    rect(c, -w / 2, -h / 2, w, h, m.fabric, m.outline);
    rect(c, -w / 2, -0.02, w, 0.04, m.metal);
    rect(c, -w / 2, -h / 2, 0.08, h, m.metal);
    rect(c, w / 2 - 0.08, -h / 2, 0.08, h, m.metal);
  },
  door(c, m, w, h) {
    // Solid-core office door leaf with a lever handle.
    rect(c, -w / 2, -h / 2, w, h, m.wood, m.outline);
    rect(c, -w / 2 + 0.06, -h / 2 + 0.06, w - 0.12, h - 0.12, m.woodDark);
    rect(c, -w / 2 + 0.1, -h / 2 + 0.1, w - 0.2, h - 0.2, m.wood);
    const long = h >= w;
    disc(c, long ? 0 : w / 2 - 0.2, long ? h / 2 - 0.2 : 0, 0.06, m.metal);
  },
  gate(c, m, w, h) {
    // Glass entrance doors in an aluminium frame.
    rect(c, -w / 2, -h / 2, w, h, m.metalDark, m.outline);
    rect(
      c,
      -w / 2 + 0.08,
      -h / 2 + 0.08,
      w - 0.16,
      h - 0.16,
      "rgba(140,190,210,0.55)",
    );
    rect(c, -0.02, -h / 2, 0.04, h, m.metal);
  },
};

const sprites = new Map<string, HTMLCanvasElement>();
/** A cached sprite of one furniture kind at one footprint and theme. */
export function furnitureSprite(o: Furniture, theme: Theme) {
  const key = `${o.kind}/${o.w.toFixed(2)}/${o.h.toFixed(2)}/${theme}`;
  let sprite = sprites.get(key);
  if (sprite) return sprite;
  if (sprites.size > 256) sprites.clear();
  sprite = document.createElement("canvas");
  const pad = 0.1;
  sprite.width = Math.ceil((o.w + pad * 2) * SPRITE_PX);
  sprite.height = Math.ceil((o.h + pad * 2) * SPRITE_PX);
  const c = sprite.getContext("2d")!;
  c.scale(SPRITE_PX, SPRITE_PX);
  c.translate(o.w / 2 + pad, o.h / 2 + pad);
  // Drop shadow gives props height against the floor.
  c.fillStyle = "rgba(0,0,0,0.35)";
  c.fillRect(-o.w / 2 + 0.06, -o.h / 2 + 0.08, o.w, o.h);
  (PAINTERS[o.kind] ?? PAINTERS.desk)(c, MATERIALS[theme], o.w, o.h);
  sprites.set(key, sprite);
  return sprite;
}
export function drawFurniture(
  ctx: CanvasRenderingContext2D,
  o: Furniture,
  theme: Theme,
) {
  ctx.drawImage(
    furnitureSprite(o, theme),
    -o.w / 2 - 0.1,
    -o.h / 2 - 0.1,
    o.w + 0.2,
    o.h + 0.2,
  );
}
/** Broken pieces in the object's own colours, scattered deterministically. */
export function drawDebris(
  ctx: CanvasRenderingContext2D,
  o: Furniture,
  theme: Theme,
) {
  const m = MATERIALS[theme],
    colors: Partial<Record<FurnitureKind, string>> = {
      fridge: m.white,
      cabinet: m.metal,
      printer: m.metal,
      plant: m.leaf,
      cooler: m.water,
      whiteboard: m.white,
      partition: m.fabric,
      sofa: m.fabric,
      officeChair: m.fabric,
      table: m.wood,
      shelf: m.woodDark,
    };
  ctx.fillStyle = colors[o.kind] ?? m.laminate;
  const n = 6 + Math.round(o.w * o.h * 2);
  for (let i = 0; i < n; i++) {
    const seed = o.id.length * 97 + i;
    ctx.save();
    ctx.translate(
      o.x + (hash(seed, 1, 7) - 0.5) * o.w,
      o.y + (hash(seed, 2, 7) - 0.5) * o.h,
    );
    ctx.rotate(hash(seed, 3, 7) * Math.PI);
    ctx.fillRect(-0.08, -0.03, 0.06 + hash(seed, 4, 7) * 0.18, 0.06);
    ctx.restore();
  }
}
/** Office workstation at a terminal: a short desk with a glowing monitor. */
export function drawWorkstation(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  theme: Theme,
) {
  const m = MATERIALS[theme];
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x - 0.52, y - 0.36, 1.08, 0.82);
  ctx.fillStyle = m.laminate;
  ctx.fillRect(x - 0.55, y - 0.42, 1.1, 0.8);
  ctx.strokeStyle = m.outline;
  ctx.lineWidth = 0.03;
  ctx.strokeRect(x - 0.55, y - 0.42, 1.1, 0.8);
}
