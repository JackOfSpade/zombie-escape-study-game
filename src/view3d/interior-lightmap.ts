import {
  ClampToEdgeWrapping,
  Color,
  DataTexture,
  DataUtils,
  HalfFloatType,
  LinearFilter,
  type Material,
  RGBAFormat,
} from "three";
import {
  ambientTexels,
  fixturePools,
  LIGHTMAP_RES,
  type FixturePool,
  type InteriorLighting,
} from "../interior-lighting";
import { CONFIG, H, W } from "../model";
import { FLOOR_HEIGHT } from "../stair-route";

const BANDS = CONFIG.floors + 1,
  TW = W * LIGHTMAP_RES,
  TH = H * LIGHTMAP_RES;

interface Band {
  ambient: Float32Array;
  covered: Uint8Array;
  warm: Float32Array;
  cool: Float32Array;
  pools: Map<string, FixturePool>;
  /** Share of each fixture currently drawn by a real practical light. */
  removed: Map<string, number>;
}

/** Every powered ceiling fixture lights its own room at any distance. Light
 * is baked per floor into a small texture (occluded by real walls) and added
 * to the indirect irradiance of interior materials. The three nearest
 * practical point lights take over their fixture's share up close, so a lamp
 * never brightens or dims as the player approaches it. */
export class InteriorLightmap {
  readonly texture: DataTexture;
  readonly uniforms = {
    interiorLightmap: { value: null as DataTexture | null },
    /** Hemisphere intensity per unit of zone power (0 outdoors). */
    interiorLmAmbient: { value: 0 },
    /** Zone power the global hemisphere fill already represents. */
    interiorLmPlayer: { value: 1 },
    interiorLmPool: { value: 1 },
    interiorLmSky: { value: new Color("#b5c8d2") },
    interiorLmGround: { value: new Color("#3f494c") },
    interiorLmWarm: { value: new Color("#f2d7a3") },
    interiorLmCool: { value: new Color("#9dbfc7") },
  };
  private data = new Uint16Array(TW * TH * BANDS * 4);
  private bands = new Map<number, Band>();

  constructor() {
    this.texture = new DataTexture(
      this.data,
      TW,
      TH * BANDS,
      RGBAFormat,
      HalfFloatType,
    );
    this.texture.magFilter = this.texture.minFilter = LinearFilter;
    this.texture.wrapS = this.texture.wrapT = ClampToEdgeWrapping;
    this.texture.generateMipmaps = false;
    this.texture.name = "interior-lightmap";
    this.texture.needsUpdate = true;
    this.uniforms.interiorLightmap.value = this.texture;
  }

  build(index: number, plan: InteriorLighting) {
    if (index < 0 || index >= BANDS) return;
    const { values: ambient, covered } = ambientTexels(plan),
      band: Band = {
        ambient,
        covered,
        warm: new Float32Array(TW * TH),
        cool: new Float32Array(TW * TH),
        pools: new Map(),
        removed: new Map(),
      };
    for (const pool of fixturePools(plan)) {
      band.pools.set(pool.fixture.id, pool);
      this.accumulate(band, pool, 1);
    }
    this.bands.set(index, band);
    this.write(index);
  }

  clear(index: number) {
    this.bands.delete(index);
    const start = index * TW * TH * 4;
    this.data.fill(0, start, start + TW * TH * 4);
    this.texture.needsUpdate = true;
  }

  reset() {
    this.bands.clear();
    this.data.fill(0);
    this.texture.needsUpdate = true;
  }

  /** `weights` is the share of each fixture now drawn by a practical light;
   * every other fixture keeps its full baked contribution. */
  setPracticals(index: number, weights: ReadonlyMap<string, number>) {
    const band = this.bands.get(index);
    if (!band) return;
    let changed = false;
    for (const id of new Set([...band.removed.keys(), ...weights.keys()])) {
      const before = band.removed.get(id) ?? 0,
        after = weights.get(id) ?? 0,
        pool = band.pools.get(id);
      if (!pool || after === before) continue;
      if (after > 0 && Math.abs(after - before) < 1 / 64) continue;
      this.accumulate(band, pool, before - after);
      if (after > 0) band.removed.set(id, after);
      else band.removed.delete(id);
      changed = true;
    }
    if (changed) this.write(index);
  }

