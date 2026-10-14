import React, { useMemo } from 'react';
import katex from 'katex';

/**
 * MathFormula Component
 * Renders mathematical and scientific equations with KaTeX.
 * Handles both raw LaTeX and common plain-text/Unicode math syntax
 * (e.g., superscripts, square roots, greek symbols, fractions).
 */
export function MathFormula({ formula = '', className = '', displayMode = true }) {
  const html = useMemo(() => {
    if (!formula || typeof formula !== 'string') return null;

    let clean = formula.trim();

    // Remove wrapping $$ or $ if present
    if (clean.startsWith('$$') && clean.endsWith('$$')) {
      clean = clean.slice(2, -2).trim();
    } else if (clean.startsWith('$') && clean.endsWith('$')) {
      clean = clean.slice(1, -1).trim();
    }

    // Convert common unicode symbols to LaTeX equivalents if not already LaTeX
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

    // Normalize basic fraction expressions like "1/2 * base * height"
    latex = latex.replace(/(\d+)\/(\d+)/g, '\\frac{$1}{$2}');

    try {
      return katex.renderToString(latex, {
        throwOnError: false,
        displayMode,
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
      className={`inline-block select-text ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
