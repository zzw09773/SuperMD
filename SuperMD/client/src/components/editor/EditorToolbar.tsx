import { useState } from 'react';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link,
  Image,
  Code,
  ListTree,
  Smile,
  Maximize2,
  Columns,
  FileEdit,
} from 'lucide-react';
import EmojiPicker from './EmojiPicker';

interface EditorToolbarProps {
  showToc: boolean;
  previewMode: 'split' | 'preview-only' | 'editor-only';
  onToggleToc: () => void;
  onPreviewModeChange: (mode: 'split' | 'preview-only' | 'editor-only') => void;
  onInsert: (text: string, offset?: number) => void;
}

const EditorToolbar = ({ showToc, previewMode, onToggleToc, onPreviewModeChange, onInsert }: EditorToolbarProps) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const toolbarButtons = [
    { icon: Bold, label: 'Bold', action: () => onInsert('**bold text**') },
    { icon: Italic, label: 'Italic', action: () => onInsert('*italic text*') },
    { icon: Code, label: 'Code', action: () => onInsert('`code`') },
    { icon: Link, label: 'Link', action: () => onInsert('[link text](url)') },
    { icon: Image, label: 'Image', action: () => onInsert('![alt text](image-url)') },
    { icon: List, label: 'Bullet List', action: () => onInsert('- List item') },
    { icon: ListOrdered, label: 'Numbered List', action: () => onInsert('1. List item') },
  ];

  return (
    <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-2">
      {/* Formatting Buttons */}
      {toolbarButtons.map(({ icon: Icon, label, action }) => (
        <button
          key={label}
          onClick={action}
          title={label}
          className="p-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}

      {/* Emoji Picker Button */}
      <div className="relative">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          title="Insert Emoji"
          className={`p-2 rounded ${
            showEmojiPicker
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200'
          }`}
        >
          <Smile className="w-4 h-4" />
        </button>
        {showEmojiPicker && (
          <EmojiPicker
            onSelectEmoji={(emoji) => onInsert(emoji)}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}
      </div>

      <div className="flex-1" />

      {/* View Mode Buttons */}
      <div className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 rounded p-1">
        <button
          onClick={() => onPreviewModeChange('editor-only')}
          className={`px-2 py-1 rounded flex items-center gap-1 text-xs transition-colors ${
            previewMode === 'editor-only'
              ? 'bg-blue-500 text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
          title="僅編輯器"
        >
          <FileEdit className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">編輯</span>
        </button>
        <button
          onClick={() => onPreviewModeChange('split')}
          className={`px-2 py-1 rounded flex items-center gap-1 text-xs transition-colors ${
            previewMode === 'split'
              ? 'bg-blue-500 text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
          title="分割視圖"
        >
          <Columns className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">分割</span>
        </button>
        <button
          onClick={() => onPreviewModeChange('preview-only')}
          className={`px-2 py-1 rounded flex items-center gap-1 text-xs transition-colors ${
            previewMode === 'preview-only'
              ? 'bg-blue-500 text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
          title="完全預覽"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">預覽</span>
        </button>
      </div>

      {/* TOC Toggle */}
      <button
        onClick={onToggleToc}
        className={`px-3 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2 ${
          showToc
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
        }`}
      >
        <ListTree className="w-4 h-4" />
        <span className="hidden sm:inline">{showToc ? 'Hide' : 'Show'} TOC</span>
      </button>
    </div>
  );
};

export default EditorToolbar;
