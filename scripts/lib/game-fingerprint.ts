import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Named, sorted sources prevent dependency omissions and ordering ambiguity. */
export function gameFingerprint() {
  const collect = (directory: string): string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? collect(join(directory, entry.name))
        : entry.name.endsWith(".ts")
          ? [join(directory, entry.name)]
          : [],
    );
  const files = collect("src").sort(),
    schema = "all-src-typescript-v1";
  const digest = createHash("sha256").update(schema + "\0");
  for (const file of files)
    digest
      .update(file + "\0")
      .update(readFileSync(file))
      .update("\0");
  return { schema, files, hash: digest.digest("hex") };
}
