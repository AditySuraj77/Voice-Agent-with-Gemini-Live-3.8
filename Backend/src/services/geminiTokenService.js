import { GoogleGenAI } from '@google/genai';

/**
 * Declared tool definitions available in Gemini Live session
 */
export const GEMINI_TOOLS = [
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
              description: 'Optional complete valid standalone SVG diagram (viewBox="0 0 600 400") to illustrate the concept visually alongside the notes',
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
          required: ['topic', 'notes'],
        },
      },
      {
        name: 'generate_ai_image',
        description: 'DEDICATED FLUX.1 AI IMAGE GENERATION TOOL: Call this whenever the student asks to generate an AI image, asks about AI image tools, or requests a realistic conceptual 3D render, futuristic scene, quantum processor chip, or illustration with clear text labels. Uses the FLUX.1 model for high-fidelity graphics and accurate typography.',
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
        description: 'MANDATORY PRIMARY VISUAL TOOL: Display a high-definition educational visual or diagram on the student whiteboard whenever explaining concepts, objects, processes, machines, or historical/scientific topics. Mode "photo_search" retrieves authentic, high-resolution labeled diagrams and photographs directly from Google/Web & educational archives (e.g. transformer architecture diagram, human heart anatomy, electric generator parts, plant cell). Mode "svg_sketch" generates custom vector sketches (physics light rays, circuits, math shapes). Mode "ai_image" generates futuristic AI scenes.',
        parameters: {
          type: 'OBJECT',
          properties: {
            topic: {
              type: 'STRING',
              description: 'Clear title of the visual (e.g. "Transformer Architecture Diagram", "Refraction through Prism", "Plant Cell Organelles", "Human Heart Anatomy")',
            },
            mode: {
              type: 'STRING',
              description: 'Visual creation mode: "photo_search" for authentic high-res diagrams/photos from Google & educational archives (PREFERRED FOR ALL CONCEPTS), "svg_sketch" for custom vector diagrams drawn from scratch, or "ai_image" for futuristic AI scenes',
            },
            svgCode: {
              type: 'STRING',
              description: 'When mode="svg_sketch": Full valid standalone SVG string with compact viewBox="0 0 500 300" (e.g. <svg viewBox="0 0 500 300" xmlns="http://www.w3.org/2000/svg">...). Include clean shapes, soft pastel colors, and clear text labels with pointer lines.',
            },
            searchQuery: {
              type: 'STRING',
              description: 'When mode="photo_search": Precise search query for educational archive (e.g. "James Webb Space Telescope", "Taj Mahal", "Human Heart Anatomy")',
            },
            imagePrompt: {
              type: 'STRING',
              description: 'When mode="ai_image": Detailed visual description for the FLUX AI image generator. Always include the concept title/label in single quotes for accurate typography (e.g. "Realistic 3D cross-section of Mitochondria with glowing title \'MITOCHONDRIA\', studio lighting, 8k, scientific illustration").',
            },
            caption: {
              type: 'STRING',
              description: 'Short 1-2 sentence educational explanation of what this visual illustrates',
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
        description: 'MANDATORY FOR YOUTUBE CHANNELS & PLAYLISTS: Call this tool whenever the student asks to check, explore, search, or view ANY YouTube channel, its latest uploaded videos, or playlists (e.g. "Stanford Online channel playlists", "OpenAI channel latest videos", "Code Eater channel videos", "Raj Shamani", "kisi YouTube channel par jao"). NEVER call search_web for YouTube channel queries.',
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
];

/**
 * Service to generate short-lived ephemeral tokens for Gemini Live WebSockets.
 * Keeps the permanent GEMINI_API_KEY secure on the server.
 */
export class GeminiTokenService {
  getClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured on the backend server.');
    }
    return new GoogleGenAI({ apiKey });
  }

  /**
   * Provisions an ephemeral auth token for the Gemini Live API.
   * @param {Object} options
   * @param {string} options.model - e.g. 'gemini-3.8-live' or 'gemini-3.8-live-extended-thinking'
   * @param {number} [options.uses=1] - Number of session creations allowed
   * @returns {Promise<{token: string, name?: string, expireTime?: string, newSessionExpireTime?: string}>}
   */
  async createEphemeralToken({ model = 'gemini-3.8-live', uses = 1 } = {}) {
    const client = this.getClient();

    // Ensure model name has proper format
    const normalizedModel = model.startsWith('models/') ? model : `models/${model}`;

    const config = {
      uses,
      httpOptions: { apiVersion: 'v1alpha' },
      liveConnectConstraints: {
        model: normalizedModel,
        config: {
          responseModalities: ['AUDIO'],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: GEMINI_TOOLS,
        }
      }
    };

    console.log(`[GeminiTokenService] Provisioning ephemeral token for model: ${normalizedModel}`);
    const tokenResult = await client.authTokens.create({ config });

    // tokenResult contains name (which is the token identifier / access token)
    const token = tokenResult.name || tokenResult.token;
    if (!token) {
      throw new Error('No token returned from Gemini AuthTokens API.');
    }

    return {
      token,
      name: tokenResult.name,
      expireTime: tokenResult.expireTime,
      newSessionExpireTime: tokenResult.newSessionExpireTime,
      model: normalizedModel
    };
  }
}

export const geminiTokenService = new GeminiTokenService();
