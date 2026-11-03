import React, { useMemo } from 'react';
import katex from 'katex';

/**
 * Normalizes mathematical, scientific, physical, chemical, or quantitative expressions
 * into journal-grade LaTeX:
 * - Strips wrapping delimiters ($$, $, \[, \])
 * - Heuristically converts bracketed nested arrays (e.g. [[1, 2], [3, 4]]) into bmatrix
 * - Fixes single-backslash or newline row breaks inside matrix / array / cases environments
 * - Normalizes unicode math / scientific symbols
 */
function normalizeToLatex(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let clean = raw.trim();

  // Strip wrapping delimiters
  if (clean.startsWith('$$') && clean.endsWith('$$')) {
    clean = clean.slice(2, -2).trim();
  } else if (clean.startsWith('$') && clean.endsWith('$')) {
    clean = clean.slice(1, -1).trim();
  } else if (clean.startsWith('\\[') && clean.endsWith('\\]')) {
    clean = clean.slice(2, -2).trim();
  } else if (clean.startsWith('\\(') && clean.endsWith('\\)')) {
    clean = clean.slice(2, -2).trim();
  }

  // Remove any rogue/unmatched '$' signs inside formulas that cause KaTeX crashes
  // e.g. "k \times [matrix] = ... \\ $3 \times [matrix]$" -> remove the '$'
  clean = clean.replaceAll('$', '');

  // Strip rogue escaped math delimiters inside
  clean = clean.replaceAll('\\[', '').replaceAll('\\]', '');

  // Handle plain bracketed matrices, e.g. "[[1, 2], [3, 4]]" or "[[a, b], [c, d]]"
  if (/^\s*\[\s*\[.*\]\s*\]\s*$/.test(clean)) {
    try {
      const rows = clean
        .trim()
        .slice(1, -1)
        .split(/\],\s*\[/)
        .map((row) => row.replace(/[\[\]]/g, '').trim())
        .map((row) => row.split(/,\s*|\s+/).join(' & '));
      return `\\begin{bmatrix} ${rows.join(' \\\\ ')} \\end{bmatrix}`;
    } catch {
      // fallback
    }
  }

  // Fix matrix row breaks if single backslash or newline was unescaped in transit
  if (/\\begin\{(?:matrix|pmatrix|bmatrix|vmatrix|Vmatrix|cases|aligned|array)\}/.test(clean)) {
    clean = clean
      .replace(/([^\\])\n+/g, '$1 \\\\ ')
      .replace(/([^\\])\\\s+(?![a-zA-Z])/g, '$1 \\\\ ');
  } else if (
    clean.includes('\\\\') &&
    !clean.startsWith('\\begin{aligned}') &&
    !clean.startsWith('\\begin{matrix}') &&
    !clean.startsWith('\\begin{pmatrix}') &&
    !clean.startsWith('\\begin{bmatrix}') &&
    !clean.startsWith('\\begin{cases}')
  ) {
    // Wrap stacked multiline equations in aligned so KaTeX renders them cleanly
    clean = `\\begin{aligned} ${clean} \\end{aligned}`;
  }

  // Unicode replacements for quick plain text inputs (if not strictly LaTeX)
  let latex = clean
    // Superscripts
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/⁴/g, '^4')
    .replace(/ⁿ/g, '^n')
    .replace(/⁺/g, '^+')
    .replace(/⁻/g, '^-')
    // Subscripts
    .replace(/₀/g, '_0')
    .replace(/₁/g, '_1')
    .replace(/₂/g, '_2')
    .replace(/₃/g, '_3')
    // Greek characters
    .replace(/θ/g, '\\theta ')
    .replace(/π/g, '\\pi ')
    .replace(/α/g, '\\alpha ')
    .replace(/β/g, '\\beta ')
    .replace(/γ/g, '\\gamma ')
    .replace(/λ/g, '\\lambda ')
    .replace(/ε/g, '\\varepsilon ')
    .replace(/μ/g, '\\mu ')
    .replace(/Δ/g, '\\Delta ')
    .replace(/Σ/g, '\\Sigma ')
    // Math operators & symbols
    .replace(/√\s*\(([^)]+)\)/g, '\\sqrt{$1}')
    .replace(/√([a-zA-Z0-9]+)/g, '\\sqrt{$1}')
    .replace(/±/g, '\\pm ')
    .replace(/·/g, '\\cdot ')
    .replace(/×/g, '\\times ')
    .replace(/÷/g, '\\div ')
    .replace(/≤/g, '\\le ')
    .replace(/≥/g, '\\ge ')
    .replace(/≠/g, '\\ne ')
    .replace(/≈/g, '\\approx ')
    .replace(/∞/g, '\\infty ')
    .replace(/∫/g, '\\int ')
    .replace(/∪/g, '\\cup ')
    .replace(/∩/g, '\\cap ')
    .replace(/→/g, '\\to ');

  // Normalize basic fraction expressions like "1/2" when not already in LaTeX
  if (!latex.includes('\\frac') && /(^|\s)(\d+)\/(\d+)($|\s)/.test(latex)) {
    latex = latex.replace(/(^|\s)(\d+)\/(\d+)($|\s)/g, '$1\\frac{$2}{$3}$4');
  }

  return latex;
}

/**
 * MathFormula Component
 * Renders mathematical, physical, chemical, and scientific equations with KaTeX.
 * Supports all subjects uniformly: Matrix, Calculus, Physics, Chemistry (\ce),
 * Statistics, Economics, and Algebra.
 */
export function MathFormula({ formula = '', className = '', displayMode = true }) {
  const html = useMemo(() => {
    if (!formula || typeof formula !== 'string') return null;

    const latex = normalizeToLatex(formula);
    if (!latex) return null;

    try {
      return katex.renderToString(latex, {
        throwOnError: false,
        displayMode,
        strict: false,
        trust: true,
      });
    } catch {
      return null;
    }
  }, [formula, displayMode]);

  if (!html) {
    return <span className={`font-serif ${className}`}>{formula}</span>;
  }

  return (
    <span
      className={`${displayMode ? 'block w-full overflow-x-auto text-center py-1.5' : 'inline-block'} select-text ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
