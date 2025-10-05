import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import PreviewPane from './PreviewPane';
import EditorToolbar from './EditorToolbar';
import SaveStatus from '../common/SaveStatus';
import CollaborationStatus from '../collaboration/CollaborationStatus';
import useAutoSave from '../../hooks/useAutoSave';
import useCollaboration from '../../hooks/useCollaboration';
import { documentAPI } from '../../services/api';

interface MarkdownEditorProps {
  documentId: string | null;
  onContentChange?: (content: string) => void;
}

export interface MarkdownEditorRef {
  getContent: () => string;
}

const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  ({ documentId, onContentChange }, ref) => {
    const [content, setContent] = useState('# Welcome to SuperMD\n\nStart typing...');
    const [showPreview, setShowPreview] = useState(true);
    const [loading, setLoading] = useState(false);
    const { saveStatus, triggerSave } = useAutoSave(documentId, content);
    const { users, isConnected } = useCollaboration(documentId || 'demo');

    useImperativeHandle(ref, () => ({
      getContent: () => content,
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

    const handleInsert = (text: string, offset: number = 0) => {
      // Insert text at current cursor position
      // This is a simplified version - in real implementation would use CodeMirror API
      setContent(content + '\n' + text);
    };

    return (
      <div className="flex-1 flex flex-col">
        <EditorToolbar
          showPreview={showPreview}
          onTogglePreview={() => setShowPreview(!showPreview)}
          onInsert={handleInsert}
        />

        <div className="flex-1 flex overflow-hidden">
          {/* Editor Pane */}
          <div className={showPreview ? 'w-1/2 border-r border-gray-200' : 'w-full'}>
            <CodeMirror
              value={content}
              height="100%"
              theme={oneDark}
              extensions={[markdown()]}
              onChange={handleChange}
              className="h-full"
            />
          </div>

          {/* Preview Pane */}
          {showPreview && (
            <div className="w-1/2 overflow-auto">
              <PreviewPane content={content} />
            </div>
          )}
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
