import { test, expect } from '@playwright/test';

test.describe('E2E Verification: Interactive Whiteboard Drawing & Multimodal Inspection', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  });

  test('1. Drawing Toolbar & Tools Presence: Pen, Highlight, Tick, Cross', async ({ page }) => {
    const whiteboard = page.getByTestId('direct-whiteboard');
    await expect(whiteboard).toBeVisible();

    const toolbar = page.getByTestId('drawing-toolbar');
    await expect(toolbar).toBeVisible();

    const penBtn = page.getByTestId('tool-pen');
    const highlightBtn = page.getByTestId('tool-highlighter');
    const tickBtn = page.getByTestId('tool-tick');
    const crossBtn = page.getByTestId('tool-cross');

    await expect(penBtn).toBeVisible();
    await expect(highlightBtn).toBeVisible();
    await expect(tickBtn).toBeVisible();
    await expect(crossBtn).toBeVisible();
  });

  test('2. Pen Activation and Freehand Drawing Interaction', async ({ page }) => {
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

    // Clear and Check buttons should appear after drawing
    const clearBtn = page.getByTestId('tool-clear-drawings');
    await expect(clearBtn).toBeVisible();

    const inspectBtn = page.getByTestId('inspect-whiteboard-btn');
    await expect(inspectBtn).toBeVisible();
    await expect(inspectBtn).toContainText('Check with Sir');
  });

  test('3. Quick Tick Stamp and Clear Functionality', async ({ page }) => {
    const tickBtn = page.getByTestId('tool-tick');
    await tickBtn.click();

    const canvas = page.getByTestId('drawing-canvas-overlay');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    // Click on canvas to stamp checkmark
    await page.mouse.click(box.x + 180, box.y + 150);

    // Verify clear button appears
    const clearBtn = page.getByTestId('tool-clear-drawings');
    await expect(clearBtn).toBeVisible();

    // Click clear to erase student markings
    await clearBtn.click();
    await expect(clearBtn).not.toBeVisible();
  });

  test('4. Inspect Snapshot Generation does not crash', async ({ page }) => {
    // Select pen and draw
    const penBtn = page.getByTestId('tool-pen');
    await penBtn.click();

    const canvas = page.getByTestId('drawing-canvas-overlay');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.move(box.x + 120, box.y + 120);
    await page.mouse.down();
    await page.mouse.move(box.x + 160, box.y + 160);
    await page.mouse.up();

    const inspectBtn = page.getByTestId('inspect-whiteboard-btn');
    await expect(inspectBtn).toBeVisible();

    // Click Check with Sir
    await inspectBtn.click();

    // Inspect status changes to Sir is Checking...
    await expect(inspectBtn).toContainText(/Checking/);
  });
});
