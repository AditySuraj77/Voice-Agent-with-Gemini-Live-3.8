import React, { useState } from 'react';
import { Mic, MicOff, ArrowUp, PhoneCall, PhoneOff, User, Sparkles } from 'lucide-react';

export function ControlsBar({
  sessionStatus,
  conversationState,
  isMuted,
  studentProfile,
  onOpenProfile,
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
      <div className="w-full max-w-2xl bg-white/95 backdrop-blur-md rounded-2xl border border-stone-300/90 shadow-2xl p-2.5 flex items-center gap-3 pointer-events-auto font-sans">
        {/* Text Input to Teacher */}
        <form onSubmit={handleSend} className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="अपने टीचर से पूछें या टाइप करें (Type a question or message)..."
            className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs md:text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all font-sans"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-9 h-9 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-30 text-white flex items-center justify-center transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed shrink-0"
            title="Send Message"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </form>

        <div className="h-6 w-px bg-stone-200" />

        {/* Audio Mic & Session Controls */}
        <div className="flex items-center gap-2">
          {/* Student Profile Quick Trigger */}
          {onOpenProfile && (
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200/80 border border-stone-200/80 text-stone-700 text-xs font-medium transition-all cursor-pointer"
              title="Personalize Student Profile"
            >
              <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold">
                {(studentProfile?.name || 'A')[0].toUpperCase()}
              </div>
              <span className="hidden md:inline text-[11px] font-semibold text-stone-800">
                {studentProfile?.name || 'Adi'}
              </span>
            </button>
          )}
          {/* Subtle Live Audio Status */}
          {isConnected && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-100/90 text-[11px] font-sans font-medium text-stone-600 border border-stone-200/60 select-none">
              {conversationState === 'speaking' ? (
                <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Teacher Speaking
                </span>
              ) : conversationState === 'listening' ? (
                <span className="flex items-center gap-1.5 text-rose-600 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  Listening
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-stone-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                  Connected
                </span>
              )}
            </div>
          )}

          {isConnected && (
            <button
              onClick={onToggleMute}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                isMuted
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-stone-100 hover:bg-stone-200 border-stone-200 text-stone-700'
              }`}
              title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-amber-600" />}
              <span className="hidden sm:inline text-[11px]">{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>
          )}

          {/* Connect / Disconnect Action */}
          {!isConnected ? (
            <button
              onClick={onStartSession}
              disabled={isConnecting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-medium text-xs md:text-sm transition-all shadow-md shadow-amber-600/20 disabled:opacity-50 cursor-pointer shrink-0"
            >
              <PhoneCall className="w-4 h-4" />
              <span>{isConnecting ? 'Connecting...' : 'Start Voice'}</span>
            </button>
          ) : (
            <button
              onClick={onEndSession}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-medium text-xs transition-all cursor-pointer shrink-0"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>End Call</span>
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
