import { useState, useCallback, useRef, useEffect } from 'react';
import { debounce } from '../utils/debounce';
import type { SaveStatus } from '../types';

const useAutoSave = (documentId: string | null, content: string) => {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({
    status: 'saved',
    lastSaved: new Date(),
  });

  const saveContent = useCallback(async () => {
    if (!documentId) return;

    setSaveStatus({ status: 'saving' });

    try {
      // API call to save content would go here
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      
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
