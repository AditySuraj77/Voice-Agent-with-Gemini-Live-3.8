import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Trash2, BookOpen, Check, Download, Printer, ArrowDown, History,
  Pen, Highlighter, Eraser, Eye, Sparkles, CheckCircle2, XCircle
} from 'lucide-react';
import { TypewriterText } from './TypewriterText.jsx';
import { InteractiveCodeBlock } from './InteractiveCodeBlock.jsx';
import { MathFormula } from './MathFormula.jsx';
import { InlineFormattedNote } from './InlineFormattedNote.jsx';
import { exportWhiteboardToMarkdown, printWhiteboard } from '../../utils/exportNotes.js';
import { captureElementWithOverlay } from '../../utils/whiteboardSnapshot.js';

/**
 * Direct Whiteboard Canvas
 * Features:
 * - Content is written DIRECTLY on the paper surface without cards, borders, or boxes.
 * - Interactive in-place drawing overlay (Pen, Highlighter, Quick Tick/Cross stamps, Eraser).
 * - Real-time multimodal inspection: debounced and one-click snapshot streaming to Gemini Live vision.
 * - Two-Way AI Highlighting: Gemini visually points to topics/formulas with an animated glowing ring.
 */
export function DirectWhiteboard({
  items = [],
  onClearBoard,
  studentProfile = {},
  onOpenInCodeLab,
  isCodeLabOpen = false,
  onToggleCodeLab,
  isBrowserOpen = false,
  onToggleBrowser,
  onOpenHistory,
  aiHighlightedTopic = null,
  onInspectAnnotations = null,
}) {
  const containerRef = useRef(null);
  const contentWrapperRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const bottomAnchorRef = useRef(null);

  const isUserScrolledUpRef = useRef(false);
  const [showScrollBottomPill, setShowScrollBottomPill] = useState(false);
  const prevItemsLengthRef = useRef(0);

  // Drawing overlay state
  const [activeDrawTool, setActiveDrawTool] = useState('none'); // 'none' | 'pen' | 'highlighter' | 'tick' | 'cross' | 'eraser'
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);

  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const autoInspectTimerRef = useRef(null);

  // Resize canvas to match scrollable content dimensions
  const updateCanvasSize = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const targetWidth = Math.max(container.scrollWidth, container.clientWidth, 800);
    const targetHeight = Math.max(container.scrollHeight, container.clientHeight, 1000);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      // Save current drawings before resize
      let tempCanvas = null;
      if (canvas.width > 0 && canvas.height > 0) {
        tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCanvas.getContext('2d').drawImage(canvas, 0, 0);
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      if (tempCanvas) {
        const ctx = canvas.getContext('2d');
        ctx.drawImage(tempCanvas, 0, 0);
      }
    }
  }, []);

  useEffect(() => {
    updateCanvasSize();
    const timer = setTimeout(updateCanvasSize, 100);
    window.addEventListener('resize', updateCanvasSize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [items.length, updateCanvasSize]);

  // Track manual scroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 120;
    isUserScrolledUpRef.current = !isAtBottom;
    setShowScrollBottomPill(!isAtBottom);
  };

  const scrollToBottom = (behavior = 'smooth') => {
    if (bottomAnchorRef.current) {
      bottomAnchorRef.current.scrollIntoView({ behavior });
      isUserScrolledUpRef.current = false;
      setShowScrollBottomPill(false);
    }
  };

  useEffect(() => {
    const isNewItemAdded = items.length > prevItemsLengthRef.current;
    prevItemsLengthRef.current = items.length;

    if (items.length > 0 && isNewItemAdded) {
      if (!isUserScrolledUpRef.current) {
        scrollToBottom('smooth');
      }
    }
  }, [items.length]);

  // Helper to get precise canvas coordinates taking scaling into account
  const getCanvasCoords = (e) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = rect.width ? canvas.width / rect.width : 1;
    const scaleY = rect.height ? canvas.height / rect.height : 1;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // Inspect handwritten steps & marks with Gemini
  const handleInspect = useCallback(async () => {
    if (!onInspectAnnotations || isInspecting) return;
    setIsInspecting(true);
    try {
      const base64Jpeg = await captureElementWithOverlay(contentWrapperRef.current, overlayCanvasRef.current);
      if (base64Jpeg) {
        onInspectAnnotations(base64Jpeg);
      }
    } catch (e) {
      console.error('[DirectWhiteboard] Failed to capture annotations:', e);
    } finally {
      setTimeout(() => setIsInspecting(false), 2500);
    }
  }, [onInspectAnnotations, isInspecting]);

  // Trigger debounced auto-inspection after student finishes writing/marking
  const scheduleAutoInspect = useCallback(() => {
    if (!onInspectAnnotations) return;
    if (autoInspectTimerRef.current) {
      clearTimeout(autoInspectTimerRef.current);
    }
    autoInspectTimerRef.current = setTimeout(() => {
      handleInspect();
    }, 1800); // 1.8s debounce after last stroke
  }, [onInspectAnnotations, handleInspect]);

  const handleDrawStart = (e) => {
    if (activeDrawTool === 'none') return;
    const coords = getCanvasCoords(e);
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Quick Stamp: Tick mark
    if (activeDrawTool === 'tick') {
      ctx.save();
      ctx.strokeStyle = '#059669'; // Emerald
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(coords.x - 8, coords.y);
      ctx.lineTo(coords.x - 2, coords.y + 7);
      ctx.lineTo(coords.x + 12, coords.y - 9);
      ctx.stroke();
      ctx.restore();
      setHasDrawn(true);
      scheduleAutoInspect();
      return;
    }

    // Quick Stamp: Cross mark
    if (activeDrawTool === 'cross') {
      ctx.save();
      ctx.strokeStyle = '#e11d48'; // Rose
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(coords.x - 8, coords.y - 8);
      ctx.lineTo(coords.x + 8, coords.y + 8);
      ctx.moveTo(coords.x + 8, coords.y - 8);
      ctx.lineTo(coords.x - 8, coords.y + 8);
      ctx.stroke();
      ctx.restore();
      setHasDrawn(true);
      scheduleAutoInspect();
      return;
    }

    isDrawingRef.current = true;
    lastPointRef.current = coords;
  };

  const handleDrawMove = (e) => {
    if (!isDrawingRef.current || !lastPointRef.current || activeDrawTool === 'none') return;
    const coords = getCanvasCoords(e);
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(coords.x, coords.y);

    if (activeDrawTool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#1c1917'; // Authentic stone ink
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else if (activeDrawTool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)'; // Fluorescent highlighter yellow
      ctx.lineWidth = 24;
      ctx.lineCap = 'square';
    } else if (activeDrawTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 26;
      ctx.lineCap = 'round';
    }

    ctx.stroke();
    lastPointRef.current = coords;
    setHasDrawn(true);
  };

  const handleDrawEnd = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastPointRef.current = null;
      scheduleAutoInspect();
    }
  };

  const handleClearAnnotations = () => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    if (autoInspectTimerRef.current) {
      clearTimeout(autoInspectTimerRef.current);
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-6 py-10 md:px-12 md:py-12 bg-[#fbf8f3] text-stone-800 font-serif select-text pb-36 print:p-0 print:bg-white relative"
      data-testid="direct-whiteboard"
    >
      {/* 
        Transparent In-Place Annotation Canvas:
        Sits directly over the paper surface. Pointer-events are enabled when drawing tool is active,
        allowing the student to write equations, circle words, or highlight formulas directly on the notes.
      */}
      <canvas
        ref={overlayCanvasRef}
        onMouseDown={handleDrawStart}
        onMouseMove={handleDrawMove}
        onMouseUp={handleDrawEnd}
        onMouseLeave={handleDrawEnd}
        onTouchStart={handleDrawStart}
        onTouchMove={handleDrawMove}
        onTouchEnd={handleDrawEnd}
        className="absolute inset-0 z-10 block"
        data-testid="drawing-canvas-overlay"
        style={{
          pointerEvents: activeDrawTool !== 'none' ? 'auto' : 'none',
          cursor:
            activeDrawTool === 'pen'
              ? 'crosshair'
              : activeDrawTool === 'highlighter'
              ? 'text'
              : activeDrawTool === 'tick' || activeDrawTool === 'cross'
              ? 'pointer'
              : activeDrawTool === 'eraser'
              ? 'cell'
              : 'default',
        }}
      />

      <div ref={contentWrapperRef} className="max-w-3xl mx-auto space-y-8 relative">
        {/* Top Board Action Bar (Always clickable above drawing canvas) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/60 pb-2.5 print:hidden relative z-20">
          <div className="text-xs font-sans text-stone-400">
            <span>Today's Board Notes</span>
            {studentProfile?.name && (
              <span className="text-stone-600 font-medium ml-1.5">• {studentProfile.name}</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Toggle Code Lab */}
            {onToggleCodeLab && (
              <button
                type="button"
                onClick={onToggleCodeLab}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans transition-colors cursor-pointer ${
                  isCodeLabOpen
                    ? 'bg-amber-100 text-amber-800 font-semibold'
                    : 'text-stone-600 hover:text-amber-700 hover:bg-amber-50'
                }`}
                title="Toggle Split Code Lab & Live UI Sandbox"
              >
                <span>💻 Code Lab</span>
              </button>
            )}

            {/* Toggle Live Browser */}
            {onToggleBrowser && (
              <button
                type="button"
                onClick={onToggleBrowser}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans transition-colors cursor-pointer ${
                  isBrowserOpen
                    ? 'bg-cyan-100 text-cyan-800 font-semibold border border-cyan-300'
                    : 'text-stone-600 hover:text-cyan-700 hover:bg-cyan-50'
                }`}
                title="Toggle Live Voice Browser"
              >
                <span>🌐 Live Browser</span>
              </button>
            )}

            {/* In-Place Interactive Drawing Tools (Pen, Highlighter, Tick, Cross, Eraser) */}
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-stone-200/50 border border-stone-300/40"
              data-testid="drawing-toolbar"
            >
              {/* Pen */}
              <button
                type="button"
                onClick={() => setActiveDrawTool((prev) => (prev === 'pen' ? 'none' : 'pen'))}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-sans transition-all cursor-pointer ${
                  activeDrawTool === 'pen'
                    ? 'bg-stone-900 text-white font-semibold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
                title="Pen: Write steps or solve math on whiteboard"
                data-testid="tool-pen"
              >
                <Pen className="w-3 h-3" />
                <span className="hidden sm:inline">Pen</span>
              </button>

              {/* Highlighter */}
              <button
                type="button"
                onClick={() => setActiveDrawTool((prev) => (prev === 'highlighter' ? 'none' : 'highlighter'))}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-sans transition-all cursor-pointer ${
                  activeDrawTool === 'highlighter'
                    ? 'bg-amber-400 text-stone-950 font-bold shadow-xs'
                    : 'text-stone-600 hover:text-amber-800 hover:bg-amber-100/60'
                }`}
                title="Highlighter: Highlight formulas or key notes"
                data-testid="tool-highlighter"
              >
                <Highlighter className="w-3 h-3" />
                <span className="hidden sm:inline">Highlight</span>
              </button>

              {/* Tick Stamp */}
              <button
                type="button"
                onClick={() => setActiveDrawTool((prev) => (prev === 'tick' ? 'none' : 'tick'))}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-sans transition-all cursor-pointer ${
                  activeDrawTool === 'tick'
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                    : 'text-stone-600 hover:text-emerald-700 hover:bg-emerald-50'
                }`}
                title="Tick Stamp: Click on canvas to stamp a checkmark (✓)"
                data-testid="tool-tick"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span className="hidden sm:inline">Tick</span>
              </button>

              {/* Cross Stamp */}
              <button
                type="button"
                onClick={() => setActiveDrawTool((prev) => (prev === 'cross' ? 'none' : 'cross'))}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-sans transition-all cursor-pointer ${
                  activeDrawTool === 'cross'
                    ? 'bg-rose-600 text-white font-semibold shadow-xs'
                    : 'text-stone-600 hover:text-rose-700 hover:bg-rose-50'
                }`}
                title="Cross Stamp: Click on canvas to stamp an X mark (✗)"
                data-testid="tool-cross"
              >
                <XCircle className="w-3 h-3 text-rose-300" />
                <span className="hidden sm:inline">Cross</span>
              </button>

              {hasDrawn && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveDrawTool((prev) => (prev === 'eraser' ? 'none' : 'eraser'))}
                    className={`p-1 rounded-full text-xs font-sans transition-all cursor-pointer ${
                      activeDrawTool === 'eraser'
                        ? 'bg-stone-800 text-white'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                    title="Eraser: Erase markings"
                    data-testid="tool-eraser"
                  >
                    <Eraser className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={handleClearAnnotations}
                    className="text-[11px] font-sans px-1 text-stone-400 hover:text-rose-600 cursor-pointer"
                    title="Clear hand-drawn markings"
                    data-testid="tool-clear-drawings"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>

            {/* Check Handwritten Working with Gemini Teacher */}
            {hasDrawn && onInspectAnnotations && (
              <button
                type="button"
                onClick={handleInspect}
                disabled={isInspecting}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-semibold transition-all cursor-pointer animate-fadeIn ${
                  isInspecting
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-stone-900 hover:bg-stone-950 text-white shadow-xs'
                }`}
                title="Have Gemini inspect your handwritten steps"
                data-testid="inspect-whiteboard-btn"
              >
                {isInspecting ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300 stroke-[3]" />
                    <span>Sir is Checking...</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>Check with Sir</span>
                  </>
                )}
              </button>
            )}

            {/* Download Markdown Notes (only if items present) */}
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => exportWhiteboardToMarkdown(items, studentProfile)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans text-stone-600 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                title="Download Study Notes (.md)"
              >
                <Download className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Export Notes</span>
              </button>
            )}

            {/* Print / Save as PDF (only if items present) */}
            {items.length > 0 && (
              <button
                type="button"
                onClick={printWhiteboard}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 transition-colors cursor-pointer"
                title="Print / Save PDF"
              >
                <Printer className="w-3.5 h-3.5 text-stone-500" />
                <span className="hidden sm:inline">Print / PDF</span>
              </button>
            )}

            {/* Past Study Session History Drawer */}
            {onOpenHistory && (
              <button
                type="button"
                onClick={onOpenHistory}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans text-stone-600 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                title="Past Study Sessions"
              >
                <History className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">History</span>
              </button>
            )}

            {/* Erase Board (only if items present) */}
            {items.length > 0 && onClearBoard && (
              <button
                type="button"
                onClick={onClearBoard}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer ml-1"
                title="Clear Whiteboard"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Erase Board</span>
              </button>
            )}
          </div>
        </div>

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
              ऊपर Pen या Highlighter चुनें और बोर्ड पर कुछ भी लिखें या टिक करें। जेमिनी आपकी हैंडराइटिंग और स्टेप्स को देखकर लाइव वॉइस में चेक करेगा!
            </p>
          </div>
        ) : (
          /* Direct Canvas Content */
          <div className="space-y-8 animate-fadeIn">
            {items.map((item, index) => {
              const notesList = Array.isArray(item.notes)
                ? item.notes
                : typeof item.notes === 'string'
                ? [item.notes]
                : [];

              const cleanNotesList = notesList.filter((note) => {
                if (!item.formula) return true;
                const n = note.replace(/[\s(),.;:\-_]/g, '').toLowerCase();
                const f = item.formula.replace(/[\s(),.;:\-_]/g, '').toLowerCase();
                if (!n) return false;
                return n !== f && !f.includes(n);
              });

              const isLatest = index === items.length - 1;

              // Check if Gemini is actively highlighting this topic / card
              const isAiHighlighted =
                aiHighlightedTopic &&
                aiHighlightedTopic.topic &&
                item.topic &&
                (item.topic.toLowerCase().includes(aiHighlightedTopic.topic.toLowerCase()) ||
                  aiHighlightedTopic.topic.toLowerCase().includes(item.topic.toLowerCase()));

              return (
                <div
                  key={item.id || index}
                  className={`space-y-4 transition-all duration-500 rounded-2xl ${
                    isAiHighlighted
                      ? 'p-4 bg-amber-50/70 border-2 border-amber-400 shadow-md ring-4 ring-amber-300/30'
                      : ''
                  }`}
                  data-testid={`whiteboard-item-${index}`}
                >
                  {/* Two-Way AI Highlight Badge */}
                  {isAiHighlighted && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400 text-stone-950 text-xs font-sans font-bold w-fit shadow-xs animate-bounce">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Sir Pointing Here: {aiHighlightedTopic.reason || 'Pay attention to this'}</span>
                    </div>
                  )}

                  {/* 1. Verified Student Answer with Checkmark */}
                  {item.studentAnswer && (
                    <div className="text-sm md:text-base font-sans font-medium text-emerald-800 flex items-center gap-2">
                      <span>{item.studentAnswer.replace(/[✓✔\s]+$/, '')}</span>
                      <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                    </div>
                  )}

                  {/* 2. Topic Heading */}
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

                  {/* 3. Highlighted Math / Scientific Formula */}
                  {item.formula && (
                    <div className="py-3 my-2 text-center bg-stone-100/50 rounded-xl px-4 border border-stone-200/50 shadow-2xs">
                      <div className="text-xl md:text-2xl font-bold text-stone-900 font-serif tracking-wide overflow-x-auto py-1">
                        <MathFormula formula={item.formula} displayMode={true} />
                      </div>
                    </div>
                  )}

                  {/* 4. Notes / Step-by-Step Derivations */}
                  {cleanNotesList.length > 0 && (
                    <div className="space-y-2 text-sm md:text-base text-stone-800 font-serif leading-relaxed">
                      {cleanNotesList.map((note, idx) => {
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
                              <InlineFormattedNote text={note} isLatest={isLatest} />
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

                  {/* 6. Clipped Science/Math Diagram or Web Image */}
                  {item.image && (
                    <div className="my-3 rounded-2xl overflow-hidden border border-stone-300/80 bg-white shadow-xs max-w-xl mx-auto p-2">
                      <img
                        src={item.image.startsWith('data:') ? item.image : `data:image/jpeg;base64,${item.image}`}
                        alt={item.caption || item.topic || 'Clipped Whiteboard Diagram'}
                        className="w-full h-auto max-h-96 object-contain rounded-xl select-none"
                      />
                      {item.caption && (
                        <div className="text-center text-xs font-sans text-stone-600 mt-2 font-medium">
                          📌 {item.caption}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 7. Interactive Code Snippet */}
                  {item.code && (
                    <InteractiveCodeBlock
                      code={item.code}
                      language={item.language}
                      onOpenInCodeLab={onOpenInCodeLab}
                    />
                  )}

                  {/* 8. Socratic Question */}
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

      {/* Floating Pill: Jump to latest notes */}
      {showScrollBottomPill && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-stone-900/90 hover:bg-stone-950 text-white text-xs font-sans shadow-lg shadow-black/15 backdrop-blur-sm transition-all duration-200 cursor-pointer border border-stone-700/50 print:hidden animate-fadeIn"
          title="Jump to latest whiteboard notes"
        >
          <ArrowDown className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>Latest notes</span>
        </button>
      )}
    </div>
  );
}
