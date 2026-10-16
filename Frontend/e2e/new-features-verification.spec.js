import { test, expect } from '@playwright/test';

test.describe('E2E Verification: Live Browser SoM and Multi-Day History', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
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
