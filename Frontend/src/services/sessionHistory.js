/**
 * Session History Manager for Aristotle AI Tutor
 * Stores whiteboard notes and session archives in localStorage / IndexedDB
 * allowing students to review past study sessions across days.
 */

const STORAGE_KEY = 'aristotle_session_history_v1';
const CURRENT_SESSION_ID_KEY = 'aristotle_active_session_id';

export function getAllSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('[SessionStorage] Error reading sessions:', e);
    return [];
  }
}

export function saveActiveSession(items = [], studentProfile = {}) {
  if (!items || items.length === 0) return null;
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
    const topics = items
      .map((item) => item.topic)
      .filter(Boolean)
      .slice(0, 3);

    const title = topics.length > 0 ? topics.join(' • ') : `Study Session - ${dateStr}`;

    let sessionEntry;
    if (currentId) {
      const existingIdx = sessions.findIndex((s) => s.id === currentId);
      if (existingIdx !== -1) {
        sessions[existingIdx] = {
          ...sessions[existingIdx],
          title,
          updatedAt: now.toISOString(),
          timeStr,
          itemsCount: items.length,
          items,
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
        itemsCount: items.length,
        items,
      };
      sessions.unshift(sessionEntry);
    }

    // Keep up to 50 recent sessions
    const trimmed = sessions.slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    return sessionEntry;
  } catch (e) {
    console.error('[SessionStorage] Error saving session:', e);
    return null;
  }
}

export function startNewSession() {
  sessionStorage.removeItem(CURRENT_SESSION_ID_KEY);
}

export function deleteSession(id) {
  try {
    const sessions = getAllSessions().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    return sessions;
  } catch (e) {
    console.error('[SessionStorage] Error deleting session:', e);
    return [];
  }
}

export function clearAllHistory() {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(CURRENT_SESSION_ID_KEY);
}
