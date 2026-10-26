/**
 * High-Performance Native IndexedDB Storage Engine for Aristotle AI Tutor
 * Provides multi-gigabyte local structured storage for:
 * - Unlimited study session history
 * - High-resolution AI-generated educational images & diagrams
 * - Full-fidelity handwritten canvas vector snapshots
 * - Video timelines, transcripts, formulas, and code snippets
 * 
 * 100% local to user's device, zero cloud latency, zero quota bottlenecks.
 */

const DB_NAME = 'aristotle_tutor_db';
const DB_VERSION = 1;
const SESSIONS_STORE = 'sessions';

let dbPromise = null;

/**
 * Initializes and opens the IndexedDB database instance.
 * @returns {Promise<IDBDatabase>}
 */
export function openIndexedDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this browser environment.'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        const store = db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = (event) => {
      console.warn('[IndexedDB] Database connection error:', event.target.error);
      reject(event.target.error);
    };
  });

  return dbPromise;
}

/**
 * Retrieves all stored sessions from IndexedDB, ordered by updatedAt descending.
 * @returns {Promise<Array>}
 */
export async function idbGetAllSessions() {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SESSIONS_STORE, 'readonly');
      const store = transaction.objectStore(SESSIONS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result || [];
        // Sort descending by updatedAt or createdAt
        results.sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return timeB - timeA;
        });
        resolve(results);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to get all sessions:', err.message);
    return [];
  }
}

/**
 * Saves or updates a session entry in IndexedDB.
 * @param {Object} session
 * @returns {Promise<boolean>}
 */
export async function idbSaveSession(session) {
  if (!session || !session.id) return false;

  try {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SESSIONS_STORE, 'readwrite');
      const store = transaction.objectStore(SESSIONS_STORE);
      const request = store.put(session);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to save session:', err.message);
    return false;
  }
}

/**
 * Deletes a session by ID from IndexedDB.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function idbDeleteSession(id) {
  if (!id) return false;

  try {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SESSIONS_STORE, 'readwrite');
      const store = transaction.objectStore(SESSIONS_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to delete session:', err.message);
    return false;
  }
}

/**
 * Clears all sessions from IndexedDB.
 * @returns {Promise<boolean>}
 */
export async function idbClearAll() {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SESSIONS_STORE, 'readwrite');
      const store = transaction.objectStore(SESSIONS_STORE);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to clear sessions:', err.message);
    return false;
  }
}

/**
 * Bulk imports an array of sessions (used for seamless migration from LocalStorage).
 * @param {Array} sessions
 * @returns {Promise<number>} count of imported sessions
 */
export async function idbBulkInsert(sessions = []) {
  if (!Array.isArray(sessions) || sessions.length === 0) return 0;

  try {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SESSIONS_STORE, 'readwrite');
      const store = transaction.objectStore(SESSIONS_STORE);
      let count = 0;

      transaction.oncomplete = () => resolve(count);
      transaction.onerror = () => reject(transaction.error);

      for (const item of sessions) {
        if (item && item.id) {
          store.put(item);
          count++;
        }
      }
    });
  } catch (err) {
    console.warn('[IndexedDB] Bulk migration failed:', err.message);
    return 0;
  }
}
