import { YouTube } from 'youtube-sr';
import { YoutubeTranscript } from 'youtube-transcript';

/**
 * Extracts 11-character YouTube video ID from various URL formats or raw ID.
 */
export function extractVideoId(input = '') {
  if (!input || typeof input !== 'string') return null;
  const clean = input.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
    return clean;
  }

  const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
  return match ? match[1] : null;
}

/**
 * Formats seconds into mm:ss or hh:mm:ss string
 */
export function formatTimestamp(millisOrSeconds) {
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
 * Resolves a channel name to its canonical URL or handle.
 */
export async function resolveChannelUrl(channelName) {
  if (!channelName) return null;
  const clean = channelName.trim();

  // If already a URL or handle
  if (clean.startsWith('http')) return clean.replace(/\/$/, '');
  if (clean.startsWith('@')) return `https://www.youtube.com/${clean}`;

  try {
    const results = await YouTube.search(clean, { limit: 1, type: 'channel' });
    if (results && results[0]?.url) {
      return results[0].url.replace(/\/$/, '');
    }
  } catch (err) {
    console.warn('[YouTubeService] Error resolving channel:', err.message);
  }

  // Fallback to formatted handle
  const slug = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `https://www.youtube.com/@${slug}`;
}

/**
 * Fetches real-time latest videos or playlists directly from a YouTube channel page.
 */
export async function fetchChannelTabContent(channelName, tab = 'videos') {
  const channelUrl = await resolveChannelUrl(channelName);
  if (!channelUrl) {
    throw new Error(`Could not locate YouTube channel "${channelName}".`);
  }

  const targetUrl = `${channelUrl}/${tab}`;
  console.log(`[YouTubeService] Fetching real-time channel ${tab} from: ${targetUrl}`);

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!res.ok) {
      throw new Error(`YouTube responded with HTTP ${res.status}`);
    }

    const html = await res.text();
    const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
    if (!match) {
      throw new Error('Could not parse YouTube channel initial data.');
    }

    const data = JSON.parse(match[1]);
    const channelTitle = data?.metadata?.channelMetadataRenderer?.title || channelName;
    const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    const selectedTab =
      tabs.find((t) => t?.tabRenderer?.selected) ||
      tabs.find((t) => t?.tabRenderer?.title?.toLowerCase() === tab.toLowerCase());

    const results = [];

    if (tab === 'videos') {
      const contents = selectedTab?.tabRenderer?.content?.richGridRenderer?.contents || [];
      for (const item of contents) {
        const lockup = item?.richItemRenderer?.content?.lockupViewModel;
        if (lockup) {
          const title = lockup.metadata?.lockupMetadataViewModel?.title?.content;
          const metaRows = lockup.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
          const parts = metaRows[0]?.metadataParts || [];
          const views = parts[0]?.text?.content || '';
          const uploaded = parts[1]?.text?.content || '';
          const videoId =
            lockup.contentId ||
            lockup.rendererContext?.commandContext?.onTap?.innertubeCommand?.watchEndpoint?.videoId;
          const label = lockup.rendererContext?.accessibilityContext?.label || '';

          if (title && videoId) {
            results.push({
              title,
              videoId,
              url: `https://www.youtube.com/watch?v=${videoId}`,
              thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              views,
              uploaded,
              label,
            });
          }
        }
      }
    } else if (tab === 'playlists') {
      const contents =
        selectedTab?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.gridRenderer?.items ||
        selectedTab?.tabRenderer?.content?.richGridRenderer?.contents ||
        [];

      for (const item of contents) {
        const lockup = item?.lockupViewModel || item?.gridPlaylistRenderer || item?.richItemRenderer?.content?.lockupViewModel;
        if (lockup) {
          const title =
            lockup.title?.runs?.[0]?.text ||
            lockup.metadata?.lockupMetadataViewModel?.title?.content ||
            lockup.metadata?.title?.content;
          const playlistId = lockup.playlistId || lockup.contentId;
          const videoCount = lockup.videoCountText?.runs?.[0]?.text || lockup.videoCountShortText?.simpleText || '';

          if (title) {
            results.push({
              title,
              playlistId,
              videoCount,
              url: playlistId ? `https://www.youtube.com/playlist?list=${playlistId}` : `${channelUrl}/playlists`,
            });
          }
        }
      }
    }

    return {
      success: true,
      channel: channelTitle,
      channelUrl,
      tab,
      count: results.length,
      items: results.slice(0, 12),
    };
  } catch (err) {
    console.warn(`[YouTubeService] Direct scraping failed for ${channelName} (${tab}), attempting fallback:`, err.message);

    // Fallback using youtube-sr search
    try {
      const searchRes = await YouTube.search(`${channelName} ${tab === 'playlists' ? 'playlist' : ''}`, {
        limit: 8,
        type: tab === 'playlists' ? 'playlist' : 'video',
      });

      const fallbackItems = (searchRes || []).map((v) => ({
        title: v.title,
        videoId: v.id,
        url: v.url || `https://www.youtube.com/watch?v=${v.id}`,
        thumbnail: v.thumbnail?.url || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
        uploaded: v.uploadedAt || '',
        views: v.views ? `${v.views} views` : '',
        duration: v.durationFormatted || '',
      }));

      return {
        success: true,
        channel: channelName,
        tab,
        count: fallbackItems.length,
        items: fallbackItems,
      };
    } catch (fallbackErr) {
      return {
        success: false,
        channel: channelName,
        message: `Could not load ${tab} for "${channelName}": ${fallbackErr.message}`,
        items: [],
      };
    }
  }
}

