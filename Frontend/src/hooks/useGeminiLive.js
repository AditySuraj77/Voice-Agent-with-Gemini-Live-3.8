import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioRecorder } from '../audio/audioRecorder.js';
import { AudioPlayer } from '../audio/audioPlayer.js';
import { GeminiLiveClient } from '../services/geminiLiveClient.js';
import { saveActiveSession } from '../services/sessionHistory.js';
import { generateUniversalTopicSvg } from '../utils/universalSvgGenerator.js';
import { cloudMemoryService } from '../services/cloudMemoryService.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// Toggle for Google Session Resumption (can be set to false anytime for instant rollback)
export const ENABLE_SESSION_RESUMPTION = true;

/**
 * Normalizes and extracts key topic root words to detect when the teacher is elaborating on the same concept
 * (e.g. "Python Variables" vs "Variables in Python" vs "Storing Text in a Variable").
 */
function extractTopicKeywords(topic) {
  if (!topic || typeof topic !== 'string') return [];
  const stopWords = new Set([
    'in', 'a', 'an', 'the', 'to', 'for', 'with', 'of', 'and', 'or', 'on', 'at', 'by',
    'python', 'programming', 'code', 'coding', 'introduction', 'basics', 'concept', 'example', 'more', 'your', 'first'
  ]);
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !stopWords.has(w))
    .map((w) => {
      if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
      if (w.endsWith('es') && w.length > 4) return w.slice(0, -2);
      if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1);
      return w;
    });
}

function isSameOrRelatedTopic(topicA, topicB) {
  if (!topicA || !topicB) return false;
  const a = topicA.trim().toLowerCase();
  const b = topicB.trim().toLowerCase();
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  const kwA = extractTopicKeywords(topicA);
  const kwB = extractTopicKeywords(topicB);

  if (kwA.length === 0 || kwB.length === 0) return false;

  // Check if they share any core conceptual keywords (e.g. "variable")
  const overlap = kwA.filter((w) => kwB.includes(w));
  return overlap.length > 0;
}

/**
 * Formats a clear, structured summary of whiteboard items (topics, notes, formulas, code)
 * so Gemini Live has 100% full awareness of what the student sees on the board.
 */
function formatWhiteboardSummary(items = []) {
  if (!items || items.length === 0) return '';
  return items
    .map((item, idx) => {
      const parts = [];
      if (item.topic) parts.push(`Topic: "${item.topic}"`);
      if (item.notes && item.notes.length > 0) parts.push(`Notes: ${item.notes.join('; ')}`);
      if (item.formula) parts.push(`Formula: ${item.formula}`);
      if (item.code) parts.push(`Code (${item.language || 'code'}): ${item.code.slice(0, 150)}`);
      if (item.question) parts.push(`Question: ${item.question}`);
      if (item.studentAnswer) parts.push(`Answer: ${item.studentAnswer}`);
      if (item.svgCode || item.visualType === 'svg') parts.push(`Visual: Vector Diagram ("${item.topic || 'Diagram'}")`);
      if (item.imageUrl || item.visualType === 'photo') parts.push(`Visual: Archive Photo ("${item.imageTitle || item.topic || 'Photo'}")`);
      if (item.cardType === 'video_timeline' || item.timeline) {
        const chCount = item.timeline?.length || 0;
        const sample = item.timeline?.slice(0, 3).map((c) => `[${c.timeRange}] ${c.topic}`).join('; ');
        parts.push(`YouTube Roadmap: "${item.video?.title || item.topic}" (${chCount} chapters, e.g. ${sample})`);
      }
      return `[Board Item ${idx + 1}] ${parts.join(' | ')}`;
    })
    .join('\n');
}

/**
 * Builds rich, adaptive, human-like system prompt for Aristotle AI Voice Tutor.
 */

/**
 * Formats rolling multi-turn dialogue history for seamless continuous session rotation.
 */
/**
 * Formats rolling multi-turn dialogue history for continuous context memory across reconnections & rotations.
 */
function formatDialogueHistory(messagesList = []) {
  if (!messagesList || messagesList.length === 0) return '';
  const relevant = messagesList
    .filter((m) => (m.sender === 'user' || m.sender === 'assistant') && m.text && !m.isPartial)
    .slice(-10);

  if (relevant.length === 0) return '';

  return relevant
    .map((m) => {
      const role = m.sender === 'user' ? 'Student' : 'Tutor (Aristotle)';
      const cleanText = m.text.replace(/\s+/g, ' ').trim();
      return `${role}: "${cleanText}"`;
    })
    .join('\n');
}

function buildTeacherSystemInstruction(studentProfile, recentTopicsSummary = '', whiteboardSummary = '', dialogueHistorySummary = '') {
  const studentName = studentProfile?.name || 'there';

  return `You are a warm, highly capable, and helpful AI assistant paired with an interactive live whiteboard.

CORE BEHAVIOR:
1. HELPFUL & DIRECT: Answer questions clearly, accurately, and simply. Explain concepts in an easy-to-understand way with relatable everyday examples.
2. NATURAL VOICE PACING: Speak conversationally, warmly, and concisely (2–3 natural sentences per turn). Avoid robotic monologues or dry textbook lectures.
3. DYNAMIC LANGUAGE: Mirror whatever language the user speaks (English, Hindi, Hinglish, or any other language) naturally and conversationally.
4. WHITEBOARD & VISUALS: Whenever helpful, use write_on_whiteboard to jot down key points, steps, or formulas on the screen, and use render_visual or other tools when visual diagrams or motion make things clearer.
5. ENGAGING & FRIENDLY: Keep the tone supportive and conversational, naturally checking in to see if the user needs more details or wants to explore further.
6. VERBAL BRIDGING (NO DEAD AIR): When you need to call search_web, youtube_channel_search, youtube_fetch_transcript, or browser tools, ALWAYS first speak a quick, natural 1-sentence bridging phrase in the user's language (e.g. "Ek second, main iski latest details check karke batata hoon..." or "Let me check that on YouTube for you...") BEFORE or while triggering the tool so the user is never left waiting in dead silence.
${whiteboardSummary ? `\nACTIVE WHITEBOARD NOTES:\n${whiteboardSummary}\nAcknowledge and continue seamlessly from these notes.` : ''}
${recentTopicsSummary ? `\nRECENT TOPICS: ${recentTopicsSummary}` : ''}
${dialogueHistorySummary ? `\nRECENT CONTEXT: ${dialogueHistorySummary}` : ''}`;
}

