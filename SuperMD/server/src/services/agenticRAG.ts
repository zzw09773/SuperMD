import { ChatOpenAI } from '@langchain/openai';
import { StateGraph, Annotation, END } from '@langchain/langgraph';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { DynamicTool } from '@langchain/core/tools';
import { searchSimilarDocuments } from './ragService';
import {
  appendAgentMemory,
  collectConversationContext,
  loadAgentMemory,
  memoryToMessages,
  type AgentMemoryEntryInput,
} from '../lib/agentMemory';
import { requireLLMConfig } from '../config/aiConfig';
import dotenv from 'dotenv';

dotenv.config();

const RAG_MEMORY_MODE = 'rag';

async function buildRAGMemory(userId: string) {
  const memory = await loadAgentMemory(userId, RAG_MEMORY_MODE);
  return {
    memory,
    context: collectConversationContext(memory),
    messages: memoryToMessages(memory, 'RAG 對話摘要'),
  };
}

// ============================================================
// 1️⃣ STATE: 定義 Agent 狀態
// ============================================================

/**
 * AgentState 定義 Agentic RAG 的狀態結構
 * - messages: 對話歷史（累加）
 * - query: 原始用戶查詢
 * - rewrittenQuery: 改寫後的查詢（可選）
 * - ragResults: 檢索結果
 * - shouldRetrieve: 是否需要檢索
 * - answer: 最終答案
 * - steps: 推理步驟（用於 SSE 串流）
 */
const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
  query: Annotation<string>({
    reducer: (_, update) => update,
    default: () => '',
  }),
  rewrittenQuery: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  ragResults: Annotation<string>({
    reducer: (_, update) => update,
    default: () => '',
  }),
  shouldRetrieve: Annotation<boolean>({
    reducer: (_, update) => update,
    default: () => true,
  }),
  answer: Annotation<string>({
    reducer: (_, update) => update,
    default: () => '',
  }),
  steps: Annotation<Array<{ type: string; content: string }>>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
  userId: Annotation<string>({
    reducer: (_, update) => update,
    default: () => '',
  }),
});

type AgentStateType = typeof AgentState.State;

// ============================================================
// 2️⃣ TOOLS: 定義 Agent 可用的工具
// ============================================================

/**
 * Tool 1: Query Rewriter
 * 將用戶查詢改寫為更適合向量檢索的形式
 */
const createQueryRewriterTool = (
  llm: ChatOpenAI,
  getContext: () => Promise<{ lastQuery?: string; lastAnswer?: string; lastSources?: string[] }>
) => {
  return new DynamicTool({
    name: 'query_rewriter',
    description: `Rewrites user queries to be more suitable for vector similarity search.
    Use this when the original query is too vague, conversational, or needs clarification.
    Input: original query string
    Output: rewritten query optimized for retrieval`,
    func: async (query: string) => {
      try {
        console.log(`?? [Query Rewriter] Original: "${query}"`);

        const context = await getContext();
        const contextLines: string[] = [];

        if (context.lastQuery) {
          contextLines.push(`Previous question: ${context.lastQuery}`);
        }

        if (context.lastAnswer) {
          contextLines.push(`Previous answer: ${context.lastAnswer}`);
        }

        if (context.lastSources && context.lastSources.length > 0) {
          contextLines.push(`Referenced documents: ${context.lastSources.join(', ')}`);
        }

        const contextBlock = contextLines.length > 0
          ? `Conversation context cannot be ignored. Latest information:
${contextLines.join('\n')}

`
          : '';

        const prompt = `${contextBlock}You are a query optimization expert. Rewrite the following user query so it works well for semantic search across the user's documents.

Original Query: "${query}"

Rules:
1. Resolve pronouns or vague references (e.g., "剛剛", "那個文件", "it") using the conversation context when provided.
2. Extract key concepts and keywords.
3. Remove conversational fluff (e.g., "can you help me", "I want to know").
4. Make it specific and focused.
5. Keep it concise (1-2 sentences) and in the same language as the original query.

Rewritten Query:`;

        const response = await llm.invoke([new HumanMessage(prompt)]);
        const rewrittenQuery = response.content.toString().trim();

        console.log(`? [Query Rewriter] Rewritten: "${rewrittenQuery}"`);
        return rewrittenQuery;
      } catch (error) {
        console.error('[Query Rewriter] Error:', error);
        return query; // Fallback to original
      }
    },
  });
};

