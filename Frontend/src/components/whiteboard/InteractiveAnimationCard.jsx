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
  if (text.includes('sort') || text.includes('bubble') || text.includes('array') || text.includes('algorithm') || text.includes('search')) {
    return 'sorting';
  }
  if (text.includes('gas') || text.includes('molecule') || text.includes('kinetic') || text.includes('brownian') || text.includes('pressure') || text.includes('temperature') || text.includes('ideal gas')) {
    return 'gas_molecules';
  }
  if (text.includes('orbit') || text.includes('planet') || text.includes('solar') || text.includes('kepler') || text.includes('satellite')) {
    return 'gravity_orbit';
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
  const isAtom = t.includes('atom') || t.includes('bohr') || t.includes('orbital') || t.includes('nucleus');
  const isDna = t.includes('dna') || t.includes('helix') || t.includes('genetic') || t.includes('nucleotide');

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

  if (isAtom) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" width="100%" height="auto">
      <defs>
        <radialGradient id="nucleusGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#f59e0b" stop-opacity="1"/>
          <stop offset="60%" stop-color="#ea580c" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#0a0f1d" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <style>
        @keyframes orbitRotate1 { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes orbitRotate2 { from { transform: rotate(60deg); } to { transform: rotate(420deg); } }
        @keyframes orbitRotate3 { from { transform: rotate(-60deg); } to { transform: rotate(300deg); } }
        .orbit-group1 { transform-origin: 300px 180px; animation: orbitRotate1 4s linear infinite; }
        .orbit-group2 { transform-origin: 300px 180px; animation: orbitRotate2 5.5s linear infinite; }
        .orbit-group3 { transform-origin: 300px 180px; animation: orbitRotate3 4.8s linear infinite; }
      </style>
      <rect width="100%" height="100%" fill="#0a0f1d" rx="12"/>
      <text x="300" y="40" fill="#f8fafc" font-size="15" font-family="sans-serif" font-weight="bold" text-anchor="middle">Bohr Atomic Model • Quantum Electron Shells</text>
      
      <!-- Central Nucleus -->
      <circle cx="300" cy="180" r="38" fill="url(#nucleusGlow)"/>
      <circle cx="295" cy="175" r="9" fill="#ef4444"/>
      <circle cx="305" cy="178" r="9" fill="#3b82f6"/>
      <circle cx="298" cy="188" r="8.5" fill="#ef4444"/>
      <circle cx="308" cy="186" r="8.5" fill="#3b82f6"/>
      <text x="300" y="235" fill="#fbbf24" font-size="12" font-family="sans-serif" font-weight="bold" text-anchor="middle">Nucleus (p⁺ + n⁰)</text>

      <!-- Orbit 1 -->
      <g class="orbit-group1">
        <ellipse cx="300" cy="180" rx="190" ry="65" fill="none" stroke="rgba(56, 189, 248, 0.45)" stroke-width="1.8" stroke-dasharray="6 3"/>
        <circle cx="490" cy="180" r="7" fill="#38bdf8"/>
        <circle cx="110" cy="180" r="7" fill="#38bdf8"/>
      </g>

      <!-- Orbit 2 -->
      <g class="orbit-group2">
        <ellipse cx="300" cy="180" rx="190" ry="65" fill="none" stroke="rgba(168, 85, 247, 0.45)" stroke-width="1.8" stroke-dasharray="6 3"/>
        <circle cx="490" cy="180" r="7" fill="#c084fc"/>
        <circle cx="110" cy="180" r="7" fill="#c084fc"/>
      </g>

      <!-- Orbit 3 -->
      <g class="orbit-group3">
        <ellipse cx="300" cy="180" rx="190" ry="65" fill="none" stroke="rgba(34, 197, 94, 0.45)" stroke-width="1.8" stroke-dasharray="6 3"/>
        <circle cx="490" cy="180" r="7" fill="#4ade80"/>
        <circle cx="110" cy="180" r="7" fill="#4ade80"/>
      </g>

      <text x="300" y="335" fill="#94a3b8" font-size="12" font-family="sans-serif" text-anchor="middle">Electrons (e⁻) in quantized energy states</text>
    </svg>`;
  }

  if (isDna) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" width="100%" height="auto">
      <style>
        @keyframes dnaShift {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 80; }
        }
        .dna-strand1 { stroke: #38bdf8; stroke-dasharray: 8 4; animation: dnaShift 2s linear infinite; }
        .dna-strand2 { stroke: #ec4899; stroke-dasharray: 8 4; animation: dnaShift 2s linear infinite; }
      </style>
      <rect width="100%" height="100%" fill="#0a0f1d" rx="12"/>
      <text x="300" y="40" fill="#f8fafc" font-size="15" font-family="sans-serif" font-weight="bold" text-anchor="middle">DNA Double Helix Structure • Complementary Base Pairs</text>
      
      <!-- Base Pair Rungs -->
      <line x1="80" y1="180" x2="80" y2="180" stroke="#a855f7" stroke-width="3"/>
      <g transform="translate(60, 40)">
        <line x1="40" y1="110" x2="40" y2="170" stroke="#22c55e" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="80" y1="80" x2="80" y2="200" stroke="#eab308" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="120" y1="65" x2="120" y2="215" stroke="#ef4444" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="160" y1="75" x2="160" y2="205" stroke="#3b82f6" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="200" y1="105" x2="200" y2="175" stroke="#22c55e" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="240" y1="140" x2="240" y2="140" stroke="#eab308" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="280" y1="105" x2="280" y2="175" stroke="#ef4444" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="320" y1="75" x2="320" y2="205" stroke="#3b82f6" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="360" y1="65" x2="360" y2="215" stroke="#22c55e" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="400" y1="80" x2="400" y2="200" stroke="#eab308" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="440" y1="110" x2="440" y2="170" stroke="#ef4444" stroke-width="3.5" stroke-linecap="round"/>
      </g>

      <!-- Helical Outer Sugar-Phosphate Strands -->
      <path d="M 60,180 Q 180,60 300,180 T 540,180" fill="none" stroke-width="4.5" class="dna-strand1"/>
      <path d="M 60,180 Q 180,300 300,180 T 540,180" fill="none" stroke-width="4.5" class="dna-strand2"/>

      <text x="300" y="335" fill="#cbd5e1" font-size="12" font-family="sans-serif" text-anchor="middle">Adenine (A) = Thymine (T) | Guanine (G) ≡ Cytosine (C)</text>
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
      temperature: 300,
      particleCount: 28,
      sortSpeed: 3,
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
    } catch (err) {
      console.warn('[InteractiveAnimationCard] DOMPurify sanitization failed:', err);
      return '';
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
      } else if (simType === 'gas_molecules') {
        // Chemistry: Kinetic Gas Theory & Brownian Motion
        ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2;
        ctx.strokeRect(20, 20, width - 40, height - 60);

        const temp = simParams.temperature || 300;
        const speed = (temp / 100) * 1.6;
        const count = Math.min(simParams.particleCount || 28, 50);

        for (let i = 0; i < count; i++) {
          const seed = i * 137.5;
          const vx = Math.cos(seed) * speed;
          const vy = Math.sin(seed) * speed;
          const rangeX = width - 70;
          const rangeY = height - 90;
          const px = 30 + Math.abs((((i * 45) + vx * t * 35) % (rangeX * 2)) - rangeX);
          const py = 30 + Math.abs((((i * 33) + vy * t * 35) % (rangeY * 2)) - rangeY);

          ctx.fillStyle = i % 3 === 0 ? '#38bdf8' : (i % 3 === 1 ? '#f43f5e' : '#fbbf24');
          ctx.beginPath();
          ctx.arc(px, py, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = '#cbd5e1'; ctx.font = '11px monospace';
        const pressure = ((count * 1.38 * temp) / 800).toFixed(1);
        ctx.fillText(`Ideal Gas: PV = NkT | Temp T = ${temp} K | Particles N = ${count} | Pressure P ≈ ${pressure} kPa`, 20, height - 16);
      } else if (simType === 'sorting') {
        // Computer Science: Sorting Algorithm Array Comparison & Swap
        const totalBars = 16;
        const barWidth = (width - 60) / totalBars;
        const stepIdx = Math.floor(t * (simParams.sortSpeed || 3)) % (totalBars * 2);
        const activePair = stepIdx % (totalBars - 1);

        for (let i = 0; i < totalBars; i++) {
          const baseHeight = (((i * 7 + 11) % totalBars) + 1) * ((height - 80) / totalBars);
          const x = 30 + i * barWidth;
          const y = height - 40 - baseHeight;

          const isActive = i === activePair || i === activePair + 1;
          ctx.fillStyle = isActive ? '#ec4899' : (i < (stepIdx / 2) ? '#22c55e' : '#6366f1');
          ctx.fillRect(x, y, barWidth - 4, baseHeight);
        }

        ctx.fillStyle = '#cbd5e1'; ctx.font = '11px monospace';
        ctx.fillText(`Algorithm: Bubble Sort [${totalBars} elements] | Step: Comparing arr[${activePair}] & arr[${activePair + 1}]`, 20, height - 16);
      } else if (simType === 'gravity_orbit') {
        // Astronomy / Universal Gravitation: Keplerian Planetary Orbit
        const cx = width / 2;
        const cy = height / 2;

        // Central Sun
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // Elliptical Orbit
        const a = width * 0.38;
        const b = height * 0.32;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, a, b, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Planet
        const orbitAngle = t * 0.9;
        const px = cx + a * Math.cos(orbitAngle);
        const py = cy + b * Math.sin(orbitAngle);
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath(); ctx.arc(px, py, 6.5, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#cbd5e1'; ctx.font = '11px monospace';
        const r = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2).toFixed(0);
        ctx.fillText(`Gravitation: F = G(M·m)/r² | Distance r = ${r} AU | Orbital Period T ≈ 365 days`, 20, height - 16);
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

              {resolvedSimType === 'gas_molecules' && (
                <>
                  <label className="flex items-center gap-1.5 font-medium text-stone-700">
                    <span>Temp T: {simParams.temperature || 300}K</span>
                    <input
                      type="range"
                      min={100}
                      max={800}
                      step={10}
                      value={simParams.temperature || 300}
                      onChange={(e) => setSimParams((p) => ({ ...p, temperature: Number(e.target.value) }))}
                      className="w-24 accent-indigo-600 cursor-pointer"
                      data-testid="slider-gas-temp"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 font-medium text-stone-700">
                    <span>Molecules N: {simParams.particleCount || 28}</span>
                    <input
                      type="range"
                      min={10}
                      max={50}
                      step={2}
                      value={simParams.particleCount || 28}
                      onChange={(e) => setSimParams((p) => ({ ...p, particleCount: Number(e.target.value) }))}
                      className="w-20 accent-indigo-600 cursor-pointer"
                      data-testid="slider-gas-count"
                    />
                  </label>
                </>
              )}

              {resolvedSimType === 'sorting' && (
                <>
                  <label className="flex items-center gap-1.5 font-medium text-stone-700">
                    <span>Algorithm Speed: {simParams.sortSpeed || 3}x</span>
                    <input
                      type="range"
                      min={1}
                      max={8}
                      step={1}
                      value={simParams.sortSpeed || 3}
                      onChange={(e) => setSimParams((p) => ({ ...p, sortSpeed: Number(e.target.value) }))}
                      className="w-28 accent-indigo-600 cursor-pointer"
                      data-testid="slider-sort-speed"
                    />
                  </label>
                  <span className="text-[11px] font-mono text-stone-600">
                    Time Complexity: O(n²)
                  </span>
                </>
              )}

              {resolvedSimType === 'gravity_orbit' && (
                <>
                  <label className="flex items-center gap-1.5 font-medium text-stone-700">
                    <span>Gravity G: {simParams.gravity}</span>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      step={1}
                      value={simParams.gravity}
                      onChange={(e) => setSimParams((p) => ({ ...p, gravity: Number(e.target.value) }))}
                      className="w-24 accent-indigo-600 cursor-pointer"
                      data-testid="slider-gravity-orbit"
                    />
                  </label>
                  <span className="text-[11px] font-mono text-stone-600">
                    Orbit: Elliptical
                  </span>
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
