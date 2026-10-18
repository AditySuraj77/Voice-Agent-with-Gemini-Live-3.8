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

export default router;
