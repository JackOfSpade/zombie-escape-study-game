import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { canLookInGame, FirstPersonControls } from "../src/view3d/controls";
import { MAX_PITCH } from "../src/view3d/math";
import type { Point } from "../src/model";

class PointerDocument extends EventTarget {
  pointerLockElement: EventTarget | null = null;
  activeElement: EventTarget | null = null;
  exits = 0;
  exitPointerLock() {
    this.exits++;
    this.pointerLockElement = null;
  }
  changed() {
    this.dispatchEvent(new Event("pointerlockchange"));
  }
  mouse(x: number, y: number) {
    this.dispatchEvent(
      Object.assign(new Event("mousemove"), { movementX: x, movementY: y }),
    );
  }
}
class PointerCanvas extends EventTarget {
  requests = 0;
  request: () => void | Promise<void>;
  constructor(document: PointerDocument) {
    super();
    this.request = () => {
      document.pointerLockElement = this;
    };
  }
  requestPointerLock() {
    this.requests++;
    return this.request();
  }
  click() {
    this.dispatchEvent(new Event("click"));
  }
}
function fixture(t: TestContext, canLook?: () => boolean) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "document"),
    document = new PointerDocument(),
    canvas = new PointerCanvas(document),
    input = new EventTarget(),
    state = {
      canLook: true,
      unlocks: 0,
      errors: 0,
      retries: 0,
      looks: [] as Point[],
    };
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: document,
  });
  const controls = new FirstPersonControls(
    canvas as unknown as HTMLCanvasElement,
    {
      canLook: canLook ?? (() => state.canLook),
      ownsKeyboard: (target) => target === input,
      onUnlock: () => state.unlocks++,
      onError: () => state.errors++,
      onRetry: () => state.retries++,
      onLook: (facing) => state.looks.push(facing),
    },
  );
  t.after(() => {
    controls.dispose();
    if (descriptor) Object.defineProperty(globalThis, "document", descriptor);
    else Reflect.deleteProperty(globalThis, "document");
  });
  return { document, canvas, controls, input, state };
}
function near(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
}

test("game look depends on visible modal UI rather than a pending docked question", () => {
  const available = {
    playing: true,
    paused: false,
    quitMenu: false,
    uiVisible: false,
  };
  assert.equal(canLookInGame(available), true);
  assert.equal(canLookInGame({ ...available, playing: false }), false);
  assert.equal(canLookInGame({ ...available, paused: true }), false);
  assert.equal(canLookInGame({ ...available, quitMenu: true }), false);
  assert.equal(canLookInGame({ ...available, uiVisible: true }), false);
});

test("a pending docked question permits recapture and look after an intentional UI release", (t) => {
  const { document, canvas, controls, input, state } = fixture(t, () =>
    canLookInGame({
      playing: true,
      paused: false,
      quitMenu: false,
      uiVisible: false,
    }),
  );
  canvas.click();
  document.changed();
  controls.release();
  document.changed();
  canvas.click();
  document.changed();
  assert.equal(canvas.requests, 2);
  document.mouse(100, -50);
  near(controls.yaw, 0.22);
  near(controls.pitch, 0.11);
  controls.turn(new Set(["ArrowRight"]), 0.25);
  near(controls.yaw, 0.87);
  assert.equal(document.exits, 1);
  assert.equal(state.unlocks, 0);

  document.activeElement = input;
  const before = controls.look();
  canvas.click();
  document.mouse(100, 100);
  controls.turn(new Set(["ArrowRight"]), 0.25);
  assert.equal(canvas.requests, 2);
  assert.deepEqual(controls.look(), before);
  assert.equal(state.unlocks, 0);
});

