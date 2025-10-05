import { useState, useRef, useEffect } from 'react';
import MarkdownEditor from '../editor/MarkdownEditor';
import ChatBotPanel from '../chat/ChatBotPanel';
import ProjectSidebar from '../sidebar/ProjectSidebar';
import RAGDocumentPanel from '../rag/RAGDocumentPanel';
import { FileDown, FileText, FileCode, FileType, Download, LogOut, User, Database } from 'lucide-react';

interface MainLayoutProps {
  currentDocumentId: string | null;
  onDocumentSelect: (id: string | null) => void;
  user: any;
  onLogout: () => void;
}

const MainLayout = ({ currentDocumentId, onDocumentSelect, user, onLogout }: MainLayoutProps) => {
  const [showChat, setShowChat] = useState(false);
  const [showRAG, setShowRAG] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [markdown, setMarkdown] = useState('');
  const editorRef = useRef<{ getContent: () => string } | null>(null);

  const handleNewDocument = () => {
    // Create a new document ID
    const newDocId = `doc-${Date.now()}`;
    onDocumentSelect(newDocId);
  };

  const handleExport = async (format: 'md' | 'html' | 'pdf' | 'docx' | 'txt') => {
    const content = editorRef.current?.getContent() || '';
    const title = currentDocumentId || 'document';

    try {
      const response = await fetch('http://localhost:3000/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, format, title }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setShowExportMenu(false);
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    }
  };

  const exportFormats = [
    { format: 'md' as const, icon: FileText, label: 'Markdown' },
    { format: 'html' as const, icon: FileCode, label: 'HTML' },
    { format: 'pdf' as const, icon: FileDown, label: 'PDF' },
    { format: 'docx' as const, icon: FileType, label: 'DOCX' },
    { format: 'txt' as const, icon: FileText, label: 'Plain Text' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - Project & Document Management */}
      <ProjectSidebar
        currentDocumentId={currentDocumentId}
        onDocumentSelect={onDocumentSelect}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Toolbar */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Export Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>

                {showExportMenu && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-10">
                    {exportFormats.map(({ format, icon: Icon, label }) => (
                      <button
                        key={format}
                        onClick={() => handleExport(format)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-800 dark:text-gray-200"
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* User Info */}
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {user?.name || user?.email}
                </span>
              </div>

              {/* RAG Knowledge Base Button */}
              <button
                onClick={() => setShowRAG(!showRAG)}
                className={`px-4 py-2 ${showRAG ? 'bg-purple-600' : 'bg-purple-500'} text-white rounded hover:bg-purple-600 flex items-center gap-2`}
                title="RAG Knowledge Base"
              >
                <Database className="w-4 h-4" />
                {showRAG ? 'Hide' : 'Show'} RAG
              </button>

              {/* AI Assistant Button */}
              <button
                onClick={() => setShowChat(!showChat)}
                className={`px-4 py-2 ${showChat ? 'bg-green-600' : 'bg-green-500'} text-white rounded hover:bg-green-600`}
              >
                {showChat ? 'Hide' : 'Show'} AI Assistant
              </button>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-2"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Editor Area */}
        <div className="flex-1 flex overflow-hidden">
          <MarkdownEditor
            documentId={currentDocumentId}
            ref={editorRef}
            onContentChange={setMarkdown}
          />
          {showRAG && <RAGDocumentPanel />}
          {showChat && <ChatBotPanel documentContent={markdown} />}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
