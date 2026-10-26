import { chromium } from 'playwright';

/**
 * BLOCKED_DOMAINS for ad, tracker, and heavy media aborting.
 */
const BLOCKED_DOMAINS = [
  'google-analytics.com',
  'doubleclick.net',
  'googletagmanager.com',
  'facebook.net',
  'scorecardresearch.com',
  'criteo.com',
  'outbrain.com',
  'taboola.com',
  'adnxs.com',
  'quantserve.com',
];

/**
 * Isolated Per-User Browser Session
 * Holds independent Playwright BrowserContext, Page, cookies, Set-of-Marks, and state.
 */
class UserBrowserSession {
  constructor(sessionId, context, page) {
    this.sessionId = sessionId;
    this.context = context;
    this.page = page;
    this.activeUrl = 'about:blank';
    this.pageTitle = 'Aristotle Live Browser';
    this.lastScreenshot = null;
    this.lastAction = null;
    this.isReaderMode = false;
    this.canGoBack = false;
    this.canGoForward = false;
    this.showSoMBadges = false;
    this.somMap = new Map(); // elementId -> { id, x, y, width, height, tag, text }
    this.lastActiveAt = Date.now();
  }

  touch() {
    this.lastActiveAt = Date.now();
  }

  async close() {
    try {
      this.somMap.clear();
      if (this.page && !this.page.isClosed()) {
        await this.page.close().catch(() => {});
      }
      if (this.context) {
        await this.context.close().catch(() => {});
      }
    } catch (_) {}
  }
}

/**
 * High-Performance Autonomous Multi-Tenant Browser Service
 * Architecture:
 * - Shared, ultra-optimized Chromium engine for minimal CPU/RAM footprint
 * - True Zero-Bleed Multi-Tenancy: Each user receives an isolated BrowserContext (incognito profile)
 * - Independent cookies, localStorage, session history, and viewport per user session
 * - Per-user idle garbage collector (auto-destroys inactive user tabs after 2.5 minutes)
 * - Global browser auto-sleep when 0 active user sessions remain for 3.5 minutes
 * - Server protection capacity cap: Limits max concurrent user tabs to prevent OOM
 */
class BrowserService {
  constructor() {
    this.browser = null;
    this.initPromise = null;
    this.isSleeping = false;

    // Multi-tenant session store: sessionId -> UserBrowserSession
    this.sessions = new Map();
    this.maxConcurrentSessions = 25; // Capacity guard to protect cloud server RAM
    this.sessionIdleTimeoutMs = 2.5 * 60 * 1000; // 2.5 minutes inactivity per user
    this.browserSleepTimeoutMs = 3.5 * 60 * 1000; // 3.5 minutes idle with 0 users puts browser to sleep

    this.sleepTimer = null;
    this.janitorInterval = null;

    this.startJanitor();
  }

