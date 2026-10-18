import { StringDecoder } from "node:string_decoder";
export function boundedText(value, budget) {
  let output = "",
    used = 0;
  for (const character of value) {
    const bytes = Buffer.byteLength(character);
    if (used + bytes > budget) break;
    output += character;
    used += bytes;
  }
  return output;
}

/** Keep byte budgets across both streams; decode only after joining chunk boundaries. */
export function outputCapture(limit) {
  const out = [],
    err = [],
    prefix = [];
  let size = 0,
    prefixSize = 0;
  const decode = (chunks) =>
    new StringDecoder("utf8").write(Buffer.concat(chunks));
  return {
    push(stream, chunk) {
      if (stream === "err" && prefixSize < 1024) {
        const part = chunk.subarray(0, 1024 - prefixSize);
        prefix.push(part);
        prefixSize += part.length;
      }
      const part = chunk.subarray(0, Math.max(0, limit - size));
      if (part.length) (stream === "out" ? out : err).push(part);
      size += chunk.length;
      return size > limit;
    },
    result() {
      const stdout = boundedText(decode(out), limit);
      return {
        stdout,
        stderr: boundedText(decode(err), limit - Buffer.byteLength(stdout)),
        stderrPrefix: boundedText(decode(prefix), 1024),
      };
    },
  };
}
