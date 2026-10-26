import React, { useState, useEffect } from 'react';
import { History, X, Trash2, Calendar, FileText, ChevronRight, PlusCircle } from 'lucide-react';
import { getAllSessions, deleteSession, clearAllHistory, startNewSession, setActiveSessionId, subscribeSessionHistory } from '../../services/sessionHistory.js';

/**
 * Slide-over drawer to browse, restore, and review previous multi-day study sessions
 */
export function SessionHistoryModal({
  isOpen,
  onClose,
  onRestoreSession,
  onStartFreshSession,
}) {
  const [sessions, setSessions] = useState(() => getAllSessions());

  useEffect(() => {
    if (isOpen) {
      setSessions(getAllSessions());
      const unsubscribe = subscribeSessionHistory((updated) => {
        setSessions(updated);
      });
      return unsubscribe;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = (e, id) => {
    e.stopPropagation();
    const updated = deleteSession(id);
    setSessions(updated);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete all saved study sessions?')) {
      clearAllHistory();
      setSessions([]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fadeIn">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer content */}
      <div className="relative w-full max-w-md h-full bg-[#fcfbf9] text-stone-800 shadow-2xl flex flex-col border-l border-stone-200 z-10 animate-slideLeft">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-stone-900">Study Session History</h3>
              <p className="text-xs font-sans text-stone-500">Past notes, derivations & clips</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action strip: New Session & Clear all */}
        <div className="px-6 py-3 bg-[#f8f5ee] border-b border-stone-200 flex items-center justify-between text-xs font-sans">
          <button
            onClick={() => {
              startNewSession();
              if (onStartFreshSession) onStartFreshSession();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 text-white font-medium hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Start Fresh Session</span>
          </button>

          {sessions.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-stone-500 hover:text-rose-600 transition-colors cursor-pointer"
            >
              Clear All History
            </button>
          )}
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 font-sans">
          {sessions.length === 0 ? (
            <div className="py-20 text-center text-stone-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No saved study sessions yet.</p>
              <p className="text-xs text-stone-400 mt-1">
                Your whiteboard notes will automatically be archived here as you learn.
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                data-testid="session-history-item"
                onClick={() => {
                  setActiveSessionId(session.id);
                  if (onRestoreSession) onRestoreSession(session.items, session.title, session.canvasSnapshot);
                  onClose();
                }}
                className="group p-4 rounded-xl bg-white border border-stone-200 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer relative"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <h4 className="font-serif font-semibold text-sm text-stone-900 truncate group-hover:text-amber-800">
                      {session.title || 'Untitled Session'}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {session.dateStr || 'Recent'} • {session.timeStr || ''}
                      </span>
                      <span>•</span>
                      <span>{session.itemsCount || session.items?.length || 0} notes</span>
                      {session.canvasSnapshot && (
                        <>
                          <span>•</span>
                          <span className="text-amber-700 font-medium">✍️ Ink Notes</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleDelete(e, session.id)}
                      className="p-1.5 rounded-md text-stone-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      title="Delete session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
