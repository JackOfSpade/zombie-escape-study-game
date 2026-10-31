import { isRecord } from "./records";
import type { WorkspaceExecution } from "./execution";

/** Display recorded observations only; never turn exit zero into a correctness claim. */
export function executionText(job: WorkspaceExecution) {
  const receipt = job.receipt,
    heading = `${job.author ?? "human"} · v${job.revision} · ${job.environment === "react" ? "React browser" : job.language} · ${job.status}${receipt ? ` / ${receipt.status} / exit ${receipt.exitCode ?? "—"}` : ""}`,
    detail = job.error ?? receipt?.detail ?? "";
  if (job.environment !== "react" || !receipt?.stdout)
    return `${heading}\n${detail}\n${receipt?.stdout ?? ""}${receipt?.stderr ?? ""}`;
  try {
    const observed: unknown = JSON.parse(receipt.stdout);
    if (
      !isRecord(observed) ||
      observed.schema !== 1 ||
      !Array.isArray(observed.steps)
    )
      throw Error("Unknown observation format");
    const steps = observed.steps.map((value: unknown) => {
      if (
        !isRecord(value) ||
        typeof value.kind !== "string" ||
        typeof value.selector !== "string"
      )
        throw Error("Invalid saved action");
      return { ...value, kind: value.kind, selector: value.selector } as Record<
        string,
        unknown
      > & { kind: string; selector: string };
    });
    const checks = steps.filter((s) =>
      ["expect-text", "expect-count"].includes(s.kind),
    );
    const lines = [heading, detail];
    if (!receipt.executed) lines.push("Browser code did not execute.");
    else
      lines.push(
        "Captured browser observations; correctness and independent understanding remain unassessed.",
      );
    if (steps.length) {
      lines.push("Automated task actions and checks:");
      for (const s of steps) {
        const expected =
          s.kind === "expect-text"
            ? ` equals ${JSON.stringify(s.text)}`
            : s.kind === "expect-count"
              ? ` count ${s.count}`
              : s.kind === "fill"
                ? ` with ${JSON.stringify(s.value)}`
                : s.kind === "press"
                  ? ` ${s.key}`
                  : "";
        lines.push(
          `• ${s.kind} ${s.selector}${expected}: ${s.passed === true ? "matched / completed" : "not completed"}${s.observed !== undefined ? `; observed ${JSON.stringify(s.observed)}` : ""}${s.error ? `\n  ${s.error}` : ""}`,
        );
      }
      if (checks.length)
        lines.push(
          `${checks.filter((s) => s.passed === true).length} of ${checks.length} attempted task checks matched. These checks were supplied with the task.`,
        );
      if ((job.steps?.length ?? 0) > steps.length)
        lines.push(
          `${job.steps!.length - steps.length} remaining actions/checks did not run.`,
        );
    }
    if (typeof observed.domText === "string" && observed.domText)
      lines.push(`Visible text:\n${observed.domText}`);
    if (Array.isArray(observed.errors) && observed.errors.length)
      lines.push(`Browser errors:\n${observed.errors.join("\n")}`);
    if (Array.isArray(observed.console)) {
      const messages = observed.console.flatMap((value: unknown) =>
        isRecord(value) &&
        typeof value.text === "string" &&
        !value.text.includes("Download the React DevTools")
          ? [
              {
                type: typeof value.type === "string" ? value.type : "log",
                text: value.text,
              },
            ]
          : [],
      );

      if (messages.length)
        lines.push(
          `Console:\n${messages.map((m) => `[${m.type}] ${m.text}`).join("\n")}`,
        );
    }
    if (receipt.stderr) lines.push(receipt.stderr);
    return lines.filter(Boolean).join("\n");
  } catch {
    return `${heading}\n${detail}\nSaved runner output:\n${receipt.stdout}${receipt.stderr ?? ""}`;
  }
}
