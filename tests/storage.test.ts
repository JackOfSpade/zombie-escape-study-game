import assert from "node:assert/strict";
import { setImmediate as settle } from "node:timers/promises";
import { test } from "node:test";
import { createDurableStorage } from "../src/storage";
function harness(abortRead = false) {
  const requests: IDBOpenDBRequest[] = [],
    connections: { db: IDBDatabase; closed: number }[] = [];
  const factory = {
    open() {
      const request = {} as IDBOpenDBRequest;
      requests.push(request);
      return request;
    },
  };
  function open(index: number) {
    const connection = { db: {} as IDBDatabase, closed: 0 };
    Object.assign(connection.db, {
      close() {
        connection.closed++;
      },
      transaction() {
        const tx = {} as IDBTransaction;
        Object.assign(tx, {
          objectStore() {
            return {
              get() {
                const request = { result: "saved value" } as IDBRequest;
                queueMicrotask(() => {
                  request.onsuccess?.call(request, new Event("success"));
                  if (abortRead) tx.onabort?.call(tx, new Event("abort"));
                  else tx.oncomplete?.call(tx, new Event("complete"));
                });
                return request;
              },
              put() {
                queueMicrotask(() =>
                  tx.oncomplete?.call(tx, new Event("complete")),
                );
              },
            };
          },
        });
        return tx;
      },
    });
    connections.push(connection);
    Object.assign(requests[index], { result: connection.db });
    requests[index].onsuccess?.call(requests[index], new Event("success"));
    return connection;
  }
  return { factory, requests, connections, open };
}
test("durable storage retries a synchronous open failure instead of caching a rejected connection", async () => {
  const h = harness();
  let tries = 0;
  const storage = createDurableStorage(() => {
    if (tries++ === 0) throw Error("Storage temporarily denied");
    return h.factory;
  });
  await assert.rejects(storage.read("key"), /temporarily denied/);
  const next = storage.read("key");
  await settle();
  h.open(0);
  assert.equal(await next, "saved value");
  assert.equal(tries, 2);
});
test("a blocked open closes its eventual connection without replacing the successful retry", async () => {
  const h = harness(),
    storage = createDurableStorage(() => h.factory);
  const blocked = storage.read("key");
  await settle();
  const rejected = assert.rejects(blocked, /blocking/);
  h.requests[0].onblocked?.call(h.requests[0], {} as IDBVersionChangeEvent);
  await rejected;
  const retry = storage.read("key");
  await settle();
  const stale = h.open(0);
  assert.equal(stale.closed, 1);
  h.open(1);
  assert.equal(await retry, "saved value");
  assert.equal(await storage.read("key"), "saved value");
  assert.equal(h.requests.length, 2);
});
test("request success followed by transaction abort is a failed read", async () => {
  const h = harness(true),
    storage = createDurableStorage(() => h.factory);
  const read = storage.read("key"),
    rejected = assert.rejects(read, /read durable save/);
  await settle();
  h.open(0);
  await rejected;
});
test("version changes and unexpected closes discard the cached durable connection", async () => {
  const h = harness(),
    storage = createDurableStorage(() => h.factory);
  let read = storage.read("key");
  await settle();
  const first = h.open(0);
  await read;
  first.db.onversionchange?.call(first.db, {} as IDBVersionChangeEvent);
  assert.equal(first.closed, 1);
  read = storage.read("key");
  await settle();
  const second = h.open(1);
  await read;
  second.db.onclose?.call(second.db, new Event("close"));
  const write = storage.write("key", "new value");
  await settle();
  h.open(2);
  await write;
  assert.equal(h.requests.length, 3);
});
