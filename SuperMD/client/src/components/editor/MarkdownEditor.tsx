import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { autocompletion } from '@codemirror/autocomplete';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import * as Y from 'yjs';
import { yCollab } from 'y-codemirror.next';

import PreviewPane from './PreviewPane';
import TableOfContents from './TableOfContents';
import EditorToolbar from './EditorToolbar';
import SaveStatus from '../common/SaveStatus';
import CollaborationStatus from '../collaboration/CollaborationStatus';
import useAutoSave from '../../hooks/useAutoSave';
import useCollaboration from '../../hooks/useCollaboration';
import { documentAPI } from '../../services/api';
import { markdownAutocomplete } from '../../utils/markdownAutocomplete';
import { YjsSocketIOProvider } from '../../utils/YjsSocketIOProvider';

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
    
    // Y.js State
    const [yDoc, setYDoc] = useState<Y.Doc | null>(null);
    const [provider, setProvider] = useState<YjsSocketIOProvider | null>(null);
    const [yUndoManager, setYUndoManager] = useState<Y.UndoManager | null>(null);

    const { saveStatus, triggerSave } = useAutoSave(documentId, content);
    const { socket, users, isConnected } = useCollaboration(documentId || 'demo');

    const showEditorPane = previewMode !== 'preview-only';
    const showPreviewPane = previewMode !== 'editor-only';

    useImperativeHandle(ref, () => ({
      getContent: () => content,
      insertContent: (text: string) => {
        if (yDoc) {
            const yText = yDoc.getText('codemirror');
            yText.insert(yText.length, '\n' + text);
        } else {
            setContent((prev) => prev + text);
        }
        triggerSave();
      },
    }));

    // Initialize Y.js and Provider
    useEffect(() => {
      if (!documentId || !socket) return;

      const doc = new Y.Doc();
      const yText = doc.getText('codemirror');
      const undoManager = new Y.UndoManager(yText);
      const prov = new YjsSocketIOProvider(socket, documentId, doc);

      setYDoc(doc);
      setYUndoManager(undoManager);
      setProvider(prov);

      // Sync Y.js to React State (for Preview/TOC)
      doc.on('update', () => {
        const newContent = yText.toString();
        setContent(newContent);
        triggerSave(); // Trigger auto-save on remote changes too? Maybe debatable.
      });

      // Initial Load Strategy
      const initContent = async () => {
        try {
            setLoading(true);
            const apiDoc = await documentAPI.getById(documentId);
            
            // Only populate if doc is empty (avoid overwriting collaborative work)
            // Ideally, we check if we are the "first" or if the room is empty.
            if (yText.toString().length === 0) {
                doc.transact(() => {
                    yText.insert(0, apiDoc.content);
                }, 'initial-load');
            }
        } catch (error) {
            console.error('Failed to load document:', error);
        } finally {
            setLoading(false);
        }
      };

      initContent();

      return () => {
        prov.destroy();
        doc.destroy();
      };
    }, [documentId, socket]);

    useEffect(() => {
      onContentChange?.(content);
    }, [content, onContentChange]);

    // Handle manual CodeMirror changes (if not using Y.js, fallback)
    const handleChange = (value: string) => {
      // If Y.js is active, this is handled by y-codemirror extensions.
      // But we still update local state for fallback or if extension doesn't block this?
      // Actually, if Y.js is hooked, we shouldn't manually setContent from here 
      // to avoid loops, BUT CodeMirror's onChange is triggered by Y.js updates too.
      // We guard this by checking if the change came from Y.js (remote) or user.
      // For now, rely on the doc.on('update') listener above for content Source of Truth.
      // So this handler might be redundant if Y.js is active.
      if (!yDoc) {
          setContent(value);
          triggerSave();
      }
    };

    const handleInsert = (text: string, _offset: number = 0) => {
      if (yDoc) {
          const yText = yDoc.getText('codemirror');
          yText.insert(yText.length, '\n' + text);
      } else {
          setContent(content + '\n' + text);
      }
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
            // Fix: Use relative URL or config
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
            
            if (yDoc) {
                const yText = yDoc.getText('codemirror');
                yText.insert(yText.length, imageMarkdown);
            } else {
                setContent((prev) => prev + imageMarkdown);
            }
            
          } catch (error) {
            console.error('Image upload error:', error);
            alert('Failed to upload image');
          }
        }
      }
    };

    // Extensions
    const extensions = [
        markdown(),
        autocompletion({
            override: [markdownAutocomplete],
            activateOnTyping: true,
            maxRenderedOptions: 10,
        }),
    ];

    if (provider && yDoc && users.length > 0) {
        // Add user color logic if needed
        const userColor = { color: '#30bced', light: '#30bced33' }; // Example
        provider.awareness.setLocalStateField('user', {
            name: 'You',
            color: userColor.color,
            colorLight: userColor.light,
        });
        
        extensions.push(yCollab(yDoc.getText('codemirror'), provider.awareness, { undoManager: yUndoManager || undefined }));
    }

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
                      value={yDoc ? undefined : content} // If Y.js is active, let it control value
                      height="100%"
                      theme={oneDark}
                      extensions={extensions}
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
