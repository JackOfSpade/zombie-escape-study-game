import { readFileSync } from "node:fs";
import { step } from "../src/engine";
import { createGame } from "../src/world";
const r = JSON.parse(readFileSync("public/curriculum.json", "utf8"));
const g = createGame(Number(process.argv[2] ?? 11), r);
g.status = "playing";
g.survivors[0].escaped = true;
for (let i = 0; i < 1800; i++) {
  step(g, 0.1);
  if (i % 300 === 299)
    console.log(
      JSON.stringify({
        time: g.time,
        actors: g.survivors
          .slice(1)
          .filter((a) => a.role === "builder")
          .map((a) => ({
            name: a.name,
            alive: a.alive,
            activity: a.activity,
            x: a.x,
            y: a.y,
            intent: a.intent,
            path: a.path.slice(0, 2),
            handling: a.handling,
          })),
        objects: g.floors[0].furniture
          .filter((o) => o.kind === "shelf")
          .map((o) => ({
            id: o.id,
            x: o.x,
            y: o.y,
            moved: o.moved,
            credit: o.credited,
            hp: o.hp,
          })),
        doors: g.floors[0].furniture
          .filter((o) => o.kind === "door")
          .map((o) => ({ id: o.id, open: o.open, hp: o.hp })),
      }),
    );
}
