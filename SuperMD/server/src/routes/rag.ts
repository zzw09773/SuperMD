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

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB (increased for images and code files)
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

    const ext = file.originalname.split('.').pop()?.toLowerCase();

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

    console.log(`📤 Processing file: ${file.originalname} (${file.size} bytes)`);

    // Parse file content
    const parsed = await parseFile(file.path, file.mimetype);

    // Index document with smart batch processing
    const documentId = await smartIndexDocument(
      userId,
      file.originalname,
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
      fileName: file.originalname,
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
 * POST /api/rag/query - Query using Agentic RAG (ReAct Agent)
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
      steps: result.steps.map((step: any) => ({
        tool: step.action?.tool,
        input: step.action?.toolInput,
        output: step.observation?.substring(0, 200) + (step.observation?.length > 200 ? '...' : ''),
      })),
    });
  } catch (error) {
    console.error('[RAG API] Agentic query error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to process agentic query',
    });
  }
});

export default router;
