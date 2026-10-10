import express from 'express';
import { searchTavily } from '../services/tavilySearchService.js';

const router = express.Router();

/**
 * Endpoint for live web search queries triggered by Gemini Live function calls
 * POST /api/tools/search
 * Body: { query: string, maxResults?: number }
 */
router.post('/tools/search', async (req, res) => {
  try {
    const { query, maxResults } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'A valid string "query" is required in request body.' });
    }

    const searchResult = await searchTavily(query, { maxResults: maxResults || 3 });
    return res.json(searchResult);
  } catch (err) {
    console.error('[searchRoute] Error during search execution:', err);
    return res.status(500).json({
      error: 'Web search execution failed',
      details: err.message,
    });
  }
});

export default router;
