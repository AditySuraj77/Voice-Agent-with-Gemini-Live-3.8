import express from 'express';
import { browserService } from '../services/browserService.js';

const router = express.Router();

/**
 * Executes a browser action requested by Gemini Live or user UI.
 * POST /api/browser/action
 * Body: { action: 'navigate'|'click'|'type'|'scroll'|'clip_whiteboard'|'highlight'|'reader_mode'|'back'|'forward'|'toggle_som', ...args }
 */
router.post('/browser/action', async (req, res) => {
  try {
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
    } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Field "action" is required.' });
    }

    let result;
    if (action === 'navigate') {
      result = await browserService.navigate(url);
    } else if (action === 'click') {
      result = await browserService.click({ elementId, selector, x, y, description });
    } else if (action === 'type') {
      result = await browserService.type({ elementId, text, selector, pressEnter });
    } else if (action === 'scroll') {
      result = await browserService.scroll({ direction, amount });
    } else if (action === 'clip_whiteboard') {
      result = await browserService.clipToWhiteboard({ selector, caption });
    } else if (action === 'highlight') {
      result = await browserService.highlight({ selector, text, label });
    } else if (action === 'reader_mode') {
      result = await browserService.toggleReaderMode(enabled);
    } else if (action === 'back') {
      result = await browserService.goBack();
    } else if (action === 'forward') {
      result = await browserService.goForward();
    } else if (action === 'toggle_som') {
      result = await browserService.toggleSoM(enabled);
    } else {
      return res.status(400).json({ error: `Unsupported browser action "${action}".` });
    }

    return res.json({
      success: true,
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
 * Returns the current viewport state and screenshot.
 * GET /api/browser/viewport
 */
router.get('/browser/viewport', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const state = await browserService.getViewportState(force);
    return res.json({
      success: true,
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
 * Resets the active browser session.
 * POST /api/browser/reset
 */
router.post('/browser/reset', async (req, res) => {
  try {
    await browserService.close();
    return res.json({
      success: true,
      message: 'Browser session reset successfully.',
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
