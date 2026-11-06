import fs from 'fs';
import path from 'path';
import { YouTube } from 'youtube-sr';
import { YoutubeTranscript } from 'youtube-transcript';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyCA5HWPSp6l8NMSSB8aUQyVpVL-9U6UwWo';
const RAW_RAPIDAPI_KEYS = process.env.RAPIDAPI_KEYS || process.env.RAPIDAPI_KEY || '1e00523d58msh29a2a42cd96b5b0p121e78jsn6f4c1eb2f499,75dd0a4250msh0b7f52789bede16p1fd462jsnc017e1e4bff2';
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'youtube-transcripts.p.rapidapi.com';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://txzsfzadovdswkgpyxjp.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_e-SL46duBCgi4Cwl-Uzv_A__n_Bo-Ts';

/**
 * Returns deduplicated array of RapidAPI keys for load-balancing and quota failover.
 */
export function getRapidApiKeys() {
  const keys = RAW_RAPIDAPI_KEYS.split(',').map((k) => k.trim()).filter(Boolean);
  return [...new Set(keys)];
}

// In-memory transcript cache for 1ms lookups
const transcriptMemoryCache = new Map();

// Local disk cache directory for persistence across server restarts
const CACHE_DIR = path.resolve(process.cwd(), '.cache', 'transcripts');
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[YouTubeService] Could not create cache directory:', e.message);
}

function getFromCache(videoId) {
  if (!videoId) return null;
  // 1. In-memory check
  if (transcriptMemoryCache.has(videoId)) {
    return transcriptMemoryCache.get(videoId);
  }
  // 2. Persistent disk check
  try {
    const filePath = path.join(CACHE_DIR, `${videoId}.json`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content);
      transcriptMemoryCache.set(videoId, parsed);
      return parsed;
    }
  } catch (e) {
    // Disk read failed, fallback to network
  }
  return null;
}

