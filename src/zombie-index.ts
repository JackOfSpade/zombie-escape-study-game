import type { Point, Zombie } from "./model";
/** Ephemeral one-tick broad phase. Exact contact tests remain authoritative.
 * Original array order is retained so local queries cannot change tie-breaking. */
export class ZombieIndex {
  private cells = new Map<number, Set<Zombie>>();
  private keys = new Map<Zombie, number>();
  private order = new Map<Zombie, number>();
  constructor(zombies: readonly Zombie[]) {
    zombies.forEach((z, i) => {
      this.order.set(z, i);
      this.update(z);
    });
  }
  /** Packed numeric cell key: avoids a string allocation per cell visit. */
  private key(floor: number, x: number, y: number) {
    return (floor * 65536 + (y + 32768)) * 65536 + (x + 32768);
  }
  update(z: Zombie) {
    const old = this.keys.get(z),
      next =
        z.hp > 0
          ? this.key(z.floor, Math.floor(z.x), Math.floor(z.y))
          : undefined;
    if (old === next) return;
    if (old !== undefined) {
      const bucket = this.cells.get(old);
      bucket?.delete(z);
      if (!bucket?.size) this.cells.delete(old);
      this.keys.delete(z);
    }
    if (next !== undefined) {
      if (!this.order.has(z)) this.order.set(z, this.order.size);
      let bucket = this.cells.get(next);
      if (!bucket) this.cells.set(next, (bucket = new Set()));
      bucket.add(z);
      this.keys.set(z, next);
    }
  }
  near(floor: number, p: Point, radius: number): Zombie[] {
    const result: Zombie[] = [],
      range = radius + 1e-7;
    for (let y = Math.floor(p.y - range); y <= Math.floor(p.y + range); y++)
      for (let x = Math.floor(p.x - range); x <= Math.floor(p.x + range); x++)
        for (const z of this.cells.get(this.key(floor, x, y)) ?? [])
          if (z.hp > 0 && (z.x - p.x) ** 2 + (z.y - p.y) ** 2 <= range * range)
            result.push(z);
    return result.sort((a, b) => this.order.get(a)! - this.order.get(b)!);
  }
}
