import { useState, useCallback } from 'react';
import axios from 'axios';
import type { ChatMessage } from '../types';

const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (
    content: string,
    mode: 'chat' | 'research' = 'chat',
    documentContent?: string
  ) => {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      if (mode === 'research') {
        // Use Research API with SSE
        const eventSource = new EventSource(
          `http://localhost:3000/api/research/query?query=${encodeURIComponent(content)}${
            documentContent ? `&documentContent=${encodeURIComponent(documentContent)}` : ''
          }`
        );

        let fullResponse = '';
        let toolCalls: any[] = [];
        let sources: string[] = [];

        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);

          if (data.type === 'reasoning') {
            // Show reasoning as system message
            const reasoningMsg: ChatMessage = {
              id: `reasoning-${Date.now()}`,
              role: 'system',
              content: data.content,
              timestamp: new Date(),
              metadata: { type: 'reasoning' },
            };
            setMessages((prev) => [...prev, reasoningMsg]);
          } else if (data.type === 'chunk') {
            fullResponse += data.content;
          } else if (data.done) {
            fullResponse = data.fullResponse || fullResponse;
            toolCalls = data.toolCalls || [];
            sources = data.sources || [];

            const assistantMessage: ChatMessage = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: fullResponse,
              timestamp: new Date(),
              toolCalls,
              sources,
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setIsLoading(false);
            eventSource.close();
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          setMessages(prev => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              role: 'assistant',
              content: 'Research failed. Please try again.',
              timestamp: new Date(),
            },
          ]);
          setIsLoading(false);
        };
      } else {
        // Use Chat API
        const response = await axios.post('http://localhost:3000/api/chat', {
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          stream: false,
        });

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date(),
          sources: response.data.sources,
        };

        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        },
      ]);
      setIsLoading(false);
    }
  }, [messages]);

  return { messages, sendMessage, isLoading };
};

export default useChat;
