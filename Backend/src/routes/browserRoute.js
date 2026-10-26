import express from 'express';
import { browserService } from '../services/browserService.js';

const router = express.Router();

/**
 * Helper to safely extract and validate session ID from request.
 */
function extractSessionId(req) {
  const raw =
    req.headers['x-session-id'] ||
    req.body?.sessionId ||
    req.query?.sessionId ||
    'default';
  return String(raw).trim().slice(0, 64) || 'default';
}

/**
 * Executes an isolated browser action for the user's specific session.
 * POST /api/browser/action
 * Body: { action: 'navigate'|'click'|'type'|'scroll'|'clip_whiteboard'|'highlight'|'reader_mode'|'back'|'forward'|'toggle_som', sessionId?: string, ...args }
 */
router.post('/browser/action', async (req, res) => {
  try {
    const sessionId = extractSessionId(req);
    const {
      action,
      url,
      selector,
      elementId,
      x,
      y,
      text,
      pressEnter,
      direction,
      amount,
      description,
      caption,
      label,
      enabled,
    } = req.body || {};

    if (!action) {
      return res.status(400).json({ error: 'Field "action" is required.' });
    }

    let result;
    if (action === 'navigate') {
      result = await browserService.navigate(url, sessionId);
    } else if (action === 'click') {
      result = await browserService.click({ elementId, selector, x, y, description }, sessionId);
    } else if (action === 'type') {
      result = await browserService.type({ elementId, text, selector, pressEnter }, sessionId);
    } else if (action === 'scroll') {
      result = await browserService.scroll({ direction, amount }, sessionId);
    } else if (action === 'clip_whiteboard') {
      result = await browserService.clipToWhiteboard({ selector, caption }, sessionId);
    } else if (action === 'highlight') {
      result = await browserService.highlight({ selector, text, label }, sessionId);
    } else if (action === 'reader_mode') {
      result = await browserService.toggleReaderMode(enabled, sessionId);
    } else if (action === 'back') {
      result = await browserService.goBack(sessionId);
    } else if (action === 'forward') {
      result = await browserService.goForward(sessionId);
    } else if (action === 'toggle_som') {
      result = await browserService.toggleSoM(enabled, sessionId);
    } else {
      return res.status(400).json({ error: `Unsupported browser action "${action}".` });
    }

    return res.json({
      success: true,
      sessionId,
      ...result,
    });
  } catch (err) {
    console.error('[browserRoute] Action execution error:', err);
    return res.status(500).json({
      error: 'Browser action failed',
      details: err.message,
    });
  }
});

/**
 * Returns current viewport state and screenshot for user's specific session.
 * GET /api/browser/viewport
 */
router.get('/browser/viewport', async (req, res) => {
  try {
    const sessionId = extractSessionId(req);
    const force = req.query.force === 'true';
    const state = await browserService.getViewportState(force, sessionId);
    return res.json({
      success: true,
      sessionId,
      ...state,
    });
  } catch (err) {
    console.error('[browserRoute] Viewport fetch error:', err);
    return res.status(500).json({
      error: 'Failed to retrieve viewport state',
      details: err.message,
    });
  }
});

/**
 * Resets or closes the user's isolated browser session.
 * POST /api/browser/reset
 */
router.post('/browser/reset', async (req, res) => {
  try {
    const sessionId = extractSessionId(req);
    await browserService.closeSession(sessionId);
    return res.json({
      success: true,
      sessionId,
      message: `Browser session "${sessionId}" closed successfully.`,
    });
  } catch (err) {
    console.error('[browserRoute] Reset error:', err);
    return res.status(500).json({
      error: 'Failed to reset browser session',
      details: err.message,
    });
  }
});

export default router;
