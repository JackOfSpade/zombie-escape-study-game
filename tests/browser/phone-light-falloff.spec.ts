import { mkdir, writeFile } from "node:fs/promises";
import { expect, test } from "./helpers/offline-test";

test("the real phone LED and local bounce attenuate on the same wall and contribute nothing beyond their finite range", async ({
  page,
}) => {
  await page.routeWebSocket("**/*", () => {});
  await page.goto("/lab.html");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const proof = await page.evaluate(async () => {
    const [{ InteriorAtmosphere }, { TestRunner }, { emptyScenario }, three] =
      await Promise.all([
        import("/src/view3d/interior-atmosphere.ts" as string),
        import("/src/gametest/runner.ts" as string),
        import("/src/gametest/schema.ts" as string),
        import("/node_modules/three/build/three.module.js" as string),
      ]);
    const {
        Scene,
        PerspectiveCamera,
        Mesh,
        PlaneGeometry,
        MeshStandardMaterial,
        HemisphereLight,
        WebGLRenderer,
        WebGLRenderTarget,
        Vector3,
        FloatType,
        RGBAFormat,
        LinearSRGBColorSpace,
        NoToneMapping,
      } = three,
      roadmap = await (await fetch("/curriculum.json")).json(),
      game = new TestRunner(emptyScenario(), roadmap).game,
      actor = game.survivors[0],
      atmosphere = new InteriorAtmosphere(),
      scene = new Scene(),
      camera = new PerspectiveCamera(55, 1, 0.1, 40),
      canvas = document.createElement("canvas"),
      renderer = new WebGLRenderer({ canvas, antialias: false }),
      target = new WebGLRenderTarget(256, 256, {
        type: FloatType,
        format: RGBAFormat,
        colorSpace: LinearSRGBColorSpace,
        depthBuffer: true,
      }),
      material = new MeshStandardMaterial({
        color: "#cccccc",
        roughness: 1,
        metalness: 0,
      }),
      wall = new Mesh(new PlaneGeometry(8, 8), material),
      ambient = new HemisphereLight("#cad5dc", "#747a7b", 0.3);
    // Linear floating-point framebuffer energy measures physical contribution,
    // rather than gamma, tone mapping or per-distance image normalization.
    if (!renderer.extensions.has("EXT_color_buffer_float"))
      throw Error(
        "Native floating-point framebuffer support is required for this lighting regression",
      );
    renderer.setSize(256, 256, false);
    renderer.outputColorSpace = LinearSRGBColorSpace;
    renderer.toneMapping = NoToneMapping;
    renderer.setRenderTarget(target);
    game.floors[0].dark = 1;
    game.settings.reducedFlash = true;
    game.survivors = [actor];
    game.zombies = [];
    wall.position.set(10.5, 1.6, 15.5);
    scene.add(camera, wall, ambient);
    // The production director attaches its unchanged real LED and bounce to
    // this camera. Its office decoration is deliberately outside this isolated
    // scene: every measurement uses this same stationary wall and material.
    camera.position.set(10.5, 1.6, 18);
    camera.lookAt(10.5, 1.6, 17);
    Object.assign(actor, {
      x: camera.position.x,
      y: camera.position.z,
      floor: 0,
    });
    game.status = "playing";
    for (let i = 0; i < 12; i++) atmosphere.update(game, camera, 0.2);
    const led = (atmosphere as any).phoneLight,
      bounce = (atmosphere as any).phoneBounce;
    scene.updateMatrixWorld(true);
    const source = led.getWorldPosition(new Vector3()),
      direction = led.target
        .getWorldPosition(new Vector3())
        .sub(source)
        .normalize(),
      records: {
        distance: number;
        ambient: number;
        lit: number;
        contribution: number;
        ambientIntensity: number;
      }[] = [];
    async function energy(
      on: boolean,
      samplePoint: InstanceType<typeof Vector3>,
    ) {
      game.status = on ? "playing" : "ready";
      for (let i = 0; i < 16; i++) atmosphere.update(game, camera, 0.2);
      await renderer.compileAsync(scene, camera);
      renderer.render(scene, camera);
      const projected = samplePoint.clone().project(camera),
        x = Math.round((projected.x * 0.5 + 0.5) * 255),
        y = Math.round((projected.y * 0.5 + 0.5) * 255),
        pixels = new Float32Array(7 * 7 * 4);
      renderer.readRenderTargetPixels(target, x - 3, y - 3, 7, 7, pixels);
      let sum = 0;
      for (let i = 0; i < pixels.length; i += 4)
        sum += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      return sum / 49;
    }
    for (const distance of [1.5, 3, 6, 9]) {
      // Move the real camera/phone away from the unchanged wall. Choose the
      // wall patch on the actual LED axis, avoiding penumbra-angle changes.
      camera.position.set(
        10.5,
        1.6,
        wall.position.z + 0.44 - direction.z * distance,
      );
      camera.lookAt(
        camera.position.x,
        camera.position.y,
        camera.position.z - 1,
      );
      Object.assign(actor, { x: camera.position.x, y: camera.position.z });
      camera.updateMatrixWorld(true);
      const point = led
          .getWorldPosition(new Vector3())
          .addScaledVector(direction, distance),
        off = await energy(false, point),
        on = await energy(true, point);
      records.push({
        distance,
        ambient: off,
        lit: on,
        contribution: on - off,
        ambientIntensity: ambient.intensity,
      });
    }
    const limits = {
      led: { distance: led.distance, decay: led.decay },
      bounce: { distance: bounce.distance, decay: bounce.decay },
    };
    atmosphere.dispose();
    wall.geometry.dispose();
    material.dispose();
    target.dispose();
    renderer.dispose();
    return { records, limits };
  });
  await mkdir(".artifacts", { recursive: true });
  await writeFile(
    ".artifacts/phone-light-falloff.json",
    JSON.stringify(proof, null, 2),
  );
  console.log("Native phone wall-light contribution", JSON.stringify(proof));
  expect(proof.limits.led).toEqual({ distance: 8, decay: 2 });
  expect(proof.limits.bounce).toEqual({ distance: 3, decay: 2 });
  const [near, middle, far, beyond] = proof.records;
  expect(near.contribution).toBeGreaterThan(0);
  expect(near.contribution).toBeGreaterThan(middle.contribution * 3);
  expect(middle.contribution).toBeGreaterThan(far.contribution * 3);
  expect(far.contribution).toBeGreaterThan(0);
  expect(Math.abs(beyond.contribution)).toBeLessThan(1e-6);
  expect(proof.records.every((r) => r.ambientIntensity === 0.3)).toBe(true);
  expect(errors).toEqual([]);
});
