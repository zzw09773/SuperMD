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

// Initialize LLM
function getLLM() {
  return new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL || 'gpt-5-mini',
    temperature: 1, // GPT-5 only supports temperature=1
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Tool: Calculator
const calculatorTool = new DynamicStructuredTool({
  name: 'calculator',
  description: 'Performs mathematical calculations. Input should be a mathematical expression.',
  schema: z.object({
    expression: z.string().describe('The mathematical expression to evaluate'),
  }),
  func: async ({ expression }) => {
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
  return new DynamicStructuredTool({
    name: 'google_search',
    description: 'Searches Google for real-time information. Use this to find current information, news, research papers, documentation, or any web content.',
    schema: z.object({
      query: z.string().describe('The search query to send to Google'),
    }),
    func: async ({ query }) => {
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
const documentSearchTool = new DynamicStructuredTool({
  name: 'document_search',
  description: 'Searches through the current document content for relevant information.',
  schema: z.object({
    query: z.string().describe('What to search for in the document'),
  }),
  func: async ({ query }, { documentContent }) => {
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

// Create Research Agent
export async function createResearchAgent(documentContent?: string) {
  const webSearchTool = createWebSearchTool();

  // All available tools
  const tools = [
    calculatorTool,
    webSearchTool,
    documentSearchTool,
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
  onChunk?: (data: any) => void
): Promise<ResearchResult> {
  try {
    const agent = await createResearchAgent(documentContent);

    console.log('[Research Agent] Starting query:', query);

    let fullResponse = '';
    const toolCalls: ToolCall[] = [];
    const sources: string[] = [];
    let currentToolCalls: any[] = [];

    // Invoke agent with streaming
    const stream = await agent.stream({
      messages: [{ role: 'user', content: query }],
    });

    console.log('[Research Agent] Stream started');

    for await (const chunk of stream) {
      console.log('[Research Agent] Received chunk:', JSON.stringify(chunk, null, 2));

      // Extract tool calls
      if (chunk?.agent?.messages) {
        const lastMessage = chunk.agent.messages[chunk.agent.messages.length - 1];

        // Check for tool calls
        if (lastMessage?.tool_calls && lastMessage.tool_calls.length > 0) {
          currentToolCalls = lastMessage.tool_calls;

          // Notify about reasoning
          if (onChunk) {
            onChunk({
              type: 'reasoning',
              content: `🧠 **AI 推理過程：**\n正在分析問題並規劃使用 ${lastMessage.tool_calls.length} 個工具來回答您的問題...`
            });
          }

          // Send tool call info with reasoning
          for (const toolCall of lastMessage.tool_calls) {
            // Tool name translation map
            const toolNameMap: Record<string, string> = {
              'google_search': 'Google 搜尋',
              'wikipedia_search': 'Wikipedia 查詢',
              'arxiv_search': 'arXiv 論文搜尋',
              'stackoverflow_search': 'Stack Overflow 搜尋',
              'github_search': 'GitHub 代碼搜尋',
              'calculator': '計算器',
              'document_search': '文檔搜尋',
              'writing_assistant': '寫作助手',
              'translate': '翻譯工具',
              'summarize': '摘要工具',
              'explain_code': '程式碼解釋器',
            };

            const toolDisplayName = toolNameMap[toolCall.name] || toolCall.name;

            if (onChunk) {
              // Send reasoning about why using this tool
              onChunk({
                type: 'reasoning',
                content: `\n📋 **步驟：使用「${toolDisplayName}」**\n參數：${JSON.stringify(toolCall.args, null, 2)}`
              });

              onChunk({
                type: 'tool_call',
                tool: toolCall.name,
                args: toolCall.args
              });
            }

            toolCalls.push({
              tool: toolCall.name,
              args: toolCall.args
            });
          }
        }

        // Extract final response
        const content = lastMessage?.content || '';
        if (content && typeof content === 'string' && !lastMessage?.tool_calls) {
          // If this is the start of the final response, send a reasoning message
          if (fullResponse === '' && content.length > 0 && toolCalls.length > 0) {
            if (onChunk) {
              onChunk({
                type: 'reasoning',
                content: `\n🎯 **正在整合資訊並生成回答...**\n已收集所有必要資訊，現在為您整理答案。`
              });
            }
          }

          fullResponse += content;
          if (onChunk) {
            onChunk({ type: 'chunk', content });
          }
        }
      }

      // Extract tool results
      if (chunk?.tools?.messages) {
        for (const toolMessage of chunk.tools.messages) {
          const toolName = toolMessage.name;
          const toolResult = toolMessage.content;

          // Update tool call with result
          const toolCallIndex = toolCalls.findIndex(tc => tc.tool === toolName && !tc.result);
          if (toolCallIndex >= 0) {
            toolCalls[toolCallIndex].result = toolResult;
          }

          // Extract sources from search results (all tools that return URLs)
          const toolsWithSources = ['google_search', 'wikipedia_search', 'arxiv_search', 'stackoverflow_search', 'github_search'];
          if (toolsWithSources.includes(toolName) && toolResult) {
            const urlMatches = toolResult.match(/🔗 (https?:\/\/[^\s]+)/g);
            if (urlMatches) {
              urlMatches.forEach((match: string) => {
                const url = match.replace('🔗 ', '');
                if (!sources.includes(url)) {
                  sources.push(url);
                }
              });
            }
          }

          if (onChunk) {
            // Tool name translation
            const toolNameMap: Record<string, string> = {
              'google_search': 'Google 搜尋',
              'wikipedia_search': 'Wikipedia 查詢',
              'arxiv_search': 'arXiv 論文搜尋',
              'stackoverflow_search': 'Stack Overflow 搜尋',
              'github_search': 'GitHub 代碼搜尋',
              'calculator': '計算器',
              'document_search': '文檔搜尋',
              'writing_assistant': '寫作助手',
              'translate': '翻譯工具',
              'summarize': '摘要工具',
              'explain_code': '程式碼解釋器',
            };

            const toolDisplayName = toolNameMap[toolName] || toolName;

            // Send reasoning about tool result
            onChunk({
              type: 'reasoning',
              content: `\n✅ **「${toolDisplayName}」執行完成**\n獲得結果，正在整合資訊...`
            });

            onChunk({
              type: 'tool_result',
              tool: toolName,
              summary: toolResult.substring(0, 200) + (toolResult.length > 200 ? '...' : '')
            });
          }
        }
      }
    }

    console.log('[Research Agent] Stream completed. Full response:', fullResponse);

    // If no response from stream, invoke synchronously
    if (!fullResponse) {
      console.log('[Research Agent] No streaming response, trying invoke...');
      const result = await agent.invoke({
        messages: [{ role: 'user', content: query }],
      });

      console.log('[Research Agent] Invoke result:', JSON.stringify(result, null, 2));

      if (result?.messages && Array.isArray(result.messages)) {
        const lastMessage = result.messages[result.messages.length - 1];
        fullResponse = lastMessage?.content || 'No response generated';
      } else if (result?.output) {
        fullResponse = result.output;
      } else {
        fullResponse = 'Research agent did not return a response';
      }
    }

    return {
      response: fullResponse,
      toolCalls,
      sources
    };
  } catch (error) {
    console.error('[Research Agent] Error:', error);
    throw error;
  }
}
