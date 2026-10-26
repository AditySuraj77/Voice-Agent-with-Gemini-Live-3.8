import { GoogleGenAI } from '@google/genai';
import { GEMINI_TOOLS } from './geminiTokenService.js';

/**
 * Intelligent Key Pool & Load Balancer for Gemini Live API keys.
 * Handles:
 * - Dynamic discovery of 20+ keys from environment variables.
 * - Least-active concurrency & Round-Robin distribution.
 * - Automatic 429 / RESOURCE_EXHAUSTED cooldown handling (60 seconds).
 * - Automatic seamless failover to next healthy key on rate-limit or network timeout.
 * - BYOK (Bring Your Own Key) priority override.
 */
export class GeminiKeyPool {
  constructor() {
    this.keyRecords = [];
    this.initPool();
  }

  /**
   * Initializes or refreshes the pool from process.env
   */
  initPool() {
    const rawKeys = new Map(); // keyString -> variableName

    // 1. Check GEMINI_API_KEYS (comma separated)
    if (process.env.GEMINI_API_KEYS) {
      process.env.GEMINI_API_KEYS.split(',')
        .map((k) => k.trim())
        .filter(Boolean)
        .forEach((k, idx) => rawKeys.set(k, `GEMINI_API_KEYS[${idx}]`));
    }

    // 2. Check standard GEMINI_API_KEY
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
      rawKeys.set(process.env.GEMINI_API_KEY.trim(), 'GEMINI_API_KEY');
    }

    // 3. Scan for any liveTranslate_Gemini* or liveTransalte_Gemini* or GEMINI_KEY* variables
    for (const [varName, varVal] of Object.entries(process.env)) {
      if (typeof varVal === 'string' && varVal.trim()) {
        const val = varVal.trim();
        if (
          (/liveTrans.*Gemini/i.test(varName) || /^GEMINI_API_KEY/i.test(varName)) &&
          !rawKeys.has(val)
        ) {
          rawKeys.set(val, varName);
        }
      }
    }

    let id = 1;
    this.keyRecords = Array.from(rawKeys.entries()).map(([key, name]) => {
      const masked =
        key.length > 8 ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : '***';
      return {
        id: id++,
        name,
        key,
        masked,
        concurrency: 0,
        totalSuccess: 0,
        totalErrors: 0,
        cooldownUntil: 0,
        lastUsedAt: 0,
      };
    });

