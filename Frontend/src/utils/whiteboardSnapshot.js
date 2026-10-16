/**
 * Captures a lightweight visual JPEG of a DOM element using SVG foreignObject
 * with inlined styles, avoiding heavy third-party canvas dependencies.
 * Also composite-renders an HTML5 annotation canvas overlay on top.
 */
export async function captureElementWithOverlay(containerEl, overlayCanvasEl) {
  if (!containerEl) return null;

  try {
    const rect = containerEl.getBoundingClientRect();
    const width = Math.min(rect.width, 960);
    const height = Math.min(rect.height, 1200);

    // Create a target offscreen canvas
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;
    const ctx = outputCanvas.getContext('2d');

    // 1. Fill paper-like background
    ctx.fillStyle = '#fbf8f3';
    ctx.fillRect(0, 0, width, height);

    // 2. Clone DOM node for SVG foreignObject
    const clone = containerEl.cloneNode(true);
    // Remove UI buttons from clone
    const nonPrintEls = clone.querySelectorAll('.print\\:hidden, button');
    nonPrintEls.forEach((el) => el.remove());

    // Clean up fixed or absolute positions in clone
    clone.style.width = `${width}px`;
    clone.style.maxHeight = 'none';
    clone.style.overflow = 'visible';
    clone.style.background = '#fbf8f3';

    const serializedHtml = new XMLSerializer().serializeToString(clone);
    const svgData = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: serif; color: #1c1917; background: #fbf8f3; padding: 20px;">
            ${serializedHtml}
          </div>
        </foreignObject>
      </svg>
    `;

    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    await new Promise((resolve) => {
      img.onload = () => {
        try {
          ctx.drawImage(img, 0, 0, width, height);
        } catch (e) {}
        URL.revokeObjectURL(svgUrl);
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        resolve();
      };
      img.src = svgUrl;
    });

    // 3. Draw the user's overlay annotations (pen & highlighters) directly on top
    if (overlayCanvasEl && overlayCanvasEl.width > 0 && overlayCanvasEl.height > 0) {
      ctx.drawImage(overlayCanvasEl, 0, 0, width, height);
    }

    // Export as lightweight JPEG (quality 75%)
    const base64Data = outputCanvas.toDataURL('image/jpeg', 0.75).split(',')[1];
    return base64Data;
  } catch (err) {
    console.warn('[captureElementWithOverlay] Snapshot error, falling back to overlay canvas:', err);
    if (overlayCanvasEl) {
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.width = overlayCanvasEl.width || 800;
      fallbackCanvas.height = overlayCanvasEl.height || 600;
      const fCtx = fallbackCanvas.getContext('2d');
      fCtx.fillStyle = '#fbf8f3';
      fCtx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
      fCtx.drawImage(overlayCanvasEl, 0, 0);
      return fallbackCanvas.toDataURL('image/jpeg', 0.75).split(',')[1];
    }
    return null;
  }
}
