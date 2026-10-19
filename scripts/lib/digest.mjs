import { createHash } from "node:crypto";

/** Hex SHA-256 of a string or buffer; the one digest used across the scripts. */
export const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
