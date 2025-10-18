import { ChatOpenAI } from '@langchain/openai';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { z } from 'zod';
import { google } from 'googleapis';
import {
  wikipediaSearchTool,
  arxivSearchTool,
  stackOverflowSearchTool,
  githubSearchTool,
  writingAssistantTool,
  translationTool,
  summarizationTool,
  codeExplanationTool,
} from './tools';
import { appendAgentMemory, loadAgentMemory, type AgentMemoryEntryInput } from '../lib/agentMemory';
import { requireLLMConfig } from '../config/aiConfig';
import { searchSimilarDocuments } from '../services/ragService';

type ResearchAgentConfig = {
  documentContent?: string;
};

const toolDisplayNames: Record<string, string> = {
  google_search: 'Google 搜尋',
  wikipedia_search: 'Wikipedia 查詢',
  arxiv_search: 'arXiv 論文搜尋',
  stackoverflow_search: 'Stack Overflow 搜尋',
  github_search: 'GitHub 程式碼搜尋',
  calculator: '計算器',
  document_search: '文件內容搜尋',
  knowledge_base_search: 'RAG 知識庫搜尋',
  writing_assistant: '寫作助理',
  translate: '翻譯工具',
  summarize: '摘要工具',
  explain_code: '程式碼說明',
};

// Initialize LLM
function getLLM() {
  const llmConfig = requireLLMConfig('ResearchAgent');
  return new ChatOpenAI({
    modelName: llmConfig.modelName,
    temperature: 1, // GPT-5 only supports temperature=1
    configuration: {
      apiKey: llmConfig.apiKey,
      baseURL: llmConfig.baseURL,
    },
  });
}

function toText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content.map(item => toText(item)).join('');
  }

  if (content && typeof content === 'object') {
    const maybeText = content as { text?: unknown; content?: unknown };
    if (typeof maybeText.text === 'string') {
      return maybeText.text;
    }

    if (typeof maybeText.content === 'string') {
      return maybeText.content;
    }
  }

  if (content === null || content === undefined) {
    return '';
  }

  try {
    return JSON.stringify(content);
  } catch {
    return String(content);
  }
}

// Tool: Calculator
const calculatorSchema = z.object({
  expression: z.string().describe('The mathematical expression to evaluate'),
});

