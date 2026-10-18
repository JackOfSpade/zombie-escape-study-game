// Shared browser/relay/container data contract. No imports, evaluation or host APIs.
const keys = {
  click: ["kind", "selector"],
  fill: ["kind", "selector", "value"],
  press: ["kind", "selector", "key"],
  "expect-text": ["kind", "selector", "text"],
  "expect-count": ["kind", "selector", "count"],
};
const keyboardKeys = new Set([
  "Enter",
  "Space",
  "Tab",
  "Escape",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
]);
function text(value, limit, label, empty = false) {
  if (
    typeof value !== "string" ||
    value.length > limit ||
    value.includes("\0") ||
    (!empty && !value.trim())
  )
    throw Error(`Invalid browser ${label}`);
  return value;
}
export function browserSteps(value = []) {
  if (!Array.isArray(value) || value.length > 8)
    throw Error("Browser checks require at most eight steps");
  return value.map((step) => {
    if (
      !step ||
      typeof step !== "object" ||
      Array.isArray(step) ||
      !Object.hasOwn(keys, step.kind) ||
      Object.keys(step).some((key) => !keys[step.kind].includes(key))
    )
      throw Error(
        "Invalid browser step; only structured interaction/check data is accepted",
      );
    const next = {
      kind: step.kind,
      selector: text(step.selector, 2048, "CSS selector"),
    };
    if (step.kind === "fill")
      return { ...next, value: text(step.value, 2000, "input value", true) };
    if (step.kind === "press") {
      if (!keyboardKeys.has(step.key)) throw Error("Unsupported browser key");
      return { ...next, key: step.key };
    }
    if (step.kind === "expect-text")
      return { ...next, text: text(step.text, 2000, "expected text", true) };
    if (step.kind === "expect-count") {
      if (
        !Number.isSafeInteger(step.count) ||
        step.count < 0 ||
        step.count > 1000
      )
        throw Error("Invalid browser expected count");
      return { ...next, count: step.count };
    }
    return next;
  });
}
export function browserSpec(code, steps) {
  if (typeof code !== "string" || new TextEncoder().encode(code).length > 65536)
    throw Error("Expected one React TSX component up to64KiB");
  return {
    language: "typescript",
    environment: "react",
    code,
    steps: browserSteps(steps),
  };
}
export function browserSpecText(code, steps) {
  return JSON.stringify(browserSpec(code, steps));
}
