import { Router } from 'express';
import { geminiTokenService, DEFAULT_TEACHER_SYSTEM_INSTRUCTION } from '../services/geminiTokenService.js';
import { geminiKeyPool } from '../services/geminiKeyPool.js';

const router = Router();

// Allowed models to avoid arbitrary model parameter abuse
const ALLOWED_MODELS = new Set([
  'gemini-3.8-live',
  'gemini-3.8-live-extended-thinking',
  'models/gemini-3.8-live',
  'models/gemini-3.8-live-extended-thinking'
]);

/**
 * Handler for token generation (supports both GET and POST for BYOK)
 */
async function handleTokenRequest(req, res) {
  try {
    const requestedModel = (req.query.model || req.body?.model || 'gemini-3.8-live').toString();
    const customApiKey = req.headers['x-gemini-api-key'] || req.body?.apiKey || req.query.apiKey || null;

    if (!ALLOWED_MODELS.has(requestedModel)) {
      return res.status(400).json({
        error: 'Invalid model requested',
        allowedModels: Array.from(ALLOWED_MODELS)
      });
    }

    const tokenData = await geminiTokenService.createEphemeralToken({
      model: requestedModel,
      uses: 1,
      customApiKey
    });

    return res.json({
      success: true,
      token: tokenData.token,
      expireTime: tokenData.expireTime,
      newSessionExpireTime: tokenData.newSessionExpireTime,
      model: tokenData.model,
      keyInfo: tokenData.keyInfo,
      defaultSystemInstruction: DEFAULT_TEACHER_SYSTEM_INSTRUCTION
    });
  } catch (error) {
    console.error('[TokenRoute] Error provisioning ephemeral token:', error.message);
    const statusCode = error.message.includes('not configured') ? 500 : 502;
    return res.status(statusCode).json({
      error: 'Failed to provision ephemeral token',
      details: error.message
    });
  }
}

router.get('/token', handleTokenRequest);
router.post('/token', handleTokenRequest);

/**
 * Health & Pool Status endpoint
 */
router.get('/pool-status', (req, res) => {
  res.json({
    success: true,
    status: geminiKeyPool.getPoolStatus()
  });
});

export default router;