const calculatorTool = new DynamicStructuredTool({
  name: 'calculator',
  description: 'Performs mathematical calculations. Input should be a mathematical expression.',
  schema: calculatorSchema,
  func: async ({ expression }: z.infer<typeof calculatorSchema>) => {
    try {
      // Safe eval using Function constructor
      const result = Function(`'use strict'; return (${expression})`)();
      return `Result: ${result}`;
    } catch (error) {
      return `Error evaluating expression: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});

// Tool: Google Custom Search API (Official)
function createWebSearchTool() {
  const webSearchSchema = z.object({
    query: z.string().describe('The search query to send to Google'),
  });

  return new DynamicStructuredTool({
    name: 'google_search',
    description: 'Searches Google for real-time information. Use this to find current information, news, research papers, documentation, or any web content.',
    schema: webSearchSchema,
    func: async ({ query }: z.infer<typeof webSearchSchema>) => {
      const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
      const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

      if (!searchEngineId || !credentialsPath) {
        console.warn('[Research Agent] Google Custom Search not configured');
        return `⚠️ Google Search not configured. Please add to .env file:

GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json

Query: "${query}"`;
      }

      try {
        console.log(`[Google Search] Searching for: "${query}"`);

        // Read credentials file
        const fs = require('fs');
        const path = require('path');
        const credentialsFullPath = path.resolve(credentialsPath);
        const credentials = JSON.parse(fs.readFileSync(credentialsFullPath, 'utf8'));

        // Initialize auth with JWT
        const auth = new google.auth.JWT({
          email: credentials.client_email,
          key: credentials.private_key,
          scopes: ['https://www.googleapis.com/auth/cse'],
        });

        const customsearch = google.customsearch('v1');

        const response = await customsearch.cse.list({
          auth: auth,
          cx: searchEngineId,
          q: query,
          num: 5,
        });

        const items = response.data.items || [];

        if (items.length === 0) {
          return `No results found for "${query}"`;
        }

        let formattedResults = `🔍 Google Search Results for "${query}":\n\n`;

        items.forEach((item: any, index: number) => {
          formattedResults += `${index + 1}. **${item.title}**\n`;
          formattedResults += `   ${item.snippet}\n`;
          formattedResults += `   🔗 ${item.link}\n\n`;
        });

        return formattedResults;
      } catch (error) {
        console.error('[Google Search] Error:', error);
        return `Error searching Google: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  });
}

// Tool: Document Search
const documentSearchSchema = z.object({
  query: z.string().describe('What to search for in the document'),
});

const documentSearchTool = new DynamicStructuredTool({
  name: 'document_search',
  description: 'Searches through the current document content for relevant information.',
  schema: documentSearchSchema,
  func: async (
    { query }: z.infer<typeof documentSearchSchema>,
    _runManager?: unknown,
    config?: { configurable?: ResearchAgentConfig },
  ) => {
    const documentContent = config?.configurable?.documentContent;

    if (!documentContent) {
      return 'No document content available.';
    }

    // Simple text search
    const lines = documentContent.split('\n');
    const matchingLines = lines.filter((line: string) =>
      line.toLowerCase().includes(query.toLowerCase())
    );

    if (matchingLines.length === 0) {
      return `No results found for "${query}" in the document.`;
    }

    return `Found ${matchingLines.length} matches:\n${matchingLines.slice(0, 5).join('\n')}`;
  },
});

// Tool: RAG Knowledge Base Search
function createKnowledgeBaseSearchTool(userId?: string) {
  const knowledgeBaseSearchSchema = z.object({
    query: z.string().describe('The search query to find relevant information in the knowledge base'),
  });

  return new DynamicStructuredTool({
    name: 'knowledge_base_search',
    description: 'Searches through the user\'s personal RAG knowledge base (uploaded documents like PDFs, TXT files, etc.) for relevant information. Use this to find information from documents the user has previously uploaded to their knowledge base.',
    schema: knowledgeBaseSearchSchema,
    func: async ({ query }: z.infer<typeof knowledgeBaseSearchSchema>) => {
      if (!userId) {
        return '⚠️ Knowledge base search requires user authentication. Please ensure you are logged in.';
      }

      try {
        console.log(`[Knowledge Base Search] Searching for: "${query}" (userId: ${userId})`);

        const results = await searchSimilarDocuments(query, userId, 5);

        if (results.length === 0) {
          return `📚 知識庫搜尋結果：未找到與「${query}」相關的內容。\n\n提示：您可能需要先上傳相關文件到 RAG 知識庫。`;
        }

        let formattedResults = `📚 知識庫搜尋結果（找到 ${results.length} 個相關片段）：\n\n`;

        results.forEach((result, index) => {
          const similarityPercent = (result.similarity * 100).toFixed(1);
          formattedResults += `${index + 1}. **來源：${result.fileName}** (相似度: ${similarityPercent}%)\n`;
          formattedResults += `   ${result.content}\n\n`;
        });

        return formattedResults;
      } catch (error) {
        console.error('[Knowledge Base Search] Error:', error);

        // Check if error is due to database not available
        if (error instanceof Error && error.message.includes('database')) {
          return `⚠️ RAG 知識庫目前無法使用。請確保 PostgreSQL 資料庫已啟動並正確配置。\n\n查詢：「${query}」`;
        }

        return `搜尋知識庫時發生錯誤：${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  });
}

// Create Research Agent
export async function createResearchAgent(documentContent?: string, userId?: string) {
  const webSearchTool = createWebSearchTool();
  const knowledgeBaseSearchTool = createKnowledgeBaseSearchTool(userId);

  // All available tools
  const tools = [
    calculatorTool,
    webSearchTool,
    documentSearchTool,
    knowledgeBaseSearchTool,
    // Academic Research Assistant tools
    wikipediaSearchTool,
    arxivSearchTool,
    // Developer Assistant tools
    stackOverflowSearchTool,
    githubSearchTool,
    // AI Assistant tools
    writingAssistantTool,
    translationTool,
    summarizationTool,
    codeExplanationTool,
  ];

  const llm = getLLM();

  const agent = createReactAgent({
    llm,
    tools,
  });

  return agent;
}

interface ToolCall {
  tool: string;
  args: any;
  result?: string;
}

interface ResearchResult {
  response: string;
  toolCalls: ToolCall[];
  sources: string[];
}

// Stream research response
export async function streamResearchResponse(
  query: string,
  documentContent?: string,
  onChunk?: (data: any) => void,
  options?: { userId?: string },
): Promise<ResearchResult> {
  try {
    const userId = options?.userId;
    const agent = await createResearchAgent(documentContent, userId);
    const memoryMessages: Array<{ role: string; content: string }> = [];

    if (userId) {
      const memory = await loadAgentMemory(userId, 'research');

      if (memory.summary) {
        memoryMessages.push({
          role: 'system',
          content: `Research 對話摘要:\n${memory.summary.content}`,
        });
      }

      for (const entry of memory.entries) {
        const role =
          entry.role === 'human'
            ? 'user'
            : entry.role === 'assistant'
            ? 'assistant'
            : 'system';

        memoryMessages.push({ role, content: entry.content });
      }
    }

    let fullResponse = '';
    const toolCalls: ToolCall[] = [];
    const sources: string[] = [];

    const runConfig = documentContent !== undefined
      ? { configurable: { documentContent } as ResearchAgentConfig }
      : undefined;

    const systemMessage = {
      role: 'system',
      content: 'IMPORTANT: You MUST respond in Traditional Chinese (繁體中文, zh-TW) ONLY. All your responses, reasoning, and explanations must be in Traditional Chinese, regardless of the input language.',
    };

    const stream = (await agent.stream(
      {
        messages: [systemMessage, ...memoryMessages, { role: 'user', content: query }],
      },
      runConfig,
    )) as AsyncIterable<unknown>;

    for await (const chunk of stream) {
      const chunkData = chunk as Record<string, any>;

      const agentMessages = chunkData?.agent?.messages;
      if (Array.isArray(agentMessages) && agentMessages.length > 0) {
        const lastMessage = agentMessages[agentMessages.length - 1] as Record<string, any>;
        const toolCallsData = Array.isArray(lastMessage?.tool_calls)
          ? (lastMessage.tool_calls as Array<Record<string, any>>)
          : [];

        if (toolCallsData.length > 0) {
          onChunk?.({
            type: 'reasoning',
            content: `?? **AI 推理流程**\n正在評估問題，準備使用 ${toolCallsData.length} 項工具...`,
          });

          for (const toolCall of toolCallsData) {
            const toolName =
              typeof toolCall?.name === 'string' ? toolCall.name : 'unknown_tool';
            const toolArgs = (toolCall?.args ?? {}) as Record<string, unknown>;
            const toolDisplayName = toolDisplayNames[toolName] || toolName;

            onChunk?.({
              type: 'reasoning',
              content: `\n?? **即將使用「${toolDisplayName}」**\n參數：${JSON.stringify(toolArgs, null, 2)}`,
            });

            onChunk?.({
              type: 'tool_call',
              tool: toolName,
              args: toolArgs,
            });

            toolCalls.push({
              tool: toolName,
              args: toolArgs,
            });
          }
        }

        const contentText = toText(lastMessage?.content);
        if (contentText && toolCallsData.length === 0) {
          if (fullResponse === '' && contentText.length > 0 && toolCalls.length > 0) {
            onChunk?.({
              type: 'reasoning',
              content: `\n?? **整理回應中...**\n已整合所有重要資訊，準備輸出最終答案。`,
            });
          }

          fullResponse += contentText;
          onChunk?.({ type: 'chunk', content: contentText });
        }
      }

      const toolMessages = chunkData?.tools?.messages;
      if (Array.isArray(toolMessages)) {
        for (const toolMessage of toolMessages as Array<Record<string, any>>) {
          const toolName =
            typeof toolMessage?.name === 'string' ? toolMessage.name : 'unknown_tool';
          const toolResultText = toText(toolMessage?.content);

          const toolCallIndex = toolCalls.findIndex(
            (call) => call.tool === toolName && call.result === undefined,
          );
          if (toolCallIndex >= 0) {
            toolCalls[toolCallIndex].result = toolResultText;
          }

          const toolsWithSources = [
            'google_search',
            'wikipedia_search',
            'arxiv_search',
            'stackoverflow_search',
            'github_search',
            'knowledge_base_search',
          ];
          if (toolsWithSources.includes(toolName) && toolResultText) {
            const urlMatches = toolResultText.match(/https?:\/\/[^\s)]+/g);
            if (urlMatches) {
              for (const match of urlMatches) {
                const url = match.replace(/^[?？]{2}\s*/, '');
                if (!sources.includes(url)) {
                  sources.push(url);
                }
              }
            }
          }

          const toolDisplayName = toolDisplayNames[toolName] || toolName;

          onChunk?.({
            type: 'reasoning',
            content: `\n?? **「${toolDisplayName}」回傳結果**\n${toolResultText}`,
          });

          const summary =
            toolResultText.length > 200
              ? `${toolResultText.slice(0, 200)}...`
              : toolResultText;

          onChunk?.({
            type: 'tool_result',
            tool: toolName,
            summary,
          });
        }
      }
    }

    if (!fullResponse) {
      const result = await agent.invoke(
        {
          messages: [{ role: 'user', content: query }],
        },
        runConfig,
      );

      const resultData = result as Record<string, any>;

      if (Array.isArray(resultData?.messages) && resultData.messages.length > 0) {
        const lastMessage = resultData.messages[resultData.messages.length - 1];
        fullResponse = toText((lastMessage as Record<string, any>)?.content ?? lastMessage);
      } else if (resultData?.output) {
        fullResponse = toText(resultData.output);
      }

      if (!fullResponse) {
        fullResponse = 'Research agent did not return a response';
      }
    }

    if (userId) {
      const memoryEntries: AgentMemoryEntryInput[] = [
        { role: 'human' as const, content: query },
        {
          role: 'assistant' as const,
          content: fullResponse,
          metadata: sources.length ? { sources } : undefined,
        },
      ];

      if (sources.length > 0) {
        memoryEntries.push({
          role: 'system' as const,
          content: `SOURCES: ${sources.join(', ')}`,
          metadata: { type: 'sources', sources },
        });
      }

      await appendAgentMemory(userId, 'research', memoryEntries);
    }

    return {
      response: fullResponse,
      toolCalls,
      sources,
    };
  } catch (error) {
    console.error('[Research Agent] Error:', error);
    throw error;
  }
}
