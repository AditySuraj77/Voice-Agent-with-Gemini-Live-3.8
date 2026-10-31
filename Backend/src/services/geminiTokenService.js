import { GoogleGenAI } from '@google/genai';

/**
 * Declared tool definitions available in Gemini Live session
 */
export const GEMINI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'write_on_whiteboard',
        description: 'TEACHER WHITEBOARD: Call this tool to write notes, formulas, step-by-step worked examples, challenge questions, or verified student answers on the student shared whiteboard in real time.',
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
            diagram: {
              type: 'OBJECT',
              description: 'Aristotle-style declarative whiteboard diagram. Specify kind ("vectors_2d", "grouped_boxes", "flow_chain", "comparison") and components.',
              properties: {
                kind: { type: 'STRING', description: 'Diagram kind: "vectors_2d", "grouped_boxes", "flow_chain", or "comparison"' },
                groupCount: { type: 'INTEGER', description: 'For grouped_boxes: number of groups (e.g. 3)' },
                itemsPerGroup: { type: 'INTEGER', description: 'For grouped_boxes: items per group (e.g. 4)' },
                groupLabel: { type: 'STRING', description: 'Label for grouping (e.g. "3 groups")' },
                formula: { type: 'STRING', description: 'Highlighted equation for the diagram, e.g. "3 x 4 = 12" or "q · k1 = 2.5"' },
                caption: { type: 'STRING', description: 'Educational takeaway caption' },
                dataJson: { type: 'STRING', description: 'Optional JSON string for custom vectors or steps (e.g. [{"label":"q","x":120,"y":-70}])' }
              }
            },
            svgCode: {
              type: 'STRING',
              description: 'Optional standalone SVG diagram (viewBox="0 0 600 400" with shapes, text labels, colors) for spatial/visual concepts (geometry, circuits, anatomy, physics setups, molecular bonds). Omit for pure math/arithmetic or text questions to keep updates fast and responsive.',
            },
            visualQuery: {
              type: 'STRING',
              description: 'Optional search query to fetch an authentic labeled diagram or photo from archives (e.g. "transformer architecture diagram", "human heart anatomy labeled diagram") when illustrating physical objects, anatomy, or setups.',
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
                  required: ['topic'],
        },
      },
      {
        name: 'render_visual',
        description: 'EDUCATIONAL VISUAL & ANIMATION SUITE: Call this when student requests a visual diagram, animation loop, or real photograph. Supports: "animated_svg" (instant zero-latency vector loops with CSS keyframes), "archive_animation" (authentic scientific/biological animation loops from Wikimedia), "photo_search" (high-resolution authentic archive photos), or "svg_sketch" (standalone vector drawings).',
        parameters: {
          type: 'OBJECT',
          properties: {
            topic: {
              type: 'STRING',
              description: 'Clear title of the visual or animation (e.g. "Refraction through Prism", "Pythagoras Theorem Proof", "Cardiac Cycle Animation")',
            },
            mode: {
              type: 'STRING',
              description: 'Visual creation mode: "animated_svg" for real-time CSS vector loops, "archive_animation" for scientific/biological archive animation loops (.gif/.webm), "photo_search" for static archive photographs, or "svg_sketch" for static vector drawings.',
            },
            svgCode: {
              type: 'STRING',
              description: 'When mode="animated_svg" or "svg_sketch": Full valid standalone SVG string with compact viewBox="0 0 500 300". For "animated_svg", include <style> @keyframes ... </style> for smooth perpetual motion loops (e.g. pulsating waves, moving electrons, rotating rays).',
            },
            searchQuery: {
              type: 'STRING',
              description: 'When mode="photo_search" or "archive_animation": Precise search query for educational archive (e.g. "Cardiac cycle animation", "Four-stroke engine animation", "DNA replication animation", "James Webb Space Telescope")',
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
 * Universal Helpful Assistant System Instruction
 */
export const DEFAULT_TEACHER_SYSTEM_INSTRUCTION = `You are a warm, highly capable, and helpful AI assistant paired with an interactive live whiteboard.

CORE BEHAVIOR:
1. HELPFUL & DIRECT: Answer questions clearly, accurately, and simply. Explain concepts in an easy-to-understand way with relatable everyday examples.
2. NATURAL VOICE PACING: Speak conversationally, warmly, and concisely (2–3 natural sentences per turn). Avoid robotic monologues or dry textbook lectures.
3. DYNAMIC LANGUAGE: Mirror whatever language the user speaks (English, Hindi, Hinglish, or any other language) naturally and conversationally.
4. WHITEBOARD & VISUALS:
   - When introducing or explaining a concept, use write_on_whiteboard with concise bullet notes, key formulas, or a clean SVG/declarative diagram.
   - For educational diagrams, always prefer clean animated SVG or declarative diagrams over AI image generation.
5. NEVER ABRUPTLY STOP SPEAKING (CRITICAL):
   - When you write on the whiteboard or display a visual, ALWAYS verbally explain what you wrote/drew in 2-3 warm, conversational sentences.
   - Do NOT just say the topic title and then go silent. Elaborate on the concept, explain how it works, and naturally ask the student an engaging follow-up question (e.g. "Kya aapko ye example samajh aaya, ya hum ek aur example leke dekhein?").
6. VERBAL BRIDGING (NO DEAD AIR): When you need to call search_web, youtube_channel_search, youtube_fetch_transcript, or browser tools, ALWAYS first speak a quick, natural 1-sentence bridging phrase in the user's language (e.g. "Ek second, main iski latest details check karke batata hoon..." or "Let me check that on YouTube for you...") BEFORE or while triggering the tool so the user is never left waiting in dead silence.`;

/**
 * Service to generate short-lived ephemeral tokens for Gemini Live WebSockets.
 * Keeps the permanent GEMINI_API_KEY secure on the server.
 */
import { geminiKeyPool } from './geminiKeyPool.js';

export class GeminiTokenService {
  async createEphemeralToken({ model = 'gemini-3.8-live', uses = 1, customApiKey = null } = {}) {
    return geminiKeyPool.createEphemeralToken({
      model,
      uses,
      customApiKey,
    });
  }
}

export const geminiTokenService = new GeminiTokenService();
