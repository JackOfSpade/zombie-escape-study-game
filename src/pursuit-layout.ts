import {
  type Game,
  type Floor,
  type Furniture,
  type Point,
  H,
  W,
  rand,
} from "./model";
import { carveStairwells } from "./stairwell";
/** Fresh force-field floors have no corridor around their study rooms.
 * Each complete transverse room is a cut between the rear entry and front stairs. */
export function pursuitLayout(g: Game, f: Floor) {
  if (f.index === 4 || !f.stations.length) return;
  const random = { rng: (g.seed ^ Math.imul(f.index + 1, 0x6d2b79f5)) >>> 0 };
  // Allocate the available depth instead of independently rolling room sizes:
  // every stage keeps a usable interior and the stair/entry lobbies stay connected.
  const depths = [5, 4, 4, 4];
  for (let spare = 3; spare > 0; spare--)
    depths[Math.floor(rand(random) * depths.length)]++;
  let rearWall = 25;
  const stages = [2, 3, 0, 1].map((room, i) => {
    const stage = { room, rear: rearWall, front: rearWall - depths[i] };
    rearWall = stage.front;
    return stage;
  });
  const bounds = stages.map(() => ({
    left: 2 + Math.floor(rand(random) * 4),
    right: 42 - Math.floor(rand(random) * 4),
  }));
  f.layout = "pursuit";
  f.generation = {
    version: 3,
    upperDivider: stages[2].front,
    lowerDivider: stages[0].front,
    stages,
  };
  f.tiles = Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) =>
      x >= 2 && x < 42 && y >= 2 && y < 28 ? 0 : 1,
    ),
  );
  for (const row of [stages[0].rear, ...stages.map((s) => s.front)])
    for (let x = 2; x < 42; x++) f.tiles[row][x] = 1;
  // Vary room widths independently. These side recesses never connect stages;
  // the entire transverse boundary remains solid except at its force fields.
  for (const [i, stage] of stages.entries())
    for (let y = stage.front + 1; y < stage.rear; y++)
      for (let x = 2; x < 42; x++)
        if (x < bounds[i].left || x >= bounds[i].right) f.tiles[y][x] = 1;
  f.entry = { x: 21.5, y: 26.5 };
  f.stairs = { x: 21.5, y: 3.5 };
  // Staircases are real wells in the north and south boundary walls.
  carveStairwells(f);
  f.rooms = [0, 1, 2, 3].map((index) => ({
    index,
    side: index % 2 === 0 ? ("left" as const) : ("right" as const),
  }));
  f.doors = [];
  const originalMain = f.furniture.find((o) => o.id === "main-gate");
  f.furniture = [];
  const add = (
    id: string,
    point: Point,
    w: number,
    h: number,
    entrance?: number,
  ) => {
    for (
      let y = Math.floor(point.y - h / 2);
      y < Math.ceil(point.y + h / 2);
      y++
    )
      for (
        let x = Math.floor(point.x - w / 2);
        x < Math.ceil(point.x + w / 2);
        x++
      )
        f.tiles[y][x] = 0;
    const publicEntry = entrance === 2;
    const o: Furniture = {
      id,
      floor: f.index,
      kind: "door",
      ...point,
      w,
      h,
      hp: entrance === undefined ? 900 : 1200,
      maxHp: entrance === undefined ? 900 : 1200,
      speed: 0,
      rotation: 0,
      destroyed: false,
      movers: [],
      moved: 0,
      credited: [],
      turning: 0,
      open: false,
      angle: 0,
      initial: { ...point, w, h },
      field: {
        authorized: [],
        crossing: [],
        sides: {},
        used: 0,
        exit: entrance === undefined,
        ...(publicEntry
          ? { publicEntry: true }
          : entrance !== undefined
            ? { limit: 3 + ((g.seed + f.index + entrance) % 3), direction: -1 }
            : {}),
      },
    };
    f.furniture.push(o);
    return o;
  };
  // Entry quotas remain optional openings. Credentialed forward exits are independent.
  // Adjacent stages share a wall, but their entry and exit occupy opposite
  // halves of it. Each pair is rolled separately, avoiding a repeated hallway.
  const exits = stages.map((stage) => ({
    x:
      stage.room === 1
        ? 21.5
        : 7.5 + Math.floor(rand(random) * 7) + (rand(random) < 0.5 ? 0 : 23),
    y: stage.front + 0.5,
  }));
  for (const [i, stage] of stages.entries()) {
    const previousExit = exits[i - 1];
    const entry = {
      x:
        i === 0
          ? 21.5
          : 7.5 + Math.floor(rand(random) * 7) + (previousExit.x < 22 ? 23 : 0),
      y: stage.rear + 0.5,
    };
    const exit = exits[i];
    f.doors[stage.room] = entry;
    add(`f${f.index}-room${stage.room}-door`, entry, 3, 1, stage.room);
    add(`f${f.index}-room${stage.room}-forward`, exit, 3, 1);
    Object.assign(f.rooms[stage.room], {
      forwardEntry: entry,
      forwardExit: exit,
    });
  }
  if (f.index === 0) {
    for (let y = 29; y < H; y++)
      for (let x = 18; x <= 25; x++) f.tiles[y][x] = 0;
    const main = add("main-gate", { x: 22, y: 28.5 }, 4, 1);
    main.hp = main.maxHp = originalMain?.maxHp ?? 600;
    main.field!.exit = false;
  }
  // The first free hall has an independent one-use terminal for everyone, plus spares.
  const prefix = `f${f.index}-room2`,
    rear = f.stations.filter(
      (s) => g.encounters[s.encounter].questionRoom === prefix,
    );
  const template = g.encounters[rear[0].encounter];
  for (let i = rear.length; i < g.survivors.length + 4; i++) {
    const id = `${prefix}-pursuit${i}`;
    g.encounters[id] = {
      ...structuredClone(template),
      id,
      questionRoom: prefix,
    };
    const station = { id: `${id}-station`, encounter: id, x: 0, y: 0 };
    f.stations.push(station);
    rear.push(station);
  }
  for (const [index, stage] of stages.entries()) {
    const stations = f.stations.filter(
      (s) =>
        g.encounters[s.encounter].questionRoom ===
        `f${f.index}-room${stage.room}`,
    );
    const { left, right } = bounds[index];
    const columns = stage.room === 2 ? 12 : 3 + Math.floor(rand(random) * 4);
    const rows = Math.ceil(stations.length / columns);
    const slots = Array.from({ length: rows * columns }, (_, i) => i);
    // Shuffle assignment, not independent coordinates: no terminal overlaps,
    // and every terminal retains room for physical work and circulation.
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(rand(random) * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
    const offset = rand(random) * 0.3 - 0.15;
    for (const [i, s] of stations.entries()) {
      const slot = slots[i];
      s.x =
        left + 1.5 + ((slot % columns) * (right - left - 3)) / (columns - 1);
      s.y =
        rows === 1
          ? (stage.front + 1 + stage.rear) / 2 + offset
          : stage.front +
            1.65 +
            (Math.floor(slot / columns) * (stage.rear - stage.front - 2.3)) /
              (rows - 1) +
            offset;
    }
  }
  const errors = pursuitLayoutErrors(g, f);
  if (errors.length)
    throw new Error(`Invalid pursuit floor ${f.index}: ${errors.join("; ")}`);
}

