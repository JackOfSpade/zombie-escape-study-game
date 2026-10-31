import type { BinaryLike } from "node:crypto";

export function sha256(value: BinaryLike): string;
export const sha: (value: BinaryLike) => string;
