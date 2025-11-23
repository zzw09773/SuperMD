import { ChatOpenAI } from '@langchain/openai';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StructuredTool } from '@langchain/core/tools';
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

export class ResearchAgent {
  private llm: BaseChatModel;
  private tools: StructuredTool[];
  private userId?: string;
  private documentContent?: string;

  constructor(config: {
    userId?: string;
    documentContent?: string;
    llm?: BaseChatModel;
    tools?: StructuredTool[];
  }) {
    this.userId = config.userId;
    this.documentContent = config.documentContent;
    this.llm = config.llm || this.getDefaultLLM();
    this.tools = config.tools || this.getDefaultTools();
  }

  private getDefaultLLM() {
    const llmConfig = requireLLMConfig('ResearchAgent');
    return new ChatOpenAI({
      modelName: llmConfig.modelName,
      temperature: 1,
      configuration: {
        apiKey: llmConfig.apiKey,
        baseURL: llmConfig.baseURL,
      },
    });
  }

  private getDefaultTools(): StructuredTool[] {
    const webSearchTool = this.createWebSearchTool();
    const knowledgeBaseSearchTool = this.createKnowledgeBaseSearchTool();
    const documentSearchTool = this.createDocumentSearchTool();
    const calculatorTool = this.createCalculatorTool();

    return [
      calculatorTool,
      webSearchTool,
      documentSearchTool,
      knowledgeBaseSearchTool,
      wikipediaSearchTool,
      arxivSearchTool,
      stackOverflowSearchTool,
      githubSearchTool,
      writingAssistantTool,
      translationTool,
      summarizationTool,
      codeExplanationTool,
    ];
  }

