/**
 * Captures a crisp, high-contrast visual JPEG of the student's hand-drawn work
 * (handwritten equations, variables, axes, shapes, highlights, ticks) from the whiteboard canvas.
 * Automatically detects the bounding box of the student's ink strokes to frame them with optimal scale,
 * eliminating all background clutter and fake text dumps.
 */
export async function captureElementWithOverlay(containerEl, overlayCanvasEl) {
  if (!overlayCanvasEl) return null;

  try {
    const srcW = overlayCanvasEl.width;
    const srcH = overlayCanvasEl.height;
    if (srcW === 0 || srcH === 0) return null;

    const ctx = overlayCanvasEl.getContext('2d');
    const imgData = ctx.getImageData(0, 0, srcW, srcH).data;

    let minX = srcW;
    let minY = srcH;
    let maxX = 0;
    let maxY = 0;
    let strokeCount = 0;

    // Fast pixel sampling (step = 2) to find exact bounding box of student drawings
    for (let y = 0; y < srcH; y += 2) {
      for (let x = 0; x < srcW; x += 2) {
        const alpha = imgData[(y * srcW + x) * 4 + 3];
        if (alpha > 15) {
          strokeCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const outputCanvas = document.createElement('canvas');

    if (strokeCount > 10 && minX < maxX && minY < maxY) {
      // Add generous margin around student handwriting
      const pad = 60;
      const cropX = Math.max(0, minX - pad);
      const cropY = Math.max(0, minY - pad);
      const cropW = Math.min(srcW - cropX, (maxX - minX) + pad * 2);
      const cropH = Math.min(srcH - cropY, (maxY - minY) + pad * 2);

      // Scale to ensure stroke thickness and digits are large and crystal-clear for Gemini Vision
      const minDimension = 480;
      const maxDimension = 960;
      let scale = 1.0;
      if (Math.max(cropW, cropH) < minDimension) {
        scale = minDimension / Math.max(cropW, cropH);
      } else if (Math.max(cropW, cropH) > maxDimension) {
        scale = maxDimension / Math.max(cropW, cropH);
      }

      const outW = Math.max(320, Math.round(cropW * scale));
      const outH = Math.max(240, Math.round(cropH * scale) + 40);

      outputCanvas.width = outW;
      outputCanvas.height = outH;
      const outCtx = outputCanvas.getContext('2d');

      // Pure clean white paper background for maximum contrast with black ink
      outCtx.fillStyle = '#ffffff';
      outCtx.fillRect(0, 0, outW, outH);

      // Top banner identifying student hand-drawn work
      outCtx.fillStyle = '#f8fafc';
      outCtx.fillRect(0, 0, outW, 36);
      outCtx.strokeStyle = '#e2e8f0';
      outCtx.lineWidth = 1;
      outCtx.strokeRect(0, 0, outW, 36);

      outCtx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      outCtx.fillStyle = '#0f172a';
      outCtx.fillText('STUDENT HANDWRITTEN CANVAS (PEN / HIGHLIGHT / TICKS)', 14, 23);

      // Draw cropped and scaled student ink strokes
      outCtx.drawImage(
        overlayCanvasEl,
        cropX, cropY, cropW, cropH,
        0, 38, outW, outH - 38
      );

      return outputCanvas.toDataURL('image/jpeg', 0.9).split(',')[1];
    } else {
      // Fallback: Full canvas capture preserving aspect ratio
      const outW = 960;
      const outH = Math.round((srcH / srcW) * outW) || 720;
      outputCanvas.width = outW;
      outputCanvas.height = outH;
      const outCtx = outputCanvas.getContext('2d');
      outCtx.fillStyle = '#ffffff';
      outCtx.fillRect(0, 0, outW, outH);
      outCtx.drawImage(overlayCanvasEl, 0, 0, outW, outH);
      return outputCanvas.toDataURL('image/jpeg', 0.85).split(',')[1];
    }
  } catch (err) {
    console.error('[captureElementWithOverlay] Failed to capture snapshot:', err);
    return null;
  }
}
