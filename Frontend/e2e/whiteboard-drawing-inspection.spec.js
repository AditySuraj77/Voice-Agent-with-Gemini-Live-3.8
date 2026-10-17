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

  test('5. Animated Diagram Engine & Marker Tip Presence', async ({ page }) => {
    // Verify overlay canvas is ready
    const canvas = page.getByTestId('drawing-canvas-overlay');
    await expect(canvas).toBeVisible();

    // Trigger synthetic animated diagram via window evaluation to simulate Gemini tool response
    await page.evaluate(() => {
      const event = new CustomEvent('ai-draw-diagram-test', {
        detail: {
          title: 'Pythagoras Triangle',
          elements: [
            { type: 'line', from: [20, 70], to: [70, 70], label: 'Base', color: '#1c1917' },
            { type: 'line', from: [20, 70], to: [20, 30], label: 'Height', color: '#1c1917' },
            { type: 'line', from: [20, 30], to: [70, 70], label: 'Hypotenuse', color: '#2563eb' },
          ],
        },
      });
      window.dispatchEvent(event);
    });

    // Check that Floating Diagram Title Banner appears
    const banner = page.getByTestId('animating-diagram-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });
    await expect(banner).toContainText('Pythagoras Triangle');

    // Check that Clear drawings button appears since AI drew on canvas
    const clearBtn = page.getByTestId('tool-clear-drawings');
    await expect(clearBtn).toBeVisible();

    // Check that Undo button is enabled
    const undoBtn = page.getByTestId('tool-undo');
    await expect(undoBtn).toBeEnabled();
  });
});
