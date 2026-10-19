import express from 'express';
import { handleYouTubeRequest, fetchChannelTabContent } from '../services/youtubeService.js';

const router = express.Router();

/**
 * POST /api/tools/youtube-channel
 * Body: { channelName: string, type?: 'videos'|'playlists' }
 */
router.post('/tools/youtube-channel', async (req, res) => {
  try {
    const { channelName, type = 'videos' } = req.body || {};
    if (!channelName || typeof channelName !== 'string' || !channelName.trim()) {
      return res.status(400).json({
        success: false,
        error: 'A valid "channelName" string is required.',
      });
    }

    const tab = type === 'playlists' ? 'playlists' : 'videos';
    const result = await fetchChannelTabContent(channelName.trim(), tab);
    return res.json(result);
  } catch (err) {
    console.error('[youtubeRoute] Channel fetch error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch YouTube channel content',
      details: err.message,
    });
  }
});

/**
 * POST /api/tools/youtube-transcript
 * Body: { query?: string, channelName?: string, videoUrlOrId?: string, action?: string, type?: string }
 */
router.post('/tools/youtube-transcript', async (req, res) => {
  try {
    const { query, channelName, videoUrlOrId, action, type } = req.body || {};

    if (!query && !videoUrlOrId && !channelName) {
      return res.status(400).json({
        success: false,
        error: 'Either "query", "channelName", or "videoUrlOrId" is required.',
      });
    }

    const cleanQuery = typeof query === 'string' ? query.trim() : '';
    const cleanChannel = typeof channelName === 'string' ? channelName.trim() : '';
    const cleanVideo = typeof videoUrlOrId === 'string' ? videoUrlOrId.trim() : '';

    const result = await handleYouTubeRequest({
      action,
      type,
      query: cleanQuery,
      channelName: cleanChannel,
      videoUrlOrId: cleanVideo,
    });

    return res.json(result);
  } catch (err) {
    console.error('[youtubeRoute] Execution error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to process YouTube request',
      details: err.message,
    });
  }
});

export default router;
