import { mkdir } from "node:fs/promises";
import { expect, test } from "./helpers/offline-test";

test("saved authored stories and signs reach actual scene textures, preserve reloads and release old resources", async ({
  page,
}) => {
  await page.routeWebSocket("**/*", () => {});
  await page.goto("/lab.html");
  await page.setViewportSize({ width: 1200, height: 1000 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const proof = await page.evaluate(async () => {
    const [
      { InteriorAtmosphere },
      { ExteriorDressing },
      { createPlayableGame },
      { parseRunDesign, runDesignFingerprint },
    ] = await Promise.all([
      import("/src/view3d/interior-atmosphere.ts" as string),
      import("/src/view3d/exterior.ts" as string),
      import("/src/world.ts" as string),
      import("/src/run-design-contract.mjs" as string),
    ]);
    const design = parseRunDesign(
        await (
          await fetch("/tests/fixtures/run-designs/harbor-archive.json")
        ).json(),
      ),
      roadmap = await (await fetch("/curriculum.json")).json(),
      game = createPlayableGame(42, roadmap, undefined, {
        version: 1,
        source: "fixture",
        requestId: "renderer-fixture",
        generationId: "renderer-fixture",
        fingerprint: runDesignFingerprint(design),
        design,
      }),
      floor = game.floors[0],
      before = JSON.stringify(game),
      texts = new WeakMap<HTMLCanvasElement, string[]>(),
      fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (
      text: string,
      ...args: [number, number, number?]
    ) {
      const lines = texts.get(this.canvas) ?? [];
      lines.push(text);
      texts.set(this.canvas, lines);
      return fillText.call(this, text, ...args);
    };
    const atmosphere = new InteriorAtmosphere(),
      exterior = new ExteriorDressing(),
      gallery = document.createElement("div");
    gallery.id = "run-design-textures";
    gallery.style.cssText =
      "position:fixed;inset:0;z-index:100000;overflow:auto;background:#18242b;padding:18px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px;align-content:start";
    document.body.append(gallery);
    const show = (source: HTMLCanvasElement, label: string) => {
      const section = document.createElement("div"),
        heading = document.createElement("p"),
        canvas = document.createElement("canvas");
      heading.textContent = label;
      heading.style.cssText =
        "color:#e1dfce;margin:0 0 5px;font:14px sans-serif";
      canvas.width = source.width;
      canvas.height = source.height;
      canvas.style.cssText =
        "width:100%;max-height:370px;object-fit:contain;background:#10191d";
      canvas.getContext("2d")!.drawImage(source, 0, 0);
      section.append(heading, canvas);
      gallery.append(section);
    };
    try {
      atmosphere.build(floor, game.seed);
      exterior.build(floor, game.floors);
      const surfaces = Array.from(
          { length: 6 },
          (_, i) =>
            atmosphere.group.getObjectByName(
              `office-story-surface-${i}`,
            ) as any,
        ),
        storyText = surfaces.map(
          (mesh: any) => texts.get(mesh.material.map.image) ?? [],
        ),
        signText = texts.get((exterior as any).signMaterial.map.image) ?? [],
        shopText =
          texts.get((exterior as any).shopSigns.material.map.image) ?? [];
      surfaces.forEach((mesh: any, i) =>
        show(
          mesh.material.map.image,
          [
            "Notice",
            "Radio poster",
            "Roster",
            "Whiteboard",
            "Photo card",
            "Desk note",
          ][i],
        ),
      );
      show((exterior as any).signMaterial.map.image, "Building sign");
      show(
        (exterior as any).shopSigns.material.map.image,
        "Street and shop atlas",
      );
      let releasedMaterials = 0,
        releasedTextures = 0;
      surfaces.forEach((mesh: any) => {
        mesh.material.addEventListener("dispose", () => releasedMaterials++);
        mesh.material.map.addEventListener("dispose", () => releasedTextures++);
      });
      atmosphere.build(floor, game.seed);
      const replaced = {
          materials: releasedMaterials,
          textures: releasedTextures,
        },
        restored = JSON.parse(before);
      atmosphere.reset();
      atmosphere.build(restored.floors[0], restored.seed);
      const reloadText = Array.from(
        { length: 6 },
        (_, i) =>
          texts.get(
            (
              atmosphere.group.getObjectByName(
                `office-story-surface-${i}`,
              ) as any
            ).material.map.image,
          ) ?? [],
      );
      exterior.build(createPlayableGame(42, roadmap).floors[0]);
      const legacySignText =
        texts.get((exterior as any).signMaterial.map.image) ?? [];
      const boundaryStory = {
        title: "WWWW WWWW WWWW WWWW WWWW WWWW WWWW",
        lines: Array.from(
          { length: 4 },
          (_, i) => `WWWW WWWW WWWW WWWW WWWW WWWW WWWW WWWW WWWW WWW ${i}`,
        ),
      };
      restored.floors[0].design.stories[3] = boundaryStory;
      atmosphere.build(restored.floors[0], restored.seed);
      const boundaryText =
        texts.get(
          (atmosphere.group.getObjectByName("office-story-surface-3") as any)
            .material.map.image,
        ) ?? [];
      return {
        storyText,
        reloadText,
        signText,
        shopText,
        legacySignText,
        replaced,
        boundaryStory,
        boundaryText,
        expectedStories: design.floors[0].stories,
        expectedBuilding: design.exterior.buildingName,
        expectedLabels: design.exterior.streetLabels,
        stateUnchanged: JSON.stringify(game) === before,
      };
    } finally {
      atmosphere.dispose();
      exterior.dispose();
      CanvasRenderingContext2D.prototype.fillText = fillText;
    }
  });
  proof.expectedStories.forEach(
    (story: { title: string; lines: string[] }, i: number) => {
      const rendered = proof.storyText[i].join(" ");
      expect(rendered).toContain(story.title);
      for (const line of story.lines) expect(rendered).toContain(line);
    },
  );
  expect(proof.reloadText).toEqual(proof.storyText);
  expect(proof.signText).toContain(proof.expectedBuilding);
  expect(proof.shopText).toEqual(proof.expectedLabels);
  expect(proof.legacySignText).toContain("MERCER CIVIC CENTRE");
  expect(proof.replaced).toEqual({ materials: 6, textures: 6 });
  for (const text of [proof.boundaryStory.title, ...proof.boundaryStory.lines])
    expect(proof.boundaryText.join(" ")).toContain(text);
  expect(proof.stateUnchanged).toBe(true);
  expect(errors).toEqual([]);
  await mkdir(".artifacts/handoff/design", { recursive: true });
  await page.locator("#run-design-textures").screenshot({
    path: ".artifacts/handoff/design/authored-story-textures.png",
  });
});
