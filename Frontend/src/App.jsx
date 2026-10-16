import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { loader } from '@monaco-editor/react';
import { useGeminiLive } from './hooks/useGeminiLive.js';
import { DirectWhiteboard } from './components/whiteboard/DirectWhiteboard.jsx';
import { LiveBrowserViewer } from './components/browser/LiveBrowserViewer.jsx';
import { ControlsBar } from './components/ControlsBar.jsx';
import { StudentProfileModal } from './components/profile/StudentProfileModal.jsx';
import { SessionHistoryModal } from './components/history/SessionHistoryModal.jsx';
import { getStudentProfile, saveStudentProfile } from './services/studentProfile.js';
import { AlertCircle, X, GripVertical, Loader2, Maximize2, Minimize2 } from 'lucide-react';

// Code-split CodeLab so Monaco Editor & compilers are loaded on demand
const CodeLab = lazy(() =>
  import('./components/codelab/CodeLab.jsx').then((module) => ({
    default: module.CodeLab,
  }))
);

export default function App() {
  const [studentProfile, setStudentProfile] = useState(() => getStudentProfile());
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Preload Monaco Editor in the background so Code Lab opens with 0ms delay
  useEffect(() => {
    loader.init().catch(() => {});
  }, []);

  // Multi-panel workspace state (Code Lab / Live Browser)
  const [activeRightTab, setActiveRightTab] = useState('codelab'); // 'codelab' | 'browser'
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isRightPanelMaximized, setIsRightPanelMaximized] = useState(false);
  const [codeLabSnippet, setCodeLabSnippet] = useState({ code: '', language: 'javascript' });
  const [splitRatio, setSplitRatio] = useState(50); // 50% by default
  const isDraggingRef = useRef(false);

  const handleOpenInCodeLab = (code, language) => {
    setCodeLabSnippet({ code, language });
    setActiveRightTab('codelab');
    setIsRightPanelOpen(true);
  };

  const {
    sessionStatus,
    conversationState,
    isMuted,
    error,
    whiteboardItems,
    setWhiteboardItems,
    clearWhiteboard,
    sendCanvasDrawing,
    startSession,
    endSession,
    toggleMute,
    sendTextMessage,
    sendContextUpdate,
    browserState,
    setBrowserState,
    executeBrowserAction,
  } = useGeminiLive({
    studentProfile,
    onCodeGenerated: (code, language) => {
      // Auto-load teacher's newly generated code into Code Lab without disturbing whiteboard
      setCodeLabSnippet({ code, language: language || 'python' });
      setActiveRightTab('codelab');
      setIsRightPanelOpen(true);
    },
  });

  // Automatically open right workspace to Live Browser when Gemini or user triggers navigation
  useEffect(() => {
    if (browserState?.isOpen) {
      setActiveRightTab('browser');
      setIsRightPanelOpen(true);
    }
  }, [browserState?.isOpen]);

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
        {(!isRightPanelOpen || !isRightPanelMaximized) && (
          <div
            style={{ width: isRightPanelOpen ? `${splitRatio}%` : '100%' }}
            className="flex flex-col h-full transition-all duration-75 overflow-hidden"
          >
            <DirectWhiteboard
              items={whiteboardItems}
              onClearBoard={clearWhiteboard}
              studentProfile={studentProfile}
              onOpenInCodeLab={handleOpenInCodeLab}
              isCodeLabOpen={isRightPanelOpen && activeRightTab === 'codelab'}
              onToggleCodeLab={() => {
                if (isRightPanelOpen && activeRightTab === 'codelab') {
                  setIsRightPanelOpen(false);
                  setIsRightPanelMaximized(false);
                } else {
                  setActiveRightTab('codelab');
                  setIsRightPanelOpen(true);
                }
              }}
              isBrowserOpen={isRightPanelOpen && activeRightTab === 'browser'}
              onToggleBrowser={() => {
                if (isRightPanelOpen && activeRightTab === 'browser') {
                  setIsRightPanelOpen(false);
                  setIsRightPanelMaximized(false);
                  setBrowserState((prev) => ({ ...prev, isOpen: false }));
                } else {
                  setActiveRightTab('browser');
                  setIsRightPanelOpen(true);
                  setBrowserState((prev) => ({ ...prev, isOpen: true }));
                }
              }}
              onOpenHistory={() => setIsHistoryModalOpen(true)}
              onSendCanvasToTeacher={sendCanvasDrawing}
            />
          </div>
        )}

        {/* Draggable Divider (Grip Handle) */}
        {isRightPanelOpen && !isRightPanelMaximized && (
          <div
            onMouseDown={handleMouseDown}
            className="hidden md:flex w-2 bg-stone-300 hover:bg-amber-500 cursor-col-resize items-center justify-center transition-colors z-20 shrink-0 group select-none"
            title="Drag to resize Whiteboard and Workspace"
          >
            <GripVertical className="w-3 h-3 text-stone-500 group-hover:text-white" />
          </div>
        )}

        {/* Right Side: Split Multi-tool Panel (Code Lab & Live Autonomous Browser) */}
        {isRightPanelOpen && (
          <div
            style={{ width: isRightPanelMaximized ? '100%' : `${100 - splitRatio}%` }}
            className="flex flex-col h-full animate-fadeIn transition-all duration-75 overflow-hidden border-l border-stone-800 bg-[#121316]"
          >
            {/* Top Workspace Tab Switcher Strip */}
            <div className="bg-[#18181b] border-b border-stone-800 px-3 py-1.5 flex items-center justify-between text-xs font-sans shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveRightTab('codelab')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    activeRightTab === 'codelab'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                  }`}
                  title="Switch to Monaco Code Lab"
                >
                  <span>💻 Code Lab</span>
                </button>

                <button
                  onClick={() => {
                    setActiveRightTab('browser');
                    if (!browserState.isOpen) {
                      setBrowserState((prev) => ({ ...prev, isOpen: true }));
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    activeRightTab === 'browser'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                  }`}
                  title="Switch to Live Voice Browser"
                >
                  <span>🌐 Live Browser</span>
                  {browserState.isLoading ? (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  ) : browserState.screenshot ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  ) : null}
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsRightPanelMaximized(!isRightPanelMaximized)}
                  className="p-1 rounded text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors cursor-pointer"
                  title={isRightPanelMaximized ? 'Restore Viewport' : 'Maximize Viewport'}
                >
                  {isRightPanelMaximized ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsRightPanelOpen(false);
                    setIsRightPanelMaximized(false);
                    if (activeRightTab === 'browser') {
                      setBrowserState((prev) => ({ ...prev, isOpen: false }));
                    }
                  }}
                  className="p-1 rounded text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors cursor-pointer"
                  title="Close Workspace Panel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Tab Viewport: Code Lab or Live Browser */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
              {activeRightTab === 'codelab' && (
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
                      setIsRightPanelOpen(false);
                      setIsRightPanelMaximized(false);
                    }}
                    isTeacherMuted={isMuted}
                    onToggleTeacherMute={toggleMute}
                    isMaximized={isRightPanelMaximized}
                    onToggleMaximize={() => setIsRightPanelMaximized(!isRightPanelMaximized)}
                  />
                </Suspense>
              )}

              {activeRightTab === 'browser' && (
                <LiveBrowserViewer
                  browserState={browserState}
                  onAction={executeBrowserAction}
                  onClose={() => {
                    setIsRightPanelOpen(false);
                    setIsRightPanelMaximized(false);
                    setBrowserState((prev) => ({ ...prev, isOpen: false }));
                  }}
                  isMaximized={isRightPanelMaximized}
                  onToggleMaximize={() => setIsRightPanelMaximized(!isRightPanelMaximized)}
                />
              )}
            </div>
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

      {/* Multi-Day Session History Modal */}
      <SessionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onRestoreSession={(pastItems) => {
          setWhiteboardItems(pastItems);
        }}
        onStartFreshSession={() => {
          clearWhiteboard();
        }}
      />
    </div>
  );
}
