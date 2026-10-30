import { human } from "../engine";
import type { Actor, Game, Zombie } from "../model";
import { playerCanSee, sightRadius } from "../visibility";

export function visibleActors(game: Game): {
  survivors: Actor[];
  zombies: Zombie[];
} {
  const player = human(game),
    floor = game.floors[player.floor],
    radius = sightRadius(floor);
  return {
    survivors: game.survivors.filter(
      (actor) =>
        actor !== player &&
        actor.floor === player.floor &&
        actor.alive &&
        !actor.escaped &&
        playerCanSee(floor, player, actor, radius),
    ),
    zombies: game.zombies.filter(
      (actor) =>
        actor.floor === player.floor &&
        actor.hp > 0 &&
        playerCanSee(floor, player, actor, radius),
    ),
  };
}
