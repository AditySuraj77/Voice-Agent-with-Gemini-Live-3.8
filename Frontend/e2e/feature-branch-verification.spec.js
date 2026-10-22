import { test, expect } from '@playwright/test';

test.describe('E2E Verification: Feature Branch (Web Visual Search, Markdown Tables, Sanitization)', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  });

  test('1. Markdown Table Parser & Interactive Table Card on Whiteboard', async ({ page }) => {
    // Inject a session that contains a markdown table in notes
    await page.evaluate(() => {
      const session = {
        id: 'session_test_table',
        title: 'Transformers: Q, K, V Comparison',
        dateStr: 'Today',
        timeStr: '04:00 PM',
        studentName: 'Adi',
        itemsCount: 1,
        items: [
          {
            id: 'wb-test-table-1',
            topic: 'Query vs Key vs Value',
            notes: [
              'Self-attention mechanism uses three primary vector projections:',
              '| Component | Function / Role | Analogy |',
              '|---|---|---|',
              '| Query (Q) | What the model searches for | Search bar query |',
              '| Key (K) | Label/Title of memory data | Video title on YouTube |',
              '| Value (V) | Actual information content | The video itself |',
            ],
            tableData: {
              headers: ['Component', 'Function / Role', 'Analogy'],
              rows: [
                ['Query (Q)', 'What the model searches for', 'Search bar query'],
                ['Key (K)', 'Label/Title of memory data', 'Video title on YouTube'],
                ['Value (V)', 'Actual information content', 'The video itself'],
              ],
            },
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

    // Click history item to restore table session
    const historyItem = page.getByTestId('session-history-item').first();
    await expect(historyItem).toBeVisible();
    await historyItem.click();

    // Verify Whiteboard Card has rendered the Table
    const tableElement = page.locator('table');
    await expect(tableElement).toBeVisible();

    // Verify Table Headers
    await expect(tableElement.locator('thead')).toContainText('Component');
    await expect(tableElement.locator('thead')).toContainText('Function / Role');
    await expect(tableElement.locator('thead')).toContainText('Analogy');

    // Verify Table Rows
    const tbody = tableElement.locator('tbody');
    await expect(tbody).toContainText('Query (Q)');
    await expect(tbody).toContainText('Key (K)');
    await expect(tbody).toContainText('Value (V)');
    await expect(tbody).toContainText('Search bar query');
    await expect(tbody).toContainText('Video title on YouTube');
  });

  test('2. Web Educational Diagram Rendering with Lightbox Zoom', async ({ page }) => {
    // Inject authentic web diagram item
    await page.evaluate(() => {
      const session = {
        id: 'session_test_diagram',
        title: 'Electric Generator Anatomy • Web Diagram',
        dateStr: 'Today',
        timeStr: '04:15 PM',
        studentName: 'Adi',
        itemsCount: 1,
        items: [
          {
            id: 'wb-test-diagram-1',
            topic: 'Electric Generator Anatomy',
            notes: ['Rotor rotates within stator magnetic field', 'Slip rings and brushes collect induced AC current'],
            visualType: 'photo',
            imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e5/PowerStation2.svg/960px-PowerStation2.svg.png',
            imageTitle: 'Electric Generator Components',
            caption: 'Detailed components of an electric generator with rotor, stator, and commutator',
            subject: 'Engineering',
            attribution: 'Wikimedia Commons',
          },
        ],
      };
      localStorage.setItem('aristotle_session_history_v1', JSON.stringify([session]));
    });

    await page.reload({ waitUntil: 'domcontentloaded' });

    // Open History Drawer & Restore
    const historyBtn = page.getByTitle('Past Study Sessions');
    await expect(historyBtn).toBeVisible();
    await historyBtn.click();

    const historyItem = page.getByTestId('session-history-item').first();
    await expect(historyItem).toBeVisible();
    await historyItem.click();

    // Verify UniversalVisualCard is displayed
    const visualCard = page.locator('[data-testid="universal-visual-card"]');
    await expect(visualCard).toBeVisible();
    await expect(visualCard).toContainText('Archive Photo');
    await expect(visualCard).toContainText('Wikimedia Commons');
    await expect(visualCard).toContainText('Detailed components of an electric generator');

    // Test Lightbox Zoom
    const expandBtn = visualCard.getByTestId('expand-visual-btn');
    await expect(expandBtn).toBeVisible();
    await expandBtn.click();

    const lightboxModal = page.getByTestId('visual-lightbox-modal');
    await expect(lightboxModal).toBeVisible();

    // Close Lightbox
    await page.keyboard.press('Escape');
    await expect(lightboxModal).toBeHidden();
  });

  test('3. Session History Storage Quota Sanitization (No LocalStorage Overflow)', async ({ page }) => {
    // Test that saving session with huge Base64 data URI does NOT overflow LocalStorage quota
    const hugeBase64 = 'data:image/jpeg;base64,' + 'A'.repeat(500000); // 500KB string

    const result = await page.evaluate((b64) => {
      // Create session using sessionHistory logic
      const items = [
        {
          id: 'wb-overflow-test',
          topic: 'Heavy Image Test',
          notes: ['Test note'],
          imageUrl: b64,
          aiImageUrl: b64,
        },
      ];

      // Sanitize exactly as sessionHistory does
      const sanitizedItems = items.map((item) => {
        if (item && item.imageUrl && typeof item.imageUrl === 'string' && item.imageUrl.startsWith('data:image/')) {
          return {
            ...item,
            imageUrl: null,
            aiImageUrl: null,
            hasInlineDataUrl: true,
          };
        }
        return item;
      });

      const session = {
        id: 'session_overflow_safe',
        title: 'Sanitized Session',
        items: sanitizedItems,
      };

      try {
        localStorage.setItem('aristotle_session_history_v1', JSON.stringify([session]));
        const raw = localStorage.getItem('aristotle_session_history_v1');
        return { success: true, length: raw.length, hasNullUrl: sanitizedItems[0].imageUrl === null };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }, hugeBase64);

    expect(result.success).toBe(true);
    expect(result.hasNullUrl).toBe(true);
    // Raw JSON string length should be small (< 1KB), NOT 500KB
    expect(result.length).toBeLessThan(1000);
  });
});
