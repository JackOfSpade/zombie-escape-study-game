import { mkdir, writeFile } from "node:fs/promises";
import { expect, test } from "./helpers/offline-test";

test("individual authored props, colors, room plaques and text render through movement, destruction and reload", async ({
  page,
}) => {
  await page.routeWebSocket("**/*", () => {});
  await page.goto("/lab.html");
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const proof = await page.evaluate(async () => {
    const [
      { FirstPersonView },
      { createPlayableGame },
      { parseRunDesign, runDesignFingerprint },
      { decode, encode },
      { solid },
      { playerCanSee },
      { Matrix4, Vector3 },
    ] = await Promise.all([
      import("/src/view3d/scene.ts" as string),
      import("/src/world.ts" as string),
      import("/src/run-design-contract.mjs" as string),
      import("/src/persistence.ts" as string),
      import("/src/spatial.ts" as string),
      import("/src/visibility.ts" as string),
      import("/node_modules/three/build/three.module.js" as string),
    ]);
    const roadmap = await (await fetch("/curriculum.json")).json(),
      texts = new WeakMap<HTMLCanvasElement, string[]>(),
      original = CanvasRenderingContext2D.prototype.fillText,
      canvas = document.createElement("canvas"),
      gallery = document.createElement("div");
    canvas.width = 960;
    canvas.height = 650;
    canvas.style.cssText = "position:fixed;inset:0;width:960px;height:650px";
    document.body.append(canvas);
    gallery.id = "authored-scene-gallery";
    gallery.style.cssText =
      "position:fixed;inset:0;z-index:100000;overflow:auto;background:#142128;padding:16px;display:grid;grid-template-columns:repeat(2,1fr);gap:12px;align-content:start";
    document.body.append(gallery);
    CanvasRenderingContext2D.prototype.fillText = function (
      value: string,
      ...args: [number, number, number?]
    ) {
      const previous = texts.get(this.canvas) ?? [];
      previous.push(value);
      texts.set(this.canvas, previous);
      return original.call(this, value, ...args);
    };
    const view = new FirstPersonView(canvas),
      pictures: { name: string; image: string }[] = [];
    const show = (name: string, image: string) => {
      const figure = document.createElement("figure"),
        caption = document.createElement("figcaption"),
        picture = document.createElement("img");
      figure.style.cssText = "margin:0";
      caption.textContent = name;
      caption.style.cssText =
        "font:14px sans-serif;color:#e2dfcf;margin:0 0 6px";
      picture.src = image;
      picture.style.cssText =
        "display:block;width:100%;max-height:450px;object-fit:contain";
      figure.append(caption, picture);
      gallery.append(figure);
      pictures.push({ name, image });
    };
    const make = async (name: string) => {
      const design = parseRunDesign(
          await (
            await fetch(`/tests/fixtures/run-designs/${name}.json`)
          ).json(),
        ),
        game = createPlayableGame(42, roadmap, undefined, {
          version: 1,
          source: "fixture",
          requestId: "scene-render-fixture",
          generationId: "scene-render-fixture",
          fingerprint: runDesignFingerprint(design),
          design,
        });
      game.status = "playing";
      game.survivors = [game.survivors[0]];
      game.zombies = [];
      game.settings.reducedFlash = true;
      return game;
    };
    const look = async (game: any, host: any) => {
      const floor = game.floors[0],
        actor = game.survivors[0],
        positions = [1.1, 1.35, 1.65]
          .flatMap((distance) =>
            Array.from({ length: 16 }, (_, i) => {
              const theta = (i * Math.PI) / 8;
              return {
                x: host.x + Math.sin(theta) * distance,
                y: host.y + Math.cos(theta) * distance,
              };
            }),
          )
          .filter(
            (p) => !solid(floor, p, 0.3) && playerCanSee(floor, p, host, 3),
          ),
        pose = positions[0];
      if (!pose)
        throw Error(`No valid close inspection position at ${host.id}`);
      Object.assign(actor, pose, { floor: 0 });
      const yaw = Math.atan2(host.y - pose.y, host.x - pose.x),
        pitch = Math.atan2(
          0.86 - 1.6,
          Math.hypot(host.x - pose.x, host.y - pose.y),
        );
      for (let i = 0; i < 5; i++) view.render(game, yaw, pitch, 0.1);
      await view.renderer.compileAsync((view as any).scene, view.camera);
      view.render(game, yaw, pitch, 0);
      return { yaw, pitch };
    };
    const renderSnapshot = () => {
      const group = (view as any).atmosphere.group.getObjectByName(
          "authored-scene",
        ),
        labels = group.getObjectByName("authored-scene-labels");
      return {
        details: structuredClone(group.userData),
        text: texts.get(labels.material.map.image) ?? [],
        uv: Array.from(labels.geometry.getAttribute("authoredLabelUv").array),
        transforms: group.children.map((mesh: any) => ({
          name: mesh.name,
          values: Array.from(
            mesh.instanceMatrix.array.slice(0, mesh.count * 16),
          ),
        })),
        texturePixels:
          labels.material.map.image.width * labels.material.map.image.height,
      };
    };
    try {
      const game = await make("botanical-office"),
        floor = game.floors[0];
      for (const authored of floor.scene.furniture) {
        const host = floor.furniture.find((f: any) => f.id === authored.id);
        await look(game, host);
        show(
          `Botanical office · ${host.appearance.label}`,
          canvas.toDataURL("image/png"),
        );
      }
      const host = floor.furniture.find(
          (f: any) => f.id === floor.scene.props[0].furnitureId,
        ),
        pose = await look(game, host),
        before = renderSnapshot(),
        saved = encode(game),
        group = (view as any).atmosphere.group.getObjectByName(
          "authored-scene",
        ),
        cylinders = group.getObjectByName("authored-scene-cylinder"),
        matrix = new Matrix4();
      cylinders.getMatrixAt(0, matrix);
      const first = new Vector3().setFromMatrixPosition(matrix),
        oldX = host.x,
        oldY = host.y;
      host.x += 0.5;
      host.y += 0.25;
      host.angle = Math.PI / 2;
      view.render(game, pose.yaw, pose.pitch, 0);
      cylinders.getMatrixAt(0, matrix);
      const moved = new Vector3().setFromMatrixPosition(matrix),
        expected = {
          x: host.x - (first.z - oldY),
          y: first.y,
          z: host.y + (first.x - oldX),
        };
      host.destroyed = true;
      view.render(game, pose.yaw, pose.pitch, 0);
      cylinders.getMatrixAt(0, matrix);
      const hiddenDeterminant = matrix.determinant(),
        atlas = group.getObjectByName("authored-scene-labels").material.map;
      let disposed = 0;
      atlas.addEventListener("dispose", () => disposed++);
      const restored = decode(saved),
        restoredHost = restored.floors[0].furniture.find(
          (f: any) => f.id === host.id,
        );
      await look(restored, restoredHost);
      const after = renderSnapshot(),
        observatory = await make("observatory-records");
      await look(
        observatory,
        observatory.floors[0].furniture.find((f: any) => !!f.appearance),
      );
      show(
        "Observatory records · authored palette and personal objects",
        canvas.toDataURL("image/png"),
      );
      const other = renderSnapshot();
      return {
        before,
        after,
        other,
        moved: moved.toArray(),
        expected,
        hiddenDeterminant,
        disposed,
        expectedText: [
          ...floor.scene.rooms.flatMap((r: any) => [
            r.title,
            r.description,
            r.owner,
          ]),
          ...floor.scene.props.flatMap((p: any) => [p.label, p.text, p.owner]),
        ].filter(Boolean),
        pictures,
      };
    } finally {
      CanvasRenderingContext2D.prototype.fillText = original;
      view.dispose();
    }
  });
  expect(proof.before.details).toEqual({
    furniture: 4,
    props: 12,
    labels: 20,
    drawCallBudget: 5,
  });
  for (const text of proof.expectedText)
    expect(proof.before.text.join(" ")).toContain(text);
  expect(proof.after).toEqual(proof.before);
  expect(proof.other.text).not.toEqual(proof.before.text);
  expect(proof.before.uv.length).toBe(20 * 4);
  expect(
    new Set(
      Array.from({ length: 20 }, (_, i) =>
        proof.before.uv.slice(i * 4, i * 4 + 2).join(","),
      ),
    ).size,
  ).toBe(20);
  expect(proof.before.texturePixels).toBeLessThanOrEqual(2048 * 1152);
  expect(proof.moved[0]).toBeCloseTo(proof.expected.x, 4);
  expect(proof.moved[1]).toBeCloseTo(proof.expected.y, 4);
  expect(proof.moved[2]).toBeCloseTo(proof.expected.z, 4);
  expect(proof.hiddenDeterminant).toBe(0);
  expect(proof.disposed).toBe(1);
  expect(errors).toEqual([]);
  await mkdir(".artifacts/handoff/scenes", { recursive: true });
  for (const [index, picture] of proof.pictures.entries())
    await writeFile(
      `.artifacts/handoff/scenes/scene-${index}.png`,
      Buffer.from(picture.image.split(",")[1], "base64"),
    );
  await page
    .locator("#authored-scene-gallery")
    .screenshot({ path: ".artifacts/handoff/scenes/authored-scenes.png" });
});
