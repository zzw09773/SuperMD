import { Router, Request, Response } from 'express';
import { streamResearchResponse } from '../agents/researchAgent';

const router = Router();

// Research query endpoint with streaming
router.post('/query', async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, documentContent } = req.body;

    if (!query) {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    console.log('[Research API] Processing query:', query);

    // Stream response with metadata
    const result = await streamResearchResponse(
      query,
      documentContent,
      (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
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
    console.error('[Research API] Error:', error);

    if (!res.headersSent) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Research query failed',
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Research failed' })}\n\n`);
      res.end();
    }
  }
});

// Get research status
router.get('/status', (_req: Request, res: Response): Promise<void> => {
  res.json({
    status: 'operational',
    features: ['calculator', 'google_search', 'document_search'],
    model: process.env.OPENAI_MODEL || 'gpt-5-mini',
  });
  return Promise.resolve();
});

export default router;
