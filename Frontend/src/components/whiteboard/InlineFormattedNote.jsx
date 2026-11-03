import React from 'react';
import { MathFormula } from './MathFormula.jsx';

/**
 * InlineFormattedNote Component
 * Universal educational text and formula renderer.
 * Safely parses and renders mixed prose with:
 * - Block LaTeX math ($$ ... $$, \[ ... \], \begin{matrix} ... \end{matrix})
 * - Inline LaTeX math ($ ... $, \( ... \))
 * - Chemical equations (\ce{...})
 * - Markdown bold (**...**)
 * - Monospace code (`...`)
 * - Universal superscripts / subscripts / symbols
 * Works universally across Mathematics, Physics, Chemistry, Biology, Economics, and Engineering.
 */
export function InlineFormattedNote({ text = '', isLatest = false }) {
  if (!text || typeof text !== 'string') return null;

  const trimmed = text.trim();

  // 1. Direct block equations or matrix environments
  if (
    (trimmed.startsWith('$$') && trimmed.endsWith('$$')) ||
    (trimmed.startsWith('\\[') && trimmed.endsWith('\\]')) ||
    /^\\begin\{(?:matrix|pmatrix|bmatrix|vmatrix|Vmatrix|cases|aligned|array)\}/.test(trimmed)
  ) {
    return <MathFormula formula={trimmed} displayMode={true} />;
  }

  // 2. Direct inline equations or chemistry expressions
  if (
    (trimmed.startsWith('$') && trimmed.endsWith('$') && !trimmed.slice(1, -1).includes('$')) ||
    (trimmed.startsWith('\\(') && trimmed.endsWith('\\)')) ||
    /^\\ce\{.*\}$/.test(trimmed)
  ) {
    return <MathFormula formula={trimmed} displayMode={false} />;
  }

  // 3. Pure formula check (e.g. "E = mc^2", "a^2 + b^2 = c^2", "H2O -> 2H + O")
  // If it contains an equals sign, arrow, or common math symbols and no long sentences
  const isEquationLike =
    (trimmed.includes('=') || trimmed.includes('→') || trimmed.includes('->')) &&
    !/[a-zA-Z]{4,}\s+[a-zA-Z]{4,}\s+[a-zA-Z]{4,}/.test(trimmed) &&
    /[\+\-\*\/\^\²\³\√\(\)\_\{\}\\]/.test(trimmed);

  if (isEquationLike) {
    return <MathFormula formula={trimmed} displayMode={false} />;
  }

  // 4. Mixed text with embedded LaTeX, chemical formulas, bolding, and code tokens
  const regex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\begin\{(?:matrix|pmatrix|bmatrix|vmatrix|Vmatrix|cases|aligned|array)\}[\s\S]*?\\end\{(?:matrix|pmatrix|bmatrix|vmatrix|Vmatrix|cases|aligned|array)\}|\\ce\{[^}]+\}|\$[^$\r\n]+\$|\\\([^)]+\\\)|\*\*[^*]+\*\*|`[^`]+`|\b[0-9]*[a-zA-Z](?:\^[0-9a-zA-Z]+|[²³⁴ⁿ])\b)/g;

  const tokens = text.split(regex);

  return (
    <span className="font-serif leading-relaxed text-stone-800 select-text">
      {tokens.map((token, index) => {
        if (!token) return null;

        // Block LaTeX ($$...$$, \[...\], \begin{...}...\end{...})
        if (
          (token.startsWith('$$') && token.endsWith('$$') && token.length > 3) ||
          (token.startsWith('\\[') && token.endsWith('\\]')) ||
          token.startsWith('\\begin{')
        ) {
          return (
            <span key={index} className="block my-2 text-center">
              <MathFormula formula={token} displayMode={true} />
            </span>
          );
        }

        // Inline LaTeX ($...$, \(...\))
        if (
          (token.startsWith('$') && token.endsWith('$') && token.length > 2) ||
          (token.startsWith('\\(') && token.endsWith('\\)'))
        ) {
          const formula = token.startsWith('$') ? token.slice(1, -1) : token.slice(2, -2);
          return <MathFormula key={index} formula={formula} displayMode={false} className="mx-1" />;
        }

        // Chemistry formula \ce{...}
        if (token.startsWith('\\ce{') && token.endsWith('}')) {
          return <MathFormula key={index} formula={token} displayMode={false} className="mx-1" />;
        }

        // Markdown bold **text**
        if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
          return (
            <strong key={index} className="font-bold text-stone-900 font-sans">
              {token.slice(2, -2)}
            </strong>
          );
        }

        // Inline code `...`
        if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
          return (
            <code key={index} className="px-1.5 py-0.5 mx-0.5 rounded bg-stone-200/80 font-mono text-xs text-stone-900">
              {token.slice(1, -1)}
            </code>
          );
        }

        // Isolated math exponent like x^2, x², 5x^4
        if (/^[0-9]*[a-zA-Z](\^[0-9a-zA-Z]+|[²³⁴ⁿ])$/.test(token)) {
          return <MathFormula key={index} formula={token} displayMode={false} className="mx-0.5" />;
        }

        // Normal text
        return <span key={index}>{token}</span>;
      })}
    </span>
  );
}
