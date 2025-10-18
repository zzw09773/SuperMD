import https from 'https';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const insecureAgent = new https.Agent({
  rejectUnauthorized: false,
});

const trim = (value?: string | null): string | undefined => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

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
    'gpt-5';

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
