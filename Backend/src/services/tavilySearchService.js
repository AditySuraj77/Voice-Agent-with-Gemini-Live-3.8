import dotenv from 'dotenv';
dotenv.config();

/**
 * Tavily Search Service
 * Connects to Tavily API for fast AI-optimized web searches.
 */
export async function searchTavily(query, { maxResults = 3, searchDepth = 'basic' } = {}) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn('[TavilySearchService] TAVILY_API_KEY is not set in environment or .env file.');
    return {
      error: 'TAVILY_API_KEY is not configured on the backend server.',
      formattedResult: 'Web search could not be completed because TAVILY_API_KEY is not configured in the backend .env file. Please ask the administrator to configure TAVILY_API_KEY.',
    };
  }

  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('Valid query string is required for web search.');
  }

  const cleanQuery = query.trim();
  console.log(`[TavilySearchService] Executing Tavily web search for query: "${cleanQuery}" (depth: ${searchDepth})`);

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: cleanQuery,
        search_depth: searchDepth,
        include_answer: true,
        max_results: maxResults,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TavilySearchService] Tavily API error HTTP ${response.status}:`, errorText);
      return {
        error: `Tavily API responded with status ${response.status}`,
        formattedResult: `Web search temporarily failed with status code ${response.status}.`,
      };
    }

    const data = await response.json();

    // Format a clean, concise synthesis for voice generation
    let formattedResult = '';
    if (data.answer) {
      formattedResult += `Direct Summary: ${data.answer}\n\n`;
    }

    if (Array.isArray(data.results) && data.results.length > 0) {
      formattedResult += 'Top Web Findings:\n';
      data.results.slice(0, maxResults).forEach((item, index) => {
        const title = item.title || 'Web Result';
        const snippet = item.content ? item.content.slice(0, 300) : '';
        formattedResult += `${index + 1}. ${title}: ${snippet}\n`;
      });
    }

    if (!formattedResult.trim()) {
      formattedResult = `No detailed web results found for "${cleanQuery}".`;
    }

    console.log(`[TavilySearchService] Search completed successfully for "${cleanQuery}". Found ${data.results?.length || 0} results.`);

    return {
      query: cleanQuery,
      answer: data.answer || null,
      formattedResult: formattedResult.trim(),
      results: data.results || [],
    };
  } catch (err) {
    console.error('[TavilySearchService] Network or execution error:', err);
    return {
      error: err.message,
      formattedResult: `Web search failed due to network error: ${err.message}`,
    };
  }
}
