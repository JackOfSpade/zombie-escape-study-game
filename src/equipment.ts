import { type Actor, type Game, type Item } from "./model";
import { canSee } from "./visibility";
export const EQUIPMENT = {
  medkit: { heal: 55 },
  bubble: { radius: 3.5, seconds: 22 },
  flare: { radius: 8, seconds: 65 },
  battery: { radius: 6, seconds: 80 },
  decoy: { radius: 10, seconds: 20 },
  weapon: { range: 5, damage: 60 },
  repulsor: { range: 5 },
};
export function itemInfo(kind: Item["kind"]) {
  switch (kind) {
    case "medkit":
      return {
        label: "Medkit",
        short: `Restore ${EQUIPMENT.medkit.heal} HP`,
        detail: `Restore up to ${EQUIPMENT.medkit.heal} HP, capped at 100. Kept if already healthy.`,
      };
    case "bubble":
      return {
        label: "Protective bubble",
        short: `Shield · ${EQUIPMENT.bubble.seconds}s`,
        detail: `A stationary ${EQUIPMENT.bubble.radius}-tile shield lasts ${EQUIPMENT.bubble.seconds}s. Its expiry disperses nearby exposed zombies without killing them; walls can prevent displacement.`,
      };
    case "flare":
      return {
        label: "Flare",
        short: `Light · ${EQUIPMENT.flare.seconds}s`,
        detail: `Place a stationary light for ${EQUIPMENT.flare.seconds}s. Only walls block the light and your sight; vision stays finite.`,
      };
    case "battery":
      return {
        label: "Battery lamp",
        short: `Light · ${EQUIPMENT.battery.seconds}s`,
        detail: `Deploy a stationary battery lamp for ${EQUIPMENT.battery.seconds}s. This is a world light, unrelated to free unlimited tutoring. Walls still occlude light and sight.`,
      };
    case "decoy":
      return {
        label: "Noise decoy",
        short: `Distraction · ${EQUIPMENT.decoy.seconds}s`,
        detail: `Place a ${EQUIPMENT.decoy.seconds}s noise distraction audible up to ${EQUIPMENT.decoy.radius} tiles along open acoustic paths. Sealed defenses muffle it.`,
      };
    case "weapon":
      return {
        label: "Limited-use weapon",
        short: `${EQUIPMENT.weapon.damage} damage · ${EQUIPMENT.weapon.range} tiles`,
        detail: `Hit exposed living zombies within ${EQUIPMENT.weapon.range} tiles for ${EQUIPMENT.weapon.damage} damage. Opaque cover blocks it. No target means no charge spent.`,
      };
    case "repulsor":
      return {
        label: "Repulsor",
        short: `Disperse · ${EQUIPMENT.repulsor.range} tiles`,
        detail: `Push and briefly stagger exposed zombies within ${EQUIPMENT.repulsor.range} tiles without damaging them. Cover can block displacement. No target means no charge spent.`,
      };
  }
}
export function itemTargets(g: Game, a: Actor, kind: "weapon" | "repulsor") {
  return g.zombies.filter(
    (z) =>
      z.hp > 0 &&
      z.floor === a.floor &&
      canSee(g.floors[a.floor], a, z, EQUIPMENT[kind].range),
  );
}
export function itemUseIssue(g: Game, a: Actor, it: Item | undefined) {
  if (
    g.status !== "playing" ||
    !g.survivors.includes(a) ||
    !a.alive ||
    a.escaped ||
    a.hp <= 0
  )
    return "Equipment can only be used by an active survivor during a run.";
  if (!it || !Number.isSafeInteger(it.charges) || it.charges <= 0)
    return "This item has no available charge.";
  if (it.kind === "medkit" && a.hp >= 100)
    return "Already at full health; medkit kept.";
  if (
    (it.kind === "weapon" || it.kind === "repulsor") &&
    !itemTargets(g, a, it.kind).length
  )
    return `No exposed living target within ${EQUIPMENT[it.kind].range} tiles; charge kept.`;
  return undefined;
}
