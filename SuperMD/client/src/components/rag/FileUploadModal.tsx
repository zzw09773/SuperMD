import { useState, useRef } from 'react';
import { Upload, X, File, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

interface UploadResult {
  fileName: string;
  status: 'success' | 'error';
  error?: string;
}

const FileUploadModal = ({ isOpen, onClose, onUploadSuccess }: FileUploadModalProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = [
    // Documents
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    // Images
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/webp',
    // Tables
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Code
    'application/javascript',
    'application/typescript',
    'application/json',
    'application/xml',
    'text/html',
    'text/css',
  ];

  const allowedExtensions = [
    // Documents
    '.pdf', '.docx', '.txt', '.md',
    // Images
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp',
    // Tables
    '.csv', '.xls', '.xlsx',
    // Code
    '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs',
    '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.sql',
    '.html', '.css', '.json', '.xml', '.yaml', '.yml',
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleFileSelect = (files: File[]) => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();

      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
        errors.push(`${file.name}: 不支援的檔案格式`);
        continue;
      }

      if (file.size > 50 * 1024 * 1024) {
        errors.push(`${file.name}: 檔案大小不能超過 50MB`);
        continue;
      }

      validFiles.push(file);
    }

    if (errors.length > 0) {
      setErrorMessage(errors.join('\n'));
      setUploadStatus('error');
    } else {
      setUploadStatus('idle');
      setErrorMessage('');
    }

    setSelectedFiles(validFiles);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadStatus('idle');
    setUploadResults([]);

    const formData = new FormData();

    // Append all files to FormData
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:3000/api/rag/upload-batch', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadResults(response.data.results);

      if (response.data.errorCount === 0) {
        setUploadStatus('success');
      } else if (response.data.successCount === 0) {
        setUploadStatus('error');
        setErrorMessage('所有文件上傳失敗');
      } else {
        setUploadStatus('success');
      }

      setSelectedFiles([]);

      setTimeout(() => {
        onUploadSuccess();
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setErrorMessage(axios.isAxiosError(error)
        ? error.response?.data?.error || '上傳失敗，請重試'
        : '上傳失敗，請重試');
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setSelectedFiles([]);
    setUploadStatus('idle');
    setErrorMessage('');
    setUploadResults([]);
    setIsDragging(false);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">上傳文件到知識庫</h2>
          <button
            onClick={() => { reset(); onClose(); }}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="關閉對話框"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {selectedFiles.length === 0 ? (
            <>
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                拖放文件到此處，或
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                選擇文件
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.webp,.csv,.xls,.xlsx,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.cs,.go,.rs,.rb,.php,.swift,.kt,.sql,.html,.css,.json,.xml,.yaml,.yml"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) handleFileSelect(files);
                }}
                aria-label="選擇文件"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                支援格式: 文件 (PDF, DOCX, TXT, MD)、圖片 (PNG, JPG等)、表格 (CSV, XLSX)、程式碼 (最大 50MB)<br />
                可一次選擇多個文件批量上傳 (最多 20 個)
              </p>
            </>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <File className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 dark:text-white truncate text-sm">{file.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                + 添加更多文件
              </button>
            </div>
          )}
        </div>

        {/* Status Messages */}
        {uploadStatus === 'success' && uploadResults.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300">
                上傳完成！{uploadResults.filter(r => r.status === 'success').length} 個成功
                {uploadResults.filter(r => r.status === 'error').length > 0 &&
                  `, ${uploadResults.filter(r => r.status === 'error').length} 個失敗`
                }
              </span>
            </div>
            {uploadResults.some(r => r.status === 'error') && (
              <div className="max-h-32 overflow-y-auto space-y-1">
                {uploadResults.filter(r => r.status === 'error').map((result, i) => (
                  <div key={i} className="text-xs text-red-600 dark:text-red-400">
                    ❌ {result.fileName}: {result.error}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {uploadStatus === 'error' && uploadResults.length === 0 && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-red-700 dark:text-red-300 whitespace-pre-wrap">{errorMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => { reset(); onClose(); }}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            取消
          </button>
          <button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploading}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading
              ? `上傳中... (${selectedFiles.length} 個文件)`
              : `上傳並索引${selectedFiles.length > 0 ? ` (${selectedFiles.length} 個文件)` : ''}`
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileUploadModal;
