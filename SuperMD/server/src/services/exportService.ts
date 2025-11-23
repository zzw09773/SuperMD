import { Response } from 'express';
import { marked } from 'marked';
import puppeteer from 'puppeteer';
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
import puppeteer from 'puppeteer';

/**
 * Export as PDF (.pdf) using Puppeteer (High Fidelity)
 */
async function exportPDF(content: string, title: string, res: Response): Promise<void> {
  let browser = null;
  try {
    const htmlContent = await marked(content);
    
    // GitHub-like Markdown CSS
    const css = `
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
        font-size: 16px;
        line-height: 1.5;
        word-wrap: break-word;
        color: #24292f;
        background-color: #fff;
        margin: 0;
        padding: 2rem;
      }
      h1, h2, h3, h4, h5, h6 {
        margin-top: 24px;
        margin-bottom: 16px;
        font-weight: 600;
        line-height: 1.25;
      }
      h1 { font-size: 2em; padding-bottom: 0.3em; border-bottom: 1px solid #d0d7de; }
      h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid #d0d7de; }
      h3 { font-size: 1.25em; }
      h4 { font-size: 1em; }
      p { margin-top: 0; margin-bottom: 16px; }
      code {
        padding: 0.2em 0.4em;
        margin: 0;
        font-size: 85%;
        white-space: break-spaces;
        background-color: #afb8c133;
        border-radius: 6px;
        font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
      }
      pre {
        padding: 16px;
        overflow: auto;
        font-size: 85%;
        line-height: 1.45;
        background-color: #f6f8fa;
        border-radius: 6px;
        margin-top: 0;
        margin-bottom: 16px;
      }
      pre code {
        background-color: transparent;
        padding: 0;
      }
      blockquote {
        padding: 0 1em;
        color: #57606a;
        border-left: 0.25em solid #d0d7de;
        margin: 0 0 16px 0;
      }
      ul, ol {
        padding-left: 2em;
        margin-top: 0;
        margin-bottom: 16px;
      }
      table {
        border-spacing: 0;
        border-collapse: collapse;
        display: block;
        width: max-content;
        max-width: 100%;
        overflow: auto;
        margin-bottom: 16px;
      }
      tr { background-color: #fff; border-top: 1px solid #d8dee4; }
      tr:nth-child(2n) { background-color: #f6f8fa; }
      th, td {
        padding: 6px 13px;
        border: 1px solid #d0d7de;
      }
      th { font-weight: 600; }
      img {
        max-width: 100%;
        box-sizing: border-box;
        background-color: #fff;
      }
      hr {
        height: 0.25em;
        padding: 0;
        margin: 24px 0;
        background-color: #d0d7de;
        border: 0;
      }
      a { color: #0969da; text-decoration: none; }
      a:hover { text-decoration: underline; }
    `;

    const fullHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${escapeHtml(title)}</title>
        <style>${css}</style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        ${htmlContent}
      </body>
      </html>
    `;

    console.log('[Puppeteer] Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'], // Essential for Docker environments
    });

    const page = await browser.newPage();
    await page.setContent(fullHTML, { waitUntil: 'networkidle0' });

    console.log('[Puppeteer] Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm',
      },
    });

    console.log('[Puppeteer] PDF generated successfully');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(title)}.pdf"`);
    res.send(Buffer.from(pdfBuffer));

  } catch (error) {
    console.error('[PDF] Export error:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
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
