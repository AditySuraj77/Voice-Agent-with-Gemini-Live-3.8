import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioRecorder } from '../audio/audioRecorder.js';
import { AudioPlayer } from '../audio/audioPlayer.js';
import { GeminiLiveClient } from '../services/geminiLiveClient.js';

const BACKEND_URL = 'http://localhost:3001';

export function useGeminiLive() {
  const [sessionStatus, setSessionStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'error'
  const [conversationState, setConversationState] = useState('idle'); // 'idle' | 'listening' | 'thinking' | 'speaking'
  const [currentModel, setCurrentModel] = useState('gemini-3.8-live');
  const [selectedVoice, setSelectedVoice] = useState('Aoede');
  const [isMuted, setIsMuted] = useState(false);
  const [inputVolume, setInputVolume] = useState(0);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Aristotle Interactive Whiteboard & Mastery states
  const [activeSubject, setActiveSubject] = useState('Arithmetic'); // 'Arithmetic' | 'Chemistry' | 'Computer Science'
  const [whiteboardItems, setWhiteboardItems] = useState([
    {
      id: 'wb-initial-1',
      component: 'math',
      title: 'Expanded Form & Place Values',
      data: {
        formula: '4,619 = 4,000 + 600 + 10 + 9',
        isVerified: true,
        breakdown: [
          { digit: '4 in 1,000s', place: 'thousands', value: '4,000' },
          { digit: '6 in 100s', place: 'hundreds', value: '600' },
          { digit: '1 in 10s', place: 'tens', value: '10' },
          { digit: '9 in 1s', place: 'ones', value: '9' },
        ],
        steps: [
          'Breaking a whole number apart into the sum of its place values.',
          'Try writing numbers out loud or in expanded form!',
        ],
      },
    },
  ]);

  const [masteryGoal, setMasteryGoal] = useState({
    title: 'Writing whole numbers in expanded form',
    current: 2,
    target: 4,
    status: 'Solid. Recording your progress on this one.',
  });

  const [learningMap, setLearningMap] = useState([
    { title: 'Skip counting & extending base-ten number patterns', completed: true },
    { title: 'Explaining place-value patterns when multiplying', completed: false },
    { title: 'Converting whole numbers between standard & word form', completed: true },
    { title: 'Writing whole numbers in expanded form', current: true },
  ]);

  const audioRecorderRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const liveClientRef = useRef(null);

  // Initialize audio player on mount
  useEffect(() => {
    audioPlayerRef.current = new AudioPlayer({
      onPlaybackStateChange: (isPlaying) => {
        setConversationState((prev) => {
          if (isPlaying) return 'speaking';
          return prev === 'speaking' ? 'listening' : prev;
        });
      },
    });

    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.destroy();
      }
      if (audioRecorderRef.current) {
        audioRecorderRef.current.stop();
      }
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
      }
    };
  }, []);

  /**
   * Fetches short-lived ephemeral token from the Express backend.
   */
  const fetchEphemeralToken = async (model) => {
    const res = await fetch(`${BACKEND_URL}/api/token?model=${encodeURIComponent(model)}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || `HTTP ${res.status} provisioning token`);
    }
    const data = await res.json();
    return data.token;
  };

  /**
   * Starts a voice session.
   */
  const startSession = useCallback(async (targetModel = currentModel) => {
    try {
      setError(null);
      setSessionStatus('connecting');
      setIsSearching(false);
      setSearchQuery('');

      // Guard: Disconnect any existing session before starting a new one
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
        liveClientRef.current = null;
      }
      if (audioRecorderRef.current) {
        audioRecorderRef.current.stop();
        audioRecorderRef.current = null;
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.stopAndClear();
      }

      // 1. Get ephemeral token from backend
      const token = await fetchEphemeralToken(targetModel);

      let chunkCount = 0;

      // 2. Initialize Gemini Live WebSocket client
      liveClientRef.current = new GeminiLiveClient({
        backendUrl: BACKEND_URL,
        onOpen: () => {
          console.log('[useGeminiLive] Live session connected & established.');
          setSessionStatus('connected');
          setConversationState('listening');
        },
        onClose: () => {
          console.log('[useGeminiLive] Live session closed.');
          setSessionStatus('disconnected');
          setConversationState('idle');
          setIsSearching(false);
          setSearchQuery('');
          if (audioRecorderRef.current) {
            audioRecorderRef.current.stop();
            audioRecorderRef.current = null;
          }
        },
        onError: (err) => {
          console.error('[useGeminiLive] Live client error:', err);
          setError('Live connection error occurred.');
          setSessionStatus('error');
          setIsSearching(false);
        },
        onAudioChunk: (chunk) => {
          if (audioPlayerRef.current) {
            audioPlayerRef.current.playChunk(chunk);
          }
        },
        onInterrupted: () => {
          // Barge-in: flush playing audio queue immediately
          console.log('[useGeminiLive] User barged in: clearing active audio playback.');
          if (audioPlayerRef.current) {
            audioPlayerRef.current.stopAndClear();
          }
          setIsSearching(false);
          setConversationState('listening');
        },
        onUserTurnFrozen: () => {
          // As soon as the assistant starts replying, freeze all preceding user bubbles so they can never be overwritten
          setMessages((prev) =>
            prev.map((m) => (m.sender === 'user' && m.isPartial ? { ...m, isPartial: false } : m))
          );
        },
        onToolCall: (calls) => {
          const searchCall = calls.find((c) => c.name === 'search_web');
          if (searchCall) {
            const query = searchCall.args?.query || '';
            console.log(`[useGeminiLive] Tool call triggered: search_web "${query}"`);
            setIsSearching(true);
            setSearchQuery(query);
            setConversationState('thinking');
            setMessages((prev) => [
              ...prev,
              {
                id: 'tool-' + Date.now() + Math.random().toString(36).slice(2, 5),
                sender: 'tool',
                toolName: 'Tavily Search',
                query,
                text: `Searching the web for: "${query}"...`,
                isSearching: true,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);
          }
        },
        onToolResponse: (responses) => {
          console.log('[useGeminiLive] Tool response received. Resuming speech generation.');
          setIsSearching(false);
          setMessages((prev) =>
            prev.map((m) =>
              m.sender === 'tool' && m.isSearching
                ? {
                    ...m,
                    isSearching: false,
                    text: `Web search completed for: "${m.query}"`,
                  }
                : m
            )
          );
        },
        onWhiteboardCall: (args) => {
          console.log('[useGeminiLive] update_whiteboard received:', args);
          setWhiteboardItems((prev) => {
            const newItem = {
              id: 'wb-' + Date.now() + Math.random().toString(36).slice(2, 5),
              component: args.component || 'notes',
              title: args.title || '',
              content: typeof args.content === 'string' ? args.content : '',
              data: typeof args.content === 'object' ? args.content : { text: args.content },
              timestamp: new Date().toLocaleTimeString(),
            };
            if (args.action === 'replace') {
              return [newItem];
            } else if (args.action === 'clear') {
              return [];
            }
            return [...prev, newItem];
          });
        },
        onMasteryCall: (args) => {
          console.log('[useGeminiLive] update_mastery received:', args);
          setMasteryGoal({
            title: args.topic || 'Current Focus',
            current: Number(args.current) || 1,
            target: Number(args.target) || 4,
            status: args.statusText || 'Solid. Recording your progress.',
          });
        },
        onTranscript: ({ sender, text, isPartial }) => {
          if (!text) return;

          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];

            // If the latest message in chat belongs to this same sender
            if (lastMsg && lastMsg.sender === sender) {
              // If sender is assistant, or user with active streaming bubble
              let nextText = text;
              if (sender === 'user') {
                nextText = text; // User text is progressive cumulative text from Gemini STT
              } else {
                // Assistant text: if it's already an extension of lastMsg, avoid exact duplicate chunks
                if (lastMsg.text.endsWith(text)) {
                  nextText = lastMsg.text;
                } else {
                  nextText = lastMsg.text + text;
                }
              }

              const updated = [...prev];
              updated[updated.length - 1] = {
                ...lastMsg,
                text: nextText,
                isPartial,
              };
              return updated;
            } else {
              // Start a new message bubble (new speaker turn)
              return [
                ...prev,
                {
                  id: Date.now() + Math.random().toString(36).slice(2, 6),
                  sender,
                  text,
                  isPartial,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ];
            }
          });
        },
        onTurnComplete: () => {
          setIsSearching(false);
          // Finalize any open partial messages
          setMessages((prev) =>
            prev.map((m) => (m.isPartial ? { ...m, isPartial: false } : m))
          );
        },
      });

      // 3. Connect to WebSocket with Aristotle Socratic Whiteboard Tutor Persona
      await liveClientRef.current.connect(token, {
        model: targetModel,
        voiceName: selectedVoice,
        systemInstruction: `You are Aristotle, a friendly, encouraging, and patient 1-on-1 Socratic AI voice tutor with an interactive real-time whiteboard.
Your primary role is to guide the student through Math/Arithmetic, Chemistry/Science, and Computer Science using Socratic inquiry and live whiteboard visuals.

Core Pedagogical Directives (Aristotle Method):
1. Proactive Whiteboard Usage (update_whiteboard):
   - You MUST call \`update_whiteboard\` frequently as you speak to draw or write on the student's canvas in real-time.
   - For Math / Arithmetic: When explaining place values or numbers (like 4,619 or 583), immediately call \`update_whiteboard\` with component "math" or "notes" showing expanded form (e.g. "4,619 = 4,000 + 600 + 10 + 9 ✓").
   - For Chemistry / Science: When asked to explain visually, or when discussing states of matter (solids, liquids, gases) or pure substances vs mixtures, immediately call \`update_whiteboard\` with component "diagram" (type: "states" or "classification_tree").
   - For Computer Science / Python: When discussing loops, variables, or functions, call \`update_whiteboard\` with component "code" containing the Python snippet so the student can inspect and edit it.

2. Socratic Scaffolding & Encouragement:
   - Do NOT dump full essays or answers. Ask one targeted question at a time to test understanding.
   - When the student answers correctly, enthusiastically praise them (e.g. "That's exactly right!", "You've got that down solid!"), write a checkmark on the board, and call \`update_mastery\`.
   - When the student struggles, hesitates, or says "I don't know":
     * Respond with warm reassurance: "No worries — let me show you!"
     * Break the problem down into simple steps and put the breakdown on the whiteboard.
   - When testing code or loops, guide the student to trace through the first iterations step-by-step: "What are the values of i and x on the first iteration?"

3. Curriculum & Subject Anchor:
   - When a student wants to jump prematurely across distant subjects (e.g., from basic states of matter straight into organic chemistry equations), gently anchor them: "We'll get there, I promise! But it will make much more sense once we have a few foundational building blocks first. Let's finish this one quick idea."

4. Natural Speech & Language Mirroring:
   - Speak conversationally, warmly, and concisely (like a great British or neutral-accented teacher).
   - Fluidly mirror the student's language (English, Hindi, or natural Hinglish).

5. Real-Time Web Search Tool (search_web):
   - You have the \`search_web\` tool available whenever fresh facts, real-time news, or external references are needed.`,
      });

      // 4. Initialize and start microphone recorder
      audioRecorderRef.current = new AudioRecorder({
        onAudioChunk: (chunk) => {
          if (liveClientRef.current && liveClientRef.current.isConnected) {
            chunkCount++;
            if (chunkCount <= 3 || chunkCount % 50 === 0) {
              console.log(`[useGeminiLive] Transmitted chunk #${chunkCount} to Gemini Live.`);
            }
            liveClientRef.current.sendAudioChunk(chunk);
          }
        },
        onVolumeChange: (vol) => {
          setInputVolume(vol);
          if (vol > 0.05 && conversationState === 'idle') {
            setConversationState('listening');
          }
        },
      });

      await audioRecorderRef.current.start();
      setCurrentModel(targetModel);
    } catch (err) {
      console.error('[useGeminiLive] Failed to start session:', err);
      setError(err.message || 'Failed to start session');
      setSessionStatus('error');
      setIsSearching(false);
      if (audioRecorderRef.current) {
        audioRecorderRef.current.stop();
        audioRecorderRef.current = null;
      }
      if (liveClientRef.current) {
        liveClientRef.current.disconnect();
        liveClientRef.current = null;
      }
    }
  }, [currentModel, selectedVoice, conversationState]);

  /**
   * Ends the active voice session.
   */
  const endSession = useCallback(() => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stopAndClear();
    }
    if (liveClientRef.current) {
      liveClientRef.current.disconnect();
      liveClientRef.current = null;
    }
    setSessionStatus('disconnected');
    setConversationState('idle');
    setIsSearching(false);
    setSearchQuery('');
    setInputVolume(0);
  }, []);

  /**
   * Toggles microphone mute.
   */
  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (audioRecorderRef.current) {
      audioRecorderRef.current.setMuted(nextMuted);
    }
  }, [isMuted]);

  /**
   * Sends text input to the model.
   */
  const sendTextMessage = useCallback((text) => {
    if (!text || !text.trim()) return;

    // Add user message to UI immediately
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random().toString(36).slice(2, 6),
        sender: 'user',
        text: text.trim(),
        isPartial: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    setConversationState('thinking');

    if (liveClientRef.current && liveClientRef.current.isConnected) {
      liveClientRef.current.sendTextMessage(text.trim());
    } else {
      setError('Not connected. Start session to chat.');
    }
  }, []);

  /**
   * Switches model between Fast Voice and Deep Thinking Voice.
   */
  const switchModel = useCallback(async (newModel) => {
    if (newModel === currentModel) return;

    console.log(`[useGeminiLive] Switching model from ${currentModel} to ${newModel}`);
    setCurrentModel(newModel);

    // If session is active, reconnect cleanly with the new model
    if (sessionStatus === 'connected' || sessionStatus === 'connecting') {
      endSession();
      setTimeout(() => {
        startSession(newModel);
      }, 300);
    }
  }, [currentModel, sessionStatus, endSession, startSession]);

  /**
   * Switches learning subject & updates initial whiteboard defaults.
   */
  const switchSubject = useCallback((subject) => {
    setActiveSubject(subject);
    if (subject === 'Chemistry') {
      setWhiteboardItems([
        {
          id: 'wb-chem-1',
          component: 'diagram',
          title: 'States of Matter',
          data: {
            diagramType: 'states',
          },
        },
      ]);
      setMasteryGoal({
        title: 'Classifying States of Matter',
        current: 1,
        target: 4,
        status: 'Solid vs Liquid vs Gas particle arrangement.',
      });
      setLearningMap([
        { title: 'Identifying properties of solids, liquids, & gases', current: true },
        { title: 'Predicting shape and volume changes in containers', completed: false },
        { title: 'Classifying pure substances vs mixtures', completed: false },
        { title: 'Understanding molecular compositions', completed: false },
      ]);
    } else if (subject === 'Computer Science') {
      setWhiteboardItems([
        {
          id: 'wb-cs-1',
          component: 'code',
          title: "Adi's For Loop Example",
          content: 'x = 1\nfor i in range(0, 10):\n    print(i * x)\n    x += 1',
        },
      ]);
      setMasteryGoal({
        title: 'Control Flow in Python (conditionals & loops)',
        current: 3,
        target: 4,
        status: 'Conditionals nailed. Moving to loops.',
      });
      setLearningMap([
        { title: '1. Programming Fundamentals (variables, datatypes)', completed: true },
        { title: '2. Control Flow (if, elif, else, loops)', current: true },
        { title: '3. Functions (parameters, return values)', completed: false },
        { title: '4. Data Structures (lists, dicts)', completed: false },
      ]);
    } else {
      // Arithmetic
      setWhiteboardItems([
        {
          id: 'wb-math-1',
          component: 'math',
          title: 'Expanded Form & Place Values',
          data: {
            formula: '4,619 = 4,000 + 600 + 10 + 9',
            isVerified: true,
            breakdown: [
              { digit: '4 in 1,000s', place: 'thousands', value: '4,000' },
              { digit: '6 in 100s', place: 'hundreds', value: '600' },
              { digit: '1 in 10s', place: 'tens', value: '10' },
              { digit: '9 in 1s', place: 'ones', value: '9' },
            ],
            steps: [
              'Breaking a whole number apart into the sum of its place values.',
              'Try writing numbers out loud or in expanded form!',
            ],
          },
        },
      ]);
      setMasteryGoal({
        title: 'Writing whole numbers in expanded form',
        current: 2,
        target: 4,
        status: 'Recording your progress on this one.',
      });
    }

    if (liveClientRef.current && liveClientRef.current.isConnected) {
      sendTextMessage(`Let's switch our focus to ${subject}.`);
    }
  }, [sendTextMessage]);

  /**
   * User submits edited code from the in-canvas CodeSandbox to Aristotle.
   */
  const submitCodeToAristotle = useCallback((codeSnippet) => {
    sendTextMessage(`Here is my updated Python code:\n\`\`\`python\n${codeSnippet}\n\`\`\`\nCan you trace through it with me?`);
  }, [sendTextMessage]);

  const clearWhiteboard = useCallback(() => {
    setWhiteboardItems([]);
  }, []);

  return {
    sessionStatus,
    conversationState,
    currentModel,
    selectedVoice,
    setSelectedVoice,
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
    clearWhiteboard,
    startSession,
    endSession,
    toggleMute,
    sendTextMessage,
    switchModel,
  };
}
