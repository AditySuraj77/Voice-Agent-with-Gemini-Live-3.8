import { chromium } from 'playwright';

/**
 * BrowserService manages an autonomous Chromium session via Playwright.
 * Designed for Gemini Live: captures lightweight JPEG screenshots for multimodal
 * vision feedback and executes non-blocking browsing actions.
 */
class BrowserService {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.activeUrl = 'about:blank';
    this.pageTitle = 'Empty';
    this.lastScreenshot = null;
    this.lastAction = null;
    this.isInitialized = false;
    this.initPromise = null;
  }

  /**
   * Initializes Chromium instance with desktop viewport and stealth headers.
   */
  async init() {
    if (this.isInitialized && this.page && !this.page.isClosed()) {
      return this.page;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      console.log('[BrowserService] Launching Chromium instance for AI agent...');
      try {
        this.browser = await chromium.launch({
          headless: true,
          args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
          ],
        });

        this.context = await this.browser.newContext({
          viewport: { width: 1280, height: 720 },
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          deviceScaleFactor: 1,
        });

        this.page = await this.context.newPage();

        // Listen for navigation & title updates
        this.page.on('framenavigated', (frame) => {
          if (frame === this.page.mainFrame()) {
            this.activeUrl = this.page.url();
          }
        });

        this.page.on('load', async () => {
          try {
            this.pageTitle = await this.page.title();
            this.activeUrl = this.page.url();
          } catch (e) {}
        });

        // Set blank initial page with nice placeholder
        await this.page.setContent(`
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body {
                  margin: 0;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  background: #0f172a;
                  color: #94a3b8;
                }
                .card {
                  text-align: center;
                  padding: 2rem;
                  border: 1px solid #1e293b;
                  border-radius: 12px;
                  background: #1e293b/60;
                }
                h1 { color: #f8fafc; font-size: 1.5rem; margin-bottom: 0.5rem; }
                p { font-size: 0.9rem; margin: 0; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>🌐 AI Browser Ready</h1>
                <p>Ask Aristotle to open any website, search, or research live.</p>
              </div>
            </body>
          </html>
        `);

        await this.captureScreenshot();
        this.isInitialized = true;
        console.log('[BrowserService] Chromium instance initialized successfully (1280x720).');
        return this.page;
      } catch (err) {
        console.error('[BrowserService] Failed to launch Chromium:', err);
        this.initPromise = null;
        throw err;
      }
    })();

    return this.initPromise;
  }

  /**
   * Captures an optimized JPEG screenshot (quality: 65%) returned as base64.
   * Lightweight payload (~50-80 KB) keeps WebSocket streaming instantaneous.
   */
  async captureScreenshot() {
    if (!this.page || this.page.isClosed()) return null;
    try {
      const buffer = await this.page.screenshot({
        type: 'jpeg',
        quality: 65,
        fullPage: false,
      });
      const base64 = buffer.toString('base64');
      this.lastScreenshot = base64;
      return base64;
    } catch (err) {
      console.warn('[BrowserService] Screenshot capture failed:', err.message);
      return this.lastScreenshot;
    }
  }

  /**
   * Navigates to a target URL.
   */
  async navigate(targetUrl) {
    await this.init();

    let cleanUrl = (targetUrl || '').trim();
    if (!cleanUrl) {
      throw new Error('URL parameter is required.');
    }

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      if (cleanUrl.includes('.') && !cleanUrl.includes(' ')) {
        cleanUrl = 'https://' + cleanUrl;
      } else {
        // Query search fallback (DuckDuckGo or Google)
        cleanUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanUrl)}`;
      }
    }

    console.log(`[BrowserService] Navigating to: ${cleanUrl}`);
    this.lastAction = { type: 'navigate', url: cleanUrl, timestamp: Date.now() };

    try {
      await this.page.goto(cleanUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 18000,
      });
    } catch (err) {
      console.warn(`[BrowserService] Navigation timeout/warning for ${cleanUrl}:`, err.message);
      // Even if timeout occurs, partial page is usually loaded
    }

    // Wait a brief moment for dynamic hydration/rendering
    await new Promise((r) => setTimeout(r, 600));

    this.activeUrl = this.page.url();
    try {
      this.pageTitle = await this.page.title();
    } catch (e) {
      this.pageTitle = cleanUrl;
    }

    const screenshot = await this.captureScreenshot();

    return {
      status: 'success',
      action: 'navigate',
      url: this.activeUrl,
      title: this.pageTitle,
      screenshot,
    };
  }

  /**
   * Clicks an element by coordinates {x, y} or selector/text.
   */
  async click({ selector, x, y, description = '' }) {
    await this.init();

    console.log(`[BrowserService] Click action: ${description || selector || `(${x}, ${y})`}`);
    this.lastAction = { type: 'click', selector, x, y, description, timestamp: Date.now() };

    try {
      if (typeof x === 'number' && typeof y === 'number') {
        // Direct vision coordinate click
        await this.page.mouse.click(x, y);
      } else if (selector) {
        // Try selector or text match
        const elem = this.page.locator(selector).first();
        if (await elem.isVisible({ timeout: 2500 })) {
          await elem.click();
        } else {
          // Fallback to text click
          await this.page.getByText(selector, { exact: false }).first().click({ timeout: 3000 });
        }
      } else {
        throw new Error('Either coordinates (x, y) or selector is required to click.');
      }
    } catch (err) {
      console.warn(`[BrowserService] Click warning:`, err.message);
    }

    // Wait for DOM response or navigation
    await new Promise((r) => setTimeout(r, 600));

    this.activeUrl = this.page.url();
    try {
      this.pageTitle = await this.page.title();
    } catch (e) {}

    const screenshot = await this.captureScreenshot();

    return {
      status: 'success',
      action: 'click',
      url: this.activeUrl,
      title: this.pageTitle,
      clickCoordinates: typeof x === 'number' && typeof y === 'number' ? { x, y } : null,
      screenshot,
    };
  }

  /**
   * Types text into active element or specified input selector.
   */
  async type({ text = '', selector = '', pressEnter = false }) {
    await this.init();

    console.log(`[BrowserService] Type action: "${text}" (enter: ${pressEnter})`);
    this.lastAction = { type: 'type', text, selector, pressEnter, timestamp: Date.now() };

    try {
      if (selector) {
        const input = this.page.locator(selector).first();
        await input.fill(text, { timeout: 3000 });
      } else {
        await this.page.keyboard.type(text, { delay: 25 });
      }

      if (pressEnter) {
        await this.page.keyboard.press('Enter');
        await new Promise((r) => setTimeout(r, 800));
      }
    } catch (err) {
      console.warn(`[BrowserService] Type warning:`, err.message);
    }

    await new Promise((r) => setTimeout(r, 400));
    this.activeUrl = this.page.url();
    try {
      this.pageTitle = await this.page.title();
    } catch (e) {}

    const screenshot = await this.captureScreenshot();

    return {
      status: 'success',
      action: 'type',
      url: this.activeUrl,
      title: this.pageTitle,
      screenshot,
    };
  }

  /**
   * Scrolls the page viewport up or down.
   */
  async scroll({ direction = 'down', amount = 450 }) {
    await this.init();

    const deltaY = direction === 'up' ? -Math.abs(amount) : Math.abs(amount);
    console.log(`[BrowserService] Scroll action: ${direction} (${deltaY}px)`);
    this.lastAction = { type: 'scroll', direction, amount, timestamp: Date.now() };

    try {
      await this.page.mouse.wheel(0, deltaY);
    } catch (err) {
      console.warn(`[BrowserService] Scroll warning:`, err.message);
    }

    await new Promise((r) => setTimeout(r, 350));
    const screenshot = await this.captureScreenshot();

    return {
      status: 'success',
      action: 'scroll',
      url: this.activeUrl,
      title: this.pageTitle,
      screenshot,
    };
  }

  /**
   * Retrieves current viewport state and screenshot.
   */
  async getViewportState() {
    await this.init();
    if (!this.lastScreenshot) {
      await this.captureScreenshot();
    }
    return {
      url: this.activeUrl,
      title: this.pageTitle,
      screenshot: this.lastScreenshot,
      lastAction: this.lastAction,
    };
  }

  /**
   * Cleanly closes the browser instance.
   */
  async close() {
    try {
      if (this.context) {
        await this.context.close().catch(() => {});
        this.context = null;
      }
      if (this.browser) {
        await this.browser.close().catch(() => {});
        this.browser = null;
      }
      this.page = null;
      this.isInitialized = false;
      this.initPromise = null;
      this.lastScreenshot = null;
      console.log('[BrowserService] Browser session closed cleanly.');
    } catch (e) {
      console.error('[BrowserService] Error during browser teardown:', e);
    }
  }
}

export const browserService = new BrowserService();
