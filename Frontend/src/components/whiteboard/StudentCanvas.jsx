import React, { useRef, useState, useEffect } from 'react';
import { Pen, Eraser, Trash2, Send, Check } from 'lucide-react';

/**
 * Interactive Student Canvas (Student Scratchpad)
 * Allows the student to write formulas, calculations, or draw diagrams with mouse/touch/stylus,
 * and submit the visual working to Gemini Teacher for live analysis and grading.
 */
export function StudentCanvas({ onSendCanvasToTeacher }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen'); // 'pen' | 'eraser'
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const lastPointRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    // Set high-DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleStart = (e) => {
    e.preventDefault();
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    lastPointRef.current = coords;
  };

  const handleMove = (e) => {
    if (!isDrawing || !lastPointRef.current) return;
    e.preventDefault();
    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(coords.x, coords.y);

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 18;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#1c1917'; // Dark stone ink
      ctx.lineWidth = 2.5;
    }

    ctx.stroke();
    lastPointRef.current = coords;
    setHasDrawn(true);
    setIsSubmitted(false);
  };

  const handleEnd = () => {
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setIsSubmitted(false);
  };

  const handleSubmitToTeacher = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    // Create a temporary canvas with white background so transparency doesn't turn black in JPEG
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(canvas, 0, 0);

    const base64Data = tempCanvas.toDataURL('image/jpeg', 0.85).split(',')[1];
    if (onSendCanvasToTeacher) {
      onSendCanvasToTeacher(base64Data);
      setIsSubmitted(true);
      setTimeout(() => setIsSubmitted(false), 3000);
    }
  };

  return (
    <div className="my-4 rounded-2xl bg-white border border-stone-300 shadow-sm overflow-hidden font-sans max-w-xl mx-auto">
      {/* Student Canvas Toolbar */}
      <div className="px-4 py-2 bg-[#f6f3ed] border-b border-stone-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-stone-700">✏️ Student Scratchpad:</span>
          <button
            onClick={() => setTool('pen')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              tool === 'pen'
                ? 'bg-amber-100 text-amber-900 font-semibold'
                : 'text-stone-500 hover:bg-stone-200/60'
            }`}
            title="Pen Tool"
          >
            <Pen className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              tool === 'eraser'
                ? 'bg-amber-100 text-amber-900 font-semibold'
                : 'text-stone-500 hover:bg-stone-200/60'
            }`}
            title="Eraser Tool"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer ml-1"
            title="Clear Scratchpad"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Send to Teacher Button */}
        {hasDrawn && onSendCanvasToTeacher && (
          <button
            onClick={handleSubmitToTeacher}
            disabled={isSubmitted}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
              isSubmitted
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-900 hover:bg-stone-800 text-white shadow-xs'
            }`}
          >
            {isSubmitted ? (
              <>
                <Check className="w-3 h-3" />
                <span>Sent to Teacher!</span>
              </>
            ) : (
              <>
                <Send className="w-3 h-3" />
                <span>Ask Teacher to Check</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Drawing Canvas Area */}
      <div className="relative w-full h-44 bg-[#fbfaf8] cursor-crosshair touch-none">
        <canvas
          ref={canvasRef}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          className="w-full h-full block"
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-stone-400 select-none">
            Draw your steps, equations, or diagrams here with pen or mouse...
          </div>
        )}
      </div>
    </div>
  );
}
