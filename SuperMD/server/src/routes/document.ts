import { Router, Request, Response } from 'express';
import {
  createDocument,
  getUserDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  moveDocumentToProject,
} from '../services/documentService';
import { authMiddleware } from '../middleware/auth';

const router = Router();

type RequestWithUser = Request & { user: { userId: string } };

function hasUser(req: Request): req is RequestWithUser {
  return typeof (req as RequestWithUser).user?.userId === 'string';
}

// All document routes require authentication
router.use(authMiddleware);

/**
 * GET /api/documents - Get all documents for authenticated user
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!hasUser(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = req.user.userId;
    const documents = await getUserDocuments(userId);
    res.json({ documents });
  } catch (error) {
    console.error('[Document API] Get documents error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get documents',
    });
  }
});

/**
 * GET /api/documents/:id - Get a specific document
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!hasUser(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = req.user.userId;
    const document = await getDocumentById(id, userId);
    res.json({ document });
  } catch (error) {
    console.error('[Document API] Get document error:', error);
    res.status(404).json({
      error: error instanceof Error ? error.message : 'Document not found',
    });
  }
});

/**
 * POST /api/documents - Create a new document
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, content, projectId } = req.body;
    if (!hasUser(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = req.user.userId;

    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    const document = await createDocument({
      title,
      content,
      projectId,
      userId,
    });

    res.status(201).json({
      message: 'Document created successfully',
      document,
    });
  } catch (error) {
    console.error('[Document API] Create document error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create document',
    });
  }
});

/**
 * PATCH /api/documents/:id - Update a document
 */
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!hasUser(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = req.user.userId;
    const { title, content, projectId } = req.body;

    const document = await updateDocument(id, userId, {
      title,
      content,
      projectId,
    });

    res.json({
      message: 'Document updated successfully',
      document,
    });
  } catch (error) {
    console.error('[Document API] Update document error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update document',
    });
  }
});

/**
 * DELETE /api/documents/:id - Delete a document
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!hasUser(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = req.user.userId;

    await deleteDocument(id, userId);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('[Document API] Delete document error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete document',
    });
  }
});

/**
 * PATCH /api/documents/:id/move - Move document to a project
 */
router.patch('/:id/move', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!hasUser(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = req.user.userId;
    const { projectId } = req.body; // null to move to ungrouped

    const document = await moveDocumentToProject(id, userId, projectId);

    res.json({
      message: 'Document moved successfully',
      document,
    });
  } catch (error) {
    console.error('[Document API] Move document error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to move document',
    });
  }
});

export default router;
