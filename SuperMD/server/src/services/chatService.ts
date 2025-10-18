import { Request, Response } from 'express';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { RunnableSequence } from '@langchain/core/runnables';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { requireLLMConfig } from '../config/aiConfig';

// Lazy model holder to allow .env to load & to fail fast with clearer message
const modelCache = new Map<string, ChatOpenAI>();

function getModel(opts?: { modelName?: string; temperature?: number }): ChatOpenAI {
  const llmConfig = requireLLMConfig('ChatService');
  const modelName = opts?.modelName || llmConfig.modelName;

  let temperature = opts?.temperature ?? 1;

  const temperatureLockedModels = new Set(['o3', 'o3-mini', 'gpt-4.1-nano-exp']);
  if (temperatureLockedModels.has(modelName) && temperature !== 1) {
    console.warn(`[Chat Service] Model ${modelName} requires temperature=1. Overriding.`);
    temperature = 1;
  }

  const cacheKey = `${modelName}::${temperature}`;
  if (modelCache.has(cacheKey)) {
    return modelCache.get(cacheKey)!;
  }

  const instance = new ChatOpenAI({
    modelName,
    temperature,
    configuration: {
      apiKey: llmConfig.apiKey,
      baseURL: llmConfig.baseURL,
    },
  });

  modelCache.set(cacheKey, instance);
  return instance;
}

export const handleChat = async (req: Request, res: Response): Promise<void> => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'Messages are required and must be an array.' });
    return;
  }

  // Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const pastMessages = messages.map((msg: { role: string; content: string }) => {
      if (msg.role === 'user') {
        return new HumanMessage(msg.content);
      } else if (msg.role === 'assistant') {
        return new AIMessage(msg.content);
      }
      // Fallback for other roles, though we primarily expect user/assistant
      return new HumanMessage(msg.content);
    });

    const prompt = PromptTemplate.fromTemplate(
      `You are a helpful assistant. Answer the user's question based on the following chat history.

Chat History:
{chat_history}

User Question: {input}`
    );

    const chain = RunnableSequence.from([
      {
        input: (initialInput: any) => initialInput.input,
        chat_history: (initialInput: any) => initialInput.chat_history,
      },
      prompt,
      getModel(),
      new StringOutputParser(),
    ]);

    const stream = await chain.stream({
      input: messages[messages.length - 1].content,
      chat_history: pastMessages.slice(0, -1).map(m => m.content).join('\n'),
    });

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
  } catch (error) {
    console.error('[Chat Service] Stream error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
  } finally {
    res.end();
  }
};




