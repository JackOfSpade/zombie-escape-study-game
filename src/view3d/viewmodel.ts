import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  type MeshStandardMaterial,
  type Vector3,
} from "three";

/** Camera-local decoration, rendered with its own depth and steady fill light. */
export function createViewmodel(
  materials: Record<"sleeve" | "hand" | "torch" | "lens", MeshStandardMaterial>,
) {
  const group = new Group();
  const sleeve = new Mesh(new BoxGeometry(0.16, 0.17, 0.42), materials.sleeve);
  sleeve.position.set(0.29, -0.34, -0.32);
  sleeve.rotation.x = -0.15;
  const hand = new Mesh(new BoxGeometry(0.13, 0.12, 0.15), materials.hand);
  hand.position.set(0.26, -0.23, -0.51);
  const torch = new Mesh(
    new CylinderGeometry(0.065, 0.047, 0.34, 8).rotateX(Math.PI / 2),
    materials.torch,
  );
  torch.position.set(0.25, -0.18, -0.55);
  const lens = new Mesh(
    new CylinderGeometry(0.057, 0.057, 0.015, 8).rotateX(Math.PI / 2),
    materials.lens,
  );
  lens.position.set(0.25, -0.18, -0.725);
  group.add(sleeve, hand, torch, lens);
  group.scale.setScalar(0.46);
  return group;
}

export function positionViewmodel(out: Vector3, aspect: number) {
  const halfHeight = 0.555 * Math.tan((75 * Math.PI) / 360);
  return out.set(
    halfHeight * aspect * 0.94 - 0.185,
    -halfHeight * 0.94 + 0.2125,
    -0.5,
  );
}
