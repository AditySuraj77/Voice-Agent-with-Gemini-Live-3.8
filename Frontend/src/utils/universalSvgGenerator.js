/**
 * universalSvgGenerator.js
 * Generates rich, authentic, domain-accurate static SVG diagrams for ANY educational topic
 * across all subjects (Physics, Chemistry, Biology, Math, Computer Science, History, Geography, Economics).
 *
 * Used as a zero-latency fallback and validator whenever Gemini's `write_on_whiteboard`
 * is called so that EVERY study topic always has an illustrative visual diagram.
 */

function escapeXml(unsafe = '') {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncateText(str = '', maxLen = 32) {
  if (typeof str !== 'string') return '';
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

/**
 * Generate a complete standalone SVG diagram (viewBox="0 0 600 400")
 * @param {string} topic - Topic title
 * @param {string[]} notes - Key bullet points / definitions
 * @param {string} [formula] - Scientific or mathematical equation
 * @param {string} [subject] - Subject domain (physics, math, biology, etc.)
 * @returns {string} Standalone SVG string
 */
export function generateUniversalTopicSvg(topic = '', notes = [], formula = '', _subject = '') {
  const t = (topic || '').toLowerCase();
  const f = (formula || '').toLowerCase();
  const allNotes = Array.isArray(notes) ? notes.join(' ').toLowerCase() : '';
  const textCorpus = `${t} ${f} ${allNotes}`;

  const cleanTopic = escapeXml(topic || 'Concept Diagram');
  const cleanFormula = escapeXml(formula || '');
  const noteBullets = Array.isArray(notes) ? notes.slice(0, 4) : [];

  // ==========================================
  // 1. OPTICS & LIGHT REFRACTION / PRISM
  // ==========================================
  if (textCorpus.includes('prism') || textCorpus.includes('dispersion') || textCorpus.includes('refraction') || textCorpus.includes('snell')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
      <defs>
        <linearGradient id="opticsBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0b1329"/>
          <stop offset="100%" stop-color="#020617"/>
        </linearGradient>
        <linearGradient id="prismGlass" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.3"/>
          <stop offset="50%" stop-color="#0284c7" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#bae6fd" stop-opacity="0.35"/>
        </linearGradient>
      </defs>
      <rect width="600" height="400" rx="16" fill="url(#opticsBg)"/>
      <text x="30" y="38" fill="#38bdf8" font-size="14" font-weight="bold" font-family="system-ui, sans-serif" letter-spacing="1">OPTICS • ${cleanTopic.toUpperCase()}</text>
      ${cleanFormula ? `<text x="570" y="38" text-anchor="end" fill="#94a3b8" font-size="12" font-family="monospace">${cleanFormula}</text>` : ''}
      <line x1="30" y1="52" x2="570" y2="52" stroke="#1e293b" stroke-width="1"/>

      <!-- Triangular Prism -->
      <polygon points="280,90 140,320 420,320" fill="url(#prismGlass)" stroke="#38bdf8" stroke-width="2.5" stroke-linejoin="round"/>
      <text x="280" y="345" text-anchor="middle" fill="#64748b" font-size="11" font-family="system-ui, sans-serif">Dispersion Prism (n ≈ 1.5)</text>

      <!-- Incident White Ray -->
      <line x1="40" y1="240" x2="195" y2="225" stroke="#f8fafc" stroke-width="3.5"/>
      <text x="45" y="225" fill="#f8fafc" font-size="11" font-weight="bold" font-family="system-ui, sans-serif">White Light</text>

      <!-- Internal Dispersed Rays -->
      <line x1="195" y1="225" x2="335" y2="210" stroke="#ef4444" stroke-width="2"/>
      <line x1="195" y1="225" x2="340" y2="220" stroke="#eab308" stroke-width="1.8"/>
      <line x1="195" y1="225" x2="345" y2="230" stroke="#22c55e" stroke-width="1.8"/>
      <line x1="195" y1="225" x2="350" y2="240" stroke="#3b82f6" stroke-width="1.8"/>
      <line x1="195" y1="225" x2="355" y2="250" stroke="#a855f7" stroke-width="2"/>

      <!-- Exiting Spectral Spectrum (VIBGYOR) -->
      <line x1="335" y1="210" x2="540" y2="165" stroke="#ef4444" stroke-width="2.5"/>
      <text x="548" y="170" fill="#ef4444" font-size="11" font-weight="bold" font-family="system-ui, sans-serif">Red (Least bent)</text>

      <line x1="340" y1="220" x2="540" y2="195" stroke="#f97316" stroke-width="2"/>
      <text x="548" y="199" fill="#f97316" font-size="10" font-family="system-ui, sans-serif">Orange / Yellow</text>

      <line x1="345" y1="230" x2="540" y2="225" stroke="#22c55e" stroke-width="2"/>
      <text x="548" y="229" fill="#22c55e" font-size="10" font-family="system-ui, sans-serif">Green</text>

      <line x1="350" y1="240" x2="540" y2="255" stroke="#3b82f6" stroke-width="2"/>
      <text x="548" y="259" fill="#3b82f6" font-size="10" font-family="system-ui, sans-serif">Blue / Indigo</text>

      <line x1="355" y1="250" x2="540" y2="285" stroke="#a855f7" stroke-width="2.5"/>
      <text x="548" y="289" fill="#a855f7" font-size="11" font-weight="bold" font-family="system-ui, sans-serif">Violet (Most bent)</text>
    </svg>`;
  }

  // ==========================================
  // 2. CIRCUITS & ELECTRICITY
  // ==========================================
  if (textCorpus.includes('circuit') || textCorpus.includes('resistor') || textCorpus.includes('current') || textCorpus.includes('voltage') || textCorpus.includes('ohm')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
      <rect width="600" height="400" rx="16" fill="#0b1329"/>
      <text x="30" y="38" fill="#38bdf8" font-size="14" font-weight="bold" font-family="system-ui, sans-serif">CIRCUIT SCHEMATIC • ${cleanTopic.toUpperCase()}</text>
      <text x="570" y="38" text-anchor="end" fill="#94a3b8" font-size="12" font-family="monospace">${cleanFormula || 'V = I · R'}</text>
      <line x1="30" y1="52" x2="570" y2="52" stroke="#1e293b" stroke-width="1"/>

      <!-- Closed Loop Path -->
      <rect x="90" y="110" width="420" height="210" rx="8" fill="none" stroke="#475569" stroke-width="3"/>

      <!-- DC Battery Source -->
      <rect x="75" y="190" width="30" height="50" fill="#0b1329"/>
      <line x1="75" y1="200" x2="105" y2="200" stroke="#38bdf8" stroke-width="4"/>
      <line x1="82" y1="220" x2="98" y2="220" stroke="#64748b" stroke-width="3"/>
      <text x="55" y="205" fill="#38bdf8" font-size="14" font-weight="bold">+</text>
      <text x="55" y="225" fill="#64748b" font-size="14" font-weight="bold">-</text>
      <text x="40" y="250" fill="#94a3b8" font-size="11" font-family="system-ui, sans-serif">Voltage Source (V)</text>

      <!-- Resistor -->
      <rect x="230" y="95" width="140" height="30" fill="#0b1329"/>
      <path d="M 230 110 L 245 95 L 265 125 L 285 95 L 305 125 L 325 95 L 345 125 L 355 110 L 370 110" fill="none" stroke="#f59e0b" stroke-width="3" stroke-linejoin="round"/>
      <text x="300" y="80" text-anchor="middle" fill="#f59e0b" font-size="12" font-weight="bold" font-family="system-ui, sans-serif">Load Resistor (R)</text>

      <!-- Switch -->
      <rect x="260" y="305" width="80" height="30" fill="#0b1329"/>
      <line x1="260" y1="320" x2="295" y2="320" stroke="#22c55e" stroke-width="3"/>
      <line x1="295" y1="320" x2="330" y2="300" stroke="#22c55e" stroke-width="3"/>
      <circle cx="295" cy="320" r="4" fill="#22c55e"/>
      <circle cx="335" cy="320" r="4" fill="#22c55e"/>
      <text x="300" y="355" text-anchor="middle" fill="#22c55e" font-size="11" font-family="system-ui, sans-serif">Switch (Closed Circuit)</text>

      <!-- Current Flow Arrow -->
      <line x1="160" y1="110" x2="200" y2="110" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow)"/>
      <text x="180" y="95" fill="#38bdf8" font-size="11" font-weight="bold">Current I →</text>
    </svg>`;
  }

  // ==========================================
  // 3. GENETICS & DNA STRUCTURE
  // ==========================================
  if (textCorpus.includes('dna') || textCorpus.includes('helix') || textCorpus.includes('genetics') || textCorpus.includes('nucleotide') || textCorpus.includes('chromosome')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
      <rect width="600" height="400" rx="16" fill="#09131e"/>
      <text x="30" y="38" fill="#38bdf8" font-size="14" font-weight="bold" font-family="system-ui, sans-serif">MOLECULAR GENETICS • ${cleanTopic.toUpperCase()}</text>
      <text x="570" y="38" text-anchor="end" fill="#94a3b8" font-size="12" font-family="monospace">Watson-Crick Model</text>
      <line x1="30" y1="52" x2="570" y2="52" stroke="#1e293b" stroke-width="1"/>

      <!-- Helical Strands (Left & Right) -->
      <path d="M 120 80 Q 200 130 120 180 T 120 280 T 120 380" fill="none" stroke="#38bdf8" stroke-width="5" stroke-linecap="round"/>
      <path d="M 280 80 Q 200 130 280 180 T 280 280 T 280 380" fill="none" stroke="#818cf8" stroke-width="5" stroke-linecap="round"/>

      <!-- Base Pairs (Hydrogen Bond Rungs) -->
      <!-- Rung 1: Adenine - Thymine -->
      <line x1="150" y1="110" x2="210" y2="110" stroke="#ef4444" stroke-width="3.5"/>
      <line x1="210" y1="110" x2="250" y2="110" stroke="#3b82f6" stroke-width="3.5"/>
      <circle cx="210" cy="110" r="3" fill="#f8fafc"/>

      <!-- Rung 2: Guanine - Cytosine -->
      <line x1="130" y1="160" x2="190" y2="160" stroke="#22c55e" stroke-width="3.5"/>
      <line x1="190" y1="160" x2="270" y2="160" stroke="#f59e0b" stroke-width="3.5"/>
      <circle cx="190" cy="160" r="3" fill="#f8fafc"/>

      <!-- Rung 3: Thymine - Adenine -->
      <line x1="135" y1="210" x2="200" y2="210" stroke="#3b82f6" stroke-width="3.5"/>
      <line x1="200" y1="210" x2="265" y2="210" stroke="#ef4444" stroke-width="3.5"/>
      <circle cx="200" cy="210" r="3" fill="#f8fafc"/>

      <!-- Rung 4: Cytosine - Guanine -->
      <line x1="140" y1="260" x2="195" y2="260" stroke="#f59e0b" stroke-width="3.5"/>
      <line x1="195" y1="260" x2="260" y2="260" stroke="#22c55e" stroke-width="3.5"/>
      <circle cx="195" cy="260" r="3" fill="#f8fafc"/>

      <!-- Base Pairing Legend Box -->
      <rect x="340" y="90" width="230" height="250" rx="12" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
      <text x="360" y="125" fill="#f8fafc" font-size="13" font-weight="bold" font-family="system-ui, sans-serif">Canonical Base Pairs:</text>

      <rect x="360" y="145" width="16" height="16" rx="4" fill="#ef4444"/>
      <text x="385" y="158" fill="#f8fafc" font-size="12" font-family="system-ui, sans-serif"><tspan font-weight="bold">Adenine (A)</tspan> pairs with <tspan fill="#3b82f6" font-weight="bold">Thymine (T)</tspan></text>
      <text x="385" y="174" fill="#94a3b8" font-size="10" font-family="monospace">2 Hydrogen Bonds (A = T)</text>

      <rect x="360" y="200" width="16" height="16" rx="4" fill="#22c55e"/>
      <text x="385" y="213" fill="#f8fafc" font-size="12" font-family="system-ui, sans-serif"><tspan font-weight="bold">Guanine (G)</tspan> pairs with <tspan fill="#f59e0b" font-weight="bold">Cytosine (C)</tspan></text>
      <text x="385" y="229" fill="#94a3b8" font-size="10" font-family="monospace">3 Hydrogen Bonds (G ≡ C)</text>

      <line x1="360" y1="250" x2="550" y2="250" stroke="#1e293b" stroke-width="1"/>
      <text x="360" y="280" fill="#38bdf8" font-size="11" font-weight="bold">Sugar-Phosphate Backbone (5&apos; → 3&apos;)</text>
      <text x="360" y="300" fill="#64748b" font-size="10">Antiparallel Complementary Double Helix</text>
    </svg>`;
  }

  // ==========================================
  // 4. BIOLOGY - ANATOMY & CELL BIOLOGY
  // ==========================================
  if (textCorpus.includes('heart') || textCorpus.includes('cardiac') || textCorpus.includes('blood') || textCorpus.includes('cell') || textCorpus.includes('organ') || textCorpus.includes('mitochondria') || textCorpus.includes('photosynthesis')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
      <rect width="600" height="400" rx="16" fill="#0f172a"/>
      <text x="30" y="38" fill="#38bdf8" font-size="14" font-weight="bold" font-family="system-ui, sans-serif">BIOLOGICAL ANATOMY • ${cleanTopic.toUpperCase()}</text>
      <text x="570" y="38" text-anchor="end" fill="#94a3b8" font-size="12" font-family="monospace">Physiological Systems</text>
      <line x1="30" y1="52" x2="570" y2="52" stroke="#1e293b" stroke-width="1"/>

      <!-- Central Organ / Cell Body -->
      <ellipse cx="230" cy="220" rx="140" ry="110" fill="#1e293b" stroke="#38bdf8" stroke-width="2.5"/>
      <ellipse cx="230" cy="220" rx="120" ry="90" fill="#0f172a" stroke="#475569" stroke-width="1" stroke-dasharray="4 3"/>

      <!-- Internal Chambers / Organelles -->
      <!-- Left Chamber -->
      <rect x="130" y="160" width="80" height="60" rx="8" fill="#3b82f6" fill-opacity="0.25" stroke="#3b82f6" stroke-width="1.5"/>
      <text x="170" y="195" text-anchor="middle" fill="#60a5fa" font-size="11" font-weight="bold">Inflow / Atrium</text>

      <!-- Right Chamber -->
      <rect x="250" y="160" width="80" height="60" rx="8" fill="#ef4444" fill-opacity="0.25" stroke="#ef4444" stroke-width="1.5"/>
      <text x="290" y="195" text-anchor="middle" fill="#f87171" font-size="11" font-weight="bold">Outflow / Ventricle</text>

      <!-- Core Synthesis Node -->
      <circle cx="230" cy="265" r="26" fill="#10b981" fill-opacity="0.3" stroke="#10b981" stroke-width="2"/>
      <text x="230" y="270" text-anchor="middle" fill="#34d399" font-size="10" font-weight="bold">ATP / Power</text>

      <!-- Structural Callouts (Right Column) -->
      <rect x="390" y="80" width="180" height="270" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
      <text x="405" y="110" fill="#f8fafc" font-size="13" font-weight="bold">Key Structural Parts:</text>

      <circle cx="415" cy="140" r="5" fill="#3b82f6"/>
      <text x="430" y="144" fill="#f8fafc" font-size="11">Deoxygenated Pathway</text>

      <circle cx="415" cy="180" r="5" fill="#ef4444"/>
      <text x="430" y="184" fill="#f8fafc" font-size="11">Oxygenated Systemic Flow</text>

      <circle cx="415" cy="220" r="5" fill="#10b981"/>
      <text x="430" y="224" fill="#f8fafc" font-size="11">Active Transport Enzymes</text>

      <circle cx="415" cy="260" r="5" fill="#fbbf24"/>
      <text x="430" y="264" fill="#f8fafc" font-size="11">Membrane Selective Barrier</text>

      <line x1="405" y1="285" x2="555" y2="285" stroke="#334155" stroke-width="1"/>
      <text x="405" y="310" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Preserves Biological Balance</text>
    </svg>`;
  }

  // ==========================================
  // 5. MATHEMATICS - GEOMETRY & CALCULUS
  // ==========================================
  if (textCorpus.includes('triangle') || textCorpus.includes('pythagor') || textCorpus.includes('circle') || textCorpus.includes('geometry') || textCorpus.includes('derivative') || textCorpus.includes('integral') || textCorpus.includes('calculus')) {
    const isPythagoras = textCorpus.includes('pythagor') || textCorpus.includes('triangle');
    if (isPythagoras) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
        <rect width="600" height="400" rx="16" fill="#0b1120"/>
        <text x="30" y="38" fill="#38bdf8" font-size="14" font-weight="bold" font-family="system-ui, sans-serif">GEOMETRIC PROOF • ${cleanTopic.toUpperCase()}</text>
        <text x="570" y="38" text-anchor="end" fill="#94a3b8" font-size="12" font-family="monospace">${cleanFormula || 'a² + b² = c²'}</text>
        <line x1="30" y1="52" x2="570" y2="52" stroke="#1e293b" stroke-width="1"/>

        <!-- Right Angle Triangle -->
        <polygon points="180,290 380,290 180,120" fill="#1e293b" stroke="#38bdf8" stroke-width="3" stroke-linejoin="round"/>
        <!-- Right angle symbol -->
        <rect x="180" y="270" width="20" height="20" fill="none" stroke="#64748b" stroke-width="2"/>

        <!-- Side a (vertical) -->
        <text x="145" y="210" fill="#f472b6" font-size="16" font-weight="bold">a</text>
        <!-- Square a^2 on side a -->
        <rect x="60" y="120" width="110" height="170" fill="#f472b6" fill-opacity="0.15" stroke="#f472b6" stroke-width="2" stroke-dasharray="4 3"/>
        <text x="115" y="210" text-anchor="middle" fill="#f472b6" font-size="14" font-weight="bold">Area a²</text>

        <!-- Side b (horizontal) -->
        <text x="275" y="325" fill="#34d399" font-size="16" font-weight="bold">b</text>
        <!-- Square b^2 on side b -->
        <rect x="180" y="300" width="200" height="70" fill="#34d399" fill-opacity="0.15" stroke="#34d399" stroke-width="2" stroke-dasharray="4 3"/>
        <text x="280" y="345" text-anchor="middle" fill="#34d399" font-size="14" font-weight="bold">Area b²</text>

        <!-- Side c (hypotenuse) -->
        <text x="310" y="190" fill="#fbbf24" font-size="16" font-weight="bold">c (Hypotenuse)</text>

        <!-- Proof Card -->
        <rect x="410" y="90" width="165" height="180" rx="10" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
        <text x="425" y="120" fill="#f8fafc" font-size="13" font-weight="bold">Euclidean Relation:</text>
        <text x="425" y="150" fill="#fbbf24" font-size="16" font-weight="bold" font-family="monospace">c = √(a² + b²)</text>
        <text x="425" y="180" fill="#94a3b8" font-size="11">Leg a: Perpendicular</text>
        <text x="425" y="200" fill="#94a3b8" font-size="11">Leg b: Base</text>
        <text x="425" y="220" fill="#94a3b8" font-size="11">c: Longest Side</text>
      </svg>`;
    }

    // Calculus / Coordinate Curve
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
      <rect width="600" height="400" rx="16" fill="#0b1120"/>
      <text x="30" y="38" fill="#38bdf8" font-size="14" font-weight="bold" font-family="system-ui, sans-serif">MATHEMATICAL GRAPH • ${cleanTopic.toUpperCase()}</text>
      <text x="570" y="38" text-anchor="end" fill="#94a3b8" font-size="12" font-family="monospace">${cleanFormula || 'f(x) = x²'}</text>
      <line x1="30" y1="52" x2="570" y2="52" stroke="#1e293b" stroke-width="1"/>

      <!-- Cartesian Axes -->
      <line x1="80" y1="340" x2="540" y2="340" stroke="#64748b" stroke-width="2"/>
      <line x1="120" y1="80" x2="120" y2="360" stroke="#64748b" stroke-width="2"/>
      <text x="545" y="345" fill="#94a3b8" font-size="12" font-weight="bold">x</text>
      <text x="115" y="75" fill="#94a3b8" font-size="12" font-weight="bold">y = f(x)</text>

      <!-- Smooth Curve -->
      <path d="M 120 330 Q 240 320 340 180 T 520 90" fill="none" stroke="#38bdf8" stroke-width="3.5"/>

      <!-- Tangent Line at Point P -->
      <circle cx="340" cy="180" r="5" fill="#f43f5e"/>
      <line x1="220" y1="260" x2="440" y2="110" stroke="#f43f5e" stroke-width="2" stroke-dasharray="6 3"/>
      <text x="355" y="180" fill="#f43f5e" font-size="12" font-weight="bold">P(x, y)</text>
      <text x="355" y="198" fill="#fda4af" font-size="11">Tangent Slope: f&apos;(x)</text>
    </svg>`;
  }

  // ==========================================
  // 6. COMPUTER SCIENCE & ALGORITHMS / DATA STRUCTURES
  // ==========================================
  if (textCorpus.includes('tree') || textCorpus.includes('sort') || textCorpus.includes('array') || textCorpus.includes('algorithm') || textCorpus.includes('graph') || textCorpus.includes('stack') || textCorpus.includes('binary')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
      <rect width="600" height="400" rx="16" fill="#0f172a"/>
      <text x="30" y="38" fill="#38bdf8" font-size="14" font-weight="bold" font-family="system-ui, sans-serif">DATA STRUCTURE &amp; ALGORITHM • ${cleanTopic.toUpperCase()}</text>
      <text x="570" y="38" text-anchor="end" fill="#94a3b8" font-size="12" font-family="monospace">O(log n) / O(n)</text>
      <line x1="30" y1="52" x2="570" y2="52" stroke="#1e293b" stroke-width="1"/>

      <!-- Tree Nodes -->
      <!-- Root -->
      <circle cx="280" cy="100" r="24" fill="#38bdf8" stroke="#0284c7" stroke-width="3"/>
      <text x="280" y="106" text-anchor="middle" fill="#0f172a" font-size="14" font-weight="bold">Root</text>

      <!-- Connecting Edges -->
      <line x1="265" y1="120" x2="175" y2="185" stroke="#475569" stroke-width="2.5"/>
      <line x1="295" y1="120" x2="385" y2="185" stroke="#475569" stroke-width="2.5"/>

      <!-- Level 1 Nodes -->
      <circle cx="160" cy="200" r="22" fill="#818cf8" stroke="#4f46e5" stroke-width="2.5"/>
      <text x="160" y="205" text-anchor="middle" fill="#ffffff" font-size="12" font-weight="bold">Left</text>

      <circle cx="400" cy="200" r="22" fill="#818cf8" stroke="#4f46e5" stroke-width="2.5"/>
      <text x="400" y="205" text-anchor="middle" fill="#ffffff" font-size="12" font-weight="bold">Right</text>

      <!-- Level 2 Edges & Leaves -->
      <line x1="145" y1="218" x2="95" y2="280" stroke="#334155" stroke-width="2"/>
      <line x1="175" y1="218" x2="225" y2="280" stroke="#334155" stroke-width="2"/>
      <line x1="385" y1="218" x2="335" y2="280" stroke="#334155" stroke-width="2"/>
      <line x1="415" y1="218" x2="465" y2="280" stroke="#334155" stroke-width="2"/>

      <circle cx="85" cy="295" r="18" fill="#334155" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="85" y="299" text-anchor="middle" fill="#e2e8f0" font-size="11">0</text>

      <circle cx="235" cy="295" r="18" fill="#334155" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="235" y="299" text-anchor="middle" fill="#e2e8f0" font-size="11">1</text>

      <circle cx="325" cy="295" r="18" fill="#334155" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="325" y="299" text-anchor="middle" fill="#e2e8f0" font-size="11">2</text>

      <circle cx="475" cy="295" r="18" fill="#334155" stroke="#38bdf8" stroke-width="1.5"/>
      <text x="475" y="299" text-anchor="middle" fill="#e2e8f0" font-size="11">3</text>

      <!-- Array Memory Bar (Bottom) -->
      <rect x="110" y="340" width="340" height="35" rx="6" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>
      <text x="140" y="362" fill="#38bdf8" font-size="11" font-family="monospace">[0]</text>
      <line x1="175" y1="340" x2="175" y2="375" stroke="#475569" stroke-width="1"/>
      <text x="210" y="362" fill="#38bdf8" font-size="11" font-family="monospace">[1]</text>
      <line x1="250" y1="340" x2="250" y2="375" stroke="#475569" stroke-width="1"/>
      <text x="285" y="362" fill="#38bdf8" font-size="11" font-family="monospace">[2]</text>
      <line x1="325" y1="340" x2="325" y2="375" stroke="#475569" stroke-width="1"/>
      <text x="360" y="362" fill="#38bdf8" font-size="11" font-family="monospace">[3]</text>
      <line x1="400" y1="340" x2="400" y2="375" stroke="#475569" stroke-width="1"/>
      <text x="425" y="362" fill="#94a3b8" font-size="11" font-family="monospace">...</text>
    </svg>`;
  }

  // ==========================================
  // 7. UNIVERSAL TOPIC ARCHITECTURE DIAGRAM
  // (Applies to History, Geography, Economics, Literature, Chemistry, etc.)
  // ==========================================
  const bullet1 = noteBullets[0] ? truncateText(noteBullets[0], 36) : 'Fundamental definition & core mechanism';
  const bullet2 = noteBullets[1] ? truncateText(noteBullets[1], 36) : 'Key functional attributes & components';
  const bullet3 = noteBullets[2] ? truncateText(noteBullets[2], 36) : 'Practical application & observed effect';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#020617"/>
      </linearGradient>
      <linearGradient id="coreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38bdf8"/>
        <stop offset="100%" stop-color="#0284c7"/>
      </linearGradient>
    </defs>
    <rect width="600" height="400" rx="16" fill="url(#bgGrad)"/>
    <text x="30" y="38" fill="#38bdf8" font-size="13" font-weight="bold" font-family="system-ui, sans-serif" letter-spacing="1">CONCEPT BLUEPRINT • ${cleanTopic.toUpperCase()}</text>
    ${cleanFormula ? `<text x="570" y="38" text-anchor="end" fill="#fbbf24" font-size="12" font-family="monospace">${cleanFormula}</text>` : ''}
    <line x1="30" y1="52" x2="570" y2="52" stroke="#1e293b" stroke-width="1"/>

    <!-- Central Topic Core Hub -->
    <rect x="40" y="130" width="200" height="150" rx="14" fill="#1e293b" stroke="#38bdf8" stroke-width="2.5"/>
    <rect x="55" y="145" width="170" height="32" rx="6" fill="url(#coreGrad)"/>
    <text x="140" y="166" text-anchor="middle" fill="#0f172a" font-size="12" font-weight="bold" font-family="system-ui, sans-serif">${truncateText(cleanTopic, 18)}</text>
    <text x="140" y="200" text-anchor="middle" fill="#e2e8f0" font-size="11" font-family="system-ui, sans-serif">Central Pillar</text>
    <text x="140" y="220" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif">Verified Knowledge Base</text>
    <circle cx="140" cy="250" r="12" fill="#38bdf8" fill-opacity="0.2"/>
    <circle cx="140" cy="250" r="5" fill="#38bdf8"/>

    <!-- Connecting Relationship Arrows -->
    <path d="M 240 160 L 310 120" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4 2"/>
    <path d="M 240 205 L 310 205" fill="none" stroke="#818cf8" stroke-width="2" stroke-dasharray="4 2"/>
    <path d="M 240 250 L 310 290" fill="none" stroke="#34d399" stroke-width="2" stroke-dasharray="4 2"/>

    <!-- Component 1 -->
    <rect x="310" y="85" width="250" height="65" rx="10" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
    <text x="325" y="108" fill="#38bdf8" font-size="11" font-weight="bold" font-family="system-ui, sans-serif">01 • Core Definition</text>
    <text x="325" y="130" fill="#f8fafc" font-size="10" font-family="system-ui, sans-serif">${escapeXml(bullet1)}</text>

    <!-- Component 2 -->
    <rect x="310" y="170" width="250" height="65" rx="10" fill="#1e293b" stroke="#818cf8" stroke-width="1.5"/>
    <text x="325" y="193" fill="#818cf8" font-size="11" font-weight="bold" font-family="system-ui, sans-serif">02 • Key Attributes &amp; Rules</text>
    <text x="325" y="215" fill="#f8fafc" font-size="10" font-family="system-ui, sans-serif">${escapeXml(bullet2)}</text>

    <!-- Component 3 -->
    <rect x="310" y="255" width="250" height="65" rx="10" fill="#1e293b" stroke="#34d399" stroke-width="1.5"/>
    <text x="325" y="278" fill="#34d399" font-size="11" font-weight="bold" font-family="system-ui, sans-serif">03 • Observations &amp; Evidence</text>
    <text x="325" y="300" fill="#f8fafc" font-size="10" font-family="system-ui, sans-serif">${escapeXml(bullet3)}</text>

    <!-- Footer Bar -->
    <rect x="40" y="340" width="520" height="32" rx="8" fill="#0f172a" stroke="#334155" stroke-width="1"/>
    <text x="60" y="361" fill="#94a3b8" font-size="11" font-family="system-ui, sans-serif">Aristotle Visual Study Matrix • Comprehensive Concept Breakdown</text>
  </svg>`;
}
