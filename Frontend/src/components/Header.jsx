import React from 'react';
import { Sparkles, Zap, BrainCircuit, Globe } from 'lucide-react';

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
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse">
              <Globe className="w-3.5 h-3.5 animate-spin" />
              Searching Web
            </span>
          );
        }
        if (conversationState === 'speaking') {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Gemini Speaking
            </span>
          );
        }
        if (conversationState === 'listening') {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              Listening
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Connected
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-spin" />
            Connecting...
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800/60 text-slate-400 border border-slate-700/50">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            Ready
          </span>
        );
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            Gemini Live Voice
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              3.8 Live
            </span>
          </h1>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1 text-cyan-400 font-medium">
              <Globe className="w-3 h-3" /> Tavily Search
            </span>
            <span>• Speech-to-Speech</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Model Selector */}
        <div className="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-xl p-1 shadow-inner">
          <button
            onClick={() => onModelChange('gemini-3.8-live')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentModel === 'gemini-3.8-live'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Fast Voice
          </button>
          <button
            onClick={() => onModelChange('gemini-3.8-live-extended-thinking')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentModel === 'gemini-3.8-live-extended-thinking'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            Deep Thinking
          </button>
        </div>

        {/* Live Status Indicator */}
        {getStatusBadge()}
      </div>
    </header>
  );
}
