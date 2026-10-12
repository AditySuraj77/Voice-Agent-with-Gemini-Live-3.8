import { GoogleGenAI } from '@google/genai';

/**
 * Declared tool definitions available in Gemini Live session
 */
export const GEMINI_TOOLS = [
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
      {
        name: 'update_whiteboard',
        description: 'Render or update visual interactive educational content on the student whiteboard canvas in real-time (math equations, science diagrams, interactive code editor, classification trees, tables, or notes).',
        parameters: {
          type: 'OBJECT',
          properties: {
            component: {
              type: 'STRING',
              description: 'Type of component to render: "math", "diagram", "code", "table", or "notes"',
            },
            title: {
              type: 'STRING',
              description: 'Headline or topic title for the whiteboard entry',
            },
            content: {
              type: 'STRING',
              description: 'The core content: code text, math formula/expansion, diagram type or note item',
            },
            action: {
              type: 'STRING',
              description: 'Action on the whiteboard: "append", "replace", or "clear"',
            },
          },
          required: ['component', 'content'],
        },
      },
      {
        name: 'update_mastery',
        description: 'Update the student learning progress, today focus, or mastery meter on the learning map.',
        parameters: {
          type: 'OBJECT',
          properties: {
            topic: {
              type: 'STRING',
              description: 'The skill or topic name being tracked',
            },
            current: {
              type: 'NUMBER',
              description: 'Current progress level or problems solved',
            },
            target: {
              type: 'NUMBER',
              description: 'Target goal level or total problems for mastery',
            },
            statusText: {
              type: 'STRING',
              description: 'Short encouraging status message (e.g. "Solid. Recording your progress.")',
            },
          },
          required: ['topic', 'current', 'target'],
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
