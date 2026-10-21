import express from 'express';
import { searchTavily } from '../services/tavilySearchService.js';
import { searchUniversalVisual } from '../services/visualSearchService.js';

const router = express.Router();

/**
 * Endpoint for live web search queries triggered by Gemini Live function calls
 * POST /api/tools/search
 * Body: { query: string, maxResults?: number }
 */
router.post('/tools/search', async (req, res) => {
  try {
    const { query, maxResults } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'A valid string "query" is required in request body.' });
    }

    const cleanQuery = query.trim();
    if (cleanQuery.length > 300) {
      return res.status(400).json({ error: 'Search query exceeds maximum allowed length of 300 characters.' });
    }

    const searchResult = await searchTavily(cleanQuery, { maxResults: maxResults || 3 });
    return res.json(searchResult);
  } catch (err) {
    console.error('[searchRoute] Error during search execution:', err);
    return res.status(500).json({
      error: 'Web search execution failed',
      details: err.message,
    });
  }
});

/**
 * Endpoint for authentic educational photographs and archive visuals from Wikimedia Commons
 * POST /api/tools/visual-search
 * Body: { query: string, maxResults?: number }
 */
router.post('/tools/visual-search', async (req, res) => {
  try {
    const { query, maxResults } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'A valid string "query" is required in request body.' });
    }

    const cleanQuery = query.trim();
    if (cleanQuery.length > 300) {
      return res.status(400).json({ error: 'Visual search query exceeds maximum allowed length of 300 characters.' });
    }

    const visualResult = await searchUniversalVisual(cleanQuery, { maxResults: maxResults || 3 });
    return res.json(visualResult);
  } catch (err) {
    console.error('[searchRoute] Error during visual search execution:', err);
    return res.status(500).json({
      error: 'Educational visual search failed',
      details: err.message,
    });
  }
});

/**
 * Endpoint for generating educational AI illustrations via FLUX.1 (Pollinations.ai)
 * POST /api/tools/generate-image
 * Body: { prompt: string, topic?: string, subject?: string }
 */
router.post('/tools/generate-image', async (req, res) => {
  try {
    const { prompt, topic, subject } = req.body;
    const basePrompt = prompt || topic;
    if (!basePrompt || typeof basePrompt !== 'string' || !basePrompt.trim()) {
      return res.status(400).json({ error: 'A valid string "prompt" or "topic" is required in request body.' });
    }

    const cleanPrompt = basePrompt.trim();
    if (cleanPrompt.length > 500) {
      return res.status(400).json({ error: 'Image prompt exceeds maximum allowed length of 500 characters.' });
    }

    // Enhance prompt for clean educational illustration and legible typography
    const seed = Math.floor(Math.random() * 1000000);
    const encodedPrompt = encodeURIComponent(cleanPrompt);
    const apiKey = process.env.POLLINATIONS_API_KEY;
    const imageUrl = apiKey
      ? `https://gen.pollinations.ai/image/${encodedPrompt}?model=flux&width=1024&height=640&nologo=true&seed=${seed}&key=${apiKey}`
      : `https://image.pollinations.ai/prompt/${encodedPrompt}?model=flux&width=1024&height=640&nologo=true&seed=${seed}`;

    return res.json({
      success: true,
      imageUrl,
      prompt: cleanPrompt,
      topic: topic || cleanPrompt,
      subject: subject || 'general',
      source: 'FLUX.1 AI Generator',
      attribution: 'Generated via FLUX.1 by Black Forest Labs'
    });
  } catch (err) {
    console.error('[searchRoute] Error during AI image generation:', err);
    return res.status(500).json({
      error: 'AI image generation failed',
      details: err.message,
    });
  }
});

export default router;
