import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BoxGeometry,
  Color,
  Matrix4,
  MeshStandardMaterial,
  Scene,
  Vector3,
} from "three";
import { InstancePool } from "../src/view3d/instances";

test("3D instance slots hide departed entities and reuse their allocation", () => {
  const scene = new Scene(),
    pool = new InstancePool(
      scene,
      new BoxGeometry(),
      new MeshStandardMaterial(),
      8,
    ),
    first = pool.allocate(),
    retained = pool.allocate(),
    matrix = new Matrix4();
  pool.set(first, 3, 1, 7, 0.5, 2, 0.5, 0, "#96a534");
  pool.set(retained, 4, 1, 8, 0.5, 2, 0.5, 0, "#739dac");
  pool.release(first);
  pool.mesh.getMatrixAt(first, matrix);
  assert.equal(
    matrix.determinant(),
    0,
    "departed entities have no drawable volume",
  );
  assert.equal(pool.allocate(), first, "the vacant allocation is reused");
  assert.equal(pool.mesh.count, 2, "recycling does not grow the draw batch");
  pool.mesh.getMatrixAt(retained, matrix);
  assert.deepEqual(
    new Vector3().setFromMatrixPosition(matrix).toArray(),
    [4, 1, 8],
  );
  for (let i = 0; i < 1000; i++) {
    const slot = pool.allocate();
    pool.set(slot, 1, 1, 1, 1, 1, 1, 0, "white");
    pool.release(slot);
  }
  assert.equal(pool.mesh.count, 3, "repeated arrivals remain bounded");
  pool.dispose();
});

test("3D instance poses preserve metre dimensions and 2D clockwise heading", () => {
  const pool = new InstancePool(
      new Scene(),
      new BoxGeometry(),
      new MeshStandardMaterial(),
      4,
    ),
    slot = pool.allocate(),
    matrix = new Matrix4();
  pool.set(slot, 4, 1.4, 8, 2, 2.8, 1, Math.PI / 2, new Color("#54cec7"));
  pool.mesh.getMatrixAt(slot, matrix);
  const position = new Vector3().setFromMatrixPosition(matrix),
    scale = new Vector3().setFromMatrixScale(matrix),
    forward = new Vector3(1, 0, 0).transformDirection(matrix);
  assert.equal(position.x, 4);
  assert.ok(Math.abs(position.y - 1.4) < 1e-6);
  assert.equal(position.z, 8);
  assert.ok(Math.abs(scale.x - 2) < 1e-6);
  assert.ok(Math.abs(scale.y - 2.8) < 1e-6);
  assert.ok(Math.abs(scale.z - 1) < 1e-6);
  assert.ok(Math.abs(forward.x) < 1e-6);
  assert.ok(
    Math.abs(forward.z - 1) < 1e-6,
    "positive floor yaw turns east toward south",
  );
  pool.dispose();
});

test("disposing 3D batches releases geometry, material and instance resources", () => {
  const scene = new Scene(),
    geometry = new BoxGeometry(),
    material = new MeshStandardMaterial(),
    pool = new InstancePool(scene, geometry, material, 4),
    disposed: string[] = [];
  geometry.addEventListener("dispose", () => disposed.push("geometry"));
  material.addEventListener("dispose", () => disposed.push("material"));
  pool.mesh.addEventListener("dispose", () => disposed.push("instances"));
  assert.equal(scene.children.length, 1);
  pool.dispose();
  assert.equal(scene.children.length, 0);
  assert.deepEqual(disposed.sort(), ["geometry", "instances", "material"]);
});

test("instance uploads cover only dirty used slots and skip unchanged transforms and colours", () => {
  const pool = new InstancePool(
      new Scene(),
      new BoxGeometry(),
      new MeshStandardMaterial(),
      16384,
    ),
    tint = new Color("#54cec7"),
    slots = [pool.allocate(), pool.allocate(), pool.allocate()];
  for (const slot of slots) pool.set(slot, slot, 1, 2, 1, 1, 1, 0, tint);
  pool.flush();
  const matrices = pool.mesh.instanceMatrix,
    colors = pool.mesh.instanceColor!;
  assert.deepEqual(matrices.updateRanges, [{ start: 0, count: 48 }]);
  assert.deepEqual(colors.updateRanges, [{ start: 0, count: 9 }]);
  const matrixVersion = matrices.version,
    colorVersion = colors.version;
  // The WebGL upload clears ranges after consumption.
  matrices.clearUpdateRanges();
  colors.clearUpdateRanges();
  for (const slot of slots) pool.set(slot, slot, 1, 2, 1, 1, 1, 0, tint);
  pool.flush();
  assert.equal(matrices.version, matrixVersion, "static poses do not upload");
  assert.equal(colors.version, colorVersion, "static colours do not upload");
  assert.deepEqual(matrices.updateRanges, []);
  assert.deepEqual(colors.updateRanges, []);

  pool.set(slots[2], 9, 1, 2, 1, 1, 1, 0, tint);
  pool.flush();
  assert.deepEqual(matrices.updateRanges, [{ start: 32, count: 16 }]);
  assert.equal(
    colors.version,
    colorVersion,
    "motion does not re-upload colour",
  );
  matrices.clearUpdateRanges();
  tint.setRGB(0.2, 0.3, 0.4);
  pool.set(slots[2], 9, 1, 2, 1, 1, 1, 0, tint);
  pool.flush();
  assert.deepEqual(matrices.updateRanges, []);
  assert.deepEqual(colors.updateRanges, [{ start: 6, count: 3 }]);
  assert.equal(matrices.version, matrixVersion + 1);
  pool.dispose();
});

