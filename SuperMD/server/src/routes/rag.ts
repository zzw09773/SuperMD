import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { authMiddleware } from '../middleware/auth';
import { parseFile } from '../services/fileParser';
import {
  searchSimilarDocuments,
  getUserDocuments,
  deleteDocument,
} from '../services/ragService';
import { smartIndexDocument } from '../services/batchProcessor';

const router = Router();

type RequestWithUser = Request & { user: { userId: string } };

function hasUser(req: Request): req is RequestWithUser {
  return typeof (req as RequestWithUser).user?.userId === 'string';
}

// Configure multer storage with UTF-8 filename support
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (_req, file, cb) => {
    // Properly decode UTF-8 filename
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(originalName);
    const basename = path.basename(originalName, ext);
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  }
});

// Configure multer for file uploads
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB (increased for large documents and datasets)
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      // Documents
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      // Images
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/webp',
      // Tables
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      // Code
      'application/javascript',
      'application/typescript',
      'application/json',
      'application/xml',
      'text/html',
      'text/css',
    ];

    const allowedExtensions = [
      'pdf', 'docx', 'txt', 'md',
      'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp',
      'csv', 'xls', 'xlsx',
      'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs',
      'go', 'rs', 'rb', 'php', 'swift', 'kt', 'sql',
      'html', 'css', 'json', 'xml', 'yaml', 'yml',
    ];

    // Decode UTF-8 filename properly
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = originalName.split('.').pop()?.toLowerCase();

    if (allowedTypes.includes(file.mimetype) || (ext && allowedExtensions.includes(ext))) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Supported: documents, images, tables, code files.'));
    }
  },
});

// All RAG routes require authentication
router.use(authMiddleware);

/**
 * POST /api/rag/upload - Upload and index a file
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    if (!hasUser(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = req.user.userId;
    const file = req.file;

    // Properly decode UTF-8 filename
    const originalFileName = Buffer.from(file.originalname, 'latin1').toString('utf8');

    console.log(`📤 Processing file: ${originalFileName} (${file.size} bytes)`);

    // Parse file content
    const parsed = await parseFile(file.path, file.mimetype);

    // Index document with smart batch processing
    const documentId = await smartIndexDocument(
      userId,
      originalFileName,
      file.mimetype,
      file.size,
      parsed.content,
      parsed.metadata
    );

    // Clean up uploaded file
    await fs.unlink(file.path);

    res.json({
      message: 'File uploaded and indexed successfully',
      documentId,
      fileName: originalFileName,
      wordCount: parsed.metadata.wordCount,
      pageCount: parsed.metadata.pageCount,
    });
  } catch (error) {
    console.error('[RAG API] Upload error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to upload file',
    });
  }
});

/**
 * POST /api/rag/upload-batch - Upload and index multiple files
 */
router.post('/upload-batch', upload.array('files', 20), async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    if (!hasUser(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userId = req.user.userId;
    const results: Array<{
      fileName: string;
      status: 'success' | 'error';
      documentId?: number;
      error?: string;
      wordCount?: number;
      pageCount?: number;
    }> = [];

    console.log(`📤 Processing batch upload: ${files.length} files`);

    // Process files sequentially to avoid overwhelming the system
    for (const file of files) {
      try {
        // Properly decode UTF-8 filename
        const originalFileName = Buffer.from(file.originalname, 'latin1').toString('utf8');

        console.log(`  📄 Processing: ${originalFileName} (${file.size} bytes)`);

        // Parse file content
        const parsed = await parseFile(file.path, file.mimetype);

        // Index document with smart batch processing
        const documentId = await smartIndexDocument(
          userId,
          originalFileName,
          file.mimetype,
          file.size,
          parsed.content,
          parsed.metadata
        );

        // Clean up uploaded file
        await fs.unlink(file.path);

        results.push({
          fileName: originalFileName,
          status: 'success',
          documentId,
          wordCount: parsed.metadata.wordCount,
          pageCount: parsed.metadata.pageCount,
        });

        console.log(`  ✅ Success: ${originalFileName}`);
      } catch (fileError) {
        console.error(`  ❌ Error processing ${file.originalname}:`, fileError);

        // Clean up file on error
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          // Ignore unlink errors
        }

        results.push({
          fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
          status: 'error',
          error: fileError instanceof Error ? fileError.message : 'Failed to process file',
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`📊 Batch upload complete: ${successCount} success, ${errorCount} errors`);

    res.json({
      message: `Batch upload complete: ${successCount} success, ${errorCount} errors`,
      total: files.length,
      successCount,
      errorCount,
      results,
    });
  } catch (error) {
    console.error('[RAG API] Batch upload error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to upload files',
    });
  }
});

/**
 * GET /api/rag/documents - Get all indexed documents for user
 */
router.get('/documents', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!hasUser(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = req.user.userId;
    const documents = await getUserDocuments(userId);

    res.json({ documents });
  } catch (error) {
    console.error('[RAG API] Get documents error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get documents',
    });
  }
});

/**
 * DELETE /api/rag/documents/:id - Delete an indexed document
 */
router.delete('/documents/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!hasUser(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = req.user.userId;

    await deleteDocument(parseInt(id), userId);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('[RAG API] Delete document error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete document',
    });
  }
});

/**
 * POST /api/rag/search - Search for similar content (Vector Search Only)
 */
router.post('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, limit = 5 } = req.body;
    if (!hasUser(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = req.user.userId;

    if (!query) {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    const results = await searchSimilarDocuments(query, userId, limit);

    res.json({ results, query });
  } catch (error) {
    console.error('[RAG API] Search error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to search documents',
    });
  }
});

/**
 * POST /api/rag/query - Query using Agentic RAG (ReAct Agent) - Non-streaming
 */
router.post('/query', async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.body;
    if (!hasUser(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = req.user.userId;

    if (!query) {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    // Dynamically import to avoid circular dependencies
    const { queryAgenticRAG } = await import('../services/agenticRAG');

    const result = await queryAgenticRAG(userId, query);

    res.json({
      query,
      answer: result.answer,
      sources: result.sources,
      steps: result.steps,
    });
  } catch (error) {
    console.error('[RAG API] Agentic query error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to process agentic query',
    });
  }
});

/**
 * GET /api/rag/query-stream - Query using Agentic RAG with SSE streaming
 * Shows reasoning steps in real-time (like Research mode)
 */
router.get('/query-stream', async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.query as string;

    if (!hasUser(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = req.user.userId;

    if (!query) {
      res.status(400).json({ error: 'Query parameter is required' });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    console.log(`\n📡 [RAG Stream] Starting for user: ${userId}`);
    console.log(`❓ Query: "${query}"`);

    // Dynamically import streaming function
    const { streamAgenticRAG } = await import('../services/agenticRAG');

    try {
      // Stream reasoning steps
      for await (const event of streamAgenticRAG(userId, query)) {
        const data = JSON.stringify(event);
        res.write(`data: ${data}\n\n`);

        // If done, send final signal and close
        if (event.done) {
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }
      }
    } catch (streamError) {
      console.error('[RAG Stream] Streaming error:', streamError);

      // Send error event if headers already sent
      const errorEvent = {
        type: 'error',
        content: streamError instanceof Error ? streamError.message : 'Unknown streaming error',
        done: true,
      };
      res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (error) {
    console.error('[RAG API] Stream setup error:', error);

    // If headers not sent yet, can send JSON error
    if (!res.headersSent) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to start streaming',
      });
    } else {
      // Headers already sent, close the stream
      res.end();
    }
  }
});

export default router;
