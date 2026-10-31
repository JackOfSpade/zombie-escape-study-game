import type { BigIntStats, Stats } from "node:fs";

export interface AssertOwnerOnlyOptions {
  kind?: "file" | "directory";
  maxBytes?: number;
  message?: string;
}

export function assertOwnerOnly(
  stat: Stats | BigIntStats,
  options?: AssertOwnerOnlyOptions,
): void;
