import express from 'express';
import { manimService } from '../services/manimService.js';
import { searchEducationalAnimation } from '../services/wikimediaService.js';

const router = express.Router();

/**
 * Endpoint for rendering 3Blue1Brown / Manim mathematical animations
 * POST /api/tools/render-manim
 * Body: { code?: string, topic?: string, equation?: string, sceneType?: string }
 */
router.post('/tools/render-manim', async (req, res) => {
  try {
    const { code, topic, equation, sceneType } = req.body || {};
    const result = await manimService.renderScene({
      code,
      topic,
      equation,
      sceneType,
    });
    return res.json(result);
  } catch (err) {
    console.error('[animationRoute] Error rendering Manim mathematical scene:', err);
    return res.status(500).json({
      success: false,
      error: 'Manim mathematical scene compilation failed',
      details: err.message,
    });
  }
});

/**
 * Endpoint for searching authentic scientific & biological animation loops (.gif, .webm, .mp4)
 * POST /api/tools/animation-search
 * Body: { query: string, maxResults?: number }
 */
router.post('/tools/animation-search', async (req, res) => {
  try {
    const { query, maxResults = 3 } = req.body || {};
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({
        success: false,
        error: 'A valid string "query" is required.',
      });
    }

    const cleanQuery = query.trim();
    const result = await searchEducationalAnimation(cleanQuery, { maxResults });
    return res.json(result);
  } catch (err) {
    console.error('[animationRoute] Error searching educational animations:', err);
    return res.status(500).json({
      success: false,
      error: 'Educational animation search failed',
      details: err.message,
    });
  }
});

export default router;
