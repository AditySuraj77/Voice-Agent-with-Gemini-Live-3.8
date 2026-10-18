import { searchEducationalVisual } from './wikimediaService.js';

/**
 * Tavily Web Images Searcher
 * Fetches authentic, high-resolution live web images indexed across the web.
 */
export async function searchTavilyImages(query, { maxResults = 3 } = {}) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return { success: false, message: 'TAVILY_API_KEY is not configured in environment.' };
  }

  const cleanQuery = query.trim();
  console.log(`[VisualSearchService] Searching Tavily web images for: "${cleanQuery}"`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: cleanQuery,
        include_images: true,
        include_image_descriptions: true,
        max_results: Math.max(3, maxResults),
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[VisualSearchService] Tavily API returned HTTP status ${response.status}`);
      return { success: false, message: `Tavily API responded with status ${response.status}` };
    }

    const data = await response.json();
    const rawImages = Array.isArray(data.images) ? data.images : [];
    if (rawImages.length === 0) {
      return { success: false, message: `No web images found for "${cleanQuery}".` };
    }

    const validImages = rawImages
      .map((img) => {
        const url = typeof img === 'string' ? img : img?.url;
        if (!url || typeof url !== 'string' || !url.startsWith('http')) return null;

        let domain = 'Web Search';
        try {
          domain = new URL(url).hostname.replace(/^www\./, '');
        } catch {
          // ignore parsing error
        }

        const title = (typeof img === 'object' && img?.title) || cleanQuery;
        const description = (typeof img === 'object' && img?.description) || title;

        return {
          title,
          imageUrl: url,
          fullImageUrl: url,
          description,
          attribution: domain,
          source: `Web (${domain})`,
        };
      })
      .filter(Boolean);

    if (validImages.length === 0) {
      return { success: false, message: `No valid image URLs found for "${cleanQuery}".` };
    }

    console.log(`[VisualSearchService] Successfully found ${validImages.length} web image(s) for "${cleanQuery}".`);
    return {
      success: true,
      query: cleanQuery,
      selectedImage: validImages[0],
      results: validImages,
    };
  } catch (err) {
    clearTimeout(timeout);
    console.error(`[VisualSearchService] Error fetching Tavily web images:`, err.message);
    return { success: false, message: err.message };
  }
}

/**
 * Universal Visual Search Engine
 * Smart Hybrid Strategy:
 * 1. For Astronomy, Space, Ancient History, and Museum artifacts: tries free, unmetered Wikimedia Commons first (preserves user quota).
 * 2. For Modern Technology, Gadgets, Everyday Objects, and General Web: fetches real web images via Tavily.
 * 3. Graceful Fallback: If primary source returns no images, automatically falls back to secondary source.
 */
export async function searchUniversalVisual(query, { maxResults = 3 } = {}) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('Valid query string is required for visual search.');
  }

  const cleanQuery = query.trim();

  // Detect if query is typical space/astronomy/history domain suitable for Wikimedia
  const isHistoricOrSpace = /\b(planet|space|nasa|esa|orbit|telescope|saturn|jupiter|mars|apollo|galaxy|nebula|monument|ancient|history|pyramid|temple|museum|fossil|skeleton)\b/i.test(cleanQuery);

  if (isHistoricOrSpace) {
    // 1. Try free unmetered Wikimedia Commons first
    try {
      const wikiResult = await searchEducationalVisual(cleanQuery, { maxResults });
      if (wikiResult && wikiResult.success && wikiResult.selectedImage) {
        return wikiResult;
      }
    } catch (e) {
      console.warn('[VisualSearchService] Wikimedia search failed, falling back to Tavily web search:', e.message);
    }
  }

  // 2. Try Tavily Live Web Images (Real Google/Bing crawled photos from internet)
  if (process.env.TAVILY_API_KEY) {
    try {
      const tavilyResult = await searchTavilyImages(cleanQuery, { maxResults });
      if (tavilyResult && tavilyResult.success && tavilyResult.selectedImage) {
        return tavilyResult;
      }
    } catch (e) {
      console.warn('[VisualSearchService] Tavily web image search failed, falling back to Wikimedia:', e.message);
    }
  }

  // 3. Fallback: If not already tried or if Tavily returned no images, try Wikimedia
  if (!isHistoricOrSpace) {
    try {
      const wikiResult = await searchEducationalVisual(cleanQuery, { maxResults });
      if (wikiResult && wikiResult.success && wikiResult.selectedImage) {
        return wikiResult;
      }
    } catch (e) {
      console.warn('[VisualSearchService] Wikimedia fallback search failed:', e.message);
    }
  }

  return {
    success: false,
    query: cleanQuery,
    message: `No visual photographs found across web and educational archives for "${cleanQuery}".`,
    results: [],
  };
}
