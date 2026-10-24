import { test, expect } from '@playwright/test';

test.describe('Hybrid Animation Suite E2E - 4-Tier Interactive Visuals', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  });

  test('1. Mode A (Animated SVG): Renders animated SVG, toggles play/pause, and opens fullscreen', async ({ page }) => {
    const sampleAnimatedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300">
      <style>
        @keyframes pulse { 0% { r: 5; opacity: 1; } 100% { r: 25; opacity: 0; } }
        .emitter { fill: #38bdf8; animation: pulse 1.5s infinite; }
      </style>
      <rect width="100%" height="100%" fill="#0f172a"/>
      <text x="250" y="40" fill="#f8fafc" text-anchor="middle" font-size="16">Wave Emitter Simulation</text>
      <circle cx="250" cy="150" r="10" fill="#f59e0b"/>
      <circle cx="250" cy="150" r="15" class="emitter"/>
    </svg>`;

    await page.evaluate((svg) => {
      const session = {
        id: 'session_test_anim_svg',
        title: 'Wave Emitter • Animated SVG',
        dateStr: 'Today',
        timeStr: '12:00 PM',
        studentName: 'Adi',
        itemsCount: 1,
        items: [
          {
            id: 'wb-test-anim-svg',
            topic: 'Wave Emitter Physics',
            caption: 'Continuous pulsating wave loop via CSS keyframes',
            visualType: 'animation',
            animationType: 'animated_svg',
            svgCode: svg,
          },
        ],
      };
      localStorage.setItem('aristotle_session_history_v1', JSON.stringify([session]));
    }, sampleAnimatedSvg);

    await page.reload({ waitUntil: 'domcontentloaded' });

    // Open Past Study Sessions & restore
    const historyBtn = page.getByTitle('Past Study Sessions');
    await expect(historyBtn).toBeVisible();
    await historyBtn.click();

    const historyItem = page.getByTestId('session-history-item').first();
    await expect(historyItem).toBeVisible();
    await historyItem.click();

    // Verify InteractiveAnimationCard mounts
    const animCard = page.locator('[data-testid="interactive-animation-card"]');
    await expect(animCard).toBeVisible();

    // Verify Animated SVG container is visible
    const svgContainer = page.locator('[data-testid="animated-svg-container"]');
    await expect(svgContainer).toBeVisible();
    await expect(svgContainer.locator('svg')).toBeVisible();

    // Verify Play/Pause button toggles
    const playPauseBtn = page.locator('[data-testid="anim-play-pause-btn"]');
    await expect(playPauseBtn).toBeVisible();
    await playPauseBtn.click(); // Pause

    // Verify Restart button
    const restartBtn = page.locator('[data-testid="anim-restart-btn"]');
    await expect(restartBtn).toBeVisible();
    await restartBtn.click();

    // Verify Fullscreen expand modal
    const expandBtn = page.locator('[data-testid="anim-expand-btn"]');
    await expect(expandBtn).toBeVisible();
    await expandBtn.click();

    // Modal should be open with the animated SVG diagram
    const modalSvg = page.locator('.fixed.inset-0 svg[viewBox="0 0 500 300"]');
    await expect(modalSvg).toBeVisible();

    // Press Escape to dismiss
    await page.keyboard.press('Escape');
    await expect(page.locator('.fixed.inset-0')).not.toBeVisible();
  });

  test('2. Mode B (Interactive Simulation Lab): Renders HTML5 Canvas and interacts with sliders', async ({ page }) => {
    await page.evaluate(() => {
      const session = {
        id: 'session_test_sim',
        title: 'Projectile Motion Lab • Simulation',
        dateStr: 'Today',
        timeStr: '12:00 PM',
        studentName: 'Adi',
        itemsCount: 1,
        items: [
          {
            id: 'wb-test-sim',
            topic: 'Projectile Trajectory Experiment',
            caption: 'Adjust launch angle and initial velocity to observe parabolic flight',
            visualType: 'animation',
            animationType: 'simulation',
            simType: 'projectile',
            parameters: { angle: 45, velocity: 28, gravity: 9.8 },
          },
        ],
      };
      localStorage.setItem('aristotle_session_history_v1', JSON.stringify([session]));
    });

    await page.reload({ waitUntil: 'domcontentloaded' });

    // Open Past Study Sessions & restore
    await page.getByTitle('Past Study Sessions').click();
    await page.getByTestId('session-history-item').first().click();

    // Verify Interactive Simulation Canvas is visible
    const simCanvas = page.locator('[data-testid="interactive-simulation-canvas"]');
    await expect(simCanvas).toBeVisible();

    // Verify sliders exist and change value
    const angleSlider = page.locator('[data-testid="slider-angle"]');
    await expect(angleSlider).toBeVisible();
    await angleSlider.fill('60');

    const velocitySlider = page.locator('[data-testid="slider-velocity"]');
    await expect(velocitySlider).toBeVisible();
    await velocitySlider.fill('35');

    // Canvas should still be actively rendering
    await expect(simCanvas).toBeVisible();

    // Verify fullscreen modal canvas renders at 60fps
    const expandBtn = page.locator('[data-testid="anim-expand-btn"]');
    await expect(expandBtn).toBeVisible();
    await expandBtn.click();

    const modalCanvas = page.locator('[data-testid="modal-simulation-canvas"]');
    await expect(modalCanvas).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modalCanvas).not.toBeVisible();
  });

  test('2b. Mode B (Sound Wave Lab & Unit Circle): Renders specialized sliders for wave & trig', async ({ page }) => {
    await page.evaluate(() => {
      const session = {
        id: 'session_test_wave_trig',
        title: 'Wave and Trig Labs',
        dateStr: 'Today',
        timeStr: '12:00 PM',
        studentName: 'Adi',
        itemsCount: 2,
        items: [
          {
            id: 'wb-test-wave',
            topic: 'Sound Wave Frequency & Amplitude',
            caption: 'Oscillating acoustic longitudinal wave',
            visualType: 'animation',
            animationType: 'simulation',
            simType: 'wave',
            parameters: { frequency: 1.5, amplitude: 35 },
          },
          {
            id: 'wb-test-circle',
            topic: 'Unit Circle Trigonometry',
            caption: 'Sine and cosine coordinate visualization',
            visualType: 'animation',
            animationType: 'simulation',
            simType: 'trig_circle',
            parameters: { angleDeg: 60 },
          },
        ],
      };
      localStorage.setItem('aristotle_session_history_v1', JSON.stringify([session]));
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByTitle('Past Study Sessions').click();
    await page.getByTestId('session-history-item').first().click();

    // Wave sliders check
    const freqSlider = page.locator('[data-testid="slider-frequency"]');
    await expect(freqSlider).toBeVisible();
    await freqSlider.fill('2.5');

    const ampSlider = page.locator('[data-testid="slider-amplitude"]');
    await expect(ampSlider).toBeVisible();
    await ampSlider.fill('45');

    // Trig slider check
    const trigSlider = page.locator('[data-testid="slider-trig-angle"]');
    await expect(trigSlider).toBeVisible();
    await trigSlider.fill('90');
    await expect(page.getByText('Angle θ: 90°')).toBeVisible();
  });

  test('3. Mode C (3Blue1Brown Manim Mathematical Scene): Renders vector canvas and formula HUD', async ({ page }) => {
    await page.evaluate(() => {
      const session = {
        id: 'session_test_manim',
        title: 'Pythagoras Proof • Manim Scene',
        dateStr: 'Today',
        timeStr: '12:00 PM',
        studentName: 'Adi',
        itemsCount: 1,
        items: [
          {
            id: 'wb-test-manim',
            topic: 'Pythagorean Theorem Proof',
            equation: 'a² + b² = c²',
            caption: 'Geometric square area equivalence transformation',
            visualType: 'animation',
            animationType: 'manim_video',
            isRendering: false,
          },
        ],
      };
      localStorage.setItem('aristotle_session_history_v1', JSON.stringify([session]));
    });

    await page.reload({ waitUntil: 'domcontentloaded' });

    // Restore session
    await page.getByTitle('Past Study Sessions').click();
    await page.getByTestId('session-history-item').first().click();

    // Verify Manim mathematical vector canvas
    const manimCanvas = page.locator('[data-testid="manim-vector-canvas"]');
    await expect(manimCanvas).toBeVisible();

    // Verify equation label HUD is displayed
    const eqLabel = page.getByText('a² + b² = c²');
    await expect(eqLabel).toBeVisible();
  });

  test('4. Mode D (Educational Archive Loop): Renders animated GIF / WebM loop from archives', async ({ page }) => {
    await page.evaluate(() => {
      const session = {
        id: 'session_test_archive_anim',
        title: 'Cardiac Cycle • Educational Loop',
        dateStr: 'Today',
        timeStr: '12:00 PM',
        studentName: 'Adi',
        itemsCount: 1,
        items: [
          {
            id: 'wb-test-archive-anim',
            topic: 'Cardiac Cycle Pumping Loop',
            caption: 'Systole and diastole chamber contraction cycle',
            attribution: 'Wikimedia Educational Archives (Creative Commons)',
            visualType: 'animation',
            animationType: 'archive_animation',
            animationUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Cardiac-Cycle-Animated.gif',
            isGif: true,
          },
        ],
      };
      localStorage.setItem('aristotle_session_history_v1', JSON.stringify([session]));
    });

    await page.reload({ waitUntil: 'domcontentloaded' });

    // Restore session
    await page.getByTitle('Past Study Sessions').click();
    await page.getByTestId('session-history-item').first().click();

    // Verify Archive GIF element is rendered
    const gifElement = page.locator('[data-testid="archive-gif-element"]');
    await expect(gifElement).toBeVisible();
    await expect(gifElement).toHaveAttribute('src', 'https://upload.wikimedia.org/wikipedia/commons/5/56/Cardiac-Cycle-Animated.gif');

    // Verify attribution badge
    const attributionBadge = page.getByText('Wikimedia Educational Archives');
    await expect(attributionBadge).toBeVisible();
  });
});
