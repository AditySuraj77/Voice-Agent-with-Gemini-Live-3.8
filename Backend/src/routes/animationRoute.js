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

/**
 * Endpoint for safely proxying educational media to bypass CDN hotlinking / CORS restrictions
 * GET /api/tools/proxy-media?url=...
 */
router.get('/tools/proxy-media', async (req, res) => {
  try {
    const mediaUrl = req.query.url;
    if (!mediaUrl || typeof mediaUrl !== 'string') {
      return res.status(400).send('URL query parameter is required.');
    }

    const parsed = new URL(mediaUrl);
    // Allow wikimedia and standard educational CDN domains
    const isAllowed = parsed.hostname.endsWith('wikimedia.org') ||
                      parsed.hostname.endsWith('wikipedia.org') ||
                      parsed.hostname.endsWith('tavily.com');
    if (!isAllowed) {
      return res.status(403).send('Restricted domain');
    }

    const response = await fetch(mediaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        Accept: '*/*',
      },
    });

    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch upstream media.');
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const arrayBuffer = await response.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('[animationRoute] Proxy error:', err.message);
    return res.status(500).send('Media proxy failed');
  }
});

export default router;
