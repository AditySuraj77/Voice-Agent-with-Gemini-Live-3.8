import express from 'express';
import { fetchYouTubeTranscriptAndDetails } from '../services/youtubeService.js';

const router = express.Router();

/**
 * POST /api/tools/youtube-transcript
 * Body: { query: string, channelName?: string, videoUrlOrId?: string }
 */
router.post('/tools/youtube-transcript', async (req, res) => {
  try {
    const { query, channelName, videoUrlOrId } = req.body || {};

    if (!query && !videoUrlOrId) {
      return res.status(400).json({
        success: false,
        error: 'Either "query" or "videoUrlOrId" is required in request body.',
      });
    }

    const cleanQuery = typeof query === 'string' ? query.trim() : '';
    const cleanChannel = typeof channelName === 'string' ? channelName.trim() : '';
    const cleanVideo = typeof videoUrlOrId === 'string' ? videoUrlOrId.trim() : '';

    const result = await fetchYouTubeTranscriptAndDetails({
      query: cleanQuery,
      channelName: cleanChannel,
      videoUrlOrId: cleanVideo,
    });

    return res.json(result);
  } catch (err) {
    console.error('[youtubeRoute] Execution error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to process YouTube transcript request',
      details: err.message,
    });
  }
});

export default router;
