const DB = "dead-air-durable-state",
  STORE = "saves";
let opening: Promise<IDBDatabase> | undefined;
function database() {
  opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE))
        req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        db.close();
        opening = undefined;
      };
      resolve(db);
    };
    req.onerror = () => {
      opening = undefined;
      reject(req.error ?? Error("Could not open durable save storage"));
    };
    req.onblocked = () => {
      opening = undefined;
      reject(
        Error("Another browser tab is blocking the save database upgrade"),
      );
    };
  });
  return opening;
}
export async function writeDurable(key: string, value: string) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () =>
      reject(tx.error ?? Error("Durable save transaction failed"));
  });
}
export async function readDurable(key: string) {
  const db = await database();
  return new Promise<string | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly"),
      req = tx.objectStore(STORE).get(key);
    req.onsuccess = () =>
      resolve(typeof req.result === "string" ? req.result : null);
    req.onerror = () =>
      reject(req.error ?? Error("Could not read durable save"));
  });
}