/**
 * Fetches transcript for a YouTube video with language fallbacks.
 */
export async function getTranscript(videoId) {
  if (!videoId) throw new Error('Video ID is required to fetch transcript.');

  let rawTranscript = null;
  let detectedLang = 'en';

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
 * Generates a full chronological timeline spanning from 00:00 to the video's end.
 */
function buildFullChronologicalTimeline(timedTranscript = []) {
  if (!timedTranscript || timedTranscript.length === 0) return '';

  // If transcript has 40 or fewer items, include every single timestamp
  if (timedTranscript.length <= 40) {
    return timedTranscript.map((t) => `[${t.time}] ${t.text}`).join('\n');
  }

  // Sample evenly across the entire duration so every section from 00:00 to end is represented
  const step = Math.ceil(timedTranscript.length / 35);
  const selected = [];
  for (let i = 0; i < timedTranscript.length; i += step) {
    selected.push(timedTranscript[i]);
  }
  // Guarantee the last timestamp is always included
  const last = timedTranscript[timedTranscript.length - 1];
  if (selected[selected.length - 1] !== last) {
    selected.push(last);
  }

  return selected.map((t) => `[${t.time}] ${t.text}`).join('\n');
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

  // Full chronological timeline covering 00:00 through the conclusion
  const fullTimeline = buildFullChronologicalTimeline(transcriptData.timedTranscript);

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

CHRONOLOGICAL TIMELINE (BEGINNING TO END):
${fullTimeline}

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

/**
 * Unified request handler for all YouTube exploration and transcripts.
 */
export async function handleYouTubeRequest({ action, query, channelName, videoUrlOrId, type = 'latest_videos' }) {
  if (action === 'explore_channel' || type === 'playlists' || type === 'latest_videos') {
    const tab = type === 'playlists' ? 'playlists' : 'videos';
    const channelRes = await fetchChannelTabContent(channelName || query, tab);

    if (channelRes.success && channelRes.items.length > 0) {
      let formattedSummary = `=== YOUTUBE CHANNEL: ${channelRes.channel} (${tab.toUpperCase()}) ===\n`;
      if (tab === 'playlists') {
        formattedSummary += `Found ${channelRes.items.length} Playlists:\n`;
        channelRes.items.forEach((p, idx) => {
          formattedSummary += `${idx + 1}. "${p.title}" ${p.videoCount ? `(${p.videoCount})` : ''} - ${p.url}\n`;
        });
      } else {
        formattedSummary += `Latest Uploads:\n`;
        channelRes.items.forEach((v, idx) => {
          formattedSummary += `${idx + 1}. "${v.title}" (${v.uploaded || 'recent'}${v.views ? ` • ${v.views}` : ''}) - ${v.url}\n`;
        });
      }

      return {
        success: true,
        action: 'explore_channel',
        channel: channelRes.channel,
        tab,
        items: channelRes.items,
        formattedSummary: formattedSummary.trim(),
      };
    }
  }

  // Default to video transcript fetch
  return fetchYouTubeTranscriptAndDetails({ query, channelName, videoUrlOrId });
}
