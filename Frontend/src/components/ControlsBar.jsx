import React, { useState } from 'react';
import { Mic, MicOff, Send, PhoneCall, PhoneOff } from 'lucide-react';

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
    <div className="border-t border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-4 py-4 md:px-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-3">
        {/* Text Input Row */}
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isConnected
                ? "Type a message or speak naturally..."
                : "Start session to speak or type..."
            }
            className="flex-1 bg-slate-800/90 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || !isConnected}
            className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white transition-all shadow-md"
            title="Send Text Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Voice Session Controls Row */}
        <div className="flex items-center justify-between pt-1">
          {/* Status & Volume feedback */}
          <div className="flex items-center gap-3">
            {isConnected && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Mic Level:</span>
                <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-75"
                    style={{ width: `${Math.min(100, inputVolume * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Core Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Mute Button */}
            {isConnected && (
              <button
                onClick={onToggleMute}
                className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                  isMuted
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            )}

            {/* Session Connect/Disconnect Button */}
            {!isConnected ? (
              <button
                onClick={onStartSession}
                disabled={isConnecting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50"
              >
                <PhoneCall className="w-4 h-4" />
                {isConnecting ? 'Connecting...' : 'Start Voice Session'}
              </button>
            ) : (
              <button
                onClick={onEndSession}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm transition-all shadow-lg shadow-rose-500/25"
              >
                <PhoneOff className="w-4 h-4" />
                End Session
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