export function useGeminiLive({ studentProfile, onCodeGenerated, user } = {}) {
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const [sessionStatus, setSessionStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'error'
  const [conversationState, setConversationState] = useState('idle'); // 'idle' | 'listening' | 'thinking' | 'speaking'
  const [currentModel, setCurrentModel] = useState('gemini-3.8-live');
  const [selectedVoice, setSelectedVoice] = useState('Aoede');
  const [isMuted, setIsMuted] = useState(false);
  const inputVolumeRef = useRef(0);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Live Browser State for AI-controlled browsing & split screen viewer
  const [browserState, setBrowserState] = useState({
    isOpen: false,
    url: 'about:blank',
    title: 'Ready',
    screenshot: null,
    isLoading: false,
    lastAction: null,
    clickCoordinates: null,
  });

  // Live Whiteboard notes dynamically populated as the Teacher explains
  const [whiteboardItems, setWhiteboardItems] = useState([]);
  const [aiHighlightedTopic, setAiHighlightedTopic] = useState(null);
  const [aiLaserPoint, setAiLaserPoint] = useState(null);
  const highlightTimerRef = useRef(null);
  const laserTimerRef = useRef(null);

  // Test/E2E hook: allows simulated or tool-dispatched laser point triggers in tests
  useEffect(() => {
    const handleTestLaser = (e) => {
      if (e?.detail) {
        setAiLaserPoint({
          x: typeof e.detail.x === 'number' ? e.detail.x : 50,
          y: typeof e.detail.y === 'number' ? e.detail.y : 50,
          label: e.detail.label || '',
          style: e.detail.style || 'laser',
          id: Date.now(),
        });
        if (laserTimerRef.current) clearTimeout(laserTimerRef.current);
        if (e.detail.duration !== 0) {
          laserTimerRef.current = setTimeout(() => {
            setAiLaserPoint(null);
          }, e.detail.duration || 6000);
        }
      } else if (e?.detail === null) {
        setAiLaserPoint(null);
      }
    };
    window.addEventListener('ai-laser-point-test', handleTestLaser);
    return () => window.removeEventListener('ai-laser-point-test', handleTestLaser);
  }, []);

  // Turn and speech synchronization refs
  const hasTurnWhiteboardUpdateRef = useRef(false);
  const currentTurnAssistantTextRef = useRef('');
  const lastUserQueryRef = useRef('');
  const conversationHistoryRef = useRef([]);

  // Session lifecycle & auto-reconnect refs
  const isExplicitlyEndedRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const rotationTimerRef = useRef(null);
  const isRotatingRef = useRef(false);
  const latestResumptionHandleRef = useRef(null);
  const isResumedSessionRef = useRef(false);
  const whiteboardItemsRef = useRef([]);
  const studentProfileRef = useRef(studentProfile);
  const currentModelRef = useRef(currentModel);
  const selectedVoiceRef = useRef(selectedVoice);

  const audioRecorderRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const liveClientRef = useRef(null);

  // Unique isolated browser session ID for multi-tenant isolation
  const browserSessionIdRef = useRef(
    (typeof window !== 'undefined' && sessionStorage.getItem('aristotle_browser_session_id')) ||
    ('user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8))
  );
  useEffect(() => {
    if (typeof window !== 'undefined' && browserSessionIdRef.current) {
      sessionStorage.setItem('aristotle_browser_session_id', browserSessionIdRef.current);
    }
  }, []);

  // Keep refs synchronized with active states and auto-save session history
  useEffect(() => {
    whiteboardItemsRef.current = whiteboardItems;
    if (whiteboardItems.length > 0) {
      saveActiveSession(whiteboardItems, studentProfileRef.current);
    }
  }, [whiteboardItems]);

  useEffect(() => {
    studentProfileRef.current = studentProfile;
  }, [studentProfile]);

  useEffect(() => {
    currentModelRef.current = currentModel;
  }, [currentModel]);

  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
  }, [selectedVoice]);

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
      isExplicitlyEndedRef.current = true;
      if (rotationTimerRef.current) {
        clearTimeout(rotationTimerRef.current);
      }
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
   * Manually clears the whiteboard and alerts Gemini Live.
   */
  const clearWhiteboard = useCallback(({ clearHistory = false } = {}) => {
    setWhiteboardItems([]);
    whiteboardItemsRef.current = [];
    if (clearHistory) {
      setMessages([]);
      messagesRef.current = [];
      lastUserQueryRef.current = '';
      conversationHistoryRef.current = [];
      latestResumptionHandleRef.current = null;
      isResumedSessionRef.current = false;
    }
    if (liveClientRef.current && liveClientRef.current.isConnected) {
      liveClientRef.current.sendContextNotification(
        clearHistory
          ? `[STUDENT STARTED BRAND NEW FRESH STUDY SESSION]: All previous notes, formulas, equations, and topics have been cleared. Forget prior discussions. Greet warmly in 1 short sentence and ask what new topic the student would like to learn today!`
          : `[WHITEBOARD CLEARED]: The student has erased the whiteboard to start a fresh topic.`
      );
    }
  }, []);

  /**
   * Resets both whiteboard and conversational transcript history to start 100% fresh,
   * without needing a browser reload / F5.
   */
  const startFreshSession = useCallback(() => {
    // 1. Clear whiteboard notes
    setWhiteboardItems([]);
    whiteboardItemsRef.current = [];

    // 2. Clear conversation messages & transcript history
    setMessages([]);
    messagesRef.current = [];
    lastUserQueryRef.current = '';
    conversationHistoryRef.current = [];
    hasTurnWhiteboardUpdateRef.current = false;
    currentTurnAssistantTextRef.current = '';
    setIsSearching(false);
    setSearchQuery('');
    latestResumptionHandleRef.current = null;
    isResumedSessionRef.current = false;

    // 3. Clear active session pointer in sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('aristotle_active_session_id');
    }

    // 4. If connection is already open, notify model immediately of the fresh reset
    if (liveClientRef.current && liveClientRef.current.isConnected) {
      const sName = studentProfileRef.current?.name || 'Adi';
      liveClientRef.current.sendContextNotification(
        `[STUDENT STARTED BRAND NEW FRESH STUDY SESSION]: ${sName} has started a completely new, clean study session. All previous notes, formulas, equations, and topics have been cleared. Forget prior discussions. Greet ${sName} warmly in 1 short sentence and ask what new topic they would like to learn today!`,
        { turnComplete: true }
      );
    }
  }, []);

  /**
   * Restores previous study session notes onto whiteboard and synchronizes context with Gemini Live.
   */
  const restoreSessionContext = useCallback((pastItems = [], sessionTitle = '') => {
    setWhiteboardItems(pastItems);
    whiteboardItemsRef.current = pastItems;

    if (liveClientRef.current && liveClientRef.current.isConnected && pastItems.length > 0) {
      const summary = formatWhiteboardSummary(pastItems);
      const sName = studentProfileRef.current?.name || 'Adi';
      liveClientRef.current.sendContextNotification(
        `[STUDENT RESTORED PAST STUDY SESSION]: ${sName} just loaded their previous study session${sessionTitle ? ` titled "${sessionTitle}"` : ''} onto the whiteboard.\nThe whiteboard is now populated with these notes and topics:\n${summary}\n\nYou can see all of these notes on the whiteboard right now. When ${sName} asks "hum kya padh rahe the" or asks to resume, immediately reference these specific topics/formulas and continue teaching from here without asking them to remind you! NEVER say "mujhe yaad nahi" or "har naye session me data save nahi hota".`
      );
    }
  }, []);

  /**
   * Core function to establish or rotate Gemini Live WebSocket session.
   */
  const createAndConnectClient = async (targetModel, { isRotation = false } = {}) => {
    const token = await fetchEphemeralToken(targetModel);

    // 1. Gather all whiteboard notes
    const whiteboardSummary = formatWhiteboardSummary(whiteboardItemsRef.current);

    // 2. Gather conversation transcript history
    const dialogueHistorySummary = formatDialogueHistory(messagesRef.current);

    // 3. Determine recent topics (from whiteboard items OR from last student questions)
    let recentTopics = whiteboardItemsRef.current
      .map((item) => item.topic)
      .filter(Boolean)
      .slice(-6)
      .join(', ');

    if (!recentTopics && messagesRef.current.length > 0) {
      const userMsgs = messagesRef.current.filter((m) => m.sender === 'user' && m.text);
      if (userMsgs.length > 0) {
        const lastQ = userMsgs[userMsgs.length - 1].text.slice(0, 100);
        recentTopics = `Student topic/question: "${lastQ}"`;
      }
    }

    const activeResumptionHandle = (ENABLE_SESSION_RESUMPTION && isRotation)
      ? latestResumptionHandleRef.current
      : null;
    isResumedSessionRef.current = Boolean(activeResumptionHandle);

    const hasPriorContext = Boolean(dialogueHistorySummary || whiteboardSummary || isRotation);

    let cloudMemory = null;
    if (!isRotation && !hasPriorContext && userRef.current?.id) {
      try {
        cloudMemory = await cloudMemoryService.getStudentContext(userRef.current.id, recentTopics || null);
        if (cloudMemory?.latestLesson) {
          console.log('[useGeminiLive] ☁️ Loaded returning student cloud memory from Supabase:', cloudMemory.latestLesson.topic);
        }
      } catch (e) {
        console.warn('[useGeminiLive] Cloud memory retrieval warning:', e?.message || e);
      }
    }

    console.log('[useGeminiLive] Establishing session:', {
      isRotation,
      hasPriorContext,
      hasResumptionHandle: Boolean(activeResumptionHandle),
      dialogueTurnsCount: messagesRef.current.length,
      recentTopics: recentTopics || 'none',
    });

    const teacherSystemInstruction = buildTeacherSystemInstruction(
      studentProfileRef.current,
      recentTopics,
      whiteboardSummary,
      dialogueHistorySummary
    );

    let clientInstance;
    clientInstance = new GeminiLiveClient({
      backendUrl: BACKEND_URL,
      sessionId: browserSessionIdRef.current,
      onOpen: () => {
        console.log(`[useGeminiLive] Live session connected & established (isRotation: ${isRotation}, hasPriorContext: ${hasPriorContext}).`);
        if (typeof window !== 'undefined') {
          window.__geminiClient = clientInstance;
        }
        setSessionStatus('connected');
        setConversationState('listening');
        reconnectAttemptsRef.current = 0;
        isRotatingRef.current = false;

        // Schedule proactive session rotation at 8 min 45 sec (525,000 ms)
        // Periodic silent whiteboard anchor (every 7 minutes) so Gemini Live retains whiteboard memory even after 1-4 hours of continuous conversation
        if (rotationTimerRef.current) clearInterval(rotationTimerRef.current);
        rotationTimerRef.current = setInterval(() => {
          if (clientInstance && clientInstance.isConnected && whiteboardItemsRef.current.length > 0) {
            const summary = formatWhiteboardSummary(whiteboardItemsRef.current);
            console.log('[useGeminiLive] Emitting periodic silent whiteboard state anchor (zero speech lag).');
            clientInstance.sendContextNotification(
              '[WHITEBOARD MEMORY SYNC]: Current active whiteboard items visible to student:\n' + summary + '\nContinue teaching seamlessly.'
            );
          }
        }, 420000);

        // Send handshake directly to clientInstance
        const sName = studentProfileRef.current?.name || 'Adi';
        const sGrade = studentProfileRef.current?.grade || 'Class 8-10 / Middle School';
        const sInterests = studentProfileRef.current?.interests || 'Cricket, Science experiments, Video games';
        const sLang = studentProfileRef.current?.preferredLanguage || 'Hinglish (Hindi + English mix)';

        setTimeout(() => {
          if (clientInstance && clientInstance.isConnected) {
            if (isResumedSessionRef.current) {
              console.log('[useGeminiLive] ⚡ Session resumed seamlessly via Google Session Resumption Handle! Context preserved on server without duplicate prompt injection.');
              isResumedSessionRef.current = false;
            } else if (hasPriorContext) {
              const continuationPayload = `[STUDENT ONGOING LESSON CONTINUATION CONTEXT]:
The student's name is "${sName}", Grade: "${sGrade}", Language: "${sLang}".
You are in the middle of an active live voice conversation with ${sName}.
Recent spoken dialogue transcript:
${dialogueHistorySummary || 'Continuing discussion from previous turns.'}

Current Whiteboard Notes / Topics:
${whiteboardSummary || recentTopics || 'Discussed in dialogue above'}

CRITICAL DIRECTIVES:
1. DO NOT SAY "Ab main naya topic padhaunga", "Aaj hum kya padhenge", or "Let's start a fresh topic"!
2. You ALREADY know what you were teaching. When ${sName} asks "kya topic hai?" or "hum kya padh rahe the?", directly state the active topic: "${recentTopics || 'jo topic hum discuss kar rahe the'}"!
3. DO NOT repeat greetings or ask what ${sName} wants to learn. Continue directly from where you paused.`;

              console.log('[useGeminiLive] Sending continuation handshake to clientInstance:', continuationPayload.slice(0, 150));
              clientInstance.sendContextNotification(continuationPayload, { turnComplete: true });
            } else if (cloudMemory && cloudMemory.latestLesson) {
              const lastTopic = cloudMemory.latestLesson.topic || 'the previous lesson';
              const solvedCount = cloudMemory.latestLesson.problemsSolved || 0;
              const insightsStr = cloudMemory.insights?.length ? `Student learning style notes: ${cloudMemory.insights.join('; ')}` : '';

              console.log('[useGeminiLive] ☁️ Sending returning student Cloud Memory handshake to clientInstance.');
              clientInstance.sendContextNotification(
                `[STUDENT RETURNING CLOUD MEMORY HANDSHAKE]: The student's name is "${sName}".
This is a returning student whose progress is saved in Supabase Cloud Memory!
- Last studied topic: "${lastTopic}".
- Problems previously solved: ${solvedCount}.
${insightsStr ? `- ${insightsStr}\n` : ''}
Greet "${sName}" warmly by name in 1-2 spoken sentences. Mention that you remember studying "${lastTopic}" with them last time, and ask if they'd like to continue with it or explore something new today!`,
                { turnComplete: true }
              );
            } else {
              console.log('[useGeminiLive] Sending fresh student profile handshake to clientInstance.');
              clientInstance.sendContextNotification(
                `[STUDENT PROFILE HANDSHAKE]: The student's name is "${sName}". Greet them warmly and helpfully in 1 short sentence matching their language, and ask how you can help them today. Speak at most 1-2 sentences!`,
                { turnComplete: true }
              );
            }
          }
        }, 200);
      },
      onClose: (event) => {
        console.log(`[useGeminiLive] Live session closed (code: ${event?.code}, reason: ${event?.reason || 'none'}).`);
        if (isExplicitlyEndedRef.current) {
          setSessionStatus('disconnected');
          setConversationState('idle');
          setIsSearching(false);
          setSearchQuery('');
          if (audioRecorderRef.current) {
            audioRecorderRef.current.stop();
            audioRecorderRef.current = null;
          }
          return;
        }

        // Involuntary disconnect detected (e.g. 10-minute timeout code 1011/1000 or network drop 1006)
        console.warn('[useGeminiLive] Involuntary session close detected. Triggering auto-reconnect...');
        handleAutoReconnect(false);
      },
      onError: (err) => {
        console.error('[useGeminiLive] Live client error:', err);
        if (!isExplicitlyEndedRef.current && reconnectAttemptsRef.current < 4) {
          handleAutoReconnect(false);
        } else {
          setError('Live connection error occurred.');
          setSessionStatus('error');
          setIsSearching(false);
        }
      },
      onAudioChunk: (chunk) => {
        if (audioPlayerRef.current) {
          audioPlayerRef.current.playChunk(chunk);
        }
      },
      onTurnComplete: () => {
        console.log('[useGeminiLive] Model turn complete. Ready for student voice input.');
        setIsSearching(false);
        setConversationState('listening');
        setMessages((prev) =>
          prev.map((m) => (m.isPartial ? { ...m, isPartial: false } : m))
        );
      },
      onInterrupted: () => {
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
        const channelCall = calls.find((c) => c.name === 'youtube_channel_search');
        const youtubeCall = calls.find((c) => c.name === 'youtube_fetch_transcript');
        const browserCall = calls.find((c) => c.name.startsWith('browser_'));

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

        if (channelCall) {
          const ch = channelCall.args?.channelName || '';
          const t = channelCall.args?.type === 'playlists' ? 'playlists' : 'latest videos';
          const q = channelCall.args?.query ? ` (search: "${channelCall.args.query}")` : '';
          console.log(`[useGeminiLive] Tool call triggered: youtube_channel_search "${ch}" (${t}${q})`);
          setIsSearching(true);
          setSearchQuery(`YouTube: ${ch}${q}`);
          setConversationState('thinking');
          setMessages((prev) => [
            ...prev,
            {
              id: 'tool-' + Date.now() + Math.random().toString(36).slice(2, 5),
              sender: 'tool',
              toolName: 'YouTube Channel',
              query: ch,
              text: `Checking real-time ${t} on YouTube channel "${ch}"${q}...`,
              isSearching: true,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }

        if (youtubeCall) {
          const q = youtubeCall.args?.query || youtubeCall.args?.videoUrlOrId || '';
          const ch = youtubeCall.args?.channelName ? ` on ${youtubeCall.args.channelName}` : '';
          console.log(`[useGeminiLive] Tool call triggered: youtube_fetch_transcript "${q}"${ch}`);
          setIsSearching(true);
          setSearchQuery(`YouTube: ${q}${ch}`);
          setConversationState('thinking');
          setMessages((prev) => [
            ...prev,
            {
              id: 'tool-' + Date.now() + Math.random().toString(36).slice(2, 5),
              sender: 'tool',
              toolName: 'YouTube Transcript',
              query: q,
              text: `Retrieving YouTube video & transcript for: "${q}"${ch}...`,
              isSearching: true,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }

        if (browserCall) {
          console.log(`[useGeminiLive] Browser tool call detected: ${browserCall.name}`);
          setBrowserState((prev) => ({
            ...prev,
            isOpen: true,
            isLoading: true,
            lastAction: browserCall.name,
          }));
        }
      },
      onToolResponse: () => {
        console.log('[useGeminiLive] Tool response received. Resuming speech generation.');
        setIsSearching(false);
        setBrowserState((prev) => ({ ...prev, isLoading: false }));
        setMessages((prev) =>
          prev.map((m) =>
            m.sender === 'tool' && m.isSearching
              ? {
                ...m,
                isSearching: false,
                text: `Completed request for: "${m.query}"`,
              }
              : m
          )
        );
      },
      onBrowserFrame: (frameData) => {
        console.log('[useGeminiLive] Live browser frame received:', frameData.title);
        setBrowserState((prev) => ({
          ...prev,
          isOpen: true,
          url: frameData.url,
          title: frameData.title,
          screenshot: frameData.screenshot,
          isLoading: false,
          lastAction: frameData.action,
          clickCoordinates: frameData.clickCoordinates,
          boundingBox: frameData.boundingBox,
          label: frameData.label,
          isReaderMode: frameData.isReaderMode,
          showSoMBadges: frameData.showSoMBadges,
          somCount: frameData.somCount,
        }));
      },
      onClearWhiteboard: () => {
        console.log('[useGeminiLive] clear_whiteboard tool executed.');
        setWhiteboardItems([]);
      },
      onHighlightWhiteboard: (args) => {
        const topic = args?.topic || '';
        console.log('[useGeminiLive] AI highlighted whiteboard card:', topic, args?.reason);
        setAiHighlightedTopic({
          topic,
          reason: args?.reason || '',
          timestamp: Date.now(),
        });
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = setTimeout(() => {
          setAiHighlightedTopic(null);
        }, 7000);
      },
      onLaserPointCanvas: (args) => {
        console.log('[useGeminiLive] AI pointed laser on canvas:', args);
        setAiLaserPoint({
          x: typeof args?.x === 'number' ? args.x : 50,
          y: typeof args?.y === 'number' ? args.y : 50,
          label: args?.label || '',
          style: args?.style || 'laser',
          id: Date.now(),
        });
        if (laserTimerRef.current) clearTimeout(laserTimerRef.current);
        laserTimerRef.current = setTimeout(() => {
          setAiLaserPoint(null);
        }, 6000);
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

        // Automatic Markdown Table Detection from notes or tableData
        let resolvedTableData = args.tableData || null;
        if (!resolvedTableData && Array.isArray(notes)) {
          const tableLines = notes.filter((n) => typeof n === 'string' && n.includes('|'));
          if (tableLines.length >= 2) {
            const headerLine = tableLines[0];
            const headers = headerLine.split('|').map((c) => c.trim()).filter(Boolean);
            let startRow = 1;
            if (tableLines.length > 1 && /^[\s\-:|]+$/.test(tableLines[1])) {
              startRow = 2;
            }
            const rows = [];
            for (let i = startRow; i < tableLines.length; i++) {
              let cells = tableLines[i].split('|').map((c) => c.trim());
              if (tableLines[i].trim().startsWith('|') && cells[0] === '') cells.shift();
              if (tableLines[i].trim().endsWith('|') && cells[cells.length - 1] === '') cells.pop();
              if (cells.some((c) => c.length > 0)) {
                rows.push(cells);
              }
            }
            if (headers.length > 0 && rows.length > 0) {
              resolvedTableData = { headers, rows };
              // Filter out the raw pipe markdown strings from text bullets so it doesn't duplicate
              notes = notes.filter((n) => typeof n === 'string' && !n.includes('|'));
            }
          }
        }

        // Resolve SVG diagram: use Gemini's svgCode, or generate an authentic domain SVG across any subject so every concept card is visually illustrated
        const isAnimationOrMedia = Boolean(args.animationType || args.visualType === 'animation' || args.imageUrl || args.image || args.animationUrl);
        const resolvedSvgCode = args.svgCode || (
          !isAnimationOrMedia && args.cardType === 'visual' && topic && topic.length > 1
            ? generateUniversalTopicSvg(topic, notes, args.formula, args.subject)
            : null
        );
        const resolvedDiagram = args.diagram || null;
        const resolvedVisualType = args.visualType || (resolvedDiagram ? 'diagram' : args.animationType ? 'animation' : resolvedSvgCode ? 'svg' : args.imageUrl ? 'photo' : null);

        const newItem = {
          id: args.id || ('wb-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)),
          topic,
          notes,
          cardType: args.cardType || (args.animationType || args.visualType === 'animation' ? 'visual' : args.image ? 'image' : args.formula ? 'formula' : args.code ? 'code' : 'concept'),
          formula: args.formula || null,
          code: args.code || (args.component === 'code' ? args.content : null),
          language: (args.language || '').toLowerCase().trim() || null,
          question: args.question || null,
          studentAnswer,
          image: args.image || null,
          caption: args.caption || null,
          tableData: resolvedTableData,
          visualType: resolvedVisualType,
          animationType: args.animationType || null,
          animationUrl: args.animationUrl || null,
          thumbnailUrl: args.thumbnailUrl || null,
          isVideo: Boolean(args.isVideo),
          isGif: Boolean(args.isGif),
          simType: args.simType || null,
          simulationCode: args.simulationCode || null,
          equation: args.equation || null,
          sceneCode: args.sceneCode || null,
          videoUrl: args.videoUrl || null,
          isRendering: Boolean(args.isRendering),
          parameters: args.parameters || null,
          diagram: resolvedDiagram,
          svgCode: resolvedSvgCode,
          imageUrl: args.imageUrl || null,
          imageTitle: args.imageTitle || null,
          attribution: args.attribution || null,
          subject: args.subject || null,
          video: args.video || null,
          timeline: Array.isArray(args.timeline) ? args.timeline : null,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        // Merge notes if teacher continues elaborating on same topic
        setWhiteboardItems((prev) => {
          // If updating an existing item in-place by ID (e.g. Manim async compilation finished)
          if (args.id) {
            const existingIdx = prev.findIndex((it) => it.id === args.id);
            if (existingIdx !== -1) {
              const updatedList = [...prev];
              updatedList[existingIdx] = {
                ...updatedList[existingIdx],
                ...newItem,
                id: args.id,
                notes: newItem.notes.length > 0 ? newItem.notes : updatedList[existingIdx].notes,
              };
              return updatedList;
            }
          }

          const lastItem = prev[prev.length - 1];
          if (
            lastItem &&
            lastItem.topic &&
            topic &&
            isSameOrRelatedTopic(lastItem.topic, topic)
          ) {
            // Dedicated cards (video timeline, visual diagrams) should NEVER be merged into plain text notes!
            const isNewItemTimeline = newItem.cardType === 'video_timeline' || Boolean(newItem.timeline);
            const isLastItemTimeline = lastItem.cardType === 'video_timeline' || Boolean(lastItem.timeline);
            if (isNewItemTimeline || isLastItemTimeline) {
              return [...prev, newItem];
            }

            const isNewItemAnimation = Boolean(newItem.animationType) || newItem.visualType === 'animation';
            const isLastItemAnimation = Boolean(lastItem.animationType) || lastItem.visualType === 'animation';

            // STAGE 2 PRESERVATION: An animation card must NEVER merge into an introductory textbook card!
            // It must append chronologically below so initial notes and static diagrams are 100% preserved.
            if (isNewItemAnimation && !isLastItemAnimation) {
              return [...prev, newItem];
            }

            const isNewItemVisual = Boolean(newItem.svgCode || newItem.imageUrl || newItem.cardType === 'visual' || newItem.visualType);
            const isLastItemVisual = Boolean(lastItem.svgCode || lastItem.imageUrl || lastItem.cardType === 'visual' || lastItem.visualType);

            // ANTI-DUPLICATION GUARD: If both are visual cards for the EXACT SAME topic or animation type, update the card in-place rather than duplicating!
            if (isNewItemVisual && isLastItemVisual) {
              const isSameTopic = isSameOrRelatedTopic(lastItem.topic, topic);
              const isSameAnim = (lastItem.animationType && lastItem.animationType === newItem.animationType) ||
                (lastItem.visualType && lastItem.visualType === newItem.visualType);
              if (isSameTopic && isSameAnim) {
                const updatedList = [...prev];
                updatedList[updatedList.length - 1] = {
                  ...lastItem,
                  ...newItem,
                  id: lastItem.id,
                  notes: newItem.notes.length > 0 ? newItem.notes : lastItem.notes,
                };
                return updatedList;
              }
              return [...prev, newItem];
            }

            const mergedNotes = [...lastItem.notes];
            for (const note of notes) {
              const noteClean = note.trim().toLowerCase();
              if (!mergedNotes.some((n) => n.trim().toLowerCase() === noteClean)) {
                mergedNotes.push(note);
              }
            }

            const updatedItem = {
              ...lastItem,
              notes: mergedNotes,
              formula: args.formula || lastItem.formula,
              code: args.code || lastItem.code,
              language: (args.language || '').toLowerCase().trim() || lastItem.language,
              question: args.question || lastItem.question,
              studentAnswer: studentAnswer || lastItem.studentAnswer,
              visualType: args.visualType || (resolvedSvgCode ? 'svg' : lastItem.visualType),
              svgCode: args.svgCode || lastItem.svgCode || resolvedSvgCode,
              imageUrl: args.imageUrl || lastItem.imageUrl,
              imageTitle: args.imageTitle || lastItem.imageTitle,
              attribution: args.attribution || lastItem.attribution,
              subject: args.subject || lastItem.subject,
              caption: args.caption || lastItem.caption,
              tableData: resolvedTableData || lastItem.tableData,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };

            const updatedList = [...prev];
            updatedList[updatedList.length - 1] = updatedItem;
            return updatedList;
          }

          return [...prev, newItem];
        });

        // Auto-load code into Code Lab if code was written
        if (newItem.code && onCodeGenerated) {
          onCodeGenerated(newItem.code, newItem.language);
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
            messagesRef.current = updated;
            return updated;
          } else {
            const updated = [
              ...prev,
              {
                id: Date.now() + Math.random().toString(36).slice(2, 6),
                sender,
                text,
                isPartial,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ];
            messagesRef.current = updated;
            return updated;
          }
        });
      },
      onResumptionUpdate: (newHandle) => {
        if (newHandle) {
          latestResumptionHandleRef.current = newHandle;
          console.log('[useGeminiLive] 🔄 Cached fresh sessionResumption handle from server.');
        }
      },
      onGoAway: () => {
        console.warn('[useGeminiLive] ⚠️ Server sent GoAway notice. Proactively rotating connection before cutoff...');
        handleAutoReconnect(true);
      },
    });

    // Connect WebSocket
    let connectAttempt = 0;
    let connectedSuccessfully = false;
    let lastConnectError = null;

    while (connectAttempt < 2 && !connectedSuccessfully) {
      connectAttempt++;
      try {
        await clientInstance.connect(token, {
          model: targetModel,
          voiceName: selectedVoiceRef.current,
          systemInstruction: teacherSystemInstruction,
          resumptionHandle: activeResumptionHandle,
        });
        connectedSuccessfully = true;
      } catch (connErr) {
        lastConnectError = connErr;
        console.warn(`[useGeminiLive] Live connect attempt #${connectAttempt} failed, retrying in 400ms...`, connErr);
        if (connectAttempt < 2) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    }

    if (!connectedSuccessfully) {
      throw lastConnectError || new Error('Failed to connect to Gemini Live session.');
    }

    return clientInstance;
  };

  /**
   * Establishes active live session using createAndConnectClient
   */
  const establishLiveSession = async (targetModel, { isRotation = false } = {}) => {
    const client = await createAndConnectClient(targetModel, { isRotation });
    liveClientRef.current = client;
    return client;
  };

  /**
   * Automatically rotates or reconnects the session seamlessly without user intervention.
   */
  const handleAutoReconnect = async (isProactive = false) => {
    if (isExplicitlyEndedRef.current) return;
    if (isRotatingRef.current) return;

    if (reconnectAttemptsRef.current >= 5) {
      console.error('[useGeminiLive] Maximum auto-reconnect attempts reached (5). Terminating session.');
      setSessionStatus('disconnected');
      setConversationState('idle');
      if (audioRecorderRef.current) {
        audioRecorderRef.current.stop();
        audioRecorderRef.current = null;
      }
      return;
    }

    isRotatingRef.current = true;
    reconnectAttemptsRef.current += 1;
    console.log(`[useGeminiLive] Auto-reconnecting session (attempt #${reconnectAttemptsRef.current}, proactive: ${isProactive})...`);

    if (isProactive && liveClientRef.current && liveClientRef.current.isConnected) {
      // ZERO-STUTTER HOT-HANDOFF: Keep old client active, connect new client in background
      try {
        const model = currentModelRef.current;
        const oldClient = liveClientRef.current;
        console.log('[useGeminiLive] Starting Hot-Handoff background connection with next pool key...');

        const newClient = await createAndConnectClient(model, { isRotation: true });

        // Atomically switch active client reference (0ms downtime)
        liveClientRef.current = newClient;
        isRotatingRef.current = false;
        reconnectAttemptsRef.current = 0;
        console.log('[useGeminiLive] Hot-Handoff completed successfully! Audio routed to new connection with 0ms gap.');

        // Allow 1.5s for any pending audio from oldClient to finish playing, then retire oldClient
        setTimeout(() => {
          try {
            oldClient.disconnect();
          } catch (_) { }
        }, 1500);

        return;
      } catch (hotErr) {
        console.warn('[useGeminiLive] Hot-Handoff background connection failed, falling back to standard reconnect:', hotErr);
      }
    }

    // Standard fallback reconnect (for unexpected network drop or socket error)
    if (liveClientRef.current) {
      try {
        liveClientRef.current.disconnect();
      } catch (_) { }
      liveClientRef.current = null;
    }

    if (rotationTimerRef.current) {
      clearTimeout(rotationTimerRef.current);
      rotationTimerRef.current = null;
    }

    await new Promise((r) => setTimeout(r, 400));

    try {
      const model = currentModelRef.current;
      await establishLiveSession(model, { isRotation: true });
      console.log('[useGeminiLive] Session reconnected successfully via standard fallback.');
    } catch (err) {
      console.error('[useGeminiLive] Auto-reconnect attempt failed:', err);
      isRotatingRef.current = false;
      setTimeout(() => handleAutoReconnect(false), 1200);
    }
  };

  /**
   * Starts a voice session with the AI Teacher.
   */
  const startSession = useCallback(async (targetModel = currentModel) => {
    try {
      setError(null);
      isExplicitlyEndedRef.current = false;
      reconnectAttemptsRef.current = 0;
      isRotatingRef.current = false;
      setSessionStatus('connecting');
      setIsSearching(false);
      setSearchQuery('');
      hasTurnWhiteboardUpdateRef.current = false;
      currentTurnAssistantTextRef.current = '';

      if (rotationTimerRef.current) {
        clearTimeout(rotationTimerRef.current);
        rotationTimerRef.current = null;
      }

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

      await establishLiveSession(targetModel, { isRotation: false });

      // Initialize and start microphone recorder if not already active
      if (!audioRecorderRef.current) {
        let chunkCount = 0;
        let silenceChunksCount = 0;
        let isStreamPaused = false;
        const preBuffer = [];
        const IDLE_SILENCE_CHUNKS = 30; // 3.0s of genuine quiet before entering idle solving mode
        const SPEECH_RESUME_THRESHOLD = 0.02; // Ultra-sensitive threshold to wake stream on soft whispers

        audioRecorderRef.current = new AudioRecorder({
          onAudioChunk: (chunk, vol = 0) => {
            if (!liveClientRef.current || !liveClientRef.current.isConnected) return;

            const isAssistantSpeaking = Boolean(audioPlayerRef.current?.isPlaying);

            if (isAssistantSpeaking) {
              // 1. Assistant is speaking: Suppress minor speaker echo bleed (vol < 0.12)
              // If user speaks loud (vol >= 0.12), immediate barge-in interruption!
              if (vol >= 0.12) {
                liveClientRef.current.sendAudioChunk(chunk);
              }
              silenceChunksCount = 0;
              isStreamPaused = false;
              preBuffer.length = 0;
              return;
            }

            // 2. Assistant is NOT speaking:
            if (isStreamPaused) {
              // User has been in Idle Solving Mode (> 3.0s silence, audioStreamEnd already signaled)
              // Keep last 3 chunks (~300ms) in rolling pre-buffer
              preBuffer.push(chunk);
              if (preBuffer.length > 3) {
                preBuffer.shift();
              }

              // Check if user has started speaking again to wake the stream
              if (vol > SPEECH_RESUME_THRESHOLD) {
                isStreamPaused = false;
                silenceChunksCount = 0;

                // Instantly flush rolling pre-buffer (300ms) so not even the first consonant is clipped
                while (preBuffer.length > 0) {
                  liveClientRef.current.sendAudioChunk(preBuffer.shift());
                }

                chunkCount++;
                liveClientRef.current.sendAudioChunk(chunk);
              }
              // While in idle solving mode and vol <= threshold, do NOT stream empty room hiss
            } else {
              // Normal Active Conversation Mode: Stream 100% CONTINUOUSLY for natural human-like flow
              chunkCount++;
              liveClientRef.current.sendAudioChunk(chunk);

              // Monitor for prolonged idle silence (> 3.0s)
              if (vol < 0.025) {
                silenceChunksCount++;
                if (silenceChunksCount >= IDLE_SILENCE_CHUNKS) {
                  // User has been genuinely silent for > 3.0s (e.g. solving question on paper)
                  isStreamPaused = true;
                  console.log('[useGeminiLive] 3s Idle silence detected: Sending audioStreamEnd to finalize turn & protect context.');
                  liveClientRef.current.sendAudioStreamEnd();
                  preBuffer.length = 0;
                }
              } else {
                silenceChunksCount = 0;
              }
            }
          },
          onVolumeChange: (vol) => {
            inputVolumeRef.current = vol;
            if (vol > 0.08) {
              setConversationState((prev) => (prev === 'idle' ? 'listening' : prev));
            }
          },
        });
        await audioRecorderRef.current.start();
      }

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
  }, [currentModel]);

  /**
   * Ends the active voice session manually.
   */
  const endSession = useCallback(() => {
    isExplicitlyEndedRef.current = true;
    if (rotationTimerRef.current) {
      clearTimeout(rotationTimerRef.current);
      rotationTimerRef.current = null;
    }
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
    latestResumptionHandleRef.current = null;
    isResumedSessionRef.current = false;
    setSessionStatus('disconnected');
    setConversationState('idle');
    setIsSearching(false);
    setSearchQuery('');
    inputVolumeRef.current = 0;

    // Asynchronously sync whiteboard lesson progress & extract insights into Supabase (off live voice path)
    if (userRef.current?.id) {
      if (whiteboardItemsRef.current.length > 0) {
        const activeTopic = whiteboardItemsRef.current.find((item) => item.topic)?.topic || 'Study Session';
        const subtopics = whiteboardItemsRef.current.map((item) => item.topic).filter(Boolean);
        const summary = formatWhiteboardSummary(whiteboardItemsRef.current);
        cloudMemoryService.recordLessonProgress(userRef.current.id, {
          topic: activeTopic,
          subtopics: subtopics.slice(-5),
          whiteboardSummary: summary,
        });
      }

      // Extract cognitive insights from dialogue transcript using ultra-light gemini-3.5-flash-lite
      const dialogueSummary = formatDialogueHistory(messagesRef.current);
      if (dialogueSummary && dialogueSummary.length > 30) {
        const sName = studentProfileRef.current?.name || 'Student';
        cloudMemoryService.extractAndSaveInsights(userRef.current.id, dialogueSummary, sName).catch(() => {});
      }
    }
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
   * Silently syncs environment updates (e.g. Code Lab code change or execution output) to the teacher.
   */
  const sendContextUpdate = useCallback((contextText) => {
    if (liveClientRef.current && liveClientRef.current.isConnected) {
      liveClientRef.current.sendContextNotification(contextText);
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

  /**
   * Allows user or UI to trigger manual browser action (navigate, reload, click, scroll).
   */
  const executeBrowserAction = useCallback(async (actionPayload) => {
    setBrowserState((prev) => ({ ...prev, isLoading: true }));
    try {
      const res = await fetch(`${BACKEND_URL}/api/browser/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': browserSessionIdRef.current,
        },
        body: JSON.stringify({ ...actionPayload, sessionId: browserSessionIdRef.current }),
      });

      if (res.ok) {
        const data = await res.json();
        setBrowserState((prev) => ({
          ...prev,
          isOpen: true,
          url: data.url,
          title: data.title,
          screenshot: data.screenshot,
          isLoading: false,
          lastAction: data.action,
          clickCoordinates: data.clickCoordinates,
          boundingBox: data.boundingBox,
          label: data.label,
          isReaderMode: data.isReaderMode,
          showSoMBadges: data.showSoMBadges,
          somCount: data.somCount,
        }));

        // If diagram clipped via manual action, add directly to whiteboard
        if (actionPayload.action === 'clip_whiteboard' && data.image) {
          setWhiteboardItems((prev) => [
            ...prev,
            {
              id: 'wb-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
              topic: data.caption || 'Clipped Web Diagram',
              notes: [],
              cardType: 'image',
              image: data.image,
              caption: data.caption,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }

        // Send user's navigation screenshot to Gemini Live visual input
        if (liveClientRef.current && liveClientRef.current.isConnected && data.screenshot) {
          liveClientRef.current.sendImageChunk(data.screenshot);
          liveClientRef.current.sendContextNotification(
            `[STUDENT BROWSER NAVIGATION]: Currently viewing "${data.title}" at ${data.url}.`
          );
        }
        return data;
      }
    } catch (err) {
      console.error('[useGeminiLive] Manual browser action error:', err);
    } finally {
      setBrowserState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  /**
   * Sends student's hand-drawn whiteboard snapshot to Gemini Live visual vision stream
   * for immediate inspection and spoken review.
   */
  const inspectWhiteboardSnapshot = useCallback((base64Jpeg) => {
    if (liveClientRef.current && liveClientRef.current.isConnected && base64Jpeg) {
      const sName = studentProfileRef.current?.name || 'Adi';
      setConversationState('thinking');
      // 1. Send both as streaming image chunk for vision buffer
      liveClientRef.current.sendImageChunk(base64Jpeg);
      // 2. Also send as inlineData inside the active conversational turn with turnComplete: true
      liveClientRef.current.sendVisualInspectionTurn({
        base64Jpeg,
        promptText: `[STUDENT WHITEBOARD DRAWING INSPECTION]: Look at the attached image showing ${sName}'s handwritten canvas strokes (drawn in dark pen/marker). Specifically examine what ${sName} drew/wrote (e.g. math numbers, letters like 'x', equations like 'x+5', coordinate axes, graphs, lines, or checkmarks). Speak out loud to ${sName} describing what you see, confirming if it's correct or what it means. DO NOT call write_on_whiteboard saying "whiteboard is empty"—the image shows their active handwritten strokes!`,
      });
    }
  }, []);

  return {
    sessionStatus,
    conversationState,
    currentModel,
    selectedVoice,
    setSelectedVoice,
    isMuted,
    inputVolume: inputVolumeRef.current,
    error,
    messages,
    isSearching,
    searchQuery,
    browserState,
    setBrowserState,
    executeBrowserAction,
    whiteboardItems,
    setWhiteboardItems,
    clearWhiteboard,
    restoreSessionContext,
    startFreshSession,
    aiHighlightedTopic,
    aiLaserPoint,
    inspectWhiteboardSnapshot,
    startSession,
    endSession,
    toggleMute,
    sendTextMessage,
    sendContextUpdate,
    switchModel,
  };
}