function saveToCache(videoId, data) {
  if (!videoId || !data || !data.hasTranscript) return;
  // 1. In-memory save
  transcriptMemoryCache.set(videoId, data);
  // 2. Persistent disk save
  try {
    const filePath = path.join(CACHE_DIR, `${videoId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
  } catch (e) {
    // Disk write failed, ignore
  }
}

/**
 * Reads cached video transcript from Supabase database (Cloud Tier 3).
 */
export async function getFromSupabase(videoId) {
  if (!videoId || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    const url = `${SUPABASE_URL}/rest/v1/video_transcripts?video_id=eq.${videoId}&select=*`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!resp.ok) return null;

    const rows = await resp.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;

    const row = rows[0];
    return {
      success: true,
      hasTranscript: true,
      language: 'en',
      chunkCount: Array.isArray(row.timed_transcript) ? row.timed_transcript.length : 0,
      fullText: row.full_text || '',
      timedTranscript: Array.isArray(row.timed_transcript) ? row.timed_transcript : [],
      timeline: Array.isArray(row.timeline) ? row.timeline : [],
    };
  } catch (err) {
    console.warn('[YouTubeService] Supabase cache read error:', err.message);
    return null;
  }
}

/**
 * Saves fetched video transcript to Supabase database for lifetime persistence.
 */
export async function saveToSupabase(videoId, data, videoInfo = {}) {
  if (!videoId || !data || !data.hasTranscript || !SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  try {
    const payload = {
      video_id: videoId,
      title: videoInfo.title || '',
      channel: videoInfo.channel || '',
      duration: videoInfo.duration || '',
      duration_sec: videoInfo.durationSec || 0,
      timeline: data.timeline || [],
      timed_transcript: data.timedTranscript || [],
      full_text: data.fullText || '',
      updated_at: new Date().toISOString(),
    };

    const url = `${SUPABASE_URL}/rest/v1/video_transcripts`;
    fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(payload),
    }).then(res => {
      if (res.ok) {
        console.log(`[YouTubeService] [SUPABASE SYNC] Successfully persisted ${videoId} to Supabase!`);
      }
    }).catch(err => {
      console.warn('[YouTubeService] Supabase async save failed:', err.message);
    });
  } catch (err) {
    console.warn('[YouTubeService] Supabase cache save error:', err.message);
  }
}

/**
 * Parses ISO 8601 duration (e.g. "PT1H8M1S", "PT15M30S") to human string and total seconds.
 */
export function parseIsoDuration(iso = '') {
  if (!iso || typeof iso !== 'string') return { formatted: '', totalSeconds: 0 };
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return { formatted: '', totalSeconds: 0 };
  const h = parseInt(match[1] || 0, 10);
  const m = parseInt(match[2] || 0, 10);
  const s = parseInt(match[3] || 0, 10);
  const total = h * 3600 + m * 60 + s;
  if (h > 0) {
    return { formatted: `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`, totalSeconds: total };
  }
  return { formatted: `${m}:${String(s).padStart(2, '0')}`, totalSeconds: total };
}

/**
 * Fetches official YouTube video details via YouTube Data API v3.
 * 100% immune to bot-blocking and CAPTCHAs on cloud hosts (Render/AWS).
 */
export async function fetchVideoDetailsWithApi(videoId) {
  if (!videoId || !YOUTUBE_API_KEY) return null;
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn(`[YouTubeService] YouTube Data API returned HTTP ${resp.status}`);
      return null;
    }
    const data = await resp.json();
    const item = data.items?.[0];
    if (!item) return null;

    const durationInfo = parseIsoDuration(item.contentDetails?.duration);
    const thumbnails = item.snippet?.thumbnails;
    const thumbnail =
      thumbnails?.maxres?.url ||
      thumbnails?.standard?.url ||
      thumbnails?.high?.url ||
      thumbnails?.medium?.url ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    return {
      id: videoId,
      title: item.snippet?.title || '',
      channel: item.snippet?.channelTitle || 'YouTube',
      duration: durationInfo.formatted,
      durationSec: durationInfo.totalSeconds,
      thumbnail,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      description: item.snippet?.description || '',
    };
  } catch (err) {
    console.warn(`[YouTubeService] YouTube Data API fetch failed for ${videoId}:`, err.message);
    return null;
  }
}

/**
 * Searches for videos via official YouTube Data API v3.
 */
export async function searchVideoWithApi(query, maxResults = 5) {
  if (!query || !YOUTUBE_API_KEY) return [];
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!Array.isArray(data.items) || data.items.length === 0) return [];

    const videoIds = data.items.map((i) => i.id?.videoId).filter(Boolean);
    if (videoIds.length === 0) return [];

    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds.join(',')}&key=${YOUTUBE_API_KEY}`;
    const detailsResp = await fetch(detailsUrl);
    if (!detailsResp.ok) return [];
    const detailsData = await detailsResp.json();

    return (detailsData.items || []).map((item) => {
      const durationInfo = parseIsoDuration(item.contentDetails?.duration);
      const thumbnails = item.snippet?.thumbnails;
      return {
        id: item.id,
        title: item.snippet?.title || '',
        channel: item.snippet?.channelTitle || 'YouTube',
        duration: durationInfo.formatted,
        durationSec: durationInfo.totalSeconds,
        thumbnail: thumbnails?.high?.url || thumbnails?.medium?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${item.id}`,
        description: item.snippet?.description || '',
      };
    });
  } catch (err) {
    console.warn('[YouTubeService] YouTube Data API search error:', err.message);
    return [];
  }
}

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
export async function fetchChannelTabContent(channelName, tab = 'videos', query = '') {
  const channelUrl = await resolveChannelUrl(channelName);
  if (!channelUrl) {
    throw new Error(`Could not locate YouTube channel "${channelName}".`);
  }

  const targetUrl = `${channelUrl}/${tab}`;
  console.log(`[YouTubeService] Fetching real-time channel ${tab} from: ${targetUrl}${query ? ` (filter: "${query}")` : ''}`);

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

      // Always supplement with targeted direct YouTube search if query given or if channel playlist list is partial
      try {
        const directSearchQuery = query
          ? `${channelName} ${query} playlist`
          : `${channelName} playlist`;
        const directPlaylists = await searchYouTubeDirect(directSearchQuery, 'playlist');
        for (const dp of directPlaylists) {
          if (!results.some((r) => r.playlistId === dp.playlistId || r.title.toLowerCase() === dp.title.toLowerCase())) {
            results.push(dp);
          }
        }
      } catch (e) {
        console.warn('[YouTubeService] Supplementary playlist search failed:', e.message);
      }
    }

    // If query was specified, prioritize items matching query keywords
    let sortedResults = results;
    if (query && query.trim()) {
      const qTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
      sortedResults = [...results].sort((a, b) => {
        const scoreA = qTokens.reduce((acc, tok) => acc + (a.title.toLowerCase().includes(tok) ? 1 : 0), 0);
        const scoreB = qTokens.reduce((acc, tok) => acc + (b.title.toLowerCase().includes(tok) ? 1 : 0), 0);
        return scoreB - scoreA;
      });
    }

    return {
      success: true,
      channel: channelTitle,
      channelUrl,
      tab,
      count: sortedResults.length,
      items: sortedResults.slice(0, 16),
    };
  } catch (err) {
    console.warn(`[YouTubeService] Direct scraping failed for ${channelName} (${tab}), attempting fallback:`, err.message);

    // Fallback using direct search
    try {
      const fallbackSearch = query
        ? `${channelName} ${query} ${tab === 'playlists' ? 'playlist' : ''}`.trim()
        : `${channelName} ${tab === 'playlists' ? 'playlist' : ''}`.trim();
      const directSearchItems = await searchYouTubeDirect(fallbackSearch, tab === 'playlists' ? 'playlist' : 'video');
      if (directSearchItems.length > 0) {
        return {
          success: true,
          channel: channelName,
          tab,
          count: directSearchItems.length,
          items: directSearchItems.slice(0, 12),
        };
      }
    } catch (fbErr) {
      console.warn('[YouTubeService] Fallback direct search failed:', fbErr.message);
    }
  }
}

/**
 * Fetches spoken subtitle transcript via RapidAPI (youtube-transcripts) with multi-key pool failover.
 * Immune to cloud IP bot-detection. Returns parsed transcript cues with ms offsets.
 */
export async function fetchTranscriptFromRapidApi(videoId) {
  if (!videoId) return null;
  const keys = getRapidApiKeys();
  if (keys.length === 0) return null;

  for (let i = 0; i < keys.length; i++) {
    const apiKey = keys[i];
    try {
      const url = `https://${RAPIDAPI_HOST}/youtube/transcript?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`;
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': RAPIDAPI_HOST,
        },
      });

      if (resp.status === 429 || resp.status === 403) {
        console.warn(`[YouTubeService] RapidAPI Key #${i + 1} exhausted/blocked (HTTP ${resp.status}), attempting next key...`);
        continue;
      }

      if (!resp.ok) {
        console.warn(`[YouTubeService] RapidAPI Key #${i + 1} returned HTTP ${resp.status}`);
        continue;
      }

      const data = await resp.json();
      if (!data || !Array.isArray(data.content) || data.content.length === 0) {
        continue;
      }

      const timedTranscript = [];
      const textParts = [];

      for (const item of data.content) {
        const cleanText = (item.text || '').replace(/\n+/g, ' ').trim();
        if (cleanText) {
          timedTranscript.push({
            time: formatTimestamp(item.offset, true),
            offsetMs: typeof item.offset === 'number' ? item.offset : 0,
            text: cleanText,
          });
          textParts.push(cleanText);
        }
      }

      const result = {
        success: true,
        hasTranscript: true,
        language: data.lang || 'en',
        chunkCount: timedTranscript.length,
        fullText: textParts.join(' '),
        timedTranscript,
      };

      // Cache permanently so this video never uses API credits again
      saveToCache(videoId, result);
      return result;
    } catch (err) {
      console.warn(`[YouTubeService] RapidAPI Key #${i + 1} error:`, err.message);
    }
  }

  return null;
}

