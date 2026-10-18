import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, Maximize2, Image as ImageIcon, Sparkles, AlertCircle, Compass, Check, X } from 'lucide-react';

/**
 * UniversalVisualCard
 * Renders either:
 * 1. Autonomous Generative SVG Vector Diagrams (Custom sketches for Physics, Biology, Chemistry, Math, Geography)
 * 2. Authentic Educational Archive Photos (Real Space, Historical Monuments, Microscopic Scans from Wikimedia Commons)
 *
 * Dedicated Fullscreen Lightbox Modal:
 * - Only zooms into the single selected visual (never squishes multiple images side-by-side).
 * - High-res presentation with prominent Close (✕) button, Escape key listener, and backdrop dismiss.
 */
export function UniversalVisualCard({ item, onOpenInCodeLab }) {
  const [expandedView, setExpandedView] = useState(null); // 'svg' | 'photo' | null
  const [imageLoaded, setImageLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasSvg = Boolean(item.svgCode) || item.visualType === 'svg';
  const hasPhoto = Boolean(item.imageUrl) || item.visualType === 'photo';
  const isFallback = item.visualType === 'photo_fallback';

  // Keyboard shortcut to close fullscreen modal on Escape key
  useEffect(() => {
    if (!expandedView) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setExpandedView(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedView]);

  const downloadSvg = () => {
    if (!item.svgCode) return;
    const blob = new Blob([item.svgCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(item.topic || 'diagram').toLowerCase().replace(/\s+/g, '-')}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copySvg = () => {
    if (!item.svgCode) return;
    navigator.clipboard.writeText(item.svgCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. Vector Diagram Card Component
  const renderSvgCard = () => (
    <div
      key="card-svg"
      className="my-2 rounded-xl border border-stone-200/80 bg-stone-50/70 p-2.5 sm:p-3 shadow-2xs transition-all duration-200 font-sans w-full max-w-lg mx-auto"
      data-testid="universal-visual-card"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-stone-200/60 mb-2 w-full">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="p-1 rounded-md bg-amber-100 text-amber-800 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-600 truncate">
            {item.subject ? `${item.subject} • ` : ''}Vector Diagram
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={copySvg}
            title="Copy SVG XML"
            className="p-1 text-stone-500 hover:text-stone-800 rounded hover:bg-stone-200/60 transition-colors cursor-pointer text-xs flex items-center gap-1"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <span className="text-[10px] font-mono">SVG</span>}
          </button>
          <button
            type="button"
            onClick={downloadSvg}
            title="Download SVG file"
            className="p-1 text-stone-500 hover:text-stone-800 rounded hover:bg-stone-200/60 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setExpandedView('svg')}
            title="Expand full size (Zoom)"
            className="p-1 text-stone-500 hover:text-stone-800 rounded hover:bg-stone-200/60 transition-colors cursor-pointer"
            data-testid="expand-visual-btn"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SVG Container */}
      <div className="w-full flex flex-col items-center">
        <div
          className="w-full bg-white rounded-lg p-2 border border-stone-200/80 shadow-2xs flex items-center justify-center overflow-hidden max-h-[250px] sm:max-h-[270px] [&>svg]:max-h-[240px] sm:[&>svg]:max-h-[260px] [&>svg]:w-auto [&>svg]:h-auto [&>svg]:max-w-full [&>svg]:mx-auto cursor-zoom-in"
          data-testid="svg-diagram-container"
          onClick={() => setExpandedView('svg')}
          title="Click to view full size"
          dangerouslySetInnerHTML={{ __html: item.svgCode }}
        />
      </div>

      {/* Caption & Explanation */}
      {(!hasPhoto || !item.imageUrl) && (item.caption || item.topic) && (
        <div className="mt-2 text-xs text-stone-600 italic leading-relaxed text-center">
          {item.caption || item.topic}
        </div>
      )}
    </div>
  );

  // 2. Archive Photo Card Component
  const renderPhotoCard = () => (
    <div
      key="card-photo"
      className="my-2 rounded-xl border border-stone-200/80 bg-stone-50/70 p-2.5 sm:p-3 shadow-2xs transition-all duration-200 font-sans w-full max-w-lg mx-auto"
      data-testid="universal-visual-card"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-stone-200/60 mb-2 w-full">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="p-1 rounded-md bg-amber-100 text-amber-800 shrink-0">
            <ImageIcon className="w-3.5 h-3.5" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-600 truncate">
            {item.subject ? `${item.subject} • ` : ''}Archive Photo
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setExpandedView('photo')}
            title="Expand full size (Zoom)"
            className="p-1 text-stone-500 hover:text-stone-800 rounded hover:bg-stone-200/60 transition-colors cursor-pointer"
            data-testid="expand-visual-btn"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Photo Container */}
      <div className="w-full flex flex-col items-center">
        <div
          className="relative w-full rounded-lg overflow-hidden border border-stone-200 bg-stone-100 flex items-center justify-center max-h-[260px] cursor-zoom-in"
          onClick={() => setExpandedView('photo')}
          title="Click to view full size"
        >
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-100 text-stone-400 text-xs gap-2 min-h-[140px]">
              <Compass className="w-4 h-4 animate-spin text-amber-600" />
              <span>Loading educational archive photo...</span>
            </div>
          )}
          <img
            src={item.imageUrl}
            alt={item.caption || item.topic || 'Educational Visual'}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            className={`w-auto h-auto object-contain transition-opacity duration-300 max-h-[250px] ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>

        {/* Photo Source & Attribution */}
        {item.attribution && (
          <div className="mt-1 flex items-center justify-between w-full text-[10px] text-stone-400 px-1">
            <span className="truncate">Source: {item.source || 'Wikimedia Commons'}</span>
            <span className="truncate">{item.attribution}</span>
          </div>
        )}
      </div>

      {/* Caption & Explanation */}
      {(item.caption || item.topic) && (
        <div className="mt-2 text-xs text-stone-600 italic leading-relaxed text-center">
          {item.caption || item.topic}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Inline Whiteboard Visuals */}
      {hasSvg && item.svgCode && hasPhoto && item.imageUrl ? (
        <div className="space-y-3 w-full">
          {renderSvgCard()}
          {renderPhotoCard()}
        </div>
      ) : hasSvg && item.svgCode ? (
        renderSvgCard()
      ) : hasPhoto && item.imageUrl ? (
        renderPhotoCard()
      ) : isFallback ? (
        <div className="my-2 flex items-center gap-2 p-3 text-xs text-amber-800 bg-amber-50 rounded-lg border border-amber-200/80 max-w-lg mx-auto">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{item.message || 'Educational visual could not be displayed. Ask your teacher to draw an SVG diagram instead.'}</span>
        </div>
      ) : null}

      {/* 2. Fullscreen Lightbox Modal (Dedicated Single-Image Zoom with z-[100]) */}
      {expandedView && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
          onClick={() => setExpandedView(null)}
          data-testid="visual-lightbox-modal"
        >
          <div
            className="relative w-full max-w-4xl max-h-[92vh] bg-stone-900 border border-stone-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-stone-700/80 bg-stone-900/90 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="p-1 rounded-md bg-amber-500/20 text-amber-400 shrink-0">
                  {expandedView === 'svg' ? <Sparkles className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 truncate">
                    {item.subject ? `${item.subject} • ` : ''}
                    {expandedView === 'svg' ? 'Vector Diagram' : 'Archive Photo'}
                  </div>
                  <div className="text-sm font-medium text-stone-200 truncate">
                    {expandedView === 'svg'
                      ? item.topic || 'Vector Diagram'
                      : item.imageTitle || item.caption || item.topic || 'Archive Photo'}
                  </div>
                </div>
              </div>

              {/* Action Buttons + Prominent Close Button */}
              <div className="flex items-center gap-2 shrink-0">
                {expandedView === 'svg' && (
                  <>
                    <button
                      type="button"
                      onClick={copySvg}
                      className="px-2.5 py-1 text-xs rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 border border-stone-700"
                      title="Copy SVG XML"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <span className="font-mono">SVG</span>}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={downloadSvg}
                      className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer border border-stone-700"
                      title="Download SVG file"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Prominent Close Button */}
                <button
                  type="button"
                  onClick={() => setExpandedView(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-rose-900/80 text-stone-200 hover:text-white border border-stone-700 hover:border-rose-600 transition-all cursor-pointer font-medium text-xs shadow-xs"
                  title="Close (Esc)"
                  data-testid="lightbox-close-btn"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                  <span>Close</span>
                  <span className="text-[10px] text-stone-400 font-mono ml-0.5 hidden sm:inline">(Esc)</span>
                </button>
              </div>
            </div>

            {/* Modal Body: Only renders the clicked visual in high resolution */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-stone-950/40">
              {expandedView === 'svg' && item.svgCode && (
                <div
                  className="w-full max-w-3xl bg-white rounded-xl p-4 shadow-xl flex items-center justify-center max-h-[72vh] [&>svg]:max-h-[68vh] [&>svg]:w-auto [&>svg]:h-auto [&>svg]:max-w-full [&>svg]:mx-auto"
                  dangerouslySetInnerHTML={{ __html: item.svgCode }}
                />
              )}

              {expandedView === 'photo' && item.imageUrl && (
                <div className="flex flex-col items-center justify-center max-h-[72vh] w-full">
                  <img
                    src={item.imageUrl}
                    alt={item.caption || item.topic || 'Educational Visual'}
                    className="w-auto h-auto max-h-[66vh] max-w-full object-contain rounded-xl shadow-xl"
                  />
                  {item.attribution && (
                    <div className="mt-2 text-center text-xs text-stone-400">
                      <span>Source: {item.source || 'Wikimedia Commons'} • {item.attribution}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Note */}
            {item.caption && (
              <div className="px-4 py-2 text-center text-xs text-stone-400 border-t border-stone-800 bg-stone-900/60">
                {item.caption}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
