import React, { useState } from 'react';
import { useGeminiLive } from './hooks/useGeminiLive.js';
import { DirectWhiteboard } from './components/whiteboard/DirectWhiteboard.jsx';
import { ControlsBar } from './components/ControlsBar.jsx';
import { StudentProfileModal } from './components/profile/StudentProfileModal.jsx';
import { getStudentProfile, saveStudentProfile } from './services/studentProfile.js';
import { AlertCircle, X } from 'lucide-react';

export default function App() {
  const [studentProfile, setStudentProfile] = useState(() => getStudentProfile());
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const {
    sessionStatus,
    conversationState,
    currentModel,
    isMuted,
    inputVolume,
    error,
    isSearching,
    whiteboardItems,
    clearWhiteboard,
    startSession,
    endSession,
    toggleMute,
    sendTextMessage,
  } = useGeminiLive({ studentProfile });

  const [dismissError, setDismissError] = useState(false);

  const handleSaveProfile = (newProfile) => {
    saveStudentProfile(newProfile);
    setStudentProfile(newProfile);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#fbf8f3] text-stone-900 overflow-hidden font-serif relative">

      {/* Error Alert Banner if needed */}
      {error && !dismissError && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 flex items-center justify-between text-xs text-rose-700 z-30 font-sans">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setDismissError(true)}
            className="text-rose-400 hover:text-rose-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Clean Workspace: Direct Whiteboard Surface */}
      <main className="flex-1 flex overflow-hidden relative">
        <DirectWhiteboard
          items={whiteboardItems}
          onClearBoard={clearWhiteboard}
          studentProfile={studentProfile}
        />
      </main>

      {/* Floating Bottom Controls Bar: Mic, Typing & Profile Button */}
      <ControlsBar
        sessionStatus={sessionStatus}
        conversationState={conversationState}
        isMuted={isMuted}
        inputVolume={inputVolume}
        studentProfile={studentProfile}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onStartSession={() => {
          setDismissError(false);
          startSession();
        }}
        onEndSession={endSession}
        onToggleMute={toggleMute}
        onSendTextMessage={sendTextMessage}
      />

      {/* Student Profile Customization Modal */}
      <StudentProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={studentProfile}
        onSaveProfile={handleSaveProfile}
      />
    </div>
  );
}
