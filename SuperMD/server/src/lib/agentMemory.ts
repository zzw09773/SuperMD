import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import pool from './pgvector';
import { getLLMConfig, requireLLMConfig } from '../config/aiConfig';

const MAX_MEMORY_TOKENS = Number(process.env.AGENT_MEMORY_MAX_TOKENS ?? 1600);
const SUMMARY_TARGET_TOKENS = Number(process.env.AGENT_MEMORY_TARGET_TOKENS ?? 1200);
const MIN_BATCH_MESSAGES = 4;

export type AgentMemoryMode = 'rag' | 'research';

export type AgentMemoryRole = 'human' | 'assistant' | 'system';

export interface AgentMemoryEntryInput {
  role: AgentMemoryRole;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface AgentMemoryEntryRecord extends AgentMemoryEntryInput {
  id: number;
  tokens: number;
  createdAt: Date;
}

export interface AgentMemorySummary {
  content: string;
  tokens: number;
}

export interface LoadedAgentMemory {
  summary?: AgentMemorySummary;
  entries: AgentMemoryEntryRecord[];
}

const estimateTokens = (text: string): number => {
  if (!text) return 0;
  const tokenEstimate = Math.ceil(text.length / 4);
  return Math.max(1, tokenEstimate);
};

export const loadAgentMemory = async (
  userId: string,
  mode: AgentMemoryMode
): Promise<LoadedAgentMemory> => {
  try {
    const client = await pool.connect();
    try {
      const summaryResult = await client.query<{
        content: string;
        tokens: number;
      }>(
        `
          SELECT content, tokens
          FROM agent_memory_summaries
          WHERE user_id = $1 AND mode = $2
        `,
        [userId, mode]
      );

      const summaryRow = summaryResult.rows[0];

    const entriesResult = await client.query<{
      id: number;
      role: AgentMemoryRole;
      content: string;
      tokens: number;
      metadata: Record<string, unknown> | null;
      created_at: string;
    }>(
      `
        SELECT id, role, content, tokens, metadata, created_at
        FROM agent_memory_entries
        WHERE user_id = $1 AND mode = $2
        ORDER BY created_at ASC
      `,
      [userId, mode]
    );

    const entries: AgentMemoryEntryRecord[] = entriesResult.rows.map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      tokens: row.tokens,
      metadata: row.metadata ?? undefined,
      createdAt: new Date(row.created_at),
    }));

      return {
        summary: summaryRow
          ? {
              content: summaryRow.content,
              tokens: summaryRow.tokens,
            }
          : undefined,
        entries,
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.warn('[AgentMemory] Database unavailable, using empty memory:', error instanceof Error ? error.message : error);
    return { entries: [] };
  }
};