    if (this.keyRecords.length > 0) {
      console.log(
        `[GeminiKeyPool] Initialized pool with ${this.keyRecords.length} unique Gemini API key(s).`
      );
    }
  }

  ensurePool() {
    if (this.keyRecords.length === 0) {
      this.initPool();
    }
  }

  getPoolStatus() {
    this.ensurePool();
    const now = Date.now();
    const healthy = this.keyRecords.filter((k) => now >= k.cooldownUntil).length;
    const totalConcurrency = this.keyRecords.reduce((sum, k) => sum + (k.concurrency || 0), 0);
    return {
      totalKeys: this.keyRecords.length,
      healthyKeys: healthy,
      cooldownKeys: this.keyRecords.length - healthy,
      activeConcurrency: totalConcurrency,
    };
  }

  /**
   * Selects the best candidate key from the pool.
   * Prioritizes least concurrency, then least recently used.
   */
  selectKey(customApiKey = null) {
    if (customApiKey && typeof customApiKey === 'string' && customApiKey.trim().length > 10) {
      const key = customApiKey.trim();
      const masked = `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
      return {
        id: 0,
        name: 'BYOK (User Provided)',
        key,
        masked,
        concurrency: 0,
        totalSuccess: 0,
        totalErrors: 0,
        cooldownUntil: 0,
        lastUsedAt: Date.now(),
        isBYOK: true,
      };
    }

    this.ensurePool();

    if (this.keyRecords.length === 0) {
      throw new Error('No Gemini API keys found in server environment.');
    }

    const now = Date.now();
    // Filter keys that are NOT currently in cooldown
    const available = this.keyRecords.filter((k) => now >= k.cooldownUntil);

    let candidate;
    if (available.length > 0) {
      // Pick key with least active concurrency, tie-breaker: least recently used
      candidate = available.reduce((best, curr) => {
        if (!best) return curr;
        if (curr.concurrency < best.concurrency) return curr;
        if (curr.concurrency === best.concurrency && curr.lastUsedAt < best.lastUsedAt) return curr;
        return best;
      }, null);
    } else {
      // All keys in cooldown! Pick the one whose cooldown expires earliest
      console.warn(
        '[GeminiKeyPool] WARNING: All keys in pool currently in cooldown! Picking earliest expiring key.'
      );
      candidate = this.keyRecords.reduce((earliest, curr) => {
        if (!earliest) return curr;
        return curr.cooldownUntil < earliest.cooldownUntil ? curr : earliest;
      }, null);
    }

    candidate.lastUsedAt = now;
    return candidate;
  }

  markSuccess(keyRecord, tokenResult = null) {
    if (keyRecord && !keyRecord.isBYOK) {
      keyRecord.totalSuccess += 1;
      keyRecord.concurrency += 1;

      // Automatically decay concurrency when ephemeral token expires or after max 30 mins
      let ttlMs = 30 * 60 * 1000;
      if (tokenResult?.expireTime) {
        const exp = new Date(tokenResult.expireTime).getTime();
        if (!isNaN(exp) && exp > Date.now()) {
          ttlMs = Math.min(exp - Date.now(), 60 * 60 * 1000);
        }
      }
      setTimeout(() => {
        this.decrementConcurrency(keyRecord.id);
      }, ttlMs);
    }
  }

  decrementConcurrency(keyId) {
    const rec = this.keyRecords.find((k) => k.id === keyId);
    if (rec && rec.concurrency > 0) {
      rec.concurrency -= 1;
    }
  }

  markError(keyRecord, error) {
    if (!keyRecord || keyRecord.isBYOK) return;

    keyRecord.totalErrors += 1;
    const msg = (error && (error.message || String(error))) || '';
    const isRateLimit =
      msg.includes('429') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('quota') ||
      msg.includes('rate limit');

    if (isRateLimit) {
      // Place key on 60 second cooldown
      keyRecord.cooldownUntil = Date.now() + 60 * 1000;
      console.warn(
        `[GeminiKeyPool] Key #${keyRecord.id} (${keyRecord.name} - ${keyRecord.masked}) hit rate limit (429). Placed on cooldown for 60s.`
      );
    } else {
      console.error(
        `[GeminiKeyPool] Key #${keyRecord.id} (${keyRecord.name} - ${keyRecord.masked}) encountered error: ${msg}`
      );
    }
  }

  /**
   * Provisions an ephemeral token using intelligent pool rotation and automatic retry.
   */
  async createEphemeralToken({
    model = 'gemini-3.8-live',
    uses = 1,
    customApiKey = null,
    maxRetries = 4,
  } = {}) {
    this.ensurePool();
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
        },
      },
    };

    let lastError = null;
    const totalAvailable = Math.max(1, this.keyRecords.length);
    const attempts = customApiKey ? 1 : Math.min(maxRetries, totalAvailable);

    for (let attempt = 1; attempt <= attempts; attempt++) {
      const keyRecord = this.selectKey(customApiKey);
      try {
        console.log(
          `[GeminiKeyPool] [Attempt ${attempt}/${attempts}] Provisioning token via Key #${keyRecord.id} (${keyRecord.masked}) for ${normalizedModel}`
        );
        const client = new GoogleGenAI({ apiKey: keyRecord.key });
        const tokenResult = await client.authTokens.create({ config });

        const token = tokenResult.name || tokenResult.token;
        if (!token) {
          throw new Error('No token string returned in Gemini AuthTokens API response.');
        }

        this.markSuccess(keyRecord, tokenResult);
        const poolStatus = this.getPoolStatus();

        return {
          token,
          name: tokenResult.name,
          expireTime: tokenResult.expireTime,
          newSessionExpireTime: tokenResult.newSessionExpireTime,
          model: normalizedModel,
          keyInfo: {
            id: keyRecord.id,
            name: keyRecord.name,
            masked: keyRecord.masked,
            isBYOK: !!keyRecord.isBYOK,
            healthyPoolKeys: poolStatus.healthyKeys,
            totalPoolKeys: poolStatus.totalKeys,
          },
        };
      } catch (err) {
        lastError = err;
        this.markError(keyRecord, err);
        const isRetryable =
          err.message?.includes('429') ||
          err.message?.includes('RESOURCE_EXHAUSTED') ||
          err.message?.includes('quota') ||
          err.message?.includes('fetch failed') ||
          err.message?.includes('timeout') ||
          err.message?.includes('UND_ERR_CONNECT_TIMEOUT') ||
          err.message?.includes('ECONNRESET');

        if (attempt < attempts && isRetryable) {
          console.log(
            `[GeminiKeyPool] Retrying token generation with next available pool key in 250ms...`
          );
          await new Promise((r) => setTimeout(r, 250));
        } else if (!isRetryable) {
          break;
        }
      }
    }

    throw lastError || new Error('Failed to provision ephemeral token after pool attempts.');
  }
}

export const geminiKeyPool = new GeminiKeyPool();