/** Validate actual generated tiles, openings and destinations before publishing
 * a fresh floor. No learning state or physics engine is involved. */
export function pursuitLayoutErrors(g: Game, f: Floor): string[] {
  const errors: string[] = [];
  const stages = f.generation?.stages;
  if (!stages?.length) return ["missing stages"];
  const fields = f.furniture.filter((o) => o.field);
  const covers = (o: Furniture, x: number, y: number) =>
    Math.abs(x + 0.5 - o.x) < o.w / 2 && Math.abs(y + 0.5 - o.y) < o.h / 2;
  for (const row of [stages[0].rear, ...stages.map((s) => s.front)])
    for (let x = 0; x < W; x++)
      if (
        !f.tiles[row][x] &&
        fields.filter((o) => covers(o, x, row)).length !== 1
      )
        errors.push(`uncovered or overlapping opening ${x},${row}`);
  const flood = (start: Point, blocked: Furniture[]) => {
    const seen = new Set<number>();
    const queue = [{ x: Math.floor(start.x), y: Math.floor(start.y) }];
    for (let i = 0; i < queue.length; i++) {
      const { x, y } = queue[i],
        key = y * W + x;
      if (
        x < 0 ||
        x >= W ||
        y < 0 ||
        y >= H ||
        seen.has(key) ||
        f.tiles[y][x] ||
        blocked.some((o) => covers(o, x, y))
      )
        continue;
      seen.add(key);
      queue.push(
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 },
      );
    }
    return seen;
  };
  const contains = (seen: Set<number>, p: Point) =>
    seen.has(Math.floor(p.y) * W + Math.floor(p.x));
  const entries = fields.filter((o) => /-room\d-door$/.test(o.id));
  const egress = flood(f.stairs, entries);
  const freeStudy = flood(
    f.entry,
    fields.filter((o) => !o.field!.publicEntry),
  );
  let freeCount = 0;
  for (const s of f.stations) {
    if (!contains(egress, s))
      errors.push(`no credentialed egress from ${s.id}`);
    if (contains(freeStudy, s)) freeCount++;
    for (const dx of [-0.45, 0.45])
      for (const dy of [-0.45, 0.45])
        if (f.tiles[Math.floor(s.y + dy)]?.[Math.floor(s.x + dx)] !== 0)
          errors.push(`terminal lacks clearance ${s.id}`);
  }
  for (let i = 0; i < f.stations.length; i++)
    for (const other of f.stations.slice(i + 1))
      if (
        Math.hypot(f.stations[i].x - other.x, f.stations[i].y - other.y) < 1.4
      )
        errors.push(`overlapping study space ${f.stations[i].id}/${other.id}`);
  if (freeCount < g.survivors.length)
    errors.push("insufficient zero-key terminals");
  // Removing any occupied stage must sever every rear-to-stairs path.
  for (const stage of stages) {
    const cut: Furniture = {
      ...fields[0],
      x: 22,
      y: (stage.front + 1 + stage.rear) / 2,
      w: 40,
      h: stage.rear - stage.front - 1,
    };
    if (contains(flood(f.entry, [cut]), f.stairs))
      errors.push(`bypass around room ${stage.room}`);
  }
  return errors;
}
