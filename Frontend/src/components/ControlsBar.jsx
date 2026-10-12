import React, { useState } from 'react';
import { Mic, MicOff, ArrowUp, PhoneCall, PhoneOff, Volume2 } from 'lucide-react';

export function ControlsBar({
  sessionStatus,
  conversationState,
  isMuted,
  inputVolume,
  onStartSession,
  onEndSession,
  onToggleMute,
  onSendTextMessage,
}) {
  const [inputText, setInputText] = useState('');

  const isConnected = sessionStatus === 'connected';
  const isConnecting = sessionStatus === 'connecting';

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendTextMessage(inputText);
    setInputText('');
  };

  return (
    <footer className="fixed bottom-4 left-0 right-0 z-30 px-4 flex justify-center pointer-events-none">
      <div className="w-full max-w-2xl bg-white/95 backdrop-blur-md rounded-2xl border border-stone-300 shadow-xl p-2.5 flex items-center gap-3 pointer-events-auto font-sans">
        {/* Text Input to Aristotle */}
        <form onSubmit={handleSend} className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type to Aristotle..."
            className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 transition-all font-serif"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-8 h-8 rounded-xl bg-stone-800 hover:bg-stone-900 disabled:opacity-30 text-white flex items-center justify-center transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed"
            title="Send to Aristotle"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </form>

        <div className="h-6 w-px bg-stone-200" />

        {/* Audio Mic Level feedback & Mute button */}
        <div className="flex items-center gap-2">
          {isConnected && (
            <button
              onClick={onToggleMute}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                isMuted
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-stone-100 hover:bg-stone-200 border-stone-200 text-stone-700'
              }`}
              title={isMuted ? 'Unmute Mic (Space)' : 'Mute Mic (Space)'}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-rose-600" />}
              <span className="text-[11px]">{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>
          )}

          {/* Connect / Disconnect Action */}
          {!isConnected ? (
            <button
              onClick={onStartSession}
              disabled={isConnecting}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-medium text-xs transition-all shadow-md shadow-rose-600/20 disabled:opacity-50"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>{isConnecting ? 'Connecting...' : 'Start Voice Session'}</span>
            </button>
          ) : (
            <button
              onClick={onEndSession}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 font-medium text-xs transition-all"
            >
              <PhoneOff className="w-3.5 h-3.5 text-rose-600" />
              <span>End Session</span>
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
