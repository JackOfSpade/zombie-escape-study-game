import {
  BackSide,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  RepeatWrapping,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { Floor } from "../model";
import { streetLayout } from "./exterior-layout";

export {
  exteriorWallTiles,
  outsideBuilding,
  streetLayout,
} from "./exterior-layout";

function asphaltTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 96;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#42494d";
  c.fillRect(0, 0, 96, 96);
  for (let i = 0; i < 2200; i++) {
    const hash = Math.imul(i + 17, 15485863) >>> 0;
    c.fillStyle = i % 3 ? "rgba(9,15,20,.16)" : "rgba(158,164,157,.2)";
    c.fillRect(hash % 96, (hash >>> 8) % 96, 1, 1);
  }
  c.strokeStyle = "rgba(10,15,18,.28)";
  c.beginPath();
  c.moveTo(7, 0);
  c.lineTo(13, 26);
  c.lineTo(3, 49);
  c.moveTo(13, 26);
  c.lineTo(31, 38);
  c.stroke();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(18, 5);
  texture.anisotropy = 4;
  return texture;
}

function entranceSign() {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 80;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#262d29";
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.strokeStyle = "#aeae84";
  c.strokeRect(3, 3, 378, 74);
  c.fillStyle = "#e1cb92";
  c.font = "600 30px sans-serif";
  c.textAlign = "center";
  c.fillText("MAIN ENTRANCE", 192, 38);
  c.font = "16px sans-serif";
  c.fillStyle = "#98a69a";
  c.fillText("RECEPTION  •  STUDY HALL", 192, 62);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** A small fixed set of merged meshes and two unshadowed practical lights.
 * Rebuilt on geometry changes only; theme changes mutate existing uniforms. */
export class ExteriorDressing {
  readonly group = new Group();
  readonly horizon = new Color("#172833");
  enabled = false;
  private world = new Group();
  private asphalt = new MeshStandardMaterial({
    map: asphaltTexture(),
    color: "#77838a",
    roughness: 1,
  });
  private solid = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    emissive: "#18232c",
    emissiveIntensity: 0.16,
  });
  private glass = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.45,
    emissive: "#547080",
    emissiveIntensity: 0.24,
  });
  private warm = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.65,
    emissive: "#d4b276",
    emissiveIntensity: 0.72,
  });
  private signMaterial = new MeshBasicMaterial({
    map: entranceSign(),
    color: "#b9ae8d",
  });
  private skyMaterial = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false,
    uniforms: {
      horizon: { value: this.horizon },
      zenith: { value: new Color("#050b17") },
    },
    vertexShader: `varying float height;
      void main() {
        height = position.y / 40.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `uniform vec3 horizon; uniform vec3 zenith;
      varying float height;
      void main() {
        gl_FragColor = vec4(mix(horizon, zenith, pow(clamp(height, 0.0, 1.0), 0.65)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  private moonMaterial = new MeshBasicMaterial({
    color: "#8c9baf",
    fog: false,
  });
  private sky = new Mesh(new SphereGeometry(40, 24, 12), this.skyMaterial);
  private moon = new Mesh(new SphereGeometry(0.65, 10, 6), this.moonMaterial);
  private entranceLight = new PointLight("#e5bd78", 12, 6.5, 2);
  private streetLight = new PointLight("#9ab4c2", 10, 7, 2);
  private tint = new Color();

  constructor() {
    this.group.name = "street-exterior";
    this.sky.name = "gradient-sky";
    this.sky.position.set(22, 0, 17);
    this.sky.renderOrder = -10;
    this.moon.position.set(7, 19, 38);
    this.entranceLight.castShadow = this.streetLight.castShadow = false;
    this.group.add(
      this.world,
      this.sky,
      this.moon,
      this.entranceLight,
      this.streetLight,
    );
    this.group.visible = false;
  }

  setTheme(mutation: boolean) {
    this.horizon.set(mutation ? "#2c2036" : "#172833");
    (this.skyMaterial.uniforms.zenith.value as Color).set(
      mutation ? "#120c20" : "#050b17",
    );
    this.moonMaterial.color.set(mutation ? "#b59ba9" : "#8c9baf");
    this.solid.emissive.set(mutation ? "#2e202b" : "#18232c");
  }

  build(floor: Floor) {
    this.clear();
    const layout = streetLayout(floor);
    this.enabled = this.group.visible = !!layout;
    if (!layout) return;
    const opaque: BufferGeometry[] = [],
      panes: BufferGeometry[] = [],
      lit: BufferGeometry[] = [];
    const box = (
      out: BufferGeometry[],
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      color: string,
    ) => {
      this.part(out, new BoxGeometry(w, h, d).translate(x, y, z), color);
    };
    const front = layout.front + 1.025;
    // The one-cell shell stays physical; lighter cladding covers its outer face.
    // A shallow upper band gives the entrance a building silhouette and windows.
    for (let x = layout.left; x < layout.right; x++) {
      if (floor.tiles[layout.front]?.[x] !== 0)
        box(opaque, x + 0.5, 1.4, front, 1, 2.8, 0.055, "#66717a");
      box(opaque, x + 0.5, 4, front - 0.02, 1, 2.4, 0.08, "#525e69");
      if (x % 3 === 0) {
        for (const height of [1.65, 4.05]) {
          if (height < 2.8 && floor.tiles[layout.front]?.[x] === 0) continue;
          box(
            opaque,
            x + 0.5,
            height,
            front + 0.045,
            0.86,
            1.12,
            0.065,
            "#29373e",
          );
          const warm = (x + Math.floor(height)) % 5 === 0;
          box(
            warm ? lit : panes,
            x + 0.5,
            height,
            front + 0.09,
            0.7,
            0.94,
            0.025,
            warm ? "#b6a879" : "#45616d",
          );
          box(opaque, x + 0.5, height, front + 0.11, 0.035, 1, 0.04, "#303c43");
        }
      }
    }
    const entrance = layout.entrance;
    box(opaque, entrance, 2.85, front + 0.45, 4.6, 0.18, 1.35, "#3d4c52");
    box(lit, entrance, 2.735, front + 0.48, 3.7, 0.035, 0.7, "#e1c68e");
    box(opaque, entrance, 3.22, front + 0.46, 3.8, 0.6, 0.14, "#27383c");
    const sign = new Mesh(new PlaneGeometry(3.55, 0.74), this.signMaterial);
    sign.position.set(entrance, 3.22, front + 0.54);
    sign.name = "entrance-sign";
    this.world.add(sign);
    this.entranceLight.position.set(entrance, 2.65, front + 0.8);

    const street = new Mesh(
      new PlaneGeometry(layout.right - layout.left + 8, 13).rotateX(
        -Math.PI / 2,
      ),
      this.asphalt,
    );
    street.name = "asphalt-street";
    street.position.set((layout.left + layout.right) / 2, -0.014, front + 6.5);
    street.receiveShadow = true;
    this.world.add(street);
    // Flat paving and flush markings never suggest an extra physical obstacle.
    box(
      opaque,
      (layout.left + layout.right) / 2,
      -0.005,
      front + 0.65,
      layout.right - layout.left,
      0.025,
      1.25,
      "#7f8580",
    );
    box(
      opaque,
      (layout.left + layout.right) / 2,
      0.015,
      front + 1.28,
      layout.right - layout.left,
      0.05,
      0.15,
      "#a0a298",
    );
    for (let x = layout.left; x < layout.right; x += 3.2)
      box(opaque, x + 0.8, 0.005, front + 4.6, 1.4, 0.025, 0.075, "#c2b88d");

    // Guardrails sit at the actual solid edge of the open arrival lane, so the
    // visible street extension never implies that the simulation continues.
    const streetRow = floor.tiles[layout.front + 1],
      open = streetRow.flatMap((tile, x) => (tile === 0 ? [x] : []));
    for (const edge of [open[0] + 0.025, open[open.length - 1] + 0.975]) {
      const length = floor.tiles.length - layout.front - 1;
      box(
        opaque,
        edge,
        0.68,
        layout.front + 1 + length / 2,
        0.045,
        0.12,
        length,
        "#697575",
      );
      for (let y = layout.front + 1.2; y < floor.tiles.length; y += 1.8)
        box(opaque, edge, 0.36, y, 0.05, 0.72, 0.05, "#677272");
    }
    // Match the real south collision boundary; the distant asphalt is scenery.
    const southEdge = floor.tiles.length - 0.025,
      x0 = open[0],
      x1 = open[open.length - 1] + 1,
      span = x1 - x0;
    box(opaque, (x0 + x1) / 2, 0.68, southEdge, span, 0.12, 0.045, "#697575");
    box(opaque, (x0 + x1) / 2, 0.36, southEdge, span, 0.06, 0.045, "#697575");
    for (let x = x0 + 0.2; x < x1; x += 1.8)
      box(opaque, x, 0.36, southEdge, 0.05, 0.72, 0.05, "#677272");
    let lights = 0;
    for (const p of layout.props) {
      if (p.kind === "car") {
        const body = p.x < entrance ? "#465b67" : "#70564e";
        box(opaque, p.x, 0.48, p.y, 0.86, 0.52, 2.6, body);
        box(opaque, p.x, 0.92, p.y - 0.1, 0.73, 0.46, 1.35, body);
        box(panes, p.x, 0.96, p.y - 0.1, 0.75, 0.3, 1.05, "#354953");
        for (const side of [-1, 1])
          for (const axle of [-0.86, 0.86])
            box(
              opaque,
              p.x + side * 0.36,
              0.24,
              p.y + axle,
              0.2,
              0.4,
              0.43,
              "#22282b",
            );
        for (const side of [-1, 1])
          box(
            panes,
            p.x + side * 0.26,
            0.52,
            p.y - 1.32,
            0.16,
            0.14,
            0.035,
            "#829185",
          );
        box(opaque, p.x, 0.32, p.y + 1.33, 0.76, 0.11, 0.06, "#728080");
      } else if (p.kind === "streetlight") {
        this.part(
          opaque,
          new CylinderGeometry(0.055, 0.08, 3.65, 6).translate(p.x, 1.825, p.y),
          "#596975",
        );
        box(opaque, p.x, 3.66, p.y + 0.23, 0.11, 0.1, 0.65, "#566774");
        box(lit, p.x, 3.6, p.y + 0.49, 0.24, 0.06, 0.36, "#b7c7b2");
        if (lights++ === 0) this.streetLight.position.set(p.x, 3.4, p.y + 0.49);
      } else if (p.kind === "cone") {
        box(opaque, p.x, 0.025, p.y, 0.26, 0.05, 0.26, "#303a3d");
        this.part(
          opaque,
          new ConeGeometry(0.11, 0.42, 6).translate(p.x, 0.25, p.y),
          "#a95e36",
        );
        this.part(
          opaque,
          new CylinderGeometry(0.065, 0.08, 0.075, 6).translate(p.x, 0.23, p.y),
          "#c5c4ad",
        );
      } else {
        box(opaque, p.x, 0.035, p.y, 0.43, 0.05, 0.17, "#8c8871");
        box(opaque, p.x + 0.1, 0.07, p.y, 0.12, 0.07, 0.13, "#4b5b61");
      }
    }
    this.streetLight.intensity = lights ? 10 : 0;
    this.merge(opaque, this.solid, "merged-street-facade-props");
    this.merge(panes, this.glass, "dim-exterior-windows");
    this.merge(lit, this.warm, "lit-exterior-windows-practicals");
  }

  private part(out: BufferGeometry[], geometry: BufferGeometry, color: string) {
    this.tint.set(color);
    const count = geometry.getAttribute("position").count,
      colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = this.tint.r;
      colors[i * 3 + 1] = this.tint.g;
      colors[i * 3 + 2] = this.tint.b;
    }
    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
    out.push(geometry);
  }

  private merge(
    parts: BufferGeometry[],
    material: MeshStandardMaterial,
    name: string,
  ) {
    if (!parts.length) return;
    const geometry = mergeGeometries(parts)!;
    for (const part of parts) part.dispose();
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    mesh.receiveShadow = true;
    this.world.add(mesh);
  }

  private clear() {
    while (this.world.children.length) {
      const mesh = this.world.children[0] as Mesh<BufferGeometry>;
      mesh.geometry.dispose();
      mesh.removeFromParent();
    }
  }

  dispose() {
    this.clear();
    this.sky.geometry.dispose();
    this.moon.geometry.dispose();
    this.asphalt.map?.dispose();
    this.signMaterial.map?.dispose();
    for (const material of [
      this.asphalt,
      this.solid,
      this.glass,
      this.warm,
      this.signMaterial,
      this.skyMaterial,
      this.moonMaterial,
    ])
      material.dispose();
    this.group.removeFromParent();
  }
}
