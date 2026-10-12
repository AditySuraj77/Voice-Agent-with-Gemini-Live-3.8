import React, { useState } from 'react';
import { useGeminiLive } from './hooks/useGeminiLive.js';
import { Header } from './components/Header.jsx';
import { WhiteboardCanvas } from './components/whiteboard/WhiteboardCanvas.jsx';
import { MasterySidebar } from './components/whiteboard/MasterySidebar.jsx';
import { LiveSpeechBubble } from './components/whiteboard/LiveSpeechBubble.jsx';
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
    activeSubject,
    whiteboardItems,
    masteryGoal,
    learningMap,
    switchSubject,
    submitCodeToAristotle,
    startSession,
    endSession,
    toggleMute,
    sendTextMessage,
    switchModel,
  } = useGeminiLive();

  const [dismissError, setDismissError] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#fcfbf7] text-stone-900 overflow-hidden font-sans relative">
      {/* Top Header */}
      <Header
        currentModel={currentModel}
        onModelChange={switchModel}
        sessionStatus={sessionStatus}
        conversationState={conversationState}
        isSearching={isSearching}
        activeSubject={activeSubject}
        onSubjectChange={switchSubject}
      />

      {/* Error Alert Banner */}
      {error && !dismissError && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 flex items-center justify-between text-xs text-rose-700 z-30 font-serif">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setDismissError(true)}
            className="text-rose-400 hover:text-rose-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Aristotle Workspace: Whiteboard (Center) + Mastery (Right) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Dynamic Whiteboard Canvas */}
        <WhiteboardCanvas
          subject={activeSubject}
          items={whiteboardItems}
          onCodeSubmit={submitCodeToAristotle}
        />

        {/* Right Mastery & Learning Goals Sidebar */}
        <MasterySidebar
          activeSubject={activeSubject}
          masteryGoal={masteryGoal}
          learningMap={learningMap}
        />

        {/* Signature Floating Aristotle Speech Bubble & Mascot in Bottom Left */}
        <LiveSpeechBubble
          messages={messages}
          conversationState={conversationState}
          isSearching={isSearching}
          searchQuery={searchQuery}
        />
      </div>

      {/* Bottom Floating Controls Bar */}
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
