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
 * Endpoint for generating educational AI illustrations via Cloudflare Workers AI FLUX.1-schnell
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

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
    const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();

    if (!accountId || !apiToken) {
      return res.status(503).json({
        error: 'Cloudflare credentials not configured',
        message: 'CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set in Backend/.env',
      });
    }

    console.log(`[searchRoute] Generating AI illustration via Cloudflare Workers AI FLUX.1-schnell for: "${cleanPrompt}"`);

    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: cleanPrompt,
        }),
      }
    );

    if (!cfResponse.ok) {
      const errText = await cfResponse.text();
      console.error('[searchRoute] Cloudflare Workers AI error response:', cfResponse.status, errText);
      return res.status(cfResponse.status).json({
        error: 'Cloudflare Workers AI generation failed',
        details: errText,
      });
    }

    const contentType = cfResponse.headers.get('content-type') || '';
    let dataUrl = '';

    if (contentType.includes('application/json')) {
      const json = await cfResponse.json();
      if (json.result?.image) {
        dataUrl = `data:image/jpeg;base64,${json.result.image}`;
      } else {
        throw new Error('No image payload returned in Cloudflare response.');
      }
    } else {
      const arrayBuffer = await cfResponse.arrayBuffer();
      const base64Image = Buffer.from(arrayBuffer).toString('base64');
      dataUrl = `data:image/jpeg;base64,${base64Image}`;
    }

    return res.json({
      success: true,
      imageUrl: dataUrl,
      prompt: cleanPrompt,
      topic: topic || cleanPrompt,
      subject: subject || 'general',
      source: 'Cloudflare Workers AI (FLUX.1 Schnell)',
      attribution: 'Generated via FLUX.1 Schnell on Cloudflare Workers AI',
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
