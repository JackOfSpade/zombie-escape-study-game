import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  browserSpec,
  browserSpecText,
  browserSteps,
} from "../scripts/browser-runner/spec.mjs";

test("React execution snapshots copy and canonically bind code plus structured browser checks", () => {
  const input = [
    { selector: "button", kind: "click" },
    { text: "Count 1", kind: "expect-text", selector: "button" },
  ];
  const captured = browserSpec(
    "export default function App(){return null}",
    input,
  );
  const canonical = browserSpecText(captured.code, captured.steps);
  input[0].selector = "body";
  assert.equal(captured.steps[0].selector, "button");
  assert.equal(
    browserSpecText(captured.code, [
      { kind: "click", selector: "button" },
      { kind: "expect-text", selector: "button", text: "Count 1" },
    ]),
    canonical,
  );
  assert.notEqual(
    browserSpecText(captured.code, [{ kind: "click", selector: "body" }]),
    canonical,
  );
  assert.notEqual(
    browserSpecText(captured.code + "\n// changed", captured.steps),
    canonical,
  );
  assert.deepEqual(browserSteps(), []);
});
test("browser check packets cannot introduce arbitrary script evaluation, privileged shortcuts or unbounded workloads", () => {
  for (const step of [
    { kind: "evaluate", script: "process.exit()" },
    {
      kind: "click",
      selector: "button",
      script: "fetch('http://host.docker.internal')",
    },
    { kind: "press", selector: "body", key: "Control+Alt+Delete" },
    { kind: "expect-count", selector: "div", count: -1 },
    { kind: "expect-count", selector: "div", count: 0.5 },
    { kind: "click", selector: "a".repeat(2049) },
    { kind: "fill", selector: "input", value: "x".repeat(2001) },
    { kind: "click", selector: "body\0" },
    null,
    ["click", "body"],
  ])
    assert.throws(() => browserSteps([step]));
  assert.throws(() =>
    browserSteps(
      Array.from({ length: 9 }, () => ({ kind: "click", selector: "button" })),
    ),
  );
  assert.throws(() => browserSpec("é".repeat(32769)));
  assert.throws(() => browserSpec({ code: "not a string" }));
});
test("Chromium policy preserves the pinned current default deny and only adds its scoped namespace sandbox calls", () => {
  const root = "scripts/browser-runner/",
    provenance = JSON.parse(readFileSync(root + "PROVENANCE.json", "utf8")),
    original = readFileSync(root + "seccomp-moby.json"),
    derived = readFileSync(root + "seccomp-browser.json");
  assert.equal(
    createHash("sha256").update(original).digest("hex"),
    provenance.sha256,
  );
  assert.equal(
    createHash("sha256").update(derived).digest("hex"),
    provenance.derivedProfile.sha256,
  );
  const base = JSON.parse(original.toString()),
    actual = JSON.parse(derived.toString());
  assert.equal(actual.defaultAction, "SCMP_ACT_ERRNO");
  assert.deepEqual(actual.syscalls[0].names, [
    "clone",
    "setns",
    "unshare",
    "chroot",
  ]);
  assert.equal(actual.syscalls[0].action, "SCMP_ACT_ALLOW");
  assert.deepEqual(actual.syscalls[0].includes, {});
  actual.syscalls.shift();
  for (const rule of base.syscalls)
    rule.names = rule.names.filter((n: string) => n !== "socketcall");
  assert.deepEqual(actual, base);
  for (const rule of actual.syscalls.filter(
    (r: any) => r.names.includes("socket") && r.action === "SCMP_ACT_ALLOW",
  )) {
    assert.equal(
      rule.args.length,
      1,
      "socket-family filters must remain explicit",
    );
    assert.equal(rule.args[0].index, 0);
    const filter = rule.args[0];
    assert.ok(["SCMP_CMP_EQ", "SCMP_CMP_LT"].includes(filter.op));
    for (const family of [38, 40])
      assert.equal(
        filter.op === "SCMP_CMP_EQ"
          ? family === filter.value
          : family < filter.value,
        false,
        "AF_ALG and AF_VSOCK stay denied",
      );
  }
});
