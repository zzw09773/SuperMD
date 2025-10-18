import { useEffect, useMemo, useState } from 'react';

export interface CredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestConnection?: (credentials: StoredCredentials) => Promise<void>;
}

export interface StoredCredentials {
  llmApiKey: string;
  llmBaseUrl: string;
  llmModel: string;
  embeddingApiKey: string;
  embeddingBaseUrl: string;
  embeddingModel: string;
  googleSearchEngineId: string;
  googleServiceJson: string;
}

const STORAGE_KEY = 'supermd.credentials';

const defaultCredentials: StoredCredentials = {
  llmApiKey: '',
  llmBaseUrl: '',
  llmModel: '',
  embeddingApiKey: '',
  embeddingBaseUrl: '',
  embeddingModel: '',
  googleSearchEngineId: '',
  googleServiceJson: '',
};

/**
 * Allows users to input OpenAI / Google Search credentials without touching .env or JSON files.
 * Values are stored in localStorage; backend integration still required to proxy requests securely.
 */
export function CredentialsModal({ isOpen, onClose, onTestConnection }: CredentialsModalProps) {
  const [credentials, setCredentials] = useState<StoredCredentials>(defaultCredentials);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'testing'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Preload credentials from localStorage
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setCredentials(defaultCredentials);
        return;
      }

      const parsed = JSON.parse(raw) as Partial<StoredCredentials> & {
        openaiApiKey?: string;
        openaiBaseUrl?: string;
      };

      const upgraded: StoredCredentials = {
        ...defaultCredentials,
        ...parsed,
      };

      if (!upgraded.llmApiKey && parsed.openaiApiKey) {
        upgraded.llmApiKey = parsed.openaiApiKey;
      }
      if (!upgraded.llmBaseUrl && parsed.openaiBaseUrl) {
        upgraded.llmBaseUrl = parsed.openaiBaseUrl;
      }
      if (!upgraded.llmModel && parsed.openaiBaseUrl) {
        upgraded.llmModel = '';
      }
      if (!upgraded.embeddingApiKey && parsed.openaiApiKey) {
        upgraded.embeddingApiKey = parsed.openaiApiKey;
      }
      if (!upgraded.embeddingBaseUrl && parsed.openaiBaseUrl) {
        upgraded.embeddingBaseUrl = parsed.openaiBaseUrl;
      }
      if (!upgraded.embeddingModel && parsed.openaiBaseUrl) {
        upgraded.embeddingModel = '';
      }

      setCredentials(upgraded);
    } catch (err) {
      console.error('[CredentialsModal] Failed to parse stored credentials', err);
      setCredentials(defaultCredentials);
    }
  }, [isOpen]);

  const isSaveDisabled = useMemo(() => {
    return status === 'saving' || status === 'testing';
  }, [status]);

  const handleChange = <K extends keyof StoredCredentials>(key: K, value: StoredCredentials[K]) => {
    setCredentials((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setStatus('saving');
    setError(null);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      console.error('[CredentialsModal] Failed to save credentials', err);
      setError('無法寫入瀏覽器儲存空間，請檢查權限或容量。');
      setStatus('error');
    }
  };

  const handleTestConnection = async () => {
    if (!onTestConnection) {
      return;
    }

    setStatus('testing');
    setError(null);

    try {
      await onTestConnection(credentials);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      console.error('[CredentialsModal] Test connection failed', err);
      setError(err instanceof Error ? err.message : '測試失敗，請稍後再試');
      setStatus('error');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-xl bg-slate-900/95 p-6 text-slate-100 shadow-2xl ring-1 ring-slate-700">
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">API 設定</h2>
            <p className="text-sm text-slate-300">
              將個人 OpenAI / Google 搜尋憑證儲存在本機，免除修改 `.env` 與 JSON 的流程。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-600 px-3 py-1 text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
          >
            關閉
          </button>
        </header>

        <section className="grid gap-6">
  <div className="space-y-4 rounded-lg border border-slate-700/80 bg-slate-900/60 p-4">
    <h3 className="text-sm font-semibold text-slate-200">LLM 設定</h3>
    <p className="text-xs text-slate-400">設定主要推理模型的 API Key 與 Base URL，支援自建 Gateway 或第三方代理。</p>
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-200">LLM API Key</label>
      <input
        type="password"
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="sk-..."
        value={credentials.llmApiKey}
        onChange={(event) => handleChange('llmApiKey', event.target.value)}
      />
    </div>
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-200">LLM Base URL</label>
      <input
        type="text"
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="https://your-llm-gateway/v1"
        value={credentials.llmBaseUrl}
        onChange={(event) => handleChange('llmBaseUrl', event.target.value)}
      />
      <p className="text-xs text-slate-400">若留空則使用預設 OpenAI API Endpoint。</p>
    </div>
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-200">LLM Model</label>
      <input
        type="text"
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="例如：gpt-4o-mini"
        value={credentials.llmModel}
        onChange={(event) => handleChange('llmModel', event.target.value)}
      />
      <p className="text-xs text-slate-400">若留空則後端採用環境變數中設定的模型。</p>
    </div>
  </div>

  <div className="space-y-4 rounded-lg border border-slate-700/80 bg-slate-900/60 p-4">
    <h3 className="text-sm font-semibold text-slate-200">Embedding 設定</h3>
    <p className="text-xs text-slate-400">提供向量索引所使用的嵌入模型，建議與 LLM 分開配置以控制成本。</p>
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-200">Embedding API Key</label>
      <input
        type="password"
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="sk-..."
        value={credentials.embeddingApiKey}
        onChange={(event) => handleChange('embeddingApiKey', event.target.value)}
      />
    </div>
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-200">Embedding Base URL</label>
      <input
        type="text"
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="https://your-embedding-endpoint/v1"
        value={credentials.embeddingBaseUrl}
        onChange={(event) => handleChange('embeddingBaseUrl', event.target.value)}
      />
      <p className="text-xs text-slate-400">可指向專用 Embedding 服務，例如 text-embedding-3-small。</p>
    </div>
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-200">Embedding Model</label>
      <input
        type="text"
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="例如：text-embedding-3-small"
        value={credentials.embeddingModel}
        onChange={(event) => handleChange('embeddingModel', event.target.value)}
      />
      <p className="text-xs text-slate-400">若留空則後端沿用預設的嵌入模型設定。</p>
    </div>
  </div>

  <div className="space-y-2">
    <label className="block text-sm font-medium text-slate-200">Google Search Engine ID (cx)</label>
    <input
      type="text"
      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      placeholder="custom search engine id"
      value={credentials.googleSearchEngineId}
      onChange={(event) => handleChange('googleSearchEngineId', event.target.value)}
    />
  </div>

  <div className="space-y-2">
    <label className="block text-sm font-medium text-slate-200">Google Service Account JSON</label>
    <textarea
      className="min-h-[150px] w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      placeholder='{ "type": "service_account", ... }'
      value={credentials.googleServiceJson}
      onChange={(event) => handleChange('googleServiceJson', event.target.value)}
    />
    <p className="text-xs text-slate-400">
      建議僅在本機測試時使用。正式環境請改用安全的 Secret Manager 或後端設定。
    </p>
  </div>
</section>

        <footer className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-300">
            {status === 'saved' && <span className="text-emerald-400">✅ 已儲存到本機。</span>}
            {status === 'error' && <span className="text-rose-400">⚠️ {error ?? '儲存失敗'}</span>}
            {status === 'testing' && <span className="text-indigo-300">⏳ 正在測試連線...</span>}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            {onTestConnection && (
              <button
                type="button"
                disabled={isSaveDisabled}
                onClick={handleTestConnection}
                className="rounded-lg border border-indigo-500 px-4 py-2 text-sm font-medium text-indigo-200 transition hover:bg-indigo-600/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
              >
                測試連線
              </button>
            )}
            <button
              type="button"
              disabled={isSaveDisabled}
              onClick={handleSave}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              儲存設定
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default CredentialsModal;

