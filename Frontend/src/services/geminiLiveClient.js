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
    onWhiteboardCall,
    onClearWhiteboard,
    onMasteryCall,
    onBrowserFrame,
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
    this.onWhiteboardCall = onWhiteboardCall;
    this.onClearWhiteboard = onClearWhiteboard;
    this.onMasteryCall = onMasteryCall;
    this.onBrowserFrame = onBrowserFrame;

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
          if (!isResolved) {
            isResolved = true;
            clearTimeout(setupTimeout);
            reject(new Error(`WebSocket closed during handshake with code ${event.code}`));
          }
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
                name: 'write_on_whiteboard',
                description: 'MANDATORY FOR TEACHER: Call this tool every time you explain or teach a concept, solve a problem, or ask a question. Write down the topic heading and clear, concise bullet points, definitions, formulas, or code on the student infinite whiteboard canvas in real time.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    topic: {
                      type: 'STRING',
                      description: 'Topic heading or concept name (e.g., "Newton\'s First Law", "Expanded Form", "Quadratic Formula", "Python For Loop")',
                    },
                    notes: {
                      type: 'ARRAY',
                      items: {
                        type: 'STRING',
                      },
                      description: 'List of concise bullet points, definitions, or steps to display on the whiteboard',
                    },
                    cardType: {
                      type: 'STRING',
                      description: 'Visual type of the card: "concept", "formula", "code", "question", or "step"',
                    },
                    formula: {
                      type: 'STRING',
                      description: 'Mathematical or scientific equation (e.g., "F = m * a", "342 = 300 + 40 + 2")',
                    },
                    code: {
                      type: 'STRING',
                      description: 'Optional programming code snippet if teaching programming or algorithms',
                    },
                    question: {
                      type: 'STRING',
                      description: 'The Socratic question currently asked to the student to prompt their thinking',
                    },
                    studentAnswer: {
                      type: 'STRING',
                      description: 'If student answered correctly, record their verified answer with a checkmark (e.g. "Adi: 40 ✓")',
                    },
                    language: {
                      type: 'STRING',
                      description: 'Programming language if code is provided: "c", "rust", "python", "javascript", "html", etc.',
                    },
                  },
                  required: ['topic', 'notes'],
                },
              },
              {
                name: 'clear_whiteboard',
                description: 'Erase or clear all notes from the student whiteboard canvas to start fresh.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    reason: {
                      type: 'STRING',
                      description: 'Optional reason for clearing the board',
                    },
                  },
                },
              },
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
              {
                name: 'browser_navigate',
                description: 'Navigate the live browser to a specific URL (e.g. "https://en.wikipedia.org" or "python.org") or search term. The page is displayed live on the student screen, and you receive real-time screenshots to visually inspect the website.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    url: {
                      type: 'STRING',
                      description: 'Target website URL or search term (e.g. "https://en.wikipedia.org/wiki/Quantum_computing")',
                    },
                    description: {
                      type: 'STRING',
                      description: 'Brief reason or goal for navigating to this page',
                    },
                  },
                  required: ['url'],
                },
              },
              {
                name: 'browser_click',
                description: 'Click an element, link, or button on the live browser page using either its numbered badge ID [1], [2], [3] (Set-of-Marks), visible screen coordinates {x, y}, or CSS selector / text.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    elementId: {
                      type: 'INTEGER',
                      description: 'Numbered badge ID [1], [2], [3]... visible on the target element in the webpage screenshot (preferred for 100% precision)',
                    },
                    description: {
                      type: 'STRING',
                      description: 'Description of the element being clicked (e.g. "Search button", "Getting Started link")',
                    },
                    x: {
                      type: 'NUMBER',
                      description: 'X coordinate (horizontal position 0 to 960) of the element on the webpage screenshot',
                    },
                    y: {
                      type: 'NUMBER',
                      description: 'Y coordinate (vertical position 0 to 540) of the element on the webpage screenshot',
                    },
                    selector: {
                      type: 'STRING',
                      description: 'Optional CSS selector or visible text of the element',
                    },
                  },
                  required: ['description'],
                },
              },
              {
                name: 'browser_type',
                description: 'Type text into an input field or search box on the live browser page, targeting it via its numbered badge ID or selector.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    elementId: {
                      type: 'INTEGER',
                      description: 'Optional numbered badge ID of the input field to type into',
                    },
                    text: {
                      type: 'STRING',
                      description: 'The text string to type into the active input',
                    },
                    selector: {
                      type: 'STRING',
                      description: 'Optional CSS selector of the input field',
                    },
                    pressEnter: {
                      type: 'BOOLEAN',
                      description: 'Whether to press Enter after typing (default true for searches)',
                    },
                  },
                  required: ['text'],
                },
              },
              {
                name: 'browser_scroll',
                description: 'Scroll the live browser viewport up or down to read more content on the page.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    direction: {
                      type: 'STRING',
                      description: 'Scroll direction: "down" to view more content below, or "up" to view content above',
                    },
                    amount: {
                      type: 'NUMBER',
                      description: 'Distance in pixels to scroll (defaults to 450)',
                    },
                  },
                  required: ['direction'],
                },
              },
              {
                name: 'browser_clip_to_whiteboard',
                description: 'Clip a diagram, illustration, graph, or equation from the active webpage and permanently pin/paste it onto the student\'s whiteboard notes so they can reference it later.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    caption: {
                      type: 'STRING',
                      description: 'Title or description of the clipped diagram (e.g. "Diagram: Structure of DNA Molecule")',
                    },
                    selector: {
                      type: 'STRING',
                      description: 'Optional CSS selector of the specific image, figure, or element to clip (defaults to current viewport)',
                    },
                  },
                  required: ['caption'],
                },
              },
              {
                name: 'browser_highlight',
                description: 'Visually highlight an important paragraph, formula, diagram, or button on the live browser screen using an AI visual laser box so the student sees exactly what you are pointing to.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    text: {
                      type: 'STRING',
                      description: 'Visible text snippet to highlight (e.g. "Newton\'s Second Law", "Photosynthesis Formula")',
                    },
                    selector: {
                      type: 'STRING',
                      description: 'Optional CSS selector of the element to highlight',
                    },
                    label: {
                      type: 'STRING',
                      description: 'Short concept badge displayed over the highlight (e.g. "Core Concept", "Formula", "Key Proof")',
                    },
                  },
                  required: ['text'],
                },
              },
              {
                name: 'browser_reader_mode',
                description: 'Toggle Clean Reader View for the current webpage to eliminate all ads, clutter, navigation, and banners for effortless reading.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    enabled: {
                      type: 'BOOLEAN',
                      description: 'True to activate clean distraction-free reader mode, False to return to standard web layout',
                    },
                  },
                  required: ['enabled'],
                },
              },
              {
                name: 'browser_history_nav',
                description: 'Navigate back to the previous webpage or forward in browser history when the student asks to go back or forward.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    action: {
                      type: 'STRING',
                      description: 'Direction to navigate: "back" or "forward"',
                    },
                  },
                  required: ['action'],
                },
              },
              {
                name: 'browser_toggle_labels',
                description: 'Toggle Set-of-Marks (SoM) numbered badges [1], [2], [3] on all interactive buttons, links, and inputs on the webpage for 100% accurate clicking.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    enabled: {
                      type: 'BOOLEAN',
                      description: 'True to display numbered badges [1], [2], [3] on all interactive elements, False to hide them',
                    },
                  },
                  required: ['enabled'],
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
   * Sends real-time JPEG vision frame to Gemini Live multimodal input.
   * @param {string} base64JPEG
   */
  sendImageChunk(base64JPEG) {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const mediaBlob = {
      mimeType: 'image/jpeg',
      data: base64JPEG,
    };

    const payload = {
      realtimeInput: {
        mediaChunks: [mediaBlob],
      },
    };

    this.sendJson(payload);
    console.log(`[GeminiLiveClient #${this.clientId}] Streamed vision frame (JPEG) to Gemini Live.`);
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
   * Sends background environmental context update (e.g. Code Lab code change, execution result, student profile).
   * @param {string} contextText
   */
  sendContextNotification(contextText) {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const payload = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text: contextText }],
          },
        ],
        turnComplete: false,
      },
    };

    this.sendJson(payload);
    console.log(`[GeminiLiveClient #${this.clientId}] Sent live context update: "${contextText.slice(0, 100)}..."`);
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
      if (call.name === 'write_on_whiteboard' || call.name === 'update_whiteboard') {
        console.log(`[GeminiLiveClient #${this.clientId}] Executing ${call.name} call:`, call.args);
        if (this.onWhiteboardCall) {
          this.onWhiteboardCall(call.args);
        }
        responses.push({
          id: call.id,
          name: call.name,
          response: {
            result: { status: 'success', message: 'Whiteboard notes updated successfully.' },
          },
        });
      } else if (call.name === 'clear_whiteboard') {
        console.log(`[GeminiLiveClient #${this.clientId}] Executing clear_whiteboard call:`, call.args);
        if (this.onClearWhiteboard) {
          this.onClearWhiteboard(call.args);
        } else if (this.onWhiteboardCall) {
          this.onWhiteboardCall({ action: 'clear' });
        }
        responses.push({
          id: call.id,
          name: call.name,
          response: {
            result: { status: 'success', message: 'Whiteboard erased successfully.' },
          },
        });
      } else if (call.name === 'search_web') {
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
      } else if (
        call.name === 'browser_navigate' ||
        call.name === 'browser_click' ||
        call.name === 'browser_type' ||
        call.name === 'browser_scroll' ||
        call.name === 'browser_clip_to_whiteboard' ||
        call.name === 'browser_highlight' ||
        call.name === 'browser_reader_mode' ||
        call.name === 'browser_history_nav' ||
        call.name === 'browser_toggle_labels'
      ) {
        console.log(`[GeminiLiveClient #${this.clientId}] Executing browser tool ${call.name}:`, call.args);

        let actionPayload = {};
        if (call.name === 'browser_navigate') {
          actionPayload = { action: 'navigate', url: call.args?.url };
        } else if (call.name === 'browser_click') {
          actionPayload = {
            action: 'click',
            elementId: call.args?.elementId,
            selector: call.args?.selector,
            x: call.args?.x,
            y: call.args?.y,
            description: call.args?.description,
          };
        } else if (call.name === 'browser_type') {
          actionPayload = {
            action: 'type',
            elementId: call.args?.elementId,
            text: call.args?.text,
            selector: call.args?.selector,
            pressEnter: call.args?.pressEnter !== false,
          };
        } else if (call.name === 'browser_scroll') {
          actionPayload = {
            action: 'scroll',
            direction: call.args?.direction || 'down',
            amount: call.args?.amount || 450,
          };
        } else if (call.name === 'browser_clip_to_whiteboard') {
          actionPayload = {
            action: 'clip_whiteboard',
            selector: call.args?.selector,
            caption: call.args?.caption || 'Clipped Web Diagram',
          };
        } else if (call.name === 'browser_highlight') {
          actionPayload = {
            action: 'highlight',
            text: call.args?.text,
            selector: call.args?.selector,
            label: call.args?.label || 'Key Concept',
          };
        } else if (call.name === 'browser_reader_mode') {
          actionPayload = {
            action: 'reader_mode',
            enabled: call.args?.enabled !== false,
          };
        } else if (call.name === 'browser_history_nav') {
          actionPayload = {
            action: call.args?.action === 'forward' ? 'forward' : 'back',
          };
        } else if (call.name === 'browser_toggle_labels') {
          actionPayload = {
            action: 'toggle_som',
            enabled: call.args?.enabled !== false,
          };
        }

        let actionResult = { status: 'in_progress' };
        try {
          const res = await fetch(`${this.backendUrl}/api/browser/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(actionPayload),
          });

          if (res.ok) {
            const data = await res.json();
            actionResult = {
              status: 'success',
              url: data.url,
              title: data.title,
              message: `Browser action "${call.name}" executed. You are currently viewing "${data.title}" at URL: ${data.url}. A fresh visual screenshot of this webpage has been captured and injected into your vision input. Describe what you see to the student.`,
            };

            // If diagram clipped, pin it onto student's whiteboard canvas immediately
            if (call.name === 'browser_clip_to_whiteboard' && data.image) {
              if (this.onWhiteboardCall) {
                this.onWhiteboardCall({
                  topic: data.caption || 'Clipped Diagram',
                  image: data.image,
                  caption: data.caption,
                });
              }
            }

            // Stream updated webpage screenshot to Gemini Live visual input
            if (data.screenshot) {
              this.sendImageChunk(data.screenshot);
            }

            // Notify UI to render live browser canvas
            if (this.onBrowserFrame) {
              this.onBrowserFrame({
                url: data.url,
                title: data.title,
                screenshot: data.screenshot,
                action: data.action,
                clickCoordinates: data.clickCoordinates,
                elementId: data.elementId,
                boundingBox: data.boundingBox,
                label: data.label,
                isReaderMode: data.isReaderMode,
                showSoMBadges: data.showSoMBadges,
                somCount: data.somCount,
              });
            }

            // Progressive auto-hydration follow-up for dynamic SPAs (YouTube, GitHub, complex web apps)
            if (call.name === 'browser_navigate' && this.backendUrl) {
              setTimeout(async () => {
                try {
                  const vpRes = await fetch(`${this.backendUrl}/api/browser/viewport`);
                  if (vpRes.ok) {
                    const vpData = await vpRes.json();
                    if (vpData.screenshot && vpData.url === data.url) {
                      if (this.onBrowserFrame) {
                        this.onBrowserFrame({
                          url: vpData.url,
                          title: vpData.title,
                          screenshot: vpData.screenshot,
                          action: 'auto_hydrate',
                          isReaderMode: vpData.isReaderMode,
                          showSoMBadges: vpData.showSoMBadges,
                          somCount: vpData.somCount,
                        });
                      }
                      this.sendImageChunk(vpData.screenshot);
                      console.log('[GeminiLiveClient] Auto-hydrated progressive frame received and streamed.');
                    }
                  }
                } catch (e) {}
              }, 1500);
            }
          } else {
            actionResult = { status: 'error', message: `Browser action failed with HTTP status ${res.status}` };
          }
        } catch (err) {
          console.error(`[GeminiLiveClient] Browser action error:`, err);
          actionResult = { status: 'error', message: `Browser action execution error: ${err.message}` };
        }

        responses.push({
          id: call.id,
          name: call.name,
          response: {
            result: actionResult,
          },
        });
      } else {
        console.warn(`[GeminiLiveClient #${this.clientId}] Unhandled function call: ${call.name}`);
        responses.push({
          id: call.id,
          name: call.name,
          response: {
            result: { status: 'ok' },
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
      // Clear all event listeners so closing socket doesn't fire spurious onerror / onclose
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
    console.log('[GeminiLiveClient] Disconnected cleanly.');
  }
}
