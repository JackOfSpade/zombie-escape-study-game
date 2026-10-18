import { codePacket } from "../scripts/runner-bootstrap.mjs";
import { readPacket } from "../scripts/browser-runner/packet.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { PassThrough, Readable } from "node:stream";
import { outputCapture } from "../scripts/runner-output.mjs";
import { readJsonBody } from "../scripts/http-json.mjs";
test("runner output preserves UTF-8 characters across every byte boundary", () => {
  const value = "hello 🧟 café 漢字",
    bytes = Buffer.from(value);
  for (let i = 0; i <= bytes.length; i++) {
    const output = outputCapture(128);
    output.push("out", bytes.subarray(0, i));
    output.push("out", bytes.subarray(i));
    output.push("err", Buffer.from("é"));
    assert.deepEqual(output.result(), {
      stdout: value,
      stderr: "é",
      stderrPrefix: "é",
    });
  }
});
test("runner output keeps a shared byte ceiling even for invalid UTF-8 or a partial final character", () => {
  const output = outputCapture(7);
  assert.equal(output.push("out", Buffer.from("🧟")), false);
  assert.equal(output.push("err", Buffer.from("🧟")), true);
  assert.equal(output.result().stdout, "🧟");
  assert.equal(output.result().stderr, "");
  const invalid = outputCapture(7);
  invalid.push("out", Buffer.alloc(20, 255));
  assert.ok(Buffer.byteLength(invalid.result().stdout) <= 7);
});
test("loopback JSON input decodes split Unicode once and distinguishes malformed from oversized bodies", async () => {
  const bytes = Buffer.from(JSON.stringify({ text: "🧟 café" }));
  assert.deepEqual(
    await readJsonBody(Readable.from([...bytes].map((b) => Buffer.from([b])))),
    { text: "🧟 café" },
  );
  await assert.rejects(readJsonBody(Readable.from([Buffer.from("{bad")])), {
    status: 400,
  });
  await assert.rejects(readJsonBody(Readable.from([Buffer.alloc(20)]), 10), {
    status: 413,
  });
});

test("a complete browser packet runs without waiting for Docker stdin EOF", async () => {
  const stream = new PassThrough(),
    packet = readPacket(stream);
  stream.write(JSON.stringify({ code: "fixed 🧟 probe" }) + "\n");
  assert.deepEqual(JSON.parse(await packet), { code: "fixed 🧟 probe" });
  assert.equal(stream.destroyed, true);
});
test("browser packet framing rejects incomplete and oversized input", async () => {
  await assert.rejects(
    readPacket(Readable.from([Buffer.from("{}")])),
    /Incomplete/,
  );
  await assert.rejects(
    readPacket(Readable.from([Buffer.from("12345\n")]), 4),
    /too large/,
  );
});

test("code packet framing preserves original UTF-8 bytes without embedding executable source", () => {
  const code = 'print("🧟")\n' + '\0\"\\'.repeat(20),
    frame = codePacket(code);
  assert.equal(frame.split("\n").length, 2);
  assert.deepEqual(
    Buffer.from(JSON.parse(frame).code, "base64"),
    Buffer.from(code, "utf8"),
  );
});
