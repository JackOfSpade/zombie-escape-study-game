import assert from "node:assert/strict";
import { test } from "node:test";
import {
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Vector3,
} from "three";
import { createViewmodel, positionViewmodel } from "../src/view3d/viewmodel";

test("the actual viewmodel bounds occupy under 6% at 16:10 and 4:3, including sway", () => {
  const material = new MeshStandardMaterial();
  const group = new Group();
  group.add(
    createViewmodel({
      sleeve: material,
      hand: material,
      torch: material,
      lens: material,
    }),
  );
  for (const aspect of [16 / 10, 4 / 3]) {
    const camera = new PerspectiveCamera(75, aspect, 0.05, 2);
    camera.updateMatrixWorld();
    for (const phase of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
      positionViewmodel(group.position, aspect);
      group.position.x += Math.sin(phase) * 0.004;
      group.position.y += Math.cos(phase * 2) * 0.0045;
      group.rotation.z = Math.sin(phase) * 0.008;
      group.updateMatrixWorld(true);
      let left = Infinity,
        right = -Infinity,
        top = -Infinity,
        bottom = Infinity;
      const point = new Vector3();
      group.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        assert.equal(object.material.depthTest, true);
        const vertices = object.geometry.getAttribute("position");
        for (let i = 0; i < vertices.count; i++) {
          point
            .fromBufferAttribute(vertices, i)
            .applyMatrix4(object.matrixWorld)
            .project(camera);
          left = Math.min(left, point.x);
          right = Math.max(right, point.x);
          top = Math.max(top, point.y);
          bottom = Math.min(bottom, point.y);
        }
      });
      const area = ((right - left) * (top - bottom)) / 4;
      assert.ok(area < 0.06, `aspect ${aspect}, area ${area}`);
      assert.ok(
        left > 0 && right < 1 && top < 0 && bottom > -1,
        "tucked fully in lower-right",
      );
    }
  }
  group.traverse((object) => {
    if (object instanceof Mesh) object.geometry.dispose();
  });
  material.dispose();
});
