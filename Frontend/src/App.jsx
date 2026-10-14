import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { loader } from '@monaco-editor/react';
import { useGeminiLive } from './hooks/useGeminiLive.js';
import { DirectWhiteboard } from './components/whiteboard/DirectWhiteboard.jsx';
import { ControlsBar } from './components/ControlsBar.jsx';
import { StudentProfileModal } from './components/profile/StudentProfileModal.jsx';
import { getStudentProfile, saveStudentProfile } from './services/studentProfile.js';
import { AlertCircle, X, GripVertical, Loader2 } from 'lucide-react';

// Code-split CodeLab so Monaco Editor & compilers are loaded on demand
const CodeLab = lazy(() =>
  import('./components/codelab/CodeLab.jsx').then((module) => ({
    default: module.CodeLab,
  }))
);

export default function App() {
  const [studentProfile, setStudentProfile] = useState(() => getStudentProfile());
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Preload Monaco Editor in the background so Code Lab opens with 0ms delay
  useEffect(() => {
    loader.init().catch(() => {});
  }, []);

  // Split-screen Code Lab state
  const [isCodeLabOpen, setIsCodeLabOpen] = useState(false);
  const [isCodeLabMaximized, setIsCodeLabMaximized] = useState(false);
  const [codeLabSnippet, setCodeLabSnippet] = useState({ code: '', language: 'javascript' });
  const [splitRatio, setSplitRatio] = useState(50); // 50% by default
  const isDraggingRef = useRef(false);

  const handleOpenInCodeLab = (code, language) => {
    setCodeLabSnippet({ code, language });
    setIsCodeLabOpen(true);
  };

  const {
    sessionStatus,
    conversationState,
    isMuted,
    error,
    whiteboardItems,
    clearWhiteboard,
    startSession,
    endSession,
    toggleMute,
    sendTextMessage,
    sendContextUpdate,
  } = useGeminiLive({
    studentProfile,
    onCodeGenerated: (code, language) => {
      // Auto-load teacher's newly generated code into Code Lab without disturbing whiteboard
      setCodeLabSnippet({ code, language: language || 'python' });
    },
  });

  const [dismissError, setDismissError] = useState(false);

  const handleSaveProfile = (newProfile) => {
    saveStudentProfile(newProfile);
    setStudentProfile(newProfile);

    // Notify Teacher immediately of updated profile
    if (sendContextUpdate) {
      sendContextUpdate(
        `[STUDENT PROFILE UPDATED]: Student Name is "${newProfile.name}", Level: "${newProfile.grade}", Interests: "${newProfile.interests}", Preferred Language: "${newProfile.preferredLanguage}". Address them as "${newProfile.name}".`
      );
    }
  };

  // Draggable Split Screen Resizer Handler
  const handleMouseDown = (e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent) => {
      if (!isDraggingRef.current) return;
      const windowWidth = window.innerWidth;
      const newRatio = Math.max(25, Math.min(75, (moveEvent.clientX / windowWidth) * 100));
      setSplitRatio(newRatio);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
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

      {/* Main Clean Workspace: Split View with Draggable Divider */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Infinite Paper Canvas Whiteboard */}
        {(!isCodeLabOpen || !isCodeLabMaximized) && (
          <div
            style={{ width: isCodeLabOpen ? `${splitRatio}%` : '100%' }}
            className="flex flex-col h-full transition-all duration-75 overflow-hidden"
          >
            <DirectWhiteboard
              items={whiteboardItems}
              onClearBoard={clearWhiteboard}
              studentProfile={studentProfile}
              onOpenInCodeLab={handleOpenInCodeLab}
              isCodeLabOpen={isCodeLabOpen}
              onToggleCodeLab={() => {
                if (isCodeLabOpen) {
                  setIsCodeLabOpen(false);
                  setIsCodeLabMaximized(false);
                } else {
                  setIsCodeLabOpen(true);
                }
              }}
            />
          </div>
        )}

        {/* Draggable Divider (Grip Handle) */}
        {isCodeLabOpen && !isCodeLabMaximized && (
          <div
            onMouseDown={handleMouseDown}
            className="hidden md:flex w-2 bg-stone-300 hover:bg-amber-500 cursor-col-resize items-center justify-center transition-colors z-20 shrink-0 group select-none"
            title="Drag to resize Whiteboard and Code Lab"
          >
            <GripVertical className="w-3 h-3 text-stone-500 group-hover:text-white" />
          </div>
        )}

        {/* Right Side: Split Code Lab & Live UI Sandbox */}
        {isCodeLabOpen && (
          <div
            style={{ width: isCodeLabMaximized ? '100%' : `${100 - splitRatio}%` }}
            className="flex flex-col h-full animate-fadeIn transition-all duration-75 overflow-hidden"
          >
            <Suspense
              fallback={
                <div className="flex-1 bg-stone-900 text-stone-300 flex flex-col items-center justify-center gap-3 font-mono text-xs">
                  <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                  <span>Loading Monaco Code Lab...</span>
                </div>
              }
            >
              <CodeLab
                initialCode={codeLabSnippet.code}
                initialLanguage={codeLabSnippet.language}
                onSyncWithTeacher={sendContextUpdate}
                onClose={() => {
                  setIsCodeLabOpen(false);
                  setIsCodeLabMaximized(false);
                }}
                isTeacherMuted={isMuted}
                onToggleTeacherMute={toggleMute}
                isMaximized={isCodeLabMaximized}
                onToggleMaximize={() => setIsCodeLabMaximized(!isCodeLabMaximized)}
              />
            </Suspense>
          </div>
        )}
      </main>

      {/* Floating Bottom Controls Bar: Mic, Typing & Profile Button */}
      <ControlsBar
        sessionStatus={sessionStatus}
        conversationState={conversationState}
        isMuted={isMuted}
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
