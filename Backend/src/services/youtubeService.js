import { YouTube } from 'youtube-sr';
import { YoutubeTranscript } from 'youtube-transcript';

/**
 * Extracts 11-character YouTube video ID from various URL formats or raw ID.
 */
export function extractVideoId(input = '') {
  if (!input || typeof input !== 'string') return null;
  const clean = input.trim();

  // If already an 11-character ID (alphanumeric, dash, underscore)
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }

  // Common YouTube URL patterns
  const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
  return match ? match[1] : null;
}

/**
 * Formats seconds into mm:ss or hh:mm:ss string
 */
function formatTimestamp(millisOrSeconds) {
  const totalSeconds = Math.floor(typeof millisOrSeconds === 'number' && millisOrSeconds > 1000 ? millisOrSeconds / 1000 : millisOrSeconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Fetches transcript for a YouTube video with language fallbacks.
 */
export async function getTranscript(videoId) {
  if (!videoId) throw new Error('Video ID is required to fetch transcript.');

  let rawTranscript = null;
  let detectedLang = 'en';

  // Try English first, then Hindi, then whatever default captions are available
  const langPreferences = ['en', 'hi', undefined];

  for (const lang of langPreferences) {
    try {
      rawTranscript = await YoutubeTranscript.fetchTranscript(videoId, lang ? { lang } : undefined);
      if (rawTranscript && rawTranscript.length > 0) {
        detectedLang = rawTranscript[0]?.lang || lang || 'auto';
        break;
      }
    } catch {
      // Continue to next fallback
    }
  }

  if (!rawTranscript || rawTranscript.length === 0) {
    return {
      success: false,
      hasTranscript: false,
      message: 'Captions/subtitles are disabled or not available for this video.',
      fullText: '',
      timedTranscript: [],
    };
  }

  // Format into readable timed segments and continuous text
  const timedTranscript = [];
  const textParts = [];

  for (const item of rawTranscript) {
    const timeStr = formatTimestamp(item.offset);
    const cleanText = (item.text || '').replace(/\n+/g, ' ').trim();
    if (cleanText) {
      timedTranscript.push({
        time: timeStr,
        offsetMs: item.offset,
        text: cleanText,
      });
      textParts.push(cleanText);
    }
  }

  const fullText = textParts.join(' ');

  return {
    success: true,
    hasTranscript: true,
    language: detectedLang,
    chunkCount: timedTranscript.length,
    fullText,
    timedTranscript,
  };
}

/**
 * Searches for a video by query, channel, or direct URL.
 */
export async function searchYouTubeVideo(query, channelName = '') {
  const directId = extractVideoId(query);
  if (directId) {
    try {
      const v = await YouTube.getVideo(`https://www.youtube.com/watch?v=${directId}`);
      if (v) {
        return {
          id: v.id,
          title: v.title,
          channel: v.channel?.name || 'YouTube',
          duration: v.durationFormatted || '',
          thumbnail: v.thumbnail?.url || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${v.id}`,
          description: v.description?.slice(0, 300) || '',
        };
      }
    } catch (e) {
      console.warn('[YouTubeService] Direct video fetch failed, continuing with ID:', e.message);
      return {
        id: directId,
        title: query,
        channel: channelName || 'YouTube',
        duration: '',
        thumbnail: `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${directId}`,
        description: '',
      };
    }
  }

  // Combine channel name with search query if provided
  let fullQuery = query || '';
  if (channelName && !fullQuery.toLowerCase().includes(channelName.toLowerCase())) {
    fullQuery = `${channelName} ${fullQuery}`.trim();
  }

  console.log(`[YouTubeService] Searching YouTube for query: "${fullQuery}"`);
  const results = await YouTube.search(fullQuery, { limit: 3, type: 'video' });

  if (!results || results.length === 0) {
    return null;
  }

  const best = results[0];
  return {
    id: best.id,
    title: best.title,
    channel: best.channel?.name || channelName || 'YouTube',
    duration: best.durationFormatted || '',
    thumbnail: best.thumbnail?.url || `https://i.ytimg.com/vi/${best.id}/hqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=${best.id}`,
    description: best.description?.slice(0, 300) || '',
  };
}

/**
 * End-to-end handler for student/Gemini YouTube transcript requests.
 */
export async function fetchYouTubeTranscriptAndDetails({ query, channelName = '', videoUrlOrId = '' }) {
  const targetQuery = videoUrlOrId || query;
  if (!targetQuery) {
    throw new Error('A search query, channel, or video URL is required.');
  }

  const video = await searchYouTubeVideo(targetQuery, channelName);
  if (!video) {
    return {
      success: false,
      message: `No matching YouTube video found for "${targetQuery}"${channelName ? ` on channel "${channelName}"` : ''}.`,
    };
  }

  console.log(`[YouTubeService] Found video: "${video.title}" (ID: ${video.id}) by ${video.channel}`);

  const transcriptData = await getTranscript(video.id);

  if (!transcriptData.hasTranscript) {
    return {
      success: true,
      video,
      hasTranscript: false,
      message: `Found video "${video.title}" (${video.url}) by ${video.channel}, but no subtitles/captions are available for it.`,
      formattedSummary: `Video: "${video.title}" by ${video.channel} (${video.url})\nNote: Subtitles are disabled by the creator for this video.`,
    };
  }

  // Format timed sample (first 10 key timestamps) and clean text
  const sampleTimeline = transcriptData.timedTranscript
    .slice(0, 15)
    .map((item) => `[${item.time}] ${item.text}`)
    .join('\n');

  // Cap full text to ~10,000 characters to keep WebSocket message snappy
  const cappedFullText = transcriptData.fullText.length > 10000
    ? transcriptData.fullText.slice(0, 10000) + '... (transcript continues)'
    : transcriptData.fullText;

  const formattedSummary = `
=== YOUTUBE VIDEO RETRIEVED ===
Title: "${video.title}"
Channel: ${video.channel}
Duration: ${video.duration || 'N/A'}
URL: ${video.url}
Thumbnail: ${video.thumbnail}

TIMED HIGHLIGHTS:
${sampleTimeline}

FULL TRANSCRIPT CONTENT:
${cappedFullText}
`.trim();

  return {
    success: true,
    video,
    hasTranscript: true,
    language: transcriptData.language,
    formattedSummary,
    fullText: transcriptData.fullText,
    timedTranscript: transcriptData.timedTranscript,
  };
}
