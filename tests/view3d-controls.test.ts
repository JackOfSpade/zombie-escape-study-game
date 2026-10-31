import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { canLookInGame, FirstPersonControls } from "../src/view3d/controls";
import { edgeTurnRate, MAX_PITCH } from "../src/view3d/math";
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
  requestOptions: ({ unadjustedMovement: boolean } | undefined)[] = [];
  request: () => void | Promise<void>;
  constructor(document: PointerDocument) {
    super();
    this.request = () => {
      document.pointerLockElement = this;
    };
  }
  requestPointerLock(options?: { unadjustedMovement: boolean }) {
    this.requests++;
    this.requestOptions.push(options);
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
      unconfined: 0,
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
      onUnconfined: () => state.unconfined++,
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

const captureRect = { left: 100, top: 50, width: 1000, height: 800 };
function captureCanvas(canvas: PointerCanvas) {
  const classes = new Set<string>();
  return Object.assign(canvas, {
    classList: {
      add: (name: string) => {
        classes.add(name);
      },
      remove: (name: string) => {
        classes.delete(name);
      },
      contains: (name: string) => classes.has(name),
    },
    getBoundingClientRect: () => ({ ...captureRect }),
  });
}
function cursor(document: PointerDocument, x: number, y: number) {
  document.dispatchEvent(
    Object.assign(new Event("mousemove"), {
      movementX: 0,
      movementY: 0,
      clientX: x,
      clientY: y,
    }),
  );
}
function unconfine(document: PointerDocument) {
  cursor(document, 600, 450);
  cursor(document, 1090, 450);
  cursor(document, 1095, 450);
  cursor(document, 1100, 450);
}

test("vertical arrows look up and down without mouse capture and compose with yaw", (t) => {
  const { controls, state } = fixture(t);
  controls.turn(new Set(["ArrowUp"]), 0.25);
  near(controls.pitch, 0.35);
  near(controls.yaw, 0);
  assert.equal(state.looks.length, 1);
  controls.turn(new Set(["ArrowDown"]), 0.5);
  near(controls.pitch, -0.35);
  near(controls.yaw, 0);
  assert.equal(state.looks.length, 2);
  controls.turn(new Set(["ArrowUp", "ArrowRight"]), 0.25);
  near(controls.pitch, 0);
  near(controls.yaw, 0.65);
  assert.equal(state.looks.length, 3);
  near(state.looks[2].x, Math.cos(0.65));
  near(state.looks[2].y, Math.sin(0.65));
  controls.turn(new Set(["ArrowDown", "ArrowLeft"]), 0.25);
  near(controls.pitch, -0.35);
  near(controls.yaw, 0);
  assert.equal(state.looks.length, 4);
});

test("vertical arrow look clamps pitch and ignores invalid durations", (t) => {
  const { controls, state } = fixture(t);
  controls.turn(new Set(["ArrowUp"]), 10);
  assert.equal(controls.pitch, MAX_PITCH);
  controls.turn(new Set(["ArrowDown"]), 10);
  assert.equal(controls.pitch, -MAX_PITCH);
  const before = controls.look(),
    looks = state.looks.length;
  for (const dt of [0, -1, NaN, Infinity, -Infinity])
    controls.turn(new Set(["ArrowUp", "ArrowRight"]), dt);
  assert.deepEqual(controls.look(), before);
  assert.equal(state.looks.length, looks);
});

test("vertical arrows cannot change look when gameplay or keyboard focus blocks it", (t) => {
  const { controls, document, input, state } = fixture(t);
  controls.setLook(0.4, 0.2);
  const before = controls.look(),
    looks = state.looks.length;
  for (const typing of [false, true]) {
    state.canLook = typing;
    document.activeElement = typing ? input : null;
    for (const vertical of ["ArrowUp", "ArrowDown"])
      controls.turn(new Set([vertical, "ArrowRight"]), 0.25);
    assert.deepEqual(controls.look(), before);
    assert.equal(state.looks.length, looks);
  }
});

test("vertical arrow look composes with unconfined edge turning in one update", (t) => {
  const { controls, canvas, document, state } = fixture(t);
  captureCanvas(canvas);
  canvas.click();
  document.changed();
  unconfine(document);
  cursor(document, 1100, 50);
  const looks = state.looks.length;
  controls.turn(new Set(["ArrowUp", "ArrowRight"]), 0.25);
  near(controls.yaw, 1.25);
  near(controls.pitch, 0.65);
  assert.equal(state.looks.length, looks + 1);
  // Reposition without a mouse-look callback so the count isolates turn().
  state.canLook = false;
  cursor(document, 100, 850);
  state.canLook = true;
  assert.equal(state.looks.length, looks + 1);
  controls.turn(new Set(["ArrowDown", "ArrowLeft"]), 0.25);
  near(controls.yaw, 0);
  near(controls.pitch, 0);
  assert.equal(state.looks.length, looks + 2);
});

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

test("capture requests unadjusted movement first and accepts older void returns", (t) => {
  const { canvas, document, controls, state } = fixture(t);
  controls.lock();
  document.changed();
  assert.equal(canvas.requests, 1);
  assert.deepEqual(canvas.requestOptions, [{ unadjustedMovement: true }]);
  assert.equal(controls.isLocked, true);
  assert.equal(state.errors, 0);
  assert.equal(state.retries, 0);
});

for (const asynchronous of [false, true]) {
  test(`NotSupportedError ${asynchronous ? "rejection" : "throw"} retries once without options or notices`, async (t) => {
    const { canvas, document, controls, state } = fixture(t);
    canvas.request = () => {
      if (canvas.requests === 1) {
        const error = new DOMException(
          "raw input unavailable",
          "NotSupportedError",
        );
        if (asynchronous) return Promise.reject(error);
        throw error;
      }
      assert.equal(state.errors, 0);
      assert.equal(state.retries, 0);
      controls.lock();
      assert.equal(canvas.requests, 2);
      document.pointerLockElement = canvas;
      return undefined;
    };
    controls.lock();
    await Promise.resolve();
    document.changed();
    assert.equal(canvas.requests, 2);
    assert.deepEqual(canvas.requestOptions, [
      { unadjustedMovement: true },
      undefined,
    ]);
    assert.equal(controls.isLocked, true);
    assert.equal(state.errors, 0);
    assert.equal(state.retries, 0);
    assert.equal(state.unlocks, 0);
  });

  test(`WrongDocumentError ${asynchronous ? "rejection" : "throw"} prompts retry rather than permanent failure`, async (t) => {
    const { canvas, document, state } = fixture(t);
    canvas.request = () => {
      const error = new DOMException(
        "window not focused",
        "WrongDocumentError",
      );
      if (asynchronous) return Promise.reject(error);
      throw error;
    };
    canvas.click();
    await Promise.resolve();
    document.dispatchEvent(new Event("pointerlockerror"));
    assert.equal(canvas.requests, 1);
    assert.equal(state.retries, 1);
    assert.equal(state.errors, 0);
    assert.equal(state.unlocks, 0);
  });
}

test("a failed plain fallback uses the ordinary failure path without another retry", (t) => {
  const { canvas, controls, state } = fixture(t);
  canvas.request = () => {
    throw new DOMException("capture unavailable", "NotSupportedError");
  };
  controls.lock();
  assert.equal(canvas.requests, 2);
  assert.deepEqual(canvas.requestOptions, [
    { unadjustedMovement: true },
    undefined,
  ]);
  assert.equal(state.errors, 1);
  assert.equal(state.retries, 0);
});

test("unconfined detection requires three locked positions more than four pixels from the first", (t) => {
  const { canvas, document, controls, state } = fixture(t);
  unconfine(document);
  assert.equal(state.unconfined, 0);
  assert.deepEqual(controls.look(), { yaw: 0, pitch: 0 });
  canvas.click();
  document.changed();
  for (let i = 0; i < 6; i++) cursor(document, 100, 100);
  assert.equal(state.unconfined, 0);
  cursor(document, 104, 100);
  cursor(document, 100, 104);
  cursor(document, 102, 102);
  assert.equal(state.unconfined, 0);
  cursor(document, 105, 100);
  assert.equal(state.unconfined, 0);
  cursor(document, 108, 100);
  assert.equal(state.unconfined, 0);
  cursor(document, 100, 106);
  assert.equal(state.unconfined, 1);
  for (let i = 0; i < 6; i++) cursor(document, 1100, 850);
  assert.equal(state.unconfined, 1);
});

test("missing or nonfinite cursor coordinates cannot establish unconfined capture", (t) => {
  const { canvas, document, controls, state } = fixture(t);
  canvas.click();
  document.changed();
  for (let i = 0; i < 6; i++) {
    document.mouse(0, 0);
    cursor(document, NaN, 100);
    cursor(document, 100, Infinity);
    document.dispatchEvent(
      Object.assign(new Event("mousemove"), {
        movementX: 0,
        movementY: 0,
        clientX: 1000,
      }),
    );
  }
  cursor(document, 1100, 850);
  cursor(document, 1100, 850);
  cursor(document, 1100, 850);
  assert.equal(state.unconfined, 0);
  controls.turn(new Set(), 1);
  assert.deepEqual(controls.look(), { yaw: 0, pitch: 0 });
});

test("edge rates are zero in the centre and at inner band boundaries", () => {
  assert.deepEqual(edgeTurnRate(600, 450, captureRect), { yaw: 0, pitch: 0 });
  assert.deepEqual(edgeTurnRate(160, 98, captureRect), { yaw: 0, pitch: 0 });
  assert.deepEqual(edgeTurnRate(1040, 802, captureRect), { yaw: 0, pitch: 0 });
});

test("edge rates match mouse signs and reach capped speeds at and beyond every edge", () => {
  for (const x of [100, 0]) {
    assert.deepEqual(edgeTurnRate(x, 450, captureRect), {
      yaw: -2.4,
      pitch: 0,
    });
  }
  for (const x of [1100, 1200]) {
    assert.deepEqual(edgeTurnRate(x, 450, captureRect), { yaw: 2.4, pitch: 0 });
  }
  for (const y of [50, -50]) {
    assert.deepEqual(edgeTurnRate(600, y, captureRect), { yaw: 0, pitch: 1.2 });
  }
  for (const y of [850, 950]) {
    assert.deepEqual(edgeTurnRate(600, y, captureRect), {
      yaw: 0,
      pitch: -1.2,
    });
  }
  assert.deepEqual(edgeTurnRate(100, 50, captureRect), {
    yaw: -2.4,
    pitch: 1.2,
  });
  near(edgeTurnRate(130, 450, captureRect).yaw, -1.2);
  near(edgeTurnRate(1070, 450, captureRect).yaw, 1.2);
  near(edgeTurnRate(600, 74, captureRect).pitch, 0.6);
  near(edgeTurnRate(600, 826, captureRect).pitch, -0.6);
  const small = { left: 0, top: 0, width: 200, height: 100 };
  near(edgeTurnRate(12, 50, small).yaw, -1.2);
  near(edgeTurnRate(100, 12, small).pitch, 0.6);
});

test("edge rates ignore unusable coordinates and empty rectangles", () => {
  assert.deepEqual(edgeTurnRate(NaN, 450, captureRect), { yaw: 0, pitch: 0 });
  assert.deepEqual(edgeTurnRate(600, Infinity, captureRect), {
    yaw: 0,
    pitch: 0,
  });
  assert.deepEqual(edgeTurnRate(600, 450, { ...captureRect, width: 0 }), {
    yaw: 0,
    pitch: 0,
  });
  assert.deepEqual(edgeTurnRate(600, 450, { ...captureRect, height: -1 }), {
    yaw: 0,
    pitch: 0,
  });
});

test("only unconfined capture turns continuously at cursor edges and composes with arrows", (t) => {
  const { canvas, document, controls, state } = fixture(t);
  captureCanvas(canvas);
  canvas.click();
  document.changed();
  for (let i = 0; i < 5; i++) cursor(document, 1100, 450);
  controls.turn(new Set(), 0.25);
  assert.deepEqual(controls.look(), { yaw: 0, pitch: 0 });
  assert.equal(state.unconfined, 0);
  cursor(document, 600, 450);
  cursor(document, 610, 450);
  assert.equal(state.unconfined, 0);
  controls.turn(new Set(), 0.25);
  assert.deepEqual(controls.look(), { yaw: 0, pitch: 0 });
  cursor(document, 620, 450);
  assert.equal(state.unconfined, 1);
  cursor(document, 1100, 450);
  const looks = state.looks.length;
  controls.turn(new Set(), 0.25);
  near(controls.yaw, 0.6);
  assert.equal(state.looks.length, looks + 1);
  near(state.looks[looks].x, Math.cos(0.6));
  near(state.looks[looks].y, Math.sin(0.6));
  controls.turn(new Set(), 0.25);
  near(controls.yaw, 1.2);
  cursor(document, 100, 450);
  controls.turn(new Set(), 0.25);
  near(controls.yaw, 0.6);
  controls.turn(new Set(["ArrowRight"]), 0.25);
  near(controls.yaw, 0.65);
  cursor(document, 600, 450);
  const before = controls.look(),
    published = state.looks.length;
  controls.turn(new Set(), 1);
  assert.deepEqual(controls.look(), before);
  assert.equal(state.looks.length, published);
});

test("unconfined edge turning respects gameplay and text focus and never runs unlocked", (t) => {
  const { canvas, document, controls, input, state } = fixture(t);
  captureCanvas(canvas);
  canvas.click();
  document.changed();
  unconfine(document);
  state.canLook = false;
  controls.turn(new Set(["ArrowRight"]), 0.25);
  assert.deepEqual(controls.look(), { yaw: 0, pitch: 0 });
  state.canLook = true;
  document.activeElement = input;
  controls.turn(new Set(["ArrowRight"]), 0.25);
  assert.deepEqual(controls.look(), { yaw: 0, pitch: 0 });
  document.activeElement = null;
  controls.turn(new Set(), 0.25);
  near(controls.yaw, 0.6);
  document.pointerLockElement = null;
  const before = controls.look();
  cursor(document, 100, 50);
  controls.turn(new Set(), 0.25);
  assert.deepEqual(controls.look(), before);
  document.changed();
  cursor(document, 1100, 850);
  controls.turn(new Set(), 0.25);
  assert.deepEqual(controls.look(), before);
});

test("edge pitch follows mouse signs and is clamped through setLook", (t) => {
  const { canvas, document, controls, state } = fixture(t);
  captureCanvas(canvas);
  canvas.click();
  document.changed();
  unconfine(document);
  cursor(document, 600, 50);
  controls.turn(new Set(), 0.25);
  near(controls.pitch, 0.3);
  controls.setLook(0, MAX_PITCH - 0.01);
  const looks = state.looks.length;
  controls.turn(new Set(), 0.25);
  assert.equal(controls.pitch, MAX_PITCH);
  assert.equal(state.looks.length, looks + 1);
  cursor(document, 600, 850);
  controls.setLook(0, 0);
  controls.turn(new Set(), 0.25);
  near(controls.pitch, -0.3);
  controls.setLook(0, -MAX_PITCH + 0.01);
  controls.turn(new Set(), 0.25);
  assert.equal(controls.pitch, -MAX_PITCH);
});

test("release and unlock reset per-lock detection but the guidance only fires once per page", (t) => {
  const { canvas, document, controls, state } = fixture(t);
  captureCanvas(canvas);
  canvas.click();
  document.changed();
  unconfine(document);
  assert.equal(state.unconfined, 1);
  controls.release();
  document.changed();
  canvas.click();
  document.changed();
  for (let i = 0; i < 5; i++) cursor(document, 1100, 450);
  controls.turn(new Set(), 0.25);
  assert.deepEqual(controls.look(), { yaw: 0, pitch: 0 });
  assert.equal(state.unconfined, 1);
  unconfine(document);
  controls.turn(new Set(), 0.25);
  near(controls.yaw, 0.6);
  assert.equal(state.unconfined, 1);
  controls.unlock();
  document.changed();
  canvas.click();
  document.changed();
  for (let i = 0; i < 5; i++) cursor(document, 1100, 450);
  const before = controls.look();
  controls.turn(new Set(), 0.25);
  assert.deepEqual(controls.look(), before);
  assert.equal(state.unconfined, 1);
});

test("recreating controls in the same page does not repeat unconfined guidance", (t) => {
  const { canvas, document, controls, state } = fixture(t);
  canvas.click();
  document.changed();
  unconfine(document);
  assert.equal(state.unconfined, 1);
  controls.dispose();
  let notices = 0;
  const replacement = new FirstPersonControls(
    canvas as unknown as HTMLCanvasElement,
    {
      canLook: () => true,
      ownsKeyboard: () => false,
      onUnlock: () => {},
      onError: () => {},
      onUnconfined: () => notices++,
    },
  );
  try {
    replacement.lock();
    document.changed();
    unconfine(document);
    assert.equal(notices, 0);
  } finally {
    replacement.dispose();
  }
});

test("unconfined capture on fixtures without canvas geometry safely skips edge turning", (t) => {
  const { canvas, document, controls, state } = fixture(t);
  canvas.click();
  document.changed();
  unconfine(document);
  assert.equal(state.unconfined, 1);
  controls.turn(new Set(), 0.25);
  assert.deepEqual(controls.look(), { yaw: 0, pitch: 0 });
  controls.turn(new Set(["ArrowRight"]), 0.25);
  near(controls.yaw, 0.65);
});

test("mouse-captured class follows acquisition, Escape, release, unlock and dispose", (t) => {
  const { canvas, document, controls } = fixture(t);
  const { classList } = captureCanvas(canvas);
  assert.equal(classList.contains("mouse-captured"), false);
  canvas.click();
  document.changed();
  assert.equal(classList.contains("mouse-captured"), true);
  document.pointerLockElement = null;
  document.changed();
  assert.equal(classList.contains("mouse-captured"), false);
  canvas.click();
  document.changed();
  assert.equal(classList.contains("mouse-captured"), true);
  controls.release();
  assert.equal(classList.contains("mouse-captured"), false);
  document.changed();
  canvas.click();
  document.changed();
  assert.equal(classList.contains("mouse-captured"), true);
  controls.unlock();
  assert.equal(classList.contains("mouse-captured"), false);
  document.changed();
  canvas.click();
  document.changed();
  assert.equal(classList.contains("mouse-captured"), true);
  controls.dispose();
  assert.equal(classList.contains("mouse-captured"), false);
  document.changed();
  assert.equal(classList.contains("mouse-captured"), false);
});
