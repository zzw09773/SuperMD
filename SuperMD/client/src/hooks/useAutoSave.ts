import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { debounce } from '../utils/debounce';
import type { SaveStatus } from '../types';
import { documentAPI } from '../services/api';

const useAutoSave = (documentId: string | null, content: string) => {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({
    status: 'saved',
    lastSaved: new Date(),
  });
  const contentRef = useRef(content);
  const lastSavedContentRef = useRef(content);
  const lastSavedAtRef = useRef<Date | null>(new Date());

  // Keep content ref updated
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const saveContent = useCallback(async () => {
    if (!documentId) return;

    if (contentRef.current === lastSavedContentRef.current) {
      if (lastSavedAtRef.current) {
        setSaveStatus({
          status: 'saved',
          lastSaved: lastSavedAtRef.current,
        });
      }
      return;
    }

    setSaveStatus({ status: 'saving' });

    try {
      // Extract title from content (first # heading)
      const match = contentRef.current.match(/^#\s+(.+)$/m);
      const title = match ? match[1].trim() : 'Untitled';

      // Save to backend
      const nextContent = contentRef.current;
      await documentAPI.update(documentId, {
        content: nextContent,
        title,
      });

      lastSavedContentRef.current = nextContent;
      const now = new Date();
      lastSavedAtRef.current = now;
      setSaveStatus({
        status: 'saved',
        lastSaved: now,
      });
    } catch (error) {
      console.error('Failed to save:', error);
      setSaveStatus({ status: 'error' });
    }
  }, [documentId]);

  const debouncedSave = useMemo(() => debounce(saveContent, 2000), [saveContent]);

  const triggerSave = useCallback(() => {
    debouncedSave();
  }, [debouncedSave]);

  const markContentAsSynced = useCallback(
    (syncedContent?: string) => {
      const nextContent = syncedContent ?? contentRef.current;
      lastSavedContentRef.current = nextContent;
      const now = new Date();
      lastSavedAtRef.current = now;
      setSaveStatus({
        status: 'saved',
        lastSaved: now,
      });
    },
    []
  );

  useEffect(() => {
    return () => {
      debouncedSave.flush();
    };
  }, [debouncedSave]);

  return { saveStatus, triggerSave, markContentAsSynced };
};

export default useAutoSave;
