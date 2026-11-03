import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Trash2, BookOpen, Check, Download, Printer, ArrowDown, History,
  Pen, Highlighter, Eraser, Eye, Sparkles, CheckCircle2, XCircle,
  Undo2, Redo2, MousePointer, ChevronDown, Globe, FileText
} from 'lucide-react';
import { TypewriterText } from './TypewriterText.jsx';
import { InteractiveCodeBlock } from './InteractiveCodeBlock.jsx';
import { MathFormula } from './MathFormula.jsx';
import { InlineFormattedNote } from './InlineFormattedNote.jsx';
import { UniversalVisualCard } from './UniversalVisualCard.jsx';
import { VideoTimelineCard } from './VideoTimelineCard.jsx';
import { exportWhiteboardToMarkdown, exportWhiteboardToInteractiveHtml, printWhiteboard } from '../../utils/exportNotes.js';
import { captureElementWithOverlay } from '../../utils/whiteboardSnapshot.js';
import { saveActiveSession } from '../../services/sessionHistory.js';
import { AuthButton } from '../AuthButton.jsx';

/**
 * Direct Whiteboard Canvas
 * Features:
 * - Content is written DIRECTLY on the paper surface without cards, borders, or boxes.
 * - Interactive in-place drawing overlay (Pen, Highlighter, Quick Tick/Cross stamps, Eraser).
 * - Full Undo / Redo support (with Ctrl+Z / Ctrl+Y shortcuts) and customizable Eraser sizes.
 * - Smart "Inspect Now" Button with instant inspection + intelligent auto-debounce.
 * - Two-Way AI Laser Pointer: Gemini visually points to coordinates/equations on the canvas.
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
  aiLaserPoint = null,
  onInspectAnnotations = null,
  restoredCanvasSnapshot = null,
  onAskChapter = null,
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
  const [eraserSize, setEraserSize] = useState(26); // 12 (fine), 26 (medium), 48 (large)
  const [showEraserMenu, setShowEraserMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 1200, height: 1200 });

  // Undo / Redo stacks (High-performance vector stroke model - zero GC pauses, zero GPU pipeline freezes)
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const strokesRef = useRef([]); // Array of stroke objects
  const redoStackRef = useRef([]); // Array of popped strokes for Redo
  const currentStrokeRef = useRef(null); // Active path being drawn
  const restoredBaseImageRef = useRef(null); // Retains base image from restored past study session

  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const hasDrawnRef = useRef(false);
  const saveCanvasTimerRef = useRef(null);

  // Reusable stroke renderer for live drawing, undo, redo, and dynamic canvas resizing
  const drawStroke = useCallback((ctx, stroke) => {
    if (!ctx || !stroke) return;

    if (stroke.type === 'stamp') {
      if (stroke.tool === 'tick') {
        ctx.save();
        ctx.strokeStyle = '#059669'; // Emerald
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(stroke.x - 8, stroke.y);
        ctx.lineTo(stroke.x - 2, stroke.y + 7);
        ctx.lineTo(stroke.x + 12, stroke.y - 9);
        ctx.stroke();
        ctx.restore();
      } else if (stroke.tool === 'cross') {
        ctx.save();
        ctx.strokeStyle = '#e11d48'; // Rose
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(stroke.x - 8, stroke.y - 8);
        ctx.lineTo(stroke.x + 8, stroke.y + 8);
        ctx.moveTo(stroke.x + 8, stroke.y - 8);
        ctx.lineTo(stroke.x - 8, stroke.y + 8);
        ctx.stroke();
        ctx.restore();
      }
      return;
    }

    if (stroke.type === 'path' && stroke.points && stroke.points.length > 0) {
      ctx.save();
      if (stroke.tool === 'pen') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color || '#1c1917';
        ctx.lineWidth = stroke.width || 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      } else if (stroke.tool === 'highlighter') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color || 'rgba(250, 204, 21, 0.45)';
        ctx.lineWidth = stroke.width || 24;
        ctx.lineCap = 'square';
        ctx.lineJoin = 'round';
      } else if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = stroke.width || 26;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }

      ctx.beginPath();
      const pts = stroke.points;
      ctx.moveTo(pts[0].x, pts[0].y);
      if (pts.length === 1) {
        ctx.lineTo(pts[0].x + 0.1, pts[0].y + 0.1);
      } else {
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
      }
      ctx.stroke();
      ctx.restore();
    }
  }, []);

  // Re-render all historical strokes onto the canvas (used by Undo, Redo, and Canvas Resize)
  const redrawAllStrokes = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (restoredBaseImageRef.current) {
      try {
        ctx.drawImage(restoredBaseImageRef.current, 0, 0);
      } catch (e) {
        console.warn('[DirectWhiteboard] Could not redraw base image:', e);
      }
    }

    for (let i = 0; i < strokesRef.current.length; i++) {
      drawStroke(ctx, strokesRef.current[i]);
    }
  }, [drawStroke]);

  // Non-blocking auto-save of handwritten canvas snapshot to session history (Idle debounced to 1200ms)
  const scheduleSaveCanvasToHistory = useCallback(() => {
    if (saveCanvasTimerRef.current) {
      clearTimeout(saveCanvasTimerRef.current);
    }
    saveCanvasTimerRef.current = setTimeout(() => {
      const canvas = overlayCanvasRef.current;
      if (!canvas) return;
      try {
        const snapshot = hasDrawnRef.current ? canvas.toDataURL('image/png') : null;
        saveActiveSession(items, studentProfile, { canvasSnapshot: snapshot });
      } catch (e) {
        console.warn('[DirectWhiteboard] Could not save canvas snapshot to history:', e);
      }
    }, 1200);
  }, [items, studentProfile]);

  useEffect(() => {
    return () => {
      if (saveCanvasTimerRef.current) {
        clearTimeout(saveCanvasTimerRef.current);
      }
    };
  }, []);

  // Dynamically sync canvas dimensions with the entire scrollable height of the board
  const updateCanvasSize = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const targetWidth = Math.max(container.scrollWidth, container.clientWidth, 800);
    const targetHeight = Math.max(container.scrollHeight, container.clientHeight, 1000);

    setCanvasDimensions((prev) => {
      if (prev.width === targetWidth && prev.height === targetHeight) return prev;
      return { width: targetWidth, height: targetHeight };
    });

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      redrawAllStrokes();
    }
  }, [redrawAllStrokes]);

  useEffect(() => {
    updateCanvasSize();
    const timer = setTimeout(updateCanvasSize, 100);
    window.addEventListener('resize', updateCanvasSize);

    // Dynamic observer: updates canvas whenever KaTeX formulas, Monaco editor, or images finish loading
    let observer = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      observer = new ResizeObserver(() => {
        updateCanvasSize();
      });
      observer.observe(containerRef.current);
      if (contentWrapperRef.current) {
        observer.observe(contentWrapperRef.current);
      }
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateCanvasSize);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [items.length, updateCanvasSize]);

  // Track manual scroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    // pb-36 adds 144px of bottom padding for floating controls bar; threshold of 220px prevents false scroll-up detection
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 220;
    isUserScrolledUpRef.current = !isAtBottom;
    setShowScrollBottomPill(!isAtBottom);
  };

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior,
      });
      isUserScrolledUpRef.current = false;
      setShowScrollBottomPill(false);
    }
    if (bottomAnchorRef.current) {
      bottomAnchorRef.current.scrollIntoView({ behavior, block: 'end' });
      isUserScrolledUpRef.current = false;
      setShowScrollBottomPill(false);
    }
  }, []);

  useEffect(() => {
    const isNewItemAdded = items.length > prevItemsLengthRef.current;
    prevItemsLengthRef.current = items.length;

    if (items.length > 0 && isNewItemAdded) {
      // User requirement: Always auto-scroll smoothly to latest note on live update without requiring manual scroll
      isUserScrolledUpRef.current = false;
      setShowScrollBottomPill(false);
      scrollToBottom('smooth');

      // Additional ticks to handle async rendering of Monaco editor, KaTeX formulas, and images
      const t1 = setTimeout(() => scrollToBottom('smooth'), 80);
      const t2 = setTimeout(() => scrollToBottom('smooth'), 250);
      const t3 = setTimeout(() => scrollToBottom('smooth'), 500);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [items.length, scrollToBottom]);

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

  // Perform Undo (High-performance vector model: zero memory overhead, 0ms latency)
  const handleUndo = useCallback(() => {
    if (strokesRef.current.length === 0) return;
    const lastStroke = strokesRef.current.pop();
    redoStackRef.current.push(lastStroke);
    setCanRedo(true);
    setCanUndo(strokesRef.current.length > 0);

    redrawAllStrokes();

    const stillHasContent = strokesRef.current.length > 0 || Boolean(restoredBaseImageRef.current);
    setHasDrawn(stillHasContent);
    hasDrawnRef.current = stillHasContent;
    scheduleSaveCanvasToHistory();
  }, [redrawAllStrokes, scheduleSaveCanvasToHistory]);

  // Perform Redo
  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const strokeToRestore = redoStackRef.current.pop();
    strokesRef.current.push(strokeToRestore);
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);

    const canvas = overlayCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      drawStroke(ctx, strokeToRestore);
    }

    setHasDrawn(true);
    hasDrawnRef.current = true;
    scheduleSaveCanvasToHistory();
  }, [drawStroke, scheduleSaveCanvasToHistory]);

  // Global Keyboard shortcuts for Undo (Ctrl+Z), Redo (Ctrl+Y), Inspect (Ctrl+Enter), Escape (Pointer)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleInspect();
      } else if (e.key === 'Escape') {
        setActiveDrawTool('none');
      } else if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key.toLowerCase() === 'v') {
          setActiveDrawTool('none');
        } else if (e.key.toLowerCase() === 'p') {
          setActiveDrawTool('pen');
        } else if (e.key.toLowerCase() === 'h') {
          setActiveDrawTool('highlighter');
        } else if (e.key.toLowerCase() === 'e') {
          setActiveDrawTool('eraser');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleInspect]);

  const handleDrawStart = (e) => {
    if (activeDrawTool === 'none') return;
    const coords = getCanvasCoords(e);
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Quick Stamp: Tick mark
    if (activeDrawTool === 'tick') {
      const stampStroke = { type: 'stamp', tool: 'tick', x: coords.x, y: coords.y };
      strokesRef.current.push(stampStroke);
      redoStackRef.current = [];
      setCanUndo(true);
      setCanRedo(false);
      drawStroke(ctx, stampStroke);
      if (!hasDrawnRef.current) {
        hasDrawnRef.current = true;
        setHasDrawn(true);
      }
      scheduleSaveCanvasToHistory();
      return;
    }

    // Quick Stamp: Cross mark
    if (activeDrawTool === 'cross') {
      const stampStroke = { type: 'stamp', tool: 'cross', x: coords.x, y: coords.y };
      strokesRef.current.push(stampStroke);
      redoStackRef.current = [];
      setCanUndo(true);
      setCanRedo(false);
      drawStroke(ctx, stampStroke);
      if (!hasDrawnRef.current) {
        hasDrawnRef.current = true;
        setHasDrawn(true);
      }
      scheduleSaveCanvasToHistory();
      return;
    }

    // Continuous Path (Pen / Highlighter / Eraser)
    isDrawingRef.current = true;
    lastPointRef.current = coords;

    const newPathStroke = {
      type: 'path',
      tool: activeDrawTool,
      color: activeDrawTool === 'pen' ? '#1c1917' : activeDrawTool === 'highlighter' ? 'rgba(250, 204, 21, 0.45)' : undefined,
      width: activeDrawTool === 'pen' ? 3.5 : activeDrawTool === 'highlighter' ? 24 : eraserSize,
      points: [coords],
    };
    currentStrokeRef.current = newPathStroke;

    // Draw initial dot for immediate visual responsiveness (e.g. decimal points or quick taps)
    ctx.save();
    if (activeDrawTool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else if (activeDrawTool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
      ctx.lineWidth = 24;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'round';
    } else if (activeDrawTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = eraserSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.lineTo(coords.x + 0.1, coords.y + 0.1);
    ctx.stroke();
    ctx.restore();
  };

  const handleDrawMove = (e) => {
    if (!isDrawingRef.current || !lastPointRef.current || activeDrawTool === 'none') return;
    if (e.cancelable && e.type && e.type.startsWith('touch')) {
      e.preventDefault();
    }
    const coords = getCanvasCoords(e);
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(coords.x, coords.y);

    if (activeDrawTool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else if (activeDrawTool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
      ctx.lineWidth = 24;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'round';
    } else if (activeDrawTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = eraserSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    ctx.stroke();

    if (currentStrokeRef.current) {
      currentStrokeRef.current.points.push(coords);
    }
    lastPointRef.current = coords;

    if (!hasDrawnRef.current) {
      hasDrawnRef.current = true;
      setHasDrawn(true);
    }
  };

  const handleDrawEnd = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastPointRef.current = null;
      if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0) {
        strokesRef.current.push(currentStrokeRef.current);
        redoStackRef.current = [];
        setCanUndo(true);
        setCanRedo(false);
        currentStrokeRef.current = null;
      }
      scheduleSaveCanvasToHistory();
    }
  };

  const handleClearAnnotations = () => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokesRef.current = [];
    redoStackRef.current = [];
    restoredBaseImageRef.current = null;
    currentStrokeRef.current = null;
    setCanUndo(false);
    setCanRedo(false);
    setHasDrawn(false);
    hasDrawnRef.current = false;
    if (saveCanvasTimerRef.current) {
      clearTimeout(saveCanvasTimerRef.current);
    }
    scheduleSaveCanvasToHistory();
  };

  // Restore or clear handwritten canvas drawing from session history
  useEffect(() => {
    if (restoredCanvasSnapshot === undefined || restoredCanvasSnapshot === null) return;
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const snapshotUrl =
      typeof restoredCanvasSnapshot === 'string'
        ? restoredCanvasSnapshot
        : restoredCanvasSnapshot?.snapshot || null;

    if (!snapshotUrl || restoredCanvasSnapshot?.clear) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      strokesRef.current = [];
      redoStackRef.current = [];
      restoredBaseImageRef.current = null;
      currentStrokeRef.current = null;
      setCanUndo(false);
      setCanRedo(false);
      setHasDrawn(false);
      hasDrawnRef.current = false;
      return;
    }

    const img = new Image();
    img.onload = () => {
      restoredBaseImageRef.current = img;
      strokesRef.current = [];
      redoStackRef.current = [];
      updateCanvasSize();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setHasDrawn(true);
      hasDrawnRef.current = true;
      setCanUndo(false);
      setCanRedo(false);
    };
    img.src = snapshotUrl;
  }, [restoredCanvasSnapshot, updateCanvasSize]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-6 py-10 md:px-12 md:py-12 bg-[#fbf8f3] text-stone-800 font-serif select-text pb-36 print:p-0 print:bg-white relative"
      data-testid="direct-whiteboard"
    >
      {/* 
        Transparent In-Place Annotation Canvas:
        Sits directly over the paper surface covering the full scrollable area.
        Pointer-events are enabled when drawing tool is active,
        allowing the student to write equations, circle words, or highlight formulas directly on the notes.
      */}
      <canvas
        ref={overlayCanvasRef}
        width={canvasDimensions.width}
        height={canvasDimensions.height}
        onMouseDown={handleDrawStart}
        onMouseMove={handleDrawMove}
        onMouseUp={handleDrawEnd}
        onMouseLeave={handleDrawEnd}
        onTouchStart={handleDrawStart}
        onTouchMove={handleDrawMove}
        onTouchEnd={handleDrawEnd}
        className="absolute top-0 left-0 z-10 block"
        data-testid="drawing-canvas-overlay"
        style={{
          width: `${canvasDimensions.width}px`,
          height: `${canvasDimensions.height}px`,
          pointerEvents: activeDrawTool !== 'none' ? 'auto' : 'none',
          touchAction: activeDrawTool !== 'none' ? 'none' : 'auto',
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

      {/* Two-Way Animated AI Laser Pointer from Gemini Teacher */}
      {aiLaserPoint && (
        <div
          className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-out animate-fadeIn"
          style={{
            left: `${Math.min(Math.max(aiLaserPoint.x, 2), 98)}%`,
            top: `${Math.min(Math.max(aiLaserPoint.y, 2), 98)}%`,
          }}
          data-testid="ai-laser-pointer"
        >
          {aiLaserPoint.style === 'circle' ? (
            /* Circle ring indicator */
            <div className="relative flex items-center justify-center">
              <span className="w-10 h-10 rounded-full border-2 border-amber-500 animate-ping opacity-75" />
              <span className="absolute w-8 h-8 rounded-full border-2 border-amber-400 bg-amber-400/20 shadow-lg" />
              {aiLaserPoint.label && (
                <div className="absolute top-full mt-1.5 whitespace-nowrap px-2 py-0.5 rounded-full bg-stone-900 text-amber-300 text-[10px] font-sans font-bold shadow-md">
                  {aiLaserPoint.label}
                </div>
              )}
            </div>
          ) : aiLaserPoint.style === 'check' ? (
            /* Checkmark indicator */
            <div className="relative flex items-center justify-center">
              <span className="w-9 h-9 rounded-full bg-emerald-500/20 animate-ping" />
              <CheckCircle2 className="w-7 h-7 text-emerald-600 drop-shadow-md" />
              {aiLaserPoint.label && (
                <div className="absolute top-full mt-1 whitespace-nowrap px-2 py-0.5 rounded-full bg-emerald-700 text-white text-[10px] font-sans font-bold shadow-md">
                  {aiLaserPoint.label}
                </div>
              )}
            </div>
          ) : aiLaserPoint.style === 'cross' ? (
            /* Cross indicator */
            <div className="relative flex items-center justify-center">
              <span className="w-9 h-9 rounded-full bg-rose-500/20 animate-ping" />
              <XCircle className="w-7 h-7 text-rose-600 drop-shadow-md" />
              {aiLaserPoint.label && (
                <div className="absolute top-full mt-1 whitespace-nowrap px-2 py-0.5 rounded-full bg-rose-700 text-white text-[10px] font-sans font-bold shadow-md">
                  {aiLaserPoint.label}
                </div>
              )}
            </div>
          ) : (
            /* Glowing Laser Point (Default) */
            <div className="relative flex items-center justify-center">
              <span className="w-8 h-8 rounded-full bg-cyan-400 animate-ping opacity-60" />
              <span className="absolute w-4 h-4 rounded-full bg-cyan-400 shadow-[0_0_14px_4px_rgba(34,211,238,0.8)] border border-white" />
              <div className="absolute top-full mt-1.5 whitespace-nowrap px-2 py-0.5 rounded-full bg-stone-950/90 text-cyan-300 text-[10px] font-sans font-bold shadow-md flex items-center gap-1 border border-cyan-500/30">
                <Sparkles className="w-2.5 h-2.5 text-cyan-300 animate-spin" />
                <span>{aiLaserPoint.label || 'Aristotle Laser'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fixed Left Floating Toolbar Dock (Always accessible regardless of scroll) */}
      <aside
        className="fixed left-2 sm:left-4 top-24 sm:top-28 z-30 flex flex-col items-center gap-1 p-1 sm:p-1.5 bg-white/95 backdrop-blur-md border border-stone-200/90 rounded-2xl shadow-xl transition-all print:hidden"
        data-testid="drawing-toolbar"
        aria-label="Whiteboard Drawing Tools"
      >
        {/* 1. Pointer / Select Tool (V or Esc) */}
        <button
          type="button"
          onClick={() => setActiveDrawTool('none')}
          className={`p-1.5 sm:p-2 rounded-xl text-xs font-sans transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
            activeDrawTool === 'none'
              ? 'bg-stone-900 text-white font-semibold shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
          title="Pointer: Select & normal mouse click (V or Esc)"
          data-testid="tool-pointer"
        >
          <MousePointer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-[9px] font-medium leading-none">Select</span>
        </button>

        {/* 2. Pen (P) */}
        <button
          type="button"
          onClick={() => setActiveDrawTool((prev) => (prev === 'pen' ? 'none' : 'pen'))}
          className={`p-1.5 sm:p-2 rounded-xl text-xs font-sans transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
            activeDrawTool === 'pen'
              ? 'bg-stone-900 text-white font-semibold shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
          title="Pen: Draw or write on whiteboard (P)"
          data-testid="tool-pen"
        >
          <Pen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-[9px] font-medium leading-none">Pen</span>
        </button>

        {/* 3. Highlighter (H) */}
        <button
          type="button"
          onClick={() => setActiveDrawTool((prev) => (prev === 'highlighter' ? 'none' : 'highlighter'))}
          className={`p-1.5 sm:p-2 rounded-xl text-xs font-sans transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
            activeDrawTool === 'highlighter'
              ? 'bg-amber-400 text-stone-950 font-bold shadow-xs'
              : 'text-stone-600 hover:text-amber-800 hover:bg-amber-50'
          }`}
          title="Highlighter: Highlight notes or formulas (H)"
          data-testid="tool-highlighter"
        >
          <Highlighter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-[9px] font-medium leading-none">Highlight</span>
        </button>

        {/* 4. Tick Stamp */}
        <button
          type="button"
          onClick={() => setActiveDrawTool((prev) => (prev === 'tick' ? 'none' : 'tick'))}
          className={`p-1.5 sm:p-2 rounded-xl text-xs font-sans transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
            activeDrawTool === 'tick'
              ? 'bg-emerald-600 text-white font-semibold shadow-xs'
              : 'text-stone-600 hover:text-emerald-700 hover:bg-emerald-50'
          }`}
          title="Tick Stamp: Click to stamp a checkmark (✓)"
          data-testid="tool-tick"
        >
          <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-[9px] font-medium leading-none">Tick</span>
        </button>

        {/* 5. Cross Stamp */}
        <button
          type="button"
          onClick={() => setActiveDrawTool((prev) => (prev === 'cross' ? 'none' : 'cross'))}
          className={`p-1.5 sm:p-2 rounded-xl text-xs font-sans transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
            activeDrawTool === 'cross'
              ? 'bg-rose-600 text-white font-semibold shadow-xs'
              : 'text-stone-600 hover:text-rose-700 hover:bg-rose-50'
          }`}
          title="Cross Stamp: Click to stamp an X mark (✗)"
          data-testid="tool-cross"
        >
          <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-[9px] font-medium leading-none">Cross</span>
        </button>

        {/* 6. Eraser with Size Options */}
        <div className="relative flex flex-col items-center">
          <button
            type="button"
            onClick={() => {
              if (activeDrawTool === 'eraser') {
                setShowEraserMenu(!showEraserMenu);
              } else {
                setActiveDrawTool('eraser');
              }
            }}
            className={`p-1.5 sm:p-2 rounded-xl text-xs font-sans transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
              activeDrawTool === 'eraser'
                ? 'bg-stone-800 text-white font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
            title="Eraser: Erase markings (click again for size)"
            data-testid="tool-eraser"
          >
            <Eraser className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-[9px] font-medium leading-none">
              Eraser <span className="opacity-75">{eraserSize === 12 ? 'S' : eraserSize === 26 ? 'M' : 'L'}</span>
            </span>
          </button>

          {/* Eraser Size Popover */}
          {showEraserMenu && activeDrawTool === 'eraser' && (
            <div className="absolute left-full ml-2 top-0 flex flex-col gap-1 p-1 bg-white border border-stone-300 rounded-xl shadow-xl z-40 animate-fadeIn min-w-[70px]">
              <button
                type="button"
                onClick={() => { setEraserSize(12); setShowEraserMenu(false); }}
                title="Small Eraser (12px)"
                className={`px-2 py-1 text-[11px] rounded ${eraserSize === 12 ? 'bg-stone-900 text-white font-bold' : 'text-stone-700 hover:bg-stone-100'}`}
              >
                Fine (S)
              </button>
              <button
                type="button"
                onClick={() => { setEraserSize(26); setShowEraserMenu(false); }}
                title="Medium Eraser (26px)"
                className={`px-2 py-1 text-[11px] rounded ${eraserSize === 26 ? 'bg-stone-900 text-white font-bold' : 'text-stone-700 hover:bg-stone-100'}`}
              >
                Medium (M)
              </button>
              <button
                type="button"
                onClick={() => { setEraserSize(48); setShowEraserMenu(false); }}
                title="Large Eraser (48px)"
                className={`px-2 py-1 text-[11px] rounded ${eraserSize === 48 ? 'bg-stone-900 text-white font-bold' : 'text-stone-700 hover:bg-stone-100'}`}
              >
                Broad (L)
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-6 h-px bg-stone-200 my-0.5" />

        {/* 7. Undo */}
        <button
          type="button"
          onClick={handleUndo}
          disabled={!canUndo}
          className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
            canUndo ? 'text-stone-700 hover:text-stone-950 hover:bg-stone-100' : 'text-stone-300 cursor-not-allowed'
          }`}
          title="Undo last stroke (Ctrl + Z)"
          data-testid="tool-undo"
        >
          <Undo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* 8. Redo */}
        <button
          type="button"
          onClick={handleRedo}
          disabled={!canRedo}
          className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
            canRedo ? 'text-stone-700 hover:text-stone-950 hover:bg-stone-100' : 'text-stone-300 cursor-not-allowed'
          }`}
          title="Redo stroke (Ctrl + Y)"
          data-testid="tool-redo"
        >
          <Redo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* 9. Clear Annotations */}
        {hasDrawn && (
          <button
            type="button"
            onClick={handleClearAnnotations}
            className="p-1 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-[10px] font-semibold"
            title="Clear hand-drawn markings"
            data-testid="tool-clear-drawings"
          >
            Clear
          </button>
        )}

        {/* Divider */}
        {onInspectAnnotations && <div className="w-6 h-px bg-stone-200 my-0.5" />}

        {/* 10. Manual "Check with Aristotle" Button (On-demand only!) */}
        {onInspectAnnotations && (
          <button
            type="button"
            onClick={handleInspect}
            disabled={isInspecting}
            className={`p-1.5 sm:p-2 rounded-xl text-xs font-sans font-semibold transition-all cursor-pointer shadow-xs flex flex-col items-center gap-0.5 ${
              isInspecting
                ? 'bg-emerald-700 text-white ring-2 ring-emerald-400/40'
                : hasDrawn
                ? 'bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold ring-2 ring-amber-300/40'
                : 'bg-stone-900 hover:bg-stone-950 text-white'
            }`}
            title="Check whiteboard with Aristotle AI (Ctrl + Enter)"
            data-testid="inspect-whiteboard-btn"
          >
            {isInspecting ? (
              <>
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300 stroke-[3] animate-pulse" />
                <span className="text-[9px] font-bold leading-tight text-center">Aristotle Reviewing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
                <span className="text-[9px] font-bold leading-tight text-center">
                  Check<span className="sr-only"> with Aristotle</span>
                </span>
              </>
            )}
          </button>
        )}
      </aside>

      <div ref={contentWrapperRef} className="max-w-3xl lg:max-w-5xl mx-auto space-y-8 relative px-4 pl-14 sm:pl-16 md:pl-20">
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

            {/* Export Notes Dropdown (Interactive HTML + Markdown) */}
            {items.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowExportMenu((prev) => !prev)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans text-stone-600 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer border border-transparent hover:border-amber-200"
                  title="Export Study Notes"
                >
                  <Download className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">Export Notes</span>
                  <ChevronDown className="w-3 h-3 text-stone-400" />
                </button>

                {showExportMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setShowExportMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-stone-200 rounded-2xl shadow-xl p-1.5 z-40 font-sans text-xs animate-fadeIn">
                      <div className="px-2.5 py-1.5 text-[11px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100">
                        Choose Export Format
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          exportWhiteboardToInteractiveHtml(items, studentProfile);
                          setShowExportMenu(false);
                        }}
                        className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-amber-50/80 transition-colors cursor-pointer group mt-1"
                      >
                        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 shrink-0 group-hover:bg-amber-200">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-stone-900 group-hover:text-amber-900 flex items-center gap-1.5">
                            <span>Interactive HTML (.html)</span>
                            <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.2 rounded font-bold">New</span>
                          </div>
                          <div className="text-[11px] text-stone-500 leading-tight mt-0.5">
                            Includes animated SVGs, formulas & full whiteboard styling
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          exportWhiteboardToMarkdown(items, studentProfile);
                          setShowExportMenu(false);
                        }}
                        className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-stone-100 transition-colors cursor-pointer group mt-0.5"
                      >
                        <div className="p-1.5 rounded-lg bg-stone-100 text-stone-600 shrink-0 group-hover:bg-stone-200">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-stone-800">
                            Markdown (.md)
                          </div>
                          <div className="text-[11px] text-stone-500 leading-tight mt-0.5">
                            Original text format for Obsidian & GitHub
                          </div>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
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

            {/* Erase Board (if items or hand-drawings present) */}
            {(items.length > 0 || hasDrawn) && onClearBoard && (
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

            {/* Google Cloud Auth & Memory Button */}
            <div className="ml-1 sm:ml-2">
              <AuthButton />
            </div>
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
              Select the Pen or Highlighter tool above, then write or mark anything on the board. Gemini will observe your handwriting and the steps you take, providing feedback via live voice!
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

              const hasVisual = Boolean(
                item.svgCode || item.imageUrl || item.visualType || item.cardType === 'visual' || item.image
              );

              const hasTextContent = Boolean(
                item.formula ||
                cleanNotesList.length > 0 ||
                item.tableData ||
                item.code ||
                item.question
              );

              const isVideoTimeline = Boolean(
                item.cardType === 'video_timeline' || (Array.isArray(item.timeline) && item.timeline.length > 0)
              );

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
                  {isVideoTimeline ? (
                    <VideoTimelineCard item={item} onAskChapter={onAskChapter} />
                  ) : (
                    <>
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

                  {/* Body Content: Split Side-by-Side if Visual + Notes both present, else single column */}
                  {hasVisual && hasTextContent ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-1">
                      {/* Left Column: Formulas, Bullet Notes, Tables, Code, Question */}
                      <div className="lg:col-span-7 space-y-3 min-w-0">
                        {/* 3. Highlighted Math / Scientific Formula */}
                        {item.formula && (
                          <div className="py-2.5 my-1 text-center bg-stone-100/50 rounded-xl px-3 border border-stone-200/50 shadow-2xs">
                            <div className="text-lg md:text-xl font-bold text-stone-900 font-serif tracking-wide overflow-x-auto py-1">
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
                          <div className="my-3 overflow-x-auto">
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

                        {/* 6. Interactive Code Snippet */}
                        {item.code && (
                          <InteractiveCodeBlock
                            code={item.code}
                            language={item.language}
                            onOpenInCodeLab={onOpenInCodeLab}
                          />
                        )}

                        {/* 7. Socratic Question */}
                        {item.question && (
                          <div className="pt-2 text-base md:text-lg font-serif text-stone-900 border-t border-stone-200/60 mt-2">
                            <div className="flex items-start gap-2">
                              <span className="text-amber-600 font-sans font-bold text-sm tracking-wide shrink-0 mt-0.5">❓ Question:</span>
                              <div className="flex-1">
                                <InlineFormattedNote text={item.question} isLatest={isLatest} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Column: Visual Diagram / Photo (Sticky on desktop) */}
                      <div className="lg:col-span-5 w-full lg:sticky lg:top-4">
                        {(item.svgCode || item.imageUrl || item.visualType || item.cardType === 'visual') && (
                          <UniversalVisualCard
                            item={item}
                            onOpenInCodeLab={onOpenInCodeLab}
                          />
                        )}

                        {item.image && (
                          <div className="my-2 rounded-2xl overflow-hidden border border-stone-300/80 bg-white shadow-xs max-w-xl mx-auto p-2">
                            <img
                              src={item.image.startsWith('data:') ? item.image : `data:image/jpeg;base64,${item.image}`}
                              alt={item.caption || item.topic || 'Clipped Whiteboard Diagram'}
                              className="w-full h-auto max-h-80 object-contain rounded-xl select-none"
                            />
                            {item.caption && (
                              <div className="text-center text-xs font-sans text-stone-600 mt-2 font-medium">
                                📌 {item.caption}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Standard Single-Column Layout (when visual only, or text only) */
                    <>
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

                      {/* 6. Universal Visual Card: Vector SVG or Real Educational Archive Photo */}
                      {(item.svgCode || item.imageUrl || item.visualType || item.cardType === 'visual') && (
                        <UniversalVisualCard
                          item={item}
                          onOpenInCodeLab={onOpenInCodeLab}
                        />
                      )}

                      {/* 7. Clipped Science/Math Diagram or Web Image (from browser) */}
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

                      {/* 8. Interactive Code Snippet */}
                      {item.code && (
                        <InteractiveCodeBlock
                          code={item.code}
                          language={item.language}
                          onOpenInCodeLab={onOpenInCodeLab}
                        />
                      )}

                      {/* 8. Socratic Question */}
                      {item.question && (
                        <div className="pt-2 text-base md:text-lg font-serif text-stone-900 border-t border-stone-200/60 mt-2">
                          <div className="flex items-start gap-2">
                            <span className="text-amber-600 font-sans font-bold text-sm tracking-wide shrink-0 mt-0.5">❓ Question:</span>
                            <div className="flex-1">
                              <InlineFormattedNote text={item.question} isLatest={isLatest} />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
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