/**
 * Fetches transcript for a YouTube video with Cache, language fallbacks, and RapidAPI multi-key pool.
 */
export async function getTranscript(videoId) {
  if (!videoId) throw new Error('Video ID is required to fetch transcript.');

  // 0. Persistent & In-Memory Cache Lookup (0ms latency, 0 quota used)
  const cached = getFromCache(videoId);
  if (cached && cached.hasTranscript && cached.timedTranscript?.length > 0) {
    console.log(`[YouTubeService] [LOCAL CACHE HIT] Serving video ${videoId} from local persistent cache (0 API quota used)`);
    return cached;
  }

  // 0.5. Supabase Cloud Database Cache (Permanent across Render restarts, 0 quota used)
  const supabaseCached = await getFromSupabase(videoId);
  if (supabaseCached && supabaseCached.hasTranscript && supabaseCached.timedTranscript?.length > 0) {
    console.log(`[YouTubeService] [SUPABASE CACHE HIT] Serving video ${videoId} from Supabase permanent database (0 API quota used)`);
    saveToCache(videoId, supabaseCached);
    return supabaseCached;
  }

  let rawTranscript = null;
  let detectedLang = 'en';

  const langPreferences = ['en', 'hi', undefined];

  // 1. Try free direct scraper first (works on localhost)
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

  if (rawTranscript && rawTranscript.length > 0) {
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

    const result = {
      success: true,
      hasTranscript: true,
      language: detectedLang,
      chunkCount: timedTranscript.length,
      fullText: textParts.join(' '),
      timedTranscript,
    };

    saveToCache(videoId, result);
    return result;
  }

  // 2. Cloud Fallback: Use RapidAPI multi-key pool with automatic failover
  console.log(`[YouTubeService] Direct scraping failed/blocked, querying RapidAPI multi-key pool for ${videoId}...`);
  const rapidRes = await fetchTranscriptFromRapidApi(videoId);
  if (rapidRes && rapidRes.hasTranscript && rapidRes.timedTranscript.length > 0) {
    console.log(`[YouTubeService] RapidAPI retrieved ${rapidRes.timedTranscript.length} transcript cues successfully!`);
    return rapidRes;
  }

  return {
    success: false,
    hasTranscript: false,
    message: 'Captions/subtitles are disabled or not available for this video.',
    fullText: '',
    timedTranscript: [],
  };
}

