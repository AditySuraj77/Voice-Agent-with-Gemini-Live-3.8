/**
 * GeminiLiveClient manages the WebSocket connection directly to the Gemini Multimodal Live API
 * using backend-provisioned ephemeral tokens.
 * Supports Real-Time Web Search via Tavily Tool Calling.
 */
export class GeminiLiveClient {
  constructor({
    backendUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) || 'http://localhost:3001',
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
    onHighlightWhiteboard,
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
    this.onHighlightWhiteboard = onHighlightWhiteboard;
    this.onMasteryCall = onMasteryCall;
    this.onBrowserFrame = onBrowserFrame;

    this.clientId = Math.random().toString(36).slice(2, 6);
    this.msgCounter = 0;
    this.audioChunkCounter = 0;
    this.turnHasActivity = false;
    this.lastUserUtterance = '';
    this.emptyTurnCount = 0;

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
                    svgCode: {
                      type: 'STRING',
                      description: 'MANDATORY FOR EVERY TOPIC EXPLAINED ACROSS ALL SUBJECTS: Complete valid standalone SVG diagram (viewBox="0 0 600 400" with shapes, text labels, colors) illustrating the core concept, geometry, anatomy, molecular structure, setup, or process alongside the notes. Do not omit!',
                    },
                    visualQuery: {
                      type: 'STRING',
                      description: 'MANDATORY FOR ANY CONCEPT, MACHINE, ANATOMY, OR DOUBT: Search query to instantly fetch an authentic high-resolution labeled diagram or photograph from Google & educational archives (e.g. "transformer architecture diagram", "human heart anatomy labeled diagram", "electric generator parts diagram"). Pass this whenever explaining objects or when the student is confused!',
                    },
                    imagePrompt: {
                      type: 'STRING',
                      description: 'Optional descriptive prompt for FLUX AI image generator (mode "ai_image") with concept title in single quotes (e.g. "Photorealistic 3D Mitochondria with title \'MITOCHONDRIA\' ")',
                    },
                    caption: {
                      type: 'STRING',
                      description: 'Educational caption for the attached visual illustration',
                    },
                  },
                  required: ['topic', 'notes', 'svgCode'],
                },
              },
              {
                name: 'generate_ai_image',
                description: 'DEDICATED AI ARTISTIC IMAGE GENERATOR: Call this ONLY when the student specifically asks to generate an AI image ("AI se banao", "AI image tool use karo") or asks for futuristic fantasy concepts (e.g. futuristic cyberpunk city, Mars colony). For scientific diagrams, machines, organs, or biology, use render_visual(mode="photo_search") instead.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    prompt: {
                      type: 'STRING',
                      description: 'Detailed visual prompt for FLUX.1. Always enclose the primary title or label in single quotes for crisp typography (e.g. "Photorealistic 3D cross-section of Mitochondria with glowing title \'MITOCHONDRIA\', studio lighting, 8k, scientific illustration").',
                    },
                    topic: {
                      type: 'STRING',
                      description: 'Topic title for the visual card (e.g. "Quantum Computer Processor", "Mars Human Colony", "Mitochondria 3D")',
                    },
                    caption: {
                      type: 'STRING',
                      description: 'Short 1-2 sentence educational explanation of what this AI visual illustrates',
                    },
                    subject: {
                      type: 'STRING',
                      description: 'Academic subject (e.g. "Computer Science", "Physics", "Biology", "Astronomy")',
                    },
                  },
                  required: ['prompt', 'topic'],
                },
              },
              {
                name: 'render_visual',
                description: 'STAGE 2 DYNAMIC ANIMATION & SIMULATION SUITE: Call this when student needs animated motion/working mechanism after introductory explanation, OR when student expresses confusion ("samajh nahi aaya", "kaise kaam karta hai"), OR when student explicitly requests animation. For Stage 1 initial topic introduction, use write_on_whiteboard with notes and a static labeled diagram. Supports 4 specialized animation modes across all subjects: "animated_svg" (instant zero-latency vector loops), "interactive_sim" (hands-on playable HTML5 canvas experiments with sliders), "manim_video" (3Blue1Brown mathematical and calculus animations), "archive_animation" (authentic scientific/biological animation loops from Wikimedia). Never overwrite initial textbook notes; animations append below.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    topic: {
                      type: 'STRING',
                      description: 'Clear title of the visual or animation (e.g. "Refraction through Prism", "Projectile Motion Simulator", "Pythagoras Theorem Proof", "Cardiac Cycle Animation")',
                    },
                    mode: {
                      type: 'STRING',
                      description: 'Visual creation mode: "animated_svg" for real-time CSS vector loops, "interactive_sim" for hands-on playable simulation, "manim_video" for 3Blue1Brown mathematical scenes, "archive_animation" for scientific/biological archive animation loops (.gif/.webm), "photo_search" for static archive photographs, "svg_sketch" for static vector drawings, or "ai_image" for futuristic 3D scenes.',
                    },
                    svgCode: {
                      type: 'STRING',
                      description: 'When mode="animated_svg" or "svg_sketch": Full valid standalone SVG string with compact viewBox="0 0 500 300". For "animated_svg", include <style> @keyframes ... </style> for smooth perpetual motion loops (e.g. pulsating waves, moving electrons, rotating rays).',
                    },
                    simType: {
                      type: 'STRING',
                      description: 'When mode="interactive_sim": Simulation preset: "projectile", "pendulum", "wave", "sorting", "orbit", "trig_circle", "spring", or "custom".',
                    },
                    simulationCode: {
                      type: 'STRING',
                      description: 'When mode="interactive_sim": Optional JavaScript canvas simulation code if custom simulation is needed.',
                    },
                    equation: {
                      type: 'STRING',
                      description: 'When mode="manim_video": Mathematical equation or theorem formula (e.g. "a^2 + b^2 = c^2", "f\'(x) = lim(h->0) [f(x+h)-f(x)]/h", "e^(i*pi) + 1 = 0").',
                    },
                    manimCode: {
                      type: 'STRING',
                      description: 'When mode="manim_video": Optional Python Manim script definition for the mathematical scene.',
                    },
                    searchQuery: {
                      type: 'STRING',
                      description: 'When mode="photo_search" or "archive_animation": Precise search query for educational archive (e.g. "Cardiac cycle animation", "Four-stroke engine animation", "DNA replication animation", "James Webb Space Telescope")',
                    },
                    imagePrompt: {
                      type: 'STRING',
                      description: 'When mode="ai_image": Detailed visual description for the FLUX AI image generator.',
                    },
                    caption: {
                      type: 'STRING',
                      description: 'Short 1-2 sentence educational explanation of what this visual or animation demonstrates',
                    },
                    subject: {
                      type: 'STRING',
                      description: 'Academic subject: "physics", "biology", "chemistry", "math", "geography", "history", "astronomy", "engineering", etc.',
                    },
                  },
                  required: ['topic', 'mode'],
                },
              },
              {
                name: 'render_manim_animation',
                description: 'DEDICATED 3BLUE1BROWN MATHEMATICAL ANIMATION ENGINE: Call this whenever explaining calculus, geometry proofs, linear algebra, vector fields, or complex mathematical transformations. Renders a cinematic mathematical visualization with dark theme and smooth geometric morphing.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    topic: {
                      type: 'STRING',
                      description: 'Title of the mathematical concept (e.g. "Pythagorean Theorem Geometric Proof", "Derivative as Tangent Slope", "Fourier Series Epicycles", "Eigenvector Transformation")',
                    },
                    equation: {
                      type: 'STRING',
                      description: 'The primary mathematical equation or formula being animated (e.g. "a² + b² = c²", "f\'(x) = 2x", "T(v) = λv")',
                    },
                    sceneType: {
                      type: 'STRING',
                      description: 'Type of mathematical scene: "pythagoras", "derivative", "fourier", "vector", or "custom"',
                    },
                    manimCode: {
                      type: 'STRING',
                      description: 'Optional Python Manim Scene code if customized.',
                    },
                    caption: {
                      type: 'STRING',
                      description: 'Brief educational explanation of what the mathematical animation proves.',
                    },
                  },
                  required: ['topic', 'equation'],
                },
              },
              {
                name: 'render_simulation',
                description: 'DEDICATED PLAYABLE INTERACTIVE EXPERIMENT LAB: Call this whenever the student should interact with variables, drag sliders, or test physical laws (e.g. changing projectile velocity, altering pendulum gravity, adjusting sound wave frequency, stepping through sorting algorithms).',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    topic: {
                      type: 'STRING',
                      description: 'Title of the simulation (e.g. "Projectile Motion Simulator", "Simple Harmonic Pendulum", "Trigonometric Unit Circle", "Bubble Sort Visualizer")',
                    },
                    simType: {
                      type: 'STRING',
                      description: 'Simulation preset type: "projectile", "pendulum", "wave", "sorting", "orbit", "trig_circle", "spring", or "custom"',
                    },
                    caption: {
                      type: 'STRING',
                      description: 'Short explanation instructing the student what parameters to test or adjust.',
                    },
                    parameters: {
                      type: 'OBJECT',
                      description: 'Optional default parameters (e.g. { gravity: 9.8, velocity: 25, angle: 45 }).',
                    },
                  },
                  required: ['topic', 'simType'],
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
                name: 'highlight_whiteboard_card',
                description: 'Visually highlight or point to a specific topic heading, formula card, or student step on the whiteboard with an AI glowing pulse/border to focus the student\'s attention while explaining or confirming correctness.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    topic: {
                      type: 'STRING',
                      description: 'Topic heading or text snippet on the whiteboard item to highlight',
                    },
                    reason: {
                      type: 'STRING',
                      description: 'Brief reason or encouragement (e.g. "Verified correct step", "Notice this formula")',
                    },
                  },
                  required: ['topic'],
                },
              },
              {
                name: 'laser_point_canvas',
                description: 'Visually point a glowing AI laser pointer, circle a specific step or formula, or drop a feedback mark directly onto the student\'s handwritten whiteboard canvas while speaking.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    x: {
                      type: 'NUMBER',
                      description: 'Horizontal percentage coordinate on the canvas (0 to 100, where 50 is center)',
                    },
                    y: {
                      type: 'NUMBER',
                      description: 'Vertical percentage coordinate on the canvas (0 to 100, where 50 is center)',
                    },
                    label: {
                      type: 'STRING',
                      description: 'Brief guidance label (e.g. "Check this term", "Correct step ✓", "Look here")',
                    },
                    style: {
                      type: 'STRING',
                      description: 'Style of visual indicator: "laser" (glowing pulse), "circle" (ring), "check" (green check), "cross" (red mark)',
                    },
                  },
                  required: ['x', 'y'],
                },
              },

              {
                name: 'search_web',
                description: 'Search the live web for general facts, latest news, articles, and weather. STRICT RESTRICTION: NEVER call search_web for YouTube videos, YouTube channels, YouTube playlists, or video transcripts/timestamps. For ANY YouTube content, ALWAYS call youtube_channel_search or youtube_fetch_transcript.',
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
                name: 'youtube_channel_search',
                description: 'MANDATORY FOR YOUTUBE CHANNELS & PLAYLISTS: Call this tool whenever the student asks to check, explore, search, or view ANY YouTube channel, its latest uploaded videos, or playlists (e.g. "Stanford Online channel playlists", "OpenAI channel latest videos", "Code Eater channel videos", "kisi YouTube channel par jao"). NEVER call search_web for YouTube channel queries.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    channelName: {
                      type: 'STRING',
                      description: 'The name or handle of the YouTube channel (e.g. "Stanford Online", "OpenAI", "Code Eater", "3Blue1Brown", "Veritasium", "Raj Shamani")',
                    },
                    type: {
                      type: 'STRING',
                      description: 'Type of content to retrieve: "videos" for latest uploaded videos, or "playlists" for channel playlists',
                    },
                    query: {
                      type: 'STRING',
                      description: 'Optional specific topic, keywords, or playlist name to search on the channel (e.g. "CS329A", "self improving ai agents", "calculus")',
                    },
                  },
                  required: ['channelName'],
                },
              },
              {
                name: 'youtube_fetch_transcript',
                description: 'MANDATORY FOR YOUTUBE VIDEOS & TIMESTAMPS: Search YouTube for ANY video, podcast, or lecture (e.g. "Dr Sahar Yousef on Raj Shamani", "Veritasium speed of light"), or parse a YouTube URL/ID. Extracts 100% continuous chronological timestamps (from 00:00 to the video end) and full transcript dialogue. Use this whenever the student asks to explore, summarize, get timestamps, or learn from a video without external hallucinations.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    query: {
                      type: 'STRING',
                      description: 'Topic, video title, guest name, or search keywords to find on YouTube (e.g. "Dr Sahar Yousef", "speed of light")',
                    },
                    channelName: {
                      type: 'STRING',
                      description: 'Optional YouTube channel name (e.g. "Raj Shamani", "Veritasium", "Stanford Online", "OpenAI")',
                    },
                    videoUrlOrId: {
                      type: 'STRING',
                      description: 'Optional direct YouTube video URL (e.g. "https://www.youtube.com/watch?v=...") or 11-character video ID',
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
   * Sends a visual inspection turn directly with inlineData image parts and text prompt.
   * This guarantees Gemini evaluates the visual image in the current active conversational turn.
   * @param {Object} options
   * @param {string} options.base64Jpeg - Base64 encoded JPEG image data
   * @param {string} options.promptText - Prompt text guiding the model on what to inspect
   */
  sendVisualInspectionTurn({ base64Jpeg, promptText }) {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const parts = [];
    if (base64Jpeg) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Jpeg,
        },
      });
    }
    if (promptText) {
      parts.push({
        text: promptText,
      });
    }

    const payload = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts,
          },
        ],
        turnComplete: true,
      },
    };

    this.sendJson(payload);
    console.log(`[GeminiLiveClient #${this.clientId}] Sent visual inspection turn with inline image and prompt.`);
  }

  /**
   * Sends background environmental context update (e.g. Code Lab code change, execution result, student profile).
   * @param {string} contextText
   * @param {Object} [options]
   * @param {boolean} [options.turnComplete=false]
   */
  sendContextNotification(contextText, { turnComplete = false } = {}) {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const payload = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text: contextText }],
          },
        ],
        turnComplete: Boolean(turnComplete),
      },
    };

    this.sendJson(payload);
    console.log(`[GeminiLiveClient #${this.clientId}] Sent live context update (turnComplete: ${turnComplete}): "${contextText.slice(0, 100)}..."`);
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
      this.turnHasActivity = true;
      this.handleToolCalls(functionCalls);
    }

    if (!serverContent) return;

    const msgId = ++this.msgCounter;

    // 1. Barge-in / Interruption signal
    if (serverContent.interrupted) {
      console.log(`[GeminiLiveClient #${this.clientId}] [Event] Barge-in interruption detected from Gemini server (msg #${msgId}).`);
      this.turnHasActivity = false;
      if (this.onInterrupted) {
        this.onInterrupted();
      }
    }

    // 2. User Input Audio Transcription (Official Gemini Live API format)
    const interimInput = serverContent.interimInputTranscription?.text;
    const finalInput = serverContent.inputTranscription?.text;

    if (finalInput) {
      console.log(`[GeminiLiveClient #${this.clientId}] [User STT Final] "${finalInput}"`);
      this.lastUserUtterance = finalInput;
      this.turnHasActivity = false;
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
        if (!part) continue;
        // Output audio stream
        if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('audio/pcm')) {
          this.turnHasActivity = true;
          const chunkId = ++this.audioChunkCounter;
          if (this.onAudioChunk && part.inlineData.data) {
            this.onAudioChunk(part.inlineData.data);
          }
        }

        // Assistant Output Text / Transcript (streamed delta chunks)
        if (part.text) {
          this.turnHasActivity = true;
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
      this.turnHasActivity = true;
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
      this.turnHasActivity = false;
      this.emptyTurnCount = 0;

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
        console.log(`[GeminiLiveClient #${this.clientId}] Executing ${call.name} call (0ms non-blocking):`, call.args);
        
        const whiteboardArgs = { ...call.args };

        // 0ms IMMEDIATE ACKNOWLEDGEMENT: Never block Gemini Live voice stream!
        responses.push({
          id: call.id,
          name: call.name,
          response: {
            result: { status: 'success', message: 'Whiteboard notes updated successfully.' },
          },
        });

        // Dispatch to whiteboard canvas immediately
        if (this.onWhiteboardCall) {
          this.onWhiteboardCall(whiteboardArgs);
        }

        // Asynchronously resolve visual AI image in background if requested without blocking voice
        if (whiteboardArgs.imagePrompt && !whiteboardArgs.imageUrl) {
          fetch(`${this.backendUrl}/api/tools/generate-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: whiteboardArgs.imagePrompt, topic: whiteboardArgs.topic }),
          })
            .then((res) => (res.ok ? res.json() : null))
            .then((aiData) => {
              if (aiData?.imageUrl && this.onWhiteboardCall) {
                this.onWhiteboardCall({
                  ...whiteboardArgs,
                  visualType: 'ai_image',
                  imageUrl: aiData.imageUrl,
                  aiImageUrl: aiData.imageUrl,
                  imagePrompt: whiteboardArgs.imagePrompt,
                  source: aiData.source || 'Cloudflare FLUX.1 Schnell',
                  attribution: aiData.attribution || 'Generated via FLUX.1 Schnell on Cloudflare Workers AI',
                });
              }
            })
            .catch((e) => console.warn('[GeminiLiveClient] Background AI image generation skipped:', e.message));
        }

        // Asynchronously resolve visual photo in background if requested without blocking voice
        if (whiteboardArgs.visualQuery && !whiteboardArgs.imageUrl) {
          fetch(`${this.backendUrl}/api/tools/visual-search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: whiteboardArgs.visualQuery, maxResults: 1 }),
          })
            .then((res) => (res.ok ? res.json() : null))
            .then((visualData) => {
              if (visualData?.success && visualData.selectedImage && this.onWhiteboardCall) {
                this.onWhiteboardCall({
                  ...whiteboardArgs,
                  visualType: 'photo',
                  imageUrl: visualData.selectedImage.imageUrl,
                  imageTitle: visualData.selectedImage.title,
                  attribution: visualData.selectedImage.attribution,
                });
              }
            })
            .catch((e) => console.warn('[GeminiLiveClient] Background visual query search skipped:', e.message));
        }
      } else if (call.name === 'generate_ai_image') {
        console.log(`[GeminiLiveClient #${this.clientId}] Executing generate_ai_image call:`, call.args);
        const { prompt, topic, caption, subject } = call.args || {};
        const cleanTopic = topic || 'AI Conceptual Visual';
        const cleanPrompt = prompt || cleanTopic;

        // Immediate 0ms acknowledgment so Gemini Live voice streaming never stutters
        responses.push({
          id: call.id,
          name: call.name,
          response: {
            result: {
              status: 'success',
              message: `AI image "${cleanTopic}" generated and displayed on student whiteboard canvas.`,
            },
          },
        });

        const visualPayload = {
          topic: cleanTopic,
          caption: caption || '',
          subject: subject || 'General',
          cardType: 'visual',
          visualType: 'ai_image',
          imagePrompt: cleanPrompt,
          imageUrl: null,
          aiImageUrl: null,
          source: 'Cloudflare FLUX.1 Schnell',
          attribution: 'Generated via FLUX.1 Schnell on Cloudflare Workers AI',
          notes: caption ? [caption] : [],
        };

        if (this.onWhiteboardCall) {
          this.onWhiteboardCall(visualPayload);
        }

        // Call backend Cloudflare Workers AI endpoint to generate high-res illustration
        fetch(`${this.backendUrl}/api/tools/generate-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: cleanPrompt, topic: cleanTopic, subject }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.success && data.imageUrl && this.onWhiteboardCall) {
              this.onWhiteboardCall({
                ...visualPayload,
                imageUrl: data.imageUrl,
                aiImageUrl: data.imageUrl,
                source: data.source || 'Cloudflare FLUX.1 Schnell',
                attribution: data.attribution || 'Generated via FLUX.1 Schnell on Cloudflare Workers AI',
              });
            }
          })
          .catch((err) => console.warn('[GeminiLiveClient] Backend generate-image error:', err.message));
      } else if (call.name === 'render_visual') {
        console.log(`[GeminiLiveClient #${this.clientId}] Executing render_visual call:`, call.args);
        const { topic, mode, svgCode, simType, simulationCode, equation, manimCode, searchQuery, imagePrompt, caption, subject } = call.args || {};

        const visualPayload = {
          id: 'anim-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          topic: topic || 'Educational Visual',
          caption: caption || '',
          subject: subject || 'general',
          cardType: 'visual',
          notes: caption ? [caption] : [],
        };

        if (mode === 'animated_svg') {
          // Mode A: Animated Vector Loop with CSS keyframes
          visualPayload.visualType = 'animation';
          visualPayload.animationType = 'animated_svg';
          visualPayload.svgCode = svgCode || '';
        } else if (mode === 'interactive_sim') {
          // Mode B: Interactive Canvas Simulation Lab
          visualPayload.visualType = 'animation';
          visualPayload.animationType = 'simulation';
          visualPayload.simType = (simType || 'projectile').toLowerCase();
          visualPayload.simulationCode = simulationCode || null;
        } else if (mode === 'manim_video') {
          // Mode C: 3Blue1Brown Mathematical Scene
          visualPayload.visualType = 'animation';
          visualPayload.animationType = 'manim_video';
          visualPayload.equation = equation || '';
          visualPayload.isRendering = true;

          // Asynchronously trigger backend Manim compilation and update whiteboard card in-place
          fetch(`${this.backendUrl}/api/tools/render-manim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: manimCode, topic, equation, sceneType: simType || 'pythagoras' }),
          })
            .then((res) => res.json())
            .then((manimData) => {
              if (manimData.success) {
                console.log('[GeminiLiveClient] Manim scene compiled successfully:', manimData.engine);
                if (this.onWhiteboardCall) {
                  this.onWhiteboardCall({
                    ...visualPayload,
                    isRendering: false,
                    videoUrl: manimData.videoUrl || null,
                    sceneCode: manimData.sceneCode || null,
                    engine: manimData.engine,
                  });
                }
              }
            })
            .catch((err) => console.warn('[GeminiLiveClient] Manim render request error:', err.message));
        } else if (mode === 'archive_animation') {
          // Mode D: Authentic Educational Animation Loop from Archives (.gif, .webm, .mp4)
          visualPayload.visualType = 'animation';
          visualPayload.animationType = 'archive_animation';
          const query = searchQuery || topic || '';
          console.log(`[GeminiLiveClient] Searching educational archive for animation loop: "${query}"`);

          try {
            const res = await fetch(`${this.backendUrl}/api/tools/animation-search`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query, maxResults: 3 }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.selectedAnimation) {
                visualPayload.animationUrl = data.selectedAnimation.animationUrl;
                visualPayload.thumbnailUrl = data.selectedAnimation.thumbnailUrl;
                visualPayload.isVideo = data.selectedAnimation.isVideo;
                visualPayload.isGif = data.selectedAnimation.isGif;
                visualPayload.attribution = data.selectedAnimation.attribution;
                visualPayload.caption = caption || data.selectedAnimation.description || data.selectedAnimation.title;
              }
            }
          } catch (animErr) {
            console.error('[GeminiLiveClient] Archive animation search error:', animErr);
          }
        } else if (mode === 'photo_search') {
          const query = searchQuery || topic || '';
          console.log(`[GeminiLiveClient] Searching educational archive for photo: "${query}"`);
          try {
            const res = await fetch(`${this.backendUrl}/api/tools/visual-search`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query, maxResults: 3 }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.selectedImage) {
                visualPayload.visualType = 'photo';
                visualPayload.imageUrl = data.selectedImage.imageUrl;
                visualPayload.imageTitle = data.selectedImage.title;
                visualPayload.attribution = data.selectedImage.attribution;
                visualPayload.caption = caption || data.selectedImage.description || data.selectedImage.title;
              } else {
                visualPayload.visualType = 'photo_fallback';
                visualPayload.message = data.message || `No photo found for "${query}".`;
              }
            } else {
              visualPayload.visualType = 'photo_fallback';
              visualPayload.message = `Visual search returned HTTP status ${res.status}.`;
            }
          } catch (fetchErr) {
            console.error('[GeminiLiveClient] Visual photo search failed:', fetchErr);
            visualPayload.visualType = 'photo_fallback';
            visualPayload.message = `Photo search could not connect to server: ${fetchErr.message}`;
          }
        } else if (mode === 'ai_image') {
          const prompt = imagePrompt || topic || 'Scientific concept';
          console.log(`[GeminiLiveClient] Generating AI illustration via Cloudflare Workers AI for prompt: "${prompt}"`);
          visualPayload.visualType = 'ai_image';
          visualPayload.imagePrompt = prompt;
          try {
            const res = await fetch(`${this.backendUrl}/api/tools/generate-image`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt, topic, subject }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.imageUrl) {
                visualPayload.imageUrl = data.imageUrl;
                visualPayload.aiImageUrl = data.imageUrl;
                visualPayload.source = data.source || 'Cloudflare FLUX.1 Schnell';
                visualPayload.attribution = data.attribution || 'Generated via FLUX.1 Schnell on Cloudflare Workers AI';
              }
            }
          } catch (genErr) {
            console.error('[GeminiLiveClient] Visual AI image generation error:', genErr);
          }
        } else {
          // Default: svg_sketch (Autonomous vector diagram)
          visualPayload.visualType = 'svg';
          visualPayload.svgCode = svgCode || '';
        }

        if (this.onWhiteboardCall) {
          this.onWhiteboardCall(visualPayload);
        }

        responses.push({
          id: call.id,
          name: call.name,
          response: {
            result: {
              status: 'success',
              message: `Visual ${mode} "${topic}" successfully displayed on student whiteboard canvas.`,
            },
          },
        });
      } else if (call.name === 'render_manim_animation') {
        console.log(`[GeminiLiveClient #${this.clientId}] Executing render_manim_animation call:`, call.args);
        const { topic, equation, sceneType, manimCode, caption } = call.args || {};
        const animPayload = {
          id: 'manim-' + Date.now(),
          topic: topic || 'Mathematical Animation',
          equation: equation || '',
          caption: caption || '',
          visualType: 'animation',
          animationType: 'manim_video',
          isRendering: true,
          cardType: 'visual',
          notes: caption ? [caption] : [],
        };

        if (this.onWhiteboardCall) {
          this.onWhiteboardCall(animPayload);
        }

        fetch(`${this.backendUrl}/api/tools/render-manim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: manimCode, topic, equation, sceneType: sceneType || 'pythagoras' }),
        })
          .then((res) => res.json())
          .then((manimData) => {
            if (manimData.success && this.onWhiteboardCall) {
              this.onWhiteboardCall({
                ...animPayload,
                isRendering: false,
                videoUrl: manimData.videoUrl || null,
                sceneCode: manimData.sceneCode || null,
                engine: manimData.engine,
              });
            }
          })
          .catch((err) => console.warn('[GeminiLiveClient] Manim error:', err.message));

        responses.push({
          id: call.id,
          name: call.name,
          response: {
            result: { status: 'success', message: `3Blue1Brown Mathematical scene for "${topic}" is rendering.` },
          },
        });
      } else if (call.name === 'render_simulation') {
        console.log(`[GeminiLiveClient #${this.clientId}] Executing render_simulation call:`, call.args);
        const { topic, simType, caption, parameters } = call.args || {};
        const simPayload = {
          id: 'sim-' + Date.now(),
          topic: topic || 'Physics Experiment Lab',
          simType: (simType || 'projectile').toLowerCase(),
          caption: caption || '',
          parameters: parameters || null,
          visualType: 'animation',
          animationType: 'simulation',
          cardType: 'visual',
          notes: caption ? [caption] : [],
        };

        if (this.onWhiteboardCall) {
          this.onWhiteboardCall(simPayload);
        }

        responses.push({
          id: call.id,
          name: call.name,
          response: {
            result: { status: 'success', message: `Interactive simulation lab "${topic}" mounted on whiteboard.` },
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
      } else if (call.name === 'highlight_whiteboard_card') {
        console.log(`[GeminiLiveClient #${this.clientId}] Executing highlight_whiteboard_card call:`, call.args);
        if (this.onHighlightWhiteboard) {
          this.onHighlightWhiteboard(call.args);
        }
        responses.push({
          id: call.id,
          name: call.name,
          response: {
            result: { status: 'success', message: `Highlighted topic "${call.args?.topic || ''}" on whiteboard.` },
          },
        });
      } else if (call.name === 'laser_point_canvas') {
        console.log(`[GeminiLiveClient #${this.clientId}] Executing laser_point_canvas call:`, call.args);
        if (this.onLaserPointCanvas) {
          this.onLaserPointCanvas(call.args);
        }
        responses.push({
          id: call.id,
          name: call.name,
          response: {
            result: { status: 'success', message: 'Pointed laser indicator on whiteboard canvas.' },
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
      } else if (call.name === 'youtube_channel_search') {
        const { channelName = '', type = 'videos', query = '' } = call.args || {};
        console.log(`[GeminiLiveClient #${this.clientId}] Executing YouTube channel search for: "${channelName}" (type: ${type}${query ? `, query: ${query}` : ''})`);

        let resultPayload = '';
        try {
          const res = await fetch(`${this.backendUrl}/api/tools/youtube-channel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channelName, type, query }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.items && data.items.length > 0) {
              const isPlaylists = data.tab === 'playlists';
              let summary = `=== REAL-TIME YOUTUBE CHANNEL: ${data.channel} (${data.tab.toUpperCase()}) ===\n`;
              if (isPlaylists) {
                summary += `Found ${data.items.length} Playlists on channel:\n`;
                data.items.forEach((p, idx) => {
                  summary += `${idx + 1}. "${p.title}" ${p.videoCount ? `(${p.videoCount})` : ''} - ${p.url}\n`;
                });
              } else {
                summary += `Latest Uploaded Videos (Live from YouTube):\n`;
                data.items.forEach((v, idx) => {
                  summary += `${idx + 1}. "${v.title}" (${v.uploaded || 'recent'}${v.views ? ` • ${v.views}` : ''}) - ${v.url}\n`;
                });
              }
              resultPayload = summary.trim();

              // Pin channel summary onto Whiteboard for student
              if (this.onWhiteboardCall) {
                const noteBullets = data.items.slice(0, 6).map((item) =>
                  isPlaylists
                    ? `• "${item.title}" ${item.videoCount ? `(${item.videoCount})` : ''}`
                    : `• "${item.title}" (${item.uploaded || 'recent'})`
                );

                this.onWhiteboardCall({
                  topic: `📺 ${data.channel} (${isPlaylists ? 'Playlists' : 'Latest Uploads'})`,
                  notes: noteBullets,
                  cardType: 'concept',
                  caption: `Live from YouTube: "${data.channel}"`,
                });
              }
            } else {
              resultPayload = data.message || `No ${type} found for YouTube channel "${channelName}".`;
            }
          } else {
            resultPayload = `YouTube channel tool returned HTTP status ${res.status}.`;
          }
        } catch (chErr) {
          console.error('[GeminiLiveClient] YouTube channel search error:', chErr);
          resultPayload = `Failed to fetch YouTube channel: ${chErr.message}`;
        }

        responses.push({
          id: call.id,
          name: call.name,
          response: {
            result: resultPayload,
          },
        });
      } else if (call.name === 'youtube_fetch_transcript') {
        const { query = '', channelName = '', videoUrlOrId = '' } = call.args || {};
        console.log(`[GeminiLiveClient #${this.clientId}] Executing YouTube transcript fetch:`, { query, channelName, videoUrlOrId });

        let resultPayload = '';
        try {
          const res = await fetch(`${this.backendUrl}/api/tools/youtube-transcript`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, channelName, videoUrlOrId }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.video) {
              resultPayload = data.formattedSummary || `Retrieved video: "${data.video.title}" by ${data.video.channel}. Transcript: ${data.fullText || 'No transcript'}`;

              // Pin dedicated YouTube video roadmap onto Whiteboard for student
              if (this.onWhiteboardCall) {
                const noteBullets = [
                  `Channel: ${data.video.channel} • Duration: ${data.video.duration || 'N/A'}`,
                  `Video Link: ${data.video.url}`,
                ];
                if (data.hasTranscript) {
                  noteBullets.push(`Full chronological roadmap (${data.timeline?.length || 0} chapters) loaded onto whiteboard.`);
                  noteBullets.push(`Strict Grounding: Zero external hallucination.`);
                } else {
                  noteBullets.push(`Note: Creator has disabled subtitles on this video.`);
                }

                this.onWhiteboardCall({
                  topic: `🎬 ${data.video.title}`,
                  notes: noteBullets,
                  cardType: 'video_timeline',
                  video: data.video,
                  timeline: data.timeline || [],
                  attribution: `${data.video.channel} (YouTube)`,
                  caption: `YouTube Video: "${data.video.title}" by ${data.video.channel}`,
                });
              }
            } else {
              resultPayload = data.message || `Could not find YouTube video for "${query}".`;
            }
          } else {
            resultPayload = `YouTube tool request returned HTTP status ${res.status}.`;
          }
        } catch (ytErr) {
          console.error('[GeminiLiveClient] YouTube tool request failed:', ytErr);
          resultPayload = `Failed to fetch YouTube transcript: ${ytErr.message}`;
        }

        responses.push({
          id: call.id,
          name: call.name,
          response: {
            result: resultPayload,
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
