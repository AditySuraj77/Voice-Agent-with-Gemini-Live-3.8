import React, { useState, useEffect } from 'react';

/**
 * TypewriterText
 * Smoothly streams text character by character or word by word
 * to create a live handwritten / ink typewriter effect.
 */
export function TypewriterText({ text = '', speed = 18, onComplete, className = '' }) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    // If text is empty, reset
    if (!text) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }

    // If text length is short (<= 3 chars, e.g. bullet or short tag), render immediately
    if (text.length <= 4) {
      setDisplayedText(text);
      setIsTyping(false);
      if (onComplete) onComplete();
      return;
    }

    let currentIndex = 0;
    setIsTyping(true);
    setDisplayedText('');

    // Stream chunks of 1-3 characters at a time for natural ink stroke feeling
    const interval = setInterval(() => {
      currentIndex += 2;
      if (currentIndex >= text.length) {
        setDisplayedText(text);
        setIsTyping(false);
        clearInterval(interval);
        if (onComplete) onComplete();
      } else {
        setDisplayedText(text.slice(0, currentIndex));
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span className={className}>
      {displayedText}
      {isTyping && (
        <span className="inline-block w-1.5 h-3.5 bg-amber-600/70 ml-0.5 align-middle animate-pulse" />
      )}
    </span>
  );
}
