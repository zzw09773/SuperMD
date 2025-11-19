import { Response } from 'express';
import { marked } from 'marked';
import { jsPDF } from 'jspdf';
import HtmlToDocx from '@turbodocx/html-to-docx';
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
    console.log(`[Export] Starting export - Format: ${format}, Title: ${title}`);

    // Embed images for export
    const contentWithEmbeddedImages = await embedImages(content);
    console.log(`[Export] Content length after embedding: ${contentWithEmbeddedImages.length} characters`);

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

    console.log(`[Export] Export completed successfully - Format: ${format}`);
  } catch (error) {
    console.error('[Export Service] Error:', error);
    console.error('[Export Service] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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
/**
 * Export as PDF (.pdf)
 */
async function exportPDF(content: string, title: string, res: Response): Promise<void> {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // --- Cover Page ---
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    const splitTitle = doc.splitTextToSize(title, 170);
    doc.text(splitTitle, 105, 100, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated by SuperMD`, 105, 250, { align: 'center' });
    doc.text(new Date().toLocaleDateString(), 105, 260, { align: 'center' });

    doc.addPage();

    // --- Table of Contents (Simple) ---
    const toc: { title: string; page: number }[] = [];
    let pageNumber = 2; // Start content on page 2 (after TOC)

    // We need to pre-process to find headers for TOC, but jsPDF is imperative.
    // For a simple implementation, we'll just render content and track headers.
    // A true TOC requires two passes or knowing page heights perfectly.
    // Here we will skip auto-TOC generation in this pass to keep it simple and robust,
    // as accurate TOC in jsPDF without a layout engine is very complex.
    // Instead, we focus on clean layout.

    // --- Content ---
    doc.setPage(2); // Actually this is page 2 index (1-based? no, addPage makes it current)

    doc.setFontSize(12);
    const lines = content.split('\n');
    let y = 20;

    for (const line of lines) {
      // Check for headers
      if (line.startsWith('# ')) {
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        // Add extra space before header
        if (y > 20) y += 10;
      } else if (line.startsWith('## ')) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        if (y > 20) y += 8;
      } else if (line.startsWith('### ')) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        if (y > 20) y += 6;
      } else {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
      }

      // Check if line contains base64 image
      const base64ImageMatch = line.match(/!\[([^\]]*)\]\(data:image\/([^;]+);base64,([^\)]+)\)/);

      if (base64ImageMatch) {
        // Add image to PDF
        try {
          const [, altText, imageType, base64Data] = base64ImageMatch;
          const imgFormat = imageType.toUpperCase() === 'JPG' ? 'JPEG' : imageType.toUpperCase();

          // Add image (max width 170mm to fit A4 with margins)
          if (y > 200) {
            doc.addPage();
            y = 20;
          }

          doc.addImage(`data:image/${imageType};base64,${base64Data}`, imgFormat, 20, y, 170, 0);
          y += 100; // Estimated image height
        } catch (imgError) {
          console.error('[PDF] Failed to add image:', imgError);
          doc.text(`[Image: ${base64ImageMatch[1] || 'image'}]`, 20, y);
          y += 10;
        }
      } else {
        // Regular text line
        const cleanLine = line.replace(/[#*_~`]/g, '').replace(/!\[[^\]]*\]\([^\)]+\)/g, '');

        if (cleanLine.trim()) {
          const splitLines = doc.splitTextToSize(cleanLine, 170);

          if (y + (splitLines.length * 7) > 280) {
            doc.addPage();
            y = 20;
          }

          doc.text(splitLines, 20, y);
          y += (splitLines.length * 7);
        }
      }
    }

    // Add page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    }

    const pdfBuffer = doc.output('arraybuffer');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(title)}.pdf"`);
    res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    console.error('[PDF] Export error:', error);
    throw error;
  }
}

/**
 * Export as DOCX (.docx)
 */
async function exportDOCX(content: string, title: string, res: Response): Promise<void> {
  try {
    const htmlContent = await marked(content);

    const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body>
  ${htmlContent}
</body>
</html>`;

    // Generate DOCX using @turbodocx/html-to-docx
    const docxResult = await HtmlToDocx(fullHTML);

    // Convert result to Buffer
    let docxBuffer: Buffer;
    if (docxResult instanceof Buffer) {
      docxBuffer = docxResult;
    } else if (docxResult instanceof ArrayBuffer) {
      docxBuffer = Buffer.from(docxResult);
    } else {
      // It's a Blob
      const arrayBuffer = await (docxResult as Blob).arrayBuffer();
      docxBuffer = Buffer.from(arrayBuffer);
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(title)}.docx"`);
    res.send(docxBuffer);
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
