import { isRecord } from "./records";

export function completionVerdict(value: unknown): {
  complete: boolean;
  feedback: string;
  qualified: string[];
} {
  if (!isRecord(value)) throw Error("Malformed completion response");
  const v = value;
  if (
    typeof v.complete !== "boolean" ||
    typeof v.feedback !== "string" ||
    !v.feedback.trim() ||
    v.feedback.length > 8000 ||
    !Array.isArray(v.qualified) ||
    v.qualified.length > 128 ||
    !v.qualified.every(
      (id) => typeof id === "string" && id.length > 0 && id.length <= 128,
    )
  )
    throw Error("Malformed completion response");
  return {
    complete: v.complete,
    feedback: v.feedback,
    qualified: [...new Set(v.qualified as string[])],
  };
}
