import { expect, test } from "@playwright/test";

test("minimap reveals explored layout without fog or other actor markers", async ({
  page,
}) => {
  await page.goto("/lab.html");
  const result = await page.evaluate(async () => {
    const [
      { renderMinimap, rememberVisibleTiles, normal },
      { TestRunner },
      { emptyScenario },
      { camera },
      { displayScale },
      { playerCanSee },
    ] = await Promise.all([
      import("/src/render.ts" as string),
      import("/src/gametest/runner.ts" as string),
      import("/src/gametest/schema.ts" as string),
      import("/src/camera.ts" as string),
      import("/src/display-scale.ts" as string),
      import("/src/visibility.ts" as string),
    ]);
    const roadmap = await (await fetch("/curriculum.json")).json();
    const makeGame = (secretWall: boolean) => {
      const scenario = emptyScenario();
      scenario.entities = [
        { id: "human", kind: "player", x: 12.5, y: 12.5 },
        { id: "friend", kind: "npc", x: 13.5, y: 11.5 },
        { id: "threat", kind: "zombie", x: 14.5, y: 13.5 },
      ];
      const game = new TestRunner(scenario, roadmap).game;
      game.settings.view = "first-person";
      const floor = game.floors[0];
      for (let y = 5; y <= 25; y++) floor.tiles[y][16] = 1;
      if (secretWall) floor.tiles[12][19] = 1;
      game.survivors[0].seen = [];
      return game;
    };
    const game = makeGame(true),
      player = game.survivors[0],
      plain = makeGame(false),
      target = { x: 18.5, y: 12.5 };
    const initiallyVisible = playerCanSee(game.floors[0], player, target);
    const canvas = document.createElement("canvas");
    canvas.style.width = "480px";
    canvas.style.height = "480px";
    document.body.append(canvas);
    const context = canvas.getContext("2d")!;
    const draw = (world: typeof game) => {
      rememberVisibleTiles(world);
      renderMinimap(canvas, world);
      return context.getImageData(0, 0, canvas.width, canvas.height).data;
    };
    const sample = (point = target) => {
      const rect = canvas.getBoundingClientRect(),
        { scale, ox, oy } = camera(
          rect.width,
          rect.height,
          player,
          displayScale(game.settings.displayScale),
        ),
        dpr = canvas.width / rect.width;
      return Array.from(
        context.getImageData(
          Math.floor((ox + point.x * scale) * dpr),
          Math.floor((oy + point.y * scale) * dpr),
          1,
          1,
        ).data,
      );
    };
    const differences = (a: Uint8ClampedArray, b: Uint8ClampedArray) => {
      let count = 0;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) count++;
      return count;
    };

    const hiddenWallImage = draw(game),
      playerDot = sample(player),
      hiddenTile = sample(),
      noHiddenWallImage = draw(plain);
    const hiddenWallDifference = differences(
      hiddenWallImage,
      noHiddenWallImage,
    );

    const withActors = draw(game);
    game.survivors = [player];
    game.zombies = [];
    const withoutActors = draw(game);
    const actorDifference = differences(withActors, withoutActors);

    player.x = 17.5;
    draw(game);
    const discoveredTile = sample(),
      visibleAfterMove = playerCanSee(game.floors[0], player, target);
    player.x = 12.5;
    draw(game);
    const rememberedTile = sample(),
      currentlyVisible = playerCanSee(game.floors[0], player, target);
    return {
      background: normal.sky,
      accent: normal.accent,
      playerDot,
      initiallyVisible,
      visibleAfterMove,
      currentlyVisible,
      hiddenWallDifference,
      actorDifference,
      hiddenTile,
      discoveredTile,
      rememberedTile,
      rememberedId: player.seen.includes("tile-0-18-12"),
    };
  });
  expect(result.initiallyVisible).toBe(false);
  expect(result.visibleAfterMove).toBe(true);
  expect(result.currentlyVisible).toBe(false);
  expect(result.hiddenWallDifference).toBe(0);
  expect(result.actorDifference).toBe(0);
  const sky = [1, 3, 5].map((start) =>
    Number.parseInt(result.background.slice(start, start + 2), 16),
  );
  expect(result.hiddenTile).toEqual([...sky, 255]);
  const accent = [1, 3, 5].map((start) =>
    Number.parseInt(result.accent.slice(start, start + 2), 16),
  );
  expect(result.playerDot).toEqual([...accent, 255]);
  expect(result.discoveredTile).not.toEqual(result.hiddenTile);
  expect(result.rememberedTile).toEqual(result.discoveredTile);
  expect(result.rememberedId).toBe(true);
});
