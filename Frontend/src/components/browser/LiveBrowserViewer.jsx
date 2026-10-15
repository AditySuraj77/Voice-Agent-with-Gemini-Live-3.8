import React, { useState, useEffect, useRef } from 'react';
import {
  Globe, ArrowLeft, ArrowRight, RotateCw, Lock, Sparkles,
  ChevronDown, ChevronUp, ExternalLink, Loader2, Compass, Shield,
  Maximize2, Minimize2
} from 'lucide-react';

/**
 * LiveBrowserViewer Component
 * Displays live autonomous browser viewport driven by Gemini Live voice agent.
 * Features:
 * - Real-time visual screenshot streaming from Playwright Chromium
 * - Visual click ripple indicator highlighting where the AI clicked
 * - Interactive address bar with manual URL input / search
 * - Quick scroll and reload controls
 * - Direct click-to-navigate on the viewport
 */
export function LiveBrowserViewer({
  browserState = {},
  onAction,
  onClose,
  isMaximized = false,
  onToggleMaximize = null,
}) {
  const [addressInput, setAddressInput] = useState(browserState.url || '');
  const [clickEffect, setClickEffect] = useState(null);
  const imageRef = useRef(null);

  useEffect(() => {
    if (browserState.url && browserState.url !== 'about:blank') {
      setAddressInput(browserState.url);
    }
  }, [browserState.url]);

  // Show visual ripple when AI clicks
  useEffect(() => {
    if (browserState.clickCoordinates) {
      setClickEffect(browserState.clickCoordinates);
      const timer = setTimeout(() => setClickEffect(null), 1800);
      return () => clearTimeout(timer);
    }
  }, [browserState.clickCoordinates]);

  const handleAddressSubmit = (e) => {
    e.preventDefault();
    if (!addressInput.trim()) return;
    if (onAction) {
      onAction({ action: 'navigate', url: addressInput.trim() });
    }
  };

  const handleImageClick = (e) => {
    if (!imageRef.current || !onAction) return;
    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;

    const clickX = Math.round((e.clientX - rect.left) * scaleX);
    const clickY = Math.round((e.clientY - rect.top) * scaleY);

    setClickEffect({ x: clickX, y: clickY });
    onAction({
      action: 'click',
      x: clickX,
      y: clickY,
      description: `User clicked at (${clickX}, ${clickY})`,
    });
  };

  const handleScroll = (direction) => {
    if (onAction) {
      onAction({ action: 'scroll', direction, amount: 450 });
    }
  };

  const handleReload = () => {
    if (onAction && browserState.url) {
      onAction({ action: 'navigate', url: browserState.url });
    }
  };

  const quickLinks = [
    { label: 'Wikipedia: Artificial Intelligence', url: 'https://en.wikipedia.org/wiki/Artificial_intelligence' },
    { label: 'Python 3 Docs', url: 'https://docs.python.org/3/' },
    { label: 'NASA Astronomy', url: 'https://apod.nasa.gov/apod/' },
    { label: 'MIT News', url: 'https://news.mit.edu/' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0f1d] text-stone-200 font-sans text-xs overflow-hidden select-none border-l border-stone-800 shadow-2xl">
      {/* 1. Browser Window Chrome Header */}
      <div className="px-3 py-2 bg-[#141b2d] border-b border-stone-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
            <Globe className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-xs md:text-sm text-stone-100 hidden sm:inline">Live Browser</span>

          {/* AI Activity Badge */}
          {browserState.isLoading ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-medium animate-pulse">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              <span>AI Browsing...</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Gemini Vision Connected</span>
            </span>
          )}
        </div>

        {/* Address Bar */}
        <form onSubmit={handleAddressSubmit} className="flex-1 max-w-xl flex items-center gap-1 bg-[#0b101e] border border-stone-700/80 rounded-xl px-2.5 py-1 text-xs">
          <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            placeholder="Search web or enter URL (e.g. wikipedia.org)..."
            className="flex-1 bg-transparent text-stone-200 placeholder-stone-500 focus:outline-none font-mono text-[11px]"
          />
          <button
            type="submit"
            className="text-stone-400 hover:text-white p-0.5 transition-colors cursor-pointer"
            title="Navigate to URL"
          >
            <ArrowRight className="w-3 h-3" />
          </button>
        </form>

        {/* Quick Navigation Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => handleScroll('up')}
            className="p-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
            title="Scroll Up"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleScroll('down')}
            className="p-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
            title="Scroll Down"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleReload}
            disabled={browserState.isLoading}
            className="p-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer disabled:opacity-40"
            title="Reload Page"
          >
            <RotateCw className={`w-3.5 h-3.5 ${browserState.isLoading ? 'animate-spin' : ''}`} />
          </button>
          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              className="p-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
              title={isMaximized ? "Restore Size" : "Maximize Browser"}
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer text-xs ml-1"
              title="Close Browser View"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Viewport Canvas / Screenshot Stream */}
      <div className="flex-1 bg-[#05070d] overflow-auto relative flex items-center justify-center p-2">
        {browserState.screenshot ? (
          <div className="relative inline-block max-w-full max-h-full rounded-lg overflow-hidden shadow-2xl border border-stone-800/80 cursor-crosshair group">
            <img
              ref={imageRef}
              src={`data:image/jpeg;base64,${browserState.screenshot}`}
              alt={browserState.title || 'Live Browser Viewport'}
              onClick={handleImageClick}
              className="block max-w-full h-auto object-contain select-none"
              style={{ maxHeight: 'calc(100vh - 120px)' }}
            />

            {/* AI Click Coordinates Visual Ripple Highlight */}
            {clickEffect && imageRef.current && (
              <div
                style={{
                  left: `${(clickEffect.x / 1280) * 100}%`,
                  top: `${(clickEffect.y / 720) * 100}%`,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30"
              >
                <div className="w-8 h-8 rounded-full border-2 border-cyan-400 bg-cyan-400/30 animate-ping" />
                <div className="w-3 h-3 rounded-full bg-cyan-300 -translate-y-5 translate-x-2.5 shadow-md shadow-cyan-400/50" />
              </div>
            )}

            {/* Hover coordinate tooltip */}
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] font-mono text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Click anywhere to navigate
            </div>
          </div>
        ) : (
          /* Empty / Initial State */
          <div className="text-center p-8 max-w-md space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto shadow-inner">
              <Compass className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-100">Live Browser Ready</h3>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                अपने AI टीचर से कहें: <em>"Wikipedia open karo"</em>, <em>"latest science news search karo"</em>, ya koi bhi website browse karne ko bolein.
              </p>
            </div>

            {/* Quick Links */}
            <div className="pt-2">
              <div className="text-[11px] font-semibold text-stone-400 mb-2">Or click a quick start website:</div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {quickLinks.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => onAction && onAction({ action: 'navigate', url: item.url })}
                    className="px-2.5 py-1 rounded-lg bg-stone-800/80 hover:bg-cyan-600/20 hover:border-cyan-500/50 border border-stone-700/60 text-[11px] text-stone-300 hover:text-cyan-300 transition-all cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Status / Information Bar */}
      <div className="px-3 py-1.5 bg-[#141b2d] border-t border-stone-800 flex items-center justify-between text-[11px] text-stone-400 shrink-0 font-mono">
        <div className="flex items-center gap-2 truncate max-w-md">
          <span className="font-semibold text-stone-300 truncate">
            {browserState.title || 'Live Web Viewport'}
          </span>
          {browserState.url && browserState.url !== 'about:blank' && (
            <span className="text-[10px] text-stone-500 truncate">({browserState.url})</span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0 text-[10px]">
          <span>Resolution: 1280×720</span>
          <span>Vision Stream: Active</span>
        </div>
      </div>
    </div>
  );
}
