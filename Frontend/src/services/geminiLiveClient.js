/**
 * GeminiLiveClient manages the WebSocket connection directly to the Gemini Multimodal Live API
 * using backend-provisioned ephemeral tokens.
 * Supports Real-Time Web Search via Tavily Tool Calling.
 */
export class GeminiLiveClient {
  constructor({
    backendUrl = 'http://localhost:3001',
    onOpen,
    onClose,
    onError,
    onAudioChunk,
    onInterrupted,
    onTurnComplete,
    onTranscript,
    onUserTurnFrozen,
    onToolCall,
    onToolResponse,
  }) {
    this.backendUrl = backendUrl;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.onError = onError;
    this.onAudioChunk = onAudioChunk;
    this.onInterrupted = onInterrupted;
    this.onTurnComplete = onTurnComplete;
    this.onTranscript = onTranscript;
    this.onUserTurnFrozen = onUserTurnFrozen;
    this.onToolCall = onToolCall;
    this.onToolResponse = onToolResponse;

    this.clientId = Math.random().toString(36).slice(2, 6);
    this.msgCounter = 0;
    this.audioChunkCounter = 0;

    this.ws = null;
    this.isConnected = false;
    this.currentModel = 'gemini-3.8-live';
  }

  /**
   * Connects to Gemini Live API using an ephemeral token.
   * @param {string} ephemeralToken
   * @param {Object} options
   * @param {string} options.model - e.g. 'gemini-3.8-live' or 'gemini-3.8-live-extended-thinking'
   * @param {string} [options.systemInstruction]
   * @param {string} [options.voiceName='Aoede']
   */
  async connect(ephemeralToken, { model = 'gemini-3.8-live', systemInstruction = '', voiceName = 'Aoede' } = {}) {
    if (this.isConnected) {
      this.disconnect();
    }

    this.currentModel = model;
    const normalizedModel = model.startsWith('models/') ? model : `models/${model}`;

    const host = 'generativelanguage.googleapis.com';
    const uri = `wss://${host}/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(ephemeralToken)}`;

    console.log(`[GeminiLiveClient] Connecting to Gemini Live WebSocket for ${normalizedModel}...`);

    return new Promise((resolve, reject) => {
      let isResolved = false;
      const setupTimeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          resolve();
        }
      }, 3000);

