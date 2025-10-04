import { useState, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import PreviewPane from './PreviewPane';
import EditorToolbar from './EditorToolbar';
import SaveStatus from '../common/SaveStatus';
import useAutoSave from '../../hooks/useAutoSave';

interface MarkdownEditorProps {
  documentId: string | null;
}

const MarkdownEditor = ({ documentId }: MarkdownEditorProps) => {
  const [content, setContent] = useState('# Welcome to SuperMD\n\nStart typing...');
  const [showPreview, setShowPreview] = useState(true);
  const { saveStatus, triggerSave } = useAutoSave(documentId, content);

  useEffect(() => {
    if (documentId) {
      // Load document content
      // This would fetch from API in real implementation
      console.log('Loading document:', documentId);
    }
  }, [documentId]);

  const handleChange = (value: string) => {
    setContent(value);
    triggerSave();
  };

  return (
    <div className="flex-1 flex flex-col">
      <EditorToolbar 
        showPreview={showPreview}
        onTogglePreview={() => setShowPreview(!showPreview)}
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

      <SaveStatus status={saveStatus.status} lastSaved={saveStatus.lastSaved} />
    </div>
  );
};

export default MarkdownEditor;
