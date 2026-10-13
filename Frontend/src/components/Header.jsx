import React from 'react';
import { Zap, BrainCircuit, Globe } from 'lucide-react';

export function Header({
  currentModel,
  onModelChange,
  sessionStatus,
  conversationState,
  isSearching = false,
}) {
  const getStatusBadge = () => {
    switch (sessionStatus) {
      case 'connected':
        if (isSearching) {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-medium bg-cyan-50 text-cyan-700 border border-cyan-200 animate-pulse">
              <Globe className="w-3.5 h-3.5 animate-spin" />
              Searching Web
            </span>
          );
        }
        if (conversationState === 'speaking') {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Teacher Speaking
            </span>
          );
        }
        if (conversationState === 'listening') {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-medium bg-rose-50 text-rose-700 border border-rose-200">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              Listening to you
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Connected
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-spin" />
            Connecting...
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Connection Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-medium bg-stone-100 text-stone-600 border border-stone-200">
            <span className="w-2 h-2 rounded-full bg-stone-400" />
            Ready
          </span>
        );
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-3.5 border-b border-stone-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-20 font-sans select-none shadow-xs">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center shadow-xs">
          <span className="text-white text-lg">🧑‍🏫</span>
        </div>
        <div>
          <h1 className="text-base font-bold text-stone-900 tracking-tight flex items-center gap-2 leading-none">
            AI Teacher
            <span className="font-sans text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-wider">
              Live Whiteboard
            </span>
          </h1>
          <p className="text-[11px] text-stone-400 mt-0.5">
            1-on-1 Voice & Dynamic Notes
          </p>
        </div>
      </div>

      {/* Right Controls: Model Selector & Status Badge */}
      <div className="flex items-center gap-3">
        {/* Model Selector */}
        <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 font-sans">
          <button
            onClick={() => onModelChange('gemini-3.8-live')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              currentModel === 'gemini-3.8-live'
                ? 'bg-white text-stone-900 shadow-xs font-semibold'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-500" />
            Fast Voice
          </button>
          <button
            onClick={() => onModelChange('gemini-3.8-live-extended-thinking')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              currentModel === 'gemini-3.8-live-extended-thinking'
                ? 'bg-white text-purple-900 shadow-xs font-semibold'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <BrainCircuit className="w-3 h-3 text-purple-600" />
            Deep Thinking
          </button>
        </div>

        {/* Live Status Indicator */}
        {getStatusBadge()}
      </div>
    </header>
  );
}