export const appendAgentMemory = async (
  userId: string,
  mode: AgentMemoryMode,
  entries: AgentMemoryEntryInput[]
): Promise<void> => {
  if (entries.length === 0) return;

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

    for (const entry of entries) {
      const tokens = estimateTokens(entry.content);
      await client.query(
        `
          INSERT INTO agent_memory_entries (user_id, mode, role, content, tokens, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          userId,
          mode,
          entry.role,
          entry.content,
          tokens,
          entry.metadata ? JSON.stringify(entry.metadata) : null,
        ]
      );
    }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[AgentMemory] Failed to append memory entries', error);
      return;
    } finally {
      client.release();
    }

    await trimAgentMemory(userId, mode);
  } catch (error) {
    console.warn('[AgentMemory] Database unavailable, skipping append:', error instanceof Error ? error.message : error);
    return;
  }
};

const trimAgentMemory = async (userId: string, mode: AgentMemoryMode): Promise<void> => {
  try {
    const client = await pool.connect();
    try {
    const summaryResult = await client.query<{
      content: string;
      tokens: number;
    }>(
      `
        SELECT content, tokens
        FROM agent_memory_summaries
        WHERE user_id = $1 AND mode = $2
      `,
      [userId, mode]
    );

    const summaryRow = summaryResult.rows[0];
    const summaryTokens = summaryRow?.tokens ?? 0;

    const entriesResult = await client.query<{
      id: number;
      role: AgentMemoryRole;
      content: string;
      tokens: number;
      metadata: Record<string, unknown> | null;
      created_at: string;
    }>(
      `
        SELECT id, role, content, tokens, metadata, created_at
        FROM agent_memory_entries
        WHERE user_id = $1 AND mode = $2
        ORDER BY created_at ASC
      `,
      [userId, mode]
    );

    const records = entriesResult.rows;
    const totalTokens = summaryTokens + records.reduce((acc, row) => acc + row.tokens, 0);

    if (totalTokens <= MAX_MEMORY_TOKENS) {
      return;
    }

    const overflow = totalTokens - MAX_MEMORY_TOKENS;

    const batch: typeof records = [];
    let collected = 0;

    for (const row of records) {
      batch.push(row);
      collected += row.tokens;
      if (collected >= overflow && batch.length >= MIN_BATCH_MESSAGES) {
        break;
      }
    }

    if (batch.length === 0) {
      return;
    }

    const idsToRemove = batch.map((row) => row.id);

    const shouldSummarize = Boolean(getLLMConfig().apiKey);

    if (shouldSummarize) {
      try {
        const newSummary = await summarizeBatch(summaryRow?.content ?? '', batch);
        const summaryTokensCount = estimateTokens(newSummary);

        await client.query(
          `
            INSERT INTO agent_memory_summaries (user_id, mode, content, tokens, created_at, updated_at)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, mode)
            DO UPDATE SET content = EXCLUDED.content, tokens = EXCLUDED.tokens, updated_at = CURRENT_TIMESTAMP
          `,
          [userId, mode, newSummary, summaryTokensCount]
        );
      } catch (error) {
        console.warn('[AgentMemory] Summarization failed, falling back to dropping entries', error);
      }
    }

    await client.query(
      `
        DELETE FROM agent_memory_entries
        WHERE id = ANY($1::int[])
      `,
      [idsToRemove]
    );
    } finally {
      client.release();
    }

    // Ensure we are within the target after trimming
    const postTrim = await loadAgentMemory(userId, mode);
  const totalTokensAfter =
    (postTrim.summary?.tokens ?? 0) +
    postTrim.entries.reduce((acc, entry) => acc + entry.tokens, 0);

    if (totalTokensAfter > MAX_MEMORY_TOKENS) {
      // Recursively trim until within bounds (safeguarded by deletion fallback)
      await trimAgentMemory(userId, mode);
    }
  } catch (error) {
    console.warn('[AgentMemory] Database unavailable, skipping trim:', error instanceof Error ? error.message : error);
    return;
  }
};

const summarizeBatch = async (
  existingSummary: string,
  batch: {
    role: AgentMemoryRole;
    content: string;
  }[]
): Promise<string> => {
  const llmConfig = requireLLMConfig('AgentMemory');
  const llm = new ChatOpenAI({
    modelName: llmConfig.modelName,
    temperature: 1, // GPT-5 only supports temperature=1
    configuration: {
      apiKey: llmConfig.apiKey,
      baseURL: llmConfig.baseURL,
    },
  });

  const formattedHistory = batch
    .map((entry) => {
      const speaker =
        entry.role === 'human' ? '使用者' : entry.role === 'assistant' ? 'SuperMD' : '系統';
      return `${speaker}：${entry.content}`;
    })
    .join('\n');

  const summaryPrompt = [
    new SystemMessage(
      '你是 SuperMD 的對話記憶整理助手，需將過往對話壓縮成短摘要，保留命名實體、文件名稱與指涉關係，並在 250 個中文字以內。'
    ),
    new HumanMessage(
      `既有摘要（若無請填「(無)」）：${existingSummary || '(無)'}

新增對話：
${formattedHistory}

請輸出更新後的摘要，格式為條列或短段落，但務必保留可讓系統辨識「那個文件」「剛剛的步驟」等指涉所需的關鍵詞。`
    ),
  ];

  const response = await llm.invoke(summaryPrompt);
  const text = Array.isArray(response.content)
    ? response.content.map((item) => (typeof item === 'string' ? item : '')).join('')
    : response.content?.toString() ?? '';

  if (!text.trim()) {
    return existingSummary;
  }

  return text.trim();
};

export const memoryToMessages = (
  memory: LoadedAgentMemory,
  summaryLabel: string = 'Conversation summary'
): BaseMessage[] => {
  const messages: BaseMessage[] = [];

  if (memory.summary) {
    messages.push(
      new SystemMessage(`${summaryLabel}:\n${memory.summary.content}`.trim())
    );
  }

  for (const entry of memory.entries) {
    if (entry.role === 'human') {
      messages.push(new HumanMessage(entry.content));
    } else if (entry.role === 'assistant') {
      messages.push(new AIMessage(entry.content));
    } else {
      messages.push(new SystemMessage(entry.content));
    }
  }

  return messages;
};

export const collectConversationContext = (
  memory: LoadedAgentMemory
): {
  lastQuery?: string;
  lastAnswer?: string;
  lastSources?: string[];
} => {
  let lastQuery: string | undefined;
  let lastAnswer: string | undefined;
  let lastSources: string[] | undefined;

  for (let idx = memory.entries.length - 1; idx >= 0; idx -= 1) {
    const entry = memory.entries[idx];

    if (!lastAnswer && entry.role === 'assistant') {
      lastAnswer = entry.content;
      if (entry.metadata && Array.isArray((entry.metadata as Record<string, unknown>).sources)) {
        lastSources = (entry.metadata as { sources?: string[] }).sources;
      }
      continue;
    }

    if (!lastQuery && entry.role === 'human') {
      lastQuery = entry.content;
      continue;
    }

    if (!lastSources && entry.role === 'system') {
      const metadata = entry.metadata as { type?: string; sources?: string[] } | undefined;
      if (metadata?.type === 'sources') {
        lastSources = metadata.sources;
      } else if (entry.content.startsWith('SOURCES:')) {
        lastSources = entry.content
          .replace(/^SOURCES:\s*/, '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }

    if (lastQuery && lastAnswer && lastSources) {
      break;
    }
  }

  return {
    lastQuery,
    lastAnswer,
    lastSources,
  };
};
