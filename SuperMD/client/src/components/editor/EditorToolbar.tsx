interface EditorToolbarProps {
  showPreview: boolean;
  onTogglePreview: () => void;
}

const EditorToolbar = ({ showPreview, onTogglePreview }: EditorToolbarProps) => {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-2">
      <button
        onClick={onTogglePreview}
        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
      >
        {showPreview ? 'Hide' : 'Show'} Preview
      </button>
      
      <div className="flex-1" />
      
      <button className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600">
        Export
      </button>
    </div>
  );
};

export default EditorToolbar;
