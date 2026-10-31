import type { Point } from "../model";
import { arrowPitch, arrowTurn, clampPitch, edgeTurnRate } from "./math";

const unconfinedPages = new WeakSet<Document>();

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
  onUnconfined?(): void;
}

/** Pointer lock provides continuous mouse look until pause or interactive UI.
 * Intentional UI releases never trigger an additional pause. */
export class FirstPersonControls {
  yaw = 0;
  pitch = 0;
  private locked = false;
  private releasing = false;
  private requesting = false;
  private disposed = false;
  private unconfined = false;
  private firstCursor: Point | undefined;
  private cursor: Point | undefined;
  private movedEvents = 0;
  private unlockedAt = -Infinity;
  private events = new AbortController();

  constructor(
    private canvas: HTMLCanvasElement,
    private hooks: ControlHooks,
  ) {
    const options = { signal: this.events.signal };
    canvas.addEventListener("click", () => this.lock(), options);
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
    if (!this.canLook() || !Number.isFinite(dt) || dt <= 0) return;
    let yaw = arrowTurn(
      this.yaw,
      keys.has("ArrowLeft"),
      keys.has("ArrowRight"),
      dt,
    );
    let pitch = arrowPitch(
      this.pitch,
      keys.has("ArrowUp"),
      keys.has("ArrowDown"),
      dt,
    );
    if (
      this.isLocked &&
      this.unconfined &&
      this.cursor &&
      this.canvas.getBoundingClientRect
    ) {
      const rate = edgeTurnRate(
        this.cursor.x,
        this.cursor.y,
        this.canvas.getBoundingClientRect(),
      );
      yaw += rate.yaw * dt;
      pitch += rate.pitch * dt;
    }
    if (yaw !== this.yaw || pitch !== this.pitch) this.setLook(yaw, pitch);
  }

  private resetCapture() {
    this.unconfined = false;
    this.firstCursor = this.cursor = undefined;
    this.movedEvents = 0;
    this.canvas.classList?.remove("mouse-captured");
  }

  release() {
    if (this.isLocked || this.locked || this.requesting) this.releasing = true;
    this.resetCapture();
    if (this.isLocked) document.exitPointerLock();
  }

  /** Browser lock-loss path, also callable by agent tests on hosts that refuse
   * pointer lock. UI actions use release() to avoid an unwanted pause. */
  unlock() {
    const intentional = this.releasing;
    this.locked = this.requesting = this.releasing = false;
    this.resetCapture();
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

  /** Call during the user gesture that enters or resumes gameplay. */
  lock() {
    if (this.isLocked || this.requesting || this.releasing || !this.canLook())
      return;
    this.requesting = true;
    const request = (raw: boolean) => {
      const failed = (error: unknown) => {
        if (
          raw &&
          error instanceof DOMException &&
          error.name === "NotSupportedError"
        ) {
          request(false);
        } else this.failed(error);
      };
      try {
        const result = raw
          ? (
              this.canvas.requestPointerLock as (options: {
                unadjustedMovement: boolean;
              }) => Promise<void> | void
            ).call(this.canvas, {
              unadjustedMovement: true,
            })
          : this.canvas.requestPointerLock();
        // Older browsers return void from requestPointerLock.
        if (result) void result.catch(failed);
      } catch (error) {
        failed(error);
      }
    };
    request(true);
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
      name === "NotAllowedError" ||
      name === "WrongDocumentError";
    if (transient) this.hooks.onRetry?.();
    else this.hooks.onError();
  }

  private changed() {
    const wasLocked = this.locked;
    this.locked = this.isLocked;
    if (this.locked) {
      this.canvas.classList?.add("mouse-captured");
      this.requesting = false;
      if (this.releasing || !this.canLook()) this.release();
    } else if (wasLocked || this.requesting) {
      // Acquisition and Escape can both precede queued change callbacks.
      this.unlock();
    }
  }

  private mouseLook(event: MouseEvent) {
    if (!this.isLocked || this.disposed || this.releasing) return;
    if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
      this.cursor = { x: event.clientX, y: event.clientY };
      this.firstCursor ??= this.cursor;
      if (
        !this.unconfined &&
        Math.hypot(
          this.cursor.x - this.firstCursor.x,
          this.cursor.y - this.firstCursor.y,
        ) > 4 &&
        ++this.movedEvents >= 3
      ) {
        this.unconfined = true;
        if (!unconfinedPages.has(document)) {
          unconfinedPages.add(document);
          this.hooks.onUnconfined?.();
        }
      }
    }
    if (!this.canLook()) return;
    this.setLook(
      this.yaw + event.movementX * 0.0022,
      this.pitch - event.movementY * 0.0022,
    );
  }

  dispose() {
    this.disposed = true;
    this.release();
    this.events.abort();
  }
}