/**
 * Direct scraper for YouTube video watch page to retrieve full metadata, duration, description and chapters.
 */
export async function fetchVideoDetailsDirect(videoId) {
  if (!videoId) return null;
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();

    const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});(?:var|\s*<\/script>)/);
    if (playerMatch) {
      const data = JSON.parse(playerMatch[1]);
      const details = data?.videoDetails;
      if (details) {
        const lengthSec = parseInt(details.lengthSeconds || '0', 10);
        return {
          id: videoId,
          title: details.title || '',
          channel: details.author || 'YouTube',
          duration: formatTimestamp(lengthSec, false),
          durationSec: lengthSec,
          thumbnail: details.thumbnail?.thumbnails?.[details.thumbnail.thumbnails.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          description: details.shortDescription || '',
        };
      }
    }
  } catch (err) {
    console.warn(`[YouTubeService] Direct video watch page fetch failed for ${videoId}:`, err.message);
  }
  return null;
}

/**
 * Direct scraper for YouTube search results page (both videos and playlists).
 */
export async function searchYouTubeDirect(query, type = 'video') {
  if (!query) return [];
  try {
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) return [];
    const html = await res.text();

    const dataMatch = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
    if (!dataMatch) return [];

    const data = JSON.parse(dataMatch[1]);
    const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    const results = [];

    for (const sec of sections) {
      const items = sec?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        if (type === 'playlist') {
          const p = item?.playlistRenderer;
          if (p && p.playlistId) {
            results.push({
              title: p.title?.simpleText || p.title?.runs?.[0]?.text || 'Playlist',
              playlistId: p.playlistId,
              videoCount: p.videoCountText?.runs?.[0]?.text || p.videoCount || '',
              url: `https://www.youtube.com/playlist?list=${p.playlistId}`,
              thumbnail: p.thumbnails?.[0]?.thumbnails?.[0]?.url || '',
            });
          }
          const lockup = item?.lockupViewModel;
          if (lockup && lockup.contentId?.startsWith('PL')) {
            results.push({
              title: lockup.metadata?.lockupMetadataViewModel?.title?.content || 'Playlist',
              playlistId: lockup.contentId,
              videoCount: '',
              url: `https://www.youtube.com/playlist?list=${lockup.contentId}`,
              thumbnail: '',
            });
          }
        } else {
          const v = item?.videoRenderer;
          if (v && v.videoId) {
            results.push({
              id: v.videoId,
              title: v.title?.runs?.[0]?.text || '',
              channel: v.ownerText?.runs?.[0]?.text || '',
              duration: v.lengthText?.simpleText || '',
              thumbnail: v.thumbnail?.thumbnails?.[v.thumbnail.thumbnails.length - 1]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
              url: `https://www.youtube.com/watch?v=${v.videoId}`,
              description: v.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map((r) => r.text).join('') || '',
            });
          }
        }
      }
    }
    return results;
  } catch (err) {
    console.warn(`[YouTubeService] Direct search scraping failed for "${query}":`, err.message);
    return [];
  }
}

