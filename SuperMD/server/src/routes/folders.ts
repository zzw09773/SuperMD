import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Get all folders for a user
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId = 'demo-user' } = req.query;

    const folders = await prisma.folder.findMany({
      where: { userId: userId as string },
      include: {
        children: true,
        documents: {
          select: {
            id: true,
            title: true,
            lastEditedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ folders });
  } catch (error) {
    console.error('[Folders API] Error fetching folders:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// Create new folder
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, color, parentId, userId = 'demo-user' } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        color: color || '#3498db',
        parentId: parentId || null,
        userId,
      },
    });

    console.log('[Folders API] Created folder:', folder.id);
    res.status(201).json({ folder });
  } catch (error) {
    console.error('[Folders API] Error creating folder:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Update folder
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color, parentId } = req.body;

    const folder = await prisma.folder.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        color: color !== undefined ? color : undefined,
        parentId: parentId !== undefined ? parentId : undefined,
      },
    });

    console.log('[Folders API] Updated folder:', id);
    res.json({ folder });
  } catch (error) {
    console.error('[Folders API] Error updating folder:', error);
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

// Delete folder
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.folder.delete({
      where: { id },
    });

    console.log('[Folders API] Deleted folder:', id);
    res.json({ success: true });
  } catch (error) {
    console.error('[Folders API] Error deleting folder:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

export default router;