test("instance upload ranges reuse their objects after renderer consumption and retain unconsumed edits", () => {
  const pool = new InstancePool(
      new Scene(),
      new BoxGeometry(),
      new MeshStandardMaterial(),
      4,
    ),
    first = pool.allocate(),
    second = pool.allocate(),
    tint = new Color("#54cec7");
  pool.set(first, 1, 1, 2, 1, 1, 1, 0, tint);
  pool.set(second, 2, 1, 2, 1, 1, 1, 0, tint);
  pool.flush();
  const matrices = pool.mesh.instanceMatrix,
    colors = pool.mesh.instanceColor!,
    matrixRange = matrices.updateRanges[0],
    colorRange = colors.updateRanges[0];
  // WebGL clears these arrays after uploading. The next moving frame should
  // reuse the same small range records instead of allocating new ones.
  matrices.clearUpdateRanges();
  colors.clearUpdateRanges();
  tint.setRGB(0.3, 0.4, 0.5);
  pool.set(second, 3, 1, 2, 1, 1, 1, 0, tint);
  pool.flush();
  assert.equal(matrices.updateRanges[0], matrixRange);
  assert.equal(colors.updateRanges[0], colorRange);
  assert.deepEqual(matrixRange, { start: 16, count: 16 });
  assert.deepEqual(colorRange, { start: 3, count: 3 });

  // If a frame has not uploaded yet, a later flush must widen the pending
  // range rather than replacing it and dropping those earlier edits.
  pool.set(first, 4, 1, 2, 1, 1, 1, 0, tint);
  pool.flush();
  assert.equal(matrices.updateRanges.length, 1);
  assert.equal(colors.updateRanges.length, 1);
  assert.equal(matrices.updateRanges[0], matrixRange);
  assert.equal(colors.updateRanges[0], colorRange);
  assert.deepEqual(matrixRange, { start: 0, count: 32 });
  assert.deepEqual(colorRange, { start: 0, count: 6 });
  pool.dispose();
});

test("hiding a pooled part uploads once and restoring its old pose makes it visible", () => {
  const pool = new InstancePool(
      new Scene(),
      new BoxGeometry(),
      new MeshStandardMaterial(),
      4,
    ),
    slot = pool.allocate(),
    matrix = new Matrix4();
  pool.set(slot, 2, 1, 3, 1, 2, 1, 0, "white");
  pool.flush();
  pool.mesh.instanceMatrix.clearUpdateRanges();
  pool.hide(slot);
  pool.flush();
  const version = pool.mesh.instanceMatrix.version;
  pool.hide(slot);
  pool.flush();
  assert.equal(pool.mesh.instanceMatrix.version, version);
  pool.set(slot, 2, 1, 3, 1, 2, 1, 0, "white");
  pool.mesh.getMatrixAt(slot, matrix);
  assert.ok(matrix.determinant() > 0);
  pool.dispose();
});

test("floor disposal keeps shared material alive and releases the instance resources", () => {
  const scene = new Scene(),
    geometry = new BoxGeometry(),
    material = new MeshStandardMaterial(),
    pool = new InstancePool(scene, geometry, material, 4),
    disposed: string[] = [];
  geometry.addEventListener("dispose", () => disposed.push("geometry"));
  material.addEventListener("dispose", () => disposed.push("material"));
  pool.mesh.addEventListener("dispose", () => disposed.push("instances"));
  pool.dispose(false);
  assert.deepEqual(disposed.sort(), ["geometry", "instances"]);
  material.dispose();
  assert.deepEqual(disposed.sort(), ["geometry", "instances", "material"]);
});

test("pooled limbs support forward swing without changing floor heading", () => {
  const pool = new InstancePool(
      new Scene(),
      new BoxGeometry(),
      new MeshStandardMaterial(),
      4,
    ),
    slot = pool.allocate(),
    matrix = new Matrix4();
  pool.set(slot, 0, 1, 0, 1, 1, 1, 0, "white", 0, Math.PI / 2);
  pool.mesh.getMatrixAt(slot, matrix);
  const up = new Vector3(0, 1, 0).transformDirection(matrix);
  assert.ok(Math.abs(up.y) < 1e-6);
  assert.ok(Math.abs(up.z - 1) < 1e-6);
  pool.dispose();
});
