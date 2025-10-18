import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { exportDocument } from '../services/exportService';

const router = Router();

// Get all documents for a user
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId = 'demo-user' } = req.query;
    
    const documents = await prisma.document.findMany({
      where: { userId: userId as string },
      include: {
        folder: true,
        versions: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { lastEditedAt: 'desc' },
    });

    res.json({ documents });
  } catch (error) {
    console.error('[Documents API] Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get single document by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        folder: true,
        versions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.json({ document });
  } catch (error) {
    console.error('[Documents API] Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Create new document
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, content, folderId, userId = 'demo-user', tags = '' } = req.body;

    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    const document = await prisma.document.create({
      data: {
        title,
        content: content || '',
        folderId: folderId || null,
        userId,
        tags,
        lastEditedAt: new Date(),
      },
      include: {
        folder: true,
      },
    });

    // Create initial version
    await prisma.version.create({
      data: {
        documentId: document.id,
        content: content || '',
        version: 1,
        createdBy: userId,
      },
    });

    console.log('[Documents API] Created document:', document.id);
    res.status(201).json({ document });
  } catch (error) {
    console.error('[Documents API] Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Update document
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, folderId, tags } = req.body;

    // Get current version count
    const versionCount = await prisma.version.count({
      where: { documentId: id },
    });

    // Update document
    const document = await prisma.document.update({
      where: { id },
      data: {
        title: title !== undefined ? title : undefined,
        content: content !== undefined ? content : undefined,
        folderId: folderId !== undefined ? folderId : undefined,
        tags: tags !== undefined ? tags : undefined,
        lastEditedAt: new Date(),
      },
      include: {
        folder: true,
      },
    });

    // Create new version if content changed
    if (content !== undefined) {
      await prisma.version.create({
        data: {
          documentId: id,
          content,
          version: versionCount + 1,
        },
      });
    }

    console.log('[Documents API] Updated document:', id);
    res.json({ document });
  } catch (error) {
    console.error('[Documents API] Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete document
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.document.delete({
      where: { id },
    });

    console.log('[Documents API] Deleted document:', id);
    res.json({ success: true });
  } catch (error) {
    console.error('[Documents API] Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Search documents
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, userId = 'demo-user' } = req.query;

    if (!q) {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }

    const query = (q as string).trim();

    const documents = await prisma.document.findMany({
      where: {
        userId: userId as string,
        OR: [
          { title: { contains: query } },
          { content: { contains: query } },
          { tags: { contains: query } },
        ],
      },
      include: {
        folder: true,
      },
      orderBy: { lastEditedAt: 'desc' },
    });

    res.json({ documents });
  } catch (error) {
    console.error('[Documents API] Error searching documents:', error);
    res.status(500).json({ error: 'Failed to search documents' });
  }
});

// Export document
router.get('/:id/export', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { format = 'md' } = req.query;

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    await exportDocument(document.content, document.title, format as string, res);
  } catch (error) {
    console.error('[Documents API] Error exporting document:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to export document' });
    }
  }
});

export default router;
