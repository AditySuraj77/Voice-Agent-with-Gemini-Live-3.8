import React from 'react';
import { Zap, BrainCircuit, Globe, BookOpen, Atom, Terminal, Calculator } from 'lucide-react';

export function Header({
  currentModel,
  onModelChange,
  sessionStatus,
  conversationState,
  isSearching = false,
  activeSubject = 'Arithmetic',
  onSubjectChange,
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
              Aristotle Speaking
            </span>
          );
        }
        if (conversationState === 'listening') {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-medium bg-rose-50 text-rose-700 border border-rose-200">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              Listening
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
            Error
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

  const subjects = [
    { name: 'Arithmetic', icon: Calculator },
    { name: 'Chemistry', icon: Atom },
    { name: 'Computer Science', icon: Terminal },
  ];

  return (
    <header className="flex items-center justify-between px-6 py-3.5 border-b border-stone-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-20 font-serif select-none">
      {/* Brand & Active Subject */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center shadow-xs">
            <span className="text-white text-base font-bold">🍎</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-stone-900 tracking-tight flex items-center gap-2 leading-none">
              Aristotle
              <span className="font-sans text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 uppercase tracking-wider">
                Live Tutor
              </span>
            </h1>
          </div>
        </div>

        {/* Subject Navigation Chips */}
        <div className="hidden md:flex items-center gap-1 bg-stone-100/90 p-1 rounded-xl border border-stone-200 font-sans text-xs">
          {subjects.map((sub) => {
            const Icon = sub.icon;
            const isSelected = activeSubject === sub.name;
            return (
              <button
                key={sub.name}
                onClick={() => onSubjectChange && onSubjectChange(sub.name)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-medium ${
                  isSelected
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-rose-600' : 'text-stone-400'}`} />
                <span>{sub.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Controls: Model Selector & Status Badge */}
      <div className="flex items-center gap-3">
        {/* Model Selector */}
        <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 font-sans">
          <button
            onClick={() => onModelChange('gemini-3.8-live')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
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
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
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
