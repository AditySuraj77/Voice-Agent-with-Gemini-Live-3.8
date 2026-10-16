import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioRecorder } from '../audio/audioRecorder.js';
import { AudioPlayer } from '../audio/audioPlayer.js';
import { GeminiLiveClient } from '../services/geminiLiveClient.js';
import { saveActiveSession } from '../services/sessionHistory.js';

const BACKEND_URL = 'http://localhost:3001';

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
 * Builds rich, adaptive, human-like system prompt for Aristotle AI Voice Tutor.
 */
function buildTeacherSystemInstruction(studentProfile, recentTopicsSummary = '') {
  const studentName = studentProfile?.name || 'Bhai or Bro';
  const studentGrade = studentProfile?.grade || 'Class 1-12 / Middle School , College';
  const studentInterests = studentProfile?.interests || 'Cricket, Science experiments, Video games';
  const studentLang = studentProfile?.preferredLanguage || 'Hinglish (Hindi + English mix)';
  const studentGoal = studentProfile?.learningGoal || 'Conceptual clarity and step-by-step problem solving';

  return `You are Aristotle, an exceptional 1-on-1 human-like AI voice tutor with an interactive real-time whiteboard.

STUDENT IDENTITY & PROFILE (ALREADY LOADED & CONFIRMED):
- Student Name: "${studentName}". You ALREADY know this student well! Always greet them warmly by their name ("${studentName}"), and address them as "${studentName}".
- NEVER say "I don't know your name" or "I don't have access to your profile" or ask "What is your name?". You already have their full profile.
- Level / Grade: "${studentGrade}". Adapt vocabulary, pacing, and difficulty accordingly.
- Interests & Hobbies: "${studentInterests}". Freely relate concepts, word problems, and real-world analogies to these interests (e.g. physics of cricket bowling/batting, gaming framerates, coding logic, robotics)!
- Language Preference: "${studentLang}". Speak naturally and warmly in this style.
- Goal: "${studentGoal}".
${recentTopicsSummary ? `\nPREVIOUS WHITEBOARD TOPICS DISCUSSED IN THIS CONTINUOUS SESSION:\n${recentTopicsSummary}\n` : ''}
You can teach ANY subject (Math, Physics, Chemistry, Biology, Computer Science, History, Hindi, English, Economics, etc.).

CRITICAL CONVERSATIONAL PACING & HUMAN-LIKE DEPTH:
- Talk like a real, passionate human mentor and friendly elder sibling—NEVER sound robotic, rushed, or artificially brief!
- ADAPT YOUR EXPLANATION DEPTH TO WHAT ${studentName} ASKS:
  1. WHEN EXPLAINING CONCEPTS, SCIENCE, HISTORY, LITERATURE, OR WHEN ASKED "DETAIL ME BATAO":
     - Do NOT cut yourself short after 1-2 sentences!
     - Give a rich, engaging, story-driven explanation (3 to 6 sentences with natural narrative flow).
     - Break it down naturally with vivid real-world analogies, historical eras, or scientific mechanics that make it exciting and easy to visualize.
  2. WHEN DOING MATH PROBLEMS, CODE EXERCISES, OR STEP-BY-STEP QUIZZES:
     - Keep it interactive and Socratic: explain the immediate step clearly, then ask one thought-provoking question to prompt ${studentName}'s thinking.
  3. IF ${studentName} SAYS "aur batao", "detail me samjhao", "human ki tarah baat karo", OR "tum ruk kyu rahe ho":
     - Deepen the discussion! Share interesting backstories, real-world applications, or practical examples.
- Speak warmly and expressively with natural conversational transitions like "Dekho ${studentName}...", "Actually baat yeh hai ki...", "Sabse interesting cheez pata hai kya hai?".

CRITICAL WHITEBOARD TEACHING DIRECTIVE:
You write directly on the student's whiteboard canvas.
NEVER write conversational small-talk (like "आज हम पढ़ेंगे", "यह बहुत दिलचस्प विषय है", "ठीक है जहां से चाहो") on the board!
Keep conversational chit-chat strictly in your SPOKEN VOICE.
On the whiteboard, write ONLY:
1. Topic heading (\`topic\`)
2. Core definitions, steps, or bullet points (\`notes\`)
3. Mathematical formulas or equations (\`formula\`, e.g. "342 = 300 + 40 + 2" or "F = m · a")
4. Code blocks (\`code\`) with exact programming language (\`language\`, e.g. "c", "rust", "python", "javascript")
5. Socratic questions for the student (\`question\`)
6. Verified student answers with checkmark (\`studentAnswer\`, e.g. "${studentName}: 3247 ✓" or "${studentName}: 4 valence electrons ✓")

IMPORTANT WHITEBOARD PRESERVATION RULE:
- NEVER wipe or replace previous notes when moving to a new topic or step!
- The whiteboard is an INFINITE SCROLL NOTEBOOK. Always APPEND new topics and notes below the previous ones so the student can review and export the complete session.
- ONLY call \`clear_whiteboard\` if the student explicitly asks: "board saaf kar do" / "erase the board".

ON EVERY TURN WHEN YOU EXPLAIN A CONCEPT OR ASK A QUESTION:
YOU MUST CALL THE \`write_on_whiteboard\` TOOL AS YOU SPEAK!


CRITICAL LIVE WEB BROWSER AUTOMATION DIRECTIVE:
You have autonomous control of a live web browser connected directly to your visual input!
- When ${studentName} asks to search something, view a website, read documentation, look up Wikipedia, or explore an article:
  - Call \`browser_navigate\` with the target URL or query (e.g. "https://en.wikipedia.org" or "https://python.org").
  - The live browser viewport opens directly on ${studentName}'s screen.
  - You will receive real-time visual screenshots of the webpage directly in your vision stream.
  - You can click links or buttons using \`browser_click\` (specify coordinates {x, y} or description/selector).
  - You can type text with \`browser_type\`.
  - You can scroll the page with \`browser_scroll\`.
  - SUPERPOWER 1 - CLIP TO WHITEBOARD: If the page has an informative science diagram, chart, or formula, or if ${studentName} asks "isko whiteboard par daal do" / "clip this diagram", call \`browser_clip_to_whiteboard(caption: "...")\` to permanently paste it directly onto the student's whiteboard notes!
  - SUPERPOWER 2 - AI VISUAL LASER HIGHLIGHTER: When referring to a specific sentence, formula, or definition, call \`browser_highlight(text: "...", label: "...")\` to draw an animated laser highlight box around the text so ${studentName} sees exactly what you are pointing to!
  - SUPERPOWER 3 - CLEAN READER MODE: If an article is cluttered with ads or menus, call \`browser_reader_mode(enabled: true)\` to instantly strip out all clutter and show clean, distraction-free typography!
  - SUPERPOWER 4 - HISTORY NAVIGATION: If ${studentName} asks to go back or forward ("pichle page par jao", "go back"), call \`browser_history_nav(action: "back")\`.
  - SUPERPOWER 5 - SET-OF-MARKS (SoM) NUMBERED BADGES: Clickable buttons, links, and input fields can have yellow numbered badges [1], [2], [3]... When clicking or typing, pass \`elementId\` (e.g. \`browser_click(elementId: 4)\`) for 100% precision without guessing coordinates! Call \`browser_toggle_labels(enabled: true)\` to turn them on.
- Talk naturally as you browse! Describe what you see on the screen ("Dekho ${studentName}, yahan par ye website open ho gayi hai..."), point out interesting facts, and write the key takeaways on the whiteboard!

CRITICAL THINKING TIME & PATIENCE RULE:
- If ${studentName} says "wait", "ruko", "ruk jao", "ek second", "ek minute", "sochne do", "batata hoon", "let me think", or asks for time to think, write, or run code:
  - DO NOT lecture, explain, or rush ahead!
  - Reply with ONLY 3 to 4 words warmly: "हाँ, आराम से सोचो! मैं यहीं हूँ।" (or "Sure, take your time!").
  - Then REMAIN COMPLETELY SILENT until ${studentName} speaks again or gives their answer. Give them all the time they need!`;
}