/**
 * Tool 2: Knowledge Base Search
 * 從用戶的知識庫中檢索相關文件
 */
const createKnowledgeBaseSearchTool = (userId: string) => {
  return new DynamicTool({
    name: 'knowledge_base_search',
    description: `Searches the user's knowledge base (uploaded documents) for relevant information.
    Input: search query string (use rewritten query if available)
    Output: relevant text chunks with similarity scores and source files`,
    func: async (query: string) => {
      try {
        console.log(`🔍 [KB Search] Searching: "${query}"`);

        const results = await searchSimilarDocuments(query, userId, 5);

        if (results.length === 0) {
          return 'No relevant information found in the knowledge base. The user may need to upload relevant documents first.';
        }

        // Format results with source attribution
        const formattedResults = results
          .map((result, idx) => {
            return `[Source ${idx + 1}: ${result.fileName} | Similarity: ${(result.similarity * 100).toFixed(1)}%]
${result.content}
---`;
          })
          .join('\n');

        console.log(`✅ [KB Search] Found ${results.length} relevant chunks`);
        return formattedResults;
      } catch (error) {
        console.error('[KB Search] Error:', error);
        return 'Error searching knowledge base: ' + (error instanceof Error ? error.message : 'Unknown error');
      }
    },
  });
};

/**
 * Tool 3: Relevance Evaluator
 * 評估檢索結果是否足夠回答問題
 */
const createRelevanceEvaluatorTool = (llm: ChatOpenAI) => {
  return new DynamicTool({
    name: 'relevance_evaluator',
    description: `Evaluates if the retrieved documents contain sufficient information to answer the user's question.
    Input: JSON string with {query, results}
    Output: "SUFFICIENT" or "INSUFFICIENT" with reasoning`,
    func: async (input: string) => {
      try {
        const { query, results } = JSON.parse(input);
        console.log(`📊 [Relevance Eval] Evaluating results for: "${query}"`);

        const prompt = `You are a relevance evaluator. Determine if the retrieved documents contain sufficient information to answer the user's question.

User Question: "${query}"

Retrieved Documents:
${results}

Evaluate:
1. Do the documents contain relevant information?
2. Is the information sufficient to provide a complete answer?
3. Are there any gaps in the information?

Respond with ONLY one word: "SUFFICIENT" or "INSUFFICIENT"
Then provide a brief 1-sentence explanation.

Format:
SUFFICIENT: [reason] OR INSUFFICIENT: [reason]`;

        const response = await llm.invoke([new HumanMessage(prompt)]);
        const evaluation = response.content.toString().trim();

        console.log(`📊 [Relevance Eval] Result: ${evaluation}`);
        return evaluation;
      } catch (error) {
        console.error('[Relevance Eval] Error:', error);
        return 'SUFFICIENT: Proceeding with available information';
      }
    },
  });
};

// ============================================================
// 3️⃣ NODES: 定義 Graph 的節點（處理邏輯）
// ============================================================

/**
 * Node 1: Router - 決定是否需要改寫查詢
 */
const routerNode = async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
  console.log('\n🔀 [Router Node] Analyzing query...');

  const { query } = state;

  // 簡單規則：如果查詢太短或太口語化，則改寫
  const needsRewrite = query.length < 10 ||
                      query.toLowerCase().includes('請幫我') ||
                      query.toLowerCase().includes('can you') ||
                      query.toLowerCase().includes('我想知道');

  const step = {
    type: 'reasoning',
    content: needsRewrite
      ? '🤔 查詢需要優化以提高檢索效果'
      : '✅ 查詢已足夠明確，直接檢索',
  };

  return {
    shouldRetrieve: needsRewrite,
    steps: [step],
  };
};

/**
 * Node 2: Query Rewriter - 改寫查詢
 */
const queryRewriterNode = async (
  state: AgentStateType,
  tools: { queryRewriter: DynamicTool }
): Promise<Partial<AgentStateType>> => {
  console.log('\n📝 [Query Rewriter Node] Rewriting query...');

  const { query } = state;
  const rewrittenQuery = await tools.queryRewriter.func(query);

  const step = {
    type: 'tool_call',
    content: `🔄 查詢改寫: "${query}" → "${rewrittenQuery}"`,
  };

  return {
    rewrittenQuery,
    steps: [step],
  };
};

/**
 * Node 3: Retriever - 執行知識庫檢索
 */
