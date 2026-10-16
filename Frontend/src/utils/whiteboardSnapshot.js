/**
 * Captures a lightweight visual JPEG of the whiteboard overlay canvas
 * or composite whiteboard notes, guaranteed to never throw SecurityError/tainting.
 */
export async function captureElementWithOverlay(containerEl, overlayCanvasEl) {
  try {
    // 1. If overlay canvas has user's pen/highlighter markings, export directly onto paper background
    if (overlayCanvasEl && overlayCanvasEl.width > 0 && overlayCanvasEl.height > 0) {
      const outputCanvas = document.createElement('canvas');
      const width = Math.min(overlayCanvasEl.width, 960);
      const height = Math.min(overlayCanvasEl.height, 1200);

      outputCanvas.width = width;
      outputCanvas.height = height;
      const ctx = outputCanvas.getContext('2d');

      // Authentic paper texture background
      ctx.fillStyle = '#fbf8f3';
      ctx.fillRect(0, 0, width, height);

      // Render any whiteboard headings/topics as readable text context if available
      if (containerEl) {
        const headings = Array.from(containerEl.querySelectorAll('h2, .katex-display, .font-serif'));
        if (headings.length > 0) {
          ctx.fillStyle = '#44403c';
          ctx.font = '14px serif';
          let yOffset = 28;
          for (const el of headings.slice(0, 4)) {
            const text = (el.innerText || el.textContent || '').trim().slice(0, 80);
            if (text) {
              ctx.fillText(text, 24, yOffset);
              yOffset += 24;
            }
          }
        }
      }

      // Composite student handwritten strokes & highlights on top
      ctx.drawImage(overlayCanvasEl, 0, 0, width, height);

      // Safe, untainted, ultra-fast JPEG export (~20KB)
      return outputCanvas.toDataURL('image/jpeg', 0.75).split(',')[1];
    }

    return null;
  } catch (err) {
    console.warn('[captureElementWithOverlay] Snapshot error:', err);
    return null;
  }
}
