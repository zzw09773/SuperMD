import https from 'https';
import { LLMConfig, LLMProvider } from '../lib/llmFactory';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const insecureAgent = new https.Agent({
  rejectUnauthorized: false,
});

const trim = (value?: string | null): string | undefined => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

export const getProviderConfig = (provider: LLMProvider): LLMConfig => {
  switch (provider) {
    case 'openai':
      return {
        provider: 'openai',
        apiKey: trim(process.env.OPENAI_API_KEY),
        modelName: trim(process.env.OPENAI_MODEL) || 'gpt-4o-mini',
        baseUrl: trim(process.env.OPENAI_BASE_URL),
      };
    case 'anthropic':
      return {
        provider: 'anthropic',
        apiKey: trim(process.env.ANTHROPIC_API_KEY),
        modelName: trim(process.env.ANTHROPIC_MODEL) || 'claude-3-5-sonnet-20240620',
      };
    case 'google':
      return {
        provider: 'google',
        apiKey: trim(process.env.GOOGLE_API_KEY),
        modelName: trim(process.env.GOOGLE_MODEL) || 'gemini-1.5-pro',
      };
    case 'ollama':
      return {
        provider: 'ollama',
        modelName: trim(process.env.OLLAMA_MODEL) || 'llama3',
        baseUrl: trim(process.env.OLLAMA_BASE_URL) || 'http://localhost:11434',
      };
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
};

// Legacy support for existing code
export interface AIEndpointConfig {
  apiKey?: string;
  baseURL?: string;
  modelName: string;
}

interface RequiredAIEndpointConfig extends AIEndpointConfig {
  apiKey: string;
}

export const getLLMConfig = (): AIEndpointConfig => {
  const modelName =
    trim(process.env.LLM_MODEL) ??
    trim(process.env.OPENAI_MODEL) ??
    'gpt-4o-mini';

  return {
    apiKey:
      trim(process.env.LLM_API_KEY) ??
      trim(process.env.OPENAI_API_KEY),
    baseURL:
      trim(process.env.LLM_BASE_URL) ??
      trim(process.env.OPENAI_BASE_URL),
    modelName,
  };
};

export const getEmbeddingConfig = (): AIEndpointConfig => {
  const modelName =
    trim(process.env.EMBEDDING_MODEL) ??
    trim(process.env.OPENAI_EMBEDDING_MODEL) ??
    'text-embedding-3-small';

  return {
    apiKey:
      trim(process.env.EMBEDDING_API_KEY) ??
      trim(process.env.OPENAI_EMBEDDING_API_KEY) ??
      trim(process.env.LLM_API_KEY) ??
      trim(process.env.OPENAI_API_KEY),
    baseURL:
      trim(process.env.EMBEDDING_BASE_URL) ??
      trim(process.env.OPENAI_EMBEDDING_BASE_URL) ??
      trim(process.env.LLM_BASE_URL) ??
      trim(process.env.OPENAI_BASE_URL),
    modelName,
  };
};

export const requireLLMConfig = (caller: string): RequiredAIEndpointConfig => {
  const config = getLLMConfig();
  if (!config.apiKey) {
    throw new Error(
      `[${caller}] LLM_API_KEY 未設定。請在 server/.env 加入 LLM_API_KEY 或保留 OPENAI_API_KEY。`,
    );
  }
  return config as RequiredAIEndpointConfig;
};

export const requireEmbeddingConfig = (
  caller: string,
): RequiredAIEndpointConfig => {
  const config = getEmbeddingConfig();
  if (!config.apiKey) {
    throw new Error(
      `[${caller}] EMBEDDING_API_KEY 未設定。請在 server/.env 加入 EMBEDDING_API_KEY，或保留 OPENAI_API_KEY 作為回退。`,
    );
  }
  return config as RequiredAIEndpointConfig;
};

export const getInsecureAgent = (): https.Agent => insecureAgent;