const retrieverNode = async (
  state: AgentStateType,
  tools: { kbSearch: DynamicTool }
): Promise<Partial<AgentStateType>> => {
  console.log('\n🔍 [Retriever Node] Searching knowledge base...');

  const { query, rewrittenQuery } = state;
  const searchQuery = rewrittenQuery || query;

  const results = await tools.kbSearch.func(searchQuery);

  const step = {
    type: 'tool_call',
    content: `🔍 知識庫檢索: 使用查詢 "${searchQuery}"`,
  };

  return {
    ragResults: results,
    steps: [step],
  };
};

/**
 * Node 4: Evaluator - 評估檢索結果
 */
const evaluatorNode = async (
  state: AgentStateType,
  tools: { relevanceEval: DynamicTool }
): Promise<Partial<AgentStateType>> => {
  console.log('\n📊 [Evaluator Node] Evaluating relevance...');

  const { query, ragResults } = state;

  const evaluation = await tools.relevanceEval.func(
    JSON.stringify({ query, results: ragResults })
  );

  const isSufficient = evaluation.toUpperCase().includes('SUFFICIENT');

  const step = {
    type: 'reasoning',
    content: `📊 結果評估: ${evaluation}`,
  };

  return {
    shouldRetrieve: !isSufficient,
    steps: [step],
  };
};

/**
 * Node 5: Generator - 生成最終答案
 */
const generatorNode = async (
  state: AgentStateType,
  llm: ChatOpenAI
): Promise<Partial<AgentStateType>> => {
  console.log('\n💬 [Generator Node] Generating answer...');

  const { query, ragResults } = state;

  const prompt = `You are a helpful AI assistant. Use the following information from the user's knowledge base to answer their question.

Knowledge Base Results:
${ragResults}

User Question: ${query}

Instructions:
1. Answer the question based ONLY on the information provided above
2. If the information is not sufficient, say so clearly
3. Always cite which source you used (e.g., "根據 Source 1...")
4. Be concise and accurate
5. Use Traditional Chinese (繁體中文) if the question is in Chinese, otherwise use English
6. Format your answer in Markdown for better readability

Answer:`;

  const response = await llm.invoke([new HumanMessage(prompt)]);
  const answer = response.content.toString();

  const step = {
    type: 'chunk',
    content: '💬 正在生成答案...',
  };

  return {
    answer,
    steps: [step],
    messages: [new AIMessage(answer)],
  };
};

// ============================================================
// 4️⃣ AGENT: 組裝 StateGraph 創建 Agentic RAG
// ============================================================

/**
 * 創建完整的 Agentic RAG Agent
 */
export const createAgenticRAG = (
  userId: string,
  contextLoader: () => Promise<{ lastQuery?: string; lastAnswer?: string; lastSources?: string[] }>
) => {
  // Initialize LLM
  const llmConfig = requireLLMConfig('AgenticRAG');
  const llm = new ChatOpenAI({
    modelName: llmConfig.modelName,
    temperature: 0.7,
    configuration: {
      apiKey: llmConfig.apiKey,
      baseURL: llmConfig.baseURL,
    },
  });

  // Create tools
  const tools = {
    queryRewriter: createQueryRewriterTool(llm, contextLoader),
    kbSearch: createKnowledgeBaseSearchTool(userId),
    relevanceEval: createRelevanceEvaluatorTool(llm),
  };

  // Build the graph
  const workflow = new StateGraph(AgentState)
    // Add nodes
    .addNode('router', routerNode)
    .addNode('rewriter', (state: AgentStateType) => queryRewriterNode(state, tools))
    .addNode('retriever', (state: AgentStateType) => retrieverNode(state, tools))
    .addNode('evaluator', (state: AgentStateType) => evaluatorNode(state, tools))
    .addNode('generator', (state: AgentStateType) => generatorNode(state, llm))

    // Define edges (workflow logic)
    .addEdge('__start__', 'router')
    .addConditionalEdges(
      'router',
      (state: AgentStateType) => {
        // 如果查詢需要改寫，去 rewriter，否則直接檢索
        return state.shouldRetrieve ? 'rewriter' : 'retriever';
      },
      {
        rewriter: 'rewriter',
        retriever: 'retriever',
      }
    )
    .addEdge('rewriter', 'retriever')
    .addEdge('retriever', 'evaluator')
    .addConditionalEdges(
      'evaluator',
      (state: AgentStateType) => {
        // 如果結果不足，重新改寫查詢；否則生成答案
        if (state.shouldRetrieve && state.rewrittenQuery) {
          // 已經改寫過一次了，直接生成答案避免無限循環
          return 'generator';
        }
        return state.shouldRetrieve ? 'rewriter' : 'generator';
      },
      {
        rewriter: 'rewriter',
        generator: 'generator',
      }
    )
    .addEdge('generator', END);

  return workflow.compile();
};

