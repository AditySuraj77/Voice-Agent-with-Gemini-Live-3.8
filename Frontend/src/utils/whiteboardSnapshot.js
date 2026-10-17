/**
 * Captures a lightweight visual JPEG of the whiteboard notes combined with the student's
 * hand-drawn overlay annotations (pen, highlighter, tick marks).
 * Uses robust offscreen canvas rendering with 100% security sandbox compatibility.
 */
export async function captureElementWithOverlay(containerEl, overlayCanvasEl) {
  try {
    const width = 960;
    const height = 720;

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;
    const ctx = outputCanvas.getContext('2d');

    // 1. Fill paper-like background
    ctx.fillStyle = '#fbf8f3';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw subtle notebook header line
    ctx.strokeStyle = '#e7e5e4';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 45);
    ctx.lineTo(width - 30, 45);
    ctx.stroke();

    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#78716c';
    ctx.fillText("Student Interactive Whiteboard & Working", 35, 35);

    // 3. Render visible notes text from containerEl if present
    if (containerEl) {
      let currentY = 80;
      const headings = containerEl.querySelectorAll('h2');
      headings.forEach((h2) => {
        if (currentY < height - 60) {
          ctx.font = 'bold 20px Georgia, serif';
          ctx.fillStyle = '#1c1917';
          ctx.fillText(h2.textContent.trim().slice(0, 70), 40, currentY);
          currentY += 30;
        }
      });

      const formulas = containerEl.querySelectorAll('.katex, [data-formula]');
      formulas.forEach((f) => {
        if (currentY < height - 60) {
          ctx.font = 'bold 18px Georgia, serif';
          ctx.fillStyle = '#1e3a8a';
          ctx.fillText(f.textContent.trim().slice(0, 80), 40, currentY);
          currentY += 28;
        }
      });

      const notes = containerEl.querySelectorAll('p, span');
      let noteCount = 0;
      notes.forEach((n) => {
        const text = n.textContent.trim();
        if (text && text.length > 15 && noteCount < 6 && currentY < height - 50) {
          ctx.font = '14px Georgia, serif';
          ctx.fillStyle = '#44403c';
          ctx.fillText(`• ${text.slice(0, 90)}`, 40, currentY);
          currentY += 24;
          noteCount++;
        }
      });
    }

    // 4. Draw the student's hand-drawn overlay annotations directly on top
    if (overlayCanvasEl && overlayCanvasEl.width > 0 && overlayCanvasEl.height > 0) {
      ctx.drawImage(overlayCanvasEl, 0, 0, width, height);
    }

    // Export as lightweight JPEG (quality 80%)
    const base64Data = outputCanvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    return base64Data;
  } catch (err) {
    console.error('[captureElementWithOverlay] Failed to capture snapshot:', err);
    return null;
  }
}
