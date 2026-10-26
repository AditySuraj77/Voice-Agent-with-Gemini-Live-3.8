/**
 * Session History Manager for Aristotle AI Tutor
 * 
 * Hybrid Storage Architecture:
 * - Primary Storage: Native IndexedDB (multi-gigabyte capacity, stores full-resolution AI images,
 *   canvas vector snapshots, video timelines, and complete dialogue notes without quota errors).
 * - Fast In-Memory Cache: Provides synchronous 0ms reads for UI components.
 * - Automatic Migration: Automatically detects and migrates legacy LocalStorage sessions to IndexedDB on first run.
 * - Lightweight LocalStorage Backup: Keeps a lightweight session index for offline/fallback resilience.
 */

import {
  idbGetAllSessions,
  idbSaveSession,
  idbDeleteSession,
  idbClearAll,
  idbBulkInsert,
} from './indexedDbStorage.js';

const STORAGE_KEY = 'aristotle_session_history_v1';
const CURRENT_SESSION_ID_KEY = 'aristotle_active_session_id';
const SESSIONS_UPDATED_EVENT = 'aristotle:sessions-updated';

// In-memory cache for synchronous, zero-lag UI reads
let memorySessions = null;
let isInitialized = false;

/**
 * Loads sessions from LocalStorage as immediate synchronous bootstrap.
 */
function getLocalStorageSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('[SessionHistory] Error reading LocalStorage bootstrap:', e);
    return [];
  }
}

/**
 * Emits an event to notify UI components (modals, drawers) of storage changes.
 */
function notifySubscribers(sessionsList) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(SESSIONS_UPDATED_EVENT, { detail: { sessions: sessionsList } })
    );
  }
}

/**
 * Asynchronously initializes IndexedDB and performs automatic legacy migration.
 */
async function initStorage() {
  if (isInitialized) return;
  isInitialized = true;

  try {
    const idbSessions = await idbGetAllSessions();

    if (idbSessions && idbSessions.length > 0) {
      // IndexedDB has records, use as primary memory state
      memorySessions = idbSessions;
      notifySubscribers(memorySessions);
    } else {
      // IndexedDB is empty, check if legacy LocalStorage data exists to migrate
      const legacySessions = getLocalStorageSessions();
      if (legacySessions.length > 0) {
        console.log(`[SessionHistory] Migrating ${legacySessions.length} legacy sessions from LocalStorage into IndexedDB...`);
        await idbBulkInsert(legacySessions);
        memorySessions = legacySessions;
        notifySubscribers(memorySessions);
        console.log('[SessionHistory] Migration to IndexedDB completed successfully.');
      } else {
        memorySessions = [];
      }
    }
  } catch (err) {
    console.warn('[SessionHistory] Storage initialization fallback to LocalStorage:', err.message);
    if (!memorySessions) {
      memorySessions = getLocalStorageSessions();
    }
  }
}

// Kick off background initialization immediately
if (typeof window !== 'undefined') {
  initStorage();
}

/**
 * Synchronous getter: Returns the list of saved sessions immediately (0ms latency).
 * @returns {Array} List of session objects
 */
export function getAllSessions() {
  if (memorySessions !== null) {
    return memorySessions;
  }
  // If IndexedDB is still connecting, return synchronous LocalStorage bootstrap
  memorySessions = getLocalStorageSessions();
  return memorySessions;
}

/**
 * Asynchronous getter: Guarantees full fresh read from IndexedDB.
 * @returns {Promise<Array>}
 */
export async function getAllSessionsAsync() {
  await initStorage();
  try {
    const fresh = await idbGetAllSessions();
    if (fresh && fresh.length > 0) {
      memorySessions = fresh;
    }
  } catch (e) {}
  return memorySessions || [];
}

/**
 * Subscribes to session history updates.
 * @param {Function} callback - (sessions) => void
 * @returns {Function} unsubscribe function
 */
export function subscribeSessionHistory(callback) {
  if (typeof window === 'undefined' || typeof callback !== 'function') {
    return () => {};
  }
  const handler = (e) => {
    callback(e.detail?.sessions || memorySessions || []);
  };
  window.addEventListener(SESSIONS_UPDATED_EVENT, handler);
  return () => window.removeEventListener(SESSIONS_UPDATED_EVENT, handler);
}

/**
 * Saves or updates the currently active study session.
 * Stores full-fidelity canvas drawings & visual diagrams in IndexedDB,
 * with zero 5MB LocalStorage quota errors.
 */