test("browser Escape unlock pauses exactly once without requiring a key event", (t) => {
  const { document, canvas, controls, state } = fixture(t);
  canvas.click();
  document.changed();
  assert.equal(controls.isLocked, true);
  document.pointerLockElement = null;
  document.changed();
  document.changed();
  assert.equal(state.unlocks, 1);
});
test("intentional UI release suppresses pause and permits the next ordinary unlock", (t) => {
  const { document, canvas, controls, state } = fixture(t);
  canvas.click();
  document.changed();
  controls.release();
  document.changed();
  assert.equal(document.exits, 1);
  assert.equal(state.unlocks, 0);
  canvas.click();
  document.changed();
  document.pointerLockElement = null;
  document.changed();
  assert.equal(state.unlocks, 1);
});
test("intentional release remains intentional when the browser's loss event is queued", (t) => {
  const { document, canvas, controls, state } = fixture(t);
  canvas.click();
  document.changed();
  document.pointerLockElement = null;
  controls.release();
  document.changed();
  assert.equal(state.unlocks, 0);
});
test("cancelling a pending lock releases its later acquisition without pausing", (t) => {
  const { document, canvas, controls, state } = fixture(t);
  canvas.request = () => {};
  canvas.click();
  controls.release();
  document.pointerLockElement = canvas;
  document.changed();
  assert.equal(controls.isLocked, false);
  document.changed();
  assert.equal(state.unlocks, 0);
  canvas.request = () => {
    document.pointerLockElement = canvas;
  };
  canvas.click();
  document.changed();
  document.pointerLockElement = null;
  document.changed();
  assert.equal(state.unlocks, 1);
});
test("acquisition followed by Escape before queued change events still pauses once", (t) => {
  const { document, canvas, state } = fixture(t);
  canvas.click();
  document.pointerLockElement = null;
  document.changed();
  document.changed();
  assert.equal(state.unlocks, 1);
});
test("text focus and unavailable gameplay prevent lock requests and mouse look", (t) => {
  const { document, canvas, controls, input, state } = fixture(t);
  state.canLook = false;
  canvas.click();
  state.canLook = true;
  document.activeElement = input;
  canvas.click();
  assert.equal(canvas.requests, 0);
  document.activeElement = null;
  canvas.click();
  document.changed();
  document.activeElement = input;
  document.mouse(100, 100);
  document.activeElement = null;
  state.canLook = false;
  document.mouse(100, 100);
  assert.equal(controls.yaw, 0);
  assert.equal(controls.pitch, 0);
  assert.equal(state.looks.length, 0);
});
test("text focus acquired during a pending request releases the new lock", (t) => {
  const { document, canvas, controls, input, state } = fixture(t);
  canvas.request = () => {};
  canvas.click();
  document.activeElement = input;
  document.pointerLockElement = canvas;
  document.changed();
  assert.equal(controls.isLocked, false);
  document.changed();
  assert.equal(state.unlocks, 0);
});
test("a dialog opened during a pending request releases the new lock", (t) => {
  const { document, canvas, controls, state } = fixture(t);
  canvas.request = () => {};
  canvas.click();
  state.canLook = false;
  document.pointerLockElement = canvas;
  document.changed();
  assert.equal(controls.isLocked, false);
  document.changed();
  assert.equal(state.unlocks, 0);
});
test("mouse look follows yaw, clamps pitch, and publishes normalized world facing", (t) => {
  const { document, canvas, controls, state } = fixture(t);
  document.mouse(100, -100);
  assert.equal(controls.yaw, 0);
  canvas.click();
  document.changed();
  document.mouse(100, -100);
  near(controls.yaw, 0.22);
  near(controls.pitch, 0.22);
  near(state.looks[0].x, Math.cos(0.22));
  near(state.looks[0].y, Math.sin(0.22));
  document.mouse(0, -100000);
  assert.equal(controls.pitch, MAX_PITCH);
  document.mouse(0, 100000);
  assert.equal(controls.pitch, -MAX_PITCH);
  controls.reset({ x: 0, y: -1 });
  near(controls.yaw, -Math.PI / 2);
  assert.equal(controls.pitch, 0);
  near(controls.facing.x, 0);
  near(controls.facing.y, -1);
});
test("request failures report once and never synthesize an unlock pause", async (t) => {
  const { document, canvas, state } = fixture(t);
  canvas.request = () => {
    throw Error("lock unavailable");
  };
  canvas.click();
  assert.equal(state.errors, 1);
  canvas.request = () => Promise.reject(Error("lock denied"));
  canvas.click();
  await Promise.resolve();
  document.dispatchEvent(new Event("pointerlockerror"));
  assert.equal(state.errors, 2);
  assert.equal(state.unlocks, 0);
});
test("dispose aborts canvas/document listeners and releases without pausing", (t) => {
  const { document, canvas, controls, state } = fixture(t);
  canvas.click();
  document.changed();
  controls.dispose();
  document.changed();
  canvas.click();
  document.mouse(100, 100);
  document.dispatchEvent(new Event("pointerlockerror"));
  assert.equal(canvas.requests, 1);
  assert.equal(controls.isLocked, false);
  assert.equal(state.unlocks, 0);
  assert.equal(state.errors, 0);
  assert.equal(state.looks.length, 0);
});