  private createCalculatorTool() {
    const calculatorSchema = z.object({
      expression: z.string().describe('The mathematical expression to evaluate'),
    });

    return new DynamicStructuredTool({
      name: 'calculator',
      description: 'Performs mathematical calculations. Input should be a mathematical expression.',
      schema: calculatorSchema,
      func: async ({ expression }: z.infer<typeof calculatorSchema>) => {
        try {
          const result = Function(`'use strict'; return (${expression})`)();
          return `Result: ${result}`;
        } catch (error) {
          return `Error evaluating expression: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    });
  }

  private createWebSearchTool() {
    const webSearchSchema = z.object({
      query: z.string().describe('The search query to send to Google'),
    });

    return new DynamicStructuredTool({
      name: 'google_search',
      description: 'Searches Google for real-time information.',
      schema: webSearchSchema,
      func: async ({ query }: z.infer<typeof webSearchSchema>) => {
        const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
        const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

        if (!searchEngineId || !credentialsPath) {
          return `⚠️ Google Search not configured.`;
        }

        try {
          const fs = require('fs');
          const path = require('path');
          const credentialsFullPath = path.resolve(credentialsPath);
          const credentials = JSON.parse(fs.readFileSync(credentialsFullPath, 'utf8'));

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
            num: 3,
          });

          const items = response.data.items || [];
          if (items.length === 0) return `No results found for "${query}"`;

          return items.map((item: any, index: number) => 
            `${index + 1}. **${item.title}**\n   ${item.snippet?.substring(0, 300)}...\n   🔗 ${item.link}`
          ).join('\n\n');

        } catch (error) {
          return `Error searching Google: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    });
  }

  private createDocumentSearchTool() {
    const documentSearchSchema = z.object({
      query: z.string().describe('What to search for in the document'),
    });

    return new DynamicStructuredTool({
      name: 'document_search',
      description: 'Searches through the current document content.',
      schema: documentSearchSchema,
      func: async ({ query }: z.infer<typeof documentSearchSchema>) => {
        if (!this.documentContent) return 'No document content available.';
        
        const lines = this.documentContent.split('\n');
        const matchingLines = lines.filter((line: string) =>
          line.toLowerCase().includes(query.toLowerCase())
        );

        if (matchingLines.length === 0) return `No results found for "${query}" in the document.`;
        return `Found ${matchingLines.length} matches:\n${matchingLines.slice(0, 5).join('\n')}`;
      },
    });
  }

  private createKnowledgeBaseSearchTool() {
    const knowledgeBaseSearchSchema = z.object({
      query: z.string().describe('The search query to find relevant information in the knowledge base'),
    });

    return new DynamicStructuredTool({
      name: 'knowledge_base_search',
      description: 'Searches through the user\'s personal RAG knowledge base.',
      schema: knowledgeBaseSearchSchema,
      func: async ({ query }: z.infer<typeof knowledgeBaseSearchSchema>) => {
        if (!this.userId) return '⚠️ Knowledge base search requires user authentication.';

        try {
          const results = await searchSimilarDocuments(query, this.userId, 5);
          if (results.length === 0) return `📚 未找到與「${query}」相關的內容。`;

          return results.map((result, index) => 
            `${index + 1}. **來源：${result.fileName}** (相似度: ${(result.similarity * 100).toFixed(1)}%)\n   ${result.content}`
          ).join('\n\n');
        } catch (error) {
            if (error instanceof Error && error.message.includes('database')) {
                return `⚠️ RAG 知識庫目前無法使用。`;
            }
            return `搜尋知識庫時發生錯誤：${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
    });
  }

  public async run(query: string, onChunk?: (data: any) => void): Promise<ResearchResult> {
    try {
      const memoryMessages: Array<{ role: string; content: string }> = [];

      if (this.userId) {
        const memory = await loadAgentMemory(this.userId, 'research');
        if (memory.summary) {
          memoryMessages.push({
            role: 'system',
            content: `Research 對話摘要:\n${memory.summary.content}`,
          });
        }
        
        // Pruning: Take only last 6 messages (approx 3 turns) to fit in 8k context
        const recentEntries = memory.entries.slice(-6);
        
        for (const entry of recentEntries) {
          const role = entry.role === 'human' ? 'user' : entry.role === 'assistant' ? 'assistant' : 'system';
          memoryMessages.push({ role, content: entry.content });
        }
      }

      const agent = createReactAgent({
        llm: this.llm,
        tools: this.tools,
      });

      let fullResponse = '';
      const toolCalls: ToolCall[] = [];
      const sources: string[] = [];

      const systemMessage = {
        role: 'system',
        content: 'IMPORTANT: You MUST respond in Traditional Chinese (繁體中文, zh-TW) ONLY.',
      };

      const stream = (await agent.stream(
        {
          messages: [systemMessage, ...memoryMessages, { role: 'user', content: query }],
        },
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
                    const toolName = typeof toolCall?.name === 'string' ? toolCall.name : 'unknown_tool';
                    const toolArgs = (toolCall?.args ?? {}) as Record<string, unknown>;
                    const toolDisplayName = toolDisplayNames[toolName] || toolName;

                    onChunk?.({
                        type: 'reasoning',
                        content: `\n?? **即將使用「${toolDisplayName}」**\n參數：${JSON.stringify(toolArgs, null, 2)}`,
                    });
                    onChunk?.({ type: 'tool_call', tool: toolName, args: toolArgs });
                    toolCalls.push({ tool: toolName, args: toolArgs });
                }
            }

            const contentText = toText(lastMessage?.content);
            if (contentText && toolCallsData.length === 0) {
                fullResponse += contentText;
                onChunk?.({ type: 'chunk', content: contentText });
            }
        }

        const toolMessages = chunkData?.tools?.messages;
        if (Array.isArray(toolMessages)) {
            for (const toolMessage of toolMessages as Array<Record<string, any>>) {
                const toolName = typeof toolMessage?.name === 'string' ? toolMessage.name : 'unknown_tool';
                const toolResultText = toText(toolMessage?.content);

                const toolCallIndex = toolCalls.findIndex(call => call.tool === toolName && call.result === undefined);
                if (toolCallIndex >= 0) toolCalls[toolCallIndex].result = toolResultText;

                if (['google_search', 'wikipedia_search', 'arxiv_search', 'stackoverflow_search', 'github_search', 'knowledge_base_search'].includes(toolName) && toolResultText) {
                    const urlMatches = toolResultText.match(/https?:\/\/[^\s)]+/g);
                    if (urlMatches) {
                        for (const match of urlMatches) sources.push(match.replace(/^[?？]{2}\s*/, ''));
                    }
                }

                onChunk?.({
                    type: 'reasoning',
                    content: `\n?? **「${toolDisplayNames[toolName] || toolName}」回傳結果**\n${toolResultText.slice(0, 200)}...`,
                });
                onChunk?.({ type: 'tool_result', tool: toolName, summary: toolResultText.slice(0, 200) });
            }
        }
      }

      if (!fullResponse) fullResponse = 'Research agent did not return a response';

      if (this.userId) {
        const memoryEntries: AgentMemoryEntryInput[] = [
          { role: 'human', content: query },
          { role: 'assistant', content: fullResponse, metadata: sources.length ? { sources } : undefined },
        ];
        if (sources.length > 0) {
            memoryEntries.push({ role: 'system', content: `SOURCES: ${sources.join(', ')}`, metadata: { type: 'sources', sources } });
        }
        await appendAgentMemory(this.userId, 'research', memoryEntries);
      }

      return { response: fullResponse, toolCalls, sources };
    } catch (error) {
      console.error('[Research Agent] Error:', error);
      throw error;
    }
  }
}

// Backward compatibility wrapper
export async function streamResearchResponse(
  query: string,
  documentContent?: string,
  onChunk?: (data: any) => void,
  options?: { userId?: string },
): Promise<ResearchResult> {
  const agent = new ResearchAgent({
    userId: options?.userId,
    documentContent,
  });
  return agent.run(query, onChunk);
}
