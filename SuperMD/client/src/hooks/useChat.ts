import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import type { ChatMessage } from '../types';

const useChat = (documentId?: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load chat history when document changes
  useEffect(() => {
    if (!documentId) {
      setMessages([]);
      return;
    }

    const loadChatHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `http://localhost:3000/api/chat-history/${documentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessages(response.data.messages);
      } catch (error) {
        console.error('Failed to load chat history:', error);
        setMessages([]);
      }
    };

    loadChatHistory();
  }, [documentId]);

  // Save message to database
  const saveChatMessage = useCallback(async (
    message: ChatMessage,
    mode: 'chat' | 'research' | 'rag'
  ) => {
    if (!documentId) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:3000/api/chat-history/${documentId}`,
        {
          role: message.role,
          content: message.content,
          mode,
          sources: message.sources,
          ragSources: message.ragSources,
          metadata: message.metadata || message.toolCalls ? {
            toolCalls: message.toolCalls,
            ...message.metadata,
          } : undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('Failed to save chat message:', error);
    }
  }, [documentId]);

  const sendMessage = useCallback(async (
    content: string,
    mode: 'chat' | 'research' | 'rag' = 'chat',
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

    // Save user message
    await saveChatMessage(userMessage, mode);

    try {
      if (mode === 'rag') {
        // Use RAG API
        const token = localStorage.getItem('token');
        const response = await axios.post(
          'http://localhost:3000/api/rag/query',
          { query: content },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.data.answer,
          timestamp: new Date(),
          ragSources: response.data.sources || [],
        };

        setMessages(prev => [...prev, assistantMessage]);
        await saveChatMessage(assistantMessage, mode);
        setIsLoading(false);
      } else if (mode === 'research') {
        // Use Research API with SSE
        const token = localStorage.getItem('token');
        const params = new URLSearchParams({
          query: content,
        });

        if (documentContent) {
          params.set('documentContent', documentContent);
        }

        if (token) {
          params.set('token', token);
        }

        const eventSource = new EventSource(
          `http://localhost:3000/api/research/query?${params.toString()}`
        );

        let fullResponse = '';
        let toolCalls: any[] = [];
        let sources: string[] = [];

        let hasReceivedData = false;

        eventSource.onmessage = (event) => {
          hasReceivedData = true;

          // Handle [DONE] signal
          if (event.data === '[DONE]') {
            return;
          }

          try {
            const data = JSON.parse(event.data);

            // Handle error events
            if (data.error) {
              console.error('[Research SSE] Error event:', data.error);
              setMessages(prev => [
                ...prev,
                {
                  id: `error-${Date.now()}`,
                  role: 'assistant',
                  content: `Research error: ${data.error}`,
                  timestamp: new Date(),
                },
              ]);
              setIsLoading(false);
              eventSource.close();
              return;
            }

            if (data.type === 'reasoning') {
              // Replace last reasoning message instead of adding new one
              setMessages((prev) => {
                // Remove previous reasoning messages
                const filtered = prev.filter(m => m.metadata?.type !== 'reasoning');

                // Add new reasoning message
                const reasoningMsg: ChatMessage = {
                  id: 'reasoning-current',
                  role: 'system',
                  content: data.content,
                  timestamp: new Date(),
                  metadata: { type: 'reasoning' },
                };

                return [...filtered, reasoningMsg];
              });
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

              // Remove reasoning messages and add final answer
              setMessages((prev) => {
                const filtered = prev.filter(m => m.metadata?.type !== 'reasoning');
                return [...filtered, assistantMessage];
              });
              saveChatMessage(assistantMessage, mode); // Fire and forget
              setIsLoading(false);
              eventSource.close();
            }
          } catch (parseError) {
            console.error('[Research SSE] Failed to parse event data:', event.data, parseError);
          }
        };

        eventSource.onerror = (error) => {
          console.error('[Research SSE] Connection error:', error);
          eventSource.close();

          // Only show error if no data was received (connection failed)
          // If data was received, the stream probably just ended normally
          if (!hasReceivedData) {
            setMessages(prev => [
              ...prev,
              {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: 'Failed to connect to Research service. Please check your connection and try again.',
                timestamp: new Date(),
              },
            ]);
          }

          setIsLoading(false);
        };
      } else {
        // Use Chat API - get current messages from state
        setMessages(prevMessages => {
          const allMessages = [...prevMessages, userMessage];

          // Make API call with current messages
          axios.post('http://localhost:3000/api/chat', {
            messages: allMessages.map(m => ({
              role: m.role,
              content: m.content,
            })),
            stream: false,
          })
          .then(response => {
            const assistantMessage: ChatMessage = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: response.data.message,
              timestamp: new Date(),
              sources: response.data.sources,
            };

            setMessages(prev => [...prev, assistantMessage]);
            saveChatMessage(assistantMessage, mode);
            setIsLoading(false);
          })
          .catch(error => {
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
          });

          return prevMessages;
        });
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
  }, [saveChatMessage]);

  const clearHistory = useCallback(async () => {
    if (!documentId) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:3000/api/chat-history/${documentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages([]);
    } catch (error) {
      console.error('Failed to clear chat history:', error);
    }
  }, [documentId]);

  return { messages, sendMessage, isLoading, clearHistory };
};

export default useChat;
