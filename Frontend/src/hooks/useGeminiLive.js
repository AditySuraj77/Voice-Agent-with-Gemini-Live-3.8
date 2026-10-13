import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioRecorder } from '../audio/audioRecorder.js';
import { AudioPlayer } from '../audio/audioPlayer.js';
import { GeminiLiveClient } from '../services/geminiLiveClient.js';

const BACKEND_URL = 'http://localhost:3001';

export function useGeminiLive({ studentProfile } = {}) {
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

  // Live Whiteboard notes dynamically populated as the Teacher explains
  const [whiteboardItems, setWhiteboardItems] = useState([]);

  // Turn and speech synchronization refs
  const hasTurnWhiteboardUpdateRef = useRef(false);
  const currentTurnAssistantTextRef = useRef('');
  const lastUserQueryRef = useRef('');

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
   * Manually clears the whiteboard.
   */
  const clearWhiteboard = useCallback(() => {
    setWhiteboardItems([]);
  }, []);

  /**
   * Starts a voice session with the AI Teacher.
   */
  const startSession = useCallback(async (targetModel = currentModel) => {
    try {
      setError(null);
      setSessionStatus('connecting');
      setIsSearching(false);
      setSearchQuery('');
      hasTurnWhiteboardUpdateRef.current = false;
      currentTurnAssistantTextRef.current = '';

      // Disconnect any existing session before starting a new one
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
          // User barged in: clear audio queue immediately
          console.log('[useGeminiLive] User barged in: clearing active audio playback.');
          if (audioPlayerRef.current) {
            audioPlayerRef.current.stopAndClear();
          }
          setIsSearching(false);
          setConversationState('listening');
        },
        onUserTurnFrozen: () => {
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
        onClearWhiteboard: () => {
          console.log('[useGeminiLive] clear_whiteboard tool executed.');
          setWhiteboardItems([]);
        },
        onWhiteboardCall: (args) => {
          console.log('[useGeminiLive] Whiteboard tool executed:', args);

          if (args.action === 'clear') {
            setWhiteboardItems([]);
            return;
          }

          let topic = (args.topic || args.title || '').trim();
          // Filter out junk/conversational titles
          if (topic === '*' || topic.toLowerCase() === 'hey' || topic.length < 2) {
            topic = '';
          }

          let notes = [];
          if (Array.isArray(args.notes)) {
            notes = args.notes.filter(Boolean);
          } else if (typeof args.notes === 'string') {
            notes = [args.notes];
          } else if (typeof args.content === 'string') {
            notes = args.content.split('\n').map((l) => l.trim()).filter(Boolean);
          } else if (Array.isArray(args.content)) {
            notes = args.content.filter(Boolean);
          }

          if (notes.length === 0 && (args.explanation || args.summary)) {
            notes = [args.explanation || args.summary];
          }

          // Sanitize studentAnswer (strip trailing checkmark so it's clean)
          let studentAnswer = null;
          if (args.studentAnswer) {
            studentAnswer = args.studentAnswer.replace(/[✓✔\s]+$/, '').trim();
          }

          const newItem = {
            id: 'wb-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            topic,
            notes,
            cardType: args.cardType || (args.formula ? 'formula' : args.code ? 'code' : 'concept'),
            formula: args.formula || null,
            code: args.code || (args.component === 'code' ? args.content : null),
            question: args.question || null,
            studentAnswer,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };

          if (args.clearPrevious || args.action === 'replace') {
            setWhiteboardItems([newItem]);
          } else {
            setWhiteboardItems((prev) => {
              // Deduplicate if the exact same topic and formula were just added
              const lastItem = prev[prev.length - 1];
              if (
                lastItem &&
                lastItem.topic === topic &&
                lastItem.formula === (args.formula || null) &&
                JSON.stringify(lastItem.notes) === JSON.stringify(notes)
              ) {
                return prev;
              }
              return [...prev, newItem];
            });
          }
        },
        onTranscript: ({ sender, text, isPartial }) => {
          if (!text) return;

          if (sender === 'user' && !isPartial) {
            lastUserQueryRef.current = text;
          }

          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];

            if (lastMsg && lastMsg.sender === sender) {
              let nextText = text;
              if (sender === 'user') {
                nextText = text;
              } else {
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
          setMessages((prev) =>
            prev.map((m) => (m.isPartial ? { ...m, isPartial: false } : m))
          );
        },
      });

      // 3. Connect to WebSocket with Aristotle Socratic Direct Whiteboard Persona
      const studentName = studentProfile?.name || 'Adi';
      const studentGrade = studentProfile?.grade || 'Class 8-10 / Middle School';
      const studentInterests = studentProfile?.interests || 'Cricket, Science experiments, Video games';
      const studentLang = studentProfile?.preferredLanguage || 'Hinglish (Hindi + English mix)';
      const studentGoal = studentProfile?.learningGoal || 'Conceptual clarity and step-by-step problem solving';

      const teacherSystemInstruction = `You are Aristotle, an exceptional 1-on-1 Socratic AI voice tutor with an interactive real-time whiteboard.

STUDENT PROFILE & PERSONALIZATION:
- Student Name: "${studentName}". Always address them warmly by their name ("${studentName}").
- Level / Grade: "${studentGrade}". Adapt vocabulary and mathematical difficulty accordingly.
- Interests & Hobbies: "${studentInterests}". Freely relate concepts, word problems, and real-world analogies to these interests (e.g. physics of cricket bowling/batting, gaming framerates, coding logic, etc.)!
- Language Preference: "${studentLang}". Speak naturally in this style.
- Goal: "${studentGoal}".

You can teach ANY subject (Math, Physics, Chemistry, Biology, Computer Science, History, Hindi, English, Economics, etc.).

CRITICAL WHITEBOARD TEACHING DIRECTIVE:
You write directly on the student's whiteboard canvas.
NEVER write conversational small-talk (like "आज हम पढ़ेंगे", "यह बहुत दिलचस्प विषय है", "ठीक है जहां से चाहो") on the board!
Keep conversational chit-chat strictly in your SPOKEN VOICE.
On the whiteboard, write ONLY:
1. Topic heading (\`topic\`)
2. Core definitions, steps, or bullet points (\`notes\`)
3. Mathematical formulas or equations (\`formula\`, e.g. "342 = 300 + 40 + 2" or "F = m · a")
4. Code blocks (\`code\`)
5. Socratic questions for the student (\`question\`)
6. Verified student answers with checkmark (\`studentAnswer\`, e.g. "${studentName}: 3247 ✓" or "${studentName}: 4 valence electrons ✓")

ON EVERY TURN WHEN YOU EXPLAIN A CONCEPT OR ASK A QUESTION:
YOU MUST CALL THE \`write_on_whiteboard\` TOOL AS YOU SPEAK!

Socratic Dialogue Rules:
- Keep your speech concise (1 to 3 sentences maximum per turn).
- Ask one question at a time to keep ${studentName} thinking and answering out loud.
- When ${studentName} answers, praise them warmly, verify their answer, and write it on the board with a checkmark!

If the student asks to clear the board, call \`clear_whiteboard\`.`;

      await liveClientRef.current.connect(token, {
        model: targetModel,
        voiceName: selectedVoice,
        systemInstruction: teacherSystemInstruction,
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
  }, [currentModel, selectedVoice, conversationState, studentProfile]);

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

    lastUserQueryRef.current = text.trim();

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
      setError('Session not connected. Please click "Start Voice Session" or connect first.');
    }
  }, []);

  /**
   * Switches model between Fast Voice and Deep Thinking Voice.
   */
  const switchModel = useCallback(async (newModel) => {
    if (newModel === currentModel) return;

    console.log(`[useGeminiLive] Switching model from ${currentModel} to ${newModel}`);
    setCurrentModel(newModel);

    if (sessionStatus === 'connected' || sessionStatus === 'connecting') {
      endSession();
      setTimeout(() => {
        startSession(newModel);
      }, 300);
    }
  }, [currentModel, sessionStatus, endSession, startSession]);

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
    whiteboardItems,
    clearWhiteboard,
    startSession,
    endSession,
    toggleMute,
    sendTextMessage,
    switchModel,
  };
}
