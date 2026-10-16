import { test, expect } from '@playwright/test';

test.describe('E2E Verification: Live Browser SoM, Multi-Day History, and Direct Whiteboard Pen Overlay', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  });

  test('Feature 1: Direct Whiteboard In-Place Pen & Highlighter Overlay', async ({ page }) => {
    const whiteboard = page.getByTestId('direct-whiteboard');
    await expect(whiteboard).toBeVisible();

    // 1. Locate the Pen and Highlighter tool buttons in the action bar
    const penBtn = page.locator('button[title*="Pen: Draw steps"]');
    const highlightBtn = page.locator('button[title*="Highlighter: Highlight formulas"]');

    await expect(penBtn).toBeVisible();
    await expect(highlightBtn).toBeVisible();

    // 2. Click Pen tool to activate
    await penBtn.click();
    await expect(penBtn).toHaveClass(/bg-stone-900/);

    // 3. Locate the overlay canvas
    const canvas = page.locator('canvas.absolute.inset-0');
    await expect(canvas).toBeVisible();

    // 4. Simulate drawing a stroke on the whiteboard surface
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 3;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 60, startY + 40);
    await page.mouse.move(startX + 120, startY + 20);
    await page.mouse.up();

    // 5. Verify Eraser, Clear, and 'Check with Sir' appear after drawing
    const checkBtn = page.locator('button[title*="Gemini Teacher inspect"]');
    const clearBtn = page.locator('button[title*="Clear hand-drawn markings"]');
    const eraserBtn = page.locator('button[title*="Eraser: Erase drawings"]');

    await expect(checkBtn).toBeVisible();
    await expect(clearBtn).toBeVisible();
    await expect(eraserBtn).toBeVisible();

    // 6. Test 'Check with Sir' button click (triggers snapshot generation)
    await checkBtn.click();
    await expect(page.locator('text=Checking...')).toBeVisible();

    // Wait for inspect feedback state to settle
    await page.waitForTimeout(3200);

    // 7. Test Clear markings
    await clearBtn.click();
    await expect(checkBtn).not.toBeVisible();
  });

  test('Feature 2: Multi-Day Study Session History Drawer', async ({ page }) => {
    // 1. Locate the History button
    const historyBtn = page.locator('button[title="Past Study Sessions"]');
    await expect(historyBtn).toBeVisible();

    // 2. Open History Drawer
    await historyBtn.click();
    await expect(page.locator('text=Study Session History')).toBeVisible();
    await expect(page.locator('text=Start Fresh Session')).toBeVisible();

    // 3. Close Drawer
    const closeBtn = page.locator('div.relative.w-full.max-w-md button:has(svg.lucide-x)');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await expect(page.locator('text=Study Session History')).not.toBeVisible();
    }
  });

  test('Feature 3: Live Browser View & Set-of-Marks Badging', async ({ page }) => {
    // 1. Open Live Browser panel via top bar button
    const browserToggleBtn = page.locator('button[title="Toggle Live Voice Browser"]');
    await expect(browserToggleBtn).toBeVisible();
    await browserToggleBtn.click();

    // 2. Browser container should be visible on right side
    const browserViewer = page.locator('[data-testid="live-browser-viewer"]');
    await expect(browserViewer).toBeVisible({ timeout: 15000 });

    // 3. Verify Set-of-Marks Labels toggle button is present
    const labelsBtn = page.locator('button[title*="Set-of-Marks"]');
    await expect(labelsBtn).toBeVisible();

    // 4. Click to toggle Labels (turns on SoM element badging)
    await labelsBtn.click();
    await expect(labelsBtn).toContainText('Labels');

    // 5. Verify RAM Sleep & Active Status indicator in footer
    const statusBar = page.locator('[data-testid="live-browser-status-bar"]');
    await expect(statusBar).toBeVisible();
    await expect(statusBar).toContainText(/Active|Sleep/);
  });
});
