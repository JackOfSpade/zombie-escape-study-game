import { fieldAllows } from "./force-fields";
import { drawBlood } from "./blood";
import { camera } from "./camera";
import { doorFrame } from "./doors";
import { human, nearestGrip } from "./engine";
import { CONFIG, distance, type Game, H, type Point, W } from "./model";
import { BODY_RADIUS } from "./physics";
import {
  drawDebris,
  drawFurniture,
  drawWorkstation,
  terrainCanvas,
} from "./office-art";
import { playerCanSee, sightRadius, visibilityPolygon } from "./visibility";
import { stairContactCues } from "./zombie-stairs";
const normal = {
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
export function render(canvas: HTMLCanvasElement, g: Game) {
  const ctx = canvas.getContext("2d")!,
    dpr = Math.min(devicePixelRatio || 1, 2),
    rect = canvas.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return;
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
  const visible = (pt: Point) => playerCanSee(f, a, pt, radius);
  const polygon = visibilityPolygon(f, a, radius);
  // Clip world geometry and effects. Labels for visible sources are drawn in a
  // separate overlay so their glyphs are not cut off at the visibility boundary.
  // Previously explored geometry is remembered internally but never drawn as
  // current vision through a wall or beyond the finite viewing radius.
  ctx.save();
  ctx.beginPath();
  polygon.forEach((p, i) =>
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
  );
  ctx.closePath();
  ctx.clip();
  const seen = new Set(a.seen);
  const theme = g.surge.state === "active" ? "mutation" : "normal";
  // Terrain memory does not expose live occupants. Perception is identical in both palettes.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const pt = { x: x + 0.5, y: y + 0.5 },
        id = `tile-${a.floor}-${x}-${y}`;
      if (!seen.has(id) && visible(pt)) {
        a.seen.push(id);
        seen.add(id);
      }
    }
  // Carpet, vinyl and wall textures are one cached image; the clip limits it to sight.
  ctx.drawImage(terrainCanvas(f, theme, g.seed), 0, 0, W, H);
  ctx.globalAlpha = 1;
  drawBlood(ctx, f);
  const healthBars: {
    x: number;
    y: number;
    width: number;
    health: number;
    color: string;
  }[] = [];
  const labels: {
    text: string;
    x: number;
    y: number;
    color: string;
    size: number;
  }[] = [];
  const label = (
    text: string,
    x: number,
    y: number,
    color = p.ink,
    size = 0.45,
  ) => {
    labels.push({ text, x, y, color, size });
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
    drawWorkstation(ctx, s.x, s.y, theme);
    ctx.fillStyle = "#101b20";
    ctx.fillRect(s.x - 0.4, s.y - 0.35, 0.8, 0.5);
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
    if (!playerCanSee(f, a, o, radius)) continue;
    if (o.kind === "gate" && o.turning < 0) continue;
    const x = o.x - o.w / 2,
      y = o.y - o.h / 2;
    if (o.destroyed) {
      drawDebris(ctx, o, theme);
      if (o.field && distance(a, o) < 3)
        label("FIELD BROKEN", o.x, y + o.h + 0.65, p.ink, 0.3);
      continue;
    }
    if (o.field) {
      if (o.destroyed) continue;
      const green = fieldAllows(o, a),
        color = green ? "#55ef9b" : "#ff6274",
        health = Math.max(0, Math.min(1, o.hp / Math.max(1, o.maxHp))),
        damage = 1 - health;
      ctx.save();
      ctx.globalAlpha = 0.08 + 0.18 * health;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, o.w, o.h);
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.07;
      ctx.strokeRect(x, y, o.w, o.h);
      if (damage > 0.1) {
        ctx.translate(o.x, o.y);
        const tall = o.h >= o.w,
          span = tall ? o.h : o.w,
          across = tall ? o.w : o.h;
        if (!tall) ctx.rotate(Math.PI / 2);
        ctx.strokeStyle = "#e3f7ee";
        ctx.lineWidth = 0.035;
        ctx.globalAlpha = 0.45 + damage * 0.45;
        for (let i = 0; i < Math.ceil(damage * 6); i++) {
          const yy = -span * 0.4 + (i / 6) * span * 0.8;
          ctx.beginPath();
          ctx.moveTo(-across * 0.43, yy);
          ctx.lineTo(-across * 0.1, yy + span * 0.035);
          ctx.lineTo(across * 0.12, yy - span * 0.03);
          ctx.lineTo(across * 0.43, yy + span * 0.02);
          ctx.stroke();
        }
      }
      ctx.restore();
      if (health < 1 || distance(a, o) < 3) {
        healthBars.push({
          x: o.x,
          y: y + o.h + 0.18,
          width: Math.max(1.6, Math.min(3.2, o.w + 0.8)),
          health,
          color: health <= 0.3 ? "#ffd166" : color,
        });
        label(
          `FIELD ${Math.ceil(health * 100)}%`,
          o.x,
          y + o.h + 0.8,
          color,
          0.28,
        );
      }
      if (distance(a, o) < 3) {
        const quota =
          o.field.limit === undefined
            ? ""
            : ` · ${Math.max(0, o.field.limit - o.field.used)} FREE ENTRIES`;
        label(
          green
            ? o.field.publicEntry
              ? f.generation?.version === 3
                ? "REAR STUDY HALL · FREE ENTRY"
                : "OPEN STUDY LAB · FREE ENTRY"
              : `PASS${quota}`
            : `RED FOR YOU · E: ${(a.keys ?? 0) > 0 ? "1 KEY" : "KEY REQUIRED"}${quota}`,
          o.x,
          y - 0.4,
          color,
          0.32,
        );
      }
      continue;
    }
    if (o.kind === "door" && o.open && !o.door) {
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
    ctx.rotate(o.angle ?? 0);
    if (
      !g.settings.reducedFlash &&
      o.hp < o.maxHp &&
      Math.sin(g.time * 16 + o.x) > 0.5
    )
      ctx.translate(Math.sin(g.time * 39) * 0.025, 0);
    drawFurniture(ctx, o, theme);
    if (damage > 0.2) {
      ctx.strokeStyle = p.sky;
      ctx.lineWidth = 0.07;
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
    if (
      (o.kind === "door" || (o.id === "main-gate" && o.turning === 0)) &&
      distance(a, doorFrame(o)) < 1.9
    )
      label(
        o.door && !o.door.latched
          ? "PUSH · E GRIP/PULL · SHUT TO LATCH"
          : "E · RELEASE LATCH",
        a.x,
        a.y - 0.9,
        p.ink,
        0.35,
      );
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
    ctx.arc(0, 0, BODY_RADIUS, 0, Math.PI * 2);
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
    ctx.fillStyle = "#96a534";
    ctx.beginPath();
    ctx.arc(z.x, z.y, BODY_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    const target = z.target ?? z.path[0];
    const heading = target
      ? Math.atan2(target.y - z.y, target.x - z.x)
      : Math.PI / 2;
    ctx.strokeStyle = p.wall;
    ctx.lineWidth = 0.1;
    ctx.beginPath();
    ctx.moveTo(z.x + Math.cos(heading) * 0.1, z.y + Math.sin(heading) * 0.1);
    ctx.lineTo(z.x + Math.cos(heading) * 0.55, z.y + Math.sin(heading) * 0.55);
    ctx.stroke();
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
  // Ray-cast player light stops only at walls; dark floors stay dark during mutation.
  lightCanvas ??= document.createElement("canvas");
  if (
    lightCanvas.width !== canvas.width ||
    lightCanvas.height !== canvas.height
  ) {
    lightCanvas.width = canvas.width;
    lightCanvas.height = canvas.height;
  }
  const lc = lightCanvas.getContext("2d")!;
  lc.setTransform(dpr, 0, 0, dpr, 0, 0);
  lc.globalCompositeOperation = "source-over";
  lc.clearRect(0, 0, rect.width, rect.height);
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
    const points =
      light === lights[0] ? polygon : visibilityPolygon(f, light, light.r);
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
  const ob =
    f.furniture.find((o) => o.id === a.grip?.object) ?? nearestGrip(g, a);
  if (ob && distance(a, ob) < 2.8 && playerCanSee(f, a, ob, radius)) {
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 0.06;
    ctx.save();
    ctx.translate(ob.x, ob.y);
    ctx.rotate(ob.angle ?? 0);
    ctx.strokeRect(-ob.w / 2 - 0.1, -ob.h / 2 - 0.1, ob.w + 0.2, ob.h + 0.2);
    ctx.restore();
    label(
      `${ob.kind.toUpperCase()} · ${ob.hp / ob.maxHp < 0.3 ? "CRACKING" : ob.hp < ob.maxHp ? "DAMAGED" : "INTACT"}`,
      ob.x,
      ob.y - ob.h / 2 - 0.4,
      p.ink,
      0.38,
    );
    label(
      a.grip
        ? "E · RELEASE / WASD · DRAG"
        : ob.kind === "door"
          ? ob.door?.latched
            ? "E · RELEASE LATCH"
            : "PUSH · E GRIP/PULL · SHUT TO LATCH"
          : "E · GRIP / SPACE · JUMP",
      ob.x,
      ob.y + ob.h / 2 + 0.6,
      p.accent,
      0.35,
    );
  }
  ctx.restore();
  // Visibility was checked at each source before queuing. Only text extends
  // beyond the fog mask; unseen entities still contribute no labels.
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.textAlign = "center";
  ctx.strokeStyle = p.sky;
  ctx.lineWidth = 0.07;
  ctx.lineJoin = "round";
  for (const bar of healthBars) {
    ctx.fillStyle = p.sky;
    ctx.fillRect(
      bar.x - bar.width / 2 - 0.04,
      bar.y - 0.04,
      bar.width + 0.08,
      0.22,
    );
    ctx.fillStyle = "#52636b";
    ctx.fillRect(bar.x - bar.width / 2, bar.y, bar.width, 0.14);
    ctx.fillStyle = bar.color;
    ctx.fillRect(bar.x - bar.width / 2, bar.y, bar.width * bar.health, 0.14);
  }
  for (const { text, x, y, color, size } of labels) {
    ctx.font = `500 ${size}px ui-monospace,monospace`;
    ctx.fillStyle = color;
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
  }
  ctx.restore();
}
