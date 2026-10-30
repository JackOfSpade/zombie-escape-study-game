import type { Point } from "../model";
import { arrowTurn, clampPitch } from "./math";

/** A docked study question is HUD; only visible modal UI blocks game look. */
export function canLookInGame(state: {
  playing: boolean;
  paused: boolean;
  quitMenu: boolean;
  uiVisible: boolean;
}) {
  return state.playing && !state.paused && !state.quitMenu && !state.uiVisible;
}

interface ControlHooks {
  canLook(): boolean;
  ownsKeyboard(target: EventTarget | null): boolean;
  onUnlock(): void;
  onLook?(facing: Point): void;
  onError(): void;
  onRetry?(): void;
}

/** Pointer lock belongs to the play canvas; intentional UI releases never pause.
 * An unlocked canvas also supports dragging, including hosts without pointer lock. */
export class FirstPersonControls {
  yaw = 0;
  pitch = 0;
  private locked = false;
  private releasing = false;
  private requesting = false;
  private disposed = false;
  private unlockedAt = -Infinity;
  private dragging = false;
  private dragged = false;
  private dragX = 0;
  private dragY = 0;
  private events = new AbortController();

  constructor(
    private canvas: HTMLCanvasElement,
    private hooks: ControlHooks,
  ) {
    const options = { signal: this.events.signal };
    canvas.addEventListener(
      "click",
      () => {
        if (this.dragged) {
          this.dragged = false;
          return;
        }
        this.lock();
      },
      options,
    );
    canvas.addEventListener(
      "mousedown",
      (event) => this.startDrag(event),
      options,
    );
    document.addEventListener(
      "mouseup",
      () => {
        this.dragging = false;
      },
      options,
    );
    document.addEventListener(
      "pointerlockchange",
      () => this.changed(),
      options,
    );
    document.addEventListener("pointerlockerror", () => this.failed(), options);
    document.addEventListener(
      "mousemove",
      (event) => this.mouseLook(event),
      options,
    );
    globalThis.addEventListener?.(
      "blur",
      () => {
        this.dragging = false;
      },
      options,
    );
  }

  get isLocked() {
    return document.pointerLockElement === this.canvas;
  }

  get facing(): Point {
    return { x: Math.cos(this.yaw), y: Math.sin(this.yaw) };
  }

  look() {
    return { yaw: this.yaw, pitch: this.pitch };
  }

  setLook(yaw: number, pitch: number) {
    if (!Number.isFinite(yaw) || !Number.isFinite(pitch)) return;
    this.yaw = yaw % (Math.PI * 2);
    this.pitch = clampPitch(pitch);
    this.hooks.onLook?.(this.facing);
  }

  reset(heading: Point) {
    this.setLook(Math.atan2(heading.y, heading.x), 0);
  }

  turn(keys: ReadonlySet<string>, dt: number) {
    if (!this.canLook()) return;
    const yaw = arrowTurn(
      this.yaw,
      keys.has("ArrowLeft"),
      keys.has("ArrowRight"),
      dt,
    );
    if (yaw !== this.yaw) this.setLook(yaw, this.pitch);
  }

  release() {
    this.dragging = false;
    if (this.isLocked || this.locked || this.requesting) this.releasing = true;
    if (this.isLocked) document.exitPointerLock();
  }

  /** Browser lock-loss path, also callable by agent tests on hosts that refuse
   * pointer lock. UI actions use release() to avoid an unwanted pause. */
  unlock() {
    const intentional = this.releasing;
    this.locked = this.requesting = this.releasing = this.dragging = false;
    this.unlockedAt = performance.now();
    if (this.isLocked) document.exitPointerLock();
    if (!intentional && !this.disposed) this.hooks.onUnlock();
  }

  private canLook() {
    return (
      !this.disposed &&
      this.hooks.canLook() &&
      !this.hooks.ownsKeyboard(document.activeElement)
    );
  }

  private lock() {
    if (this.isLocked || this.requesting || this.releasing || !this.canLook())
      return;
    this.requesting = true;
    try {
      const request = this.canvas.requestPointerLock();
      // Older browsers return void from requestPointerLock.
      if (request) void request.catch((error) => this.failed(error));
    } catch (error) {
      this.failed(error);
    }
  }

  private failed(error?: unknown) {
    const requested = this.requesting,
      intentional = this.releasing;
    this.requesting = false;
    this.releasing = false;
    if (!requested || intentional || this.disposed) return;
    const name =
      error && typeof error === "object" && "name" in error ? error.name : "";
    const transient =
      performance.now() - this.unlockedAt < 2000 ||
      error === undefined ||
      name === "SecurityError" ||
      name === "NotAllowedError";
    if (transient) this.hooks.onRetry?.();
    else this.hooks.onError();
  }

  private changed() {
    const wasLocked = this.locked;
    this.locked = this.isLocked;
    if (this.locked) {
      this.requesting = false;
      this.dragging = false;
      if (this.releasing || !this.canLook()) this.release();
    } else if (wasLocked || this.requesting) {
      // Acquisition and Escape can both precede queued change callbacks.
      this.unlock();
    }
  }

  private startDrag(event: MouseEvent) {
    if (event.button !== 0 || this.isLocked || !this.canLook()) return;
    this.dragging = true;
    this.dragged = false;
    this.dragX = event.clientX;
    this.dragY = event.clientY;
    this.canvas.focus?.({ preventScroll: true });
    event.preventDefault();
  }

  private mouseLook(event: MouseEvent) {
    if (!this.canLook()) {
      this.dragging = false;
      return;
    }
    let x: number, y: number;
    if (this.isLocked) {
      x = event.movementX;
      y = event.movementY;
    } else if (this.dragging) {
      x = event.clientX - this.dragX;
      y = event.clientY - this.dragY;
      this.dragX = event.clientX;
      this.dragY = event.clientY;
      if (x || y) this.dragged = true;
    } else return;
    this.setLook(this.yaw + x * 0.0022, this.pitch - y * 0.0022);
  }

  dispose() {
    this.disposed = true;
    this.release();
    this.events.abort();
  }
}
