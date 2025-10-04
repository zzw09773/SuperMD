import { useState } from 'react';
import { Bot, User, MessageSquare, Search } from 'lucide-react';
import useChat from '../../hooks/useChat';

interface ChatBotPanelProps {
  documentContent?: string;
}

const ChatBotPanel = ({ documentContent }: ChatBotPanelProps) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'chat' | 'research'>('chat');
  const { messages, sendMessage, isLoading } = useChat();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input, mode, documentContent);
      setInput('');
    }
  };

  return (
    <div className="w-80 border-l border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">AI Assistant</h2>

        {/* Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode('chat')}
            className={`flex-1 px-3 py-2 rounded flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
              mode === 'chat'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat
          </button>
          <button
            onClick={() => setMode('research')}
            className={`flex-1 px-3 py-2 rounded flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
              mode === 'research'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <Search className="w-4 h-4" />
            Research
          </button>
        </div>

        {/* Mode Description */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {mode === 'chat'
            ? '💬 快速對話模式 (GPT-5)'
            : '🔍 深度研究模式 (Google + LangGraph)'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === 'user' ? 'justify-end' :
              message.role === 'system' ? 'justify-center' :
              'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-blue-400" />
              </div>
            )}
            <div
              className={`rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white max-w-[80%]'
                  : message.role === 'system'
                  ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 shadow-lg shadow-purple-500/20 animate-pulse'
                  : 'bg-[#2d2d2d] text-gray-200 max-w-[80%]'
              }`}
            >
              {/* Show reasoning with marquee/typing effect */}
              {message.metadata?.type === 'reasoning' ? (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <p className="text-xs font-medium text-purple-200">{message.content}</p>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}
              {/* Show sources for research results */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-xs font-semibold text-gray-400 mb-2">📚 參考來源：</p>
                  <div className="space-y-1">
                    {message.sources.slice(0, 5).map((source, idx) => (
                      <a
                        key={idx}
                        href={source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-blue-400 hover:text-blue-300 hover:underline truncate"
                      >
                        {idx + 1}. {source}
                      </a>
                    ))}
                    {message.sources.length > 5 && (
                      <p className="text-xs text-gray-500">
                        ... 還有 {message.sources.length - 5} 個來源
                      </p>
                    )}
                  </div>
                </div>
              )}
              <p className="text-xs mt-1 opacity-50">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-400" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="text-sm text-gray-500 dark:text-gray-400">Thinking...</div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI assistant..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatBotPanel;
