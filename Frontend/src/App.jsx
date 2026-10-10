import React, { useState } from 'react';
import { useGeminiLive } from './hooks/useGeminiLive.js';
import { Header } from './components/Header.jsx';
import { ChatHistory } from './components/ChatHistory.jsx';
import { ControlsBar } from './components/ControlsBar.jsx';
import { AlertCircle, X } from 'lucide-react';

export default function App() {
  const {
    sessionStatus,
    conversationState,
    currentModel,
    isMuted,
    inputVolume,
    error,
    messages,
    isSearching,
    searchQuery,
    startSession,
    endSession,
    toggleMute,
    sendTextMessage,
    switchModel,
  } = useGeminiLive();

  const [dismissError, setDismissError] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Header */}
      <Header
        currentModel={currentModel}
        onModelChange={switchModel}
        sessionStatus={sessionStatus}
        conversationState={conversationState}
        isSearching={isSearching}
      />

      {/* Error Banner */}
      {error && !dismissError && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setDismissError(true)}
            className="text-rose-400 hover:text-rose-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Scrollable Conversation History */}
      <ChatHistory
        messages={messages}
        conversationState={conversationState}
        isSearching={isSearching}
        searchQuery={searchQuery}
      />

      {/* Bottom Controls Bar */}
      <ControlsBar
        sessionStatus={sessionStatus}
        conversationState={conversationState}
        isMuted={isMuted}
        inputVolume={inputVolume}
        onStartSession={() => {
          setDismissError(false);
          startSession();
        }}
        onEndSession={endSession}
        onToggleMute={toggleMute}
        onSendTextMessage={sendTextMessage}
      />
    </div>
  );
}
