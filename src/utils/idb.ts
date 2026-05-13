/**
 * Minimal IndexedDB wrapper for caching TTS audio blobs locally.
 * Replaces the previous Vercel Blob `/api/tts-cache` backend.
 */

const DB_NAME = 'edt-cache';
const DB_VERSION = 1;
const STORE_TTS = 'tts';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_TTS)) {
        db.createObjectStore(STORE_TTS);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function ttsCacheGet(key: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE_TTS, 'readonly');
      const req = tx.objectStore(STORE_TTS).get(key);
      req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function ttsCachePut(key: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_TTS, 'readwrite');
      tx.objectStore(STORE_TTS).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {
    // ignore quota / private-mode errors
  }
}

export async function ttsCacheHas(key: string): Promise<boolean> {
  try {
    const db = await openDB();
    return await new Promise<boolean>((resolve, reject) => {
      const tx = db.transaction(STORE_TTS, 'readonly');
      const req = tx.objectStore(STORE_TTS).getKey(key);
      req.onsuccess = () => resolve(req.result !== undefined);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return false;
  }
}
