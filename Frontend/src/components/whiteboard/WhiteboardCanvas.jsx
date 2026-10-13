import React, { useEffect, useRef } from 'react';
import { BookOpen, Trash2, Sparkles, Code2, Clock } from 'lucide-react';

/**
 * Clean, Clutter-Free Interactive Whiteboard Canvas
 * Dynamically displays key notes, formulas, definitions, and code
 * written by the AI Teacher in real-time.
 */
export function WhiteboardCanvas({
  items = [],
  onClearBoard,
}) {
  const bottomAnchorRef = useRef(null);

  // Auto-scroll to the latest whiteboard note when new notes appear
  useEffect(() => {
    if (items.length > 0 && bottomAnchorRef.current) {
      bottomAnchorRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [items.length]);

  return (
    <div
      className="flex-1 overflow-y-auto px-4 py-6 md:px-12 md:py-8 bg-[#fdfcf9] text-stone-800 font-sans select-text pb-28"
      data-testid="whiteboard-canvas"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Whiteboard Header Toolbar */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100/80 border border-amber-200 flex items-center justify-center text-amber-800 shadow-xs">
              <span className="text-base">📋</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 tracking-tight flex items-center gap-2">
                Teacher's Whiteboard
                {items.length > 0 && (
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                    {items.length} {items.length === 1 ? 'topic' : 'topics'}
                  </span>
                )}
              </h2>
            </div>
          </div>

          {items.length > 0 && onClearBoard && (
            <button
              onClick={onClearBoard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-stone-500 hover:text-rose-600 hover:bg-rose-50 border border-stone-200 hover:border-rose-200 transition-all cursor-pointer"
              title="Clear Whiteboard"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Board</span>
            </button>
          )}
        </div>

        {/* Empty State */}
        {items.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-3xl bg-amber-50/80 border border-amber-200/60 flex items-center justify-center text-amber-700 shadow-xs mb-4">
              <BookOpen className="w-8 h-8 opacity-75" />
            </div>
            <h3 className="text-xl font-bold text-stone-800 font-serif mb-2">
              व्हाइटबोर्ड तैयार है (Whiteboard Ready)
            </h3>
            <p className="text-sm text-stone-500 max-w-md font-sans leading-relaxed">
              नीचे माइक ऑन करें या सवाल टाइप करें। जैसे-जैसे आपके टीचर समझाएंगे, महत्वपूर्ण पॉइंट्स, फॉर्मूले और डेफिनिशन यहाँ लाइव नोट होते जाएंगे।
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-md">
              <span className="text-xs px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-stone-600 shadow-xs">
                💡 किसी भी विषय पर पूछें
              </span>
              <span className="text-xs px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-stone-600 shadow-xs">
                ✍️ लाइव ऑटो-नोट्स और डेफिनिशन
              </span>
              <span className="text-xs px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-stone-600 shadow-xs">
                🎙️ रियल-टाइम वॉयस टीचिंग
              </span>
            </div>
          </div>
        ) : (
          /* Dynamic Notes Cards */
          <div className="space-y-5">
            {items.map((item, index) => {
              const notesList = Array.isArray(item.notes)
                ? item.notes
                : typeof item.notes === 'string'
                ? [item.notes]
                : typeof item.content === 'string'
                ? item.content.split('\n').filter(Boolean)
                : [];

              return (
                <div
                  key={item.id || index}
                  className="bg-white border border-stone-200/90 rounded-2xl p-5 md:p-6 shadow-xs transition-all duration-300 hover:shadow-md hover:border-stone-300 animate-fadeIn"
                >
                  {/* Card Header: Topic & Timestamp */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                      <h3 className="text-base md:text-lg font-bold text-stone-900 font-serif tracking-tight">
                        {item.topic || item.title || 'Important Concept'}
                      </h3>
                    </div>
                    {item.timestamp && (
                      <span className="flex items-center gap-1 text-[11px] text-stone-400 font-sans">
                        <Clock className="w-3 h-3" />
                        {item.timestamp}
                      </span>
                    )}
                  </div>

                  {/* Bullet Points / Notes */}
                  {notesList.length > 0 && (
                    <ul className="space-y-2.5 my-2">
                      {notesList.map((note, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm text-stone-800 leading-relaxed font-sans">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-2 shrink-0" />
                          <span className="flex-1">{note}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Code snippet if present */}
                  {item.code && (
                    <div className="mt-4 rounded-xl overflow-hidden border border-stone-700 bg-stone-900 text-stone-100 font-mono text-xs">
                      <div className="px-3.5 py-1.5 bg-stone-800 border-b border-stone-700 flex items-center justify-between text-[11px] text-stone-400">
                        <span className="flex items-center gap-1.5">
                          <Code2 className="w-3.5 h-3.5 text-amber-400" />
                          Code Example
                        </span>
                      </div>
                      <pre className="p-4 overflow-x-auto leading-relaxed">
                        <code>{item.code}</code>
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={bottomAnchorRef} />
          </div>
        )}
      </div>
    </div>
  );
}
