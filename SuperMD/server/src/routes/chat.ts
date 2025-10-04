import { Router, Request, Response } from 'express';
import { handleGPT5Chat, getAvailableModels } from '../services/openaiService';

const router = Router();

// Chat completion endpoint with GPT-5 support
router.post('/', (req: Request, res: Response) => {
  try {
    handleGPT5Chat(req, res);
  } catch (error) {
    console.error('[Chat API] Error handling chat:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to handle chat session' });
    }
  }
});

// Get available models
router.get('/models', (_req: Request, res: Response) => {
  res.json({ models: getAvailableModels() });
});

export default router;
