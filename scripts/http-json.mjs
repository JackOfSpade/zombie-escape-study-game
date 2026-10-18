/** Shared bounded JSON input for first-party loopback routes. */
export class HttpInputError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export async function readJsonBody(
  request,
  limit = 6_000_000,
  sizeMessage = "Request too large",
) {
  const chunks = [];
  let bytes = 0;
  for await (const part of request) {
    const chunk = Buffer.isBuffer(part) ? part : Buffer.from(part);
    bytes += chunk.length;
    if (bytes > limit) throw new HttpInputError(413, sizeMessage);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks, bytes).toString("utf8"));
  } catch {
    throw new HttpInputError(400, "Invalid JSON request");
  }
}
