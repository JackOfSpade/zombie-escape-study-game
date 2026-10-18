import { readFileSync } from "node:fs";
import test from "node:test";
import { compoundEgress } from "../scripts/lib/compound-egress";
const roadmap = JSON.parse(readFileSync("public/curriculum.json", "utf8"));
for (const seed of [0, 1, 2])
  test(`NPC exits physically demonstrated human-built layered cover, including saved handling (seed ${seed})`, () => {
    compoundEgress(roadmap, seed, true);
  });
