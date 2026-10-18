export type BrowserStep =
  | { kind: "click"; selector: string }
  | { kind: "fill"; selector: string; value: string }
  | { kind: "press"; selector: string; key: string }
  | { kind: "expect-text"; selector: string; text: string }
  | { kind: "expect-count"; selector: string; count: number };
export function browserSteps(value?: unknown): BrowserStep[];
export function browserSpec(
  code: unknown,
  steps?: unknown,
): {
  language: "typescript";
  environment: "react";
  code: string;
  steps: BrowserStep[];
};
export function browserSpecText(code: unknown, steps?: unknown): string;
