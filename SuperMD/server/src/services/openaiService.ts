import OpenAI from 'openai';
import { Request, Response } from 'express';
import { requireLLMConfig } from '../config/aiConfig';

// Initialize OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (openaiClient) return openaiClient;

  const llmConfig = requireLLMConfig('OpenAIService');

  openaiClient = new OpenAI({
    apiKey: llmConfig.apiKey,
    baseURL: llmConfig.baseURL,
  });
  return openaiClient;
}

/**
 * Handle chat completion with GPT-5 API
 * Supports streaming and new GPT-5 parameters
 */
export const handleGPT5Chat = async (req: Request, res: Response): Promise<void> => {
  const {
    messages,
    model = 'gpt-5-mini', // Default to gpt-5-mini for cost efficiency
    temperature = 1, // GPT-5 only supports temperature = 1
    max_completion_tokens = 2000, // GPT-5 uses max_completion_tokens instead of max_tokens
    stream = true,
    verbosity = 'medium',
    reasoning_effort = 'medium',
  } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Messages are required and must be a non-empty array.' });
    return;
  }

  try {
    const client = getOpenAIClient();

    // Handle streaming responses
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const streamResponse = await client.chat.completions.create({
        model,
        messages,
        temperature,
        max_completion_tokens,
        stream: true,
        // GPT-5 specific parameters
        ...(model.startsWith('gpt-5') && {
          verbosity,
          reasoning_effort,
        }),
      } as any) as any; // Type assertion for GPT-5 params and stream

      for await (const chunk of streamResponse) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(`data: ${JSON.stringify({ chunk: content })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      // Handle non-streaming responses
      const response = await client.chat.completions.create({
        model,
        messages,
        temperature,
        max_completion_tokens,
        stream: false,
        // GPT-5 specific parameters
        ...(model.startsWith('gpt-5') && {
          verbosity,
          reasoning_effort,
        }),
      } as any);

      res.json({
        message: response.choices[0]?.message?.content || '',
        usage: response.usage,
        model: response.model,
      });
    }
  } catch (error) {
    console.error('[OpenAI Service] Error:', error);

    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: 'Stream error occurred' })}\n\n`);
      res.end();
    } else {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      res.status(500).json({ error: errorMessage });
    }
  }
};

/**
 * Get available GPT-5 models
 */
export const getAvailableModels = () => {
  return [
    {
      id: 'gpt-5',
      name: 'GPT-5',
      description: 'Most capable model, best for complex reasoning and coding',
      pricing: { input: 1.25, output: 10 }, // per 1M tokens
    },
    {
      id: 'gpt-5-mini',
      name: 'GPT-5 Mini',
      description: 'Balanced performance and cost',
      pricing: { input: 0.25, output: 2 },
    },
    {
      id: 'gpt-5-nano',
      name: 'GPT-5 Nano',
      description: 'Fastest and most affordable',
      pricing: { input: 0.05, output: 0.4 },
    },
    {
      id: 'gpt-5-chat-latest',
      name: 'GPT-5 Chat',
      description: 'Non-reasoning model used in ChatGPT',
      pricing: { input: 1.0, output: 8 },
    },
  ];
};
