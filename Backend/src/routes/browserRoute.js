import express from 'express';
import { browserService } from '../services/browserService.js';

const router = express.Router();

/**
 * Executes a browser action requested by Gemini Live or user UI.
 * POST /api/browser/action
 * Body: { action: 'navigate'|'click'|'type'|'scroll', ...args }
 */
router.post('/browser/action', async (req, res) => {
  try {
    const { action, url, selector, x, y, text, pressEnter, direction, amount, description } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Field "action" is required.' });
    }

    let result;
    if (action === 'navigate') {
      result = await browserService.navigate(url);
    } else if (action === 'click') {
      result = await browserService.click({ selector, x, y, description });
    } else if (action === 'type') {
      result = await browserService.type({ text, selector, pressEnter });
    } else if (action === 'scroll') {
      result = await browserService.scroll({ direction, amount });
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
    const state = await browserService.getViewportState();
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
