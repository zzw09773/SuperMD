import { useState } from 'react';
import { Bot, User } from 'lucide-react';
import useChat from '../../hooks/useChat';

const ChatBotPanel = () => {
  const [input, setInput] = useState('');
  const { messages, sendMessage, isLoading } = useChat();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="w-80 border-l border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">AI Assistant</h2>
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
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs max-w-[90%]'
                  : 'bg-[#2d2d2d] text-gray-200 max-w-[80%]'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