test("unlocked dragging cannot rotate the view; a click retries mouse capture", (t) => {
  const { document, canvas, controls, state } = fixture(t);
  canvas.dispatchEvent(
    Object.assign(new Event("mousedown"), {
      button: 0,
      clientX: 100,
      clientY: 120,
    }),
  );
  document.dispatchEvent(
    Object.assign(new Event("mousemove"), {
      clientX: 200,
      clientY: 70,
    }),
  );
  assert.deepEqual(controls.look(), { yaw: 0, pitch: 0 });
  document.dispatchEvent(new Event("mouseup"));
  assert.equal(canvas.requests, 0);
  canvas.click();
  document.changed();
  assert.equal(canvas.requests, 1);
  document.mouse(100, -50);
  near(controls.yaw, 0.22);
  near(controls.pitch, 0.11);
  assert.equal(state.unlocks, 0);
});
test("entering gameplay captures the mouse without a canvas click and mouseup keeps free look active", (t) => {
  const { document, canvas, controls, state } = fixture(t);
  controls.lock();
  document.changed();
  document.mouse(100, -50);
  document.dispatchEvent(new Event("mouseup"));
  canvas.click();
  document.mouse(100, -50);
  assert.equal(canvas.requests, 1);
  assert.equal(document.exits, 0);
  assert.equal(controls.isLocked, true);
  near(controls.yaw, 0.44);
  near(controls.pitch, 0.22);
  assert.equal(state.unlocks, 0);
});
test("text entry and study UI prevent unlocked dragging and keyboard turns", (t) => {
  const { document, canvas, controls, input, state } = fixture(t);
  for (const typing of [false, true]) {
    state.canLook = typing;
    document.activeElement = typing ? input : null;
    canvas.dispatchEvent(
      Object.assign(new Event("mousedown"), {
        button: 0,
        clientX: 100,
        clientY: 100,
      }),
    );
    document.dispatchEvent(
      Object.assign(new Event("mousemove"), {
        clientX: 200,
        clientY: 200,
      }),
    );
    controls.turn(new Set(["ArrowRight"]), 0.1);
    assert.deepEqual(controls.look(), { yaw: 0, pitch: 0 });
  }
});
test("arrow keys turn without a lock and setLook gives deterministic clamped aiming", (t) => {
  const { controls } = fixture(t);
  controls.turn(new Set(["ArrowRight"]), 0.25);
  near(controls.yaw, 0.65);
  controls.turn(new Set(["ArrowLeft"]), 0.25);
  near(controls.yaw, 0);
  controls.setLook(Math.PI / 2, 100);
  assert.deepEqual(controls.look(), { yaw: Math.PI / 2, pitch: MAX_PITCH });
  controls.setLook(NaN, 0);
  controls.setLook(0, Infinity);
  assert.deepEqual(controls.look(), { yaw: Math.PI / 2, pitch: MAX_PITCH });
});
test("SecurityError refusal prompts a retry and the next capture restores free look", async (t) => {
  const { canvas, document, controls, state } = fixture(t);
  canvas.request = () =>
    Promise.reject(new DOMException("recent unlock", "SecurityError"));
  canvas.click();
  await Promise.resolve();
  document.dispatchEvent(new Event("pointerlockerror"));
  assert.equal(state.retries, 1);
  assert.equal(state.errors, 0);
  assert.equal(state.unlocks, 0);
  canvas.dispatchEvent(
    Object.assign(new Event("mousedown"), {
      button: 0,
      clientX: 20,
      clientY: 20,
    }),
  );
  document.dispatchEvent(
    Object.assign(new Event("mousemove"), {
      clientX: 70,
      clientY: 20,
    }),
  );
  near(controls.yaw, 0);
  canvas.request = () => {
    document.pointerLockElement = canvas;
  };
  controls.lock();
  document.changed();
  document.mouse(50, 0);
  near(controls.yaw, 0.11);
  assert.equal(canvas.requests, 2);
});
test("immediate relock refusal after Escape is transient even without an error name", (t) => {
  const { document, canvas, state } = fixture(t);
  canvas.click();
  document.changed();
  document.pointerLockElement = null;
  document.changed();
  canvas.request = () => {
    throw Error("cooldown");
  };
  canvas.click();
  assert.equal(state.unlocks, 1);
  assert.equal(state.retries, 1);
  assert.equal(state.errors, 0);
});
test("direct unlock uses the same loss callback and queued browser events cannot double-pause", (t) => {
  const { document, canvas, controls, state } = fixture(t);
  canvas.click();
  document.changed();
  controls.unlock();
  document.changed();
  assert.equal(controls.isLocked, false);
  assert.equal(state.unlocks, 1);
});

test("an untyped pointerlockerror event asks for retry without claiming look is unavailable", (t) => {
  const { canvas, document, state } = fixture(t);
  canvas.request = () => {};
  canvas.click();
  document.dispatchEvent(new Event("pointerlockerror"));
  assert.equal(state.errors, 0);
  assert.equal(state.retries, 1);
  assert.equal(state.unlocks, 0);
});
