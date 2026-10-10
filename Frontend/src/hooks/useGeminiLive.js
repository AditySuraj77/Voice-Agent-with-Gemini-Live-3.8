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
        onOpen: () => {
          console.log('[useGeminiLive] Live session connected & established.');
          setSessionStatus('connected');
          setConversationState('listening');
        },
        onClose: () => {
          console.log('[useGeminiLive] Live session closed.');
          setSessionStatus('disconnected');
          setConversationState('idle');
          if (audioRecorderRef.current) {
            audioRecorderRef.current.stop();
            audioRecorderRef.current = null;
          }
        },
        onError: (err) => {
          console.error('[useGeminiLive] Live client error:', err);
          setError('Live connection error occurred.');
          setSessionStatus('error');
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
          setConversationState('listening');
        },
        onUserTurnFrozen: () => {
          // As soon as the assistant starts replying, freeze all preceding user bubbles so they can never be overwritten
          setMessages((prev) =>
            prev.map((m) => (m.sender === 'user' && m.isPartial ? { ...m, isPartial: false } : m))
          );
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
          // Finalize any open partial messages
          setMessages((prev) =>
            prev.map((m) => (m.isPartial ? { ...m, isPartial: false } : m))
          );
        },
      });

      // 3. Connect to WebSocket
      await liveClientRef.current.connect(token, {
        model: targetModel,
        voiceName: selectedVoice,
        systemInstruction: `You are an intuitive, highly adaptive conversational voice AI companion.

Core Behavioral Directives:
1. Dynamic Language & Dialect Mirroring:
   - Always respond in the EXACT language, dialect, and linguistic blend used by the primary speaker (e.g., Hindi, Hinglish, English, or any other language/regional mix).
   - Never switch to an unrequested language (such as Spanish, Portuguese, or French) due to acoustic ambiguity or background noise.
   - If the user switches languages or speaks Hinglish/colloquial speech, naturally mirror that shift immediately.

2. Tone, Mood & Emotion Adaptation:
   - Listen to the user's emotional undertone, pacing, vibe, and energy.
   - Match the user's tone and emotion: be warm, relaxed, enthusiastic, empathetic, or concise depending on how the user speaks to you.
   - Keep answers natural, spoken, and conversational (avoid robotic or overly verbose essays).

3. Background Noise & Interruption Resilience:
   - Only listen and respond to the primary user actively conversing with you.
   - When the user interrupts you while you are speaking, prioritize the user's interruption immediately and halt your previous thought.
   - Maintain conversational context continuity: do not assume a random foreign language or unrelated topic due to acoustic distortion or microphone collision. Stay anchored to the ongoing dialogue and language.
   - If a short acoustic snippet is ambiguous or distorted, interpret it naturally within the ongoing conversation or politely ask for clarification in the user's ongoing language.

4. Fluid Topic Tracking:
   - Always prioritize the user's latest question or intent. If the user asks a new question or changes the subject, immediately abandon any previous assumption or task and focus directly on the new query.`,
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
   * Switches model between Fast Voice and Deep Thinking Voice,
   * preserving conversation history context.
   */
  const switchModel = useCallback(async (newModel) => {
    if (newModel === currentModel) return;

    console.log(`[useGeminiLive] Switching model from ${currentModel} to ${newModel}`);
    setCurrentModel(newModel);

    // If session is active, reconnect cleanly with the new model
    if (sessionStatus === 'connected' || sessionStatus === 'connecting') {
      endSession();
      // Brief pause to allow socket cleanup
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
    startSession,
    endSession,
    toggleMute,
    sendTextMessage,
    switchModel,
  };
}
