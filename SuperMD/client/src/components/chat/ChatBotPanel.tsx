import { useState } from 'react';
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
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg ${
              msg.role === 'user'
                ? 'bg-blue-100 dark:bg-blue-900 ml-auto max-w-[80%]'
                : 'bg-gray-100 dark:bg-gray-700 mr-auto max-w-[80%]'
            }`}
          >
            <p className="text-sm text-gray-800 dark:text-gray-200">{msg.content}</p>
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
