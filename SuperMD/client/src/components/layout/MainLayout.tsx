import { useState } from 'react';
import MarkdownEditor from '../editor/MarkdownEditor';
import ChatBotPanel from '../chat/ChatBotPanel';

interface MainLayoutProps {
  currentDocumentId: string | null;
  onDocumentSelect: (id: string | null) => void;
}

const MainLayout = ({ currentDocumentId }: MainLayoutProps) => {
  const [showChat, setShowChat] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - Document List */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">SuperMD</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Collaborative Markdown Editor</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Toolbar */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                New Document
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowChat(!showChat)}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                {showChat ? 'Hide' : 'Show'} AI Assistant
              </button>
            </div>
          </div>
        </header>

        {/* Editor Area */}
        <div className="flex-1 flex overflow-hidden">
          <MarkdownEditor documentId={currentDocumentId} />
          {showChat && <ChatBotPanel />}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
