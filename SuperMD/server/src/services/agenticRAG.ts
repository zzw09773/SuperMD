import { ChatOpenAI } from '@langchain/openai';
import { DynamicTool } from '@langchain/core/tools';
import { searchSimilarDocuments } from './ragService';
import dotenv from 'dotenv';

dotenv.config();

// Initialize LLM
const llm = new ChatOpenAI({
  modelName: 'gpt-5',
  temperature: 1,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

/**
 * Create RAG retrieval tool
 */
const createRAGTool = (userId: string) => {
  return new DynamicTool({
    name: 'knowledge_base_search',
    description: `Searches the user's knowledge base (uploaded documents) for relevant information.
    Input should be a search query string.
    Use this tool when you need to find specific information from the user's uploaded documents.
    Returns the most relevant text chunks with similarity scores.`,
    func: async (query: string) => {
      try {
        console.log(`🔍 [Agent] Searching knowledge base: "${query}"`);

        const results = await searchSimilarDocuments(query, userId, 5);

        if (results.length === 0) {
          return 'No relevant information found in the knowledge base.';
        }

        // Format results for the agent
        const formattedResults = results
          .map((result, idx) => {
            return `
[Source ${idx + 1}: ${result.fileName} (Similarity: ${(result.similarity * 100).toFixed(1)}%)]
${result.content}
---`;
          })
          .join('\n');

        console.log(`✅ [Agent] Found ${results.length} relevant documents`);
        return formattedResults;
      } catch (error) {
        console.error('[Agent] Knowledge base search error:', error);
        return 'Error searching knowledge base: ' + (error instanceof Error ? error.message : 'Unknown error');
      }
    },
  });
};

/**
 * Query the RAG system using direct LLM call with tool
 */
export const queryAgenticRAG = async (
  userId: string,
  query: string
): Promise<{
  answer: string;
  sources: string[];
  steps: any[];
}> => {
  try {
    console.log(`\n🤖 [Agentic RAG] Processing query: "${query}"`);
    console.log(`👤 User ID: ${userId}`);

    // Step 1: Search knowledge base
    const ragTool = createRAGTool(userId);
    const searchResults = await ragTool.func(query);

    // Step 2: Generate answer using LLM with context
    const prompt = `You are a helpful AI assistant. Use the following information from the user's knowledge base to answer their question.

Knowledge Base Results:
${searchResults}

User Question: ${query}

Instructions:
1. Answer the question based ONLY on the information provided above
2. If the information is not sufficient, say so clearly
3. Always cite which source you used (e.g., "According to Source 1...")
4. Be concise and accurate
5. Use Traditional Chinese (繁體中文) for your response if the question is in Chinese

Answer:`;

    const response = await llm.invoke(prompt);
    const answer = response.content.toString();

    // Extract sources
    const sources: string[] = [];
    const sourceMatches = searchResults.match(/\[Source \d+: ([^\]]+?)\s*\(/g);
    if (sourceMatches) {
      sourceMatches.forEach((match: string) => {
        const fileName = match.match(/\[Source \d+: ([^\]]+?)\s*\(/)?.[1];
        if (fileName && !sources.includes(fileName)) {
          sources.push(fileName);
        }
      });
    }

    console.log(`✅ [Agentic RAG] Query completed`);

    return {
      answer,
      sources,
      steps: [
        {
          action: { tool: 'knowledge_base_search', toolInput: query },
          observation: searchResults.substring(0, 200) + '...',
        },
      ],
    };
  } catch (error) {
    console.error('❌ [Agentic RAG] Query error:', error);
    throw error;
  }
};