  /**
   * Periodic background garbage collector that frees inactive user tabs to release RAM.
   */
  startJanitor() {
    if (this.janitorInterval) return;
    this.janitorInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 45000); // Check every 45 seconds
  }

  async cleanupInactiveSessions() {
    const now = Date.now();
    for (const [sid, session] of this.sessions.entries()) {
      if (now - session.lastActiveAt > this.sessionIdleTimeoutMs) {
        console.log(`[BrowserService] 💤 Inactive session "${sid}" timed out (2.5m idle). Releasing isolated user tab.`);
        await session.close();
        this.sessions.delete(sid);
      }
    }

    if (this.sessions.size === 0 && this.browser && !this.isSleeping && !this.sleepTimer) {
      this.sleepTimer = setTimeout(() => {
        if (this.sessions.size === 0) {
          this.sleep();
        }
      }, this.browserSleepTimeoutMs);
    }
  }

  /**
   * Puts Chromium process to sleep when no active sessions remain.
   */
  async sleep() {
    if (!this.browser || this.isSleeping) return;
    console.log('[BrowserService] 💤 All sessions idle. Putting Chromium engine to sleep to release system RAM...');
    this.isSleeping = true;
    try {
      for (const session of this.sessions.values()) {
        await session.close();
      }
      this.sessions.clear();

      if (this.browser) {
        await this.browser.close().catch(() => {});
        this.browser = null;
      }
      this.initPromise = null;
      console.log('[BrowserService] ✅ Chromium RAM completely released. System sleeping quietly.');
    } catch (e) {
      console.warn('[BrowserService] Error during auto-sleep:', e.message);
    }
  }

  /**
   * Ensures the shared Chromium engine is initialized with high-performance flags.
   */
  async initBrowser() {
    if (this.sleepTimer) {
      clearTimeout(this.sleepTimer);
      this.sleepTimer = null;
    }

    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      console.log('[BrowserService] 🚀 Launching high-performance shared Chromium engine...');
      try {
        this.browser = await chromium.launch({
          headless: true,
          args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--mute-audio',
            '--blink-settings=imagesEnabled=true',
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-default-apps',
            '--disable-sync',
          ],
        });

        this.isSleeping = false;
        console.log('[BrowserService] Shared Chromium engine initialized.');
        return this.browser;
      } catch (err) {
        console.error('[BrowserService] Failed to launch Chromium engine:', err);
        this.initPromise = null;
        throw err;
      }
    })();

    return this.initPromise;
  }

  /**
   * Retrieves or creates an isolated UserBrowserSession for the given sessionId.
   * @param {string} sessionId
   * @returns {Promise<UserBrowserSession>}
   */
  async getOrCreateSession(sessionId = 'default') {
    const cleanId = (sessionId || 'default').toString().trim().slice(0, 64);
    await this.initBrowser();

    if (this.sleepTimer) {
      clearTimeout(this.sleepTimer);
      this.sleepTimer = null;
    }

    // Check if active user session already exists
    const existing = this.sessions.get(cleanId);
    if (existing && existing.page && !existing.page.isClosed()) {
      existing.touch();
      return existing;
    }

    // If existing session had a closed page, clean it up
    if (existing) {
      await existing.close();
      this.sessions.delete(cleanId);
    }

    // Capacity guard: If max concurrent sessions reached, close oldest session
    if (this.sessions.size >= this.maxConcurrentSessions) {
      let oldestId = null;
      let oldestTime = Infinity;
      for (const [sid, sess] of this.sessions.entries()) {
        if (sess.lastActiveAt < oldestTime) {
          oldestTime = sess.lastActiveAt;
          oldestId = sid;
        }
      }
      if (oldestId) {
        console.log(`[BrowserService] Capacity cap (${this.maxConcurrentSessions}) reached. Pruning oldest session "${oldestId}"...`);
        const oldSess = this.sessions.get(oldestId);
        await oldSess?.close();
        this.sessions.delete(oldestId);
      }
    }

    console.log(`[BrowserService] ⚡ Creating isolated multi-tenant BrowserContext for session "${cleanId}"...`);
    const context = await this.browser.newContext({
      viewport: { width: 960, height: 540 },
      deviceScaleFactor: 1,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 AristotleLive/1.0',
    });

    // Request interception for extreme speed: Block trackers, ads, heavy media streams
    await context.route('**/*', (route) => {
      const req = route.request();
      const resourceType = req.resourceType();
      const url = req.url();

      if (['media', 'font', 'websocket'].includes(resourceType)) {
        return route.abort();
      }

      if (BLOCKED_DOMAINS.some((domain) => url.includes(domain))) {
        return route.fulfill({ status: 204, body: '' });
      }

      return route.continue();
    });

    const page = await context.newPage();

    const userSession = new UserBrowserSession(cleanId, context, page);

    // Track navigation events on user's page
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        userSession.activeUrl = page.url();
      }
    });

    page.on('load', async () => {
      try {
        userSession.pageTitle = await page.title();
        userSession.activeUrl = page.url();
      } catch (_) {}
    });

    // Default clean placeholder page
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              margin: 0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #0a0f1d;
              color: #94a3b8;
            }
            .card {
              text-align: center;
              padding: 2rem 2.5rem;
              border: 1px solid #1e293b;
              border-radius: 16px;
              background: #111827;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
            }
            h1 { color: #f8fafc; font-size: 1.4rem; margin-bottom: 0.4rem; font-weight: 700; }
            p { font-size: 0.85rem; margin: 0; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>🌐 Aristotle Live Browser</h1>
            <p>Private & Isolated Voice-Guided Autonomous Web Session</p>
          </div>
        </body>
      </html>
    `);

    await this.captureScreenshot(userSession);
    this.sessions.set(cleanId, userSession);
    return userSession;
  }

  /**
   * Applies Set-of-Marks (SoM) Numbered Badges to user's page.
   */
  async applySetOfMarks(session) {
    if (!session || !session.page || session.page.isClosed()) return [];
    try {
      const elements = await session.page.evaluate(() => {
        document.querySelectorAll('.aristotle-som-badge').forEach((el) => el.remove());
        const candidates = Array.from(
          document.querySelectorAll('a, button, input, textarea, select, [role="button"], [onclick], [tabindex="0"]')
        );

        const results = [];
        let idCounter = 1;

        for (const el of candidates) {
          if (idCounter > 50) break;
          const rect = el.getBoundingClientRect();
          if (
            rect.width >= 10 &&
            rect.height >= 10 &&
            rect.bottom > 0 &&
            rect.top < 540 &&
            rect.right > 0 &&
            rect.left < 960
          ) {
            const computedStyle = window.getComputedStyle(el);
            if (
              computedStyle.display === 'none' ||
              computedStyle.visibility === 'hidden' ||
              computedStyle.opacity === '0'
            ) {
              continue;
            }

            const badgeId = idCounter++;
            const badge = document.createElement('div');
            badge.className = 'aristotle-som-badge';
            badge.innerText = `${badgeId}`;
            badge.style.position = 'absolute';
            badge.style.left = `${Math.max(0, rect.left + window.scrollX)}px`;
            badge.style.top = `${Math.max(0, rect.top + window.scrollY)}px`;
            badge.style.background = '#eab308';
            badge.style.color = '#000000';
            badge.style.fontWeight = '900';
            badge.style.fontSize = '10px';
            badge.style.lineHeight = '1';
            badge.style.padding = '2px 4px';
            badge.style.borderRadius = '3px';
            badge.style.border = '1px solid #713f12';
            badge.style.boxShadow = '0 1px 4px rgba(0,0,0,0.5)';
            badge.style.zIndex = '2147483647';
            badge.style.pointerEvents = 'none';
            badge.style.fontFamily = 'monospace';
            document.body.appendChild(badge);

            results.push({
              id: badgeId,
              x: Math.round(rect.left + rect.width / 2),
              y: Math.round(rect.top + rect.height / 2),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              tag: el.tagName.toLowerCase(),
              text: (el.innerText || el.getAttribute('placeholder') || el.getAttribute('aria-label') || '').slice(0, 35).trim(),
            });
          }
        }
        return results;
      });

      session.somMap.clear();
      for (const item of elements) {
        session.somMap.set(item.id, item);
      }
      return elements;
    } catch (e) {
      console.warn('[BrowserService] Error applying Set-of-Marks:', e.message);
      return [];
    }
  }

  async removeSetOfMarks(session) {
    if (!session?.page || session.page.isClosed()) return;
    try {
      await session.page.evaluate(() => {
        document.querySelectorAll('.aristotle-som-badge').forEach((el) => el.remove());
      });
      session.somMap.clear();
    } catch (_) {}
  }

  async toggleSoM(enabled, sessionId = 'default') {
    const session = await this.getOrCreateSession(sessionId);
    session.showSoMBadges = enabled !== undefined ? !!enabled : !session.showSoMBadges;

    if (session.showSoMBadges) {
      await this.applySetOfMarks(session);
    } else {
      await this.removeSetOfMarks(session);
    }

    const screenshot = await this.captureScreenshot(session);
    return {
      status: 'success',
      action: 'toggle_som',
      showSoMBadges: session.showSoMBadges,
      somCount: session.somMap.size,
      url: session.activeUrl,
      title: session.pageTitle,
      screenshot,
    };
  }

  /**
   * Captures an ultra-lightweight JPEG screenshot for the given user session.
   */
  async captureScreenshot(session) {
    if (!session?.page || session.page.isClosed()) return null;
    try {
      if (session.showSoMBadges) {
        await this.applySetOfMarks(session);
      }
      const buffer = await session.page.screenshot({
        type: 'jpeg',
        quality: 55,
        fullPage: false,
        timeout: 3500,
      });
      const base64 = buffer.toString('base64');
      session.lastScreenshot = base64;
      return base64;
    } catch (err) {
      console.warn('[BrowserService] Screenshot capture warning:', err.message);
      return session.lastScreenshot;
    }
  }

  /**
   * Navigates the user's isolated browser context to target URL.
   */
  async navigate(targetUrl, sessionId = 'default') {
    const session = await this.getOrCreateSession(sessionId);
    session.touch();

    let cleanUrl = (targetUrl || '').trim();
    if (!cleanUrl) {
      throw new Error('URL parameter is required.');
    }

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      if (cleanUrl.includes('.') && !cleanUrl.includes(' ')) {
        cleanUrl = 'https://' + cleanUrl;
      } else {
        cleanUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanUrl)}`;
      }
    }

    // SSRF Guard: Block internal network, localhost, cloud metadata, and arbitrary protocols
    try {
      const parsed = new URL(cleanUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error(`Navigation protocol "${parsed.protocol}" is blocked for security.`);
      }

      const host = parsed.hostname.toLowerCase();
      const isInternal =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host.startsWith('127.') ||
        host === '0.0.0.0' ||
        host === '::1' ||
        host === '[::1]' ||
        host === '169.254.169.254' ||
        host.startsWith('10.') ||
        host.startsWith('192.168.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host);

      if (isInternal) {
        throw new Error(`Navigation to restricted internal address "${host}" is blocked for security.`);
      }
    } catch (urlErr) {
      if (urlErr.message.includes('blocked for security')) throw urlErr;
    }

    console.log(`[BrowserService] Session "${session.sessionId}" navigating to: ${cleanUrl}`);
    session.lastAction = { type: 'navigate', url: cleanUrl, timestamp: Date.now() };

    try {
      await session.page.goto(cleanUrl, {
        waitUntil: 'commit',
        timeout: 15000,
      });

      await Promise.race([
        session.page.waitForLoadState('domcontentloaded', { timeout: 3500 }).catch(() => {}),
        new Promise((r) => setTimeout(r, 1200)),
      ]);
    } catch (err) {
      console.warn(`[BrowserService] Fast recovery on ${cleanUrl}:`, err.message);
    }

    await new Promise((r) => setTimeout(r, 350));
    session.activeUrl = session.page.url();
    try {
      session.pageTitle = await session.page.title();
    } catch (_) {
      session.pageTitle = cleanUrl;
    }

    const screenshot = await this.captureScreenshot(session);

    // Follow-up progressive hydration frame
    setTimeout(async () => {
      try {
        if (session.page && !session.page.isClosed() && session.activeUrl === cleanUrl) {
          session.pageTitle = await session.page.title().catch(() => session.pageTitle);
          await this.captureScreenshot(session);
        }
      } catch (_) {}
    }, 1400);

    return {
      status: 'success',
      action: 'navigate',
      url: session.activeUrl,
      title: session.pageTitle,
      showSoMBadges: session.showSoMBadges,
      somCount: session.somMap.size,
      screenshot,
    };
  }

  /**
   * Clicks an element inside the user's isolated session.
   */
  async click({ elementId, selector, x, y, description = '' }, sessionId = 'default') {
    const session = await this.getOrCreateSession(sessionId);
    session.touch();

    let clickX = x;
    let clickY = y;

    if (elementId != null) {
      const target = session.somMap.get(Number(elementId));
      if (target) {
        clickX = target.x;
        clickY = target.y;
        description = description || `Element [${elementId}] (${target.tag}: "${target.text}")`;
      }
    }

    session.lastAction = { type: 'click', elementId, selector, x: clickX, y: clickY, description, timestamp: Date.now() };

    try {
      if (typeof clickX === 'number' && typeof clickY === 'number') {
        await session.page.mouse.click(clickX, clickY);
      } else if (selector) {
        const elem = session.page.locator(selector).first();
        if (await elem.isVisible({ timeout: 2000 })) {
          await elem.click();
        } else {
          await session.page.getByText(selector, { exact: false }).first().click({ timeout: 2500 });
        }
      } else {
        throw new Error('Either elementId, coordinates (x, y), or selector is required to click.');
      }
    } catch (err) {
      console.warn('[BrowserService] Click warning:', err.message);
    }

    await new Promise((r) => setTimeout(r, 450));
    session.activeUrl = session.page.url();
    try {
      session.pageTitle = await session.page.title();
    } catch (_) {}

    const screenshot = await this.captureScreenshot(session);

    return {
      status: 'success',
      action: 'click',
      url: session.activeUrl,
      title: session.pageTitle,
      clickCoordinates: typeof clickX === 'number' && typeof clickY === 'number' ? { x: clickX, y: clickY } : null,
      elementId,
      showSoMBadges: session.showSoMBadges,
      somCount: session.somMap.size,
      screenshot,
    };
  }

  /**
   * Types text inside the user's isolated session.
   */
  async type({ elementId, text = '', selector = '', pressEnter = false }, sessionId = 'default') {
    const session = await this.getOrCreateSession(sessionId);
    session.touch();

    session.lastAction = { type: 'type', elementId, text, selector, pressEnter, timestamp: Date.now() };

    try {
      if (elementId != null) {
        const target = session.somMap.get(Number(elementId));
        if (target) {
          await session.page.mouse.click(target.x, target.y);
          await new Promise((r) => setTimeout(r, 150));
        }
      }

      if (selector) {
        const input = session.page.locator(selector).first();
        await input.fill(text, { timeout: 2500 });
      } else {
        await session.page.keyboard.type(text, { delay: 20 });
      }

      if (pressEnter) {
        await session.page.keyboard.press('Enter');
        await new Promise((r) => setTimeout(r, 600));
      }
    } catch (err) {
      console.warn('[BrowserService] Type warning:', err.message);
    }

    await new Promise((r) => setTimeout(r, 300));
    session.activeUrl = session.page.url();
    try {
      session.pageTitle = await session.page.title();
    } catch (_) {}

    const screenshot = await this.captureScreenshot(session);

    return {
      status: 'success',
      action: 'type',
      url: session.activeUrl,
      title: session.pageTitle,
      showSoMBadges: session.showSoMBadges,
      somCount: session.somMap.size,
      screenshot,
    };
  }

  /**
   * Scrolls the viewport inside the user's isolated session.
   */
  async scroll({ direction = 'down', amount = 450 }, sessionId = 'default') {
    const session = await this.getOrCreateSession(sessionId);
    session.touch();

    const deltaY = direction === 'up' ? -Math.abs(amount) : Math.abs(amount);
    session.lastAction = { type: 'scroll', direction, amount, timestamp: Date.now() };

    try {
      await session.page.mouse.wheel(0, deltaY);
    } catch (err) {
      console.warn('[BrowserService] Scroll warning:', err.message);
    }

    await new Promise((r) => setTimeout(r, 300));
    const screenshot = await this.captureScreenshot(session);

    return {
      status: 'success',
      action: 'scroll',
      url: session.activeUrl,
      title: session.pageTitle,
      showSoMBadges: session.showSoMBadges,
      somCount: session.somMap.size,
      screenshot,
    };
  }

  /**
   * Clips a diagram or section to paste onto the user's whiteboard.
   */
  async clipToWhiteboard({ selector = '', caption = 'Clipped Web Diagram' }, sessionId = 'default') {
    const session = await this.getOrCreateSession(sessionId);
    session.touch();

    let clipScreenshot = null;
    try {
      if (selector) {
        const elem = session.page.locator(selector).first();
        if (await elem.isVisible({ timeout: 2000 })) {
          const buffer = await elem.screenshot({ type: 'jpeg', quality: 75 });
          clipScreenshot = buffer.toString('base64');
        }
      }
    } catch (e) {
      console.warn('[BrowserService] Clip element fallback:', e.message);
    }

    if (!clipScreenshot) {
      clipScreenshot = await this.captureScreenshot(session);
    }

    return {
      status: 'success',
      action: 'clip_whiteboard',
      caption,
      image: clipScreenshot,
      url: session.activeUrl,
      title: session.pageTitle,
    };
  }

  /**
   * Highlights an element with an AI visual laser box.
   */
  async highlight({ selector = '', text = '', label = 'Key Concept' }, sessionId = 'default') {
    const session = await this.getOrCreateSession(sessionId);
    session.touch();

    let boundingBox = null;
    try {
      if (selector) {
        const locator = session.page.locator(selector).first();
        if (await locator.isVisible({ timeout: 2000 }).catch(() => false)) {
          boundingBox = await locator.boundingBox();
        }
      } else if (text) {
        const locator = session.page.getByText(text, { exact: false }).first();
        if (await locator.isVisible({ timeout: 2000 }).catch(() => false)) {
          boundingBox = await locator.boundingBox();
        }
      }

      if (boundingBox) {
        await session.page.evaluate(({ box, labelText }) => {
          const existing = document.getElementById('aristotle-ai-highlight');
          if (existing) existing.remove();

          const div = document.createElement('div');
          div.id = 'aristotle-ai-highlight';
          div.style.position = 'absolute';
          div.style.left = `${Math.max(0, box.x - 4)}px`;
          div.style.top = `${Math.max(0, box.y - 4)}px`;
          div.style.width = `${box.width + 8}px`;
          div.style.height = `${box.height + 8}px`;
          div.style.border = '3px solid #06b6d4';
          div.style.borderRadius = '8px';
          div.style.backgroundColor = 'rgba(6, 182, 212, 0.15)';
          div.style.boxShadow = '0 0 25px rgba(6, 182, 212, 0.8)';
          div.style.zIndex = '9999999';
          div.style.pointerEvents = 'none';

          const badge = document.createElement('span');
          badge.innerText = `🔍 ${labelText}`;
          badge.style.position = 'absolute';
          badge.style.top = '-26px';
          badge.style.left = '0';
          badge.style.background = '#06b6d4';
          badge.style.color = '#ffffff';
          badge.style.fontSize = '12px';
          badge.style.fontWeight = 'bold';
          badge.style.padding = '2px 8px';
          badge.style.borderRadius = '4px';
          badge.style.fontFamily = 'system-ui, sans-serif';
          div.appendChild(badge);

          document.body.appendChild(div);
        }, { box: boundingBox, labelText: label });
      }
    } catch (_) {}

    const screenshot = await this.captureScreenshot(session);

    return {
      status: 'success',
      action: 'highlight',
      boundingBox,
      label,
      screenshot,
      url: session.activeUrl,
      title: session.pageTitle,
    };
  }

  /**
   * Toggles Clean Reader View on the user's isolated page.
   */
  async toggleReaderMode(enabled, sessionId = 'default') {
    const session = await this.getOrCreateSession(sessionId);
    session.touch();
    session.isReaderMode = !!enabled;

    try {
      if (session.isReaderMode) {
        await session.page.evaluate(() => {
          const hideSelectors = [
            'header', 'footer', 'nav', 'aside', 'iframe',
            '.advertisement', '.ad', '.sidebar', '.social-share',
            '.cookie-banner', '#cookie-banner', '.newsletter-signup',
          ];
          hideSelectors.forEach((sel) => {
            document.querySelectorAll(sel).forEach((el) => (el.style.display = 'none'));
          });
          document.body.style.maxWidth = '780px';
          document.body.style.margin = '0 auto';
          document.body.style.padding = '24px';
          document.body.style.background = '#fbf8f3';
          document.body.style.color = '#1c1917';
          document.body.style.fontFamily = 'Georgia, serif';
        });
      } else {
        await session.page.reload({ waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => {});
      }
    } catch (_) {}

    await new Promise((r) => setTimeout(r, 300));
    const screenshot = await this.captureScreenshot(session);

    return {
      status: 'success',
      action: 'reader_mode',
      isReaderMode: session.isReaderMode,
      url: session.activeUrl,
      title: session.pageTitle,
      screenshot,
    };
  }

  async goBack(sessionId = 'default') {
    const session = await this.getOrCreateSession(sessionId);
    session.touch();
    try {
      await session.page.goBack({ waitUntil: 'domcontentloaded', timeout: 6000 });
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 400));
    session.activeUrl = session.page.url();
    try { session.pageTitle = await session.page.title(); } catch (_) {}
    const screenshot = await this.captureScreenshot(session);
    return {
      status: 'success',
      action: 'back',
      url: session.activeUrl,
      title: session.pageTitle,
      screenshot,
    };
  }

  async goForward(sessionId = 'default') {
    const session = await this.getOrCreateSession(sessionId);
    session.touch();
    try {
      await session.page.goForward({ waitUntil: 'domcontentloaded', timeout: 6000 });
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 400));
    session.activeUrl = session.page.url();
    try { session.pageTitle = await session.page.title(); } catch (_) {}
    const screenshot = await this.captureScreenshot(session);
    return {
      status: 'success',
      action: 'forward',
      url: session.activeUrl,
      title: session.pageTitle,
      screenshot,
    };
  }

  /**
   * Retrieves current viewport state and screenshot for a specific user session.
   */
  async getViewportState(force = false, sessionId = 'default') {
    const session = await this.getOrCreateSession(sessionId);
    session.touch();
    if (!session.lastScreenshot || force) {
      await this.captureScreenshot(session);
    }
    return {
      url: session.activeUrl,
      title: session.pageTitle,
      screenshot: session.lastScreenshot,
      lastAction: session.lastAction,
      isReaderMode: session.isReaderMode,
      showSoMBadges: session.showSoMBadges,
      somCount: session.somMap.size,
      isSleeping: this.isSleeping,
    };
  }

  /**
   * Closes a single user's isolated session.
   */
  async closeSession(sessionId = 'default') {
    const cleanId = (sessionId || 'default').toString().trim().slice(0, 64);
    const session = this.sessions.get(cleanId);
    if (session) {
      console.log(`[BrowserService] Explicitly closing isolated session "${cleanId}".`);
      await session.close();
      this.sessions.delete(cleanId);
    }
  }

  /**
   * Cleanly closes all sessions and tears down the browser engine.
   */
  async close() {
    try {
      if (this.janitorInterval) {
        clearInterval(this.janitorInterval);
        this.janitorInterval = null;
      }
      if (this.sleepTimer) {
        clearTimeout(this.sleepTimer);
        this.sleepTimer = null;
      }
      for (const session of this.sessions.values()) {
        await session.close();
      }
      this.sessions.clear();

      if (this.browser) {
        await this.browser.close().catch(() => {});
        this.browser = null;
      }
      this.initPromise = null;
      this.isSleeping = false;
      console.log('[BrowserService] All browser sessions closed cleanly.');
    } catch (e) {
      console.error('[BrowserService] Error during browser teardown:', e);
    }
  }
}

export const browserService = new BrowserService();
