import { useState, useCallback, useRef, useEffect } from 'react';
import { debounce } from '../utils/debounce';
import type { SaveStatus } from '../types';
import { documentAPI } from '../services/api';

const useAutoSave = (documentId: string | null, content: string) => {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({
    status: 'saved',
    lastSaved: new Date(),
  });
  const contentRef = useRef(content);

  // Keep content ref updated
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const saveContent = useCallback(async () => {
    if (!documentId) return;

    setSaveStatus({ status: 'saving' });

    try {
      // Extract title from content (first # heading)
      const match = contentRef.current.match(/^#\s+(.+)$/m);
      const title = match ? match[1].trim() : 'Untitled';

      // Save to backend
      await documentAPI.update(documentId, {
        content: contentRef.current,
        title,
      });

      setSaveStatus({
        status: 'saved',
        lastSaved: new Date(),
      });
    } catch (error) {
      console.error('Failed to save:', error);
      setSaveStatus({ status: 'error' });
    }
  }, [documentId]);

  const debouncedSave = useRef(debounce(saveContent, 2000)).current;

  const triggerSave = useCallback(() => {
    debouncedSave();
  }, [debouncedSave]);

  useEffect(() => {
    if (content && documentId) {
      triggerSave();
    }
  }, [content, documentId, triggerSave]);

  return { saveStatus, triggerSave };
};

export default useAutoSave;
