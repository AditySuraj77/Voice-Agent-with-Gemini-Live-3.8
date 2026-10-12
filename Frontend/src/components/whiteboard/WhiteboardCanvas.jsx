import React from 'react';
import { ParticleDiagram } from './ParticleDiagram.jsx';
import { CodeSandbox } from './CodeSandbox.jsx';
import { MathViewer } from './MathViewer.jsx';
import { BookOpen, Check, HelpCircle, Sparkles } from 'lucide-react';

/**
 * Main Interactive Whiteboard Canvas
 * Replicates the warm, clean paper canvas of Aristotle seen across all 3 videos
 */
export function WhiteboardCanvas({
  subject = 'Arithmetic',
  items = [],
  onCodeSubmit,
}) {
  return (
    <div
      className="flex-1 overflow-y-auto px-6 py-8 md:px-12 bg-[#fcfbf7] text-stone-800 font-serif leading-relaxed select-text"
      data-testid="whiteboard-canvas"
    >
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Subject Header Banner */}
        <div className="border-b border-stone-200/80 pb-5">
          <div className="flex items-center gap-2 text-stone-500 text-xs font-sans tracking-wide uppercase font-semibold mb-1">
            <span>Aristotle</span>
            <span>•</span>
            <span className="text-stone-900 font-serif normal-case tracking-normal text-sm font-bold">
              {subject}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
            Today's Focus
          </h2>
          <p className="text-sm text-stone-600 mt-1 font-sans">
            Our collaborative session together. We'll explore ideas, work through problems, and build solid understanding step by step.
          </p>
        </div>

        {/* Dynamic Items Rendered on Whiteboard */}
        {items.length === 0 ? (
          <div className="py-16 text-center text-stone-400 font-sans">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40 text-stone-500" />
            <p className="text-sm">Whiteboard is ready.</p>
            <p className="text-xs text-stone-400 mt-1">
              Start speaking to Aristotle or ask a question to see formulas, diagrams, and code appear here live!
            </p>
          </div>
        ) : (
          items.map((item, index) => {
            return (
              <div
                key={item.id || index}
                className="transition-all duration-300 animate-fadeIn"
              >
                {/* Item Title if present */}
                {item.title && (
                  <h3 className="text-base font-bold text-stone-900 mb-2 font-serif flex items-center gap-2">
                    <span>{item.title}</span>
                  </h3>
                )}

                {/* Component Type 1: Math Equation / Place Value */}
                {item.component === 'math' && (
                  <MathViewer data={item.data || { formula: item.content }} />
                )}

                {/* Component Type 2: Chemistry / Particle Diagram / Tree */}
                {item.component === 'diagram' && (
                  <ParticleDiagram
                    type={item.data?.diagramType || 'states'}
                    data={item.data || {}}
                  />
                )}

                {/* Component Type 3: Code Sandbox */}
                {item.component === 'code' && (
                  <CodeSandbox
                    initialCode={item.content || item.data?.code}
                    title={item.title || "Student's Code Example"}
                    onCodeSubmit={onCodeSubmit}
                  />
                )}

                {/* Component Type 4: Notes or Curriculum Steps */}
                {(item.component === 'notes' || !item.component) && (
                  <div className="bg-white/90 border border-stone-200/90 rounded-2xl p-5 shadow-xs text-sm">
                    {item.content ? (
                      <div className="whitespace-pre-wrap leading-relaxed text-stone-800">
                        {item.content}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
