/**
 * Export and Print Notes Utilities
 */

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function exportWhiteboardToMarkdown(items = [], studentProfile = {}) {
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let md = `# 📖 Study Notes - AI Tutor Whiteboard\n`;
  md += `**Student:** ${studentProfile.name || 'Student'}\n`;
  md += `**Date:** ${dateStr}\n`;
  if (studentProfile.grade) md += `**Grade / Level:** ${studentProfile.grade}\n`;
  md += `\n---\n\n`;

  items.forEach((item, index) => {
    if (item.topic) {
      md += `## ${item.topic}\n\n`;
    }

    if (item.studentAnswer) {
      md += `> ✅ **Verified Answer:** ${item.studentAnswer}\n\n`;
    }

    if (item.formula) {
      md += `$$\n${item.formula}\n$$\n\n`;
    }

    const notes = Array.isArray(item.notes)
      ? item.notes
      : typeof item.notes === 'string'
      ? [item.notes]
      : [];

    if (notes.length > 0) {
      notes.forEach((n) => {
        md += `- ${n}\n`;
      });
      md += `\n`;
    }

    if (item.image) {
      md += `![${item.caption || item.topic || 'Clipped Diagram'}](${item.image.startsWith('data:') ? item.image : `data:image/jpeg;base64,${item.image}`})\n\n`;
      if (item.caption) {
        md += `*📌 ${item.caption}*\n\n`;
      }
    }

    if (item.imageUrl) {
      md += `![${item.caption || item.topic || 'Educational Archive Photo'}](${item.imageUrl})\n\n`;
      if (item.attribution) {
        md += `*Source: ${item.attribution}*\n\n`;
      }
    }

    if (item.animationUrl) {
      md += `![${item.caption || item.topic || 'Educational Animation'}](${item.animationUrl})\n\n`;
      if (item.attribution) {
        md += `*Source: ${item.attribution}*\n\n`;
      }
    }

    if (item.animationType === 'manim_video') {
      md += `> 🎬 **3Blue1Brown Mathematical Visualization:** ${item.equation || item.topic}\n\n`;
    }

    if (item.animationType === 'simulation') {
      md += `> 🕹️ **Interactive Simulation Lab:** ${item.topic} (Type: ${item.simType || 'physics'})\n\n`;
    }

    if (item.svgCode) {
      md += `\n**Visual Vector Diagram:**\n\n\`\`\`xml\n${item.svgCode}\n\`\`\`\n\n`;
      if (item.caption) {
        md += `*📌 ${item.caption}*\n\n`;
      }
    }

    if (item.code) {
      const codeLang = (item.language || 'text').toLowerCase();
      md += `\`\`\`${codeLang}\n${item.code}\n\`\`\`\n\n`;
    }

    if (item.question) {
      md += `*Question for thought:* _${item.question}_\n\n`;
    }

    md += `---\n\n`;
  });

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Study-Notes-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports whiteboard to a standalone, fully self-contained interactive HTML file
 * with real rendered SVGs, running animations, styled code blocks and KaTeX math.
 */
export function exportWhiteboardToInteractiveHtml(items = [], studentProfile = {}) {
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const studentName = studentProfile?.name || 'Student';
  const studentGrade = studentProfile?.grade ? `Level: ${escapeHtml(studentProfile.grade)}` : '';

  let htmlCards = '';

  items.forEach((item, index) => {
    const notesList = Array.isArray(item.notes)
      ? item.notes
      : typeof item.notes === 'string'
      ? [item.notes]
      : [];

    const hasVisual = Boolean(
      item.svgCode || item.imageUrl || item.visualType || item.cardType === 'visual' || item.image || item.animationUrl
    );

    // Left column: Text, formulas, notes, code
    let textHtml = '';

    if (item.studentAnswer) {
      textHtml += `
        <div class="verified-answer">
          <span>${escapeHtml(item.studentAnswer.replace(/[✓✔\s]+$/, ''))}</span>
          <span class="checkmark">✓ Verified</span>
        </div>
      `;
    }

    if (item.formula) {
      textHtml += `
        <div class="formula-box">
          <div class="formula-text">$$ ${escapeHtml(item.formula)} $$</div>
        </div>
      `;
    }

    if (notesList.length > 0) {
      textHtml += `<ul class="notes-list">`;
      notesList.forEach((note) => {
        textHtml += `<li>${escapeHtml(note)}</li>`;
      });
      textHtml += `</ul>`;
    }

    if (item.tableData && item.tableData.rows) {
      textHtml += `<div class="table-container"><table>`;
      if (item.tableData.headers) {
        textHtml += `<thead><tr>`;
        item.tableData.headers.forEach((h) => {
          textHtml += `<th>${escapeHtml(h)}</th>`;
        });
        textHtml += `</tr></thead>`;
      }
      textHtml += `<tbody>`;
      item.tableData.rows.forEach((row) => {
        textHtml += `<tr>`;
        row.forEach((cell) => {
          textHtml += `<td>${escapeHtml(cell)}</td>`;
        });
        textHtml += `</tr>`;
      });
      textHtml += `</tbody></table></div>`;
    }

    if (item.code) {
      const lang = escapeHtml(item.language || 'Code');
      textHtml += `
        <div class="code-box">
          <div class="code-header">
            <span>💻 ${lang}</span>
          </div>
          <pre><code>${escapeHtml(item.code)}</code></pre>
        </div>
      `;
    }

    if (item.question) {
      textHtml += `
        <div class="question-box">
          <span class="q-icon">💡</span>
          <em>${escapeHtml(item.question)}</em>
        </div>
      `;
    }

    // Right column: Visuals (SVG, Animations, Images)
    let visualHtml = '';

    if (item.svgCode) {
      // Direct raw SVG rendering preserving all colors, paths & animated loops
      visualHtml += `
        <div class="visual-card">
          <div class="visual-badge">📐 VECTOR DIAGRAM</div>
          <div class="svg-container">
            ${item.svgCode}
          </div>
          ${item.caption ? `<p class="visual-caption">${escapeHtml(item.caption)}</p>` : ''}
        </div>
      `;
    } else if (item.animationUrl) {
      const isVideo = item.animationUrl.includes('.mp4') || item.animationUrl.includes('.webm');
      visualHtml += `
        <div class="visual-card">
          <div class="visual-badge">🎬 ANIMATION</div>
          <div class="media-container">
            ${
              isVideo
                ? `<video src="${escapeHtml(item.animationUrl)}" autoplay loop muted playsinline controls></video>`
                : `<img src="${escapeHtml(item.animationUrl)}" alt="${escapeHtml(item.caption || item.topic || 'Animation')}" />`
            }
          </div>
          ${item.caption ? `<p class="visual-caption">${escapeHtml(item.caption)}</p>` : ''}
          ${item.attribution ? `<p class="visual-attr">Source: ${escapeHtml(item.attribution)}</p>` : ''}
        </div>
      `;
    } else if (item.imageUrl || item.image) {
      const imgSrc = item.imageUrl || (item.image.startsWith('data:') ? item.image : `data:image/jpeg;base64,${item.image}`);
      visualHtml += `
        <div class="visual-card">
          <div class="visual-badge">🖼️ ARCHIVE PHOTO</div>
          <div class="media-container">
            <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(item.caption || item.topic || 'Photo')}" />
          </div>
          ${item.caption ? `<p class="visual-caption">${escapeHtml(item.caption)}</p>` : ''}
          ${item.attribution ? `<p class="visual-attr">Source: ${escapeHtml(item.attribution)}</p>` : ''}
        </div>
      `;
    }

    // Assemble Card
    htmlCards += `
      <section class="topic-card" id="topic-${index + 1}">
        <div class="topic-header">
          <span class="topic-number">#${index + 1}</span>
          <h2 class="topic-title">${escapeHtml(item.topic || 'Core Concept')}</h2>
        </div>

        <div class="card-grid ${hasVisual ? 'has-visual' : 'single-col'}">
          <div class="text-content">
            ${textHtml}
          </div>
          ${hasVisual ? `<div class="visual-content">${visualHtml}</div>` : ''}
        </div>
      </section>
    `;
  });

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Study Notes: ${escapeHtml(studentName)} - ${escapeHtml(dateStr)}</title>
  
  <!-- KaTeX for crisp offline mathematical formula rendering -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" crossorigin="anonymous">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js" crossorigin="anonymous"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" crossorigin="anonymous"
    onload="renderMathInElement(document.body, {delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}]});">
  </script>

  <style>
    :root {
      --bg: #fbf8f3;
      --card-bg: #ffffff;
      --text: #1c1917;
      --text-muted: #78716c;
      --border: #e7e5e4;
      --primary: #d97706;
      --accent: #2563eb;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'Georgia', 'Cambria', 'Times New Roman', serif;
      line-height: 1.65;
      padding: 30px 20px 80px;
    }

    .container {
      max-width: 1040px;
      margin: 0 auto;
    }

    /* Top Banner Header */
    .header-banner {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding-bottom: 24px;
      border-bottom: 2px solid #e7e5e4;
      margin-bottom: 40px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .brand-title {
      font-size: 26px;
      font-weight: 800;
      color: #292524;
      font-family: Georgia, serif;
    }

    .meta-info {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 4px;
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .meta-badge {
      background: #fef3c7;
      color: #92400e;
      padding: 2px 8px;
      border-radius: 999px;
      font-weight: 600;
      font-size: 11px;
    }

    .actions-bar {
      display: flex;
      gap: 10px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid var(--border);
      background: #ffffff;
      color: #292524;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      transition: all 0.2s ease;
    }

    .btn:hover {
      background: #f5f5f4;
      border-color: #d6d3d1;
    }

    .btn-primary {
      background: #d97706;
      color: #ffffff;
      border-color: #b45309;
    }

    .btn-primary:hover {
      background: #b45309;
    }

    /* Topic Section Cards */
    .topic-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 28px;
      margin-bottom: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .topic-header {
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1.5px solid #f0ede6;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }

    .topic-number {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      font-weight: 800;
      color: #d97706;
      background: #fef3c7;
      padding: 3px 8px;
      border-radius: 6px;
    }

    .topic-title {
      font-size: 22px;
      font-weight: 700;
      color: #1c1917;
      letter-spacing: -0.01em;
    }

    /* Grid Layout */
    .card-grid {
      display: grid;
      gap: 28px;
      align-items: start;
    }

    .card-grid.has-visual {
      grid-template-columns: 1.15fr 0.85fr;
    }

    .card-grid.single-col {
      grid-template-columns: 1fr;
    }

    @media (max-width: 860px) {
      .card-grid.has-visual {
        grid-template-columns: 1fr;
      }
    }

    /* Verified Answer */
    .verified-answer {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 15px;
      font-weight: 600;
      color: #065f46;
      background: #ecfdf5;
      padding: 8px 14px;
      border-radius: 10px;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border: 1px solid #a7f3d0;
    }

    .checkmark {
      font-size: 12px;
      color: #059669;
    }

    /* Formula Box */
    .formula-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #d97706;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 16px;
      text-align: center;
      overflow-x: auto;
    }

    .formula-text {
      font-size: 18px;
      font-weight: bold;
      color: #0f172a;
    }

    /* Notes List */
    .notes-list {
      list-style-type: none;
      margin-bottom: 16px;
    }

    .notes-list li {
      position: relative;
      padding-left: 20px;
      margin-bottom: 10px;
      font-size: 16px;
      color: #292524;
    }

    .notes-list li::before {
      content: "•";
      position: absolute;
      left: 4px;
      color: #a8a29e;
      font-weight: bold;
    }

    /* Table */
    .table-container {
      margin: 16px 0;
      overflow-x: auto;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    th, td {
      border: 1px solid #d6d3d1;
      padding: 8px 12px;
      text-align: center;
    }

    th {
      background: #2a3b5c;
      color: #ffffff;
      font-weight: 600;
    }

    tr:nth-child(even) {
      background: #fafaf9;
    }

    /* Code Box */
    .code-box {
      background: #0f172a;
      color: #f1f5f9;
      border-radius: 12px;
      overflow: hidden;
      margin: 16px 0;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 13px;
      border: 1px solid #1e293b;
    }

    .code-header {
      background: #1e293b;
      padding: 6px 14px;
      font-size: 11px;
      color: #94a3b8;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .code-box pre {
      padding: 14px;
      overflow-x: auto;
      line-height: 1.5;
    }

    /* Question Box */
    .question-box {
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 14px;
      color: #92400e;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 14px;
    }

    /* Visual Card & SVG Container */
    .visual-card {
      background: #090d16;
      border: 1px solid #1e293b;
      border-radius: 14px;
      padding: 14px;
      color: #f8fafc;
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    }

    .visual-badge {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 10px;
      font-weight: 800;
      color: #38bdf8;
      letter-spacing: 0.08em;
      margin-bottom: 8px;
    }

    .svg-container {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #0c1222;
      border-radius: 8px;
      overflow: hidden;
      padding: 6px;
    }

    .svg-container svg {
      max-width: 100%;
      height: auto;
      display: block;
    }

    .media-container img,
    .media-container video {
      width: 100%;
      max-height: 380px;
      object-fit: contain;
      border-radius: 8px;
      background: #0c1222;
      display: block;
    }

    .visual-caption {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 12px;
      color: #94a3b8;
      margin-top: 10px;
      text-align: center;
      font-style: italic;
    }

    .visual-attr {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 10px;
      color: #64748b;
      margin-top: 4px;
      text-align: center;
    }

    /* Multi-Page Print Styles */
    @media print {
      @page {
        size: auto;
        margin: 12mm;
      }

      body {
        background: #ffffff !important;
        color: #000000 !important;
        padding: 0 !important;
      }

      .btn, .actions-bar {
        display: none !important;
      }

      .topic-card {
        border: 1px solid #d6d3d1 !important;
        box-shadow: none !important;
        margin-bottom: 24px !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header-banner">
      <div>
        <h1 class="brand-title">📖 Study Notes</h1>
        <div class="meta-info">
          <span>Student: <strong>${escapeHtml(studentName)}</strong></span>
          ${studentGrade ? `<span class="meta-badge">${studentGrade}</span>` : ''}
          <span>• ${escapeHtml(dateStr)}</span>
          <span>• ${items.length} Concept(s)</span>
        </div>
      </div>
      <div class="actions-bar">
        <button class="btn btn-primary" onclick="window.print()">🖨️ Print / Save as PDF</button>
      </div>
    </header>

    <main>
      ${htmlCards}
    </main>
  </div>
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Study-Notes-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printWhiteboard() {
  window.print();
}
