import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createMotion,
  setLimbPose,
  panelIsLit,
  updateMotion,
  zombieStrike,
} from "../src/view3d/animation";

test("stationary zombie strikes follow real attack cooldown edges and finish without restarting", () => {
  const motion = createMotion(4, 5, 0, 60);
  assert.equal(zombieStrike(motion, 0, 0), 0);
  assert.equal(zombieStrike(motion, 0.8, 0.1), 1);
  assert.equal(zombieStrike(motion, 0.8, 0.1), 1);
  assert.ok(Math.abs(zombieStrike(motion, 0.63, 0.27) - 0.5) < 1e-10);
  assert.equal(zombieStrike(motion, 0.4, 0.5), 0);
  assert.equal(zombieStrike(motion, 0.8, 1), 1);
  motion.hp = 0;
  assert.equal(zombieStrike(motion, 0.8, 1), 0);
});

test("humanoid gait follows measured displacement and stops when blocked", () => {
  const motion = createMotion(4, 5, 0, 100);
  updateMotion(motion, 4.1, 5, 0.05, 100);
  assert.ok(Math.abs(motion.speed - 2) < 1e-10);
  assert.ok(Math.abs(motion.phase - 0.7) < 1e-10);
  const phase = motion.phase;
  updateMotion(motion, 4.1, 5, 0.1, 100);
  assert.equal(motion.speed, 0);
  assert.equal(
    motion.phase,
    phase,
    "a blocked body cannot keep walking in place",
  );
  updateMotion(motion, 4.1, 5, 0.1, 100);
  assert.equal(
    motion.phase,
    phase,
    "multiple display frames per simulation tick do not advance feet",
  );
});

test("stair transfers do not make a huge stride; damage and death have stable animation times", () => {
  const motion = createMotion(4, 5, 1, 100);
  updateMotion(motion, 30, 20, 1.05, 86);
  assert.equal(motion.speed, 0);
  assert.equal(motion.phase, 0);
  assert.equal(motion.flinchUntil, 1.27);
  updateMotion(motion, 30, 20, 2, 0);
  assert.equal(motion.deathAt, 2);
  updateMotion(motion, 30, 20, 2.3, 0);
  assert.equal(
    motion.deathAt,
    2,
    "the collapse must finish rather than restart each frame",
  );
});

test("reduced flashing keeps dark-floor and Surge ceiling panels steady", () => {
  let flicker = false;
  for (let time = 0; time < 20; time += 0.1) {
    assert.equal(panelIsLit(1, time, 1, true, true), true);
    assert.equal(panelIsLit(1, time, 0, false, false), true);
    assert.equal(
      panelIsLit(0, time, 1, true, false),
      true,
      "most panels stay steady",
    );
    flicker ||= !panelIsLit(1, time, 1, true, false);
  }
  assert.equal(flicker, true, "selected fixtures really flicker during Surge");
});

test("limb swing keeps shoulder/hip attached and sends the foot/hand forward, including collapse", () => {
  const pose = { x: 0, y: 0, rotation: 0 };
  for (const [pivot, length] of [
    [0.86, 0.82],
    [1.435, 0.57],
  ]) {
    for (const swing of [-0.48, 0, 0.48, 1.15]) {
      for (const collapse of [0, 0.6, 1.48]) {
        setLimbPose(pose, pivot, length, swing, collapse);
        // Transform both ends of the same rendered box, rather than checking only its centre.
        const upperX = pose.x - (Math.sin(pose.rotation) * length) / 2;
        const upperY = pose.y + (Math.cos(pose.rotation) * length) / 2;
        assert.ok(
          Math.abs(upperX - (pivot - 0.18) * Math.sin(collapse)) < 1e-12,
        );
        assert.ok(
          Math.abs(upperY - (0.18 + (pivot - 0.18) * Math.cos(collapse))) <
            1e-12,
        );
        if (collapse === 0) {
          const lowerX = pose.x + (Math.sin(pose.rotation) * length) / 2;
          assert.ok(Math.abs(lowerX - Math.sin(swing) * length) < 1e-12);
        }
      }
    }
  }
});
