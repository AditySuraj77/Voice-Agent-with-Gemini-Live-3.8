import React, { useMemo } from 'react';

/**
 * Interactive Math Function & Curve Plotter (SVG-based)
 * Safely evaluates math expressions like:
 * "x^2", "sin(x)", "2*x + 1", "x^3 - 3*x", "cos(x)", "sqrt(x)", "1/x", "abs(x)"
 */
export function MathPlotter({
  expression = 'x^2',
  xRange = [-5, 5],
  yRange = [-5, 5],
  title,
  width = 520,
  height = 300,
}) {
  // Safe math evaluator for single-variable expressions f(x)
  const evaluateMath = useMemo(() => {
    try {
      // Normalize expression
      let cleanExpr = expression
        .toLowerCase()
        .replace(/\^/g, '**')
        .replace(/\bsin\b/g, 'Math.sin')
        .replace(/\bcos\b/g, 'Math.cos')
        .replace(/\btan\b/g, 'Math.tan')
        .replace(/\bsqrt\b/g, 'Math.sqrt')
        .replace(/\babs\b/g, 'Math.abs')
        .replace(/\bpi\b/g, 'Math.PI')
        .replace(/\be\b/g, 'Math.E')
        .replace(/\blog\b/g, 'Math.log')
        .replace(/\bexp\b/g, 'Math.exp');

      // Security check: Only allow safe math tokens
      const allowedChars = /^[0-9x\s\+\-\*\/\.\(\)\,Math\.sincotaqrbeplgx\*\*]+$/;
      if (!allowedChars.test(cleanExpr)) {
        return null;
      }

      // Create evaluation function
      // eslint-disable-next-line no-new-func
      const fn = new Function('x', `try { return ${cleanExpr}; } catch(e) { return NaN; }`);
      // Test run
      const testVal = fn(1);
      if (typeof testVal !== 'number') return null;
      return fn;
    } catch {
      return null;
    }
  }, [expression]);

  const [xMin, xMax] = xRange || [-5, 5];
  const [yMin, yMax] = yRange || [-5, 5];

  // Padding inside the SVG for axes and labels
  const padding = 36;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  // Coordinate transforms
  const toSvgX = (x) => padding + ((x - xMin) / (xMax - xMin)) * plotWidth;
  const toSvgY = (y) => height - padding - ((y - yMin) / (yMax - yMin)) * plotHeight;

  // Origin coordinates in SVG pixels
  const originX = Math.max(padding, Math.min(width - padding, toSvgX(0)));
  const originY = Math.max(padding, Math.min(height - padding, toSvgY(0)));

  // Generate grid ticks
  const xStep = Math.max(1, Math.round((xMax - xMin) / 8));
  const yStep = Math.max(1, Math.round((yMax - yMin) / 6));

  const xTicks = [];
  for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax; x += xStep) {
    if (x !== 0) xTicks.push(x);
  }

  const yTicks = [];
  for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
    if (y !== 0) yTicks.push(y);
  }

  // Generate curve path points
  const pathData = useMemo(() => {
    if (!evaluateMath) return '';
    const pointsCount = 200;
    const dx = (xMax - xMin) / pointsCount;
    const segments = [];
    let currentSegment = [];

    for (let i = 0; i <= pointsCount; i++) {
      const x = xMin + i * dx;
      const y = evaluateMath(x);

      if (typeof y === 'number' && !isNaN(y) && isFinite(y) && y >= yMin - 15 && y <= yMax + 15) {
        const sx = toSvgX(x);
        const sy = toSvgY(y);
        currentSegment.push(`${sx.toFixed(1)},${sy.toFixed(1)}`);
      } else {
        if (currentSegment.length > 1) {
          segments.push(currentSegment);
        }
        currentSegment = [];
      }
    }
    if (currentSegment.length > 1) {
      segments.push(currentSegment);
    }

    return segments.map((seg) => `M ${seg.join(' L ')}`).join(' ');
  }, [evaluateMath, xMin, xMax, yMin, yMax, plotWidth, plotHeight]);

  return (
    <div className="my-4 p-4 rounded-2xl bg-stone-900 border border-stone-800 text-stone-100 shadow-md font-sans max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-semibold">
            Plot
          </span>
          <span className="text-sm font-mono font-semibold text-amber-200">
            f(x) = {expression}
          </span>
        </div>
        {title && <span className="text-xs text-stone-400 italic">{title}</span>}
      </div>

      <div className="relative overflow-hidden rounded-xl bg-stone-950 flex justify-center">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          style={{ maxHeight: '280px' }}
        >
          {/* Subtle Grid Lines */}
          {xTicks.map((x) => (
            <line
              key={`x-grid-${x}`}
              x1={toSvgX(x)}
              y1={padding}
              x2={toSvgX(x)}
              y2={height - padding}
              stroke="#27272a"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          ))}
          {yTicks.map((y) => (
            <line
              key={`y-grid-${y}`}
              x1={padding}
              y1={toSvgY(y)}
              x2={width - padding}
              y2={toSvgY(y)}
              stroke="#27272a"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          ))}

          {/* X Axis */}
          <line
            x1={padding}
            y1={originY}
            x2={width - padding}
            y2={originY}
            stroke="#71717a"
            strokeWidth="1.5"
          />
          {/* Y Axis */}
          <line
            x1={originX}
            y1={padding}
            x2={originX}
            y2={height - padding}
            stroke="#71717a"
            strokeWidth="1.5"
          />

          {/* X Axis Tick Labels */}
          {xTicks.map((x) => (
            <text
              key={`x-label-${x}`}
              x={toSvgX(x)}
              y={originY + 14}
              fontSize="10"
              fill="#a1a1aa"
              textAnchor="middle"
              fontFamily="monospace"
            >
              {x}
            </text>
          ))}

          {/* Y Axis Tick Labels */}
          {yTicks.map((y) => (
            <text
              key={`y-label-${y}`}
              x={originX - 6}
              y={toSvgY(y) + 3}
              fontSize="10"
              fill="#a1a1aa"
              textAnchor="end"
              fontFamily="monospace"
            >
              {y}
            </text>
          ))}

          {/* Origin Label */}
          <text
            x={originX - 6}
            y={originY + 12}
            fontSize="10"
            fill="#71717a"
            textAnchor="end"
            fontFamily="monospace"
          >
            0
          </text>

          {/* Function Curve */}
          {pathData ? (
            <path
              d={pathData}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <text
              x={width / 2}
              y={height / 2}
              fill="#f87171"
              fontSize="12"
              textAnchor="middle"
              fontFamily="sans-serif"
            >
              Unable to plot expression
            </text>
          )}
        </svg>
      </div>

      <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2 px-1 font-mono">
        <span>X: [{xMin}, {xMax}]</span>
        <span>Y: [{yMin}, {yMax}]</span>
      </div>
    </div>
  );
}