/**
 * Searches for a video by query, channel, or direct URL with multi-layer fallback.
 */
export async function searchYouTubeVideo(query, channelName = '') {
  const directId = extractVideoId(query);
  if (directId) {
    // 1. Primary: Official YouTube Data API v3 (fastest, 100% immune to bot-blocking)
    const apiDetails = await fetchVideoDetailsWithApi(directId);
    if (apiDetails && apiDetails.title) {
      console.log(`[YouTubeService] YouTube Data API v3 resolved details for: ${directId}`);
      return apiDetails;
    }

    // 2. Direct watch page scrape fallback
    const directDetails = await fetchVideoDetailsDirect(directId);
    if (directDetails && directDetails.title) {
      return directDetails;
    }

    // 3. Fallback to youtube-sr
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
          description: v.description || '',
        };
      }
    } catch (e) {
      console.warn('[YouTubeService] Fallback video fetch failed, continuing with ID:', e.message);
    }

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

  let fullQuery = query || '';
  if (channelName && !fullQuery.toLowerCase().includes(channelName.toLowerCase())) {
    fullQuery = `${channelName} ${fullQuery}`.trim();
  }

  console.log(`[YouTubeService] Searching YouTube for query: "${fullQuery}"`);

  // 1. Primary: Official YouTube Data API v3 search
  try {
    const apiResults = await searchVideoWithApi(fullQuery, 3);
    if (apiResults && apiResults.length > 0) {
      console.log(`[YouTubeService] YouTube Data API v3 found ${apiResults.length} videos for "${fullQuery}"`);
      return apiResults[0];
    }
  } catch (apiErr) {
    console.warn('[YouTubeService] YouTube Data API search failed, falling back:', apiErr.message);
  }

  // 2. Direct YouTube search scraping
  try {
    const directResults = await searchYouTubeDirect(fullQuery, 'video');
    if (directResults && directResults.length > 0) {
      const best = directResults[0];
      // Fetch full video watch page details to ensure 100% description chapters are present
      const fullDetails = await fetchVideoDetailsDirect(best.id);
      if (fullDetails) {
        return fullDetails;
      }
      return best;
    }
  } catch (directSearchErr) {
    console.warn('[YouTubeService] Direct search scraping failed, trying youtube-sr:', directSearchErr.message);
  }

  // 3. Fallback: youtube-sr library with try/catch
  try {
    const results = await YouTube.search(fullQuery, { limit: 3, type: 'video' });
    if (results && results.length > 0) {
      const best = results[0];
      const fullDetails = await fetchVideoDetailsDirect(best.id);
      if (fullDetails) {
        return fullDetails;
      }
      return {
        id: best.id,
        title: best.title,
        channel: best.channel?.name || channelName || 'YouTube',
        duration: best.durationFormatted || '',
        thumbnail: best.thumbnail?.url || `https://i.ytimg.com/vi/${best.id}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${best.id}`,
        description: best.description || '',
      };
    }
  } catch (srErr) {
    console.warn('[YouTubeService] youtube-sr search failed:', srErr.message);
  }

  return null;
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

  const durationSec = video.durationSec || parseTimestampToSeconds(video.duration);
  const transcriptData = await getTranscript(video.id);

  if (!transcriptData.hasTranscript) {
    // Official Chapter Roadmap Fallback: Extract creator's chapters from description
    const descChapters = parseDescriptionChapters(video.description, durationSec);
    if (descChapters.length >= 2) {
      console.log(`[YouTubeService] Direct captions unavailable, but extracted ${descChapters.length} official chapters from description for ${video.id}`);
      const timeline = descChapters.map((ch, idx) => ({
        index: idx + 1,
        start: ch.timeStr,
        end: formatTimestamp(ch.endSec),
        startSec: ch.sec,
        endSec: ch.endSec,
        timeRange: `${ch.timeStr} - ${formatTimestamp(ch.endSec)}`,
        topic: ch.title,
        text: `Chapter ${idx + 1}: ${ch.title}`,
        preview: `Official Chapter: ${ch.title}`,
        isOfficialChapter: true,
      }));

      const roadmapLines = timeline.map(
        (ch) => `${ch.index}. [${ch.timeRange}] "${ch.topic}"`
      );

      const formattedSummary = `
=== YOUTUBE VIDEO RETRIEVED (OFFICIAL CHAPTER ROADMAP) ===
Title: "${video.title}"
Channel: ${video.channel}
Duration: ${video.duration || 'N/A'}
URL: ${video.url}
Thumbnail: ${video.thumbnail}

=== COMPLETE CHRONOLOGICAL ROADMAP (${timeline.length} CHAPTERS) ===
${roadmapLines.join('\n')}

=== SMART GROUNDING & MENTOR TEACHING DIRECTIVE ===
1. All chapters above are currently posted onto the student's Whiteboard roadmap.
2. Guide the student through these timestamps and topics step by step.
`.trim();

      return {
        success: true,
        video,
        hasTranscript: true,
        language: 'en',
        timeline,
        formattedSummary,
        fullText: video.description || '',
        timedTranscript: [],
      };
    }

    return {
      success: true,
      video,
      hasTranscript: false,
      message: `Found video "${video.title}" (${video.url}) by ${video.channel}, but no subtitles/captions are available for it.`,
      formattedSummary: `Video: "${video.title}" by ${video.channel} (${video.url})\nNote: Subtitles are disabled by the creator for this video.`,
    };
  }

  // Full chronological timeline covering 00:00 through the conclusion
  const timeline = buildTranscriptTimeblocks(
    transcriptData.timedTranscript,
    durationSec,
    video.description || ''
  );

  // Sync to Supabase so this video is permanently saved in cloud database for all students
  saveToSupabase(video.id, {
    hasTranscript: true,
    timeline,
    timedTranscript: transcriptData.timedTranscript,
    fullText: transcriptData.fullText,
  }, video);

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

=== SMART GROUNDING & MENTOR TEACHING DIRECTIVE ===
1. All chapters above are currently posted onto the student's Whiteboard roadmap.
2. FACTUAL GROUNDING: When explaining what is in the video or specific chapters, faithfully explain the creator's actual dialogue, concepts, and context from the transcript without fabricating fake facts or false claims. Mention the timestamp range you are explaining (e.g. "Dekho [${timeline[0]?.timeRange || '00:00'}] me speaker kehta hai...").
3. MENTOR OPINION & REAL-WORLD LIFE APPLICATION: When the student asks for your opinion ("Tum kya sochte ho?"), key takeaways ("Main isse kya seekhun?"), practical application ("Isko life ya career me kaise use karein?"), or real-world examples: freely use your full LLM intelligence, reasoning, and broad real-world knowledge to provide deep, actionable insights, practical frameworks, and relatable analogies like a true mentor!
4. Guide the student through these timestamps and takeaways step by step.
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
export async function handleYouTubeRequest({ action, query, channelName, videoUrlOrId, type }) {
  if (action === 'explore_channel' || action === 'channel' || type === 'playlists' || type === 'channel_videos') {
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
