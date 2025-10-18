import { Router, Request, Response } from 'express';
import { streamResearchResponse } from '../agents/researchAgent';
import { verifyToken } from '../services/authService';
import { getLLMConfig } from '../config/aiConfig';

const router = Router();

// Research query endpoint with streaming (GET for SSE compatibility)
router.get('/query', async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, documentContent } = req.query;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    let userId: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;
      try {
        const payload = verifyToken(token);
        userId = payload.userId;
      } catch (error) {
        console.warn('[Research API] Failed to verify Authorization header token');
      }
    }

    if (!userId && typeof req.query.token === 'string') {
      try {
        const payload = verifyToken(req.query.token);
        userId = payload.userId;
      } catch (error) {
        console.warn('[Research API] Failed to verify token query parameter');
      }
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    console.log('[Research API] Processing query:', query);

    // Stream response with metadata
    const result = await streamResearchResponse(
      query as string,
      documentContent as string | undefined,
      (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      },
      { userId }
    );

    res.write(`data: ${JSON.stringify({
      done: true,
      fullResponse: result.response,
      toolCalls: result.toolCalls,
      sources: result.sources
    })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';

    console.error('[Research API] Error:', errorMessage);
    console.error('[Research API] Stack:', errorStack);

    if (!res.headersSent) {
      res.status(500).json({
        error: errorMessage,
      });
    } else {
      res.write(`data: ${JSON.stringify({
        error: `Research failed: ${errorMessage}`
      })}\n\n`);
      res.end();
    }
  }
});

// Get research status
router.get('/status', (_req: Request, res: Response): Promise<void> => {
  const llmConfig = getLLMConfig();
  res.json({
    status: 'operational',
    features: ['calculator', 'google_search', 'document_search'],
    model: llmConfig.modelName,
  });
  return Promise.resolve();
});

export default router;
