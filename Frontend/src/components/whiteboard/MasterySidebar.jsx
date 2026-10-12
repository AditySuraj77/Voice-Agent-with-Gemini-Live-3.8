import React from 'react';
import { Target, ChevronLeft, Award, Sparkles, BookOpen } from 'lucide-react';

/**
 * Mastery & Learning Map Sidebar
 * Replicates the right-hand mastery goals and progress indicators seen in Aristotle videos
 */
export function MasterySidebar({
  activeSubject = 'Arithmetic',
  masteryGoal = {
    title: 'Writing whole numbers in expanded form',
    current: 2,
    target: 4,
    status: 'Recording your progress'
  },
  learningMap = [
    { title: 'Skip counting & extending base-ten number patterns', completed: true },
    { title: 'Explaining place-value patterns when multiplying', completed: false },
    { title: 'Converting whole numbers between standard & word form', completed: true },
    { title: 'Writing whole numbers in expanded form', current: true },
  ],
  sessionTime = '20 min goal',
}) {
  return (
    <aside className="w-72 bg-white/70 border-l border-stone-200/80 p-5 flex flex-col gap-6 font-serif text-stone-800 shrink-0 hidden lg:flex select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-stone-200/60 pb-3">
        <h3 className="font-bold text-sm tracking-wide text-stone-900">Mastery</h3>
        <span className="text-[11px] font-sans text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200/80">
          {sessionTime}
        </span>
      </div>

      {/* Learning Map Nav */}
      <div className="flex flex-col gap-3">
        <button className="flex items-center gap-1.5 text-xs text-rose-600 font-sans font-medium hover:text-rose-700 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to learning map
        </button>

        <div className="space-y-2 mt-2">
          {learningMap.map((item, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-xl text-xs transition-all ${
                item.current
                  ? 'bg-rose-50/90 border border-rose-200/80 text-rose-950 font-medium shadow-xs'
                  : item.completed
                  ? 'bg-stone-50 border border-stone-200 text-stone-600'
                  : 'text-stone-400 opacity-60'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  item.current ? 'bg-rose-500 animate-pulse' : item.completed ? 'bg-emerald-500' : 'bg-stone-300'
                }`} />
                <span className="leading-snug">{item.title}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Today's Focus Widget */}
      <div className="mt-auto bg-stone-50/80 rounded-2xl border border-stone-200/80 p-4 shadow-xs font-sans">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] uppercase tracking-wider font-bold text-stone-500">Today's Focus</span>
          <Target className="w-3.5 h-3.5 text-rose-500" />
        </div>
        <h4 className="text-xs font-serif font-bold text-stone-800 leading-snug mb-3">
          {masteryGoal.title}
        </h4>

        {/* Segmented Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-stone-600 font-medium">
            <span>Progress</span>
            <span className="font-bold text-rose-600">{masteryGoal.current} → {masteryGoal.target}</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 h-2">
            {[...Array(masteryGoal.target || 4)].map((_, idx) => (
              <div
                key={idx}
                className={`rounded-full transition-all duration-300 ${
                  idx < masteryGoal.current
                    ? 'bg-rose-500 shadow-xs'
                    : 'bg-stone-200'
                }`}
              />
            ))}
          </div>
        </div>

        {masteryGoal.status && (
          <p className="text-[10px] text-stone-500 mt-3 pt-2 border-t border-stone-200/60 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-rose-400" />
            <span>{masteryGoal.status}</span>
          </p>
        )}
      </div>
    </aside>
  );
}
