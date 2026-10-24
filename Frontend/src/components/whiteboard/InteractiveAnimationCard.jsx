import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play, Pause, RotateCcw, Maximize2, Minimize2, Download,
  Copy, Check, Sparkles, Activity, Sliders, RefreshCw, Zap
} from 'lucide-react';
import DOMPurify from 'dompurify';

/**
 * Normalizes and resolves simulation preset type based on user request keywords & topic
 */
function resolveSimulationType(rawType, topic = '', caption = '') {
  const text = `${rawType || ''} ${topic || ''} ${caption || ''}`.toLowerCase();
  if (text.includes('wave') || text.includes('sound') || text.includes('frequency') || text.includes('amplitude') || text.includes('dhwani')) {
    return 'wave';
  }
  if (text.includes('circle') || text.includes('trig') || text.includes('unit circle') || text.includes('sine') || text.includes('cosine') || text.includes('cos') || text.includes('sin')) {
    return 'trig_circle';
  }
  if (text.includes('pendulum') || text.includes('lola') || text.includes('oscillation') || text.includes('string')) {
    return 'pendulum';
  }
  if (text.includes('projectile') || text.includes('parabola') || text.includes('trajectory') || text.includes('cannon') || text.includes('gravity')) {
    return 'projectile';
  }
  return rawType || 'wave'; // sensible educational default instead of projectile!
}

/**
 * Built-in high-fidelity animated SVG templates for common Physics topics
 */
