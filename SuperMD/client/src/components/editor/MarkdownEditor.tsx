import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { autocompletion } from '@codemirror/autocomplete';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import PreviewPane from './PreviewPane';
import TableOfContents from './TableOfContents';
import EditorToolbar from './EditorToolbar';
import SaveStatus from '../common/SaveStatus';
import CollaborationStatus from '../collaboration/CollaborationStatus';
import useAutoSave from '../../hooks/useAutoSave';
import useCollaboration from '../../hooks/useCollaboration';
import { documentAPI } from '../../services/api';
import { markdownAutocomplete } from '../../utils/markdownAutocomplete';

interface MarkdownEditorProps {
  documentId: string | null;
  onContentChange?: (content: string) => void;
}

export interface MarkdownEditorRef {
  getContent: () => string;
  insertContent: (text: string) => void;
}

const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  ({ documentId, onContentChange }, ref) => {
    const [content, setContent] = useState('# Welcome to SuperMD\n\nStart typing...');
    const [showToc, setShowToc] = useState(false);
    const [previewMode, setPreviewMode] = useState<'split' | 'preview-only' | 'editor-only'>('split');
    const [loading, setLoading] = useState(false);
    const { saveStatus, triggerSave } = useAutoSave(documentId, content);
    const { users, isConnected } = useCollaboration(documentId || 'demo');

    const showEditorPane = previewMode !== 'preview-only';
    const showPreviewPane = previewMode !== 'editor-only';

    useImperativeHandle(ref, () => ({
      getContent: () => content,
      insertContent: (text: string) => {
        setContent((prev) => prev + text);
        triggerSave();
      },
    }));

    // Load document from API when documentId changes
    useEffect(() => {
      const loadDocument = async () => {
        if (!documentId) {
          setContent('# Welcome to SuperMD\n\nStart typing...');
          return;
        }

        try {
          setLoading(true);
          const doc = await documentAPI.getById(documentId);
          setContent(doc.content);
        } catch (error) {
          console.error('Failed to load document:', error);
          setContent('# Error\n\nFailed to load document.');
        } finally {
          setLoading(false);
        }
      };

      loadDocument();
    }, [documentId]);

    useEffect(() => {
      onContentChange?.(content);
    }, [content, onContentChange]);

    const handleChange = (value: string) => {
      setContent(value);
      triggerSave();
    };

    const handleInsert = (text: string, _offset: number = 0) => {
      // Insert text at current cursor position
      // This is a simplified version - in real implementation would use CodeMirror API
      setContent(content + '\n' + text);
    };

    // Handle paste event for images
    const handlePaste = async (event: React.ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          event.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          try {
            // Upload image to server
            const formData = new FormData();
            formData.append('image', file);
            formData.append('documentId', documentId || 'temp');

            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3000/api/upload-image', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            });

            if (!response.ok) throw new Error('Upload failed');

            const { url } = await response.json();

            // Insert image markdown
            const imageMarkdown = `\n![image](${url})\n`;
            setContent((prev) => prev + imageMarkdown);
            triggerSave();
          } catch (error) {
            console.error('Image upload error:', error);
            alert('Failed to upload image');
          }
        }
      }
    };

    return (
      <div className="flex h-full min-h-0 flex-col">
        <EditorToolbar
          showToc={showToc}
          previewMode={previewMode}
          onToggleToc={() => setShowToc(!showToc)}
          onPreviewModeChange={setPreviewMode}
          onInsert={handleInsert}
        />

        {loading && (
          <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
            Loading document...
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-hidden">
          <PanelGroup direction="horizontal" className="flex-1 min-h-0">
            {/* TOC Panel */}
            {showToc && (
              <>
                <Panel defaultSize={15} minSize={10} maxSize={30} className="min-w-0">
                  <div className="h-full overflow-auto bg-white dark:bg-gray-800">
                    <TableOfContents content={content} />
                  </div>
                </Panel>
                <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 transition-colors" />
              </>
            )}

            {/* Editor Pane */}
            {showEditorPane && (
              <>
                <Panel defaultSize={showPreviewPane ? 50 : 100} minSize={20} className="min-w-0">
                  <div className="h-full min-h-0" onPaste={handlePaste}>
                    <CodeMirror
                      value={content}
                      height="100%"
                      theme={oneDark}
                      extensions={[
                        markdown(),
                        autocompletion({
                          override: [markdownAutocomplete],
                          activateOnTyping: true,
                          maxRenderedOptions: 10,
                        }),
                      ]}
                      onChange={handleChange}
                      className="h-full"
                    />
                  </div>
                </Panel>
                {showPreviewPane && previewMode === 'split' && (
                  <PanelResizeHandle className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 transition-colors" />
                )}
              </>
            )}

            {/* Preview Pane */}
            {showPreviewPane && (
              <Panel defaultSize={previewMode === 'preview-only' ? 100 : 50} minSize={20} className="min-w-0">
                <div className="h-full min-h-0 overflow-auto">
                  <PreviewPane content={content} />
                </div>
              </Panel>
            )}
          </PanelGroup>
        </div>

        <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <SaveStatus status={saveStatus.status} lastSaved={saveStatus.lastSaved} />
          <CollaborationStatus users={users} isConnected={isConnected} />
        </div>
      </div>
    );
  }
);

MarkdownEditor.displayName = 'MarkdownEditor';

export default MarkdownEditor;
