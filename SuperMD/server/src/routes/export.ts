import { Router, Request, Response } from 'express';
import { exportDocument } from '../services/exportService';

const router = Router();

/**
 * POST /api/export
 * Export document to various formats
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { content, title, format } = req.body;

    // Validation
    if (!content || !format) {
      res.status(400).json({ error: 'Content and format are required' });
      return;
    }

    const validFormats = ['md', 'html', 'pdf', 'docx', 'txt'];
    if (!validFormats.includes(format)) {
      res.status(400).json({ error: `Invalid format. Must be one of: ${validFormats.join(', ')}` });
      return;
    }

    const documentTitle = title || 'document';

    // Export document
    await exportDocument(content, documentTitle, format, res);
  } catch (error) {
    console.error('[Export] Error:', error);

    if (!res.headersSent) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Export failed'
      });
    }
  }
});

export default router;
