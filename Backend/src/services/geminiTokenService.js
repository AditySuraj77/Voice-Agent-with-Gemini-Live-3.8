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
        description: 'Click an element, link, or button on the live browser page using visible screen coordinates {x, y} from the webpage screenshot or CSS selector / text.',
        parameters: {
          type: 'OBJECT',
          properties: {
            description: {
              type: 'STRING',
              description: 'Description of the element being clicked (e.g. "Search button", "Getting Started link")',
            },
            x: {
              type: 'NUMBER',
              description: 'X coordinate (horizontal position 0 to 1280) of the element on the webpage screenshot',
            },
            y: {
              type: 'NUMBER',
              description: 'Y coordinate (vertical position 0 to 720) of the element on the webpage screenshot',
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
        description: 'Type text into an input field or search box on the live browser page.',
        parameters: {
          type: 'OBJECT',
          properties: {
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
