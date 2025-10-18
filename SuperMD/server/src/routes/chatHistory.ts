import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

// All chat history routes require authentication
router.use(authMiddleware);

type RequestWithUser = Request & { user: { userId: string } };

function hasUser(req: Request): req is RequestWithUser {
  return typeof (req as RequestWithUser).user?.userId === 'string';
}

/**
 * GET /api/chat-history/:documentId - Get chat history for a document
 */
router.get('/:documentId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { documentId } = req.params;
    if (!hasUser(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = req.user.userId;

    // Verify user owns the document
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: userId,
      },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    // Get chat history
    const messages = await prisma.chatMessage.findMany({
      where: { documentId },
      orderBy: { createdAt: 'asc' },
    });

    // Parse JSON fields
    const parsedMessages = messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      mode: msg.mode,
      sources: msg.sources ? JSON.parse(msg.sources) : undefined,
      ragSources: msg.sources ? JSON.parse(msg.sources).ragSources : undefined,
      metadata: msg.metadata ? JSON.parse(msg.metadata) : undefined,
      timestamp: msg.createdAt,
    }));

    res.json({ messages: parsedMessages });
  } catch (error) {
    console.error('[Chat History] Get error:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

/**
 * POST /api/chat-history/:documentId - Save a chat message
 */
router.post('/:documentId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { documentId } = req.params;
    if (!hasUser(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = req.user.userId;
    const { role, content, mode = 'chat', sources, ragSources, metadata } = req.body;

    // Verify user owns the document
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: userId,
      },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    // Combine sources and ragSources
    const combinedSources = sources || ragSources ? {
      sources,
      ragSources,
    } : null;

    // Save message
    const message = await prisma.chatMessage.create({
      data: {
        documentId,
        role,
        content,
        mode,
        sources: combinedSources ? JSON.stringify(combinedSources) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    res.json({
      id: message.id,
      role: message.role,
      content: message.content,
      mode: message.mode,
      sources: combinedSources?.sources,
      ragSources: combinedSources?.ragSources,
      metadata: metadata,
      timestamp: message.createdAt,
    });
  } catch (error) {
    console.error('[Chat History] Save error:', error);
    res.status(500).json({ error: 'Failed to save chat message' });
  }
});

/**
 * DELETE /api/chat-history/:documentId - Clear chat history for a document
 */
router.delete('/:documentId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { documentId } = req.params;
    if (!hasUser(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = req.user.userId;

    // Verify user owns the document
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: userId,
      },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    // Delete all messages for this document
    await prisma.chatMessage.deleteMany({
      where: { documentId },
    });

    res.json({ message: 'Chat history cleared' });
  } catch (error) {
    console.error('[Chat History] Clear error:', error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

/**
 * DELETE /api/chat-history/:documentId/:messageId - Delete a specific message
 */
router.delete('/:documentId/:messageId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { documentId, messageId } = req.params;
    if (!hasUser(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const userId = req.user.userId;

    // Verify user owns the document
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: userId,
      },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    // Delete the message
    await prisma.chatMessage.delete({
      where: { id: messageId },
    });

    res.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('[Chat History] Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;
