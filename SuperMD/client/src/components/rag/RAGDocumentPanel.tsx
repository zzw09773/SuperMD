import { useState, useEffect } from 'react';
import { Database, Trash2, FileText, Upload as UploadIcon, RefreshCw } from 'lucide-react';
import axios from 'axios';
import FileUploadModal from './FileUploadModal';

interface RAGDocument {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  chunkCount: number;
}

const RAGDocumentPanel = () => {
  const [documents, setDocuments] = useState<RAGDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/rag/documents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocuments(response.data.documents);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleDelete = async (id: number, fileName: string) => {
    if (!confirm(`確定要刪除文件 "${fileName}" 嗎？這將同時刪除所有相關的向量索引。`)) {
      return;
    }

    try {
      setDeleting(id);
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3000/api/rag/documents/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocuments(documents.filter(doc => doc.id !== id));
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('刪除失敗，請重試');
    } finally {
      setDeleting(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('docx')) return '📝';
    if (fileType.includes('text')) return '📃';
    if (fileType.includes('markdown')) return '📋';
    return '📎';
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">RAG 知識庫</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadDocuments}
              disabled={loading}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="重新載入"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2 text-sm"
            >
              <UploadIcon className="w-4 h-4" />
              上傳文件
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {documents.length} 個文件已索引
        </p>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <Database className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">尚未上傳任何文件</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              上傳第一個文件
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="group p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-2xl flex-shrink-0">{getFileIcon(doc.fileType)}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-800 dark:text-white truncate">
                        {doc.fileName}
                      </h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>•</span>
                        <span>{doc.chunkCount} 個向量區塊</span>
                        <span>•</span>
                        <span>{formatDate(doc.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id, doc.fileName)}
                    disabled={deleting === doc.id}
                    className="opacity-0 group-hover:opacity-100 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-opacity disabled:opacity-50"
                    title="刪除"
                  >
                    {deleting === doc.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <FileUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={loadDocuments}
      />
    </div>
  );
};

export default RAGDocumentPanel;
