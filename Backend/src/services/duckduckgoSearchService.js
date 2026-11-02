import { searchTavily } from './tavilySearchService.js';

/**
 * In-memory cache for recent search queries to avoid repetitive network calls
 * and eliminate rate-limit risks on identical queries.
 */
class SearchCache {
  constructor(maxSize = 100, ttlMs = 10 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key) {
    const cleanKey = key.trim().toLowerCase();
    const entry = this.cache.get(cleanKey);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(cleanKey);
      return null;
    }
    return entry.value;
  }

  set(key, value) {
    const cleanKey = key.trim().toLowerCase();
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(cleanKey, {
      value,
      expiry: Date.now() + this.ttlMs,
    });
  }
}

const memoryCache = new SearchCache();

/**
 * Fetches real-time search results directly from DuckDuckGo's lightweight HTML endpoint.
 * Bypasses bot filters using standard browser headers, runs in < 400ms, and costs 0 credits.
 */
async function fetchDuckDuckGoHtml(cleanQuery, maxResults = 3, timeoutMs = 2500) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const params = new URLSearchParams({ q: cleanQuery });
    const response = await fetch('https://html.duckduckgo.com/html/', {
      method: 'POST',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      body: params.toString(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`DuckDuckGo HTML endpoint returned HTTP status ${response.status}`);
    }

    const html = await response.text();
    const results = [];
    const resultBlocks = html.split(/class="[^"]*result\s+results_links/i);

    const clean = (s) =>
      (s || '')
        .replace(/<[^>]+>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();

    for (let i = 1; i < resultBlocks.length; i++) {
      if (results.length >= maxResults) break;

      const block = resultBlocks[i];
      const titleMatch = block.match(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
      const snippetMatch = block.match(/<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
      const urlMatch =
        block.match(/<a[^>]*class="[^"]*result__url[^"]*"[^>]*href="([^"]*)"/i) ||
        block.match(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"/i);

      const title = clean(titleMatch ? titleMatch[1] : '');
      const snippet = clean(snippetMatch ? snippetMatch[1] : '');
      const rawUrl = urlMatch ? urlMatch[1] : '';

      // Skip sponsored/ad links or empty blocks
      if (snippet && title) {
        results.push({
          title,
          snippet,
          content: snippet,
          url: rawUrl,
        });
      }
    }

    return results;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Secondary DuckDuckGo fallback via npm `duck-duck-scrape` package (if HTML parser encountered unexpected DOM)
 */
async function fetchDuckDuckGoScrapePkg(cleanQuery, maxResults = 3, timeoutMs = 2500) {
  const ddgModule = await import('duck-duck-scrape').catch(() => null);
  if (!ddgModule || !ddgModule.search) {
    throw new Error('duck-duck-scrape package unavailable');
  }

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('duck-duck-scrape timeout')), timeoutMs)
  );

  const searchPromise = ddgModule.search(cleanQuery, {
    safeSearch: ddgModule.SafeSearchType?.MODERATE || 0,
  });

  const res = await Promise.race([searchPromise, timeoutPromise]);
  if (!res || !Array.isArray(res.results)) {
    throw new Error('No valid results array from duck-duck-scrape');
  }

  return res.results.slice(0, maxResults).map((r) => ({
    title: r.title || 'Web Result',
    snippet: r.description || '',
    content: r.description || '',
    url: r.url || '',
  }));
}

/**
 * Unified Search with DuckDuckGo as Primary and Tavily as Silent Fallback.
 * 
 * Flow:
 * 1. If process.env.SEARCH_PROVIDER === 'tavily' -> Direct Tavily (Instant Rollback)
 * 2. Check In-Memory Cache (0ms hit)
 * 3. Try DuckDuckGo HTML Endpoint (timeout: 2.2s)
 * 4. Try DuckDuckGo Scrape Package
 * 5. If all DDG steps fail or return empty -> Fallback silently to Tavily API
 */
export async function searchUnified(query, { maxResults = 3, searchDepth = 'basic' } = {}) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('Valid query string is required for web search.');
  }

  const cleanQuery = query.trim();
  const provider = (process.env.SEARCH_PROVIDER || 'duckduckgo').toLowerCase().trim();

  // Instant Rollback: If user configured SEARCH_PROVIDER=tavily, bypass DuckDuckGo entirely
  if (provider === 'tavily') {
    console.log(`[UnifiedSearch] SEARCH_PROVIDER=tavily configured. Directing query to Tavily API: "${cleanQuery}"`);
    return searchTavily(cleanQuery, { maxResults, searchDepth });
  }

  // 1. Check in-memory cache
  const cached = memoryCache.get(cleanQuery);
  if (cached) {
    console.log(`[UnifiedSearch] Cache hit for "${cleanQuery}". Returning 0ms cached search results.`);
    return {
      ...cached,
      source: 'duckduckgo_cached',
    };
  }

  console.log(`[UnifiedSearch] Querying DuckDuckGo (Primary) for: "${cleanQuery}"...`);

  let ddgResults = [];
  let ddgError = null;

  // 2. Try DuckDuckGo HTML Endpoint (High-speed, 0 credit, realistic browser header)
  try {
    ddgResults = await fetchDuckDuckGoHtml(cleanQuery, maxResults, 2200);
  } catch (err) {
    ddgError = err;
    console.warn(`[UnifiedSearch] DDG HTML fetch warning (${err.message}). Trying duck-duck-scrape fallback...`);
  }

  // 3. If HTML endpoint returned 0 results or threw, try npm package
  if ((!ddgResults || ddgResults.length === 0) && !ddgError?.name?.includes('Abort')) {
    try {
      ddgResults = await fetchDuckDuckGoScrapePkg(cleanQuery, maxResults, 1800);
    } catch (pkgErr) {
      console.warn(`[UnifiedSearch] DDG package fetch warning (${pkgErr.message}).`);
    }
  }

  // 4. If DuckDuckGo successfully returned findings:
  if (Array.isArray(ddgResults) && ddgResults.length > 0) {
    console.log(`[UnifiedSearch] DuckDuckGo returned ${ddgResults.length} real-time results (0 Tavily credits used).`);

    let formattedResult = 'Top Web Findings (DuckDuckGo Live Search):\n';
    ddgResults.forEach((item, index) => {
      formattedResult += `${index + 1}. ${item.title}: ${item.snippet}\n`;
    });

    const outputPayload = {
      query: cleanQuery,
      answer: ddgResults[0]?.snippet || null,
      formattedResult: formattedResult.trim(),
      results: ddgResults,
      source: 'duckduckgo',
    };

    // Cache valid result
    memoryCache.set(cleanQuery, outputPayload);
    return outputPayload;
  }

  // 5. Silent Fallback to Tavily (if DDG failed, timed out, or returned empty)
  console.warn(`[UnifiedSearch] DuckDuckGo yielded no results or encountered block. Falling back silently to Tavily API for "${cleanQuery}"...`);
  try {
    const tavilyResult = await searchTavily(cleanQuery, { maxResults, searchDepth });
    return {
      ...tavilyResult,
      source: 'tavily_fallback',
    };
  } catch (tavilyErr) {
    console.error(`[UnifiedSearch] Both DuckDuckGo and Tavily failed:`, tavilyErr.message);
    return {
      error: 'Web search failed across all providers',
      formattedResult: `Web search could not retrieve results for "${cleanQuery}".`,
    };
  }
}