      try {
        this.ws = new WebSocket(uri);

        this.ws.onopen = () => {
          console.log('[GeminiLiveClient] WebSocket connection established.');
          this.isConnected = true;

          // Send initial setup frame with tools declared
          this.sendSetup({
            model: normalizedModel,
            systemInstruction,
            voiceName,
          });

          if (this.onOpen) this.onOpen();
        };

        this.ws.onmessage = async (event) => {
          try {
            let data = event.data;
            if (data instanceof Blob) {
              data = await data.text();
            }
            const message = JSON.parse(data);
            if (message.setupComplete && !isResolved) {
              isResolved = true;
              clearTimeout(setupTimeout);
              resolve();
            }
            this.handleServerMessage(message);
          } catch (err) {
            console.error('[GeminiLiveClient] Failed to parse server message:', err);
          }
        };

        this.ws.onerror = (err) => {
          console.error('[GeminiLiveClient] WebSocket error event:', err);
          if (this.onError) this.onError(err);
          if (!isResolved) {
            isResolved = true;
            clearTimeout(setupTimeout);
            reject(err);
          }
        };

        this.ws.onclose = (event) => {
          console.log(`[GeminiLiveClient] WebSocket closed (code: ${event.code}, reason: ${event.reason || 'none'}).`);
          this.isConnected = false;
          if (this.onClose) this.onClose(event);
        };
      } catch (err) {
        console.error('[GeminiLiveClient] Error establishing WebSocket:', err);
        if (this.onError) this.onError(err);
        if (!isResolved) {
          isResolved = true;
          clearTimeout(setupTimeout);
          reject(err);
        }
      }
    });
  }

  /**
   * Sends the session setup configuration frame, including Tavily search tool declaration.
   */
  sendSetup({ model, systemInstruction, voiceName = 'Aoede' }) {
    const isExtendedThinking = model.includes('extended-thinking');

    const setupPayload = {
      setup: {
        model,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        tools: [
          {
            functionDeclarations: [
              {
                name: 'search_web',
                description: 'Search the live web for real-time information, latest news, current events, facts, weather, sports scores, or any query requiring fresh knowledge.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    query: {
                      type: 'STRING',
                      description: 'The search query to look up on the web',
                    },
                  },
                  required: ['query'],
                },
              },
            ],
          },
        ],
      },
    };

    // Configure extended thinking parameters only if using the extended thinking model
    if (isExtendedThinking) {
      setupPayload.setup.generationConfig.thinkingConfig = {
        thinkingBudget: -1, // Dynamic extended thinking
      };
    }

    if (systemInstruction) {
      setupPayload.setup.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    this.sendJson(setupPayload);
    console.log('[GeminiLiveClient] Sent setup configuration frame with audio transcription and search_web tool enabled.');
  }

  /**
   * Sends real-time microphone audio chunk (16kHz PCM base64).
   * @param {string} base64PCMChunk
   */
  sendAudioChunk(base64PCMChunk) {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const mediaBlob = {
      mimeType: 'audio/pcm;rate=16000',
      data: base64PCMChunk,
    };

    const payload = {
      realtimeInput: {
        audio: mediaBlob,
        mediaChunks: [mediaBlob],
      },
    };

    this.sendJson(payload);
  }

  /**
   * Sends text input as an alternative or complement to speaking.
   * @param {string} text
   */
  sendTextMessage(text) {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const payload = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      },
    };

    this.sendJson(payload);
    console.log(`[GeminiLiveClient #${this.clientId}] Sent client text message turn: "${text}"`);
  }

  /**
   * Handles incoming WebSocket messages from Gemini Live server.
   */
  handleServerMessage(message) {
    if (message.setupComplete) {
      console.log(`[GeminiLiveClient #${this.clientId}] Server setupComplete received. Ready for audio/text exchange.`);
      return;
    }

    const serverContent = message.serverContent;

    // Check for Tool Calls (Function Calling) at message level or serverContent level
    const functionCalls = [];
    if (message.toolCall?.functionCalls) {
      functionCalls.push(...message.toolCall.functionCalls);
    }
    if (serverContent?.modelTurn?.parts) {
      for (const part of serverContent.modelTurn.parts) {
        if (part.functionCall) {
          functionCalls.push(part.functionCall);
        }
      }
    }

    if (functionCalls.length > 0) {
      this.handleToolCalls(functionCalls);
    }

    if (!serverContent) return;

    const msgId = ++this.msgCounter;

    // 1. Barge-in / Interruption signal
    if (serverContent.interrupted) {
      console.log(`[GeminiLiveClient #${this.clientId}] [Event] Barge-in interruption detected from Gemini server (msg #${msgId}).`);
      if (this.onInterrupted) {
        this.onInterrupted();
      }
    }

    // 2. User Input Audio Transcription (Official Gemini Live API format)
    const interimInput = serverContent.interimInputTranscription?.text;
    const finalInput = serverContent.inputTranscription?.text;

    if (finalInput) {
      console.log(`[GeminiLiveClient #${this.clientId}] [User STT Final] "${finalInput}"`);
      if (this.onTranscript) {
        this.onTranscript({
          sender: 'user',
          text: finalInput,
          isPartial: false,
        });
      }
    } else if (interimInput) {
      if (this.onTranscript) {
        this.onTranscript({
          sender: 'user',
          text: interimInput,
          isPartial: true,
        });
      }
    }

    // 3. Model turn: audio chunks and text output
    const modelTurn = serverContent.modelTurn;
    if (modelTurn && modelTurn.parts) {
      // Whenever assistant starts sending content, finalize pending user turn
      if (this.onUserTurnFrozen) {
        this.onUserTurnFrozen();
      }

      for (let partIndex = 0; partIndex < modelTurn.parts.length; partIndex++) {
        const part = modelTurn.parts[partIndex];
        // Output audio stream
        if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('audio/pcm')) {
          const chunkId = ++this.audioChunkCounter;
          if (this.onAudioChunk && part.inlineData.data) {
            this.onAudioChunk(part.inlineData.data);
          }
        }

        // Assistant Output Text / Transcript (streamed delta chunks)
        if (part.text) {
          if (this.onTranscript) {
            this.onTranscript({
              sender: 'assistant',
              text: part.text,
              isPartial: !serverContent.turnComplete,
            });
          }
        }
      }
    }

    // 4. Output Audio Transcription (Google Gemini Live streams this at serverContent.outputTranscription.text)
    const outputTranscript = serverContent.outputTranscription?.text || serverContent.outputAudioTranscription?.text;
    if (outputTranscript) {
      if (this.onTranscript) {
        this.onTranscript({
          sender: 'assistant',
          text: outputTranscript,
          isPartial: !serverContent.turnComplete,
        });
      }
    }

    // 5. Turn Complete
    if (serverContent.turnComplete) {
      console.log('[GeminiLiveClient] [Event] Model turn complete.');
      if (this.onTurnComplete) {
        this.onTurnComplete();
      }
    }
  }

  /**
   * Executes tool calls requested by Gemini Live (e.g. search_web via Tavily backend)
   * and sends toolResponse back through the WebSocket connection.
   */
  async handleToolCalls(functionCalls) {
    console.log(`[GeminiLiveClient #${this.clientId}] Handling ${functionCalls.length} function call(s):`, functionCalls);

    if (this.onToolCall) {
      this.onToolCall(functionCalls);
    }

    const responses = [];

    for (const call of functionCalls) {
      if (call.name === 'search_web') {
        const query = call.args?.query || '';
        console.log(`[GeminiLiveClient #${this.clientId}] Executing Tavily search for: "${query}" (id: ${call.id})`);

        let searchResult = '';
        try {
          const res = await fetch(`${this.backendUrl}/api/tools/search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
          });

          if (res.ok) {
            const data = await res.json();
            searchResult = data.formattedResult || data.answer || JSON.stringify(data);
          } else {
            searchResult = `Web search returned error status ${res.status}.`;
          }
        } catch (err) {
          console.error(`[GeminiLiveClient] Search request failed:`, err);
          searchResult = `Failed to execute search: ${err.message}`;
        }

        responses.push({
          id: call.id,
          name: call.name,
          response: {
            result: searchResult,
          },
        });
      }
    }

    if (responses.length > 0) {
      const toolResponsePayload = {
        toolResponse: {
          functionResponses: responses,
        },
      };

      this.sendJson(toolResponsePayload);
      console.log(`[GeminiLiveClient #${this.clientId}] Successfully sent toolResponse back to Gemini Live.`);

      if (this.onToolResponse) {
        this.onToolResponse(responses);
      }
    }
  }

  /**
   * Helper to safely serialize and send JSON over WebSocket.
   */
  sendJson(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  /**
   * Disconnects the WebSocket session.
   */
  disconnect() {
    this.isConnected = false;
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
    console.log('[GeminiLiveClient] Disconnected.');
  }
}
