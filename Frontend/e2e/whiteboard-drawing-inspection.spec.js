import { test, expect } from '@playwright/test';

test.describe('E2E Verification: Interactive Whiteboard Drawing & Multimodal Inspection', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  });

  test('1. Drawing Toolbar & Tools Presence: Pen, Highlight, Tick, Cross, Eraser, Undo, Redo', async ({ page }) => {
    const whiteboard = page.getByTestId('direct-whiteboard');
    await expect(whiteboard).toBeVisible();

    const toolbar = page.getByTestId('drawing-toolbar');
    await expect(toolbar).toBeVisible();

    const penBtn = page.getByTestId('tool-pen');
    const highlightBtn = page.getByTestId('tool-highlighter');
    const tickBtn = page.getByTestId('tool-tick');
    const crossBtn = page.getByTestId('tool-cross');
    const eraserBtn = page.getByTestId('tool-eraser');
    const undoBtn = page.getByTestId('tool-undo');
    const redoBtn = page.getByTestId('tool-redo');

    await expect(penBtn).toBeVisible();
    await expect(highlightBtn).toBeVisible();
    await expect(tickBtn).toBeVisible();
    await expect(crossBtn).toBeVisible();
    await expect(eraserBtn).toBeVisible();
    await expect(undoBtn).toBeVisible();
    await expect(redoBtn).toBeVisible();
  });

  test('2. Pen Activation, Freehand Drawing Interaction & Smart Inspect Button', async ({ page }) => {
    const penBtn = page.getByTestId('tool-pen');
    await penBtn.click();

    // Canvas overlay should be active
    const canvas = page.getByTestId('drawing-canvas-overlay');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    // Simulate pen drag stroke on canvas
    await page.mouse.move(box.x + 100, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y + 120);
    await page.mouse.move(box.x + 200, box.y + 100);
    await page.mouse.up();

    // Clear and Check buttons should be visible
    const clearBtn = page.getByTestId('tool-clear-drawings');
    await expect(clearBtn).toBeVisible();

    const inspectBtn = page.getByTestId('inspect-whiteboard-btn');
    await expect(inspectBtn).toBeVisible();
    await expect(inspectBtn).toContainText('Check with Aristotle');

    // Undo button should now be enabled
    const undoBtn = page.getByTestId('tool-undo');
    await expect(undoBtn).toBeEnabled();
  });

  test('3. Undo and Redo Functionality', async ({ page }) => {
    const penBtn = page.getByTestId('tool-pen');
    await penBtn.click();

    const canvas = page.getByTestId('drawing-canvas-overlay');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    // Draw stroke 1
    await page.mouse.move(box.x + 100, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y + 120);
    await page.mouse.up();

    const undoBtn = page.getByTestId('tool-undo');
    const redoBtn = page.getByTestId('tool-redo');

    await expect(undoBtn).toBeEnabled();
    await expect(redoBtn).toBeDisabled();

    // Click Undo
    await undoBtn.click();
    await expect(redoBtn).toBeEnabled();

    // Click Redo
    await redoBtn.click();
    await expect(redoBtn).toBeDisabled();
    await expect(undoBtn).toBeEnabled();
  });

  test('4. Eraser Size Selection and Smart Inspection Trigger', async ({ page }) => {
    const eraserBtn = page.getByTestId('tool-eraser');
    await eraserBtn.click(); // Select eraser
    await eraserBtn.click(); // Open size popover

    const fineSizeBtn = page.getByTitle(/Small Eraser/);
    await expect(fineSizeBtn).toBeVisible();
    await fineSizeBtn.click();

    // Verify eraser is in Fine mode
    await expect(eraserBtn).toContainText('S');

    // Test Inspect Button
    const inspectBtn = page.getByTestId('inspect-whiteboard-btn');
    await expect(inspectBtn).toBeVisible();
    await inspectBtn.click();

    // Status updates to Aristotle Reviewing...
    await expect(inspectBtn).toContainText(/Reviewing/);
  });

  test('5. Two-Way AI Laser Pointer: Real-time Coordinates & Visual Feedback Styles', async ({ page }) => {
    const laserPointer = page.getByTestId('ai-laser-pointer');

    // Initially, laser pointer should not be visible
    await expect(laserPointer).toBeHidden();

    // 1. Trigger glowing AI Laser Pointer at (45%, 35%) with label
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('ai-laser-point-test', {
          detail: {
            x: 45,
            y: 35,
            label: 'Notice this equation',
            style: 'laser',
          },
        })
      );
    });

    await expect(laserPointer).toBeVisible();
    await expect(laserPointer).toContainText('Notice this equation');

    // Verify percentage coordinates in inline style
    const styleAttr1 = await laserPointer.getAttribute('style');
    expect(styleAttr1).toContain('left: 45%');
    expect(styleAttr1).toContain('top: 35%');

    // 2. Trigger Checkmark Visual Feedback at (60%, 50%)
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('ai-laser-point-test', {
          detail: {
            x: 60,
            y: 50,
            label: 'Correct step ✓',
            style: 'check',
          },
        })
      );
    });

    await expect(laserPointer).toBeVisible();
    await expect(laserPointer).toContainText('Correct step ✓');
    const styleAttr2 = await laserPointer.getAttribute('style');
    expect(styleAttr2).toContain('left: 60%');
    expect(styleAttr2).toContain('top: 50%');

    // 3. Trigger Circle Visual Feedback at (30%, 70%)
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('ai-laser-point-test', {
          detail: {
            x: 30,
            y: 70,
            label: 'Check this calculation',
            style: 'circle',
          },
        })
      );
    });

    await expect(laserPointer).toBeVisible();
    await expect(laserPointer).toContainText('Check this calculation');
    const styleAttr3 = await laserPointer.getAttribute('style');
    expect(styleAttr3).toContain('left: 30%');
    expect(styleAttr3).toContain('top: 70%');

    // 4. Trigger Cross Visual Feedback at (75%, 25%)
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('ai-laser-point-test', {
          detail: {
            x: 75,
            y: 25,
            label: 'Sign mistake here',
            style: 'cross',
          },
        })
      );
    });

    await expect(laserPointer).toBeVisible();
    await expect(laserPointer).toContainText('Sign mistake here');
    const styleAttr4 = await laserPointer.getAttribute('style');
    expect(styleAttr4).toContain('left: 75%');
    expect(styleAttr4).toContain('top: 25%');

    // 5. Dismiss / Clear laser pointer
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ai-laser-point-test', { detail: null }));
    });
    await expect(laserPointer).toBeHidden();
  });

  test('6. Handwriting Canvas Drawing Auto-Saves to History and Restores Accurately', async ({ page }) => {
    // 1. Activate Pen and draw on the canvas
    const penBtn = page.getByTestId('tool-pen');
    await penBtn.click();

    const canvas = page.getByTestId('drawing-canvas-overlay');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    // Draw handwriting strokes (e.g. handwritten equation)
    await page.mouse.move(box.x + 80, box.y + 80);
    await page.mouse.down();
    await page.mouse.move(box.x + 130, box.y + 110);
    await page.mouse.move(box.x + 180, box.y + 90);
    await page.mouse.up();

    // Allow debounced auto-save to persist to localStorage (400ms debounce)
    await page.waitForTimeout(650);

    // 2. Verify localStorage has saved session with canvasSnapshot
    const savedSessions = await page.evaluate(() => {
      const raw = localStorage.getItem('aristotle_session_history_v1');
      return raw ? JSON.parse(raw) : [];
    });

    expect(savedSessions.length).toBeGreaterThan(0);
    const activeSession = savedSessions[0];
    expect(activeSession.canvasSnapshot).not.toBeNull();
    expect(activeSession.canvasSnapshot).toContain('data:image/png;base64');

    // 3. Open History Modal
    const historyBtn = page.getByTitle('Past Study Sessions');
    await expect(historyBtn).toBeVisible();
    await historyBtn.click();

    // Verify history drawer shows ink notes indicator
    const historyItem = page.getByTestId('session-history-item').first();
    await expect(historyItem).toBeVisible();
    await expect(historyItem).toContainText('Ink Notes');

    // 4. Start fresh session (clears canvas)
    const freshBtn = page.getByText('Start Fresh Session');
    await freshBtn.click();

    // 5. Open history again and restore the session
    await historyBtn.click();
    await historyItem.click();

    // Wait a brief moment for image to load onto canvas
    await page.waitForTimeout(500);

    // Verify canvas has non-empty pixel data restored
    const hasPixelData = await page.evaluate(() => {
      const c = document.querySelector('[data-testid="drawing-canvas-overlay"]');
      if (!c) return false;
      const ctx = c.getContext('2d');
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) return true;
      }
      return false;
    });

    expect(hasPixelData).toBe(true);
  });
});
