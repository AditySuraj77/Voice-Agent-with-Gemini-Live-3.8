import React, { useState, useId } from 'react';
import { Eye, Download, Maximize2, Minimize2, Image as ImageIcon, Sparkles, AlertCircle, Compass, Check } from 'lucide-react';

/**
 * UniversalVisualCard
 * Renders either:
 * 1. Autonomous Generative SVG Vector Diagrams (Custom sketches for Physics, Biology, Chemistry, Math, Geography)
 * 2. Authentic Educational Archive Photos (Real Space, Historical Monuments, Microscopic Scans from Wikimedia Commons)
 */
export function UniversalVisualCard({ item, onOpenInCodeLab }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const uniqueId = useId();

  const isSvg = item.visualType === 'svg' || Boolean(item.svgCode);
  const isPhoto = item.visualType === 'photo' || Boolean(item.imageUrl);
  const isFallback = item.visualType === 'photo_fallback';

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

  return (
    <div
      className={`my-3 rounded-xl border border-stone-200/80 bg-stone-50/70 p-2.5 sm:p-3 shadow-2xs transition-all duration-200 font-sans ${
        isExpanded ? 'fixed inset-4 sm:inset-12 z-50 overflow-auto bg-stone-900/95 text-stone-100 border-stone-700 shadow-2xl flex flex-col justify-center items-center' : 'max-w-lg mx-auto'
      }`}
      data-testid="universal-visual-card"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-stone-200/60 mb-2 w-full">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="p-1 rounded-md bg-amber-100 text-amber-800 shrink-0">
            {isSvg ? <Sparkles className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-600 truncate">
            {item.subject ? `${item.subject} • ` : ''}
            {isSvg ? 'Vector Diagram' : isPhoto ? 'Archive Photo' : 'Visual Reference'}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isSvg && (
            <>
              <button
                onClick={copySvg}
                title="Copy SVG XML"
                className="p-1 text-stone-500 hover:text-stone-800 rounded hover:bg-stone-200/60 transition-colors cursor-pointer text-xs flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <span className="text-[10px] font-mono">SVG</span>}
              </button>
              <button
                onClick={downloadSvg}
                title="Download SVG file"
                className="p-1 text-stone-500 hover:text-stone-800 rounded hover:bg-stone-200/60 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Minimize' : 'Expand full size'}
            className="p-1 text-stone-500 hover:text-stone-800 rounded hover:bg-stone-200/60 transition-colors cursor-pointer"
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Mode A: Generative Vector SVG */}
      {isSvg && item.svgCode && (
        <div className="w-full flex flex-col items-center">
          <div
            className={`w-full bg-white rounded-lg p-2 border border-stone-200/80 shadow-2xs flex items-center justify-center overflow-hidden transition-all ${
              isExpanded
                ? 'max-w-4xl p-6 bg-white/95 max-h-[80vh] [&>svg]:max-h-[75vh]'
                : 'max-h-[250px] sm:max-h-[270px] [&>svg]:max-h-[240px] sm:[&>svg]:max-h-[260px] [&>svg]:w-auto [&>svg]:h-auto [&>svg]:max-w-full [&>svg]:mx-auto'
            }`}
            data-testid="svg-diagram-container"
            dangerouslySetInnerHTML={{ __html: item.svgCode }}
          />
        </div>
      )}

      {/* Mode B: Real Educational Archive Photo */}
      {isPhoto && item.imageUrl && (
        <div className="w-full flex flex-col items-center">
          <div className={`relative w-full rounded-lg overflow-hidden border border-stone-200 bg-stone-100 flex items-center justify-center ${
            isExpanded ? 'max-h-[80vh]' : 'max-h-[260px]'
          }`}>
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
              className={`w-auto h-auto object-contain transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              } ${isExpanded ? 'max-h-[78vh]' : 'max-h-[250px]'}`}
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
      )}

      {/* Fallback View */}
      {isFallback && (
        <div className="flex items-center gap-2 p-3 text-xs text-amber-800 bg-amber-50 rounded-lg border border-amber-200/80">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{item.message || 'Educational visual could not be displayed. Ask your teacher to draw an SVG diagram instead.'}</span>
        </div>
      )}

      {/* Caption & Explanation */}
      {(item.caption || item.topic) && (
        <div className={`mt-2.5 text-xs text-stone-600 italic leading-relaxed text-center ${isExpanded ? 'text-stone-300' : ''}`}>
          {item.caption || item.topic}
        </div>
      )}
    </div>
  );
}