  /** Baked floor irradiance (warm + cool) and zone level, for tests. */
  sample(index: number, x: number, y: number) {
    const band = this.bands.get(index);
    if (!band) return undefined;
    const i = Math.floor(y * LIGHTMAP_RES) * TW + Math.floor(x * LIGHTMAP_RES);
    return {
      zone: band.ambient[i],
      pool: band.warm[i] + band.cool[i],
      covered: !!band.covered[i],
    };
  }

  private accumulate(band: Band, pool: FixturePool, scale: number) {
    const target = pool.warm ? band.warm : band.cool;
    for (let y = 0; y < pool.h; y++)
      for (let x = 0; x < pool.w; x++) {
        const v = pool.values[y * pool.w + x];
        if (v) {
          const i = (pool.y0 + y) * TW + pool.x0 + x;
          target[i] = Math.max(0, target[i] + v * scale);
        }
      }
  }

  private write(index: number) {
    const band = this.bands.get(index)!,
      offset = index * TW * TH * 4,
      half = DataUtils.toHalfFloat;
    for (let i = 0; i < TW * TH; i++) {
      const o = offset + i * 4;
      this.data[o] = half(band.ambient[i]);
      this.data[o + 1] = half(band.warm[i]);
      this.data[o + 2] = half(band.cool[i]);
      this.data[o + 3] = half(band.covered[i]);
    }
    this.texture.needsUpdate = true;
  }

  /** Adds the baked irradiance to a lit material's indirect diffuse term. */
  patch(material: Material) {
    const uniforms = this.uniforms;
    material.customProgramCacheKey = () => "interior-lightmap";
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vLmWorld;\nvarying vec3 vLmNormal;",
        )
        .replace(
          "#include <project_vertex>",
          `#include <project_vertex>
vec4 lmWorld = vec4( transformed, 1.0 );
vec3 lmNormal = objectNormal;
#ifdef USE_INSTANCING
lmWorld = instanceMatrix * lmWorld;
lmNormal = mat3( instanceMatrix ) * lmNormal;
#endif
vLmWorld = ( modelMatrix * lmWorld ).xyz;
vLmNormal = mat3( modelMatrix ) * lmNormal;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
varying vec3 vLmWorld;
varying vec3 vLmNormal;
uniform sampler2D interiorLightmap;
uniform float interiorLmAmbient;
uniform float interiorLmPlayer;
uniform float interiorLmPool;
uniform vec3 interiorLmSky;
uniform vec3 interiorLmGround;
uniform vec3 interiorLmWarm;
uniform vec3 interiorLmCool;
vec3 interiorLightmapIrradiance() {
  vec3 n = normalize( vLmNormal );
  // Sample just off the surface so a wall face reads its own room's texels.
  vec3 p = vLmWorld + n * 0.3;
  float band = clamp( floor( p.y / ${FLOOR_HEIGHT.toFixed(2)} ), 0.0, ${(BANDS - 1).toFixed(1)} );
  float z = clamp( p.z * ${LIGHTMAP_RES.toFixed(1)}, 0.5, ${(TH - 0.5).toFixed(1)} );
  vec2 uv = vec2( p.x / ${W.toFixed(1)}, ( band * ${TH.toFixed(1)} + z ) / ${(TH * BANDS).toFixed(1)} );
  vec4 lm = texture2D( interiorLightmap, uv );
  vec3 hemi = mix( interiorLmGround, interiorLmSky, 0.5 * n.y + 0.5 );
  // Floors take full pool light, walls about half, ceilings little.
  float facing = n.y >= 0.0 ? mix( 0.55, 1.0, n.y ) : mix( 0.55, 0.2, -n.y );
  return lm.a * ( interiorLmAmbient * ( lm.r - interiorLmPlayer ) * hemi
    + interiorLmPool * facing * ( lm.g * interiorLmWarm + lm.b * interiorLmCool ) );
}`,
        )
        .replace(
          "#include <lights_fragment_end>",
          `#if defined( RE_IndirectDiffuse )
irradiance += interiorLightmapIrradiance();
#endif
#include <lights_fragment_end>`,
        );
    };
    material.needsUpdate = true;
  }

  dispose() {
    this.bands.clear();
    this.texture.dispose();
  }
}
