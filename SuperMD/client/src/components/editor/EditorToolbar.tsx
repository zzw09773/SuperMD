import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link,
  Image,
  Code,
  Eye,
  EyeOff,
} from 'lucide-react';

interface EditorToolbarProps {
  showPreview: boolean;
  onTogglePreview: () => void;
  onInsert: (text: string, offset?: number) => void;
}

const EditorToolbar = ({ showPreview, onTogglePreview, onInsert }: EditorToolbarProps) => {
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

      <div className="flex-1" />

      {/* Preview Toggle */}
      <button
        onClick={onTogglePreview}
        className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2 text-gray-800 dark:text-gray-200"
      >
        {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        {showPreview ? 'Hide' : 'Show'} Preview
      </button>
    </div>
  );
};

export default EditorToolbar;
