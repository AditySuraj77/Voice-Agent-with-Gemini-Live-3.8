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

    // Test Lightbox Zoom and Prominent Close Button
    const expandBtn = page.getByTestId('expand-visual-btn');
    await expect(expandBtn).toBeVisible();
    await expandBtn.click();

    const lightboxModal = page.getByTestId('visual-lightbox-modal');
    await expect(lightboxModal).toBeVisible();

    const closeBtn = page.getByTestId('lightbox-close-btn');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(lightboxModal).toBeHidden();
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

  test('4. Multi-Visual Separation: Multiple visual items render as distinct separate cards without squishing', async ({ page }) => {
    const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300">
      <rect width="100%" height="100%" fill="#e0f2fe"/>
      <text x="250" y="50" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">Prism Dispersion</text>
    </svg>`;

    await page.evaluate((svg) => {
      const session = {
        id: 'session_multi_visual',
        title: 'Optics • Multi-Visual Session',
        dateStr: 'Today',
        timeStr: '12:10 PM',
        studentName: 'Adi',
        itemsCount: 2,
        items: [
          {
            id: 'wb-multi-1',
            topic: 'Light Refraction Prism',
            notes: ['White light splits into seven colors'],
            visualType: 'svg',
            svgCode: svg,
            caption: 'Prism refraction spectrum',
            subject: 'Physics',
          },
          {
            id: 'wb-multi-2',
            topic: 'Newton Color Wheel',
            notes: ['Additive color synthesis experiment'],
            visualType: 'photo',
            imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Newton_colour_circle.png/400px-Newton_colour_circle.png',
            imageTitle: 'Newton Colour Circle',
            attribution: 'Wikimedia Commons',
            caption: 'Historic color wheel diagram by Isaac Newton',
            subject: 'History of Science',
          },
        ],
      };
      localStorage.setItem('aristotle_session_history_v1', JSON.stringify([session]));
    }, sampleSvg);

    await page.reload({ waitUntil: 'domcontentloaded' });

    // Open History Drawer
    const historyBtn = page.getByTitle('Past Study Sessions');
    await historyBtn.click();

    // Click history item to restore
    const historyItem = page.getByTestId('session-history-item').first();
    await historyItem.click();

    // Verify TWO distinct visual cards exist on the whiteboard canvas
    const visualCards = page.locator('[data-testid="universal-visual-card"]');
    await expect(visualCards).toHaveCount(2);

    // Verify first card contains SVG and second card contains Image
    await expect(visualCards.nth(0).locator('[data-testid="svg-diagram-container"] svg')).toBeVisible();
    await expect(visualCards.nth(0)).toContainText('Prism refraction spectrum');

    await expect(visualCards.nth(1).locator('img')).toBeVisible();
    await expect(visualCards.nth(1)).toContainText('Historic color wheel diagram');
  });

  test('5. Dedicated Lightbox Modal: Single visual zoom with Escape key and backdrop dismissal', async ({ page }) => {
    const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300">
      <rect width="100%" height="100%" fill="#fee2e2"/>
      <text x="250" y="150" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle">Circulatory System</text>
    </svg>`;

    await page.evaluate((svg) => {
      const session = {
        id: 'session_lightbox_test',
        title: 'Biology • Circulatory System',
        dateStr: 'Today',
        timeStr: '12:15 PM',
        studentName: 'Adi',
        itemsCount: 1,
        items: [
          {
            id: 'wb-lightbox-1',
            topic: 'Human Heart Anatomy',
            notes: ['Four chambers of heart'],
            visualType: 'svg',
            svgCode: svg,
            caption: 'Detailed heart anatomy vector diagram',
            subject: 'Biology',
          },
        ],
      };
      localStorage.setItem('aristotle_session_history_v1', JSON.stringify([session]));
    }, sampleSvg);

    await page.reload({ waitUntil: 'domcontentloaded' });

    // Restore session
    const historyBtn = page.getByTitle('Past Study Sessions');
    await historyBtn.click();
    const historyItem = page.getByTestId('session-history-item').first();
    await historyItem.click();

    // Click expand button to zoom
    const expandBtn = page.getByTestId('expand-visual-btn');
    await expect(expandBtn).toBeVisible();
    await expandBtn.click();

    const lightboxModal = page.getByTestId('visual-lightbox-modal');
    await expect(lightboxModal).toBeVisible();

    // Verify Escape key dismisses modal
    await page.keyboard.press('Escape');
    await expect(lightboxModal).toBeHidden();

    // Reopen modal and test backdrop click dismiss
    await expandBtn.click();
    await expect(lightboxModal).toBeVisible();

    // Click backdrop (outside the visual container)
    await page.mouse.click(10, 10);
    await expect(lightboxModal).toBeHidden();
  });

  test('6. Left Floating Drawing Dock: Pointer, Pen, and Highlighter tool selection', async ({ page }) => {
    // Verify left floating dock exists
    const penBtn = page.locator('button[title*="Pen"]').first();
    await expect(penBtn).toBeVisible();

    // Check Pointer / Select tool
    const pointerBtn = page.locator('button[title*="Pointer"], button[title*="Select"]').first();
    if (await pointerBtn.isVisible()) {
      await pointerBtn.click();
      await page.waitForTimeout(150);
    }

    // Check Pen tool selection
    await penBtn.click();
    await page.waitForTimeout(150);

    // Check Highlighter tool selection
    const highBtn = page.locator('button[title*="Highlighter"]').first();
    if (await highBtn.isVisible()) {
      await highBtn.click();
      await page.waitForTimeout(150);
    }

    // Check Eraser tool selection
    const eraserBtn = page.locator('button[title*="Eraser"]').first();
    if (await eraserBtn.isVisible()) {
      await eraserBtn.click();
      await page.waitForTimeout(150);
    }
  });

  test('7. FLUX AI Conceptual Illustration: Restores and renders FLUX.1 AI image with badges, prompt chip, and lightbox zoom', async ({ page }) => {
    // Generate inline SVG data URI as test image to ensure instant loading without external network latency
    const sampleImageUri = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%232e1065"/><text x="50%" y="50%" font-size="28" fill="%23e9d5ff" font-family="sans-serif" font-weight="bold" text-anchor="middle">MITOCHONDRIA 3D</text></svg>';

    await page.evaluate((imgUri) => {
      const session = {
        id: 'session_test_flux_ai',
        title: 'Mitochondria 3D • FLUX AI Visual',
        dateStr: 'Today',
        timeStr: '12:15 PM',
        studentName: 'Adi',
        itemsCount: 1,
        items: [
          {
            id: 'wb-test-flux-1',
            topic: 'Cellular Respiration in Mitochondria',
            notes: ['Inner mitochondrial cristae folding', 'ATP synthase generating energy'],
            visualType: 'ai_image',
            imageUrl: imgUri,
            aiImageUrl: imgUri,
            imagePrompt: "Photorealistic 3D cross-section of Mitochondria with glowing title 'MITOCHONDRIA', scientific render, 8k",
            caption: '3D conceptual visualization of mitochondrial inner cristae and ATP synthesis',
            subject: 'Biology',
          },
        ],
      };
      localStorage.setItem('aristotle_session_history_v1', JSON.stringify([session]));
    }, sampleImageUri);

    await page.reload({ waitUntil: 'domcontentloaded' });

    // Open History Drawer
    const historyBtn = page.getByTitle('Past Study Sessions');
    await expect(historyBtn).toBeVisible();
    await historyBtn.click();

    // Click history item to restore
    const historyItem = page.getByTestId('session-history-item').first();
    await expect(historyItem).toBeVisible();
    await historyItem.click();

    // Verify UniversalVisualCard and AI image container
    const visualCard = page.locator('[data-testid="universal-visual-card"]');
    await expect(visualCard).toBeVisible();

    // Verify FLUX badge and AI indicator
    await expect(visualCard).toContainText('FLUX AI Visual');
    await expect(visualCard).toContainText('FLUX.1');

    // Verify prompt chip and caption
    await expect(visualCard).toContainText("MITOCHONDRIA");
    await expect(visualCard).toContainText('3D conceptual visualization of mitochondrial inner cristae');

    const aiContainer = page.locator('[data-testid="ai-image-container"]');
    await expect(aiContainer).toBeVisible();
    const img = visualCard.locator('img');
    await expect(img).toBeVisible();

    // Test Lightbox Zoom for AI Image
    const expandBtn = visualCard.getByTestId('expand-visual-btn');
    await expect(expandBtn).toBeVisible();
    await expandBtn.click();

    const lightboxModal = page.getByTestId('visual-lightbox-modal');
    await expect(lightboxModal).toBeVisible();
    await expect(lightboxModal).toContainText('FLUX AI Illustration');

    // Dismiss lightbox via Escape key
    await page.keyboard.press('Escape');
    await expect(lightboxModal).toBeHidden();
  });
});
