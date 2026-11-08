"use client";

// Tiny key/value store on IndexedDB, for data too large for localStorage (customer photos
// are kept as data URLs until checkout, and localStorage holds only ~5 MB). Every call
// resolves even when IndexedDB is unavailable (private mode, blocked storage): reads give
// null and writes report false, so callers can fall back without try/catch.
const DB_NAME = "celebra-momentos";
const STORE = "kv";

let opening: Promise<IDBDatabase | null> | null = null;

function database(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return Promise.resolve(null);
  if (!opening) {
    opening = new Promise<IDBDatabase | null>((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    }).then((db) => { if (!db) opening = null; return db; });
  }
  return opening as Promise<IDBDatabase | null>;
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest | void, read?: (request: IDBRequest) => T): Promise<{ ok: boolean; value: T | null }> {
  return database().then((db) => new Promise((resolve) => {
    if (!db) { resolve({ ok: false, value: null }); return; }
    try {
      const tx = db.transaction(STORE, mode);
      const request = work(tx.objectStore(STORE));
      tx.oncomplete = () => resolve({ ok: true, value: request && read ? read(request) : null });
      tx.onerror = () => resolve({ ok: false, value: null });
      tx.onabort = () => resolve({ ok: false, value: null });
    } catch {
      resolve({ ok: false, value: null });
    }
  }));
}

export const browserStore = {
  get: <T>(key: string) => run<T>("readonly", (store) => store.get(key), (request) => (request.result ?? null) as T).then((result) => result.value),
  set: (key: string, value: unknown) => run("readwrite", (store) => { store.put(value, key); }).then((result) => result.ok),
  delete: (key: string) => run("readwrite", (store) => { store.delete(key); }).then((result) => result.ok),
  // Reads and deletes in ONE transaction, so two tabs can never both take the same value.
  take: <T>(key: string) => run<T>("readwrite", (store) => { const request = store.get(key); store.delete(key); return request; }, (request) => (request.result ?? null) as T).then((result) => result.value),
};
