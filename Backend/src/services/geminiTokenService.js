import { GoogleGenAI } from '@google/genai';

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
