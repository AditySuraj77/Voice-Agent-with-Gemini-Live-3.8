import React from 'react';

/**
 * Particle Diagram & Scientific Visuals for Chemistry / Science sessions
 * Replicates the exact visual representations seen in aristotle2.mp4
 */
export function ParticleDiagram({ type = 'states', data = {} }) {
  if (type === 'classification_tree' || data.view === 'tree') {
    return (
      <div className="bg-white/80 backdrop-blur-sm border border-stone-200/90 rounded-2xl p-6 shadow-sm my-4 font-serif">
        <h4 className="text-center font-bold text-lg text-stone-800 mb-6">Matter</h4>
        
        {/* Tree Root */}
        <div className="flex justify-center mb-4">
          <div className="px-6 py-2 rounded-xl bg-stone-100 border border-stone-300 text-stone-900 font-semibold text-sm shadow-sm">
            Matter
          </div>
        </div>

        {/* Tree Branches */}
        <div className="grid grid-cols-2 gap-6 relative pt-4">
          <div className="border-t-2 border-stone-300 absolute top-0 left-1/4 right-1/4" />
          
          {/* Pure Substance Branch */}
          <div className="flex flex-col items-center">
            <div className="px-4 py-2 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 font-medium text-xs mb-3 shadow-xs text-center w-40">
              Pure Substance
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-center">
                <span className="block font-semibold text-xs text-stone-800">Element</span>
                <span className="text-[11px] text-stone-500 italic">e.g., Gold (Au)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-center">
                <span className="block font-semibold text-xs text-stone-800">Compound</span>
                <span className="text-[11px] text-stone-500 italic">e.g., Water (H₂O)</span>
              </div>
            </div>
          </div>

          {/* Mixture Branch */}
          <div className="flex flex-col items-center">
            <div className="px-4 py-2 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 font-medium text-xs mb-3 shadow-xs text-center w-40">
              Mixture
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-center">
                <span className="block font-semibold text-xs text-stone-800">Homogeneous</span>
                <span className="text-[11px] text-stone-500 italic">(Solution, Air)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-center">
                <span className="block font-semibold text-xs text-stone-800">Heterogeneous</span>
                <span className="text-[11px] text-stone-500 italic">(Oil & Water)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: States of Matter (Solid, Liquid, Gas) with particle dots
  return (
    <div className="my-4 font-serif" data-testid="particle-diagram">
      {/* Comparison Matrix Table */}
      <div className="overflow-x-auto rounded-xl border border-stone-300 shadow-xs mb-6 bg-white">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-stone-100/80 border-b border-stone-200 text-stone-700">
              <th className="p-2.5 font-semibold">Property</th>
              <th className="p-2.5 font-semibold text-blue-700">Solid</th>
              <th className="p-2.5 font-semibold text-teal-700">Liquid</th>
              <th className="p-2.5 font-semibold text-amber-700">Gas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 text-stone-600">
            <tr>
              <td className="p-2.5 font-medium text-stone-800">Shape</td>
              <td className="p-2.5">Definite shape</td>
              <td className="p-2.5">Takes container shape</td>
              <td className="p-2.5">Takes container shape</td>
            </tr>
            <tr>
              <td className="p-2.5 font-medium text-stone-800">Volume</td>
              <td className="p-2.5">Definite volume</td>
              <td className="p-2.5">Definite volume</td>
              <td className="p-2.5">Fills container volume</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 3 Interactive Particle Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Solid (Ice) */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 text-center shadow-xs">
          <h5 className="font-bold text-sm text-blue-900 mb-1">Solid (Ice)</h5>
          <div className="w-full h-36 bg-blue-100/50 rounded-xl border border-blue-200/80 flex items-center justify-center relative overflow-hidden my-2">
            {/* Rigid Grid Particle Dots */}
            <div className="grid grid-cols-4 gap-3 p-2">
              {[...Array(16)].map((_, i) => (
                <div
                  key={i}
                  className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-xs animate-pulse"
                  style={{ animationDuration: '0.8s', animationDelay: `${(i % 4) * 0.15}s` }}
                />
              ))}
            </div>
          </div>
          <p className="text-[11px] text-stone-600 mt-2">
            <span className="font-semibold text-stone-800">Fixed positions</span>, vibrate in place. Definite shape & volume.
          </p>
        </div>

        {/* Liquid (Water) */}
        <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4 text-center shadow-xs">
          <h5 className="font-bold text-sm text-teal-900 mb-1">Liquid (Water)</h5>
          <div className="w-full h-36 bg-teal-100/50 rounded-xl border border-teal-200/80 flex items-center justify-center relative overflow-hidden my-2">
            {/* Clustered sliding particles */}
            <svg width="120" height="100" viewBox="0 0 120 100">
              {[
                [25, 45], [42, 38], [60, 42], [78, 35], [95, 48],
                [32, 65], [52, 60], [70, 68], [88, 62], [40, 80],
                [60, 82], [76, 80]
              ].map(([cx, cy], i) => (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r="5"
                  fill="#0d9488"
                  className="animate-pulse"
                  style={{ animationDuration: '1.4s', animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </svg>
          </div>
          <p className="text-[11px] text-stone-600 mt-2">
            <span className="font-semibold text-stone-800">Close together</span>, slide past each other. Takes container shape.
          </p>
        </div>

        {/* Gas (Water Vapor) */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 text-center shadow-xs">
          <h5 className="font-bold text-sm text-amber-900 mb-1">Gas (Water Vapor)</h5>
          <div className="w-full h-36 bg-amber-100/50 rounded-xl border border-amber-200/80 flex items-center justify-center relative overflow-hidden my-2">
            {/* High speed, far apart particles with motion trail vectors */}
            <svg width="120" height="100" viewBox="0 0 120 100">
              <g>
                <circle cx="20" cy="25" r="4" fill="#d97706" />
                <line x1="20" y1="25" x2="35" y2="15" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="2,2" />

                <circle cx="95" cy="20" r="4" fill="#d97706" />
                <line x1="95" y1="20" x2="80" y2="35" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="2,2" />

                <circle cx="50" cy="55" r="4" fill="#d97706" />
                <line x1="50" y1="55" x2="68" y2="45" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="2,2" />

                <circle cx="25" cy="80" r="4" fill="#d97706" />
                <line x1="25" y1="80" x2="42" y2="70" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="2,2" />

                <circle cx="90" cy="78" r="4" fill="#d97706" />
                <line x1="90" y1="78" x2="105" y2="65" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="2,2" />
              </g>
            </svg>
          </div>
          <p className="text-[11px] text-stone-600 mt-2">
            <span className="font-semibold text-stone-800">Far apart</span>, move rapidly & randomly. Fills entire container.
          </p>
        </div>
      </div>
    </div>
  );
}
