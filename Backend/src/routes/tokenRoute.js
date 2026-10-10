import { Router } from 'express';
import { geminiTokenService } from '../services/geminiTokenService.js';

const router = Router();

// Allowed models to avoid arbitrary model parameter abuse
const ALLOWED_MODELS = new Set([
  'gemini-3.8-live',
  'gemini-3.8-live-extended-thinking',
  'models/gemini-3.8-live',
  'models/gemini-3.8-live-extended-thinking'
]);

/**
 * GET /api/token
 * Returns a short-lived ephemeral token for the requested Gemini Live model.
 */
router.get('/token', async (req, res) => {
  try {
    const requestedModel = (req.query.model || 'gemini-3.8-live').toString();

    if (!ALLOWED_MODELS.has(requestedModel)) {
      return res.status(400).json({
        error: 'Invalid model requested',
        allowedModels: Array.from(ALLOWED_MODELS)
      });
    }

    const tokenData = await geminiTokenService.createEphemeralToken({
      model: requestedModel,
      uses: 1
    });

    return res.json({
      success: true,
      token: tokenData.token,
      expireTime: tokenData.expireTime,
      newSessionExpireTime: tokenData.newSessionExpireTime,
      model: tokenData.model
    });
  } catch (error) {
    console.error('[TokenRoute] Error provisioning ephemeral token:', error.message);
    const statusCode = error.message.includes('not configured') ? 500 : 502;
    return res.status(statusCode).json({
      error: 'Failed to provision ephemeral token',
      details: error.message
    });
  }
});

export default router;
