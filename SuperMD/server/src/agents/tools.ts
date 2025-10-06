import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import axios from 'axios';
import { ChatOpenAI } from '@langchain/openai';

/**
 * Tool: Wikipedia Search
 * Searches Wikipedia for encyclopedic information
 */
export const wikipediaSearchTool = new DynamicStructuredTool({
  name: 'wikipedia_search',
  description: 'Searches Wikipedia for encyclopedic information on any topic. Use this for background knowledge, definitions, and general information.',
  schema: z.object({
    query: z.string().describe('The topic to search on Wikipedia'),
  }),
  func: async ({ query }) => {
    try {
      console.log(`[Wikipedia] Searching for: "${query}"`);

      const response = await axios.get('https://en.wikipedia.org/w/api.php', {
        params: {
          action: 'query',
          format: 'json',
          list: 'search',
          srsearch: query,
          srlimit: 3,
        },
      });

      const results = response.data.query.search;

      if (results.length === 0) {
        return `📚 No Wikipedia articles found for "${query}"`;
      }

      let formattedResults = `📚 Wikipedia Results for "${query}":\n\n`;

      results.forEach((item: any, index: number) => {
        formattedResults += `${index + 1}. **${item.title}**\n`;
        formattedResults += `   ${item.snippet.replace(/<[^>]*>/g, '')}\n`;
        formattedResults += `   🔗 https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}\n\n`;
      });

      return formattedResults;
    } catch (error) {
      console.error('[Wikipedia] Error:', error);
      return `Error searching Wikipedia: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});

/**
 * Tool: arXiv Paper Search
 * Searches arXiv for academic papers
 */
export const arxivSearchTool = new DynamicStructuredTool({
  name: 'arxiv_search',
  description: 'Searches arXiv.org for academic research papers. Use this for scientific research, academic papers, and scholarly articles.',
  schema: z.object({
    query: z.string().describe('The research topic to search for'),
  }),
  func: async ({ query }) => {
    try {
      console.log(`[arXiv] Searching for: "${query}"`);

      const response = await axios.get('http://export.arxiv.org/api/query', {
        params: {
          search_query: `all:${query}`,
          start: 0,
          max_results: 5,
        },
      });

      const xmlData = response.data;

      // Simple XML parsing (for production, use a proper XML parser)
      const entries = xmlData.match(/<entry>([\s\S]*?)<\/entry>/g);

      if (!entries || entries.length === 0) {
        return `📄 No arXiv papers found for "${query}"`;
      }

      let formattedResults = `📄 arXiv Papers for "${query}":\n\n`;

      entries.slice(0, 5).forEach((entry: string, index: number) => {
        const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
        const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
        const linkMatch = entry.match(/<id>([\s\S]*?)<\/id>/);
        const authorMatch = entry.match(/<name>([\s\S]*?)<\/name>/);

        const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : 'Unknown';
        const summary = summaryMatch ? summaryMatch[1].trim().replace(/\s+/g, ' ').substring(0, 200) : '';
        const link = linkMatch ? linkMatch[1].trim() : '';
        const author = authorMatch ? authorMatch[1].trim() : 'Unknown';

        formattedResults += `${index + 1}. **${title}**\n`;
        formattedResults += `   Author: ${author}\n`;
        formattedResults += `   ${summary}...\n`;
        formattedResults += `   🔗 ${link}\n\n`;
      });

      return formattedResults;
    } catch (error) {
      console.error('[arXiv] Error:', error);
      return `Error searching arXiv: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});

/**
 * Tool: Stack Overflow Search
 * Searches Stack Overflow for programming questions and answers
 */
export const stackOverflowSearchTool = new DynamicStructuredTool({
  name: 'stackoverflow_search',
  description: 'Searches Stack Overflow for programming questions, solutions, and code examples. Use this for coding problems, bugs, and technical questions.',
  schema: z.object({
    query: z.string().describe('The programming question or problem to search for'),
  }),
  func: async ({ query }) => {
    try {
      console.log(`[Stack Overflow] Searching for: "${query}"`);

      const response = await axios.get('https://api.stackexchange.com/2.3/search/advanced', {
        params: {
          order: 'desc',
          sort: 'relevance',
          q: query,
          site: 'stackoverflow',
          pagesize: 5,
        },
      });

      const items = response.data.items;

      if (!items || items.length === 0) {
        return `💻 No Stack Overflow questions found for "${query}"`;
      }

      let formattedResults = `💻 Stack Overflow Results for "${query}":\n\n`;

      items.forEach((item: any, index: number) => {
        formattedResults += `${index + 1}. **${item.title}**\n`;
        formattedResults += `   Score: ${item.score} | Answers: ${item.answer_count} | ${item.is_answered ? '✅ Answered' : '❌ Unanswered'}\n`;
        formattedResults += `   🔗 ${item.link}\n\n`;
      });

      return formattedResults;
    } catch (error) {
      console.error('[Stack Overflow] Error:', error);
      return `Error searching Stack Overflow: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});

/**
 * Tool: GitHub Repository Search
 * Searches GitHub for repositories, code, and issues
 */
export const githubSearchTool = new DynamicStructuredTool({
  name: 'github_search',
  description: 'Searches GitHub for repositories, code examples, and open source projects. Use this to find code libraries, frameworks, and examples.',
  schema: z.object({
    query: z.string().describe('The repository name, programming language, or code to search for'),
  }),
  func: async ({ query }) => {
    try {
      console.log(`[GitHub] Searching for: "${query}"`);

      const response = await axios.get('https://api.github.com/search/repositories', {
        params: {
          q: query,
          sort: 'stars',
          order: 'desc',
          per_page: 5,
        },
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'SuperMD-Research-Agent',
        },
      });

      const items = response.data.items;

      if (!items || items.length === 0) {
        return `🐙 No GitHub repositories found for "${query}"`;
      }

      let formattedResults = `🐙 GitHub Repositories for "${query}":\n\n`;

      items.forEach((item: any, index: number) => {
        formattedResults += `${index + 1}. **${item.full_name}**\n`;
        formattedResults += `   ${item.description || 'No description'}\n`;
        formattedResults += `   ⭐ ${item.stargazers_count.toLocaleString()} stars | 🍴 ${item.forks_count.toLocaleString()} forks | Language: ${item.language || 'N/A'}\n`;
        formattedResults += `   🔗 ${item.html_url}\n\n`;
      });

      return formattedResults;
    } catch (error) {
      console.error('[GitHub] Error:', error);
      return `Error searching GitHub: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});

/**
 * Helper: Initialize LLM for AI tools
 */
function getLLM() {
  return new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL || 'gpt-5-mini',
    temperature: 1,
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Tool: Writing Assistant
 * Helps improve writing quality, grammar, and style
 */
export const writingAssistantTool = new DynamicStructuredTool({
  name: 'writing_assistant',
  description: 'Improves writing quality by fixing grammar, enhancing clarity, and suggesting better phrasing. Use this to polish text content.',
  schema: z.object({
    text: z.string().describe('The text to improve'),
    task: z.enum(['improve', 'grammar', 'simplify', 'formal', 'casual']).describe('The improvement task'),
  }),
  func: async ({ text, task }) => {
    try {
      console.log(`[Writing Assistant] Task: ${task}`);

      const llm = getLLM();
      const prompts: Record<string, string> = {
        improve: `Improve the following text by enhancing clarity, flow, and overall quality:\n\n${text}`,
        grammar: `Fix all grammar, spelling, and punctuation errors in the following text:\n\n${text}`,
        simplify: `Simplify the following text to make it easier to understand:\n\n${text}`,
        formal: `Rewrite the following text in a more formal, professional tone:\n\n${text}`,
        casual: `Rewrite the following text in a more casual, conversational tone:\n\n${text}`,
      };

      const response = await llm.invoke(prompts[task]);
      const improved = response.content as string;

      return `✍️ Writing Assistant (${task}):\n\n${improved}`;
    } catch (error) {
      console.error('[Writing Assistant] Error:', error);
      return `Error improving text: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});

/**
 * Tool: Translation
 * Translates text between languages
 */
export const translationTool = new DynamicStructuredTool({
  name: 'translate',
  description: 'Translates text between languages. Supports English, Chinese, Japanese, Korean, Spanish, French, German, and more.',
  schema: z.object({
    text: z.string().describe('The text to translate'),
    targetLang: z.string().describe('Target language (e.g., "Chinese", "English", "Japanese")'),
  }),
  func: async ({ text, targetLang }) => {
    try {
      console.log(`[Translation] Translating to ${targetLang}`);

      const llm = getLLM();
      const prompt = `Translate the following text to ${targetLang}. Provide only the translation without any explanation:\n\n${text}`;

      const response = await llm.invoke(prompt);
      const translation = response.content as string;

      return `🌐 Translation (${targetLang}):\n\n${translation}`;
    } catch (error) {
      console.error('[Translation] Error:', error);
      return `Error translating text: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});

/**
 * Tool: Summarization
 * Creates concise summaries of long content
 */
export const summarizationTool = new DynamicStructuredTool({
  name: 'summarize',
  description: 'Creates a concise summary of long text or articles. Use this to extract key points and main ideas.',
  schema: z.object({
    text: z.string().describe('The text to summarize'),
    length: z.enum(['short', 'medium', 'long']).describe('Desired summary length'),
  }),
  func: async ({ text, length }) => {
    try {
      console.log(`[Summarization] Length: ${length}`);

      const llm = getLLM();
      const lengthInstructions: Record<string, string> = {
        short: 'in 2-3 sentences',
        medium: 'in 1 paragraph (4-6 sentences)',
        long: 'in 2-3 paragraphs with key points',
      };

      const prompt = `Summarize the following text ${lengthInstructions[length]}:\n\n${text}`;

      const response = await llm.invoke(prompt);
      const summary = response.content as string;

      return `📝 Summary (${length}):\n\n${summary}`;
    } catch (error) {
      console.error('[Summarization] Error:', error);
      return `Error summarizing text: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});

/**
 * Tool: Code Explanation
 * Explains code snippets in natural language
 */
export const codeExplanationTool = new DynamicStructuredTool({
  name: 'explain_code',
  description: 'Explains code snippets in natural language. Use this to understand what code does and how it works.',
  schema: z.object({
    code: z.string().describe('The code snippet to explain'),
    language: z.string().optional().describe('Programming language (optional)'),
  }),
  func: async ({ code, language }) => {
    try {
      console.log(`[Code Explanation] Language: ${language || 'auto-detect'}`);

      const llm = getLLM();
      const langInfo = language ? ` (${language})` : '';
      const prompt = `Explain the following code${langInfo} in clear, simple terms. Include:\n1. What it does\n2. How it works\n3. Key concepts used\n\nCode:\n\`\`\`\n${code}\n\`\`\``;

      const response = await llm.invoke(prompt);
      const explanation = response.content as string;

      return `💻 Code Explanation:\n\n${explanation}`;
    } catch (error) {
      console.error('[Code Explanation] Error:', error);
      return `Error explaining code: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});
