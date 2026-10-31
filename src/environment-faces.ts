import type { Furniture } from "./model";
import type { ResolvedSceneProp } from "./authored-scene";
import type { ScenePropKind } from "./scene-catalog.mjs";
import { furnitureHeight } from "./view3d/furniture-height";

/** Fractions of the catalog envelope, shared by visible labels and saved slots. */
export const PROP_LABEL_FACES: Partial<
  Record<ScenePropKind, { y: number; z: number; w: number; h: number }>
> = {
  mug: { y: 0.45, z: 0.453, w: 0.55, h: 0.36 },
  bottle: { y: 0.34, z: 0.485, w: 0.7, h: 0.3 },
  plant: { y: 0.19, z: 0.335, w: 0.5, h: 0.24 },
  lamp: { y: 0.04, z: 0.451, w: 0.6, h: 0.065 },
  trophy: { y: 0.08, z: 0.451, w: 0.7, h: 0.12 },
  photo: { y: 0.5, z: 0.39, w: 0.82, h: 0.79 },
};

/** Existing renderer convention: y is elevation and z is depth. */
export function furnitureLabelFace(host: Furniture) {
  const height = furnitureHeight(host.kind),
    face = {
      y: height * 0.6,
      z: host.h / 2 + 0.004,
      w: Math.min(host.w * 0.7, 0.5),
      h: Math.min(height * 0.22, 0.15),
    };
  if (
    [
      "desk",
      "table",
      "cafeTable",
      "coffeeTable",
      "reception",
      "chair",
      "officeChair",
      "armchair",
      "sofa",
    ].includes(host.kind)
  ) {
    face.y = height;
    face.h = 0.075;
  } else if (host.kind === "shelf") {
    face.y = height + 0.08;
    face.h = 0.05;
  } else if (host.kind === "plant") {
    face.y = 0.22;
    face.z = host.h * 0.325 + 0.004;
    face.w = Math.min(host.w * 0.5, 0.5);
  } else if (["screen", "whiteboard", "partition"].includes(host.kind)) {
    face.y = height * 0.45;
    face.z =
      host.kind === "partition" ? host.h / 2 + 0.004 : host.h * 0.52 + 0.03;
  } else if (host.kind === "cooler") {
    face.y = 0.4;
    face.z = host.h * 0.425 + 0.004;
  } else if (host.kind === "printer") {
    face.y = 0.83;
    face.z = host.h * 0.51 + 0.022;
  } else if (host.kind === "microwave") {
    face.y = 0.85;
    face.z = host.h * 0.51 + 0.022;
  } else if (host.kind === "box") {
    face.y = height * 0.55;
    face.z = host.h * 0.51 + 0.018;
  }
  return face;
}

/** Game coordinates: x/y are horizontal, z is elevation, local to the prop. */
export function propSurfaceFace(prop: ResolvedSceneProp) {
  const face = PROP_LABEL_FACES[prop.kind];
  return {
    x: prop.kind === "mug" ? -prop.w * 0.08 : 0,
    y: face ? prop.d * face.z : 0,
    z: face ? prop.h * face.y : prop.h * 0.985,
    width: prop.w * (face ? face.w : 0.76),
    height: face ? prop.h * face.h : prop.d * 0.78,
    yaw: 0,
    pitch: face ? 0 : -Math.PI / 2,
  };
}

/** Actual writing face above the ownership tag, local to its movable board. */
export function furnitureBoardFace(host: Furniture) {
  const height = furnitureHeight(host.kind);
  return {
    x: 0,
    y: host.h * 0.52 + 0.045,
    z: height * 0.65,
    width: host.w * 0.89,
    height: height * 0.56,
    yaw: 0,
    pitch: 0,
  };
}
