import React from 'react';
import { CheckCircle2 } from 'lucide-react';

/**
 * Math & Arithmetic Place-Value Viewer
 * Replicates the step-by-step arithmetic & place value scaffolding seen in aristotle1.mp4
 */
export function MathViewer({ data = {} }) {
  const { formula, steps, breakdown, number, isVerified = true } = data;

  return (
    <div className="bg-white/90 border border-stone-200 rounded-2xl p-6 shadow-xs my-4 font-serif text-stone-800" data-testid="math-viewer">
      {/* Primary Mathematical Equation */}
      {formula && (
        <div className="flex items-center gap-3 text-lg md:text-xl font-bold text-stone-900 border-b border-stone-200/80 pb-4 mb-4">
          <span>{formula}</span>
          {isVerified && (
            <span className="inline-flex items-center gap-1 text-emerald-600 text-sm font-sans font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Correct
            </span>
          )}
        </div>
      )}

      {/* Place Value Breakdown */}
      {breakdown && breakdown.length > 0 && (
        <div className="space-y-2 mb-4 font-mono text-sm bg-stone-50/70 p-4 rounded-xl border border-stone-200/70">
          <span className="text-xs font-sans text-stone-500 font-medium uppercase tracking-wider block mb-2">
            Place Value Breakdown
          </span>
          {breakdown.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 text-stone-700">
              <span className="font-bold text-stone-900 w-16">{item.digit}</span>
              <span className="text-stone-400">→</span>
              <span className="text-stone-600">{item.place}</span>
              <span className="text-stone-400">=</span>
              <span className="font-semibold text-emerald-700">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Step by Step Explanation */}
      {steps && steps.length > 0 && (
        <div className="space-y-1.5 text-sm text-stone-700 pt-2 border-t border-stone-100">
          {steps.map((step, idx) => (
            <p key={idx} className="leading-relaxed">
              {step}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