function getEnhancedPhysicsSvg(topic = '', rawSvg = '') {
  const t = topic.toLowerCase();
  const isPrism = t.includes('prism') || t.includes('dispersion') || t.includes('refraction');
  const isCircuit = t.includes('circuit') || t.includes('electron') || t.includes('resistor') || t.includes('current');

  if (isPrism) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" width="100%" height="auto">
      <defs>
        <linearGradient id="prismGlass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.25"/>
          <stop offset="50%" stop-color="#0284c7" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="#bae6fd" stop-opacity="0.3"/>
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <style>
        @keyframes beamFlow {
          from { stroke-dashoffset: 40; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes photonMove {
          0% { offset-distance: 0%; opacity: 0; }
          20% { opacity: 1; }
          90% { opacity: 1; }
          100% { offset-distance: 100%; opacity: 0; }
        }
        .light-beam {
          stroke-dasharray: 6 3;
          animation: beamFlow 0.8s linear infinite;
        }
        .spectral-beam {
          stroke-dasharray: 8 4;
          animation: beamFlow 1.1s linear infinite;
        }
      </style>
      <rect width="100%" height="100%" fill="#0a0f1d" rx="12"/>
      
      <!-- Prism Glass Body -->
      <polygon points="300,50 160,290 440,290" fill="url(#prismGlass)" stroke="#38bdf8" stroke-width="2.5" stroke-linejoin="round"/>
      <polygon points="300,50 170,285 430,285" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>

      <!-- Incident White Light Ray -->
      <line x1="40" y1="210" x2="210" y2="200" stroke="#ffffff" stroke-width="3.5" class="light-beam" filter="url(#glow)"/>
      <text x="70" y="195" fill="#f8fafc" font-size="12" font-family="sans-serif" font-weight="bold">White Light Beam</text>

      <!-- Internal Refraction Dispersing Rays -->
      <line x1="210" y1="200" x2="350" y2="185" stroke="#ef4444" stroke-width="2.5" stroke-opacity="0.8"/>
      <line x1="210" y1="200" x2="355" y2="195" stroke="#eab308" stroke-width="2" stroke-opacity="0.8"/>
      <line x1="210" y1="200" x2="360" y2="205" stroke="#22c55e" stroke-width="2" stroke-opacity="0.8"/>
      <line x1="210" y1="200" x2="365" y2="215" stroke="#3b82f6" stroke-width="2" stroke-opacity="0.8"/>
      <line x1="210" y1="200" x2="370" y2="225" stroke="#a855f7" stroke-width="2.5" stroke-opacity="0.8"/>

      <!-- Exiting Dispersed Rainbow Spectrum -->
      <line x1="350" y1="185" x2="560" y2="140" stroke="#ef4444" stroke-width="3" class="spectral-beam" filter="url(#glow)"/>
      <text x="565" y="145" fill="#ef4444" font-size="11" font-family="sans-serif" font-weight="bold">Red (Least bent)</text>

      <line x1="355" y1="195" x2="560" y2="175" stroke="#f97316" stroke-width="2.5" class="spectral-beam"/>
      <text x="565" y="180" fill="#f97316" font-size="10" font-family="sans-serif">Orange</text>

      <line x1="358" y1="200" x2="560" y2="205" stroke="#eab308" stroke-width="2.5" class="spectral-beam"/>
      <text x="565" y="210" fill="#eab308" font-size="10" font-family="sans-serif">Yellow</text>

      <line x1="360" y1="205" x2="560" y2="235" stroke="#22c55e" stroke-width="2.5" class="spectral-beam"/>
      <text x="565" y="240" fill="#22c55e" font-size="10" font-family="sans-serif">Green</text>

      <line x1="365" y1="215" x2="560" y2="265" stroke="#3b82f6" stroke-width="2.5" class="spectral-beam"/>
      <text x="565" y="270" fill="#3b82f6" font-size="10" font-family="sans-serif">Blue</text>

      <line x1="370" y1="225" x2="560" y2="295" stroke="#a855f7" stroke-width="3" class="spectral-beam" filter="url(#glow)"/>
      <text x="565" y="300" fill="#a855f7" font-size="11" font-family="sans-serif" font-weight="bold">Violet (Most bent)</text>

      <!-- Glass Prism Label -->
      <text x="300" y="325" fill="#94a3b8" font-size="12" font-family="sans-serif" text-anchor="middle">Dense Optical Medium (Glass Prism n ≈ 1.5)</text>
    </svg>`;
  }

  if (isCircuit) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" width="100%" height="auto">
      <defs>
        <filter id="glowCirc">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <style>
        @keyframes electronLoop {
          from { stroke-dashoffset: 120; }
          to { stroke-dashoffset: 0; }
        }
        .wire-path {
          stroke: #334155;
          stroke-width: 6;
          fill: none;
        }
        .electron-flow {
          stroke: #38bdf8;
          stroke-width: 3.5;
          stroke-dasharray: 8 16;
          fill: none;
          animation: electronLoop 1.5s linear infinite;
        }
      </style>
      <rect width="100%" height="100%" fill="#0a0f1d" rx="12"/>

      <!-- Wire Circuit Loop -->
      <rect x="80" y="60" width="440" height="240" rx="16" class="wire-path"/>
      <rect x="80" y="60" width="440" height="240" rx="16" class="electron-flow" filter="url(#glowCirc)"/>

      <!-- Battery Voltage Source (Left) -->
      <g transform="translate(80, 180)">
        <rect x="-18" y="-30" width="36" height="60" fill="#0a0f1d"/>
        <line x1="-15" y1="-22" x2="15" y2="-22" stroke="#ef4444" stroke-width="4"/>
        <line x1="-8" y1="-6" x2="8" y2="-6" stroke="#64748b" stroke-width="2.5"/>
        <line x1="-15" y1="10" x2="15" y2="10" stroke="#ef4444" stroke-width="4"/>
        <line x1="-8" y1="24" x2="8" y2="24" stroke="#64748b" stroke-width="2.5"/>
        <text x="-40" y="-12" fill="#ef4444" font-size="14" font-weight="bold">+</text>
        <text x="-40" y="24" fill="#38bdf8" font-size="16" font-weight="bold">-</text>
        <text x="-70" y="5" fill="#f8fafc" font-size="12" font-weight="bold">Battery V</text>
      </g>

      <!-- Resistor (Right) -->
      <g transform="translate(520, 180)">
        <rect x="-16" y="-45" width="32" height="90" fill="#0a0f1d"/>
        <polyline points="0,-45 10,-35 -10,-20 10,-5 -10,10 10,25 0,35 0,45" fill="none" stroke="#f59e0b" stroke-width="4" stroke-linejoin="round"/>
        <text x="25" y="5" fill="#f59e0b" font-size="13" font-weight="bold">Resistor R</text>
      </g>

      <!-- Current & Electron Labels -->
      <text x="300" y="45" fill="#f8fafc" font-size="13" font-family="sans-serif" font-weight="bold" text-anchor="middle">Conventional Current I (Clockwise) →</text>
      <text x="300" y="325" fill="#38bdf8" font-size="13" font-family="sans-serif" font-weight="bold" text-anchor="middle">← Electron Drift Velocity (Counter-Clockwise)</text>
    </svg>`;
  }

  return rawSvg;
}

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

  // Resolved simulation preset type
  const resolvedSimType = resolveSimulationType(item.simType, item.topic, item.caption);

  // Media loading & proxy fallback for Archive Animations
  const [mediaSrc, setMediaSrc] = useState(item.animationUrl);
  const [mediaLoadError, setMediaLoadError] = useState(false);

  useEffect(() => {
    setMediaSrc(item.animationUrl);
    setMediaLoadError(false);
  }, [item.animationUrl]);

  const handleMediaError = () => {
    if (item.animationUrl && !mediaSrc?.includes('proxy-media')) {
      const backendUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) || 'http://localhost:3001';
      setMediaSrc(`${backendUrl}/api/tools/proxy-media?url=${encodeURIComponent(item.animationUrl)}`);
    } else {
      setMediaLoadError(true);
    }
  };

  // Simulation parameters state
  const [simParams, setSimParams] = useState(() => {
    const defaultParams = {
      velocity: 28,
      angle: 45,
      gravity: 9.8,
      length: 120,
      frequency: 2.0,
      amplitude: 32,
      angleDeg: 45,
    };
    return { ...defaultParams, ...(item.parameters || {}) };
  });

  // Canvas refs for inline and modal fullscreen rendering
  const canvasRef = useRef(null);
  const modalCanvasRef = useRef(null);
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

  // Enhanced SVG sanitization with DOMPurify
  const sanitizedSvg = useMemo(() => {
    const effectiveSvg = getEnhancedPhysicsSvg(item.topic || '', item.svgCode || '');
    if (!effectiveSvg) return '';
    try {
      return DOMPurify.sanitize(effectiveSvg, {
        USE_PROFILES: { svg: true, svgFilters: true },
        ADD_TAGS: ['style', 'animate', 'animateTransform', 'animateMotion', 'polygon', 'polyline', 'feGaussianBlur', 'feMerge', 'feMergeNode'],
        ADD_ATTR: ['keyTimes', 'values', 'dur', 'repeatCount', 'calcMode', 'from', 'to', 'filter', 'stdDeviation', 'result', 'in'],
      });
    } catch {
      return effectiveSvg;
    }
  }, [item.svgCode, item.topic]);

  // -------------------------------------------------------------
  // Mode B: Interactive Canvas Simulation Engine
  // -------------------------------------------------------------
  useEffect(() => {
    if (animationType !== 'simulation' && animationType !== 'interactive_sim') return;

    const simType = resolvedSimType;

    const drawFrameOnCanvas = (canvas, t) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
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

      if (simType === 'pendulum') {
        const originX = width / 2;
        const originY = 40;
        const L = (simParams.length / 120) * (height * 0.45);
        const g = simParams.gravity;
        const omega = Math.sqrt(g / (L / 10));
        const theta0 = 0.6;
        const theta = theta0 * Math.cos(omega * t);

        const bobX = originX + L * Math.sin(theta);
        const bobY = originY + L * Math.cos(theta);

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(originX, originY); ctx.lineTo(bobX, bobY); ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath(); ctx.arc(originX, originY, 4, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#0284c7'; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.arc(bobX, bobY, 14, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#cbd5e1'; ctx.font = '12px monospace';
        ctx.fillText(`Period T = ${(2 * Math.PI / omega).toFixed(2)}s | Gravity g = ${g} m/s²`, 16, height - 16);
      } else if (simType === 'wave') {
        const f = simParams.frequency || 2.0;
        const A = simParams.amplitude || 32;
        const cy = height / 2;

        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#9333ea'; ctx.shadowBlur = 12;
        ctx.beginPath();
        for (let x = 0; x < width; x += 2) {
          const y = cy + A * Math.sin((x * 0.02) - (t * f * 2.2));
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#cbd5e1'; ctx.font = '12px monospace';
        const lambda = (200 / f).toFixed(0);
        ctx.fillText(`Frequency f = ${f.toFixed(1)} Hz | Amplitude A = ${A}px | Wavelength λ ≈ ${lambda}px`, 16, height - 16);
      } else if (simType === 'trig_circle') {
        const cx = width * 0.35, cy = height / 2, r = Math.min(height * 0.35, 75);
        const angle = isPlaying ? (t * 1.2) : ((simParams.angleDeg * Math.PI) / 180);

        ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.moveTo(cx - r - 25, cy); ctx.lineTo(cx + r + 25, cy);
        ctx.moveTo(cx, cy - r - 25); ctx.lineTo(cx, cy + r + 25);
        ctx.stroke();

        const px = cx + r * Math.cos(angle);
        const py = cy - r * Math.sin(angle);

        ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, cy); ctx.stroke();

        ctx.strokeStyle = '#f43f5e'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(px, cy); ctx.lineTo(px, py); ctx.stroke();

        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();

        const curDeg = Math.round(((angle % (Math.PI * 2)) * 180) / Math.PI + 360) % 360;
        ctx.fillStyle = '#38bdf8'; ctx.font = '12px monospace';
        ctx.fillText(`cos(θ) = ${Math.cos(angle).toFixed(2)}`, width * 0.65, cy - 20);
        ctx.fillStyle = '#f43f5e';
        ctx.fillText(`sin(θ) = ${Math.sin(angle).toFixed(2)}`, width * 0.65, cy + 5);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`Angle θ = ${curDeg}°`, width * 0.65, cy + 30);
      } else {
        // Projectile Motion Simulator
        const v = simParams.velocity;
        const deg = simParams.angle;
        const rad = (deg * Math.PI) / 180;
        const g = simParams.gravity;

        const vx = v * Math.cos(rad);
        const vy = v * Math.sin(rad);
        const totalTime = (2 * vy) / g;

        const scale = width / 95;
        const originX = 35;
        const originY = height - 35;

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)'; ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        for (let s = 0; s <= totalTime; s += 0.05) {
          const px = originX + (vx * s) * scale;
          const py = originY - (vy * s - 0.5 * g * s * s) * scale;
          if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = '#475569'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(15, originY); ctx.lineTo(width - 15, originY); ctx.stroke();

        const curT = t % (totalTime + 0.8);
        if (curT <= totalTime) {
          const curX = originX + (vx * curT) * scale;
          const curY = originY - (vy * curT - 0.5 * g * curT * curT) * scale;

          ctx.fillStyle = '#f59e0b';
          ctx.shadowColor = '#d97706'; ctx.shadowBlur = 14;
          ctx.beginPath(); ctx.arc(curX, curY, 7, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = '#cbd5e1'; ctx.font = '11px monospace';
        const maxHeight = ((vy * vy) / (2 * g)).toFixed(1);
        const maxRange = ((v * v * Math.sin(2 * rad)) / g).toFixed(1);
        ctx.fillText(`v = ${v} m/s | θ = ${deg}° | H_max = ${maxHeight}m | Range = ${maxRange}m`, 16, 25);
      }
    };

    const renderLoop = () => {
      if (isPlaying) {
        simProgressRef.current += 0.016;
      }
      const t = simProgressRef.current;
      drawFrameOnCanvas(canvasRef.current, t);
      if (isExpanded) {
        drawFrameOnCanvas(modalCanvasRef.current, t);
      }
      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [animationType, isPlaying, resolvedSimType, simParams, isExpanded]);

  // -------------------------------------------------------------
  // Mode C: 3Blue1Brown Mathematical Vector Canvas Renderer
  // -------------------------------------------------------------
  useEffect(() => {
    if (animationType !== 'manim_video') return;
    if (item.videoUrl) return;

    const drawManimOnCanvas = (canvas, progress) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = '#0c1021';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; ctx.lineWidth = 1;
      for (let x = 40; x < width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 30; y < height; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      try {
        if (item.sceneCode) {
          const runFn = new Function('ctx', 'progress', 'width', 'height', item.sceneCode);
          runFn(ctx, progress, width, height);
        } else {
          // Default Pythagoras proof geometric transformation
          const x0 = width * 0.32, y0 = height * 0.72, a = width * 0.22, b = width * 0.16;
          ctx.strokeStyle = '#58C4DD'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + a, y0); ctx.lineTo(x0, y0 - b); ctx.closePath(); ctx.stroke();

          ctx.fillStyle = 'rgba(88, 196, 221, 0.25)'; ctx.fillRect(x0, y0, a, a); ctx.strokeRect(x0, y0, a, a);
          ctx.fillStyle = 'rgba(248, 198, 48, 0.25)'; ctx.fillRect(x0 - b, y0 - b, b, b); ctx.strokeRect(x0 - b, y0 - b, b, b);

          ctx.fillStyle = '#ffffff'; ctx.font = '14px serif';
          ctx.fillText('a²', x0 + a/2 - 8, y0 + a/2 + 5);
          ctx.fillText('b²', x0 - b/2 - 8, y0 - b/2 + 5);
          ctx.fillStyle = '#58C4DD';
          ctx.fillText('a² + b² = c²', x0 + a + 15, y0 - 25);
        }
      } catch (e) {
        console.warn('[InteractiveAnimationCard] Error rendering vector scene:', e);
      }
    };

    const renderManimLoop = () => {
      if (isPlaying) {
        simProgressRef.current = (simProgressRef.current + 0.008) % 1;
      }
      const p = simProgressRef.current;
      drawManimOnCanvas(canvasRef.current, p);
      if (isExpanded) {
        drawManimOnCanvas(modalCanvasRef.current, p);
      }
      animFrameRef.current = requestAnimationFrame(renderManimLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderManimLoop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [animationType, isPlaying, item.videoUrl, item.sceneCode, isExpanded]);

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
                ? `Playable Simulation: ${resolvedSimType.toUpperCase()}`
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
              {resolvedSimType === 'projectile' && (
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

              {resolvedSimType === 'wave' && (
                <>
                  <label className="flex items-center gap-1.5 font-medium text-stone-700">
                    <span>Freq: {simParams.frequency.toFixed(1)} Hz</span>
                    <input
                      type="range"
                      min={0.5}
                      max={5.0}
                      step={0.5}
                      value={simParams.frequency}
                      onChange={(e) => setSimParams((p) => ({ ...p, frequency: Number(e.target.value) }))}
                      className="w-22 accent-indigo-600 cursor-pointer"
                      data-testid="slider-frequency"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 font-medium text-stone-700">
                    <span>Amp: {simParams.amplitude}px</span>
                    <input
                      type="range"
                      min={10}
                      max={55}
                      step={1}
                      value={simParams.amplitude}
                      onChange={(e) => setSimParams((p) => ({ ...p, amplitude: Number(e.target.value) }))}
                      className="w-22 accent-indigo-600 cursor-pointer"
                      data-testid="slider-amplitude"
                    />
                  </label>
                </>
              )}

              {resolvedSimType === 'trig_circle' && (
                <>
                  <label className="flex items-center gap-1.5 font-medium text-stone-700">
                    <span>Angle θ: {simParams.angleDeg || 45}°</span>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={5}
                      value={simParams.angleDeg || 45}
                      onChange={(e) => {
                        const deg = Number(e.target.value);
                        setSimParams((p) => ({ ...p, angleDeg: deg }));
                        simProgressRef.current = (deg * Math.PI) / 180 / 1.2;
                      }}
                      className="w-24 accent-indigo-600 cursor-pointer"
                      data-testid="slider-trig-angle"
                    />
                  </label>
                  <span className="text-[11px] font-mono text-stone-600">
                    cos={Math.cos(((simParams.angleDeg || 45) * Math.PI) / 180).toFixed(2)} | sin={Math.sin(((simParams.angleDeg || 45) * Math.PI) / 180).toFixed(2)}
                  </span>
                </>
              )}

              {resolvedSimType === 'pendulum' && (
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
        {animationType === 'archive_animation' && mediaSrc && !mediaLoadError && (
          <div className="w-full max-h-[260px] flex items-center justify-center bg-stone-900 overflow-hidden">
            {item.isVideo ? (
              <video
                src={mediaSrc}
                autoPlay={isPlaying}
                loop
                muted
                playsInline
                crossOrigin="anonymous"
                className="w-full max-h-[260px] object-contain"
                onError={handleMediaError}
                data-testid="archive-video-element"
              />
            ) : (
              <img
                src={mediaSrc}
                alt={item.topic || 'Animation'}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                className="w-full max-h-[260px] object-contain"
                onError={handleMediaError}
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
                  <video src={mediaSrc} autoPlay loop muted playsInline crossOrigin="anonymous" className="max-h-[65vh] object-contain rounded-lg" />
                ) : (
                  <img src={mediaSrc} alt={item.topic} referrerPolicy="no-referrer" crossOrigin="anonymous" className="max-h-[65vh] object-contain rounded-lg" />
                )
              )}
              {(animationType === 'simulation' || animationType === 'interactive_sim' || animationType === 'manim_video') && (
                <canvas
                  ref={modalCanvasRef}
                  width={760}
                  height={420}
                  className="w-full max-h-[65vh] bg-slate-950 rounded-xl block"
                  data-testid="modal-simulation-canvas"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
