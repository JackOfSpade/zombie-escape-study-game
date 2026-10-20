import assert from "node:assert/strict";
import test from "node:test";
import { createCheckpointQueue } from "../src/checkpoint-queue";

test("slow durable storage retains only the newest queued checkpoint and settles superseded callers after that write", async () => {
  const values: number[] = [],
    releases: (() => void)[] = [];
  const queue = createCheckpointQueue<number>((value) => {
    values.push(value);
    return new Promise<void>((resolve) => releases.push(resolve));
  });
  const first = queue.enqueue(1),
    second = queue.enqueue(2),
    third = queue.enqueue(3);
  let secondSettled = false;
  void second.then(() => (secondSettled = true));
  assert.deepEqual(values, [1]);
  releases.shift()!();
  await first;
  assert.deepEqual(values, [1, 3]);
  assert.equal(secondSettled, false);
  releases.shift()!();
  await Promise.all([second, third, queue.flush()]);
  assert.equal(secondSettled, true);
  assert.deepEqual(values, [1, 3]);
});

test("a failed active checkpoint does not prevent the latest pending checkpoint from becoming durable", async () => {
  let rejectFirst!: (error: Error) => void;
  const values: number[] = [];
  const queue = createCheckpointQueue<number>(async (value) => {
    values.push(value);
    if (value === 1)
      await new Promise<void>((_resolve, reject) => (rejectFirst = reject));
  });
  const first = queue.enqueue(1),
    rejected = assert.rejects(first, /Synthetic failure/),
    second = queue.enqueue(2),
    latest = queue.enqueue(3);
  rejectFirst(Error("Synthetic failure"));
  await rejected;
  await Promise.all([second, latest, queue.flush()]);
  assert.deepEqual(values, [1, 3]);
  await queue.enqueue(4);
  assert.deepEqual(values, [1, 3, 4]);
});

test("a failed newest checkpoint rejects every caller whose checkpoint it superseded", async () => {
  let finish!: () => void;
  const queue = createCheckpointQueue<number>(async (value) => {
    if (value === 1) await new Promise<void>((resolve) => (finish = resolve));
    else throw Error("Synthetic unavailable storage");
  });
  const first = queue.enqueue(1),
    second = assert.rejects(queue.enqueue(2), /unavailable/),
    latest = assert.rejects(queue.enqueue(3), /unavailable/),
    flushed = assert.rejects(queue.flush(), /unavailable/);
  finish();
  await Promise.all([first, second, latest, flushed]);
});
