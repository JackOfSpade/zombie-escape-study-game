import { stairContactCues } from "./zombie-stairs";
import { camera } from "./camera";
import { type Game, type Point, W, H, CONFIG, distance } from "./model";
import { human, nearestFurniture } from "./engine";
import { canPlace } from "./spatial";
import { canSee, sightRadius, visibilityPolygon } from "./visibility";
const normal = {
  ground: "#1b2c2e",
  grid: "#213537",
  wall: "#354547",
  edge: "#536361",
  ink: "#d6e4d8",
  accent: "#6ff2b2",
  terminal: "#54cec7",
  danger: "#ef7865",
  furniture: "#9a8065",
  sky: "#0b1418",
  dim: "#121e22",
};
const mutation = {
  ground: "#2b2338",
  grid: "#392c47",
  wall: "#53405a",
  edge: "#887068",
  ink: "#f9e6bc",
  accent: "#e9c76e",
  terminal: "#e4a0e4",
  danger: "#ff7585",
  furniture: "#b18478",
  sky: "#160f24",
  dim: "#20162e",
};
let lightCanvas: HTMLCanvasElement | undefined;
export function render(canvas: HTMLCanvasElement, g: Game, grab = false) {
  const ctx = canvas.getContext("2d")!,
    dpr = Math.min(devicePixelRatio || 1, 2),
    rect = canvas.getBoundingClientRect();
  if (
    canvas.width !== Math.floor(rect.width * dpr) ||
    canvas.height !== Math.floor(rect.height * dpr)
  ) {
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const p = g.surge.state === "active" ? mutation : normal;
  ctx.fillStyle = p.sky;
  ctx.fillRect(0, 0, rect.width, rect.height);
  const a = human(g),
    { scale, ox, oy } = camera(rect.width, rect.height, a);
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  const f = g.floors[a.floor],
    radius = sightRadius(f);
  const visible = (pt: Point) => canSee(f, a, pt, radius);
  const polygon = visibilityPolygon(f, a, radius);
  // Clip the entire live world, including glow, nameplates, previews and effects.
  // Previously explored geometry is remembered internally but never drawn as
  // current vision through an obstacle or beyond the finite viewing radius.
  ctx.save();
  ctx.beginPath();
  polygon.forEach((p, i) =>
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
  );
  ctx.closePath();
  ctx.clip();
  // Terrain memory does not expose live occupants. Perception is identical in both palettes.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const pt = { x: x + 0.5, y: y + 0.5 },
        vis = visible(pt),
        id = `tile-${a.floor}-${x}-${y}`;
      if (vis && !a.seen.includes(id)) a.seen.push(id);
      if (distance(a, pt) > radius + 1) continue;
      ctx.globalAlpha = 1;
      if (f.tiles[y][x]) {
        ctx.fillStyle = p.wall;
        ctx.fillRect(x, y, 1, 1);
        ctx.fillStyle = p.edge;
        ctx.fillRect(x, y, 1, 0.08);
      } else {
        ctx.fillStyle = p.ground;
        ctx.fillRect(x, y, 1, 1);
        ctx.strokeStyle = p.grid;
        ctx.lineWidth = 0.025;
        ctx.strokeRect(x, y, 1, 1);
        if ((x * 13 + y * 7 + g.seed) % 27 === 0) {
          ctx.fillStyle = p.grid;
          ctx.fillRect(x + 0.2, y + 0.2, 0.25, 0.05);
        }
      }
    }
  ctx.globalAlpha = 1;
  const label = (
    text: string,
    x: number,
    y: number,
    color = p.ink,
    size = 0.45,
  ) => {
    ctx.fillStyle = color;
    ctx.font = `500 ${size}px ui-monospace,monospace`;
    ctx.textAlign = "center";
    ctx.fillText(text, x, y);
  };
  if (a.floor === CONFIG.floors) {
    if (visible({ x: 21.5, y: 10.5 })) {
      ctx.strokeStyle = p.accent;
      ctx.lineWidth = 0.15;
      ctx.beginPath();
      ctx.arc(21.5, 10.5, 3.8, 0, Math.PI * 2);
      ctx.stroke();
      label("H", 21.5, 11.4, p.accent, 2.5);
      if (g.time < g.helicopter.until) {
        ctx.fillStyle = p.edge;
        ctx.fillRect(17.8, 8.5, 7.4, 1.5);
        ctx.fillStyle = p.ink;
        ctx.fillRect(21, 5.5, 0.3, 8);
        label(`${4 - g.helicopter.passengers.length} SEATS`, 21.5, 14.7);
      }
    }
  } else if (visible(f.stairs)) {
    ctx.fillStyle = p.edge;
    for (let i = 0; i < 5; i++)
      ctx.fillRect(f.stairs.x - 1, f.stairs.y - 1 + i * 0.33, 2, 0.14);
    label(
      a.access.includes(a.floor) ? "↑ ACCESS GRANTED" : "↑ PERSONAL ACCESS",
      f.stairs.x,
      f.stairs.y + 1.6,
      a.access.includes(a.floor) ? p.accent : p.danger,
      0.42,
    );
  }
  if (a.floor > 0 && visible(f.entry)) {
    ctx.fillStyle = p.edge;
    for (let i = 0; i < 5; i++)
      ctx.fillRect(f.entry.x - 1, f.entry.y - 1 + i * 0.33, 2, 0.14);
    label("↓ RETURN", f.entry.x, f.entry.y + 1.6, p.ink, 0.38);
  }
  for (const room of f.rooms ?? []) {
    const mouth = room.innerMouth;
    if (mouth) {
      const labelPoint = {
        x: mouth.x + (room.side === "left" ? -2 : 2),
        y: mouth.y - 2,
      };
      if (visible(labelPoint))
        label("INNER ARCHIVE", labelPoint.x, labelPoint.y, p.ink, 0.3);
    }
  }
  for (const s of f.stations) {
    if (!visible(s)) continue;
    const e = g.encounters[s.encounter];
    ctx.fillStyle = "#101b20";
    ctx.fillRect(s.x - 0.5, s.y - 0.35, 1, 0.7);
    ctx.fillStyle = e.state === "consumed" ? p.edge : p.terminal;
    ctx.shadowColor = p.terminal;
    ctx.shadowBlur = e.state === "consumed" ? 0 : 8;
    ctx.fillRect(s.x - 0.32, s.y - 0.3, 0.64, 0.35);
    ctx.shadowBlur = 0;
    ctx.fillStyle = p.furniture;
    ctx.fillRect(s.x - 0.48, s.y + 0.25, 0.96, 0.14);
    if (distance(a, s) < 2)
      label(
        e.state === "consumed"
          ? "E · RECORD"
          : `E · ${e.mode === "shared" ? "SHARED" : "SOLO"} ${e.reward === "loot" ? "CACHE" : "ACCESS"}`,
        s.x,
        s.y - 0.8,
        p.terminal,
        0.38,
      );
  }
  for (const o of f.furniture) {
    if (!canSee(f, a, o, radius, o.id)) continue;
    if (o.kind === "gate" && o.turning < 0) continue;
    const x = o.x - o.w / 2,
      y = o.y - o.h / 2;
    if (o.destroyed) {
      ctx.strokeStyle = p.furniture;
      ctx.lineWidth = 0.06;
      for (let n = 0; n < 5; n++) {
        ctx.beginPath();
        ctx.moveTo(x + n * 0.3, y + 0.2);
        ctx.lineTo(x + n * 0.3 + 0.2, y + 0.6);
        ctx.stroke();
      }
      continue;
    }
    if (o.kind === "door" && o.open) {
      ctx.strokeStyle = p.furniture;
      ctx.lineWidth = 0.12;
      ctx.beginPath();
      ctx.moveTo(o.x - 0.45, o.y - o.h / 2);
      ctx.lineTo(o.x + 1.2, o.y - o.h / 2);
      ctx.stroke();
      if (distance(a, o) < 1.9)
        label("E · CLOSE DOOR", a.x, a.y - 0.9, p.ink, 0.35);
      continue;
    }
    const damage = 1 - o.hp / o.maxHp;
    ctx.save();
    ctx.translate(o.x, o.y);
    if (
      !g.settings.reducedFlash &&
      o.hp < o.maxHp &&
      Math.sin(g.time * 16 + o.x) > 0.5
    )
      ctx.translate(Math.sin(g.time * 39) * 0.025, 0);
    ctx.fillStyle = p.furniture;
    ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
    ctx.strokeStyle = "#382f2b";
    ctx.lineWidth = 0.07;
    ctx.strokeRect(-o.w / 2 + 0.1, -o.h / 2 + 0.1, o.w - 0.2, o.h - 0.2);
    if (o.kind === "shelf")
      for (let i = 1; i < 5; i++) {
        ctx.fillStyle = i % 2 ? p.wall : p.edge;
        ctx.fillRect(-o.w / 2 + (i * o.w) / 6, -o.h / 2 + 0.15, 0.1, o.h - 0.3);
      }
    if (damage > 0.2) {
      ctx.strokeStyle = p.sky;
      ctx.beginPath();
      ctx.moveTo(-o.w / 3, -o.h / 2);
      ctx.lineTo(0.1, 0);
      ctx.lineTo(-0.1, o.h / 3);
      ctx.stroke();
    }
    if (damage > 0.65) {
      ctx.beginPath();
      ctx.moveTo(o.w / 3, -o.h / 2);
      ctx.lineTo(-0.2, 0.1);
      ctx.lineTo(o.w / 4, o.h / 2);
      ctx.stroke();
    }
    ctx.restore();
    if (o.kind === "door" && distance(a, o) < 1.9)
      label("E · OPEN DOOR", a.x, a.y - 0.9, p.ink, 0.35);
  }
  for (const e of g.effects) {
    if (e.until <= g.time || e.floor !== a.floor || !visible(e)) continue;
    ctx.strokeStyle = e.kind === "bubble" ? p.terminal : p.accent;
    ctx.globalAlpha = g.settings.reducedFlash
      ? 0.3
      : 0.3 + Math.sin(g.time * 3) * 0.1;
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const s of g.survivors) {
    if (s.floor !== a.floor || s.escaped || !visible(s)) continue;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.fillStyle = s.alive
      ? s.id === "human"
        ? p.accent
        : "#b5c6cf"
      : p.danger;
    ctx.beginPath();
    ctx.arc(0, 0, s.id === "human" ? 0.3 : 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = s.id === "human" ? p.ink : p.wall;
    ctx.lineWidth = 0.1;
    ctx.beginPath();
    ctx.moveTo(s.heading.x * 0.1, s.heading.y * 0.1);
    ctx.lineTo(s.heading.x * 0.55, s.heading.y * 0.55);
    ctx.stroke();
    if (s.id === "human") {
      ctx.strokeStyle = p.accent;
      ctx.lineWidth = 0.04;
      ctx.beginPath();
      ctx.arc(
        0,
        0,
        0.6 + (g.settings.reducedFlash ? 0 : Math.sin(g.time * 3) * 0.04),
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
    ctx.restore();
    if (s.id !== "human" && distance(a, s) < 5)
      label(s.name, s.x, s.y - 0.6, p.ink, 0.4);
  }
  for (const z of g.zombies) {
    if (z.floor !== a.floor || z.hp <= 0 || !visible(z)) continue;
    ctx.fillStyle = z.stagger > 0 ? p.edge : p.danger;
    ctx.beginPath();
    ctx.arc(z.x, z.y, 0.29, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = p.danger;
    ctx.lineWidth = 0.13;
    ctx.beginPath();
    ctx.moveTo(z.x - 0.4, z.y - 0.35);
    ctx.lineTo(z.x + 0.4, z.y + 0.35);
    ctx.stroke();
    ctx.fillStyle = p.ink;
    ctx.fillRect(z.x - 0.1, z.y - 0.12, 0.07, 0.05);
  }
  for (const contact of stairContactCues(g, a, radius)) {
    ctx.strokeStyle = p.danger;
    ctx.lineWidth = 0.08;
    ctx.globalAlpha = g.settings.reducedFlash ? 0.55 : 0.9;
    for (const offset of [-0.2, 0, 0.2]) {
      ctx.beginPath();
      ctx.moveTo(contact.position.x + offset - 0.1, contact.position.y - 0.25);
      ctx.lineTo(contact.position.x + offset + 0.1, contact.position.y + 0.2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // Ray-cast light polygon stops at occluders; dark floors stay dark during mutation.
  lightCanvas ??= document.createElement("canvas");
  lightCanvas.width = canvas.width;
  lightCanvas.height = canvas.height;
  const lc = lightCanvas.getContext("2d")!;
  lc.scale(dpr, dpr);
  lc.fillStyle = `rgba(0,0,0,${f.dark > 0.8 ? 0.78 : 0.47})`;
  lc.fillRect(0, 0, rect.width, rect.height);
  lc.translate(ox, oy);
  lc.scale(scale, scale);
  lc.globalCompositeOperation = "destination-out";
  const lights = [
    { x: a.x, y: a.y, r: radius },
    ...g.effects
      .filter(
        (e) => e.kind === "flare" && e.until > g.time && e.floor === a.floor,
      )
      .map((e) => ({ x: e.x, y: e.y, r: e.radius })),
  ];
  for (const light of lights) {
    lc.beginPath();
    const points = visibilityPolygon(f, light, light.r);
    points.forEach((p, i) =>
      i === 0 ? lc.moveTo(p.x, p.y) : lc.lineTo(p.x, p.y),
    );
    lc.closePath();
    const grad = lc.createRadialGradient(
      light.x,
      light.y,
      0,
      light.x,
      light.y,
      light.r,
    );
    grad.addColorStop(0, "rgba(255,255,255,.98)");
    grad.addColorStop(0.45, "rgba(255,255,255,.9)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    lc.fillStyle = grad;
    lc.fill();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(lightCanvas, 0, 0);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  const ob = nearestFurniture(g, a, grab);
  if (ob && distance(a, ob) < 2.8 && canSee(f, a, ob, radius, ob.id)) {
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 0.06;
    ctx.strokeRect(
      ob.x - ob.w / 2 - 0.1,
      ob.y - ob.h / 2 - 0.1,
      ob.w + 0.2,
      ob.h + 0.2,
    );
    label(
      `${ob.kind.toUpperCase()} · ${ob.hp / ob.maxHp < 0.3 ? "CRACKING" : ob.hp < ob.maxHp ? "DAMAGED" : "INTACT"}`,
      ob.x,
      ob.y - ob.h / 2 - 0.4,
      p.ink,
      0.38,
    );
    if (grab) {
      const target = {
        x: ob.x + a.heading.x * 0.6,
        y: ob.y + a.heading.y * 0.6,
      };
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = canPlace(f, ob, target) ? p.accent : p.danger;
      ctx.fillRect(target.x - ob.w / 2, target.y - ob.h / 2, ob.w, ob.h);
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}
