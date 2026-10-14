import React from 'react';
import { MathFormula } from './MathFormula.jsx';

/**
 * InlineFormattedNote Component
 * Safely renders whiteboard notes containing both English text and math expressions.
 * Solves the KaTeX math-mode bug where English sentences had all spaces stripped
 * (e.g., "Power to which the variable is raised" becoming "Powertowhichthevariableisraised").
 */
export function InlineFormattedNote({ text = '', isLatest = false }) {
  if (!text || typeof text !== 'string') return null;

  // 1. If wrapped in $...$ or $$...$$, render directly as math
  if ((text.startsWith('$') && text.endsWith('$')) || (text.startsWith('$$') && text.endsWith('$$'))) {
    return <MathFormula formula={text} displayMode={false} />;
  }

  // 2. If it's purely a mathematical formula (e.g. "a^2 + b^2 = c^2" or "sin^2(x) + cos^2(x) = 1")
  // Check if it has no common English words (more than 3 consecutive letters forming words)
  const hasEnglishSentence = /[a-zA-Z]{3,}\s+[a-zA-Z]{3,}/.test(text);
  const isPureFormula = !hasEnglishSentence && /[\=\+\-\*\/\^\²\³\√\(\)]/.test(text);

  if (isPureFormula && (text.includes('=') || text.includes('->') || text.includes('→'))) {
    return <MathFormula formula={text} displayMode={false} />;
  }

  // 3. For mixed text (English explanation + bold labels + math symbols like x², x^2, 2x+3):
  // Split by markdown bold (**...**), LaTeX ($...$ or \(...\)), code (`...`), or simple algebraic tokens
  const tokens = text.split(/(\*\*[^*]+\*\*|\$[^\$]+\$|\\\([^\)]+\\\)|`[^`]+`|\b[a-zA-Z]\^[0-9a-zA-Z]+|\b[a-zA-Z][²³⁴ⁿ]|(?:[0-9]+[a-zA-Z]\^[0-9]+))/g);

  return (
    <span className="font-serif leading-relaxed text-stone-800 select-text">
      {tokens.map((token, index) => {
        if (!token) return null;

        // Markdown bold **text**
        if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
          return (
            <strong key={index} className="font-bold text-stone-900 font-sans">
              {token.slice(2, -2)}
            </strong>
          );
        }

        // LaTeX delimiter $...$
        if (token.startsWith('$') && token.endsWith('$')) {
          return <MathFormula key={index} formula={token.slice(1, -1)} displayMode={false} className="mx-1" />;
        }

        // LaTeX delimiter \(...\)
        if (token.startsWith('\\(') && token.endsWith('\\)')) {
          return <MathFormula key={index} formula={token.slice(2, -2)} displayMode={false} className="mx-1" />;
        }

        // Code delimiter `...`
        if (token.startsWith('`') && token.endsWith('`')) {
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

        // Normal text: preserves all whitespace and typography
        return <span key={index}>{token}</span>;
      })}
    </span>
  );
}
