import { Response } from 'express';
import { marked } from 'marked';
import { jsPDF } from 'jspdf';
import asBlob from 'html-docx-js/dist/html-docx';
import fs from 'fs/promises';
import path from 'path';

/**
 * Convert local image paths to base64 embedded images
 */
async function embedImages(content: string): Promise<string> {
  const imageRegex = /!\[([^\]]*)\]\((\/uploads\/[^\)]+)\)/g;
  let modifiedContent = content;
  const matches = Array.from(content.matchAll(imageRegex));

  for (const match of matches) {
    const [fullMatch, altText, imagePath] = match;
    try {
      // Build path: /uploads/images/xxx.png -> uploads/images/xxx.png
      const relativePath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
      const fullPath = path.join(process.cwd(), relativePath);

      console.log(`[Export] Reading image from: ${fullPath}`);
      const imageBuffer = await fs.readFile(fullPath);
      const base64Image = imageBuffer.toString('base64');

      // Detect MIME type from extension
      const ext = path.extname(imagePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
      };
      const mimeType = mimeTypes[ext] || 'image/png';

      // Replace with base64 embedded image
      const base64Markdown = `![${altText}](data:${mimeType};base64,${base64Image})`;
      modifiedContent = modifiedContent.replace(fullMatch, base64Markdown);
      console.log(`[Export] Successfully embedded image: ${imagePath}`);
    } catch (error) {
      console.error(`[Export] Failed to embed image ${imagePath}:`, error);
      // Keep original markdown if embedding fails
    }
  }

  return modifiedContent;
}

/**
 * Export document to various formats
 */
export const exportDocument = async (
  content: string,
  title: string,
  format: string,
  res: Response
): Promise<void> => {
  try {
    // Embed images for export
    const contentWithEmbeddedImages = await embedImages(content);

    switch (format) {
      case 'md':
        exportMarkdown(contentWithEmbeddedImages, title, res);
        break;
      case 'txt':
        exportText(contentWithEmbeddedImages, title, res);
        break;
      case 'html':
        await exportHTML(contentWithEmbeddedImages, title, res);
        break;
      case 'pdf':
        await exportPDF(contentWithEmbeddedImages, title, res);
        break;
      case 'docx':
        await exportDOCX(contentWithEmbeddedImages, title, res);
        break;
      default:
        res.status(400).json({ error: `Unsupported format: ${format}` });
    }
  } catch (error) {
    console.error('[Export Service] Error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
};

/**
 * Export as Markdown (.md)
 */
function exportMarkdown(content: string, title: string, res: Response): void {
  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(title)}.md"`);
  res.send(content);
}

/**
 * Export as plain text (.txt)
 */
function exportText(content: string, title: string, res: Response): void {
  // Strip markdown formatting
  const plainText = content
    .replace(/[#*_~`]/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '')
    .trim();

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(title)}.txt"`);
  res.send(plainText);
}

/**
 * Export as HTML (.html)
 */
async function exportHTML(content: string, title: string, res: Response): Promise<void> {
  const htmlContent = await marked(content);

  const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; }
    h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    code { background-color: #f6f8fa; padding: 0.2em 0.4em; border-radius: 3px; font-size: 85%; }
    pre { background-color: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
    blockquote { border-left: 4px solid #dfe2e5; padding-left: 16px; color: #6a737d; margin: 0; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #dfe2e5; padding: 6px 13px; }
    th { background-color: #f6f8fa; font-weight: 600; }
    img { max-width: 100%; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${htmlContent}
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(title)}.html"`);
  res.send(fullHTML);
}

/**
 * Export as PDF (.pdf)
 */
async function exportPDF(content: string, title: string, res: Response): Promise<void> {
  const htmlContent = await marked(content);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Add title
  doc.setFontSize(20);
  doc.text(title, 20, 20);

  // Add content (simple text rendering - for advanced HTML rendering, use html2pdf)
  doc.setFontSize(12);
  const lines = content.split('\n');
  let y = 40;

  lines.forEach((line) => {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    // Remove markdown formatting for simple display
    const cleanLine = line.replace(/[#*_~`]/g, '').substring(0, 80);
    doc.text(cleanLine, 20, y);
    y += 7;
  });

  const pdfBuffer = doc.output('arraybuffer');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(title)}.pdf"`);
  res.send(Buffer.from(pdfBuffer));
}

/**
 * Export as DOCX (.docx)
 */
async function exportDOCX(content: string, title: string, res: Response): Promise<void> {
  try {
    const htmlContent = await marked(content);

    const fullHTML = `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${escapeHtml(title)}</title>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          ${htmlContent}
        </body>
      </html>
    `;

    // asBlob returns an ArrayBuffer, we need to convert it properly
    const docxBlob = asBlob(fullHTML);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(title)}.docx"`);
    res.send(Buffer.from(docxBlob));
  } catch (error) {
    console.error('[Export] DOCX generation error:', error);
    throw error;
  }
}

/**
 * Sanitize filename for safe file download
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9_\-]/gi, '_')
    .replace(/_+/g, '_')
    .substring(0, 100);
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
