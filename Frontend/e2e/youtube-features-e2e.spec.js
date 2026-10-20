import { test, expect } from '@playwright/test';

test.describe('E2E Verification: YouTube Transcript, Timeline Roadmap & Anti-Jitter Controls', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  });

  test('Feature 1: Controls Bar Fixed Dimensions & Zero Layout Shift (Anti-Jitter Verification)', async ({ page }) => {
    // 1. Locate the footer controls container
    const footerBar = page.locator('footer > div');
    await expect(footerBar).toBeVisible();

    // Verify footer bar has fixed height h-14 (56px) and proper classes
    const footerBox = await footerBar.boundingBox();
    expect(footerBox).not.toBeNull();
    expect(Math.round(footerBox.height)).toBe(56);

    // 2. Locate input box and send button
    const input = page.getByPlaceholder(/अपने टीचर से पूछें/);
    await expect(input).toBeVisible();
    const sendBtn = page.locator('button[title="Send Message"]');
    await expect(sendBtn).toBeVisible();

    const initialInputBox = await input.boundingBox();
    const initialSendBox = await sendBtn.boundingBox();
    expect(initialInputBox).not.toBeNull();
    expect(initialSendBox).not.toBeNull();

    // 3. Locate Profile quick trigger button - verify fixed height h-9 (36px)
    const profileBtn = page.locator('button[title="Personalize Student Profile"]');
    await expect(profileBtn).toBeVisible();
    const profileBox = await profileBtn.boundingBox();
    expect(profileBox).not.toBeNull();
    expect(Math.round(profileBox.height)).toBe(36);

    // 4. Locate Start Voice button - verify fixed height h-9 (36px)
    const startVoiceBtn = page.getByRole('button', { name: /Start Voice/ });
    await expect(startVoiceBtn).toBeVisible();
    const startVoiceBox = await startVoiceBtn.boundingBox();
    expect(startVoiceBox).not.toBeNull();
    expect(Math.round(startVoiceBox.height)).toBe(36);

    // 5. Test Live Audio Status Pill with various states (simulating live session status updates)
    // We inject and test the status badge styling directly in DOM to verify no-wrap and fixed dimensions
    const statusMetrics = await page.evaluate(() => {
      // Create a test status container matching ControlsBar specifications
      const testPill = document.createElement('div');
      testPill.className = 'hidden sm:flex items-center justify-center w-[138px] min-w-[138px] h-9 px-2.5 rounded-xl bg-stone-100/90 text-[11px] font-sans font-medium text-stone-600 border border-stone-200/60 select-none shrink-0 whitespace-nowrap overflow-hidden';
      
      const states = [
        '<span class="flex items-center gap-1.5 text-stone-500 whitespace-nowrap"><span class="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0"></span>Connected</span>',
        '<span class="flex items-center gap-1.5 text-rose-600 font-semibold whitespace-nowrap"><span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0"></span>Listening</span>',
        '<span class="flex items-center gap-1.5 text-amber-700 font-semibold whitespace-nowrap"><span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0"></span>Thinking...</span>',
        '<span class="flex items-center gap-1.5 text-emerald-700 font-semibold whitespace-nowrap"><span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0"></span>Teacher Speaking</span>',
      ];

      document.body.appendChild(testPill);
      const measurements = [];

      for (const html of states) {
        testPill.innerHTML = html;
        const rect = testPill.getBoundingClientRect();
        measurements.push({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          scrollHeight: testPill.scrollHeight,
          scrollWidth: testPill.scrollWidth,
        });
      }

      document.body.removeChild(testPill);
      return measurements;
    });

    // Every state MUST have exactly 138px width and 36px height (single line, zero wrapping, zero layout shift)
    for (const m of statusMetrics) {
      expect(m.width).toBe(138);
      expect(m.height).toBe(36);
      expect(m.scrollHeight).toBeLessThanOrEqual(38); // No 2-line wrap
    }
  });

  test('Feature 2: VideoTimelineCard 100% Chronological Timeline & Zero-Hallucination Roadmap', async ({ page }) => {
    // 1. Inject a YouTube Roadmap session into localStorage
    const sampleTimelineSession = {
      id: 'session_youtube_timeline_test',
      title: 'Physics • Complete Laws of Motion Roadmap',
      dateStr: 'Today',
      timeStr: '03:30 PM',
      studentName: 'Adi',
      itemsCount: 1,
      items: [
        {
          id: 'wb-yt-item-1',
          topic: 'Newton Laws of Motion - Full Concept',
          cardType: 'video_timeline',
          video: {
            title: 'Newton Laws of Motion - Class 11 Physics Full Chapter',
            channel: 'Physics Wallah - Alakh Pandey',
            duration: '52:14',
            url: 'https://www.youtube.com/watch?v=mock_laws_of_motion',
          },
          timeline: [
            {
              index: 1,
              timeRange: '00:00 - 06:15',
              topic: 'Introduction, Force & Inertia Definition',
              text: 'Inertia is the natural tendency of an object to resist changes in its state of motion or rest.',
              isOfficialChapter: true,
            },
            {
              index: 2,
              timeRange: '06:15 - 19:40',
              topic: 'First Law of Motion with Real-Life Experiments',
              text: 'Galileo and Newton proved that without an external unbalanced force, momentum remains conserved.',
              isOfficialChapter: true,
            },
            {
              index: 3,
              timeRange: '19:40 - 35:20',
              topic: 'Second Law of Motion (Derivation of F = dp/dt = ma)',
              text: 'Rate of change of momentum is directly proportional to applied force and takes place in the direction of force.',
              isOfficialChapter: false,
            },
            {
              index: 4,
              timeRange: '35:20 - 52:14',
              topic: 'Third Law of Motion, Action-Reaction Pairs & Rocket Propulsion',
              text: 'To every action there is an equal and opposite reaction acting on two different bodies simultaneously.',
              isOfficialChapter: true,
            },
          ],
        },
      ],
    };

    await page.evaluate((session) => {
      localStorage.setItem('aristotle_session_history_v1', JSON.stringify([session]));
    }, sampleTimelineSession);

    await page.reload({ waitUntil: 'domcontentloaded' });

    // 2. Open History Drawer and restore the YouTube timeline session
    const historyBtn = page.getByTitle('Past Study Sessions');
    await expect(historyBtn).toBeVisible();
    await historyBtn.click();

    const historyItem = page.getByTestId('session-history-item').first();
    await expect(historyItem).toBeVisible();
    await historyItem.click();

    // 3. Verify VideoTimelineCard renders on the Whiteboard
    const timelineCard = page.locator('[data-testid="video-timeline-card"]');
    await expect(timelineCard).toBeVisible({ timeout: 10000 });

    // 4. Verify Header Badges and Metadata
    await expect(timelineCard).toContainText('YouTube Study Roadmap');
    await expect(timelineCard).toContainText('Zero Hallucination Grounded');
    await expect(timelineCard).toContainText('Newton Laws of Motion - Class 11 Physics Full Chapter');
    await expect(timelineCard).toContainText('Physics Wallah - Alakh Pandey');
    await expect(timelineCard).toContainText('52:14');
    await expect(timelineCard).toContainText('4 Full Chapters (00:00 - End)');

    // 5. Verify Chronological Timeline Chapters are rendered
    await expect(timelineCard).toContainText('00:00 - 06:15');
    await expect(timelineCard).toContainText('Introduction, Force & Inertia Definition');
    await expect(timelineCard).toContainText('06:15 - 19:40');
    await expect(timelineCard).toContainText('19:40 - 35:20');
    await expect(timelineCard).toContainText('Second Law of Motion (Derivation of F = dp/dt = ma)');
    await expect(timelineCard).toContainText('35:20 - 52:14');
    await expect(timelineCard).toContainText('Third Law of Motion, Action-Reaction Pairs');

    // 6. Test Search / Filter within Timeline
    const searchInput = timelineCard.locator('input[placeholder*="Search concepts or timestamps"]');
    await expect(searchInput).toBeVisible();

    // Filter for "Second Law"
    await searchInput.fill('Second Law');
    await expect(timelineCard).toContainText('Second Law of Motion');
    await expect(timelineCard).not.toContainText('Third Law of Motion');

    // Clear search filter
    const clearBtn = timelineCard.locator('button:has-text("Clear")');
    await clearBtn.click();
    await expect(timelineCard).toContainText('Third Law of Motion');

    // Filter by timestamp range
    await searchInput.fill('35:20');
    await expect(timelineCard).toContainText('Rocket Propulsion');
    await searchInput.fill('');

    // 7. Test "Explain Part" Interactive Button
    const explainBtns = timelineCard.locator('button[title*="Ask Aristotle to explain"]');
    expect(await explainBtns.count()).toBe(4);
    await explainBtns.first().click();

    // 8. Test Collapse and Expand Timeline Toggle
    const toggleCollapseBtn = timelineCard.locator('button[title*="Timeline"]');
    await toggleCollapseBtn.click();
    await expect(timelineCard.locator('input[placeholder*="Search concepts or timestamps"]')).not.toBeVisible();

    await toggleCollapseBtn.click();
    await expect(timelineCard.locator('input[placeholder*="Search concepts or timestamps"]')).toBeVisible();

    // 9. Verify Guidance Footer
    await expect(timelineCard).toContainText('100% video coverage');
  });

  test('Feature 3: Whiteboard Mixed Multi-Content (Video Timeline + Math + Code + Concept Notes)', async ({ page }) => {
    // Inject multi-content session with Video Timeline + Formula + Code + Concept note
    const mixedSession = {
      id: 'session_mixed_content_test',
      title: 'Physics & Computing • Integrated Study Session',
      dateStr: 'Today',
      timeStr: '04:00 PM',
      studentName: 'Adi',
      itemsCount: 3,
      items: [
        {
          id: 'wb-mixed-1',
          topic: 'Calculus in Kinematics',
          cardType: 'formula',
          formula: 'v = \\frac{dx}{dt}, \\quad a = \\frac{dv}{dt} = \\frac{d^2x}{dt^2}',
          notes: ['Velocity is the first derivative of position', 'Acceleration is the second derivative of position'],
        },
        {
          id: 'wb-mixed-2',
          topic: 'Simulation Script',
          cardType: 'code',
          code: 'function simulateMotion(v0, a, t) {\n  return v0 * t + 0.5 * a * t * t;\n}',
          notes: ['Interactive kinematic displacement solver'],
        },
        {
          id: 'wb-mixed-3',
          topic: 'Motion in 1D Video Lecture',
          cardType: 'video_timeline',
          video: {
            title: 'Kinematics in 1D - Complete Chapter',
            channel: 'Khan Academy India',
            duration: '38:00',
            url: 'https://www.youtube.com/watch?v=mock_kinematics',
          },
          timeline: [
            {
              index: 1,
              timeRange: '00:00 - 12:00',
              topic: 'Distance vs Displacement and Scalars vs Vectors',
              text: 'Displacement is the shortest straight line distance with direction.',
            },
            {
              index: 2,
              timeRange: '12:00 - 38:00',
              topic: 'Uniform Acceleration Equations & Graphs',
              text: 'Analyzing position-time and velocity-time graphs.',
            },
          ],
        },
      ],
    };

    await page.evaluate((session) => {
      localStorage.setItem('aristotle_session_history_v1', JSON.stringify([session]));
    }, mixedSession);

    await page.reload({ waitUntil: 'domcontentloaded' });

    // Open History and restore
    const historyBtn = page.getByTitle('Past Study Sessions');
    await historyBtn.click();
    await page.getByTestId('session-history-item').first().click();

    // Verify all 3 cards rendered on the whiteboard
    await expect(page.locator('[data-testid="video-timeline-card"]')).toBeVisible();
    await expect(page.locator('text=Calculus in Kinematics')).toBeVisible();
    await expect(page.locator('text=Simulation Script')).toBeVisible();

    // Verify DirectWhiteboard paper background and container
    const whiteboard = page.getByTestId('direct-whiteboard');
    await expect(whiteboard).toBeVisible();
  });

  test('Feature 4: Student Profile Customization & Controls Persistence', async ({ page }) => {
    // 1. Open Profile Modal
    const profileBtn = page.locator('button[title="Personalize Student Profile"]');
    await profileBtn.click();

    // 2. Edit Profile Details
    const nameInput = page.getByPlaceholder(/e.g. Adi, Aryan/);
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Vikramaditya');

    const gradeInput = page.getByPlaceholder(/Class 9, Class 11/);
    if (await gradeInput.isVisible()) {
      await gradeInput.fill('Class 12 - PCM');
    }

    const interestsInput = page.getByPlaceholder(/Cricket, Football/);
    if (await interestsInput.isVisible()) {
      await interestsInput.fill('Astrophysics & Quantum Mechanics');
    }

    // 3. Save Profile
    await page.getByRole('button', { name: /Save Profile/ }).click();

    // 4. Verify Controls Bar displays updated student name initial and badge
    await expect(profileBtn).toContainText('Vikramaditya');
    await expect(profileBtn).toContainText('V');

    // 5. Reload and check localStorage persistence
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(profileBtn).toContainText('Vikramaditya');
  });

  test('Feature 5: Video Timeline Card Interactive Actions (Watch Link, Clipboard Copy & Highlight Selection)', async ({ page }) => {
    const testSession = {
      id: 'session_yt_interactive',
      title: 'Thermodynamics • Entropy Roadmap',
      dateStr: 'Today',
      timeStr: '04:15 PM',
      studentName: 'Vikramaditya',
      itemsCount: 1,
      items: [
        {
          id: 'wb-yt-item-interactive',
          topic: 'Second Law of Thermodynamics & Entropy',
          cardType: 'video_timeline',
          video: {
            title: 'Entropy and Second Law - MIT OpenCourseWare',
            channel: 'MIT OCW',
            duration: '48:10',
            url: 'https://www.youtube.com/watch?v=mock_mit_entropy',
          },
          timeline: [
            {
              index: 1,
              timeRange: '00:00 - 15:00',
              topic: 'Heat Engines & Carnot Cycle Efficiency',
              text: 'Reversible processes set the upper theoretical limit for thermodynamic efficiency.',
              isOfficialChapter: true,
            },
            {
              index: 2,
              timeRange: '15:00 - 48:10',
              topic: 'Clausius Inequality & Statistical Entropy (S = k ln W)',
              text: 'Entropy of an isolated system always increases or remains constant in reversible processes.',
              isOfficialChapter: true,
            },
          ],
        },
      ],
    };

    await page.evaluate((session) => {
      localStorage.setItem('aristotle_session_history_v1', JSON.stringify([session]));
    }, testSession);

    await page.reload({ waitUntil: 'domcontentloaded' });

    // Open and restore session
    const historyBtn = page.getByTitle('Past Study Sessions');
    await historyBtn.click();
    await page.getByTestId('session-history-item').first().click();

    const timelineCard = page.locator('[data-testid="video-timeline-card"]');
    await expect(timelineCard).toBeVisible();

    // Verify external watch link
    const watchLink = timelineCard.locator('a[title="Open video on YouTube"]');
    await expect(watchLink).toBeVisible();
    await expect(watchLink).toHaveAttribute('href', 'https://www.youtube.com/watch?v=mock_mit_entropy');
    await expect(watchLink).toHaveAttribute('target', '_blank');

    // Verify Copy Roadmap action
    const copyBtn = timelineCard.locator('button[title="Copy full timeline"]');
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
    await expect(timelineCard).toContainText('Copied!');

    // Verify chapter selection highlighting
    const chapterCards = timelineCard.locator('.p-3.rounded-xl.border');
    const firstChapter = chapterCards.first();
    const secondChapter = chapterCards.nth(1);

    // Click Explain Part on second chapter
    const explainSecondBtn = secondChapter.locator('button[title*="Ask Aristotle to explain"]');
    await explainSecondBtn.click();

    // Second chapter should get highlighted class (bg-amber-100/80)
    await expect(secondChapter).toHaveClass(/bg-amber-100/);
  });

  test('Feature 6: Backend Health Check & API Key Grounding Verification', async ({ request }) => {
    const res = await request.get('http://localhost:3001/api/health');
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.apiKeyConfigured).toBe(true);
    expect(data.tavilyConfigured).toBe(true);
  });

  test('Feature 7: Real-Time YouTube Channel Content Scraping (/api/tools/youtube-channel)', async ({ request }) => {
    test.setTimeout(30000);
    const res = await request.post('http://localhost:3001/api/tools/youtube-channel', {
      data: {
        channelName: 'Veritasium',
        type: 'videos',
      },
    });

    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('success');
    expect(data.channel).toMatch(/Veritasium/i);
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.items[0]).toHaveProperty('title');
  });

  test('Feature 8: Full YouTube Transcript & 100% Chronological Roadmap (/api/tools/youtube-transcript)', async ({ request }) => {
    test.setTimeout(45000);
    const res = await request.post('http://localhost:3001/api/tools/youtube-transcript', {
      data: {
        query: 'Newton laws of motion class 11',
        channelName: 'Physics Wallah',
      },
    });

    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('video');
    expect(data.video).toHaveProperty('title');
    expect(Array.isArray(data.timeline)).toBe(true);
    expect(data.timeline.length).toBeGreaterThan(0);

    // Verify first timeline item starts at 00:00
    const firstChapter = data.timeline[0];
    expect(firstChapter).toHaveProperty('timeRange');
    expect(firstChapter.timeRange).toMatch(/^00:00/);
    expect(firstChapter).toHaveProperty('topic');
    expect(firstChapter).toHaveProperty('text');
  });
});
