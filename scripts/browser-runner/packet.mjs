/** One bounded JSON line for trusted execution controllers. A Docker attach stream need not close to deliver a packet. */
export async function readPacket(stream, limit = 131072) {
  const chunks = [];
  let size = 0;
  for await (const chunk of stream) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk),
      end = bytes.indexOf(10),
      part = end < 0 ? bytes : bytes.subarray(0, end);
    size += part.length;
    if (size > limit) throw Error("Execution packet too large");
    chunks.push(part);
    if (end >= 0) return Buffer.concat(chunks, size).toString("utf8");
  }
  throw Error("Incomplete execution packet");
}
