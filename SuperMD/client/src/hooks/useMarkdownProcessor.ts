import { useCallback } from 'react';

const useMarkdownProcessor = () => {
  const insertMarkdown = useCallback((text: string, wrapper: string) => {
    return `${wrapper}${text}${wrapper}`;
  }, []);

  const makeBold = useCallback((text: string) => {
    return insertMarkdown(text, '**');
  }, [insertMarkdown]);

  const makeItalic = useCallback((text: string) => {
    return insertMarkdown(text, '_');
  }, [insertMarkdown]);

  const makeCode = useCallback((text: string) => {
    return insertMarkdown(text, '`');
  }, [insertMarkdown]);

  const makeLink = useCallback((text: string, url: string = '') => {
    return `[${text}](${url})`;
  }, []);

  const makeHeading = useCallback((text: string, level: number = 1) => {
    const prefix = '#'.repeat(Math.min(level, 6));
    return `${prefix} ${text}`;
  }, []);

  return {
    makeBold,
    makeItalic,
    makeCode,
    makeLink,
    makeHeading,
  };
};

export default useMarkdownProcessor;
