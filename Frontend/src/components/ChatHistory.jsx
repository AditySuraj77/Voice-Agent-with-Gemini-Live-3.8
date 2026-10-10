import React, { useEffect, useRef } from 'react';
import { User, Sparkles, Volume2 } from 'lucide-react';

export function ChatHistory({ messages, conversationState }) {
  const bottomRef = useRef(null);

  // Auto-scroll to newest message smoothly
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, conversationState]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto text-slate-400 py-16">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center mb-4 shadow-xl">
            <Volume2 className="w-8 h-8 text-indigo-400 animate-pulse" />
          </div>
          <h2 className="text-lg font-semibold text-slate-200 mb-2">Natural Voice Conversation</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Click <strong>Start Session</strong> below to begin speaking. Gemini answers natively with low latency speech-to-speech. You can interrupt anytime by speaking!
          </p>
        </div>
      ) : (
        messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm ${
                  isUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`flex flex-col ${
                  isUser ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm transition-all ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-slate-800 border border-slate-700/60 text-slate-100 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  {msg.isPartial && (
                    <span className="inline-block w-1.5 h-3.5 bg-indigo-400 ml-1 animate-pulse align-middle" />
                  )}
                </div>
                {msg.timestamp && (
                  <span className="text-[10px] text-slate-500 mt-1 px-1">
                    {msg.timestamp}
                  </span>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Thinking state bubble */}
      {conversationState === 'thinking' && (
        <div className="flex gap-3 max-w-3xl mr-auto items-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 rounded-tl-none flex items-center gap-2 text-xs text-slate-400">
            <span className="flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
            </span>
            <span>Thinking...</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
