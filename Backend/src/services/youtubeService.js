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
 * Formats seconds into mm:ss or hh:mm:ss string.
 * @param {number} val - Time in seconds (or ms if isMs is true)
 * @param {boolean} isMs - Whether val is in milliseconds
 */
export function formatTimestamp(val = 0, isMs = false) {
  if (typeof val !== 'number' || isNaN(val)) return '00:00';
  const totalSeconds = Math.max(0, Math.floor(isMs ? val / 1000 : val));
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
    const timeStr = formatTimestamp(item.offset, true);
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
 * Parses timestamp string "hh:mm:ss" or "mm:ss" into total seconds.
 */
export function parseTimestampToSeconds(tsStr = '') {
  if (!tsStr || typeof tsStr !== 'string') return 0;
  const parts = tsStr.trim().split(':').map((p) => parseInt(p, 10));
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
}

/**
 * Parses creator chapter timestamps from video description if present.
 */
export function parseDescriptionChapters(description = '', durationSec = 0) {
  if (!description || typeof description !== 'string') return [];
  const regex = /(?:^|\n)\s*(?:\[|\()?(\d{1,2}:\d{2}(?::\d{2})?)(?:\]|\))?\s*[-–—:]?\s*([^\n\r]+)/g;
  const chapters = [];
  let match;
  while ((match = regex.exec(description)) !== null) {
    const timeStr = match[1];
    const rawTitle = match[2].trim().replace(/^[-–—:]\s*/, '');
    const sec = parseTimestampToSeconds(timeStr);
    if (rawTitle && rawTitle.length >= 2 && !chapters.some((c) => c.sec === sec)) {
      chapters.push({ sec, timeStr, title: rawTitle });
    }
  }

  chapters.sort((a, b) => a.sec - b.sec);
  if (chapters.length < 3) return [];

  // Align first chapter to 0 if close to beginning
  if (chapters[0].sec > 0 && chapters[0].sec <= 15) {
    chapters[0].sec = 0;
    chapters[0].timeStr = '00:00';
  }

  for (let i = 0; i < chapters.length; i++) {
    const next = chapters[i + 1];
    chapters[i].endSec = next ? next.sec : (durationSec || chapters[i].sec + 180);
  }

  return chapters;
}

/**
 * Builds continuous chronological chapters / timeblocks covering 100% of the video duration.
 * Works seamlessly for short clips (3-5 min) up to multi-hour lectures (10+ hours).
 */
export function buildTranscriptTimeblocks(timedTranscript = [], durationSec = 0, description = '') {
  if (!timedTranscript || timedTranscript.length === 0) return [];

  const lastChunk = timedTranscript[timedTranscript.length - 1];
  const lastChunkEndSec = lastChunk ? Math.ceil((lastChunk.offsetMs + 3000) / 1000) : 0;
  const totalDuration = Math.max(durationSec, lastChunkEndSec, 30);

  // Check if creator provided explicit chapters in video description
  const descChapters = parseDescriptionChapters(description, totalDuration);

  if (descChapters.length >= 3) {
    const result = [];
    descChapters.forEach((ch, idx) => {
      const startMs = ch.sec * 1000;
      const endMs = ch.endSec * 1000;
      const items = timedTranscript.filter(
        (t) => t.offsetMs >= startMs && (idx === descChapters.length - 1 ? true : t.offsetMs < endMs)
      );
      const text = items.map((i) => i.text).join(' ').trim();
      const timeRange = `${ch.timeStr} - ${formatTimestamp(ch.endSec)}`;

      result.push({
        index: idx + 1,
        start: ch.timeStr,
        end: formatTimestamp(ch.endSec),
        startSec: ch.sec,
        endSec: ch.endSec,
        timeRange,
        topic: ch.title,
        text: text || '(No spoken dialogue in this chapter)',
        preview: text.slice(0, 150) + (text.length > 150 ? '...' : ''),
        isOfficialChapter: true,
      });
    });
    return result;
  }

  // Dynamic interval segmentation covering 100% of video duration from 00:00 to end
  let intervalSec = 60;
  if (totalDuration <= 300) {
    intervalSec = 30; // 5 min or less: 30s blocks
  } else if (totalDuration <= 900) {
    intervalSec = 60; // 5-15 min: 1 min blocks
  } else if (totalDuration <= 1800) {
    intervalSec = 90; // 15-30 min: 1.5 min blocks
  } else if (totalDuration <= 3600) {
    intervalSec = 150; // 30-60 min: 2.5 min blocks
  } else if (totalDuration <= 7200) {
    intervalSec = 240; // 1-2 hours: 4 min blocks
  } else if (totalDuration <= 18000) {
    intervalSec = 420; // 2-5 hours: 7 min blocks
  } else {
    intervalSec = 600; // 5-10+ hours: 10 min blocks
  }

  const result = [];
  let currentStartSec = 0;
  let chapterIndex = 1;

  while (currentStartSec < totalDuration) {
    const currentEndSec = Math.min(currentStartSec + intervalSec, totalDuration);
    const startMs = currentStartSec * 1000;
    const endMs = currentEndSec * 1000;

    const items = timedTranscript.filter(
      (t) => t.offsetMs >= startMs && (currentEndSec >= totalDuration ? true : t.offsetMs < endMs)
    );

    const aggregatedText = items.map((i) => i.text).join(' ').trim();
    const startStr = formatTimestamp(currentStartSec);
    const endStr = formatTimestamp(currentEndSec);

    let topic = `Section ${chapterIndex}: ${startStr}`;
    if (aggregatedText) {
      const sentences = aggregatedText.split(/(?<=[.?!])\s+/);
      const firstSentence = (sentences[0] || '').replace(/^(okay|so|well|um|uh|right|now|and|today|hey guys)[,\s]+/i, '').trim();
      if (firstSentence.length >= 8) {
        const words = firstSentence.split(/\s+/).slice(0, 9).join(' ');
        topic = words.charAt(0).toUpperCase() + words.slice(1);
      }
    }

    result.push({
      index: chapterIndex,
      start: startStr,
      end: endStr,
      startSec: currentStartSec,
      endSec: currentEndSec,
      timeRange: `${startStr} - ${endStr}`,
      topic,
      text: aggregatedText || '(Instrumental or visual demonstration)',
      preview: aggregatedText.slice(0, 150) + (aggregatedText.length > 150 ? '...' : ''),
      isOfficialChapter: false,
    });

    chapterIndex++;
    currentStartSec = currentEndSec;
  }

  return result;
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

  // Parse duration seconds from formatted duration (e.g. "19:05")
  const durationSec = parseTimestampToSeconds(video.duration);

  // Full chronological timeline covering 00:00 through the conclusion
  const timeline = buildTranscriptTimeblocks(
    transcriptData.timedTranscript,
    durationSec,
    video.description || ''
  );

  // Formatted chronological roadmap for Gemini Live
  const roadmapLines = timeline.map(
    (ch) => `${ch.index}. [${ch.timeRange}] "${ch.topic}"\n   Transcript Dialogue: "${ch.preview}"`
  );

  const formattedSummary = `
=== YOUTUBE VIDEO RETRIEVED ===
Title: "${video.title}"
Channel: ${video.channel}
Duration: ${video.duration || 'N/A'}
URL: ${video.url}
Thumbnail: ${video.thumbnail}

=== COMPLETE CHRONOLOGICAL ROADMAP (100% COVERAGE FROM 00:00 TO END) ===
${roadmapLines.join('\n')}

=== STRICT ZERO-HALLUCINATION TEACHING DIRECTIVE ===
1. All chapters above are currently posted onto the student's Whiteboard roadmap.
2. When explaining any timestamp or chapter, speak strictly and exclusively using the creator's dialogue and concepts from the transcript. Do NOT hallucinate external facts or speculate outside this video!
3. Mention the specific timestamp range you are explaining (e.g. "Ab dekho [${timeline[0]?.timeRange || '00:00'}] me speaker kehta hai...").
4. Guide the student through these timestamps step by step.
`.trim();

  return {
    success: true,
    video,
    hasTranscript: true,
    language: transcriptData.language,
    timeline,
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
