/**
 * Wikimedia Commons Educational Visual & Animation Archive Service
 * Fetches high-resolution, peer-reviewed educational photographs, historical maps,
 * museum artifacts, scientific diagrams, and authentic educational animation loops (.gif, .webm, .mp4)
 * directly from Wikimedia Commons API.
 */

const ALLOWED_STATIC_MIMES = new Set(['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']);
const ALLOWED_ANIMATION_MIMES = new Set(['image/gif', 'video/webm', 'video/ogg', 'video/mp4']);

export async function searchEducationalVisual(query, { maxResults = 3 } = {}) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('Valid query string is required for visual archive search.');
  }

  const cleanQuery = query.trim().replace(/^file:/i, '');
  console.log(`[WikimediaService] Searching educational visual archive for: "${cleanQuery}"`);

  try {
    const endpoint = new URL('https://commons.wikimedia.org/w/api.php');
    endpoint.searchParams.set('action', 'query');
    endpoint.searchParams.set('generator', 'search');
    endpoint.searchParams.set('gsrsearch', cleanQuery);
    endpoint.searchParams.set('gsrnamespace', '6'); // File namespace
    endpoint.searchParams.set('gsrlimit', String(Math.max(5, maxResults * 2)));
    endpoint.searchParams.set('prop', 'imageinfo');
    endpoint.searchParams.set('iiprop', 'url|size|mime|extmetadata');
    endpoint.searchParams.set('iiurlwidth', '800'); // Optimized thumbnail width
    endpoint.searchParams.set('format', 'json');
    endpoint.searchParams.set('origin', '*');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(endpoint.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'GeminiVoiceAgent/1.0 (Educational AI Tutor; contact: student-support@aristotle.edu)',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[WikimediaService] Wikimedia API HTTP error: ${response.status}`);
      return {
        success: false,
        error: `Wikimedia API returned status ${response.status}`,
        query: cleanQuery,
      };
    }

    const data = await response.json();
    const rawPages = Object.values(data?.query?.pages || {});

    const validImages = [];
    for (const page of rawPages) {
      const info = page?.imageinfo?.[0];
      if (!info || !info.url) continue;

      const mime = (info.mime || '').toLowerCase();
      if (!ALLOWED_STATIC_MIMES.has(mime)) continue;

      if (info.width && info.width < 250 && info.height && info.height < 250) continue;

      const meta = info.extmetadata || {};
      const rawTitle = (page.title || '').replace(/^File:/i, '').replace(/\.[^/.]+$/, '');
      const cleanTitle = rawTitle.replace(/_/g, ' ').trim();
      const rawDescription = meta.ImageDescription?.value || meta.ObjectName?.value || cleanTitle;
      const cleanDescription = rawDescription.replace(/<[^>]*>/g, '').trim().slice(0, 200);
      const artist = (meta.Artist?.value || 'Wikimedia Contributor').replace(/<[^>]*>/g, '').trim().slice(0, 100);
      const license = meta.LicenseShortName?.value || 'Creative Commons';

      validImages.push({
        title: cleanTitle,
        imageUrl: info.thumburl || info.url,
        fullImageUrl: info.url,
        width: info.thumbwidth || info.width,
        height: info.thumbheight || info.height,
        mime,
        description: cleanDescription,
        attribution: `${artist} (${license})`,
        source: 'Wikimedia Commons',
      });

      if (validImages.length >= maxResults) break;
    }

    if (validImages.length === 0) {
      return {
        success: false,
        query: cleanQuery,
        message: `No high-resolution educational images found for "${cleanQuery}".`,
        results: [],
      };
    }

    return {
      success: true,
      query: cleanQuery,
      selectedImage: validImages[0],
      results: validImages,
    };
  } catch (err) {
    console.error('[WikimediaService] Error executing visual search:', err.message);
    return {
      success: false,
      error: err.message,
      query: cleanQuery,
    };
  }
}

/**
 * Searches specifically for educational animation loops (.gif, .webm, .mp4)
 * from Wikimedia Commons archives. Perfect for biological cycles, mechanical engines,
 * physics wave animations, and real-world scientific processes.
 */
export async function searchEducationalAnimation(query, { maxResults = 3 } = {}) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('Valid query string is required for educational animation search.');
  }

  const rawClean = query.trim().replace(/^file:/i, '');
  const searchQuery = rawClean.toLowerCase().includes('animation') || rawClean.toLowerCase().includes('cycle')
    ? rawClean
    : `${rawClean} animation`;

  console.log(`[WikimediaService] Searching educational animation loops for: "${searchQuery}"`);

  try {
    const endpoint = new URL('https://commons.wikimedia.org/w/api.php');
    endpoint.searchParams.set('action', 'query');
    endpoint.searchParams.set('generator', 'search');
    endpoint.searchParams.set('gsrsearch', searchQuery);
    endpoint.searchParams.set('gsrnamespace', '6'); // File namespace
    endpoint.searchParams.set('gsrlimit', String(Math.max(8, maxResults * 3)));
    endpoint.searchParams.set('prop', 'imageinfo');
    endpoint.searchParams.set('iiprop', 'url|size|mime|extmetadata');
    endpoint.searchParams.set('iiurlwidth', '800');
    endpoint.searchParams.set('format', 'json');
    endpoint.searchParams.set('origin', '*');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    const response = await fetch(endpoint.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'GeminiVoiceAgent/1.0 (Educational AI Tutor; contact: student-support@aristotle.edu)',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[WikimediaService] Wikimedia Animation search HTTP error: ${response.status}`);
      return {
        success: false,
        error: `Wikimedia API returned status ${response.status}`,
        query: rawClean,
      };
    }

    const data = await response.json();
    const rawPages = Object.values(data?.query?.pages || {});

    const validAnimations = [];
    for (const page of rawPages) {
      const info = page?.imageinfo?.[0];
      if (!info || !info.url) continue;

      const mime = (info.mime || '').toLowerCase();
      if (!ALLOWED_ANIMATION_MIMES.has(mime)) continue;

      const meta = info.extmetadata || {};
      const rawTitle = (page.title || '').replace(/^File:/i, '').replace(/\.[^/.]+$/, '');
      const cleanTitle = rawTitle.replace(/_/g, ' ').trim();
      const rawDescription = meta.ImageDescription?.value || meta.ObjectName?.value || cleanTitle;
      const cleanDescription = rawDescription.replace(/<[^>]*>/g, '').trim().slice(0, 200);
      const artist = (meta.Artist?.value || 'Wikimedia Contributor').replace(/<[^>]*>/g, '').trim().slice(0, 100);
      const license = meta.LicenseShortName?.value || 'Creative Commons';

      validAnimations.push({
        title: cleanTitle,
        animationUrl: info.url,
        thumbnailUrl: info.thumburl || info.url,
        mime,
        isVideo: mime.startsWith('video/'),
        isGif: mime === 'image/gif',
        width: info.width || 600,
        height: info.height || 400,
        description: cleanDescription,
        attribution: `${artist} (${license})`,
        source: 'Wikimedia Educational Archives',
      });

      if (validAnimations.length >= maxResults) break;
    }

    if (validAnimations.length === 0) {
      console.log(`[WikimediaService] No animation results found for "${searchQuery}".`);
      return {
        success: false,
        query: rawClean,
        message: `No educational animation loops found for "${rawClean}".`,
        results: [],
      };
    }

    console.log(`[WikimediaService] Found ${validAnimations.length} educational animation(s) for "${rawClean}".`);
    return {
      success: true,
      query: rawClean,
      selectedAnimation: validAnimations[0],
      results: validAnimations,
    };
  } catch (err) {
    console.error('[WikimediaService] Animation search error:', err.message);
    return {
      success: false,
      error: err.message,
      query: rawClean,
    };
  }
}