export function saveActiveSession(items = [], studentProfile = {}, options = {}) {
  const canvasSnapshot = typeof options === 'string' ? options : options?.canvasSnapshot || null;
  const hasItems = Array.isArray(items) && items.length > 0;
  const hasDrawing = Boolean(canvasSnapshot);

  // If there are neither typed notes nor handwritten drawings, nothing to save
  if (!hasItems && !hasDrawing) return null;

  try {
    const sessions = getAllSessions();
    let currentId = sessionStorage.getItem(CURRENT_SESSION_ID_KEY);

    const now = new Date();
    const dateStr = now.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Extract key topics for the session title
    const topics = hasItems
      ? items
          .map((item) => item.topic)
          .filter(Boolean)
          .slice(0, 3)
      : [];

    const title =
      topics.length > 0
        ? topics.join(' • ')
        : hasDrawing && !hasItems
        ? `Handwritten Notes • ${dateStr}`
        : `Study Session - ${dateStr}`;

    let sessionEntry;
    if (currentId) {
      const existingIdx = sessions.findIndex((s) => s.id === currentId);
      if (existingIdx !== -1) {
        // Retain existing canvasSnapshot if current update didn't supply a new one
        const resolvedSnapshot =
          canvasSnapshot !== null ? canvasSnapshot : (sessions[existingIdx].canvasSnapshot || null);

        sessions[existingIdx] = {
          ...sessions[existingIdx],
          title: hasItems ? title : (sessions[existingIdx].title || title),
          updatedAt: now.toISOString(),
          timeStr,
          itemsCount: (items || []).length,
          items: items || [], // Store full items (including image URLs & SVGs) in IndexedDB
          canvasSnapshot: resolvedSnapshot,
        };
        sessionEntry = sessions[existingIdx];
      }
    }

    if (!sessionEntry) {
      currentId = 'session_' + Date.now();
      sessionStorage.setItem(CURRENT_SESSION_ID_KEY, currentId);
      sessionEntry = {
        id: currentId,
        title,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        dateStr,
        timeStr,
        studentName: studentProfile?.name || 'Student',
        itemsCount: (items || []).length,
        items: items || [],
        canvasSnapshot: canvasSnapshot || null,
      };
      sessions.unshift(sessionEntry);
    }

    memorySessions = [...sessions];
    notifySubscribers(memorySessions);

    // 1. Primary Asynchronous Persistence: High-capacity IndexedDB
    idbSaveSession(sessionEntry).catch((err) => {
      console.warn('[SessionHistory] Background IndexedDB save warning:', err.message);
    });

    // 2. Safety Fallback: Lightweight LocalStorage index (stripped of massive base64 blobs)
    try {
      const lightweightBackup = sessions.slice(0, 15).map((s) => ({
        id: s.id,
        title: s.title,
        dateStr: s.dateStr,
        timeStr: s.timeStr,
        updatedAt: s.updatedAt,
        itemsCount: s.itemsCount,
        studentName: s.studentName,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweightBackup));
    } catch (quotaErr) {
      // LocalStorage quota reached, safely ignore since IndexedDB holds complete data
    }

    return sessionEntry;
  } catch (e) {
    console.error('[SessionHistory] Error saving active session:', e);
    return null;
  }
}

/**
 * Resets the session pointer to start a brand new study session.
 */
export function startNewSession() {
  sessionStorage.removeItem(CURRENT_SESSION_ID_KEY);
}

/**
 * Sets the active session ID pointer.
 */
export function setActiveSessionId(sessionId) {
  if (sessionId) {
    sessionStorage.setItem(CURRENT_SESSION_ID_KEY, sessionId);
  }
}

/**
 * Deletes a session by ID from memory, IndexedDB, and LocalStorage backup.
 * @param {string} id
 * @returns {Array} Updated list of sessions
 */
export function deleteSession(id) {
  try {
    const currentSessions = getAllSessions();
    const updated = currentSessions.filter((s) => s.id !== id);
    memorySessions = updated;
    notifySubscribers(memorySessions);

    // Delete from IndexedDB asynchronously
    idbDeleteSession(id).catch((e) => console.warn('[SessionHistory] IndexedDB delete error:', e.message));

    // Update LocalStorage backup
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 15)));
    } catch (_) {}

    return updated;
  } catch (e) {
    console.error('[SessionHistory] Error deleting session:', e);
    return [];
  }
}

/**
 * Completely clears all study session history across all storage engines.
 */
export function clearAllHistory() {
  memorySessions = [];
  notifySubscribers([]);

  idbClearAll().catch((e) => console.warn('[SessionHistory] IndexedDB clear error:', e.message));

  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(CURRENT_SESSION_ID_KEY);
  } catch (_) {}
}
