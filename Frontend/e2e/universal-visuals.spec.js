import { test, expect } from '@playwright/test';

test.describe('Universal Visual Studio E2E - Generative SVG & Educational Archive Photos', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  });

  test('1. Generative Vector SVG: Restores and renders custom SVG diagram on whiteboard', async ({ page }) => {
    const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="auto">
      <rect width="100%" height="100%" fill="#fffdfa" rx="12"/>
      <text x="300" y="40" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle" fill="#0f172a">Plant Cell Structure</text>
      <rect x="120" y="80" width="360" height="240" rx="20" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/>
      <circle cx="300" cy="200" r="45" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
      <text x="300" y="205" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#92400e">Nucleus</text>
    </svg>`;

    // Save session with visual SVG item into localStorage
    await page.evaluate((svg) => {
      const session = {
        id: 'session_test_svg',
        title: 'Plant Cell Biology • Vector Diagram',
        dateStr: 'Today',
        timeStr: '12:00 PM',
        studentName: 'Adi',
        itemsCount: 1,
        items: [
          {
            id: 'wb-test-svg-1',
            topic: 'Plant Cell Structure',
            notes: ['Cell Wall provides rigidity', 'Nucleus stores genetic information'],
            visualType: 'svg',
            svgCode: svg,
            caption: 'Plant cell anatomy showing cell wall and nucleus',
            subject: 'Biology',
          },
        ],
      };
      localStorage.setItem('aristotle_session_history_v1', JSON.stringify([session]));
    }, sampleSvg);

    await page.reload({ waitUntil: 'domcontentloaded' });

    // Open History Drawer
    const historyBtn = page.getByTitle('Past Study Sessions');
    await expect(historyBtn).toBeVisible();
    await historyBtn.click();

    // Verify session modal opens and click history item to restore
    const historyItem = page.getByTestId('session-history-item').first();
    await expect(historyItem).toBeVisible();
    await historyItem.click();

    // Verify UniversalVisualCard and SVG diagram are rendered on the whiteboard
    const visualCard = page.locator('[data-testid="universal-visual-card"]');
    await expect(visualCard).toBeVisible();

    const svgContainer = page.locator('[data-testid="svg-diagram-container"]');
    await expect(svgContainer).toBeVisible();
    await expect(svgContainer.locator('svg')).toBeVisible();
    await expect(svgContainer).toContainText('Nucleus');
  });

  test('2. Educational Archive Photo: Restores and renders high-res photo with caption and attribution', async ({ page }) => {
    // Save session with educational photo item into localStorage
    await page.evaluate(() => {
      const session = {
        id: 'session_test_photo',
        title: 'James Webb Space Telescope • Astronomy',
        dateStr: 'Today',
        timeStr: '12:05 PM',
        studentName: 'Adi',
        itemsCount: 1,
        items: [
          {
            id: 'wb-test-photo-1',
            topic: 'James Webb Space Telescope',
            notes: ['Infrared space observatory', 'Orbiting at Sun-Earth L2 Lagrange point'],
            visualType: 'photo',
            imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/99/James_Webb_Space_Telescope_Mirror37.jpg',
            imageTitle: 'James Webb Mirror Segment',
            attribution: 'NASA / Wikimedia Contributor (Public Domain)',
            caption: 'Primary golden hexagonal beryllium mirror segment',
            subject: 'Astronomy',
          },
        ],
      };
      localStorage.setItem('aristotle_session_history_v1', JSON.stringify([session]));
    });

    await page.reload({ waitUntil: 'domcontentloaded' });

    // Open History Drawer
    const historyBtn = page.getByTitle('Past Study Sessions');
    await expect(historyBtn).toBeVisible();
    await historyBtn.click();

    // Click history item to restore
    const historyItem = page.getByTestId('session-history-item').first();
    await expect(historyItem).toBeVisible();
    await historyItem.click();

    // Verify UniversalVisualCard and Image are rendered
    const visualCard = page.locator('[data-testid="universal-visual-card"]');
    await expect(visualCard).toBeVisible();

    const img = visualCard.locator('img');
    await expect(img).toBeVisible();
    await expect(visualCard).toContainText('Primary golden hexagonal');
    await expect(visualCard).toContainText('NASA / Wikimedia Contributor');
  });

  test('3. Drawing Canvas Overlay: Student can annotate on top of visual diagrams', async ({ page }) => {
    const penButton = page.locator('button[title*="Pen"], button:has-text("Pen")').first();
    if (await penButton.isVisible()) {
      await penButton.click();
      await page.waitForTimeout(300);

      // Verify canvas overlay is active
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();

      // Perform a drag stroke over canvas
      const box = await canvas.boundingBox();
      if (box) {
        await page.mouse.move(box.x + 100, box.y + 100);
        await page.mouse.down();
        await page.mouse.move(box.x + 200, box.y + 200, { steps: 5 });
        await page.mouse.up();
      }

      // Check undo button becomes enabled
      const undoBtn = page.locator('button[title*="Undo"]').first();
      await expect(undoBtn).toBeEnabled();
    }
  });
});
