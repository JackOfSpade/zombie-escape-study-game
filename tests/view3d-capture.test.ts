import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { human } from "../src/engine";
import { TestRunner } from "../src/gametest/runner";
import { emptyScenario } from "../src/gametest/schema";
import type { Roadmap } from "../src/model";
import { FirstPersonControls } from "../src/view3d/controls";
import { firstPersonInput } from "../src/view3d/math";

const roadmap: Roadmap = JSON.parse(
  readFileSync("public/curriculum.json", "utf8"),
);

class CaptureDocument extends EventTarget {
  pointerLockElement: EventTarget | null = null;
  activeElement: EventTarget | null = null;

  exitPointerLock() {
    this.pointerLockElement = null;
    this.dispatchEvent(new Event("pointerlockchange"));
  }

  mouse(x: number, y: number) {
    this.dispatchEvent(
      Object.assign(new Event("mousemove"), {
        movementX: x,
        movementY: y,
        buttons: 0,
      }),
    );
  }
}

class CaptureCanvas extends EventTarget {
  requests = 0;

  constructor(private document: CaptureDocument) {
    super();
  }

  focus() {
    this.document.activeElement = this;
  }

  requestPointerLock() {
    this.requests++;
    this.document.pointerLockElement = this;
    this.document.dispatchEvent(new Event("pointerlockchange"));
  }
}

test("captured free look steers the real GameTest player until Escape pauses, then resumes after recapture", (t) => {
  const scenario = emptyScenario();
  scenario.id = "captured-free-look";
  scenario.name = "Captured look, Escape pause and recapture movement";
  scenario.maxTicks = 90;
  scenario.entities = [{ id: "human", kind: "player", x: 12, y: 12 }];
  scenario.checks = [
    {
      name: "Initial free look sends forward movement south",
      mode: "at",
      tick: 30,
      query: { type: "property", id: "human", field: "y" },
      op: "gte",
      expected: 15,
    },
    {
      name: "Recaptured look sends resumed forward movement east",
      mode: "at",
      tick: 90,
      query: { type: "property", id: "human", field: "x" },
      op: "gte",
      expected: 15,
    },
    {
      name: "Pausing prevents an extra second of engine time",
      mode: "at",
      tick: 90,
      query: { type: "worldTime" },
      op: "lte",
      expected: 2.0001,
    },
  ];
  const runner = new TestRunner(scenario, roadmap),
    descriptor = Object.getOwnPropertyDescriptor(globalThis, "document"),
    document = new CaptureDocument(),
    canvas = new CaptureCanvas(document);
  let unlocks = 0;
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: document,
  });
  const controls = new FirstPersonControls(
    canvas as unknown as HTMLCanvasElement,
    {
      canLook: () => !runner.game.paused,
      ownsKeyboard: () => false,
      onUnlock: () => {
        unlocks++;
        runner.game.paused = true;
      },
      onError: () => assert.fail("The synthetic capture should succeed"),
    },
  );
  t.after(() => {
    controls.dispose();
    if (descriptor) Object.defineProperty(globalThis, "document", descriptor);
    else Reflect.deleteProperty(globalThis, "document");
  });

  controls.lock();
  assert.equal(controls.isLocked, true);
  // No mousedown: ordinary mouse movement controls the camera immediately.
  document.mouse(Math.PI / 2 / 0.0022, -50);
  assert.ok(Math.abs(controls.yaw - Math.PI / 2) < 1e-10);
  assert.ok(controls.pitch > 0);
  const forward = new Set(["KeyW"]);
  runner.advance(30, firstPersonInput(controls.yaw, forward));
  assert.equal(runner.status, "running");
  assert.ok(Math.abs(human(runner.game).x - 12) < 1e-8);

  document.dispatchEvent(new Event("mouseup"));
  canvas.dispatchEvent(new Event("click"));
  document.mouse(10, 0);
  assert.equal(controls.isLocked, true);
  assert.equal(canvas.requests, 1);
  assert.equal(unlocks, 0);
  assert.ok(controls.yaw > Math.PI / 2);

  // Browser Escape exits pointer lock even when no Escape key event is sent.
  document.exitPointerLock();
  assert.equal(unlocks, 1);
  assert.equal(runner.game.paused, true);
  const pausedWorld = JSON.stringify(runner.game),
    pausedLook = controls.look();
  document.mouse(100, 100);
  runner.advance(30, firstPersonInput(controls.yaw, forward));
  assert.equal(JSON.stringify(runner.game), pausedWorld);
  assert.deepEqual(controls.look(), pausedLook);

  runner.game.paused = false;
  controls.lock();
  assert.equal(controls.isLocked, true);
  assert.equal(canvas.requests, 2);
  document.mouse(-controls.yaw / 0.0022, 0);
  assert.ok(Math.abs(controls.yaw) < 1e-10);
  const result = runner.advance(30, firstPersonInput(controls.yaw, forward));
  assert.equal(result.status, "passed", JSON.stringify(result));
  assert.ok(runner.game.time > 1.9999);
  assert.equal(unlocks, 1);
});
