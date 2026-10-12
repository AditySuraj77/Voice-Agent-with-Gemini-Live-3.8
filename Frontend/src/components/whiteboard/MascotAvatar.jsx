import React, { useEffect, useState } from 'react';

/**
 * Animated Aristotle Apple Mascot
 * Responds to conversation states: 'idle' | 'listening' | 'thinking' | 'speaking' | 'celebrating'
 */
export function MascotAvatar({ state = 'idle', size = 'normal' }) {
  const [blink, setBlink] = useState(false);
  const [talkFrame, setTalkFrame] = useState(0);

  // Periodic random blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 180);
    }, 3200);
    return () => clearInterval(blinkInterval);
  }, []);

  // Mouth talking animation when speaking
  useEffect(() => {
    if (state !== 'speaking') {
      setTalkFrame(0);
      return;
    }
    const talkInterval = setInterval(() => {
      setTalkFrame((prev) => (prev + 1) % 4);
    }, 140);
    return () => clearInterval(talkInterval);
  }, [state]);

  const isSmall = size === 'small';
  const width = isSmall ? 48 : 72;
  const height = isSmall ? 48 : 72;

  return (
    <div className="relative inline-flex items-center justify-center select-none" data-testid="mascot-avatar">
      <svg
        width={width}
        height={height}
        viewBox="0 0 100 100"
        className={`transition-transform duration-300 ${
          state === 'speaking' ? 'scale-105' : state === 'listening' ? 'scale-100' : 'hover:scale-105'
        }`}
      >
        {/* Apple Leaf & Stem */}
        <path
          d="M 50 18 Q 49 8 52 4 Q 55 7 53 18 Z"
          fill="#5a3d28"
        />
        <path
          d="M 53 12 Q 68 8 68 18 Q 60 22 53 14 Z"
          fill="#48bb78"
          className="transition-transform duration-500"
        />

        {/* Apple Body */}
        <defs>
          <radialGradient id="appleGradient" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ff6554" />
            <stop offset="70%" stopColor="#e53e3e" />
            <stop offset="100%" stopColor="#c53030" />
          </radialGradient>
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#742a2a" floodOpacity="0.25" />
          </filter>
        </defs>

        <path
          d="M 50 22 
             C 65 14, 88 18, 90 42 
             C 92 68, 76 90, 53 92 
             C 51 92, 49 92, 47 92 
             C 24 90, 8 68, 10 42 
             C 12 18, 35 14, 50 22 Z"
          fill="url(#appleGradient)"
          filter="url(#shadow)"
        />

        {/* Highlight sheen */}
        <path
          d="M 22 34 Q 30 24 44 23 Q 32 30 26 44 Z"
          fill="#ffffff"
          opacity="0.3"
        />

        {/* Eyes */}
        {blink ? (
          // Blinking Slit Eyes
          <g stroke="#2d3748" strokeWidth="3" strokeLinecap="round">
            <line x1="33" y1="46" x2="43" y2="46" />
            <line x1="57" y1="46" x2="67" y2="46" />
          </g>
        ) : state === 'listening' ? (
          // Big attentive listening eyes
          <g>
            <circle cx="38" cy="45" r="6.5" fill="#1a202c" />
            <circle cx="40" cy="43" r="2.5" fill="#ffffff" />
            <circle cx="62" cy="45" r="6.5" fill="#1a202c" />
            <circle cx="64" cy="43" r="2.5" fill="#ffffff" />
          </g>
        ) : state === 'thinking' ? (
          // Pondering / looking upwards eyes
          <g>
            <circle cx="38" cy="42" r="5" fill="#1a202c" />
            <circle cx="40" cy="40" r="2" fill="#ffffff" />
            <circle cx="62" cy="42" r="5" fill="#1a202c" />
            <circle cx="64" cy="40" r="2" fill="#ffffff" />
            <path d="M 33 35 Q 38 32 43 35" stroke="#4a5568" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M 57 34 Q 62 31 67 34" stroke="#4a5568" strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>
        ) : (
          // Friendly open eyes
          <g>
            <circle cx="38" cy="46" r="5.5" fill="#1a202c" />
            <circle cx="40" cy="44" r="2" fill="#ffffff" />
            <circle cx="62" cy="46" r="5.5" fill="#1a202c" />
            <circle cx="64" cy="44" r="2" fill="#ffffff" />
          </g>
        )}

        {/* Rosy Cheeks */}
        <circle cx="26" cy="54" r="5" fill="#feb2b2" opacity="0.6" />
        <circle cx="74" cy="54" r="5" fill="#feb2b2" opacity="0.6" />

        {/* Mouth */}
        {state === 'speaking' ? (
          talkFrame === 0 ? (
            <ellipse cx="50" cy="62" rx="4.5" ry="5.5" fill="#2d3748" />
          ) : talkFrame === 1 ? (
            <path d="M 44 60 Q 50 67 56 60 Z" fill="#2d3748" />
          ) : talkFrame === 2 ? (
            <ellipse cx="50" cy="63" rx="6" ry="7" fill="#2d3748" />
          ) : (
            <path d="M 43 61 Q 50 69 57 61 Z" fill="#2d3748" />
          )
        ) : state === 'listening' ? (
          <path d="M 46 62 Q 50 65 54 62" stroke="#2d3748" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        ) : (
          // Sweet gentle smile
          <path d="M 44 60 Q 50 67 56 60" stroke="#2d3748" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        )}
      </svg>

      {/* Pulsing glow ring when listening */}
      {state === 'listening' && (
        <span className="absolute -inset-1 rounded-full border border-rose-400/40 animate-ping pointer-events-none" />
      )}
    </div>
  );
}