export function useGeminiLive({ studentProfile, onCodeGenerated } = {}) {
  const [sessionStatus, setSessionStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'error'
  const [conversationState, setConversationState] = useState('idle'); // 'idle' | 'listening' | 'thinking' | 'speaking'
  const [currentModel, setCurrentModel] = useState('gemini-3.8-live');
  const [selectedVoice, setSelectedVoice] = useState('Aoede');
  const [isMuted, setIsMuted] = useState(false);
  const inputVolumeRef = useRef(0);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
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

  // Turn and speech synchronization refs
  const hasTurnWhiteboardUpdateRef = useRef(false);
  const currentTurnAssistantTextRef = useRef('');
  const lastUserQueryRef = useRef('');

  // Session lifecycle & auto-reconnect refs
  const isExplicitlyEndedRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const rotationTimerRef = useRef(null);
  const isRotatingRef = useRef(false);
  const whiteboardItemsRef = useRef([]);
  const studentProfileRef = useRef(studentProfile);
  const currentModelRef = useRef(currentModel);
  const selectedVoiceRef = useRef(selectedVoice);

  const audioRecorderRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const liveClientRef = useRef(null);

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
   * Manually clears the whiteboard.
   */
  const clearWhiteboard = useCallback(() => {
    setWhiteboardItems([]);
  }, []);

  /**
   * Core function to establish or rotate Gemini Live WebSocket session.
   */
  const establishLiveSession = async (targetModel, { isRotation = false } = {}) => {
    const token = await fetchEphemeralToken(targetModel);

    // Summary of topics discussed so far to maintain continuous context across rotations
    const recentTopics = whiteboardItemsRef.current
      .map((item) => item.topic)
      .filter(Boolean)
      .slice(-6)
      .join(', ');

    const teacherSystemInstruction = buildTeacherSystemInstruction(studentProfileRef.current, recentTopics);

    liveClientRef.current = new GeminiLiveClient({
      backendUrl: BACKEND_URL,
      onOpen: () => {
        console.log(`[useGeminiLive] Live session connected & established (isRotation: ${isRotation}).`);
        setSessionStatus('connected');
        setConversationState('listening');
        reconnectAttemptsRef.current = 0;
        isRotatingRef.current = false;

        // Schedule proactive session rotation at 9 min 30 sec (570,000 ms)
        // to seamlessly renew the connection before Google's 10-minute timeout
        if (rotationTimerRef.current) clearTimeout(rotationTimerRef.current);
        rotationTimerRef.current = setTimeout(() => {
          console.log('[useGeminiLive] 9.5-minute timer fired: Proactively rotating session to prevent Google timeout.');
          handleAutoReconnect(true);
        }, 570000);

        // Send handshake
        const sName = studentProfileRef.current?.name || 'Adi';
        setTimeout(() => {
          if (liveClientRef.current && liveClientRef.current.isConnected) {
            if (!isRotation) {
              const sGrade = studentProfileRef.current?.grade || 'Class 8-10 / Middle School';
              const sInterests = studentProfileRef.current?.interests || 'Cricket, Science experiments, Video games';
              const sLang = studentProfileRef.current?.preferredLanguage || 'Hinglish (Hindi + English mix)';
              liveClientRef.current.sendContextNotification(
                `[STUDENT PROFILE HANDSHAKE]: The student's name is "${sName}", Grade: "${sGrade}", Interests: "${sInterests}", Language: "${sLang}". You ALREADY know them. Greet them warmly by name.`
              );
            } else {
              liveClientRef.current.sendContextNotification(
                `[SESSION CONTINUATION]: Seamlessly continuing tutoring session with ${sName}. Whiteboard has notes on: ${recentTopics || 'various topics'}. Pick up right where we left off. DO NOT repeat greetings.`
              );
            }
          }
        }, 350);
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

        const browserCall = calls.find((c) => c.name.startsWith('browser_'));
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
                  text: `Web search completed for: "${m.query}"`,
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
          cardType: args.cardType || (args.image ? 'image' : args.formula ? 'formula' : args.code ? 'code' : 'concept'),
          formula: args.formula || null,
          code: args.code || (args.component === 'code' ? args.content : null),
          language: (args.language || '').toLowerCase().trim() || null,
          question: args.question || null,
          studentAnswer,
          image: args.image || null,
          caption: args.caption || null,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        // Merge notes if teacher continues elaborating on same topic
        setWhiteboardItems((prev) => {
          const lastItem = prev[prev.length - 1];
          if (
            lastItem &&
            lastItem.topic &&
            topic &&
            isSameOrRelatedTopic(lastItem.topic, topic)
          ) {
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

    // Connect WebSocket
    let connectAttempt = 0;
    let connectedSuccessfully = false;
    let lastConnectError = null;

    while (connectAttempt < 2 && !connectedSuccessfully) {
      connectAttempt++;
      try {
        await liveClientRef.current.connect(token, {
          model: targetModel,
          voiceName: selectedVoiceRef.current,
          systemInstruction: teacherSystemInstruction,
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
  };

  /**
   * Automatically rotates or reconnects the session seamlessly without user intervention.
   */
  const handleAutoReconnect = async (isProactive = false) => {
    if (isExplicitlyEndedRef.current) return;
    if (isRotatingRef.current) return;

    if (reconnectAttemptsRef.current >= 4) {
      console.error('[useGeminiLive] Maximum auto-reconnect attempts reached (4). Terminating session.');
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

    // Cleanly close old client
    if (liveClientRef.current) {
      liveClientRef.current.disconnect();
      liveClientRef.current = null;
    }

    if (rotationTimerRef.current) {
      clearTimeout(rotationTimerRef.current);
      rotationTimerRef.current = null;
    }

    await new Promise((r) => setTimeout(r, 450));

    try {
      const model = currentModelRef.current;
      await establishLiveSession(model, { isRotation: true });
      console.log('[useGeminiLive] Session rotated & reconnected successfully.');
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
    setSessionStatus('disconnected');
    setConversationState('idle');
    setIsSearching(false);
    setSearchQuery('');
    inputVolumeRef.current = 0;
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionPayload),
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
    startSession,
    endSession,
    toggleMute,
    sendTextMessage,
    sendContextUpdate,
    switchModel,
  };
}
