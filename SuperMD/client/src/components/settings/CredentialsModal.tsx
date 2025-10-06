import { useEffect, useMemo, useState } from 'react';

export interface CredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestConnection?: (credentials: StoredCredentials) => Promise<void>;
}

export interface StoredCredentials {
  openaiApiKey: string;
  openaiBaseUrl: string;
  googleSearchEngineId: string;
  googleServiceJson: string;
}

const STORAGE_KEY = 'supermd.credentials';

const defaultCredentials: StoredCredentials = {
  openaiApiKey: '',
  openaiBaseUrl: '',
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

      const parsed = JSON.parse(raw) as StoredCredentials;
      setCredentials({ ...defaultCredentials, ...parsed });
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
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">OpenAI API Key</label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="sk-..."
              value={credentials.openaiApiKey}
              onChange={(event) => handleChange('openaiApiKey', event.target.value)}
            />
            <p className="text-xs text-slate-400">
              僅儲存在本機裝置；若需與後端整合，請在 Spike 報告中確認代理策略。
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-200">OpenAI Base URL（選填）</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="https://api.openai.com/v1"
                value={credentials.openaiBaseUrl}
                onChange={(event) => handleChange('openaiBaseUrl', event.target.value)}
              />
              <p className="text-xs text-slate-400">支援 Azure OpenAI 或自架 proxy。</p>
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
              建議使用安全的服務帳戶；資料僅保存在本機。未來可新增「匯入 JSON」按鈕與即時驗證。
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
