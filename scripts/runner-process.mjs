export { boundedText } from "./runner-output.mjs";
import { outputCapture } from "./runner-output.mjs";
import { spawn } from "node:child_process";

export const maxOutput = 65536;
export function docker(
  args,
  input = "",
  timeout = 5000,
  onLimit,
  outputLimit = maxOutput,
) {
  return new Promise((resolve) => {
    const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
    const output = outputCapture(outputLimit);
    let reason;
    const stop = (why) => {
      if (reason) return;
      reason = why;
      onLimit?.();
      child.kill("SIGKILL");
    };
    const timer = setTimeout(() => stop("timeout"), timeout);
    const capture = (stream) => (chunk) => {
      if (output.push(stream, chunk)) stop("output-limit");
    };
    child.stdout.on("data", capture("out"));
    child.stderr.on("data", capture("err"));
    child.stdin.on("error", () => {});
    child.on("error", () => {
      reason = "unavailable";
    });
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      const { stdout, stderr, stderrPrefix } = output.result();
      resolve({ stdout, stderr, stderrPrefix, exitCode, reason });
    });
    child.stdin.end(input);
  });
}
