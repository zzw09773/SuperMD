import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs/promises';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { parse as csvParse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

export interface ParsedDocument {
  content: string;
  metadata: {
    pageCount?: number;
    wordCount: number;
    fileType?: string;
    language?: string;
    rows?: number;
    columns?: number;
  };
}

/**
 * Parse PDF file
 */
export const parsePDF = async (filePath: string): Promise<ParsedDocument> => {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);

    return {
      content: data.text,
      metadata: {
        pageCount: data.numpages,
        wordCount: data.text.split(/\s+/).length,
      },
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF file');
  }
};

/**
 * Parse DOCX file
 */
export const parseDOCX = async (filePath: string): Promise<ParsedDocument> => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const content = result.value;

    return {
      content,
      metadata: {
        wordCount: content.split(/\s+/).length,
      },
    };
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error('Failed to parse DOCX file');
  }
};

/**
 * Parse TXT file
 */
export const parseTXT = async (filePath: string): Promise<ParsedDocument> => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');

    return {
      content,
      metadata: {
        wordCount: content.split(/\s+/).length,
      },
    };
  } catch (error) {
    console.error('TXT parsing error:', error);
    throw new Error('Failed to parse TXT file');
  }
};

/**
 * Parse Markdown file
 */
export const parseMarkdown = async (filePath: string): Promise<ParsedDocument> => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');

    return {
      content,
      metadata: {
        wordCount: content.split(/\s+/).length,
      },
    };
  } catch (error) {
    console.error('Markdown parsing error:', error);
    throw new Error('Failed to parse Markdown file');
  }
};

/**
 * Parse Image file using OCR
 */
export const parseImage = async (filePath: string): Promise<ParsedDocument> => {
  try {
    // Convert to PNG for better OCR results
    const processedImagePath = filePath + '.processed.png';
    await sharp(filePath)
      .grayscale()
      .normalize()
      .png()
      .toFile(processedImagePath);

    // Perform OCR
    const { data } = await Tesseract.recognize(processedImagePath, 'eng+chi_tra', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`🔍 OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    // Clean up processed image
    await fs.unlink(processedImagePath);

    return {
      content: data.text,
      metadata: {
        wordCount: data.text.split(/\s+/).length,
        fileType: 'image',
        language: 'en+zh-TW',
      },
    };
  } catch (error) {
    console.error('Image OCR error:', error);
    throw new Error('Failed to parse image file with OCR');
  }
};

/**
 * Parse CSV file
 */
export const parseCSV = async (filePath: string): Promise<ParsedDocument> => {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const records = csvParse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Convert CSV to readable text format
    const headers = Object.keys(records[0] || {});
    let content = `CSV Table with ${records.length} rows and ${headers.length} columns:\n\n`;
    content += `Headers: ${headers.join(', ')}\n\n`;

    records.forEach((row, index) => {
      content += `Row ${index + 1}:\n`;
      headers.forEach(header => {
        content += `  - ${header}: ${row[header]}\n`;
      });
      content += '\n';
    });

    return {
      content,
      metadata: {
        wordCount: content.split(/\s+/).length,
        fileType: 'csv',
        rows: records.length,
        columns: headers.length,
      },
    };
  } catch (error) {
    console.error('CSV parsing error:', error);
    throw new Error('Failed to parse CSV file');
  }
};

/**
 * Parse Excel file (XLSX, XLS)
 */
export const parseExcel = async (filePath: string): Promise<ParsedDocument> => {
  try {
    const workbook = XLSX.readFile(filePath);
    let content = `Excel Workbook with ${workbook.SheetNames.length} sheets:\n\n`;

    workbook.SheetNames.forEach((sheetName, sheetIndex) => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      content += `=== Sheet ${sheetIndex + 1}: ${sheetName} ===\n`;
      content += `Rows: ${jsonData.length}\n\n`;

      if (jsonData.length > 0) {
        const headers = Object.keys(jsonData[0]);
        content += `Columns: ${headers.join(', ')}\n\n`;

        jsonData.slice(0, 100).forEach((row: any, index) => {
          content += `Row ${index + 1}:\n`;
          headers.forEach(header => {
            content += `  - ${header}: ${row[header]}\n`;
          });
          content += '\n';
        });

        if (jsonData.length > 100) {
          content += `... (${jsonData.length - 100} more rows)\n\n`;
        }
      }
    });

    return {
      content,
      metadata: {
        wordCount: content.split(/\s+/).length,
        fileType: 'excel',
      },
    };
  } catch (error) {
    console.error('Excel parsing error:', error);
    throw new Error('Failed to parse Excel file');
  }
};

/**
 * Parse Code file
 */
export const parseCode = async (
  filePath: string,
  extension: string
): Promise<ParsedDocument> => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');

    // Detect language from extension
    const languageMap: Record<string, string> = {
      js: 'JavaScript',
      ts: 'TypeScript',
      jsx: 'React JSX',
      tsx: 'React TSX',
      py: 'Python',
      java: 'Java',
      cpp: 'C++',
      c: 'C',
      cs: 'C#',
      go: 'Go',
      rs: 'Rust',
      rb: 'Ruby',
      php: 'PHP',
      swift: 'Swift',
      kt: 'Kotlin',
      sql: 'SQL',
      html: 'HTML',
      css: 'CSS',
      json: 'JSON',
      xml: 'XML',
      yaml: 'YAML',
      yml: 'YAML',
    };

    const language = languageMap[extension] || extension.toUpperCase();
    const formattedContent = `${language} Code File:\n\n\`\`\`${extension}\n${content}\n\`\`\``;

    return {
      content: formattedContent,
      metadata: {
        wordCount: content.split(/\s+/).length,
        fileType: 'code',
        language,
      },
    };
  } catch (error) {
    console.error('Code file parsing error:', error);
    throw new Error('Failed to parse code file');
  }
};

/**
 * Parse file based on extension
 */
export const parseFile = async (
  filePath: string,
  fileType: string
): Promise<ParsedDocument> => {
  const ext = fileType.toLowerCase();
  const fileName = filePath.split(/[/\\]/).pop() || '';
  const fileExt = fileName.split('.').pop()?.toLowerCase() || '';

  // Document formats
  if (ext.includes('pdf') || ext === 'application/pdf') {
    return parsePDF(filePath);
  }
  if (ext.includes('word') || ext.includes('docx') || ext === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return parseDOCX(filePath);
  }
  if (ext.includes('text') || ext === 'text/plain' || fileExt === 'txt') {
    return parseTXT(filePath);
  }
  if (ext.includes('markdown') || fileExt === 'md') {
    return parseMarkdown(filePath);
  }

  // Image formats
  if (ext.includes('image') || ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp'].includes(fileExt)) {
    return parseImage(filePath);
  }

  // Table formats
  if (ext.includes('csv') || fileExt === 'csv') {
    return parseCSV(filePath);
  }
  if (ext.includes('sheet') || ext.includes('excel') || ['xlsx', 'xls'].includes(fileExt)) {
    return parseExcel(filePath);
  }

  // Code formats
  const codeExtensions = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'sql', 'html', 'css', 'json', 'xml', 'yaml', 'yml'];
  if (codeExtensions.includes(fileExt)) {
    return parseCode(filePath, fileExt);
  }

  throw new Error(`Unsupported file type: ${fileType}`);
};
