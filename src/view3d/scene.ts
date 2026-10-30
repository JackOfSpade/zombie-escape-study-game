import {
  ACESFilmicToneMapping,
  BoxGeometry,
  BufferGeometry,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  SpotLight,
  Sprite,
  SpriteMaterial,
  CanvasTexture,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { doorFrame } from "../doors";
import { human } from "../engine";
import { fieldAllows } from "../force-fields";
import { floorSectors } from "../floor-plan";
import {
  CONFIG,
  H,
  W,
  type Actor,
  type Floor,
  type Furniture,
  type FurnitureKind,
  type Game,
  type Item,
  type Point,
  type Station,
  type Zombie,
} from "../model";
import { floorZone } from "../office-art";
import { mutation, normal } from "../render";
import { stairwell } from "../stairwell";
import { playerCanSee, sightRadius } from "../visibility";
import { GeometryChangeCache, wallRectangles } from "./geometry";
import { InstancePool } from "./instances";
import { furnitureHeight } from "./furniture-height";
import { lootSlot } from "./targeting";
import { AdaptiveResolution } from "./resolution";
import { GpuTimer } from "./gpu-timer";
import {
  createMotion,
  setLimbPose,
  panelIsLit,
  updateMotion,
  zombieStrike,
  type Motion,
} from "./animation";
import { floorTexture, type FloorFinish } from "./textures";
import {
  flashlightDistanceScale,
  flashlightSurfaceDistance,
  smoothFlashlightScale,
} from "./flashlight";
import { createViewmodel, positionViewmodel } from "./viewmodel";
import {
  ExteriorDressing,
  exteriorWallTiles,
  outsideBuilding,
} from "./exterior";

type Tint = "body" | "edge" | "dark" | "metal" | "screen" | "skin" | "leaf";
function parsedPalette(palette: typeof normal) {
  return {
    wall: new Color(palette.wall),
    edge: new Color(palette.edge),
    ink: new Color(palette.ink),
    accent: new Color(palette.accent),
    terminal: new Color(palette.terminal),
    danger: new Color(palette.danger),
    furniture: new Color(palette.furniture),
    sky: new Color(palette.sky),
    dim: new Color(palette.dim),
    metal: new Color("#a3afb1"),
    leaf: new Color("#6c8d59"),
    skin: new Color("#c2c5ac"),
    zombieSkin: new Color("#91a86b"),
    zombieBody: new Color("#3f5141"),
    zombieEye: new Color("#bdc98b"),
    trousers: new Color("#283b43"),
    shirt: new Color("#739dac"),
    allowed: new Color("#55ef9b"),
    blocked: new Color("#ff6274"),
    medkit: new Color("#e5ece5"),
    wood: new Color(palette === normal ? "#8a6a4a" : "#9a6a5c"),
    fabric: new Color(palette === normal ? "#55667a" : "#7a5670"),
    white: new Color(palette === normal ? "#c2c8c4" : "#cdbbb0"),
    pot: new Color("#a2583a"),
  };
}
const PALETTES = {
  normal: parsedPalette(normal),
  mutation: parsedPalette(mutation),
};
type Palette = ReturnType<typeof parsedPalette>;
type Batch = "box" | "head" | "screen" | "field" | "panel" | "eye";
interface Part {
  batch: Batch;
  slot: number;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  tint: Tint;
  anchor?: "frame";
  role?: "bar" | "pane" | "debris" | "leg" | "arm" | "damage";
}
interface Visual {
  parts: Part[];
  frame: number;
  present: number;
  visible: boolean;
  kind: string;
  w?: number;
  h?: number;
  destroyed?: boolean;
  damageStage?: number;
  field?: boolean;
  door?: boolean;
  motion?: Motion;
  label?: Sprite;
}
interface Panel {
  x: number;
  y: number;
  slot: number;
  lit: boolean;
}
const FINISHES: FloorFinish[] = [
  "carpet",
  "carpetAlt",
  "lino",
  "concrete",
  "roof",
];
const WHITE = new Color(0xffffff);

/** Presentation only. World (x,y) maps to Three (x,0,y); visual state is never saved. */
export class FirstPersonView {
  readonly renderer: WebGLRenderer;
  /** Agent benchmark hook. The renderer counts the complete world/shadow/overlay frame. */
  get drawCalls() {
    return this.renderer.info.render.calls;
  }
  /** Number of actual shown actor slots in the current rendered frame. */
  get visibleActors() {
    let count = 0;
    for (const visual of this.visuals.values())
      if (
        visual.visible &&
        visual.frame === this.frame &&
        (visual.kind === "zombie" || visual.kind === "survivor")
      )
        count++;
    return count;
  }
  readonly camera = new PerspectiveCamera(75, 1, 0.05, 60);
  private scene = new Scene();
  private viewmodelScene = new Scene();
  private viewmodelCamera = new PerspectiveCamera(75, 1, 0.05, 2);
  private viewmodelAnchor = new Vector3();
  private flashlightScale = 1;
  // Candela, inverse-square falloff. The off-axis origin avoids a flat white disc.
  private flashlight = new SpotLight("#e6f1d7", 7, 14, Math.PI / 4.2, 0.82, 2);
  private fill = new HemisphereLight("#9fb4ca", "#31383b", 0.65);
  private moon = new DirectionalLight("#91abc9", 0.38);
  private localLights = Array.from(
    { length: 4 },
    () => new PointLight("#d6e5cd", 1.8, 4.5, 2),
  );
  private staticWorld = new Group();
  private exterior = new ExteriorDressing();
  private viewmodel = new Group();
  private pools!: Record<Batch, InstancePool>;
  private poolList: InstancePool[] = [];
  private visuals = new Map<object, Visual>();
  private panels: Panel[] = [];
  private nearestPanels: (Panel | undefined)[] = Array(4);
  private nearestDistances = new Float64Array(4);
  private labels = new Map<string, SpriteMaterial>();
  // Shared materials/textures survive floor travel; only view disposal frees them.
  private materials = {
    box: new MeshStandardMaterial({ color: "white", roughness: 0.88 }),
    head: new MeshStandardMaterial({
      color: "white",
      roughness: 0.85,
      flatShading: true,
    }),
    screen: new MeshStandardMaterial({
      color: "white",
      emissive: normal.terminal,
      emissiveIntensity: 0.5,
      roughness: 0.5,
    }),
    field: new MeshStandardMaterial({
      color: "white",
      emissive: "#203a31",
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      roughness: 0.55,
    }),
    panel: new MeshStandardMaterial({
      color: "#b5c4b1",
      emissive: "#d5e3c9",
      emissiveIntensity: 1.2,
      roughness: 0.7,
    }),
    eye: new MeshStandardMaterial({
      color: "white",
      emissive: "#738957",
      emissiveIntensity: 0.4,
      roughness: 1,
    }),
    wall: new MeshStandardMaterial({ color: normal.edge, roughness: 0.92 }),
    ceiling: new MeshStandardMaterial({ color: "#929b93", roughness: 1 }),
    stairs: new MeshStandardMaterial({ color: normal.edge, roughness: 0.8 }),
    sleeve: new MeshStandardMaterial({ color: "#465d6c", roughness: 0.9 }),
    hand: new MeshStandardMaterial({ color: "#b8ac8b", roughness: 0.85 }),
    torch: new MeshStandardMaterial({
      color: "#252a2d",
      roughness: 0.96,
      metalness: 0,
    }),
    lens: new MeshStandardMaterial({
      color: "#64563e",
      emissive: "#c89a58",
      emissiveIntensity: 0.24,
      roughness: 0.9,
    }),
  };
  private floorMaterials = new Map<FloorFinish, MeshStandardMaterial>();
  private geometry = new GeometryChangeCache();
  private floor?: Floor;
  private run?: Game;
  private theme = "";
  private frame = 0;
  private tint = new Color();
  private limbPose = { x: 0, y: 0, rotation: 0 };
  private target = new Vector3();
  private scratchPoint: Point = { x: 0, y: 0 };
  private playerMotion?: Motion;
  private adaptive: AdaptiveResolution;
  private gpuTimer: GpuTimer;
  private pixelRatio: number;
  private lastWidth = 0;
  private lastHeight = 0;
  private disposed = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.gpuTimer = new GpuTimer(
      this.renderer.getContext() as WebGL2RenderingContext,
    );
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    // Retain the complete world + depth-isolated viewmodel draw-call count.
    this.renderer.autoClear = false;
    this.renderer.info.autoReset = false;
    this.pixelRatio = Math.min(globalThis.devicePixelRatio || 1, 1.5);
    this.adaptive = new AdaptiveResolution(this.pixelRatio);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.set(1024, 1024);
    this.flashlight.shadow.camera.near = 0.12;
    this.flashlight.shadow.camera.far = 14;
    this.flashlight.shadow.bias = -0.001;
    this.flashlight.shadow.normalBias = 0.025;
    this.flashlight.shadow.radius = 2;
    this.flashlight.position.set(0.06, -0.04, -0.08);
    // A camera-local point on the crosshair's forward ray, independent of the
    // decorative torch axis and sway.
    this.flashlight.target.position.set(0, 0, -10);
    this.camera.add(this.flashlight, this.flashlight.target);
    this.viewmodelScene.add(
      this.viewmodel,
      new HemisphereLight("#b8c2c7", "#262b2e", 1.1),
    );
    this.moon.position.set(-12, 24, 8);
    this.moon.castShadow = false;
    this.scene.add(
      this.camera,
      this.fill,
      this.moon,
      this.moon.target,
      this.staticWorld,
      this.exterior.group,
      ...this.localLights,
    );
    this.scene.background = new Color(normal.sky);
    this.scene.fog = new Fog(normal.sky, 2, 12);
    for (const finish of FINISHES)
      this.floorMaterials.set(
        finish,
        new MeshStandardMaterial({
          color: finish === "lino" ? "#969b8d" : "#89939b",
          map: floorTexture(finish),
          roughness: 0.98,
        }),
      );
    this.viewmodel.add(createViewmodel(this.materials));
  }

  render(game: Game, yaw: number, pitch: number, dt: number, stalled = false) {
    if (this.disposed) return;
    const start = performance.now(),
      a = human(game),
      floor = game.floors[a.floor],
      theme = game.surge.state === "active" ? "mutation" : "normal",
      palette = PALETTES[theme];
    if (this.run !== game || this.floor !== floor) {
      this.clearFloor();
      this.run = game;
      this.floor = floor;
      this.playerMotion = createMotion(a.x, a.y, game.time, a.hp);
      this.flashlightScale = flashlightDistanceScale(
        flashlightSurfaceDistance(floor, a, yaw, pitch),
      );
      this.adaptive.reset(this.pixelRatio);
      this.createPools();
    }
    if (this.geometry.changed(floor)) this.buildStatic(floor);
    if (theme !== this.theme) {
      this.theme = theme;
      this.exterior.setTheme(theme === "mutation");
      (this.scene.background as Color).copy(palette.sky);
      (this.scene.fog as Fog).color.copy(palette.sky);
      this.materials.wall.color.copy(palette.edge);
      this.materials.stairs.color.copy(palette.edge);
      this.materials.screen.emissive.copy(palette.terminal);
    }
    const radius = sightRadius(floor),
      fog = this.scene.fog as Fog,
      outside = this.exterior.enabled && outsideBuilding(floor, a.x, a.y);
    fog.near = outside ? 7 : radius * (floor.dark > 0.8 ? 0.2 : 0.3);
    fog.far = outside ? 34 : radius;
    fog.color.copy(outside ? this.exterior.horizon : palette.sky);
    (this.scene.background as Color).copy(fog.color);
    this.fill.intensity = outside ? 0.85 : 0.43 + (1 - floor.dark) * 0.3;
    this.moon.intensity = outside ? 0.55 : 0.32 + (1 - floor.dark) * 0.08;
    this.moon.target.position.set(a.x, 0, a.y);
    this.moon.position.set(a.x - 12, 24, a.y + 8);
    this.flashlight.distance = radius + 1;
    this.flashlightScale = smoothFlashlightScale(
      this.flashlightScale,
      flashlightDistanceScale(flashlightSurfaceDistance(floor, a, yaw, pitch)),
      dt,
    );
    this.flashlight.intensity = 7 * this.flashlightScale;
    this.resize();
    const horizontal = Math.cos(pitch);
    this.camera.position.set(a.x, 1.6, a.y);
    this.target.set(
      a.x + horizontal * Math.cos(yaw),
      1.6 + Math.sin(pitch),
      a.y + horizontal * Math.sin(yaw),
    );
    this.camera.lookAt(this.target);
    updateMotion(this.playerMotion!, a.x, a.y, game.time, a.hp);
    const motion = this.playerMotion!,
      bob = game.settings.reducedFlash ? 0 : Math.min(1, motion.speed / 1.7);
    this.viewmodel.position.set(
      this.viewmodelAnchor.x + Math.sin(motion.phase) * 0.004 * bob,
      this.viewmodelAnchor.y + Math.cos(motion.phase * 2) * 0.0045 * bob,
      this.viewmodelAnchor.z,
    );
    this.viewmodel.rotation.z = Math.sin(motion.phase) * 0.008 * bob;
    this.sync(game, a, floor, palette);
    this.syncPanels(game, a, floor);
    for (const pool of this.poolList) pool.flush();
    this.renderer.info.reset();
    this.gpuTimer.begin();
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    // Independent depth keeps the small viewmodel from intersecting walls;
    // its scene has no fog or flashlight, and its meshes retain depthTest.
    this.renderer.clearDepth();
    this.renderer.render(this.viewmodelScene, this.viewmodelCamera);
    this.gpuTimer.end();
    const next = this.adaptive.update(
      performance.now() - start,
      dt,
      Math.min(globalThis.devicePixelRatio || 1, 1.5),
      { gpuMs: this.gpuTimer.milliseconds, stalled },
    );
    if (next !== this.pixelRatio) {
      this.pixelRatio = next;
      this.renderer.setPixelRatio(next);
      this.lastWidth = 0;
    }
    if (this.canvas.dataset.rendered !== "true")
      this.canvas.dataset.rendered = "true";
  }

  private resize() {
    const width = Math.max(1, this.canvas.clientWidth),
      height = Math.max(1, this.canvas.clientHeight);
    if (width === this.lastWidth && height === this.lastHeight) return;
    this.lastWidth = width;
    this.lastHeight = height;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.viewmodelCamera.aspect = width / height;
    this.viewmodelCamera.updateProjectionMatrix();
    // Keep a 6% edge inset at the nearest sleeve corner. Half-size geometry
    // bounds occupy <6% of both 16:10 and 4:3 viewports, including perspective.
    positionViewmodel(this.viewmodelAnchor, width / height);
  }

  private createPools() {
    this.pools = {
      box: new InstancePool(
        this.scene,
        new BoxGeometry(1, 1, 1),
        this.materials.box,
        8192,
      ),
      head: new InstancePool(
        this.scene,
        new OctahedronGeometry(0.5, 1),
        this.materials.head,
        1024,
      ),
      screen: new InstancePool(
        this.scene,
        new BoxGeometry(1, 1, 1),
        this.materials.screen,
        1024,
        false,
      ),
      field: new InstancePool(
        this.scene,
        new BoxGeometry(1, 1, 1),
        this.materials.field,
        256,
        false,
      ),
      panel: new InstancePool(
        this.scene,
        new BoxGeometry(1, 1, 1),
        this.materials.panel,
        256,
        false,
      ),
      eye: new InstancePool(
        this.scene,
        new BoxGeometry(1, 1, 1),
        this.materials.eye,
        1024,
        false,
      ),
    };
    this.poolList = Object.values(this.pools);
  }

  private buildStatic(floor: Floor) {
    this.clearStatic();
    this.exterior.build(floor);
    const boxes: BufferGeometry[] = [];
    for (const r of wallRectangles(exteriorWallTiles(floor)))
      boxes.push(
        new BoxGeometry(r.w, 2.8, r.h).translate(
          r.x + r.w / 2,
          1.4,
          r.y + r.h / 2,
        ),
      );
    // A carved doorway is an open simulation tile, but the architectural wall
    // continues above its frame. Anchor lintels to the fixed frame, not its leaf.
    for (const object of floor.furniture) {
      if (!(
        object.door ||
        object.field ||
        object.kind === "door" ||
        object.kind === "gate"
      ))
        continue;
      const frame = doorFrame(object),
        vertical = frame.h > frame.w,
        span = vertical ? frame.h : frame.w,
        cx = vertical ? Math.floor(frame.x) + 0.5 : frame.x,
        cz = vertical ? frame.y : Math.floor(frame.y) + 0.5;
      boxes.push(
        new BoxGeometry(
          vertical ? 1 : span + 0.3,
          2.8 - 2.49,
          vertical ? span + 0.3 : 1,
        ).translate(cx, (2.8 + 2.49) / 2, cz),
      );
    }
    this.addMerged(boxes, this.materials.wall, "walls", true);
    const surfaces = new Map<FloorFinish, BufferGeometry[]>();
    const ceilings: BufferGeometry[] = [];
    for (const finish of FINISHES) surfaces.set(finish, []);
    for (let y = 0; y < H; y++) {
      let x = 0;
      while (x < W) {
        const finish = floorZone(floor, x, y),
          start = x;
        while (x < W && floorZone(floor, x, y) === finish) x++;
        const plane = new PlaneGeometry(x - start, 1)
          .rotateX(-Math.PI / 2)
          .translate((start + x) / 2, -0.025, y + 0.5);
        const uv = plane.getAttribute("uv"),
          position = plane.getAttribute("position");
        for (let i = 0; i < uv.count; i++)
          uv.setXY(i, position.getX(i), position.getZ(i));
        surfaces.get(finish)!.push(plane);
        if (
          floor.index < CONFIG.floors &&
          finish !== "concrete" &&
          finish !== "roof"
        )
          ceilings.push(
            new PlaneGeometry(x - start, 1)
              .rotateX(Math.PI / 2)
              .translate((start + x) / 2, 2.82, y + 0.5),
          );
      }
    }
    for (const finish of FINISHES)
      this.addMerged(
        surfaces.get(finish)!,
        this.floorMaterials.get(finish)!,
        "floor",
        false,
      );
    this.addMerged(ceilings, this.materials.ceiling, "ceiling", false);
    const treads: BufferGeometry[] = [];
    for (const kind of ["up", "down"] as const) {
      if (
        (kind === "up" && floor.index === CONFIG.floors) ||
        (kind === "down" && floor.index === 0)
      )
        continue;
      const well = stairwell(floor, kind);
      for (let i = 0; i < 6; i++) {
        const depth = well.h / 6,
          height = kind === "up" ? (i + 1) * 0.13 : (6 - i) * 0.045,
          z =
            well.open > 0
              ? well.y + well.h - (i + 0.5) * depth
              : well.y + (i + 0.5) * depth;
        treads.push(
          new BoxGeometry(well.w - 0.2, height, depth - 0.025).translate(
            well.marker.x,
            height / 2,
            z,
          ),
        );
      }
    }
    this.addMerged(treads, this.materials.stairs, "stairs", true);
    if (floor.index < CONFIG.floors) this.buildPanels(floor);
    this.theme = "";
  }

  private addMerged(
    parts: BufferGeometry[],
    material: MeshStandardMaterial,
    name: string,
    shadow: boolean,
  ) {
    if (!parts.length) return;
    const geometry = mergeGeometries(parts)!;
    for (const part of parts) part.dispose();
    const mesh = new Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    this.staticWorld.add(mesh);
  }

  private buildPanels(floor: Floor) {
    const add = (x: number, y: number) => {
      const ix = Math.floor(x),
        iy = Math.floor(y);
      if (
        floor.tiles[iy]?.[ix] !== 0 ||
        floorZone(floor, ix, iy) === "concrete"
      )
        return;
      if (this.panels.some((p) => Math.hypot(p.x - x, p.y - y) < 2.2)) return;
      this.panels.push({ x, y, slot: this.pools.panel.allocate(), lit: true });
    };
    const sectors = floorSectors(floor);
    for (const sector of sectors) {
      for (const room of sector.rooms) {
        const r = room.rect;
        add((r.x1 + r.x2 + 1) / 2, (r.y1 + r.y2 + 1) / 2);
        if (r.y2 - r.y1 > 4) add((r.x1 + r.x2 + 1) / 2, r.y1 + 1.5);
      }
      for (const r of sector.blocks)
        for (let y = r.y1 + 2; y <= r.y2; y += 5)
          for (let x = r.x1 + 2; x <= r.x2; x += 5) add(x + 0.5, y + 0.5);
    }
    if (!sectors.length)
      for (let y = 4; y < 28; y += 5)
        for (let x = 4; x < 42; x += 6) add(x + 0.5, y + 0.5);
  }

  private syncPanels(game: Game, a: Actor, floor: Floor) {
    this.nearestDistances.fill(Infinity);
    this.nearestPanels.fill(undefined);
    for (let i = 0; i < this.panels.length; i++) {
      const panel = this.panels[i];
      panel.lit = panelIsLit(
        i,
        game.time,
        floor.dark,
        game.surge.state === "active",
        game.settings.reducedFlash,
      );
      if (panel.lit)
        this.pools.panel.set(
          panel.slot,
          panel.x,
          2.775,
          panel.y,
          0.42,
          0.045,
          1.15,
          0,
          WHITE,
        );
      else this.pools.panel.hide(panel.slot);
      const distance = Math.hypot(panel.x - a.x, panel.y - a.y);
      if (!panel.lit || distance > 6 || !playerCanSee(floor, a, panel))
        continue;
      for (let j = 0; j < 4; j++)
        if (distance < this.nearestDistances[j]) {
          for (let k = 3; k > j; k--) {
            this.nearestDistances[k] = this.nearestDistances[k - 1];
            this.nearestPanels[k] = this.nearestPanels[k - 1];
          }
          this.nearestDistances[j] = distance;
          this.nearestPanels[j] = panel;
          break;
        }
    }
    for (let i = 0; i < 4; i++) {
      const light = this.localLights[i],
        panel = this.nearestPanels[i];
      light.intensity = panel ? 1.4 + (1 - floor.dark) * 0.8 : 0;
      if (panel) light.position.set(panel.x, 2.5, panel.y);
    }
  }

  private visual(object: object, kind: string) {
    let visual = this.visuals.get(object);
    if (!visual || visual.kind !== kind) {
      if (visual) this.release(visual);
      visual = {
        kind,
        parts: [],
        frame: this.frame,
        present: this.frame,
        visible: true,
      };
      this.visuals.set(object, visual);
    }
    visual.frame = visual.present = this.frame;
    visual.visible = true;
    return visual;
  }

  private part(
    parts: Part[],
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    tint: Tint = "body",
    batch: Batch = "box",
    role?: Part["role"],
    anchor?: Part["anchor"],
  ) {
    parts.push({
      batch,
      slot: this.pools[batch].allocate(),
      x,
      y,
      z,
      w,
      h,
      d,
      tint,
      role,
      anchor,
    });
  }

  private markPresent(object: object) {
    const visual = this.visuals.get(object);
    if (visual) visual.present = this.frame;
  }

  private sync(game: Game, a: Actor, floor: Floor, palette: Palette) {
    this.frame++;
    // Static objects rely on depth-tested walls for occlusion. A centre-point
    // LOS query can hide a visible door face or a desk extending around a corner.
    const fogDistance = (this.scene.fog as Fog).far;
    for (const o of floor.furniture) {
      this.markPresent(o);
      if (
        Math.hypot(o.x - a.x, o.y - a.y) >
          fogDistance + Math.hypot(o.w, o.h) / 2 ||
        (o.kind === "gate" && o.turning < 0)
      )
        continue;
      this.furniture(o, a, palette);
    }
    for (const station of floor.stations) {
      this.markPresent(station);
      if (Math.hypot(station.x - a.x, station.y - a.y) <= fogDistance + 0.6)
        this.station(station, game, palette);
      const encounter = game.encounters[station.encounter];
      if (encounter?.state === "consumed" && encounter.reward === "loot")
        for (let i = 0; i < encounter.loot.length; i++) {
          const item = encounter.loot[i];
          this.markPresent(item);
          lootSlot(station, i, this.scratchPoint);
          if (
            Math.hypot(this.scratchPoint.x - a.x, this.scratchPoint.y - a.y) <=
            fogDistance + 0.14
          )
            this.loot(item, this.scratchPoint, palette);
        }
    }
    for (const actor of game.survivors)
      if (actor.floor === floor.index && !actor.escaped && actor !== a) {
        this.markPresent(actor);
        if (playerCanSee(floor, a, actor)) this.actor(actor, game, palette, a);
      }
    for (const zombie of game.zombies)
      if (zombie.floor === floor.index) {
        this.markPresent(zombie);
        if (playerCanSee(floor, a, zombie))
          this.actor(zombie, game, palette, a);
      }
    for (const [object, visual] of this.visuals) {
      // Removed zombies retain a short, view-only collapse, without resurrecting a sim entity.
      if (
        visual.present !== this.frame &&
        visual.kind === "zombie" &&
        visual.visible &&
        visual.motion
      ) {
        const zombie = object as Zombie;
        if (zombie.hp <= 0) {
          visual.motion.deathAt ??= game.time;
          if (
            game.time - visual.motion.deathAt < 0.8 &&
            playerCanSee(floor, a, zombie)
          ) {
            this.actor(zombie, game, palette, a);
            continue;
          }
        }
      }
      if (visual.present !== this.frame) {
        this.release(visual);
        this.visuals.delete(object);
      } else if (visual.frame !== this.frame && visual.visible) {
        for (const p of visual.parts) this.pools[p.batch].hide(p.slot);
        if (visual.label) visual.label.visible = false;
        visual.visible = false;
      }
    }
  }

  private furniture(o: Furniture, a: Actor, palette: Palette) {
    const visual = this.visual(o, o.kind),
      health = Math.max(0, Math.min(1, o.hp / Math.max(1, o.maxHp))),
      damageStage = health < 0.35 ? 2 : health < 0.65 ? 1 : 0;
    if (
      visual.w !== o.w ||
      visual.h !== o.h ||
      visual.destroyed !== o.destroyed ||
      visual.field !== !!o.field ||
      visual.door !== !!o.door ||
      visual.damageStage !== damageStage
    ) {
      this.release(visual);
      visual.parts.length = 0;
      visual.w = o.w;
      visual.h = o.h;
      visual.destroyed = o.destroyed;
      visual.field = !!o.field;
      visual.door = !!o.door;
      visual.damageStage = damageStage;
      this.furnitureParts(visual.parts, o);
    }
    const frame = doorFrame(o),
      fieldColor = fieldAllows(o, a) ? palette.allowed : palette.blocked;
    for (const p of visual.parts) {
      const anchor = p.anchor === "frame" ? frame : o,
        angle = p.anchor === "frame" ? 0 : (o.angle ?? 0),
        c = Math.cos(angle),
        s = Math.sin(angle),
        bar = p.role === "bar",
        vertical = o.h > o.w,
        x = bar && !vertical ? p.x - (o.w * (1 - health)) / 2 : p.x,
        z = bar && vertical ? p.z - (o.h * (1 - health)) / 2 : p.z,
        broken = !o.field && !o.door && health < 0.45,
        lean =
          p.role === "damage"
            ? 0.38
            : o.destroyed
              ? 0.18
              : broken && (p.role === "leg" || p.tint === "edge")
                ? 0.12
                : 0;
      this.tint.copy(
        o.field ? fieldColor : this.color(p.tint, palette, o.kind),
      );
      if (p.tint === "body" && !o.field)
        this.tint.multiplyScalar(0.45 + 0.55 * health);
      this.pools[p.batch].set(
        p.slot,
        anchor.x + x * c - z * s,
        p.y - (broken && p.role === "leg" ? 0.07 : 0),
        anchor.y + x * s + z * c,
        p.w * (bar && !vertical ? health : 1),
        p.h,
        p.d * (bar && vertical ? health : 1),
        angle,
        this.tint,
        lean,
      );
    }
  }

  private furnitureParts(parts: Part[], o: Furniture) {
    const { w, h: d } = o,
      height = furnitureHeight(o.kind);
    const part = (
      x: number,
      y: number,
      z: number,
      width: number,
      h: number,
      depth: number,
      tint: Tint = "body",
      batch: Batch = "box",
      role?: Part["role"],
      anchor?: Part["anchor"],
    ) => this.part(parts, x, y, z, width, h, depth, tint, batch, role, anchor);
    if (o.destroyed) {
      part(
        -w * 0.2,
        0.08,
        -d * 0.12,
        w * 0.55,
        0.1,
        d * 0.55,
        "body",
        "box",
        "debris",
      );
      part(
        w * 0.24,
        0.12,
        d * 0.2,
        w * 0.28,
        0.15,
        d * 0.4,
        "dark",
        "box",
        "debris",
      );
      part(
        w * 0.1,
        0.2,
        -d * 0.25,
        w * 0.16,
        0.35,
        d * 0.15,
        "metal",
        "box",
        "debris",
      );
      return;
    }
    if (o.field) {
      const vertical = d > w,
        span = vertical ? d : w;
      for (const sign of [-1, 1])
        part(
          vertical ? 0 : (sign * span) / 2,
          1.2,
          vertical ? (sign * span) / 2 : 0,
          0.13,
          2.4,
          0.13,
          "metal",
        );
      part(0, 1.15, 0, w, 2.3, d, "screen", "field", "pane");
      part(
        0,
        2.45,
        0,
        vertical ? 0.09 : w,
        0.09,
        vertical ? d : 0.09,
        "screen",
        "screen",
        "bar",
      );
      return;
    }
    const health = o.hp / Math.max(1, o.maxHp);
    if (health < 0.65) {
      // Dark diagonal fractures and a dropped panel stay readable in torch light.
      part(
        -w * 0.12,
        height * 0.58,
        d * 0.515,
        w * 0.46,
        0.035,
        0.025,
        "dark",
        "box",
        "damage",
      );
      part(
        w * 0.15,
        height * 0.4,
        d * 0.515,
        w * 0.34,
        0.03,
        0.025,
        "dark",
        "box",
        "damage",
      );
      if (health < 0.35)
        part(
          w * 0.32,
          0.075,
          d * 0.22,
          w * 0.27,
          0.1,
          d * 0.37,
          "body",
          "box",
          "debris",
        );
    }
    if (o.kind === "door" || o.kind === "gate") {
      // The leaf uses the real hinged body pose; trim remains in the saved frame.
      part(0, height / 2, 0, w, height, d);
      const frame = doorFrame(o),
        vertical = frame.h > frame.w,
        span = vertical ? frame.h : frame.w;
      for (const sign of [-1, 1])
        part(
          vertical ? 0 : (sign * span) / 2,
          height / 2,
          vertical ? (sign * span) / 2 : 0,
          0.15,
          height,
          0.15,
          "edge",
          "box",
          undefined,
          "frame",
        );
      part(
        0,
        height + 0.07,
        0,
        vertical ? 0.18 : span,
        0.14,
        vertical ? span : 0.18,
        "edge",
        "box",
        undefined,
        "frame",
      );
      part(
        w > d ? w * 0.4 : w * 0.65,
        1.08,
        d > w ? d * 0.4 : d * 0.65,
        0.1,
        0.08,
        0.1,
        "metal",
      );
      return;
    }
    switch (o.kind) {
      case "desk":
      case "table":
      case "cafeTable":
      case "coffeeTable":
      case "reception":
        part(0, height, 0, w, 0.1, d);
        for (const x of [-1, 1])
          for (const z of [-1, 1])
            part(
              x * w * 0.4,
              height / 2,
              z * d * 0.38,
              0.075,
              height,
              0.075,
              "metal",
              "box",
              "leg",
            );
        if (o.kind === "desk" || o.kind === "reception") {
          part(0, height * 0.6, -d * 0.4, w * 0.85, height * 0.6, 0.08, "edge");
          part(-w * 0.28, height * 0.55, 0, w * 0.25, height * 0.78, d * 0.7);
          for (let i = 0; i < 2; i++)
            part(
              -w * 0.28,
              height * (0.35 + i * 0.3),
              d * 0.36,
              w * 0.18,
              0.02,
              0.03,
              "metal",
            );
        }
        break;
      case "chair":
      case "officeChair":
      case "sofa":
      case "armchair":
        part(0, height, 0, w, 0.15, d);
        part(0, height + 0.3, -d * 0.4, w, 0.58, d * 0.16, "edge");
        if (o.kind === "officeChair") {
          part(0, height / 2, 0, 0.08, height, 0.08, "metal");
          part(0, 0.09, 0, w * 0.75, 0.07, 0.08, "metal");
          part(0, 0.09, 0, 0.08, 0.07, d * 0.75, "metal");
          for (const sign of [-1, 1]) {
            part(sign * w * 0.4, 0.06, 0, 0.12, 0.1, 0.12, "dark");
            part(0, 0.06, sign * d * 0.4, 0.12, 0.1, 0.12, "dark");
          }
        } else
          for (const x of [-1, 1])
            for (const z of [-1, 1])
              part(
                x * w * 0.36,
                height / 2,
                z * d * 0.33,
                0.07,
                height,
                0.07,
                "metal",
                "box",
                "leg",
              );
        if (o.kind !== "chair")
          for (const sign of [-1, 1])
            part(
              sign * w * 0.44,
              height + 0.14,
              0,
              w * 0.12,
              0.25,
              d * 0.8,
              "edge",
            );
        if (o.kind === "sofa")
          for (const sign of [-1, 1])
            part(
              sign * w * 0.24,
              height + 0.1,
              0,
              w * 0.44,
              0.12,
              d * 0.75,
              "edge",
            );
        break;
      case "shelf":
        part(0, height / 2, -d * 0.44, w, height, d * 0.1, "dark");
        for (const sign of [-1, 1])
          part(sign * w * 0.46, height / 2, 0, w * 0.08, height, d);
        for (let i = 0; i < 4; i++) {
          part(0, 0.08 + (i * height) / 3, 0, w, 0.07, d);
          if (i < 3)
            for (let j = 0; j < 3; j++)
              part(
                (j - 1) * w * 0.23,
                0.27 + (i * height) / 3,
                -d * 0.05,
                w * 0.15,
                0.29,
                d * 0.7,
                j % 2 ? "edge" : "metal",
              );
        }
        break;
      case "plant":
        part(0, 0.22, 0, w * 0.65, 0.44, d * 0.65);
        part(0, 0.62, 0, 0.07, 0.5, 0.07, "dark");
        part(0, 0.95, 0, w * 0.9, 0.75, d * 0.9, "leaf", "head");
        part(
          w * 0.24,
          0.75,
          d * 0.16,
          w * 0.65,
          0.55,
          d * 0.65,
          "leaf",
          "head",
        );
        break;
      case "screen":
      case "whiteboard":
      case "partition":
        part(
          0,
          height * 0.65,
          0,
          w,
          height * 0.7,
          d,
          o.kind === "whiteboard" ? "metal" : "edge",
        );
        for (const sign of [-1, 1]) {
          part(
            sign * w * 0.36,
            height * 0.2,
            0,
            0.07,
            height * 0.4,
            0.07,
            "metal",
          );
          part(
            sign * w * 0.36,
            0.07,
            0,
            0.08,
            0.09,
            Math.max(d, 0.45),
            "metal",
          );
        }
        if (o.kind === "screen")
          part(
            0,
            height * 0.64,
            d * 0.51,
            w * 0.86,
            height * 0.5,
            0.025,
            "screen",
            "screen",
          );
        if (o.kind === "whiteboard") {
          part(
            0,
            height * 0.65,
            d * 0.52,
            w * 0.92,
            height * 0.6,
            0.025,
            "skin",
          );
          part(0, height * 0.32, d * 0.65, w * 0.85, 0.035, 0.12, "metal");
          part(
            -w * 0.17,
            height * 0.74,
            d * 0.55,
            w * 0.45,
            0.025,
            0.025,
            "dark",
          );
          part(
            -w * 0.08,
            height * 0.64,
            d * 0.55,
            w * 0.62,
            0.025,
            0.025,
            "dark",
          );
        }
        break;
      case "fridge":
      case "cabinet":
      case "drawers":
      case "vending":
        part(0, height / 2, 0, w, height, d);
        if (o.kind === "drawers")
          for (let i = 0; i < 3; i++) {
            part(
              0,
              height * (0.18 + i * 0.29),
              d * 0.51,
              w * 0.86,
              0.025,
              0.025,
              "dark",
            );
            part(
              0,
              height * (0.26 + i * 0.29),
              d * 0.54,
              w * 0.25,
              0.035,
              0.035,
              "metal",
            );
          }
        else {
          part(0, height * 0.72, d * 0.51, w * 0.85, 0.025, 0.015, "dark");
          part(
            w * 0.3,
            height * 0.56,
            d * 0.54,
            0.04,
            height * 0.23,
            0.05,
            "metal",
          );
          if (o.kind === "cabinet")
            part(0, height / 2, d * 0.51, 0.025, height * 0.9, 0.025, "dark");
          if (o.kind === "vending") {
            part(
              -w * 0.1,
              height * 0.58,
              d * 0.52,
              w * 0.6,
              height * 0.62,
              0.03,
              "dark",
            );
            for (let i = 0; i < 3; i++)
              part(
                -w * 0.1,
                height * (0.4 + i * 0.18),
                d * 0.54,
                w * 0.5,
                0.07,
                0.03,
                "screen",
                "screen",
              );
            part(
              0,
              height * 0.12,
              d * 0.52,
              w * 0.6,
              height * 0.12,
              0.03,
              "dark",
            );
          }
        }
        break;
      case "cooler":
        part(0, 0.4, 0, w * 0.85, 0.8, d * 0.85, "metal");
        part(0, 0.98, 0, w * 0.6, 0.45, d * 0.6, "screen", "head");
        part(0, 0.61, d * 0.46, w * 0.45, 0.2, 0.03, "dark");
        for (const sign of [-1, 1])
          part(sign * w * 0.15, 0.68, d * 0.52, 0.055, 0.08, 0.08, "screen");
        break;
      case "printer":
        part(0, 0.35, 0, w * 0.85, 0.7, d * 0.85);
        part(0, 0.83, 0, w, 0.26, d, "metal");
        part(0, 0.99, -d * 0.1, w * 0.85, 0.06, d * 0.65, "dark");
        part(0, 0.83, d * 0.51, w * 0.6, 0.07, 0.04, "dark");
        part(
          w * 0.28,
          0.98,
          d * 0.3,
          w * 0.15,
          0.04,
          d * 0.18,
          "screen",
          "screen",
        );
        break;
      case "coffeeMaker":
        part(0, 0.39, 0, w, 0.78, d);
        part(0, 0.92, -d * 0.1, w * 0.75, 0.34, d * 0.65, "dark");
        part(0, 0.78, d * 0.26, w * 0.4, 0.3, d * 0.38, "metal");
        part(0, 0.62, d * 0.28, w * 0.65, 0.05, d * 0.5, "dark");
        break;
      case "microwave":
        part(0, 0.35, 0, w * 0.9, 0.7, d * 0.9);
        part(0, 0.85, 0, w, 0.35, d, "metal");
        part(-w * 0.1, 0.85, d * 0.51, w * 0.65, 0.24, 0.03, "dark");
        part(w * 0.37, 0.85, d * 0.53, 0.035, 0.2, 0.04, "metal");
        break;
      case "box":
        part(0, height / 2, 0, w, height, d);
        part(0, height + 0.008, 0, w * 0.14, 0.015, d, "edge");
        part(
          0,
          height * 0.55,
          d * 0.51,
          w * 0.32,
          height * 0.35,
          0.015,
          "skin",
        );
        break;
    }
  }

  private station(station: Station, game: Game, palette: Palette) {
    const visual = this.visual(station, "station");
    if (!visual.parts.length) {
      this.part(visual.parts, 0, 0.76, 0, 0.98, 0.1, 0.65);
      for (const sign of [-1, 1])
        this.part(visual.parts, sign * 0.38, 0.38, 0, 0.06, 0.76, 0.5, "metal");
      this.part(visual.parts, 0, 0.93, -0.17, 0.08, 0.3, 0.08, "metal");
      this.part(visual.parts, 0, 1.18, -0.17, 0.7, 0.45, 0.1, "dark");
      this.part(
        visual.parts,
        0,
        1.18,
        -0.112,
        0.61,
        0.36,
        0.025,
        "screen",
        "screen",
      );
      this.part(visual.parts, 0, 0.83, 0.15, 0.55, 0.04, 0.2, "dark");
    }
    const consumed = game.encounters[station.encounter]?.state === "consumed";
    for (const p of visual.parts)
      this.pools[p.batch].set(
        p.slot,
        station.x + p.x,
        p.y,
        station.y + p.z,
        p.w,
        p.h,
        p.d,
        0,
        consumed && p.batch === "screen"
          ? palette.edge
          : this.color(p.tint, palette),
      );
  }

  private loot(item: Item, position: Point, palette: Palette) {
    const visual = this.visual(item, item.kind);
    if (!visual.parts.length) {
      this.part(visual.parts, 0, 0.93, 0, 0.2, 0.24, 0.18, "screen", "screen");
      if (item.kind === "medkit") {
        this.part(visual.parts, 0, 0.93, 0.096, 0.12, 0.035, 0.015, "skin");
        this.part(visual.parts, 0, 0.93, 0.096, 0.035, 0.12, 0.015, "skin");
      }
    }
    for (const p of visual.parts)
      this.pools[p.batch].set(
        p.slot,
        position.x + p.x,
        p.y,
        position.y + p.z,
        p.w,
        p.h,
        p.d,
        0,
        item.kind === "medkit"
          ? p.tint === "skin"
            ? palette.danger
            : palette.medkit
          : palette.accent,
      );
  }

  private actor(
    actor: Actor | Zombie,
    game: Game,
    palette: Palette,
    player: Actor,
  ) {
    const zombie = !("alive" in actor),
      visual = this.visual(actor, zombie ? "zombie" : "survivor");
    if (!visual.parts.length) {
      // Human proportions: 1.75 m overall, 23 cm head, distinct shoulders and hips.
      this.part(visual.parts, 0, 1.19, 0, 0.24, 0.55, 0.46);
      this.part(visual.parts, 0.005, 1.63, 0, 0.23, 0.23, 0.23, "skin", "head");
      for (const sign of [-1, 1]) {
        this.part(
          visual.parts,
          0,
          1.15,
          sign * 0.305,
          0.14,
          0.57,
          0.14,
          "body",
          "box",
          "arm",
        );
        this.part(
          visual.parts,
          0,
          0.45,
          sign * 0.13,
          0.18,
          0.82,
          0.18,
          "dark",
          "box",
          "leg",
        );
      }
      if (zombie) {
        // Small exposed rips break the dark jacket silhouette. Both eyes share
        // one faint emissive instance batch rather than per-zombie lights.
        this.part(visual.parts, 0.127, 1.2, -0.12, 0.012, 0.12, 0.07, "skin");
        this.part(visual.parts, 0.127, 1.04, 0.16, 0.012, 0.08, 0.05, "skin");
        for (const sign of [-1, 1])
          this.part(
            visual.parts,
            0.116,
            1.665,
            sign * 0.05,
            0.02,
            0.022,
            0.026,
            "skin",
            "eye",
          );
      }
      visual.motion = createMotion(actor.x, actor.y, game.time, actor.hp);
    }
    const motion = visual.motion!;
    updateMotion(motion, actor.x, actor.y, game.time, actor.hp);
    const strike = zombie
        ? zombieStrike(motion, (actor as Zombie).cooldown, game.time)
        : 0,
      target = zombie
        ? ((actor as Zombie).target ?? actor.path[0])
        : (actor as Actor).heading,
      angle = zombie
        ? target
          ? Math.atan2(target.y - actor.y, target.x - actor.x)
          : Math.PI / 2
        : Math.atan2(target?.y ?? 0, target?.x ?? 1),
      health = Math.max(0, Math.min(1, actor.hp / (zombie ? 60 : 100))),
      amplitude = Math.min(1, motion.speed / 1.6),
      stride = Math.sin(motion.phase) * amplitude * (zombie ? 0.32 : 0.48),
      sway = zombie
        ? Math.sin(motion.phase * 0.5) * amplitude * 0.035
        : Math.sin(motion.phase) * amplitude * 0.012,
      flinch = Math.max(0, (motion.flinchUntil - game.time) / 0.22) * 0.22,
      dead = actor.hp <= 0 || (!zombie && !(actor as Actor).alive),
      collapse = dead
        ? Math.min(
            1,
            Math.max(0, (game.time - (motion.deathAt ??= game.time)) / 0.55),
          )
        : 0,
      lean = collapse * 1.48 + flinch + (dead ? 0 : strike * 0.12),
      c = Math.cos(angle),
      s = Math.sin(angle),
      cl = Math.cos(lean),
      sl = Math.sin(lean);
    for (const p of visual.parts) {
      let x = p.x,
        y = p.y,
        rotation = -lean;
      const sign = Math.sign(p.z);
      if (p.role === "leg" || p.role === "arm") {
        const swing =
          p.role === "leg"
            ? stride * sign
            : zombie
              ? 1.15 +
                strike * 0.48 +
                Math.sin(motion.phase + sign) * amplitude * 0.12
              : -stride * sign * 0.8;
        setLimbPose(
          this.limbPose,
          p.role === "leg" ? 0.86 : 1.435,
          p.h,
          swing,
          lean,
        );
        x = this.limbPose.x;
        y = this.limbPose.y;
        rotation = this.limbPose.rotation;
      } else {
        const fallenX = x * cl + (y - 0.18) * sl;
        y = 0.18 + (y - 0.18) * cl - x * sl;
        x = fallenX;
      }
      const color =
        p.batch === "eye"
          ? palette.zombieEye
          : p.tint === "skin"
            ? zombie
              ? palette.zombieSkin
              : palette.skin
            : p.tint === "dark"
              ? palette.trousers
              : zombie
                ? palette.zombieBody
                : palette.shirt;
      this.tint.copy(color).lerp(palette.danger, (1 - health) * 0.32);
      this.pools[p.batch].set(
        p.slot,
        actor.x + x * c - p.z * s,
        y + (dead ? 0 : sway),
        actor.y + x * s + p.z * c,
        p.w,
        p.h,
        p.d,
        angle,
        this.tint,
        rotation,
      );
    }
    if (!zombie) this.label(visual, actor as Actor, player, dead);
  }

  private label(visual: Visual, actor: Actor, player: Actor, dead: boolean) {
    const inRange =
      !dead && Math.hypot(actor.x - player.x, actor.y - player.y) <= 7;
    if (!inRange) {
      if (visual.label) visual.label.visible = false;
      return;
    }
    if (!visual.label) {
      let material = this.labels.get(actor.name);
      if (!material) {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 48;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "rgba(10,18,22,.74)";
        ctx.fillRect(0, 0, 256, 48);
        ctx.font = "500 25px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#d6e4d8";
        ctx.fillText(actor.name, 128, 25, 244);
        const texture = new CanvasTexture(canvas);
        texture.colorSpace = SRGBColorSpace;
        material = new SpriteMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
          toneMapped: false,
          fog: true,
        });
        this.labels.set(actor.name, material);
      }
      visual.label = new Sprite(material);
      visual.label.scale.set(1.12, 0.21, 1);
      this.scene.add(visual.label);
    }
    visual.label.visible = true;
    visual.label.position.set(actor.x, 1.98, actor.y);
  }

  private color(tint: Tint, palette: Palette, kind?: FurnitureKind): Color {
    switch (tint) {
      case "edge":
        return palette.edge;
      case "dark":
        return palette.dim;
      case "metal":
        return palette.metal;
      case "screen":
        return palette.terminal;
      case "skin":
        return palette.ink;
      case "leaf":
        return palette.leaf;
      default:
        switch (kind) {
          case "desk":
          case "table":
          case "cafeTable":
          case "coffeeTable":
          case "reception":
          case "chair":
          case "shelf":
          case "box":
            return palette.wood;
          case "sofa":
          case "armchair":
          case "officeChair":
          case "partition":
            return palette.fabric;
          case "fridge":
          case "cabinet":
          case "drawers":
          case "cooler":
          case "printer":
          case "microwave":
            return palette.white;
          case "plant":
            return palette.pot;
          default:
            return palette.furniture;
        }
    }
  }

  private release(visual: Visual) {
    for (const part of visual.parts) this.pools[part.batch].release(part.slot);
    visual.label?.removeFromParent();
    delete visual.label;
  }

  private clearStatic() {
    while (this.staticWorld.children.length) {
      const mesh = this.staticWorld.children[0] as Mesh<
        BufferGeometry,
        MeshStandardMaterial
      >;
      mesh.removeFromParent();
      mesh.geometry.dispose();
    }
    if (this.pools)
      for (const panel of this.panels) this.pools.panel.release(panel.slot);
    this.panels.length = 0;
  }

  private clearFloor() {
    this.clearStatic();
    for (const visual of this.visuals.values())
      visual.label?.removeFromParent();
    for (const pool of this.poolList) pool.dispose(false);
    this.poolList.length = 0;
    this.visuals.clear();
    this.geometry = new GeometryChangeCache();
    this.theme = "";
    this.renderer.renderLists.dispose();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.clearFloor();
    this.exterior.dispose();
    this.viewmodel.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose();
    });
    for (const material of Object.values(this.materials)) material.dispose();
    for (const material of this.floorMaterials.values()) {
      material.map?.dispose();
      material.dispose();
    }
    for (const material of this.labels.values()) {
      material.map?.dispose();
      material.dispose();
    }
    this.labels.clear();
    this.flashlight.shadow.map?.dispose();
    this.gpuTimer.dispose();
    this.renderer.dispose();
  }
}
