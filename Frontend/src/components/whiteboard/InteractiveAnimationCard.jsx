import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Play, Pause, RotateCcw, Maximize2, Minimize2, Download,
  Copy, Check, Sparkles, Activity, Compass, Sliders, Eye, RefreshCw, Zap
} from 'lucide-react';
import DOMPurify from 'dompurify';

/**
 * InteractiveAnimationCard
 * Unified visual animation suite supporting:
 * 1. Animated SVG (Mode A): Instant vector animations with CSS keyframes / SMIL loops.
 * 2. Interactive Simulation (Mode B): Real-time interactive HTML5 Canvas experiments with sliders.
 * 3. Manim Mathematical Video (Mode C): 3Blue1Brown-aesthetic mathematical transformations.
 * 4. Educational Archive Animation (Mode D): Authentic biological & mechanical loops (.gif, .webm, .mp4).
 */
export function InteractiveAnimationCard({ item = {}, onOpenInCodeLab }) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [restartKey, setRestartKey] = useState(0);

  // Simulation parameters state
  const [simParams, setSimParams] = useState(() => {
    const defaultParams = {
      velocity: 28,
      angle: 45,
      gravity: 9.8,
      length: 120,
      frequency: 2,
      amplitude: 35,
    };
    return { ...defaultParams, ...(item.parameters || {}) };
  });

  // Canvas ref for simulations and Manim vector scenes
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const simProgressRef = useRef(0);

  const animationType = item.animationType || (item.svgCode ? 'animated_svg' : item.animationUrl ? 'archive_animation' : 'simulation');

  // Handle ESC key for fullscreen modal
  useEffect(() => {
    if (!isExpanded) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // Clean SVG sanitization with DOMPurify
  const sanitizedSvg = useMemo(() => {
    if (!item.svgCode) return '';
    try {
      return DOMPurify.sanitize(item.svgCode, {
        USE_PROFILES: { svg: true, svgFilters: true },
        ADD_TAGS: ['style', 'animate', 'animateTransform', 'animateMotion'],
        ADD_ATTR: ['keyTimes', 'values', 'dur', 'repeatCount', 'calcMode', 'from', 'to'],
      });
    } catch {
      return item.svgCode;
    }
  }, [item.svgCode]);

  // -------------------------------------------------------------
  // Mode B: Interactive Canvas Simulation Engine
  // -------------------------------------------------------------
  useEffect(() => {
    if (animationType !== 'simulation' && animationType !== 'interactive_sim') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let startTime = performance.now();

    const simType = (item.simType || 'projectile').toLowerCase();

    const renderFrame = (now) => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Dark futuristic lab background
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, width, height);

      // Subtle coordinate grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y < height; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      if (isPlaying) {
        simProgressRef.current += 0.016;
      }
      const t = simProgressRef.current;

      if (simType === 'pendulum') {
        // Simple Harmonic Pendulum
        const originX = width / 2;
        const originY = 40;
        const L = simParams.length;
        const g = simParams.gravity;
        const omega = Math.sqrt(g / (L / 10));
        const theta0 = 0.6; // initial angle in radians (~35 deg)
        const theta = theta0 * Math.cos(omega * t);

        const bobX = originX + L * Math.sin(theta);
        const bobY = originY + L * Math.cos(theta);

        // String
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(bobX, bobY);
        ctx.stroke();

        // Pivot
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath(); ctx.arc(originX, originY, 4, 0, Math.PI * 2); ctx.fill();

        // Bob
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(bobX, bobY, 14, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // Info HUD
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '12px monospace';
        ctx.fillText(`Period T = ${(2 * Math.PI / omega).toFixed(2)}s | g = ${g} m/s²`, 16, height - 16);
      } else if (simType === 'wave') {
        // Harmonic Wave Simulation
        const f = simParams.frequency;
        const A = simParams.amplitude;
        const cy = height / 2;

        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#9333ea';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        for (let x = 0; x < width; x += 2) {
          const y = cy + A * Math.sin((x * 0.02) - (t * f * 2));
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '12px monospace';
        ctx.fillText(`Frequency: ${f} Hz | Amplitude: ${A}px`, 16, height - 16);
      } else if (simType === 'trig_circle') {
        // Trigonometric Unit Circle
        const cx = 140, cy = height / 2, r = 70;
        const angle = t * 1.2;

        // Circle
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

        // Axes
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.moveTo(cx - r - 20, cy); ctx.lineTo(cx + r + 20, cy);
        ctx.moveTo(cx, cy - r - 20); ctx.lineTo(cx, cy + r + 20);
        ctx.stroke();

        const px = cx + r * Math.cos(angle);
        const py = cy - r * Math.sin(angle);

        // Cosine (horizontal) & Sine (vertical) projections
        ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2.5; // Cosine
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, cy); ctx.stroke();

        ctx.strokeStyle = '#f43f5e'; ctx.lineWidth = 2.5; // Sine
        ctx.beginPath(); ctx.moveTo(px, cy); ctx.lineTo(px, py); ctx.stroke();

        // Radius
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();

        // Angle text
        ctx.fillStyle = '#38bdf8'; ctx.font = '11px monospace';
        ctx.fillText(`cos(θ) = ${Math.cos(angle).toFixed(2)}`, 240, cy - 15);
        ctx.fillStyle = '#f43f5e';
        ctx.fillText(`sin(θ) = ${Math.sin(angle).toFixed(2)}`, 240, cy + 10);
      } else {
        // Projectile Motion Simulator (Default)
        const v = simParams.velocity;
        const deg = simParams.angle;
        const rad = (deg * Math.PI) / 180;
        const g = simParams.gravity;

        const vx = v * Math.cos(rad);
        const vy = v * Math.sin(rad);
        const totalTime = (2 * vy) / g;

        const scale = 5;
        const originX = 40;
        const originY = height - 40;

        // Draw parabolic path
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        for (let s = 0; s <= totalTime; s += 0.05) {
          const px = originX + (vx * s) * scale;
          const py = originY - (vy * s - 0.5 * g * s * s) * scale;
          if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Ground line
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(20, originY); ctx.lineTo(width - 20, originY); ctx.stroke();

        // Projectile current position
        const curT = t % (totalTime + 0.8);
        if (curT <= totalTime) {
          const curX = originX + (vx * curT) * scale;
          const curY = originY - (vy * curT - 0.5 * g * curT * curT) * scale;

          ctx.fillStyle = '#f59e0b';
          ctx.shadowColor = '#d97706';
          ctx.shadowBlur = 14;
          ctx.beginPath(); ctx.arc(curX, curY, 7, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11px monospace';
        const maxHeight = ((vy * vy) / (2 * g)).toFixed(1);
        const maxRange = ((v * v * Math.sin(2 * rad)) / g).toFixed(1);
        ctx.fillText(`v = ${v} m/s | θ = ${deg}° | H_max = ${maxHeight}m | Range = ${maxRange}m`, 16, 25);
      }

      animFrameRef.current = requestAnimationFrame(renderFrame);
    };

    animFrameRef.current = requestAnimationFrame(renderFrame);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [animationType, isPlaying, item.simType, simParams]);

  // -------------------------------------------------------------
  // Mode C: 3Blue1Brown Mathematical Vector Canvas Renderer
  // -------------------------------------------------------------
  useEffect(() => {
    if (animationType !== 'manim_video') return;
    if (item.videoUrl) return; // Native MP4 video uses HTML5 video element

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const renderManimFrame = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Signature 3Blue1Brown dark midnight background
      ctx.fillStyle = '#0c1021';
      ctx.fillRect(0, 0, width, height);

      // Coordinate axes & subtle grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let x = 40; x < width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 30; y < height; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      if (isPlaying) {
        simProgressRef.current = (simProgressRef.current + 0.008) % 1;
      }
      const progress = simProgressRef.current;

      // Execute mathematical scene code or default derivative curve
      try {
        if (item.sceneCode) {
          const runFn = new Function('ctx', 'progress', 'width', 'height', item.sceneCode);
          runFn(ctx, progress, width, height);
        } else {
          // Default Pythagoras proof geometric transformation
          const x0 = 160, y0 = 220, a = 100, b = 75;
          ctx.strokeStyle = '#58C4DD'; ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(x0, y0); ctx.lineTo(x0 + a, y0); ctx.lineTo(x0, y0 - b);
          ctx.closePath(); ctx.stroke();

          ctx.fillStyle = 'rgba(88, 196, 221, 0.25)';
          ctx.fillRect(x0, y0, a, a); ctx.strokeRect(x0, y0, a, a);

          ctx.fillStyle = 'rgba(248, 198, 48, 0.25)';
          ctx.fillRect(x0 - b, y0 - b, b, b); ctx.strokeRect(x0 - b, y0 - b, b, b);

          ctx.fillStyle = '#ffffff'; ctx.font = '14px serif';
          ctx.fillText('a²', x0 + a/2 - 8, y0 + a/2 + 5);
          ctx.fillText('b²', x0 - b/2 - 8, y0 - b/2 + 5);
          ctx.fillStyle = '#58C4DD';
          ctx.fillText('a² + b² = c²', x0 + a + 20, y0 - 30);
        }
      } catch (e) {
        console.warn('[InteractiveAnimationCard] Error rendering vector scene:', e);
      }

      animFrameRef.current = requestAnimationFrame(renderManimFrame);
    };

    animFrameRef.current = requestAnimationFrame(renderManimFrame);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [animationType, isPlaying, item.videoUrl, item.sceneCode]);

  const handleCopySvg = () => {
    if (!item.svgCode) return;
    navigator.clipboard.writeText(item.svgCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (item.svgCode) {
      const blob = new Blob([item.svgCode], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(item.topic || 'animation').toLowerCase().replace(/\s+/g, '-')}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // -------------------------------------------------------------
  // Render Loading Skeleton for Async Manim Compilation
  // -------------------------------------------------------------
  if (item.isRendering) {
    return (
      <div className="my-3 rounded-2xl border border-indigo-500/30 bg-slate-950 p-4 shadow-md text-white font-sans max-w-lg mx-auto" data-testid="manim-loading-card">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 animate-spin">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Manim Mathematical Engine
            </div>
            <div className="text-sm font-bold text-slate-100">{item.topic || 'Mathematical Scene'}</div>
          </div>
        </div>
        <div className="h-44 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent animate-shimmer" />
          <Sparkles className="w-8 h-8 text-indigo-400/80 mb-2 animate-bounce" />
          <span className="text-xs font-mono text-slate-300">Rendering 3Blue1Brown Animation...</span>
          <span className="text-[11px] text-slate-500 mt-1">{item.equation || 'Compiling geometric transformations'}</span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Main Card Body
  // -------------------------------------------------------------
  return (
    <div
      key={restartKey}
      className="my-3 rounded-2xl border border-stone-200/90 bg-stone-50/80 p-3.5 shadow-sm transition-all duration-200 font-sans w-full max-w-lg mx-auto overflow-hidden"
      data-testid="interactive-animation-card"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-200 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
            {animationType === 'simulation' || animationType === 'interactive_sim' ? (
              <Sliders className="w-3.5 h-3.5" />
            ) : animationType === 'manim_video' ? (
              <Zap className="w-3.5 h-3.5" />
            ) : (
              <Activity className="w-3.5 h-3.5" />
            )}
          </span>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              {animationType === 'simulation' || animationType === 'interactive_sim'
                ? 'Playable Simulation Lab'
                : animationType === 'manim_video'
                ? '3Blue1Brown Math Scene'
                : animationType === 'archive_animation'
                ? 'Educational Archive Loop'
                : 'Animated Vector Loop'}
            </div>
            <div className="text-xs font-bold text-stone-800 truncate" title={item.topic}>
              {item.topic || 'Animation Visualizer'}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause Animation' : 'Play Animation'}
            className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer"
            data-testid="anim-play-pause-btn"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              simProgressRef.current = 0;
              setRestartKey((k) => k + 1);
            }}
            title="Restart Animation"
            className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer"
            data-testid="anim-restart-btn"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {item.svgCode && (
            <>
              <button
                type="button"
                onClick={handleCopySvg}
                title="Copy SVG"
                className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer text-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                title="Download SVG"
                className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            title="Expand Fullscreen"
            className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer"
            data-testid="anim-expand-btn"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Visual Canvas / Player Container                               */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full rounded-xl overflow-hidden border border-stone-200 bg-white relative">
        {/* Mode A: Animated SVG */}
        {animationType === 'animated_svg' && sanitizedSvg && (
          <div
            className={`w-full p-2 flex items-center justify-center max-h-[260px] overflow-hidden [&>svg]:max-h-[240px] [&>svg]:w-auto [&>svg]:mx-auto ${
              !isPlaying ? '[&_*]:![animation-play-state:paused]' : '[&_*]:![animation-play-state:running]'
            }`}
            data-testid="animated-svg-container"
            dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
          />
        )}

        {/* Mode B: Playable HTML5 Canvas Simulation */}
        {(animationType === 'simulation' || animationType === 'interactive_sim') && (
          <div className="w-full flex flex-col">
            <canvas
              ref={canvasRef}
              width={480}
              height={260}
              className="w-full h-[220px] bg-slate-950 block"
              data-testid="interactive-simulation-canvas"
            />
            {/* Interactive Parameter Sliders */}
            <div className="p-2.5 bg-stone-100 border-t border-stone-200 flex flex-wrap gap-3 items-center justify-between text-xs">
              {item.simType === 'projectile' && (
                <>
                  <label className="flex items-center gap-1.5 font-medium text-stone-700">
                    <span>Angle: {simParams.angle}°</span>
                    <input
                      type="range"
                      min={15}
                      max={85}
                      value={simParams.angle}
                      onChange={(e) => setSimParams((p) => ({ ...p, angle: Number(e.target.value) }))}
                      className="w-20 accent-indigo-600 cursor-pointer"
                      data-testid="slider-angle"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 font-medium text-stone-700">
                    <span>Velocity: {simParams.velocity} m/s</span>
                    <input
                      type="range"
                      min={10}
                      max={50}
                      value={simParams.velocity}
                      onChange={(e) => setSimParams((p) => ({ ...p, velocity: Number(e.target.value) }))}
                      className="w-20 accent-indigo-600 cursor-pointer"
                      data-testid="slider-velocity"
                    />
                  </label>
                </>
              )}

              {item.simType === 'pendulum' && (
                <>
                  <label className="flex items-center gap-1.5 font-medium text-stone-700">
                    <span>Gravity: {simParams.gravity}</span>
                    <input
                      type="range"
                      min={1}
                      max={25}
                      step={0.5}
                      value={simParams.gravity}
                      onChange={(e) => setSimParams((p) => ({ ...p, gravity: Number(e.target.value) }))}
                      className="w-24 accent-indigo-600 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 font-medium text-stone-700">
                    <span>Length: {simParams.length}px</span>
                    <input
                      type="range"
                      min={60}
                      max={180}
                      value={simParams.length}
                      onChange={(e) => setSimParams((p) => ({ ...p, length: Number(e.target.value) }))}
                      className="w-24 accent-indigo-600 cursor-pointer"
                    />
                  </label>
                </>
              )}
            </div>
          </div>
        )}

        {/* Mode C: Manim Mathematical Video / 3Blue1Brown Canvas */}
        {animationType === 'manim_video' && (
          <div className="w-full flex flex-col bg-slate-950">
            {item.videoUrl ? (
              <video
                src={item.videoUrl}
                autoPlay={isPlaying}
                loop
                muted
                playsInline
                className="w-full max-h-[260px] object-contain"
                data-testid="manim-video-element"
              />
            ) : (
              <canvas
                ref={canvasRef}
                width={500}
                height={260}
                className="w-full h-[220px] bg-slate-950 block"
                data-testid="manim-vector-canvas"
              />
            )}
            {item.equation && (
              <div className="px-3 py-1.5 bg-slate-900 border-t border-slate-800 text-center font-mono text-xs text-amber-300">
                {item.equation}
              </div>
            )}
          </div>
        )}

        {/* Mode D: Archive Educational Animation Loop (GIF or Video) */}
        {animationType === 'archive_animation' && item.animationUrl && (
          <div className="w-full max-h-[260px] flex items-center justify-center bg-stone-900 overflow-hidden">
            {item.isVideo ? (
              <video
                src={item.animationUrl}
                autoPlay={isPlaying}
                loop
                muted
                playsInline
                className="w-full max-h-[260px] object-contain"
                data-testid="archive-video-element"
              />
            ) : (
              <img
                src={item.animationUrl}
                alt={item.topic || 'Animation'}
                className="w-full max-h-[260px] object-contain"
                data-testid="archive-gif-element"
              />
            )}
          </div>
        )}
      </div>

      {/* Caption & Attribution Footer */}
      {(item.caption || item.attribution) && (
        <div className="mt-2 text-xs text-stone-600 leading-relaxed text-center">
          {item.caption && <span className="italic">{item.caption}</span>}
          {item.attribution && (
            <span className="block text-[10px] text-stone-400 mt-0.5 font-medium">
              Source: {item.attribution}
            </span>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Fullscreen Modal Lightbox                                      */}
      {/* ------------------------------------------------------------- */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="relative max-w-4xl w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800 text-white mb-3">
              <span className="font-bold text-sm">{item.topic}</span>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full flex items-center justify-center min-h-[350px] max-h-[70vh]">
              {animationType === 'animated_svg' && (
                <div
                  className="w-full max-h-[60vh] [&>svg]:w-full [&>svg]:h-auto flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
                />
              )}
              {animationType === 'archive_animation' && (
                item.isVideo ? (
                  <video src={item.animationUrl} autoPlay loop muted playsInline className="max-h-[65vh] object-contain rounded-lg" />
                ) : (
                  <img src={item.animationUrl} alt={item.topic} className="max-h-[65vh] object-contain rounded-lg" />
                )
              )}
              {(animationType === 'simulation' || animationType === 'manim_video') && (
                <div className="text-center text-slate-400 text-sm py-12">
                  Simulation / Math Scene running at native 60 FPS in interactive canvas.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
