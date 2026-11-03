import React from 'react';
import { Sparkles } from 'lucide-react';
import { MathFormula } from './MathFormula.jsx';

/**
 * AristotleWhiteboardRenderer
 * 
 * High-performance, zero-latency declarative educational whiteboard visualizer
 * inspired by Aristotle.ai's dynamic teaching whiteboard.
 * 
 * Supports:
 * 1. "vectors_2d" -> 2D coordinate grid with labeled Query/Key vectors, angle arcs, and dot products.
 * 2. "grouped_boxes" -> Rounded discrete containers with items/dots and curly bracket counting.
 * 3. "flow_chain" -> Connected concept boxes with labeled transition arrows.
 * 4. "comparison" -> Clean side-by-side contrast panels with check/cross markers.
 */
export function AristotleWhiteboardRenderer({ diagram, title, caption, formula }) {
  if (!diagram || typeof diagram !== 'object') return null;

  const kind = diagram.kind || 'grouped_boxes';
  const effectiveFormula = diagram.formula || formula || null;
  const effectiveCaption = diagram.caption || caption || null;

  return (
    <div
      className="my-3 rounded-2xl border-2 border-stone-800 bg-[#1e232a] text-stone-100 p-4 shadow-md font-sans w-full max-w-xl mx-auto overflow-hidden transition-all duration-300"
      data-testid="aristotle-whiteboard-card"
    >
      {/* Top Bar with Aristotle Chalkboard Badge */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-stone-700/70 text-xs">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-md bg-amber-400/20 text-amber-300 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <span className="font-bold tracking-wide uppercase text-stone-300 text-[11px]">
            {title || 'Whiteboard Diagram'}
          </span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-700/50 px-2 py-0.5 rounded-full">
          Live Chalkboard
        </span>
      </div>

      {/* Diagram Canvas Renderers */}
      <div className="flex items-center justify-center p-2 min-h-[220px]">
        {kind === 'vectors_2d' && <Vectors2DCanvas diagram={diagram} />}
        {kind === 'grouped_boxes' && <GroupedBoxesCanvas diagram={diagram} />}
        {kind === 'flow_chain' && <FlowChainCanvas diagram={diagram} />}
        {kind === 'comparison' && <ComparisonCanvas diagram={diagram} />}
      </div>

      {/* Highlighted Mathematical Equation / Formula */}
      {effectiveFormula && (
        <div className="mt-3 pt-2.5 border-t border-stone-700/60 text-center">
          <div className="inline-block bg-[#161a20] border border-amber-400/40 text-amber-300 px-4 py-1.5 rounded-xl text-sm md:text-base font-bold shadow-inner tracking-wide max-w-full overflow-x-auto">
            <MathFormula formula={effectiveFormula} displayMode={true} />
          </div>
        </div>
      )}

      {/* Educational Caption */}
      {effectiveCaption && (
        <p className="mt-2 text-center text-xs text-stone-400 font-sans leading-relaxed">
          {effectiveCaption}
        </p>
      )}
    </div>
  );
}

function parseDiagramData(diagram) {
  if (diagram?.dataJson && typeof diagram.dataJson === 'string') {
    try {
      return JSON.parse(diagram.dataJson);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * 1. 2D Coordinate Grid with Vectors & Angles (e.g. Attention Query-Key Dot Product)
 */
function Vectors2DCanvas({ diagram }) {
  const parsed = parseDiagramData(diagram);
  const defaultVectors = [
    { label: 'q (Query)', x: 120, y: -70, color: '#38bdf8' },
    { label: 'k₁ (Aligned)', x: 140, y: -60, color: '#4ade80' },
    { label: 'k₂ (Perpendicular)', x: 60, y: 120, color: '#fb923c' },
  ];
  const vectors = Array.isArray(parsed) ? parsed : (Array.isArray(diagram.vectors) ? diagram.vectors : defaultVectors);

  return (
    <svg viewBox="0 0 360 260" className="w-full h-auto max-h-[260px] select-none">
      <defs>
        <marker id="arr-blue" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#38bdf8" />
        </marker>
        <marker id="arr-green" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#4ade80" />
        </marker>
        <marker id="arr-orange" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#fb923c" />
        </marker>
        <marker id="arr-white" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" />
        </marker>
      </defs>

      {/* Grid Lines */}
      <g stroke="#334155" strokeWidth="1" strokeDasharray="3 3">
        <line x1="30" y1="60" x2="330" y2="60" />
        <line x1="30" y1="130" x2="330" y2="130" />
        <line x1="30" y1="200" x2="330" y2="200" />
        <line x1="90" y1="30" x2="90" y2="230" />
        <line x1="160" y1="30" x2="160" y2="230" />
        <line x1="230" y1="30" x2="230" y2="230" />
        <line x1="300" y1="30" x2="300" y2="230" />
      </g>

      {/* Origin Axes (Center at 160, 130) */}
      <line x1="40" y1="130" x2="320" y2="130" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arr-white)" />
      <text x="325" y="134" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">x</text>

      <line x1="160" y1="220" x2="160" y2="35" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arr-white)" />
      <text x="164" y="32" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">y</text>

      {/* Origin Point */}
      <circle cx="160" cy="130" r="3.5" fill="#f8fafc" />

      {/* Vectors */}
      {vectors.map((vec, i) => {
        const targetX = 160 + (vec.x || 0);
        const targetY = 130 + (vec.y || 0);
        const marker =
          vec.color === '#4ade80' ? 'url(#arr-green)' :
          vec.color === '#fb923c' ? 'url(#arr-orange)' : 'url(#arr-blue)';

        return (
          <g key={i}>
            <line
              x1="160"
              y1="130"
              x2={targetX}
              y2={targetY}
              stroke={vec.color || '#38bdf8'}
              strokeWidth="2.5"
              markerEnd={marker}
            />
            <circle cx={targetX} cy={targetY} r="3" fill={vec.color || '#38bdf8'} />
            <text
              x={targetX + (vec.x >= 0 ? 8 : -8)}
              y={targetY + (vec.y >= 0 ? 14 : -8)}
              fill={vec.color || '#38bdf8'}
              fontSize="12"
              fontWeight="bold"
              fontFamily="sans-serif"
              textAnchor={vec.x >= 0 ? 'start' : 'end'}
            >
              {vec.label || `v${i + 1}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * 2. Discrete Grouped Containers (e.g. 3 Groups of 4 Dots = 12)
 */
function GroupedBoxesCanvas({ diagram }) {
  const groupsCount = Math.max(1, Math.min(diagram.groupCount || 3, 5));
  const itemsPerGroup = Math.max(1, Math.min(diagram.itemsPerGroup || 4, 12));
  const groupLabel = diagram.groupLabel || `${groupsCount} groups`;

  const groups = Array.from({ length: groupsCount });
  const dots = Array.from({ length: itemsPerGroup });

  return (
    <div className="flex flex-col items-center gap-3 w-full py-2">
      <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
        {groups.map((_, gIdx) => (
          <div
            key={gIdx}
            className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-dashed border-amber-300/60 bg-[#282f3a] shadow-inner min-w-[90px] min-h-[90px]"
          >
            <div className="grid grid-cols-2 gap-2">
              {dots.map((__, dIdx) => (
                <div
                  key={dIdx}
                  className="w-4 h-4 rounded-full bg-cyan-400 shadow-md shadow-cyan-500/40 animate-pulse"
                />
              ))}
            </div>
            <span className="text-[10px] text-stone-400 mt-2 font-mono">
              Group {gIdx + 1} ({itemsPerGroup})
            </span>
          </div>
        ))}
      </div>

      <div className="text-xs text-amber-300 font-semibold font-mono tracking-wide mt-1">
        ⎵ {groupLabel} × {itemsPerGroup} items each
      </div>
    </div>
  );
}

/**
 * 3. Flow Chain (e.g. Input -> Embedding -> Attention -> Output)
 */
function FlowChainCanvas({ diagram }) {
  const parsed = parseDiagramData(diagram);
  const defaultSteps = [
    { title: 'Input Tokens', subtitle: '"Hello World"' },
    { title: 'Self-Attention', subtitle: 'q · k weights' },
    { title: 'Feed Forward', subtitle: 'Dense layers' },
    { title: 'Next Token', subtitle: 'Output logits' },
  ];
  const steps = Array.isArray(parsed) && parsed.length > 0 ? parsed : (Array.isArray(diagram.steps) && diagram.steps.length > 0 ? diagram.steps : defaultSteps);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 py-3 w-full">
      {steps.map((step, idx) => (
        <React.Fragment key={idx}>
          <div className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-stone-600 bg-[#242b35] min-w-[100px] text-center shadow-xs">
            <span className="text-xs font-bold text-amber-300">{step.title}</span>
            {step.subtitle && (
              <span className="text-[10px] text-stone-400 mt-0.5">{step.subtitle}</span>
            )}
          </div>
          {idx < steps.length - 1 && (
            <span className="text-stone-500 font-bold text-lg select-none">→</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * 4. Comparison Cards (e.g. Encoder vs Decoder)
 */
function ComparisonCanvas({ diagram }) {
  const left = diagram.left || { title: 'Option A', points: ['Feature 1', 'Feature 2'] };
  const right = diagram.right || { title: 'Option B', points: ['Feature 1', 'Feature 2'] };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full py-2">
      <div className="p-3 rounded-xl border border-blue-500/40 bg-[#1e293b]/70">
        <h4 className="text-xs font-bold text-blue-300 border-b border-blue-500/30 pb-1 mb-2">
          {left.title}
        </h4>
        <ul className="text-[11px] text-stone-300 space-y-1">
          {left.points?.map((p, idx) => (
            <li key={idx} className="flex items-center gap-1.5">
              <span className="text-blue-400 font-bold">•</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="p-3 rounded-xl border border-emerald-500/40 bg-[#132e26]/70">
        <h4 className="text-xs font-bold text-emerald-300 border-b border-emerald-500/30 pb-1 mb-2">
          {right.title}
        </h4>
        <ul className="text-[11px] text-stone-300 space-y-1">
          {right.points?.map((p, idx) => (
            <li key={idx} className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold">•</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
