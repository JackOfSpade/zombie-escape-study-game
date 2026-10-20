/** Keep one active durable write and only the newest waiting checkpoint. */
export function createCheckpointQueue<T>(write: (value: T) => Promise<void>) {
  interface Waiter {
    resolve(): void;
    reject(error: unknown): void;
  }
  let queued: { value: T; waiters: Waiter[] } | undefined,
    running = false,
    latest = Promise.resolve();
  async function drain() {
    running = true;
    while (queued) {
      const current = queued;
      queued = undefined;
      try {
        await write(current.value);
        for (const waiter of current.waiters) waiter.resolve();
      } catch (error) {
        for (const waiter of current.waiters) waiter.reject(error);
      }
    }
    running = false;
  }
  return {
    enqueue(value: T) {
      latest = new Promise<void>((resolve, reject) => {
        if (queued) {
          queued.value = value;
          queued.waiters.push({ resolve, reject });
        } else queued = { value, waiters: [{ resolve, reject }] };
      });
      // A caller may use flush() alone; retain rejection there without an
      // unhandled intermediate promise when a superseded write fails.
      void latest.catch(() => {});
      if (!running) void drain();
      return latest;
    },
    flush: () => latest,
  };
}
