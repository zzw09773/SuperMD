import { useEffect } from 'react';

interface UseKeyboardShortcutsProps {
  onSave?: () => void;
  onBold?: () => void;
  onItalic?: () => void;
}

const useKeyboardShortcuts = ({ onSave, onBold, onItalic }: UseKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave?.();
      }

      // Ctrl/Cmd + B for bold
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        onBold?.();
      }

      // Ctrl/Cmd + I for italic
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        onItalic?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSave, onBold, onItalic]);
};

export default useKeyboardShortcuts;
