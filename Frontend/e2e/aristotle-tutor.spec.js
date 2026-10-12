import { test, expect } from '@playwright/test';

test.describe('Aristotle AI Voice & Whiteboard Tutor E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load page with Aristotle branding and default Arithmetic whiteboard', async ({ page }) => {
    // Verify Page Title
    await expect(page).toHaveTitle(/Aristotle/);

    // Verify Brand Header
    await expect(page.locator('header')).toContainText('Aristotle');
    await expect(page.locator('header')).toContainText('Live Tutor');

    // Verify Whiteboard Canvas
    const canvas = page.getByTestId('whiteboard-canvas');
    await expect(canvas).toBeVisible();
    await expect(canvas).toContainText("Today's Focus");
    await expect(canvas).toContainText('Expanded Form & Place Values');

    // Verify Mascot is present
    const mascot = page.getByTestId('mascot-avatar');
    await expect(mascot).toBeVisible();

    // Verify Mastery Sidebar
    await expect(page.locator('aside')).toContainText('Mastery');
    await expect(page.locator('aside')).toContainText("Today's Focus");
  });

  test('should switch subject to Chemistry and display Particle Diagrams', async ({ page }) => {
    // Click on Chemistry subject tab
    await page.getByRole('button', { name: 'Chemistry' }).click();

    // Verify Whiteboard updates to Chemistry States of Matter
    const canvas = page.getByTestId('whiteboard-canvas');
    await expect(canvas).toContainText('Chemistry');
    await expect(canvas).toContainText('States of Matter');

    // Verify Particle Diagram is rendered
    const diagram = page.getByTestId('particle-diagram');
    await expect(diagram).toBeVisible();
    await expect(diagram).toContainText('Solid (Ice)');
    await expect(diagram).toContainText('Liquid (Water)');
    await expect(diagram).toContainText('Gas (Water Vapor)');
  });

  test('should switch subject to Computer Science and render Interactive Code Sandbox', async ({ page }) => {
    // Click on Computer Science subject tab
    await page.getByRole('button', { name: 'Computer Science' }).click();

    // Verify Whiteboard updates to Computer Science
    const canvas = page.getByTestId('whiteboard-canvas');
    await expect(canvas).toContainText('Computer Science');

    // Verify Code Sandbox
    const codeSandbox = page.getByTestId('code-sandbox');
    await expect(codeSandbox).toBeVisible();
    await expect(codeSandbox).toContainText("Adi's For Loop Example");
    await expect(codeSandbox).toContainText('for i in range(0, 10):');

    // Test Run button inside Code Sandbox
    const runButton = codeSandbox.getByRole('button', { name: 'Run' });
    await expect(runButton).toBeVisible();
    await runButton.click();
    await expect(codeSandbox).toContainText('Output:');
  });

  test('should allow text message submission via floating controls bar', async ({ page }) => {
    const input = page.getByPlaceholder(/Type to Aristotle/);
    await expect(input).toBeVisible();

    await input.fill('Can you explain variables in Python?');
    await page.locator('button[title="Send to Aristotle"]').click();

    // Verify Speech bubble displays user message
    const speechBubble = page.getByTestId('live-speech-bubble');
    await expect(speechBubble).toContainText('Can you explain variables in Python?');
  });
});
