import React, { useState } from 'react';
import { MascotAvatar } from './MascotAvatar.jsx';
import { MessageSquare, ChevronUp, ChevronDown, Check } from 'lucide-react';

/**
 * Aristotle Signature Floating Speech Bubble & Mascot in Bottom Left
 * Replicates the speech bubble that pops above the animated apple in the videos
 */
export function LiveSpeechBubble({
  messages = [],
  conversationState = 'idle',
  isSearching = false,
  searchQuery = '',
}) {
  const [showFullHistory, setShowFullHistory] = useState(false);

  // Get the last assistant message and last user message
  const lastMessage = messages[messages.length - 1];
  const lastAssistantMsg = [...messages].reverse().find((m) => m.sender === 'assistant');
  const lastUserMsg = [...messages].reverse().find((m) => m.sender === 'user');

  return (
    <div className="fixed bottom-24 left-6 z-30 max-w-md flex flex-col items-start gap-2 select-text" data-testid="live-speech-bubble">
      {/* Expanded Dialog History Drawer */}
      {showFullHistory && (
        <div className="w-80 md:w-96 max-h-72 overflow-y-auto bg-white/95 backdrop-blur-md rounded-2xl border border-stone-300 p-4 shadow-xl mb-1 space-y-3 font-serif text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-stone-200">
            <span className="font-bold text-stone-800">Transcript History</span>
            <button
              onClick={() => setShowFullHistory(false)}
              className="text-stone-400 hover:text-stone-600 text-[11px]"
            >
              Close
            </button>
          </div>
          {messages.length === 0 ? (
            <p className="text-stone-400 italic text-center py-4">No speech yet.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="leading-relaxed">
                <span className="font-bold text-stone-900">
                  {m.sender === 'user' ? 'Adi: ' : 'Aristotle: '}
                </span>
                <span className="text-stone-700">{m.text}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Primary Floating Speech Bubble */}
      {(lastAssistantMsg || lastUserMsg || conversationState === 'thinking') && (
        <div className="bg-[#35251e] text-[#f7eee9] border border-[#483329] px-4 py-3 rounded-2xl rounded-bl-xs shadow-xl max-w-sm font-serif text-xs leading-relaxed relative animate-fadeIn">
          {/* User speech line if recent */}
          {lastUserMsg && lastMessage === lastUserMsg && (
            <div className="text-amber-200 font-sans font-medium text-[11px] mb-1 pb-1 border-b border-amber-500/20 flex items-center gap-1">
              <span>Adi: {lastUserMsg.text}</span>
              <Check className="w-3 h-3 text-emerald-400" />
            </div>
          )}

          {/* Aristotle speech content */}
          {conversationState === 'thinking' ? (
            <div className="flex items-center gap-2 text-stone-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0.4s]" />
              <span>{isSearching ? `Searching for "${searchQuery}"...` : 'Thinking...'}</span>
            </div>
          ) : lastAssistantMsg ? (
            <p className="whitespace-pre-wrap">{lastAssistantMsg.text}</p>
          ) : null}

          {/* Transcript History Toggle Icon */}
          <button
            onClick={() => setShowFullHistory(!showFullHistory)}
            className="absolute -top-2 -right-2 bg-stone-800 text-stone-300 hover:text-white p-1 rounded-full border border-stone-600 shadow-xs"
            title="Toggle Transcript History"
          >
            {showFullHistory ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
        </div>
      )}

      {/* Animated Mascot */}
      <div className="flex items-center gap-2">
        <MascotAvatar state={conversationState} />
      </div>
    </div>
  );
}
