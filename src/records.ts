import { isRecord as isRecordRaw } from "../scripts/lib/is-record.mjs";

/** Narrow decoded external data without accepting arrays or null as records. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return isRecordRaw(value);
}