/**
 * Query the Agentic RAG system
 */
export const queryAgenticRAG = async (
  userId: string,
  query: string
): Promise<{
  answer: string;
  sources: string[];
  steps: Array<{ type: string; content: string }>;
}> => {
  try {
    console.log(`\n🤖 [Agentic RAG] Processing query: "${query}"`);
    console.log(`👤 User ID: ${userId}`);

    const { messages: previousMessages, context } = await buildRAGMemory(userId);

    const agent = createAgenticRAG(userId, async () => context);

    const initialState = {
      query,
      userId,
      messages: [...previousMessages, new HumanMessage(query)],
      steps: [],
    };

    const finalState = await agent.invoke(initialState);

    // Extract sources from RAG results
    const sources: string[] = [];
    const sourceMatches = finalState.ragResults.match(/\[Source \d+: ([^\]]+?)\s*\|/g);
    if (sourceMatches) {
      sourceMatches.forEach((match: string) => {
        const fileName = match.match(/\[Source \d+: ([^\]]+?)\s*\|/)?.[1];
        if (fileName && !sources.includes(fileName)) {
          sources.push(fileName);
        }
      });
    }

    console.log(`✅ [Agentic RAG] Query completed`);
    console.log(`📝 Steps taken: ${finalState.steps.length}`);
    console.log(`📚 Sources used: ${sources.length}`);
    const memoryEntries: AgentMemoryEntryInput[] = [
      { role: 'human' as const, content: query },
      {
        role: 'assistant' as const,
        content: finalState.answer,
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

    await appendAgentMemory(userId, RAG_MEMORY_MODE, memoryEntries);

    return {
      answer: finalState.answer,
      sources,
      steps: finalState.steps,
    };
  } catch (error) {
    console.error('❌ [Agentic RAG] Query error:', error);
    throw error;
  }
};

/**
 * Streaming version for SSE support
 */
export async function* streamAgenticRAG(
  userId: string,
  query: string
): AsyncGenerator<{ type: string; content: string; done?: boolean; answer?: string; sources?: string[] }> {
  try {
    console.log(`\n🎬 [Agentic RAG Stream] Starting: "${query}"`);

    const { messages: previousMessages, context } = await buildRAGMemory(userId);

    const agent = createAgenticRAG(userId, async () => context);

    const initialState = {
      query,
      userId,
      messages: [...previousMessages, new HumanMessage(query)],
      steps: [],
    };

    // Stream each step
    for await (const event of await agent.stream(initialState)) {
      const nodeName = Object.keys(event)[0];
      const nodeState = (event as Record<string, AgentStateType>)[nodeName];

      console.log(`📡 [Stream] Node: ${nodeName}`);

      // Stream steps as they happen
      if (nodeState.steps && nodeState.steps.length > 0) {
        for (const step of nodeState.steps) {
          yield {
            type: step.type,
            content: step.content,
          };
        }
      }
    }

    // Get final state
    const finalState = await agent.invoke(initialState);

    // Extract sources
    const sources: string[] = [];
    const sourceMatches = finalState.ragResults.match(/\[Source \d+: ([^\]]+?)\s*\|/g);
    if (sourceMatches) {
      sourceMatches.forEach((match: string) => {
        const fileName = match.match(/\[Source \d+: ([^\]]+?)\s*\|/)?.[1];
        if (fileName && !sources.includes(fileName)) {
          sources.push(fileName);
        }
      });
    }

    // Final result
    yield {
      type: 'done',
      content: finalState.answer,
      done: true,
      answer: finalState.answer,
      sources,
    };
    const memoryEntries: AgentMemoryEntryInput[] = [
      { role: 'human' as const, content: query },
      {
        role: 'assistant' as const,
        content: finalState.answer,
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

    await appendAgentMemory(userId, RAG_MEMORY_MODE, memoryEntries);

    console.log(`✅ [Agentic RAG Stream] Completed`);
  } catch (error) {
    console.error('❌ [Agentic RAG Stream] Error:', error);
    yield {
      type: 'error',
      content: error instanceof Error ? error.message : 'Unknown error',
      done: true,
    };
  }
}

