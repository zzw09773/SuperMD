import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOllama } from '@langchain/ollama';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'ollama';

export interface LLMConfig {
  provider: LLMProvider;
  modelName: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
}

export class LLMFactory {
  static createModel(config: LLMConfig): BaseChatModel {
    const { provider, modelName, apiKey, baseUrl, temperature = 0.7 } = config;

    switch (provider) {
      case 'openai':
        if (!apiKey) throw new Error('OpenAI API key is required');
        return new ChatOpenAI({
          modelName,
          openAIApiKey: apiKey,
          temperature,
          configuration: baseUrl ? { baseURL: baseUrl } : undefined,
        });

      case 'anthropic':
        if (!apiKey) throw new Error('Anthropic API key is required');
        return new ChatAnthropic({
          modelName,
          anthropicApiKey: apiKey,
          temperature,
        });

      case 'google':
        if (!apiKey) throw new Error('Google API key is required');
        return new ChatGoogleGenerativeAI({
          modelName,
          apiKey,
          temperature,
        });

      case 'ollama':
        return new ChatOllama({
          model: modelName,
          baseUrl: baseUrl || 'http://localhost:11434',
          temperature,
        });

      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }
}
