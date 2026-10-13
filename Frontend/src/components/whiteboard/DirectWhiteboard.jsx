import React, { useEffect, useRef } from 'react';
import { Trash2, BookOpen, Check, Code2, Calculator, Download, Printer } from 'lucide-react';
import { TypewriterText } from './TypewriterText.jsx';
import { exportWhiteboardToMarkdown, printWhiteboard } from '../../utils/exportNotes.js';

/**
 * Direct Whiteboard Canvas
 * Replicates the authentic Aristotle AI teaching canvas:
 * Content is written DIRECTLY on the paper surface without cards, borders, or boxes.
 * Headings, math equations, derivations, tables, code blocks, and student checkmarks
 * flow naturally like a real teacher writing on a blackboard/notebook.
 */
export function DirectWhiteboard({
  items = [],
  onClearBoard,
  studentProfile = {},
}) {
  const bottomAnchorRef = useRef(null);

  // Smoothly auto-scroll as new notes or formulas are written by the teacher
  useEffect(() => {
    if (items.length > 0 && bottomAnchorRef.current) {
      bottomAnchorRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [items.length, items]);

  return (
    <div
      className="flex-1 overflow-y-auto px-6 py-10 md:px-16 md:py-14 bg-[#fbf8f3] text-stone-800 font-serif select-text pb-36 print:p-0 print:bg-white"
      data-testid="direct-whiteboard"
    >
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Top Board Action Bar (Clean Export, Print & Erase Icons) */}
        {items.length > 0 && (
          <div className="flex items-center justify-between border-b border-stone-200/60 pb-2.5 print:hidden">
            <div className="text-xs font-sans text-stone-400">
              <span>Today's Board Notes</span>
              {studentProfile?.name && (
                <span className="text-stone-600 font-medium ml-1.5">• {studentProfile.name}</span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Download Markdown Notes */}
              <button
                onClick={() => exportWhiteboardToMarkdown(items, studentProfile)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans text-stone-600 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                title="Download Study Notes (.md)"
              >
                <Download className="w-3.5 h-3.5 text-amber-600" />
                <span>Export Notes</span>
              </button>

              {/* Print / Save as PDF */}
              <button
                onClick={printWhiteboard}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 transition-colors cursor-pointer"
                title="Print / Save PDF"
              >
                <Printer className="w-3.5 h-3.5 text-stone-500" />
                <span>Print / PDF</span>
              </button>

              {/* Erase Board */}
              {onClearBoard && (
                <button
                  onClick={onClearBoard}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer ml-1"
                  title="Clear Whiteboard"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Erase Board</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Empty Canvas State */}
        {items.length === 0 ? (
          <div className="py-24 text-center flex flex-col items-center justify-center font-sans">
            <div className="w-16 h-16 rounded-3xl bg-[#f2ede4] flex items-center justify-center text-stone-600 shadow-2xs mb-4">
              <BookOpen className="w-8 h-8 opacity-60 text-stone-700" />
            </div>
            <h3 className="text-xl font-bold text-stone-800 font-serif mb-2">
              Whiteboard is ready
            </h3>
            <p className="text-sm text-stone-500 max-w-md leading-relaxed font-sans">
              नीचे माइक ऑन करें या सवाल टाइप करें। आपके टीचर बोलते-बोलते सारे फॉर्मूले, मुख्य बिंदु और स्टेप्स सीधे व्हाइटबोर्ड पर लिखते जाएँगे।
            </p>
          </div>
        ) : (
          /* Direct Canvas Content — NO CARDS, Written Directly on the Surface with Ink Stream */
          <div className="space-y-8 animate-fadeIn">
            {items.map((item, index) => {
              const notesList = Array.isArray(item.notes)
                ? item.notes
                : typeof item.notes === 'string'
                ? [item.notes]
                : [];

              // Check if item was just added (latest item gets typewriter effect)
              const isLatest = index === items.length - 1;

              return (
                <div key={item.id || index} className="space-y-4">
                  {/* 1. Verified Student Answer with Checkmark (e.g. "Adi: 3247 ✓") */}
                  {item.studentAnswer && (
                    <div className="text-sm md:text-base font-sans font-medium text-emerald-800 flex items-center gap-2">
                      <span>{item.studentAnswer.replace(/[✓✔\s]+$/, '')}</span>
                      <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                    </div>
                  )}

                  {/* 2. Topic Heading / Concept Title */}
                  {item.topic && (
                    <div className="border-b border-stone-300/70 pb-1.5">
                      <h2 className="text-lg md:text-xl font-bold text-stone-900 font-serif tracking-tight">
                        {isLatest ? (
                          <TypewriterText text={item.topic} speed={15} />
                        ) : (
                          item.topic
                        )}
                      </h2>
                    </div>
                  )}

                  {/* 3. Highlighted Math / Scientific Formula written directly on board */}
                  {item.formula && (
                    <div className="py-3 my-2 text-center">
                      <div className="text-xl md:text-2xl font-bold text-stone-900 font-serif tracking-wider">
                        {isLatest ? (
                          <TypewriterText text={item.formula} speed={12} />
                        ) : (
                          item.formula
                        )}
                      </div>
                    </div>
                  )}

                  {/* 4. Notes / Step-by-Step Derivations written directly on surface */}
                  {notesList.length > 0 && (
                    <div className="space-y-2 text-sm md:text-base text-stone-800 font-serif leading-relaxed">
                      {notesList.map((note, idx) => {
                        const isStepMapping = note.includes('->') || note.includes('→') || note.includes('=');
                        return (
                          <div
                            key={idx}
                            className={`flex items-start gap-2.5 ${
                              isStepMapping ? 'font-mono text-sm text-stone-900' : ''
                            }`}
                          >
                            {!isStepMapping && (
                              <span className="text-stone-400 select-none">•</span>
                            )}
                            <span className="flex-1">
                              {isLatest ? (
                                <TypewriterText text={note} speed={14} />
                              ) : (
                                note
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 5. Clean Table if tableData present */}
                  {item.tableData && (
                    <div className="my-4 overflow-x-auto">
                      <table className="w-full border-collapse border border-stone-300 font-sans text-xs md:text-sm">
                        {item.tableData.headers && (
                          <thead className="bg-[#2a3b5c] text-white">
                            <tr>
                              {item.tableData.headers.map((h, hIdx) => (
                                <th key={hIdx} className="border border-stone-400 px-3 py-2 text-center font-semibold">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                        )}
                        <tbody>
                          {item.tableData.rows?.map((row, rIdx) => (
                            <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-[#fcfbf9]'}>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="border border-stone-300 px-3 py-2 text-center text-stone-800">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 6. Code Snippet written directly with line numbers */}
                  {item.code && (
                    <div className="my-4 rounded-xl overflow-hidden border border-stone-300 bg-[#f8f6f0] text-stone-900 font-mono text-xs md:text-sm shadow-2xs">
                      <div className="px-3.5 py-1.5 bg-[#eae5dc] border-b border-stone-300 flex items-center justify-between text-[11px] text-stone-600 font-sans">
                        <span className="font-semibold flex items-center gap-1.5">
                          <Code2 className="w-3.5 h-3.5 text-stone-700" />
                          Code Block
                        </span>
                        <span className="text-[10px] uppercase font-bold text-stone-500">Python</span>
                      </div>
                      <div className="p-4 overflow-x-auto leading-relaxed">
                        <pre className="space-y-0.5">
                          {item.code.split('\n').map((line, lineIdx) => (
                            <div key={lineIdx} className="flex">
                              <span className="w-8 select-none text-stone-400 text-right pr-3 shrink-0">
                                {lineIdx + 1}
                              </span>
                              <span className="text-stone-800">{line}</span>
                            </div>
                          ))}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* 7. Socratic Question written directly on board to prompt student */}
                  {item.question && (
                    <div className="pt-2 text-base md:text-lg font-serif italic text-stone-900">
                      <span>
                        {isLatest ? (
                          <TypewriterText text={item.question} speed={14} />
                        ) : (
                          item.question
                        )}
                      </span>
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
