import { lstatSync, unlinkSync } from "node:fs";
import { createConnection } from "node:net";

/** Recover only our own abandoned Unix socket, never an active listener or a
 * different file. A restart still requires fresh consent to release requests. */
export async function preparePrivateSocket(path) {
  let before;
  try {
    before = lstatSync(path);
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  if (!before.isSocket() || (process.getuid && before.uid !== process.getuid()))
    throw Error(
      "The connector socket path is not an owned socket; refusing to replace it",
    );
  const abandoned = await new Promise((resolve, reject) => {
    const socket = createConnection(path);
    socket.once("connect", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", (error) => {
      socket.destroy();
      if (error.code === "ECONNREFUSED") resolve(true);
      else reject(error);
    });
    socket.setTimeout(500, () => {
      socket.destroy();
      reject(Error("Could not verify the connector socket owner"));
    });
  });
  if (!abandoned)
    throw Error(
      "A live connector already owns this socket; refusing to replace it",
    );
  const after = lstatSync(path);
  if (
    !after.isSocket() ||
    before.ino !== after.ino ||
    before.dev !== after.dev ||
    before.uid !== after.uid
  )
    throw Error(
      "The connector socket changed during verification; refusing to replace it",
    );
  unlinkSync(path);
}
