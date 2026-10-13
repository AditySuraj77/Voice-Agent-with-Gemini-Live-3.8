import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Eye,
  EyeOff,
  Trash2,
  BookOpen,
  Code2,
  Calculator,
  HelpCircle,
  CheckCircle2,
  Clock,
  Move,
} from 'lucide-react';

/**
 * Infinite Canvas Whiteboard for AI Tutor
 * 60fps Pan & Zoom with Dot Grid, Drag-and-Drop Cards, Auto-Follow Teacher,
 * and specialized card renderers (Math, Code, Concepts, Questions, Checkmarks).
 */
export function InfiniteCanvas({
  items = [],
  onClearBoard,
  onCardMove,
}) {
  const containerRef = useRef(null);

  // Transform state: pan offset & zoom scale
  const [pan, setPan] = useState({ x: 100, y: 100 });
  const [zoom, setZoom] = useState(1);
  const [followTeacher, setFollowTeacher] = useState(true);

  // Dragging state for canvas panning
  const isPanningRef = useRef(false);
  const startPanRef = useRef({ x: 0, y: 0 });

  // Dragging state for individual cards
  const [draggingCardId, setDraggingCardId] = useState(null);
  const cardDragStartRef = useRef({ mouseX: 0, mouseY: 0, initialCardX: 0, initialCardY: 0 });

  // Local card positions map: { [cardId]: { x, y } }
  const [cardPositions, setCardPositions] = useState({});

  // Auto-layout new cards with comfortable spacing
  useEffect(() => {
    setCardPositions((prev) => {
      const updated = { ...prev };
      let changed = false;

      items.forEach((item, index) => {
        if (!updated[item.id]) {
          // 2-column responsive layout or timeline cascade
          const col = index % 2;
          const row = Math.floor(index / 2);
          updated[item.id] = {
            x: col * 460 + 120,
            y: row * 340 + 120,
          };
          changed = true;
        }
      });

      return changed ? updated : prev;
    });

    // Auto-focus on the latest card if followTeacher is active
    if (followTeacher && items.length > 0) {
      const latestItem = items[items.length - 1];
      const pos = cardPositions[latestItem.id] || {
        x: ((items.length - 1) % 2) * 460 + 120,
        y: Math.floor((items.length - 1) / 2) * 340 + 120,
      };

      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        // Center the card: pan = center - pos * zoom
        const targetX = clientWidth / 2 - (pos.x + 200) * zoom;
        const targetY = clientHeight / 2 - (pos.y + 120) * zoom;
        setPan({ x: targetX, y: targetY });
      }
    }
  }, [items, followTeacher, zoom]);

  // Handle Zoom at mouse pointer
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom delta
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom((prevZoom) => {
      const newZoom = Math.min(Math.max(prevZoom * zoomFactor, 0.25), 2.5);

      // Adjust pan so the point under the mouse stays fixed
      setPan((prevPan) => ({
        x: mouseX - (mouseX - prevPan.x) * (newZoom / prevZoom),
        y: mouseY - (mouseY - prevPan.y) * (newZoom / prevZoom),
      }));

      return newZoom;
    });
  }, []);

  // Canvas Mouse Down (Panning)
  const handleMouseDown = (e) => {
    // Only start pan if clicking the canvas background, not on a card or button
    if (e.target.closest('[data-no-pan="true"]')) return;

    isPanningRef.current = true;
    startPanRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };
  };

  const handleMouseMove = (e) => {
    // Panning canvas
    if (isPanningRef.current) {
      setPan({
        x: e.clientX - startPanRef.current.x,
        y: e.clientY - startPanRef.current.y,
      });
      return;
    }

    // Dragging an individual card
    if (draggingCardId) {
      const deltaX = (e.clientX - cardDragStartRef.current.mouseX) / zoom;
      const deltaY = (e.clientY - cardDragStartRef.current.mouseY) / zoom;

      setCardPositions((prev) => ({
        ...prev,
        [draggingCardId]: {
          x: cardDragStartRef.current.initialCardX + deltaX,
          y: cardDragStartRef.current.initialCardY + deltaY,
        },
      }));
    }
  };

  const handleMouseUp = () => {
    isPanningRef.current = false;
    setDraggingCardId(null);
  };

  // Card Drag Handlers
  const handleCardDragStart = (e, cardId) => {
    e.stopPropagation();
    const pos = cardPositions[cardId] || { x: 120, y: 120 };
    cardDragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialCardX: pos.x,
      initialCardY: pos.y,
    };
    setDraggingCardId(cardId);
  };

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.2, 2.5));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.2, 0.25));

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 80, y: 80 });
  };

  const handleFitAll = () => {
    if (items.length === 0 || !containerRef.current) {
      handleResetView();
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    items.forEach((item) => {
      const pos = cardPositions[item.id] || { x: 120, y: 120 };
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + 420);
      maxY = Math.max(maxY, pos.y + 300);
    });

    const { clientWidth, clientHeight } = containerRef.current;
    const contentWidth = maxX - minX + 160;
    const contentHeight = maxY - minY + 160;

    const scaleX = clientWidth / contentWidth;
    const scaleY = clientHeight / contentHeight;
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 1.4);

    setZoom(newZoom);
    setPan({
      x: (clientWidth - (maxX + minX) * newZoom) / 2,
      y: (clientHeight - (maxY + minY) * newZoom) / 2,
    });
  };

  // Attach wheel listener with passive: false to prevent page zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="relative flex-1 w-full h-full overflow-hidden select-none bg-[#fbf9f5] cursor-grab active:cursor-grabbing"
      style={{
        backgroundPosition: `${pan.x}px ${pan.y}px`,
        backgroundSize: `${32 * zoom}px ${32 * zoom}px`,
        backgroundImage: `radial-gradient(circle, #d6d3cb 1.3px, transparent 1.3px)`,
      }}
      data-testid="infinite-canvas"
    >
      {/* Infinite Transformed Layer */}
      <div
        className="absolute top-0 left-0 will-change-transform pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {items.length === 0 ? (
          /* Empty Canvas Invitation */
          <div
            className="absolute left-[300px] top-[200px] w-[500px] p-8 rounded-3xl bg-white/90 border border-stone-200 shadow-xl backdrop-blur-md text-center pointer-events-auto"
            data-no-pan="true"
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-xs mx-auto mb-4">
              <BookOpen className="w-8 h-8 opacity-80" />
            </div>
            <h3 className="text-xl font-bold text-stone-800 font-serif mb-2">
              Infinite Whiteboard Ready
            </h3>
            <p className="text-sm text-stone-500 font-sans leading-relaxed mb-5">
              आपका लाइव AI Tutor तैयार है। नीचे माइक चालू करें या टाइप करके कुछ भी पूछें — जैसे-जैसे टीचर समझाएंगे, बोर्ड पर विज़ुअल नोट्स, समीकरण और कोड लाइव पिन होते जाएंगे।
            </p>
            <div className="flex flex-wrap gap-2 justify-center text-xs text-stone-600 font-sans">
              <span className="px-3 py-1 bg-stone-100 rounded-full border border-stone-200">
                🖐️ कैनवास को कहीं भी ड्रैग (Pan) करें
              </span>
              <span className="px-3 py-1 bg-stone-100 rounded-full border border-stone-200">
                🔍 व्हील से ज़ूम इन/आउट करें
              </span>
              <span className="px-3 py-1 bg-stone-100 rounded-full border border-stone-200">
                🎯 Auto-Follow Teacher सक्रिय
              </span>
            </div>
          </div>
        ) : (
          /* Dynamic Spatial Cards */
          items.map((item, index) => {
            const pos = cardPositions[item.id] || {
              x: (index % 2) * 460 + 120,
              y: Math.floor(index / 2) * 340 + 120,
            };

            const notesList = Array.isArray(item.notes)
              ? item.notes
              : typeof item.notes === 'string'
              ? [item.notes]
              : [];

            return (
              <div
                key={item.id}
                data-no-pan="true"
                style={{
                  transform: `translate(${pos.x}px, ${pos.y}px)`,
                  width: '420px',
                }}
                className={`absolute top-0 left-0 bg-white border rounded-2xl p-5 shadow-lg pointer-events-auto transition-shadow duration-200 hover:shadow-xl font-sans ${
                  draggingCardId === item.id ? 'ring-2 ring-amber-500 shadow-2xl z-20' : 'border-stone-200/90 z-10'
                }`}
              >
                {/* Card Header & Drag Handle */}
                <div
                  onMouseDown={(e) => handleCardDragStart(e, item.id)}
                  className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100 cursor-move"
                  title="Drag to reposition card on infinite canvas"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <h3 className="text-base font-bold text-stone-900 font-serif tracking-tight truncate max-w-[280px]">
                      {item.topic || 'Important Concept'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 text-stone-400 hover:text-stone-600">
                    <Move className="w-3.5 h-3.5" />
                    {item.timestamp && (
                      <span className="text-[10px] text-stone-400 font-sans ml-1">
                        {item.timestamp}
                      </span>
                    )}
                  </div>
                </div>

                {/* Verified Student Answer / Progress */}
                {item.studentAnswer && (
                  <div className="mb-3 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{item.studentAnswer}</span>
                  </div>
                )}

                {/* Math / Scientific Formula Display */}
                {item.formula && (
                  <div className="mb-3 px-4 py-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-center">
                    <div className="text-xs uppercase tracking-wider text-amber-700 font-bold mb-1 flex items-center justify-center gap-1">
                      <Calculator className="w-3 h-3" /> Formula / Equation
                    </div>
                    <div className="text-base md:text-lg font-serif font-bold text-stone-900 tracking-wide">
                      {item.formula}
                    </div>
                  </div>
                )}

                {/* Bullet Points / Explanation */}
                {notesList.length > 0 && (
                  <ul className="space-y-2 my-2">
                    {notesList.map((note, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-stone-700 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                        <span className="flex-1">{note}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Code Snippet Box */}
                {item.code && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-stone-800 bg-stone-950 text-stone-100 font-mono text-xs">
                    <div className="px-3 py-1 bg-stone-900 border-b border-stone-800 flex items-center justify-between text-[10px] text-stone-400">
                      <span className="flex items-center gap-1">
                        <Code2 className="w-3 h-3 text-amber-400" /> Code Snippet
                      </span>
                    </div>
                    <pre className="p-3 overflow-x-auto leading-relaxed text-[11px]">
                      <code>{item.code}</code>
                    </pre>
                  </div>
                )}

                {/* Socratic Question / Teacher Prompt */}
                {item.question && (
                  <div className="mt-3 px-3.5 py-2 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start gap-2 text-xs text-indigo-900">
                    <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-[10px] uppercase tracking-wider text-indigo-600">Teacher's Question:</span>
                      <span className="font-medium">{item.question}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Floating Canvas Controls Toolbar */}
      <div
        data-no-pan="true"
        className="absolute top-5 right-5 z-30 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-2 rounded-2xl border border-stone-200 shadow-xl font-sans text-xs text-stone-700 pointer-events-auto"
      >
        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Zoom Percentage */}
        <span className="text-[11px] font-semibold text-stone-500 w-10 text-center select-none">
          {Math.round(zoom * 100)}%
        </span>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-stone-200 mx-0.5" />

        {/* Fit All / Overview */}
        <button
          onClick={handleFitAll}
          className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
          title="Fit All Notes"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Reset 100% */}
        <button
          onClick={handleResetView}
          className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
          title="Reset View (100%)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-stone-200 mx-0.5" />

        {/* Follow Teacher Toggle */}
        <button
          onClick={() => setFollowTeacher((f) => !f)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-medium transition-all cursor-pointer ${
            followTeacher
              ? 'bg-amber-50 text-amber-700 border border-amber-200 font-semibold shadow-xs'
              : 'hover:bg-stone-100 text-stone-500'
          }`}
          title={followTeacher ? 'Follow Teacher: ON (Auto-centers on new notes)' : 'Follow Teacher: OFF'}
        >
          {followTeacher ? <Eye className="w-3.5 h-3.5 text-amber-600" /> : <EyeOff className="w-3.5 h-3.5 text-stone-400" />}
          <span className="text-[11px] hidden sm:inline">Follow</span>
        </button>

        {items.length > 0 && onClearBoard && (
          <>
            <div className="h-4 w-px bg-stone-200 mx-0.5" />
            <button
              onClick={onClearBoard}
              className="p-1.5 rounded-xl hover:bg-rose-50 text-stone-500 hover:text-rose-600 transition-colors cursor-pointer"
              title="Clear Whiteboard"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
