/**
 * Export and Print Notes Utilities
 */

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

export function printWhiteboard() {
  window.print();
}
