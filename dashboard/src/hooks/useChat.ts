import { useState, useCallback } from 'react';
import { chatApi, botInfoApi } from '@services';
import type { ChatMessage } from '@types';

export function useChat(initialMessages: ChatMessage[] = []) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [botName, setBotName] = useState('Bot');

  const fetchBotName = useCallback(async () => {
    try {
      const response = await botInfoApi.getBotInfo();
      setBotName(response.data.clientId ? 'DiscordLLMBot' : 'Bot');
    } catch {
      setBotName('Bot');
    }
  }, []);

  const sendMessage = useCallback(async (
    message: string,
    username = 'You',
    guildName = 'Playground Server'
  ): Promise<ChatMessage | null> => {
    if (!message.trim() || isLoading) return null;

    setIsLoading(true);
    setError(null);

    const userMsg: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      username,
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      await fetchBotName();

      const response = await chatApi.sendMessage(message, username, guildName);

      const botMsg: ChatMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.data.reply,
        timestamp: response.data.timestamp,
        username: botName,
        usage: response.data.usage,
      };

      setMessages((prev) => [...prev, botMsg]);
      return botMsg;
    } catch {
      const errorMsg: ChatMessage = {
        id: Date.now() + 1,
        role: 'system',
        content: 'Error: Failed to get response from bot.',
        timestamp: new Date().toISOString(),
        username: 'System',
      };
      setMessages((prev) => [...prev, errorMsg]);
      setError('Failed to get response from bot. Please try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, botName, fetchBotName]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  return {
    messages,
    isLoading,
    error,
    botName,
    sendMessage,
    clearChat,
    addMessage,
    setMessages
  };
}
