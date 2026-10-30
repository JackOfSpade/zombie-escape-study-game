export interface SavedLook {
  id: string;
  yaw: number;
  pitch: number;
}

const LOOK_KEY = "dead-air-first-person-look";

/** View state stays outside Game checkpoints and the simulation heading. */
export function readSavedLook(id: string): SavedLook | undefined {
  try {
    const value = JSON.parse(sessionStorage.getItem(LOOK_KEY) ?? "null");
    if (
      value?.id === id &&
      typeof value.yaw === "number" &&
      Number.isFinite(value.yaw) &&
      typeof value.pitch === "number" &&
      Number.isFinite(value.pitch)
    )
      return { id, yaw: value.yaw, pitch: value.pitch };
  } catch {
    // Storage can be unavailable; the survivor heading remains the fallback.
  }
  return undefined;
}

export function writeSavedLook(value: SavedLook) {
  try {
    sessionStorage.setItem(LOOK_KEY, JSON.stringify(value));
  } catch {
    // Looking around must remain usable when browser storage is unavailable.
  }
}
